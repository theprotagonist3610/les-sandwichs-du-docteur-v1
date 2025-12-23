import { initDB } from './indexedDB';

/**
 * Gestion de la file d'attente de synchronisation
 * Cette queue enregistre toutes les opérations CRUD effectuées localement
 * qui doivent être synchronisées avec Supabase
 */

/**
 * Types d'opérations de synchronisation
 */
export const OPERATION_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  ACTIVATE: 'ACTIVATE',
  DEACTIVATE: 'DEACTIVATE',
};

/**
 * Statuts des opérations dans la queue
 */
export const SYNC_STATUS = {
  PENDING: 'pending',      // En attente de synchronisation
  IN_PROGRESS: 'in_progress', // Synchronisation en cours
  COMPLETED: 'completed',  // Synchronisation réussie
  FAILED: 'failed',        // Échec de synchronisation
};

/**
 * Ajouter une opération à la queue de synchronisation
 * @param {Object} operation - L'opération à ajouter
 * @param {string} operation.operation_type - Type d'opération (CREATE, UPDATE, DELETE, etc.)
 * @param {string} operation.entity_type - Type d'entité (toujours 'adresse' pour ce module)
 * @param {string} operation.entity_id - ID de l'entité concernée
 * @param {Object} operation.data - Données de l'opération
 * @returns {Promise<{success: boolean, id?: number, error?: string}>}
 */
