import { supabase } from "@/config/supabase";
import {
  addAdresseLocal,
  updateAdresseLocal,
  deleteAdresseLocalPermanently,
  markAdresseAsSynced,
  markAdresseAsSyncError,
  getPendingSyncAdresses,
} from "@/db/adressesDB";
import {
  addToSyncQueue,
  getPendingOperations,
  markOperationAsInProgress,
  markOperationAsCompleted,
  markOperationAsFailed,
  OPERATION_TYPES,
} from "@/db/syncQueue";
import { initDB } from "@/db/indexedDB";

/**
 * Service de synchronisation bidirectionnelle entre IndexedDB et Supabase
 */

/**
 * État de la synchronisation
 */
let isSyncing = false;
let syncSubscription = null;

/**
 * Démarrer la synchronisation en temps réel
 * Écoute les changements sur la table adresses_sync dans Supabase
 */
export const startRealtimeSync = () => {
  if (syncSubscription) {
    console.log("⚠ Synchronisation temps réel déjà active");
    return;
  }

  console.log("🔄 Démarrage de la synchronisation temps réel...");

  // S'abonner aux changements de la table adresses_sync
  syncSubscription = supabase
    .channel("adresses_sync_channel")
    .on(
      "postgres_changes",
      {
        event: "*", // INSERT, UPDATE, DELETE
        schema: "public",
        table: "adresses_sync",
      },
      async (payload) => {
        console.log("📡 Changement détecté:", payload);
        await handleRealtimeChange(payload);
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("✓ Abonnement temps réel actif");
      } else if (status === "CLOSED") {
        console.log("⚠ Abonnement temps réel fermé");
      } else if (status === "CHANNEL_ERROR") {
        console.error("❌ Erreur d'abonnement temps réel");
      }
    });
};

/**
 * Arrêter la synchronisation en temps réel
 */
export const stopRealtimeSync = async () => {
  if (syncSubscription) {
    await supabase.removeChannel(syncSubscription);
    syncSubscription = null;
    console.log("✓ Synchronisation temps réel arrêtée");
  }
};

/**
 * Gérer un changement temps réel depuis Supabase
 * @param {Object} payload - Le payload du changement
 */
const handleRealtimeChange = async (payload) => {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  try {
    switch (eventType) {
      case "INSERT":
        // Nouvelle adresse créée dans Supabase → ajouter localement
        await handleRemoteInsert(newRecord);
        break;

      case "UPDATE":
        // Adresse mise à jour dans Supabase → mettre à jour localement
        await handleRemoteUpdate(newRecord);
        break;

      case "DELETE":
        // Adresse supprimée dans Supabase → supprimer localement
        await handleRemoteDelete(oldRecord);
        break;

      default:
        console.log("Type d'événement inconnu:", eventType);
    }
  } catch (error) {
    console.error("Erreur lors du traitement du changement temps réel:", error);
  }
};

/**
 * Gérer l'insertion d'une adresse depuis Supabase
 */
const handleRemoteInsert = async (record) => {
  console.log("📥 Insertion depuis Supabase:", record.adresse_id);

  // Vérifier si l'adresse existe déjà localement
  const db = await initDB();
  const existing = await db.get("adresses", record.adresse_id);

  if (!existing) {
    // Récupérer l'adresse complète depuis Supabase
    const { data: adresse, error } = await supabase
      .from("adresses")
      .select("*")
      .eq("id", record.adresse_id)
      .single();

    if (!error && adresse) {
      await addAdresseLocal({
        ...adresse,
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
      });
      console.log("✓ Adresse ajoutée localement depuis Supabase");
    }
  }
};

/**
 * Gérer la mise à jour d'une adresse depuis Supabase
 */
const handleRemoteUpdate = async (record) => {
  console.log("📥 Mise à jour depuis Supabase:", record.adresse_id);

  // Récupérer l'adresse complète depuis Supabase
  const { data: adresse, error } = await supabase
    .from("adresses")
    .select("*")
    .eq("id", record.adresse_id)
    .single();

  if (!error && adresse) {
    await updateAdresseLocal(record.adresse_id, {
      ...adresse,
      sync_status: "synced",
      last_synced_at: new Date().toISOString(),
    });
    console.log("✓ Adresse mise à jour localement depuis Supabase");
  }
};

