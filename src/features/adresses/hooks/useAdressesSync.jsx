import { useState, useEffect, useCallback } from 'react';
import {
  startRealtimeSync,
  stopRealtimeSync,
  pullAdressesFromSupabase,
  pushLocalChangesToSupabase,
  fullSync,
  isOnline,
  getLastSyncInfo,
  startAutoSync,
  stopAutoSync,
} from '@/features/livreurs/services/adressesSyncService';
import { getSyncQueueStats } from '@/db/syncQueue';
import { isDBInitialized } from '@/db/indexedDB';

/**
 * Hook React pour la gestion de la synchronisation des adresses
 * Fournit le contrôle de la synchronisation bidirectionnelle et temps réel
 */
const useAdressesSync = (options = {}) => {
  const {
    autoStart = true, // Démarrer automatiquement la sync temps réel
    autoSyncInterval = 5 * 60 * 1000, // Intervalle de sync automatique (5 min)
    enableAutoSync = true, // Activer la sync automatique périodique
  } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [lastSync, setLastSync] = useState({
    lastPull: null,
    lastPush: null,
  });
  const [queueStats, setQueueStats] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Charger les informations de synchronisation
   */
  const loadSyncInfo = useCallback(async () => {
    const info = await getLastSyncInfo();
    if (!info.error) {
      setLastSync({
        lastPull: info.lastPull,
        lastPush: info.lastPush,
      });
    }

    const { stats } = await getSyncQueueStats();
    setQueueStats(stats);
  }, []);

  /**
   * Vérifier si la DB est initialisée
   */
  const checkInitialization = useCallback(async () => {
    const initialized = await isDBInitialized();
    setIsInitialized(initialized);
    return initialized;
  }, []);

  /**
   * Initialiser la synchronisation
   */
  useEffect(() => {
    // Charger les infos au montage
    loadSyncInfo();
    checkInitialization();

    // Démarrer la sync temps réel si autoStart
    if (autoStart && navigator.onLine) {
      startRealtimeSync();
    }

    // Démarrer la sync automatique périodique si activée
    if (enableAutoSync && navigator.onLine) {
      startAutoSync(autoSyncInterval);
    }

    // Écouter les changements de connexion
    const handleOnline = () => {
      setOnline(true);
      console.log('🌐 Connexion rétablie');

      // Redémarrer la sync temps réel
      if (autoStart) {
        startRealtimeSync();
      }

      // Synchroniser les changements locaux
      if (enableAutoSync) {
        startAutoSync(autoSyncInterval);
        pushLocalChangesToSupabase();
      }
    };

    const handleOffline = () => {
      setOnline(false);
      console.log('📴 Mode hors ligne');

      // Arrêter la sync temps réel
      stopRealtimeSync();
      stopAutoSync();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Nettoyage au démontage
    return () => {
      if (autoStart) {
        stopRealtimeSync();
      }
      if (enableAutoSync) {
        stopAutoSync();
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoStart, enableAutoSync, autoSyncInterval, loadSyncInfo, checkInitialization]);

  /**
   * Synchronisation PULL (télécharger depuis Supabase)
   * @returns {Promise<{success: boolean, count?: number, error?: string}>}
   */
  const syncPull = useCallback(async () => {
    if (!online) {
      return { success: false, error: 'Mode hors ligne' };
    }

    setIsSyncing(true);
    setSyncError(null);

    const result = await pullAdressesFromSupabase();

    if (result.success) {
      await loadSyncInfo();
      await checkInitialization();
    } else {
      setSyncError(result.error);
    }

    setIsSyncing(false);
    return result;
  }, [online, loadSyncInfo, checkInitialization]);

  /**
   * Synchronisation PUSH (envoyer vers Supabase)
   * @returns {Promise<{success: boolean, processed?: number, failed?: number, error?: string}>}
   */
  const syncPush = useCallback(async () => {
    if (!online) {
      return { success: false, error: 'Mode hors ligne' };
    }

    setIsSyncing(true);
    setSyncError(null);

    const result = await pushLocalChangesToSupabase();

    if (result.success) {
      await loadSyncInfo();
    } else {
      setSyncError(result.error);
    }

    setIsSyncing(false);
    return result;
  }, [online, loadSyncInfo]);

  /**
   * Synchronisation bidirectionnelle complète (PULL + PUSH)
   * @returns {Promise<{success: boolean, pullCount?: number, pushProcessed?: number, pushFailed?: number, error?: string}>}
   */
  const syncFull = useCallback(async () => {
    if (!online) {
      return { success: false, error: 'Mode hors ligne' };
    }

    setIsSyncing(true);
    setSyncError(null);

    const result = await fullSync();

    if (result.success) {
      await loadSyncInfo();
      await checkInitialization();
    } else {
      setSyncError(result.error);
    }

    setIsSyncing(false);
    return result;
  }, [online, loadSyncInfo, checkInitialization]);

  /**
   * Démarrer la synchronisation temps réel
   */
  const startSync = useCallback(() => {
    if (!online) {
      console.log('⚠ Impossible de démarrer la sync en mode hors ligne');
      return;
    }
    startRealtimeSync();
  }, [online]);

  /**
   * Arrêter la synchronisation temps réel
   */
  const stopSync = useCallback(async () => {
    await stopRealtimeSync();
  }, []);

  /**
   * Rafraîchir les statistiques de la queue
   */
  const refreshQueueStats = useCallback(async () => {
    const { stats } = await getSyncQueueStats();
    setQueueStats(stats);
  }, []);

  /**
   * Obtenir le statut de synchronisation
   */
  const getSyncStatus = useCallback(() => {
    return {
      online,
      isSyncing,
      isInitialized,
      hasPendingChanges: queueStats?.pending > 0,
      pendingCount: queueStats?.pending || 0,
      failedCount: queueStats?.failed || 0,
      lastPull: lastSync.lastPull,
      lastPush: lastSync.lastPush,
      error: syncError,
    };
  }, [online, isSyncing, isInitialized, queueStats, lastSync, syncError]);

  /**
   * Temps écoulé depuis la dernière synchronisation
   * @returns {Object} { pullMinutes, pushMinutes }
   */
  const getTimeSinceLastSync = useCallback(() => {
    const now = new Date();

    const pullMinutes = lastSync.lastPull
      ? Math.floor((now - new Date(lastSync.lastPull)) / 60000)
      : null;

    const pushMinutes = lastSync.lastPush
      ? Math.floor((now - new Date(lastSync.lastPush)) / 60000)
      : null;

    return { pullMinutes, pushMinutes };
  }, [lastSync]);

  /**
   * Vérifier si une synchronisation est nécessaire
   * @param {number} maxMinutes - Nombre de minutes max depuis la dernière sync
   * @returns {boolean}
   */
  const needsSync = useCallback((maxMinutes = 10) => {
    const { pushMinutes } = getTimeSinceLastSync();

    if (queueStats?.pending > 0) {
      return true;
    }

    if (pushMinutes === null || pushMinutes > maxMinutes) {
      return true;
    }

    return false;
  }, [getTimeSinceLastSync, queueStats]);

  return {
    // État
    online,
    isSyncing,
    isInitialized,
    syncError,
    lastSync,
    queueStats,

    // Actions de synchronisation
    syncPull,
    syncPush,
    syncFull,
    startSync,
    stopSync,

    // Utilitaires
    refreshQueueStats,
    getSyncStatus,
    getTimeSinceLastSync,
    needsSync,
    loadSyncInfo,
  };
};

export default useAdressesSync;
