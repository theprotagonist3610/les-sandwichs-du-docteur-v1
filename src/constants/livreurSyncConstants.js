export const OPERATION_TYPES = {
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
};

export const ENTITY_TYPES = {
  LIVREUR: 'livreur',
};

export const SYNC_STATUS = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  FAILED: 'failed',
};

// Mappe les types user-friendly ("create", "update", "delete") vers les types SQL
export const mapOperationType = (userType) => {
  const mapping = {
    create: OPERATION_TYPES.INSERT,
    update: OPERATION_TYPES.UPDATE,
    delete: OPERATION_TYPES.DELETE,
    INSERT: OPERATION_TYPES.INSERT,
    UPDATE: OPERATION_TYPES.UPDATE,
    DELETE: OPERATION_TYPES.DELETE,
  };

  const normalized = mapping[userType];

  if (!normalized) {
    throw new Error(`Type d'opération invalide: ${userType}. Attendu: create, update, delete`);
  }

  return normalized;
};
