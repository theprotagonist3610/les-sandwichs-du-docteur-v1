import { useState, useEffect, useCallback, useRef } from "react";
import { initDB } from "@/db/indexedDB";
import { supabase } from "@/config/supabase";
import {
  getAllLivreurs as getSupabaseLivreurs,
  createLivreur as createSupabaseLivreur,
  updateLivreur as updateSupabaseLivreur,
  deleteLivreur as deleteSupabaseLivreur,
} from "@/utils/livreurToolkit";
import {
  OPERATION_TYPES,
  ENTITY_TYPES,
  SYNC_STATUS,
  mapOperationType,
} from "@/constants/livreurSyncConstants";

/**
 * Merge intelligent de 2 versions d'un livreur
 * Stratégie: Last-write-wins par objet complet
 * @param {Object} local - Version locale du livreur
 * @param {Object} remote - Version distante (Supabase) du livreur
 * @returns {Object} Version mergée du livreur
 */
const mergeLivreurConflict = (local, remote) => {
  const localTime = new Date(local.updated_at);
  const remoteTime = new Date(remote.updated_at);

  // Si remote est plus récent, le prendre entièrement
  if (remoteTime > localTime) {
    return remote;
  }

  // Si local est plus récent, le garder entièrement
  if (localTime > remoteTime) {
    return local;
  }

  // Si même timestamp (rare mais possible), privilégier le remote (serveur fait foi)
  return remote;
};

/**
 * Hook pour synchroniser les livreurs entre IndexedDB et Supabase
 */
