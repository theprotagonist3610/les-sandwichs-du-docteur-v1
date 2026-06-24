import { initDB } from './indexedDB';

export const OPERATION_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  ACTIVATE: 'ACTIVATE',
  DEACTIVATE: 'DEACTIVATE',
};

export const SYNC_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export const addToSyncQueue = async (operation) => {
  try {
    const db = await initDB();
    const id = await db.add('sync_queue', {
      operation_type: operation.operation_type,
      entity_type: operation.entity_type || 'adresse',
      entity_id: operation.entity_id,
      data: operation.data,
      status: SYNC_STATUS.PENDING,
      timestamp: new Date().toISOString(),
      retry_count: 0,
      max_retries: 3,
    });
    return { success: true, id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getPendingOperations = async () => {
  try {
    const db = await initDB();
    const index = db.transaction('sync_queue').store.index('status_timestamp');
    const operations = await index.getAll([SYNC_STATUS.PENDING]);
    operations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return { operations };
  } catch (error) {
    return { operations: [], error: error.message };
  }
};

export const getFailedOperations = async () => {
  try {
    const db = await initDB();
    const index = db.transaction('sync_queue').store.index('status');
    const operations = await index.getAll(SYNC_STATUS.FAILED);
    return { operations };
  } catch (error) {
    return { operations: [], error: error.message };
  }
};

export const markOperationAsInProgress = async (id) => {
  try {
    const db = await initDB();
    const operation = await db.get('sync_queue', id);
    if (!operation) return { success: false, error: 'Opération non trouvée' };
    await db.put('sync_queue', {
      ...operation,
      status: SYNC_STATUS.IN_PROGRESS,
      started_at: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const markOperationAsCompleted = async (id) => {
  try {
    const db = await initDB();
    const operation = await db.get('sync_queue', id);
    if (!operation) return { success: false, error: 'Opération non trouvée' };
    await db.delete('sync_queue', id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const markOperationAsFailed = async (id, errorMessage) => {
  try {
    const db = await initDB();
    const operation = await db.get('sync_queue', id);
    if (!operation) return { success: false, error: 'Opération non trouvée' };

    const retryCount = (operation.retry_count || 0) + 1;
    const maxRetries = operation.max_retries || 3;
    const shouldRetry = retryCount < maxRetries;

    await db.put('sync_queue', {
      ...operation,
      status: shouldRetry ? SYNC_STATUS.PENDING : SYNC_STATUS.FAILED,
      retry_count: retryCount,
      last_error: errorMessage,
      last_error_at: new Date().toISOString(),
    });
    return { success: true, shouldRetry };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const retryFailedOperation = async (id) => {
  try {
    const db = await initDB();
    const operation = await db.get('sync_queue', id);
    if (!operation) return { success: false, error: 'Opération non trouvée' };
    await db.put('sync_queue', { ...operation, status: SYNC_STATUS.PENDING, retry_count: 0 });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const retryAllFailedOperations = async () => {
  try {
    const { operations } = await getFailedOperations();
    let count = 0;
    for (const operation of operations) {
      const { success } = await retryFailedOperation(operation.id);
      if (success) count++;
    }
    return { success: true, count };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const cleanupCompletedOperations = async (daysOld = 7) => {
  try {
    const db = await initDB();
    const index = db.transaction('sync_queue', 'readwrite').store.index('status');
    const operations = await index.getAll(SYNC_STATUS.COMPLETED);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let count = 0;
    const tx = db.transaction('sync_queue', 'readwrite');
    for (const operation of operations) {
      const completedAt = new Date(operation.completed_at || operation.timestamp);
      if (completedAt < cutoffDate) {
        await tx.store.delete(operation.id);
        count++;
      }
    }
    await tx.done;
    return { success: true, count };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getSyncQueueStats = async () => {
  try {
    const db = await initDB();
    const allOperations = await db.getAll('sync_queue');
    const stats = {
      total: allOperations.length,
      pending: allOperations.filter((op) => op.status === SYNC_STATUS.PENDING).length,
      in_progress: allOperations.filter((op) => op.status === SYNC_STATUS.IN_PROGRESS).length,
      completed: allOperations.filter((op) => op.status === SYNC_STATUS.COMPLETED).length,
      failed: allOperations.filter((op) => op.status === SYNC_STATUS.FAILED).length,
      byOperationType: {},
    };
    for (const type of Object.values(OPERATION_TYPES)) {
      stats.byOperationType[type] = allOperations.filter((op) => op.operation_type === type).length;
    }
    return { stats };
  } catch (error) {
    return { stats: null, error: error.message };
  }
};

export const clearSyncQueue = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction('sync_queue', 'readwrite');
    await tx.store.clear();
    await tx.done;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getOperationsByEntity = async (entityId) => {
  try {
    const db = await initDB();
    const allOperations = await db.getAll('sync_queue');
    const operations = allOperations
      .filter((op) => op.entity_id === entityId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return { operations };
  } catch (error) {
    return { operations: [], error: error.message };
  }
};
