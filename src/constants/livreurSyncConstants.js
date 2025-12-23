/**
 * Constantes pour la synchronisation des livreurs (IndexedDB ↔ Supabase)
 */

// Types d'opérations (conformes à la contrainte SQL)
export const OPERATION_TYPES = {
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
};

// Types d'entités
export const ENTITY_TYPES = {
  LIVREUR: 'livreur',
};

// Statuts de synchronisation
export const SYNC_STATUS = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  FAILED: 'failed',
};

/**
 * Mapper les types user-friendly vers les types SQL
 * @param {string} userType - Type fourni par l'interface ("create", "update", "delete")
 * @returns {string} Type SQL ("INSERT", "UPDATE", "DELETE")
 * @throws {Error} Si le type est invalide
 */
export const mapOperationType = (userType) => {
  const mapping = {
    'create': OPERATION_TYPES.INSERT,
    'update': OPERATION_TYPES.UPDATE,
    'delete': OPERATION_TYPES.DELETE,
    'INSERT': OPERATION_TYPES.INSERT,
    'UPDATE': OPERATION_TYPES.UPDATE,
    'DELETE': OPERATION_TYPES.DELETE,
  };

  const normalized = mapping[userType];

  if (!normalized) {
    throw new Error(`Type d'opération invalide: ${userType}. Attendu: create, update, delete`);
  }

  return normalized;
};