/**
 * Gérer la suppression d'une adresse depuis Supabase
 */
const handleRemoteDelete = async (record) => {
  console.log("📥 Suppression depuis Supabase:", record.adresse_id);

  await deleteAdresseLocalPermanently(record.adresse_id);
  console.log("✓ Adresse supprimée localement depuis Supabase");
};

/**
 * Synchronisation PULL: Télécharger toutes les adresses depuis Supabase
 * Utilisé pour la synchronisation initiale ou complète
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export const pullAdressesFromSupabase = async () => {
  console.log("📥 Début de la synchronisation PULL depuis Supabase...");

  try {
    // Récupérer toutes les adresses depuis Supabase
    const { data: adresses, error } = await supabase
      .from("adresses")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Erreur lors du PULL:", error);
      return { success: false, error: error.message };
    }

    const db = await initDB();
    const tx = db.transaction("adresses", "readwrite");
    const store = tx.store;

    let count = 0;
    for (const adresse of adresses) {
      // Ajouter les métadonnées de sync
      const adresseWithMeta = {
        ...adresse,
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
        local_updated_at: adresse.updated_at,
      };

      await store.put(adresseWithMeta);
      count++;
    }

    await tx.done;

    // Marquer la synchronisation initiale comme effectuée
    await db.put("sync_metadata", {
      key: "last_pull_sync",
      value: new Date().toISOString(),
    });

    console.log(`✓ PULL terminé: ${count} adresse(s) synchronisée(s)`);
    return { success: true, count };
  } catch (error) {
    console.error("Erreur lors du PULL:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Synchronisation PUSH: Envoyer les modifications locales vers Supabase
 * Traite toutes les opérations en attente dans la sync_queue
 * @returns {Promise<{success: boolean, processed?: number, failed?: number, error?: string}>}
 */
export const pushLocalChangesToSupabase = async () => {
  if (isSyncing) {
    console.log("⚠ Synchronisation déjà en cours");
    return { success: false, error: "Synchronisation déjà en cours" };
  }

  console.log("📤 Début de la synchronisation PUSH vers Supabase...");
  isSyncing = true;

  try {
    const { operations } = await getPendingOperations();

    if (operations.length === 0) {
      console.log("✓ Aucune opération à synchroniser");
      isSyncing = false;
      return { success: true, processed: 0, failed: 0 };
    }

    console.log(`📤 ${operations.length} opération(s) à synchroniser`);

    let processed = 0;
    let failed = 0;

    for (const operation of operations) {
      await markOperationAsInProgress(operation.id);

      const result = await executeOperation(operation);

      if (result.success) {
        await markOperationAsCompleted(operation.id);
        await markAdresseAsSynced(operation.entity_id);
        processed++;
        console.log(
          `✓ Opération ${operation.operation_type} réussie pour ${operation.entity_id}`
        );
      } else {
        const { shouldRetry } = await markOperationAsFailed(
          operation.id,
          result.error
        );
        await markAdresseAsSyncError(operation.entity_id, result.error);
        failed++;
        console.error(
          `❌ Opération ${operation.operation_type} échouée pour ${operation.entity_id}:`,
          result.error,
          shouldRetry
            ? "(nouvelle tentative prévue)"
            : "(max tentatives atteint)"
        );
      }
    }

    // Mettre à jour les métadonnées
    const db = await initDB();
    await db.put("sync_metadata", {
      key: "last_push_sync",
      value: new Date().toISOString(),
    });

    console.log(
      `✓ PUSH terminé: ${processed} réussie(s), ${failed} échouée(s)`
    );

    isSyncing = false;
    return { success: true, processed, failed };
  } catch (error) {
    console.error("Erreur lors du PUSH:", error);
    isSyncing = false;
    return { success: false, error: error.message };
  }
};

/**
 * Exécuter une opération de synchronisation vers Supabase
 * @param {Object} operation - L'opération à exécuter
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const executeOperation = async (operation) => {
  const { operation_type, entity_id, data } = operation;

  try {
    switch (operation_type) {
      case OPERATION_TYPES.CREATE:
        return await executeCreate(entity_id, data);

      case OPERATION_TYPES.UPDATE:
        return await executeUpdate(entity_id, data);

      case OPERATION_TYPES.ACTIVATE:
        return await executeActivate(entity_id);

      case OPERATION_TYPES.DEACTIVATE:
        return await executeDeactivate(entity_id);

      case OPERATION_TYPES.DELETE:
        return await executeDelete(entity_id);

      default:
        return {
          success: false,
          error: `Type d'opération inconnu: ${operation_type}`,
        };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Exécuter une opération CREATE dans Supabase
 */