export const addToSyncQueue = async (operation) => {
  try {
    const db = await initDB();

    const queueItem = {
      operation_type: operation.operation_type,
      entity_type: operation.entity_type || 'adresse',
      entity_id: operation.entity_id,
      data: operation.data,
      status: SYNC_STATUS.PENDING,
      timestamp: new Date().toISOString(),
      retry_count: 0,
      max_retries: 3,
    };

    const id = await db.add('sync_queue', queueItem);

    console.log('✓ Opération ajoutée à la queue de sync:', id);
    return { success: true, id };
  } catch (error) {
    console.error('Erreur lors de l\'ajout à la queue:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer toutes les opérations en attente de synchronisation
 * Triées par timestamp (les plus anciennes en premier)
 * @returns {Promise<{operations: Array, error?: string}>}
 */
export const getPendingOperations = async () => {
  try {
    const db = await initDB();
    const index = db.transaction('sync_queue').store.index('status_timestamp');

    // Récupérer toutes les opérations avec le statut PENDING
    const operations = await index.getAll([SYNC_STATUS.PENDING]);

    // Trier par timestamp
    operations.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    return { operations };
  } catch (error) {
    console.error('Erreur lors de la récupération des opérations pending:', error);
    return { operations: [], error: error.message };
  }
};

/**
 * Récupérer les opérations ayant échoué
 * @returns {Promise<{operations: Array, error?: string}>}
 */
export const getFailedOperations = async () => {
  try {
    const db = await initDB();
    const index = db.transaction('sync_queue').store.index('status');
    const operations = await index.getAll(SYNC_STATUS.FAILED);

    return { operations };
  } catch (error) {
    console.error('Erreur lors de la récupération des opérations failed:', error);
    return { operations: [], error: error.message };
  }
};

/**
 * Marquer une opération comme en cours de synchronisation
 * @param {number} id - ID de l'opération dans la queue
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const markOperationAsInProgress = async (id) => {
  try {
    const db = await initDB();
    const operation = await db.get('sync_queue', id);

    if (!operation) {
      return { success: false, error: 'Opération non trouvée' };
    }

    const updated = {
      ...operation,
      status: SYNC_STATUS.IN_PROGRESS,
      started_at: new Date().toISOString(),
    };

    await db.put('sync_queue', updated);
    return { success: true };
  } catch (error) {
    console.error('Erreur lors du marquage in_progress:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Marquer une opération comme complétée et la retirer de la queue
 * @param {number} id - ID de l'opération dans la queue
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const markOperationAsCompleted = async (id) => {
  try {
    const db = await initDB();
    const operation = await db.get('sync_queue', id);

    if (!operation) {
      return { success: false, error: 'Opération non trouvée' };
    }

    // Option 1: Supprimer complètement l'opération de la queue
    await db.delete('sync_queue', id);

    // Option 2: Marquer comme complétée (pour l'historique)
    // const updated = {
    //   ...operation,
    //   status: SYNC_STATUS.COMPLETED,
    //   completed_at: new Date().toISOString(),
    // };
    // await db.put('sync_queue', updated);

    console.log('✓ Opération marquée comme complétée et retirée:', id);
    return { success: true };
  } catch (error) {
    console.error('Erreur lors du marquage completed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Marquer une opération comme échouée
 * @param {number} id - ID de l'opération dans la queue
 * @param {string} errorMessage - Message d'erreur
 * @returns {Promise<{success: boolean, shouldRetry?: boolean, error?: string}>}
 */
export const markOperationAsFailed = async (id, errorMessage) => {
  try {
    const db = await initDB();
    const operation = await db.get('sync_queue', id);

    if (!operation) {
      return { success: false, error: 'Opération non trouvée' };
    }

    const retryCount = (operation.retry_count || 0) + 1;
    const maxRetries = operation.max_retries || 3;
    const shouldRetry = retryCount < maxRetries;

    const updated = {
      ...operation,
      status: shouldRetry ? SYNC_STATUS.PENDING : SYNC_STATUS.FAILED,
      retry_count: retryCount,
      last_error: errorMessage,
      last_error_at: new Date().toISOString(),
    };

    await db.put('sync_queue', updated);

    console.log(
      `⚠ Opération marquée comme échouée (tentative ${retryCount}/${maxRetries}):`,
      id
    );

    return { success: true, shouldRetry };
  } catch (error) {
    console.error('Erreur lors du marquage failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Réinitialiser une opération échouée pour une nouvelle tentative
 * @param {number} id - ID de l'opération dans la queue
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const retryFailedOperation = async (id) => {
  try {
    const db = await initDB();
    const operation = await db.get('sync_queue', id);

    if (!operation) {
      return { success: false, error: 'Opération non trouvée' };
    }

    const updated = {
      ...operation,
      status: SYNC_STATUS.PENDING,
      retry_count: 0, // Réinitialiser le compteur
    };

    await db.put('sync_queue', updated);

    console.log('✓ Opération réinitialisée pour nouvelle tentative:', id);
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Réinitialiser toutes les opérations échouées
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export const retryAllFailedOperations = async () => {
  try {
    const { operations } = await getFailedOperations();

    let count = 0;
    for (const operation of operations) {
      const { success } = await retryFailedOperation(operation.id);
      if (success) count++;
    }

    console.log(`✓ ${count} opération(s) réinitialisée(s) pour nouvelle tentative`);
    return { success: true, count };
  } catch (error) {
    console.error('Erreur lors de la réinitialisation multiple:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Nettoyer les opérations complétées anciennes (si on choisit de les garder)
 * @param {number} daysOld - Supprimer les opérations complétées de plus de X jours
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export const cleanupCompletedOperations = async (daysOld = 7) => {
  try {
    const db = await initDB();
    const index = db.transaction('sync_queue', 'readwrite').store.index('status');
    const operations = await index.getAll(SYNC_STATUS.COMPLETED);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let count = 0;
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.store;

    for (const operation of operations) {
      const completedAt = new Date(operation.completed_at || operation.timestamp);
      if (completedAt < cutoffDate) {
        await store.delete(operation.id);
        count++;
      }
    }

    await tx.done;

    console.log(`✓ ${count} opération(s) complétée(s) nettoyée(s)`);
    return { success: true, count };
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtenir les statistiques de la queue de synchronisation
 * @returns {Promise<{stats: Object, error?: string}>}
 */
export const getSyncQueueStats = async () => {
  try {
    const db = await initDB();
    const allOperations = await db.getAll('sync_queue');

    const stats = {
      total: allOperations.length,
      pending: allOperations.filter(op => op.status === SYNC_STATUS.PENDING).length,
      in_progress: allOperations.filter(op => op.status === SYNC_STATUS.IN_PROGRESS).length,
      completed: allOperations.filter(op => op.status === SYNC_STATUS.COMPLETED).length,
      failed: allOperations.filter(op => op.status === SYNC_STATUS.FAILED).length,
      byOperationType: {},
    };

    // Statistiques par type d'opération
    Object.values(OPERATION_TYPES).forEach(type => {
      stats.byOperationType[type] = allOperations.filter(
        op => op.operation_type === type
      ).length;
    });

    return { stats };
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return { stats: null, error: error.message };
  }
};

/**
 * Vider complètement la queue de synchronisation (ATTENTION!)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const clearSyncQueue = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction('sync_queue', 'readwrite');
    await tx.store.clear();
    await tx.done;

    console.log('✓ Queue de synchronisation vidée');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors du vidage de la queue:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer les opérations pour une entité spécifique
 * @param {string} entityId - ID de l'entité
 * @returns {Promise<{operations: Array, error?: string}>}
 */
export const getOperationsByEntity = async (entityId) => {
  try {
    const db = await initDB();
    const allOperations = await db.getAll('sync_queue');

    const operations = allOperations.filter(op => op.entity_id === entityId);
    operations.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    return { operations };
  } catch (error) {
    console.error('Erreur lors de la récupération par entité:', error);
    return { operations: [], error: error.message };
  }
};

export default {
  OPERATION_TYPES,
  SYNC_STATUS,
  addToSyncQueue,
  getPendingOperations,
  getFailedOperations,
  markOperationAsInProgress,
  markOperationAsCompleted,
  markOperationAsFailed,
  retryFailedOperation,
  retryAllFailedOperations,
  cleanupCompletedOperations,
  getSyncQueueStats,
  clearSyncQueue,
  getOperationsByEntity,
};