const useLivreursSync = (options = {}) => {
  const {
    autoStart = false,
    enableAutoSync = false,
    syncInterval = 30000, // 30 secondes
  } = options;

  const [online, setOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [queueStats, setQueueStats] = useState({
    total: 0,
    pending: 0,
    processed: 0,
    failed: 0,
  });

  const syncIntervalRef = useRef(null);
  const realtimeChannelRef = useRef(null);

  // ==================== DÉTECTION RÉSEAU ====================

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      console.log("🟢 Connexion rétablie");
    };

    const handleOffline = () => {
      setOnline(false);
      console.log("🔴 Connexion perdue");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ==================== QUEUE DE SYNCHRONISATION ====================

  /**
   * Ajouter une opération à la queue
   */
  const addToQueue = useCallback(async (operation) => {
    try {
      // Validation
      if (!operation.type) {
        throw new Error("Type d'opération requis");
      }
      if (!operation.entity_id && !operation.livreurId) {
        throw new Error("entity_id ou livreurId requis");
      }

      const db = await initDB();
      const queueItem = {
        operation_type: mapOperationType(operation.type), // Convertit "create" → "INSERT"
        entity_type: ENTITY_TYPES.LIVREUR,
        entity_id: operation.entity_id || operation.livreurId, // Support des 2 formats
        data: operation.data,
        timestamp: new Date().toISOString(),
        status: SYNC_STATUS.PENDING,
      };

      await db.add("sync_queue", queueItem);
      await updateQueueStats();
    } catch (error) {
      console.error("Erreur ajout à la queue:", error);
      throw error; // Propager l'erreur pour que l'appelant soit notifié
    }
  }, []);

  /**
   * Mettre à jour les statistiques de la queue
   */
  const updateQueueStats = useCallback(async () => {
    try {
      const db = await initDB();
      const queue = await db.getAll("sync_queue");

      // Filtrer uniquement les opérations livreur
      const livreurQueue = queue.filter((op) => op.entity_type === ENTITY_TYPES.LIVREUR);

      setQueueStats({
        total: livreurQueue.length,
        pending: livreurQueue.filter((op) => op.status === SYNC_STATUS.PENDING).length,
        processed: livreurQueue.filter((op) => op.status === SYNC_STATUS.PROCESSED)
          .length,
        failed: livreurQueue.filter((op) => op.status === SYNC_STATUS.FAILED).length,
      });
    } catch (error) {
      console.error("Erreur stats queue:", error);
    }
  }, []);

  /**
   * Traiter la queue de synchronisation
   */
  const processQueue = useCallback(async () => {
    if (!online) return { success: false, error: "Hors ligne" };

    try {
      const db = await initDB();
      const queue = await db.getAll("sync_queue");

      // Filtrer les opérations livreur en attente
      const pendingOps = queue.filter(
        (op) => op.entity_type === ENTITY_TYPES.LIVREUR && op.status === SYNC_STATUS.PENDING
      );

      let processed = 0;
      let failed = 0;

      for (const op of pendingOps) {
        try {
          // Validation
          if (!op.entity_id) {
            throw new Error(`entity_id manquant pour l'opération ${op.id}`);
          }

          // Traitement selon le type
          switch (op.operation_type) {
            case OPERATION_TYPES.INSERT:
              if (!op.data) throw new Error("data manquant pour INSERT");
              await createSupabaseLivreur(op.data);
              break;

            case OPERATION_TYPES.UPDATE:
              if (!op.data) throw new Error("data manquant pour UPDATE");
              await updateSupabaseLivreur(op.entity_id, op.data);
              break;

            case OPERATION_TYPES.DELETE:
              await deleteSupabaseLivreur(op.entity_id);
              break;

            default:
              throw new Error(`Type d'opération inconnu: ${op.operation_type}`);
          }

          // Marquer comme traité
          const updatedOp = {
            ...op,
            status: SYNC_STATUS.PROCESSED,
            processedAt: new Date().toISOString(),
          };
          await db.put("sync_queue", updatedOp);
          processed++;
        } catch (error) {
          console.error(`Erreur traitement opération ${op.id}:`, error);
          const failedOp = {
            ...op,
            status: SYNC_STATUS.FAILED,
            error: error.message,
            failed_at: new Date().toISOString(),
          };
          await db.put("sync_queue", failedOp);
          failed++;
        }
      }

      await updateQueueStats();

      return { success: true, processed, failed };
    } catch (error) {
      console.error("Erreur traitement queue:", error);
      return { success: false, error: error.message };
    }
  }, [online]);

  // ==================== SYNCHRONISATION ====================

  /**
   * Synchronisation Pull (Supabase → IndexedDB)
   */
  const syncPull = useCallback(async () => {
    if (!online) {
      return { success: false, error: "Hors ligne" };
    }

    try {
      setSyncError(null);

      // Récupérer tous les livreurs depuis Supabase
      const {
        success,
        livreurs: supabaseLivreurs,
        error,
      } = await getSupabaseLivreurs({
        includeInactive: true,
      });

      if (!success) {
        throw new Error(error);
      }

      // Récupérer les livreurs locaux
      const db = await initDB();
      const localLivreurs = await db.getAll("livreurs");

      const localMap = new Map(localLivreurs.map((l) => [l.id, l]));
      const supabaseMap = new Map(supabaseLivreurs.map((l) => [l.id, l]));

      let added = 0;
      let updated = 0;
      let deleted = 0;

      const tx = db.transaction("livreurs", "readwrite");
      const store = tx.objectStore("livreurs");

      // Ajouter ou mettre à jour depuis Supabase
      for (const [id, supabaseLivreur] of supabaseMap) {
        const localLivreur = localMap.get(id);

        if (!localLivreur) {
          // Nouveau livreur depuis Supabase
          await store.add(supabaseLivreur);
          added++;
        } else {
          // Livreur existe déjà localement, merger intelligemment
          const merged = mergeLivreurConflict(localLivreur, supabaseLivreur);

          // Mettre à jour seulement si le merge a changé quelque chose
          if (JSON.stringify(merged) !== JSON.stringify(localLivreur)) {
            await store.put(merged);
            updated++;
          }
        }
      }

      // Supprimer ce qui n'existe plus dans Supabase
      for (const [id] of localMap) {
        if (!supabaseMap.has(id)) {
          await store.delete(id);
          deleted++;
        }
      }

      await tx.done;

      setLastSync(new Date().toISOString());

      return {
        success: true,
        added,
        updated,
        deleted,
        pullCount: added + updated,
      };
    } catch (error) {
      console.error("Erreur sync pull:", error);
      setSyncError(error.message);
      return { success: false, error: error.message };
    }
  }, [online]);

  /**
   * Synchronisation Push (IndexedDB → Supabase)
   */
  const syncPush = useCallback(async () => {
    if (!online) {
      return { success: false, error: "Hors ligne" };
    }

    try {
      const result = await processQueue();
      return result;
    } catch (error) {
      console.error("Erreur sync push:", error);
      setSyncError(error.message);
      return { success: false, error: error.message };
    }
  }, [online, processQueue]);

  /**
   * Synchronisation complète (bidirectionnelle)
   */
  const syncFull = useCallback(async () => {
    if (!online) {
      return { success: false, error: "Hors ligne" };
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      // 1. Push les changements locaux
      const pushResult = await syncPush();

      // 2. Pull les données Supabase
      const pullResult = await syncPull();

      setLastSync(new Date().toISOString());

      return {
        success: true,
        pushProcessed: pushResult.processed || 0,
        pullCount: pullResult.pullCount || 0,
      };
    } catch (error) {
      console.error("Erreur sync complète:", error);
      setSyncError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
    }
  }, [online, syncPush, syncPull]);

  // ==================== REALTIME ====================

  /**
   * Configurer l'écoute en temps réel
   */
  const setupRealtime = useCallback(() => {
    if (!online || realtimeChannelRef.current) return;

    const channel = supabase
      .channel("livreurs-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "livreurs",
        },
        async (payload) => {
          console.log("📡 Changement livreur détecté:", payload);

          // Synchroniser automatiquement
          if (enableAutoSync) {
            await syncPull();
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;
  }, [online, enableAutoSync, syncPull]);

  /**
   * Nettoyer l'écoute en temps réel
   */
  const cleanupRealtime = useCallback(() => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  }, []);

  // ==================== AUTO-SYNC ====================

  useEffect(() => {
    if (autoStart && online) {
      syncFull();
    }
  }, [autoStart, online]);

  useEffect(() => {
    if (enableAutoSync && online) {
      setupRealtime();

      // Synchronisation périodique
      syncIntervalRef.current = setInterval(() => {
        if (!isSyncing) {
          syncFull();
        }
      }, syncInterval);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      cleanupRealtime();
    };
  }, [
    enableAutoSync,
    online,
    syncInterval,
    isSyncing,
    setupRealtime,
    cleanupRealtime,
    syncFull,
  ]);

  // Charger les stats de la queue au montage
  useEffect(() => {
    updateQueueStats();
  }, [updateQueueStats]);

  return {
    // État
    online,
    isSyncing,
    lastSync,
    syncError,
    queueStats,

    // Actions
    syncPull,
    syncPush,
    syncFull,
    addToQueue,
    updateQueueStats,
  };
};

export default useLivreursSync;