const executeCreate = async (entityId, data) => {
  const { error } = await supabase.from("adresses").insert({
    id: entityId,
    ...data,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

/**
 * Exécuter une opération UPDATE dans Supabase
 */
const executeUpdate = async (entityId, data) => {
  const { error } = await supabase
    .from("adresses")
    .update(data)
    .eq("id", entityId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

/**
 * Exécuter une opération ACTIVATE dans Supabase
 */
const executeActivate = async (entityId) => {
  const { error } = await supabase
    .from("adresses")
    .update({ is_active: true })
    .eq("id", entityId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

/**
 * Exécuter une opération DEACTIVATE dans Supabase
 */
const executeDeactivate = async (entityId) => {
  const { error } = await supabase
    .from("adresses")
    .update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
    })
    .eq("id", entityId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

/**
 * Exécuter une opération DELETE dans Supabase
 */
const executeDelete = async (entityId) => {
  const { error } = await supabase.from("adresses").delete().eq("id", entityId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

/**
 * Synchronisation bidirectionnelle complète (PULL + PUSH)
 * @returns {Promise<{success: boolean, pullCount?: number, pushProcessed?: number, pushFailed?: number, error?: string}>}
 */
export const fullSync = async () => {
  console.log("🔄 Début de la synchronisation bidirectionnelle complète...");

  // Étape 1: PULL (télécharger depuis Supabase)
  const pullResult = await pullAdressesFromSupabase();

  if (!pullResult.success) {
    return {
      success: false,
      error: `Échec du PULL: ${pullResult.error}`,
    };
  }

  // Étape 2: PUSH (envoyer vers Supabase)
  const pushResult = await pushLocalChangesToSupabase();

  if (!pushResult.success) {
    return {
      success: false,
      pullCount: pullResult.count,
      error: `Échec du PUSH: ${pushResult.error}`,
    };
  }

  console.log("✓ Synchronisation bidirectionnelle complète terminée");

  return {
    success: true,
    pullCount: pullResult.count,
    pushProcessed: pushResult.processed,
    pushFailed: pushResult.failed,
  };
};

/**
 * Vérifier le statut de la connexion réseau
 * @returns {boolean}
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Obtenir les informations de la dernière synchronisation
 * @returns {Promise<{lastPull?: string, lastPush?: string, error?: string}>}
 */
export const getLastSyncInfo = async () => {
  try {
    const db = await initDB();

    const lastPull = await db.get("sync_metadata", "last_pull_sync");
    const lastPush = await db.get("sync_metadata", "last_push_sync");

    return {
      lastPull: lastPull?.value,
      lastPush: lastPush?.value,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des infos de sync:", error);
    return { error: error.message };
  }
};

/**
 * Synchronisation automatique périodique
 * @param {number} intervalMs - Intervalle en millisecondes (défaut: 5 minutes)
 */
let autoSyncInterval = null;

export const startAutoSync = (intervalMs = 5 * 60 * 1000) => {
  if (autoSyncInterval) {
    console.log("⚠ Auto-sync déjà actif");
    return;
  }

  console.log(
    `🔄 Démarrage de l'auto-sync (intervalle: ${intervalMs / 1000}s)`
  );

  autoSyncInterval = setInterval(async () => {
    if (isOnline()) {
      console.log("🔄 Auto-sync: synchronisation...");
      await pushLocalChangesToSupabase();
    } else {
      console.log("⚠ Auto-sync: mode hors ligne");
    }
  }, intervalMs);
};

export const stopAutoSync = () => {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
    console.log("✓ Auto-sync arrêté");
  }
};

export default {
  startRealtimeSync,
  stopRealtimeSync,
  pullAdressesFromSupabase,
  pushLocalChangesToSupabase,
  fullSync,
  isOnline,
  getLastSyncInfo,
  startAutoSync,
  stopAutoSync,
};
