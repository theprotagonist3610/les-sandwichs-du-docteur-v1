import { supabase } from "@/config/supabase";

/**
 * Toolkit pour la gestion de l'historique des modifications de commandes
 *
 * Schema de la table commande_history (à créer dans Supabase):
 * {
 *   id: UUID auto-généré,
 *   commande_id: UUID (FK vers commandes),
 *   user_id: UUID (FK vers users),
 *   action: string ('create' | 'update' | 'delete' | 'deliver' | 'close'),
 *   changes: JSONB (détails des modifications),
 *   snapshot: JSONB (état complet de la commande au moment de la modification),
 *   created_at: timestamp,
 * }
 *
 * Fonctionnalités:
 * - Enregistrement automatique des modifications
 * - Consultation de l'historique d'une commande
 * - Rollback vers une version antérieure
 * - Comparaison entre versions
 */

// ============================================================================
// TYPES D'ACTIONS
// ============================================================================

export const HISTORY_ACTIONS = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  DELIVER: "deliver",
  CLOSE: "close",
  ROLLBACK: "rollback",
};

// ============================================================================
// ENREGISTREMENT DE L'HISTORIQUE
// ============================================================================

/**
 * Enregistrer une modification dans l'historique
 * @param {Object} params - Paramètres
 * @param {string} params.commandeId - ID de la commande
 * @param {string} params.userId - ID de l'utilisateur qui fait la modification
 * @param {string} params.action - Type d'action (create, update, delete, deliver, close)
 * @param {Object} params.changes - Détails des changements (ancien -> nouveau)
 * @param {Object} params.snapshot - État complet de la commande après modification
 * @returns {Promise<{success: boolean, history?: Object, error?: string}>}
 */
export const recordHistory = async ({
  commandeId,
  userId,
  action,
  changes = {},
  snapshot = null,
}) => {
  try {
    const { data, error } = await supabase
      .from("commande_history")
      .insert([
        {
          commande_id: commandeId,
          user_id: userId,
          action,
          changes,
          snapshot,
        },
      ])
      .select(
        `
        *,
        user:users!user_id(
          id,
          nom,
          prenoms,
          email
        )
      `
      )
      .single();

    if (error) {
      console.error("Erreur enregistrement historique:", error);
      return { success: false, error: error.message };
    }

    return { success: true, history: data };
  } catch (error) {
    console.error("Erreur inattendue enregistrement historique:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Enregistrer une création de commande
 * @param {string} commandeId - ID de la commande créée
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} commandeData - Données de la commande créée
 */
export const recordCreate = async (commandeId, userId, commandeData) => {
  return recordHistory({
    commandeId,
    userId,
    action: HISTORY_ACTIONS.CREATE,
    changes: { created: commandeData },
    snapshot: commandeData,
  });
};

/**
 * Enregistrer une modification de commande
 * @param {string} commandeId - ID de la commande
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} previousState - État avant modification
 * @param {Object} newState - État après modification
 */
export const recordUpdate = async (
  commandeId,
  userId,
  previousState,
  newState
) => {
  // Calculer les changements
  const changes = calculateChanges(previousState, newState);

  return recordHistory({
    commandeId,
    userId,
    action: HISTORY_ACTIONS.UPDATE,
    changes,
    snapshot: newState,
  });
};

/**
 * Enregistrer une livraison
 * @param {string} commandeId - ID de la commande
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} commandeState - État de la commande après livraison
 */
export const recordDelivery = async (commandeId, userId, commandeState) => {
  return recordHistory({
    commandeId,
    userId,
    action: HISTORY_ACTIONS.DELIVER,
    changes: {
      statut_livraison: {
        from: "en-attente",
        to: commandeState.statut_livraison,
      },
      date_reelle_livraison: commandeState.date_reelle_livraison,
      heure_reelle_livraison: commandeState.heure_reelle_livraison,
    },
    snapshot: commandeState,
  });
};

/**
 * Enregistrer une clôture
 * @param {string} commandeId - ID de la commande
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} commandeState - État de la commande après clôture
 */
export const recordClose = async (commandeId, userId, commandeState) => {
  return recordHistory({
    commandeId,
    userId,
    action: HISTORY_ACTIONS.CLOSE,
    changes: {
      statut_commande: {
        from: "en-cours",
        to: commandeState.statut_commande,
      },
    },
    snapshot: commandeState,
  });
};

/**
 * Enregistrer un rollback
 * @param {string} commandeId - ID de la commande
 * @param {string} userId - ID de l'utilisateur
 * @param {string} targetHistoryId - ID de l'entrée historique vers laquelle on fait le rollback
 * @param {Object} restoredState - État restauré
 */
export const recordRollback = async (
  commandeId,
  userId,
  targetHistoryId,
  restoredState
) => {
  return recordHistory({
    commandeId,
    userId,
    action: HISTORY_ACTIONS.ROLLBACK,
    changes: {
      rollback_to: targetHistoryId,
    },
    snapshot: restoredState,
  });
};

// ============================================================================
// CONSULTATION DE L'HISTORIQUE
// ============================================================================

/**
 * Récupérer l'historique complet d'une commande
 * @param {string} commandeId - ID de la commande
 * @param {Object} options - Options
 * @param {number} options.limit - Nombre max d'entrées (défaut: 50)
 * @param {number} options.offset - Offset pour pagination
 * @returns {Promise<{success: boolean, history?: Array, total?: number, error?: string}>}
 */
export const getCommandeHistory = async (commandeId, options = {}) => {
  try {
    const { limit = 50, offset = 0 } = options;

    // Compter le total
    const { count } = await supabase
      .from("commande_history")
      .select("*", { count: "exact", head: true })
      .eq("commande_id", commandeId);

    // Récupérer les entrées
    const { data, error } = await supabase
      .from("commande_history")
      .select(
        `
        *,
        user:users!user_id(
          id,
          nom,
          prenoms,
          email
        )
      `
      )
      .eq("commande_id", commandeId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Erreur récupération historique:", error);
      return { success: false, error: error.message };
    }

    return { success: true, history: data || [], total: count || 0 };
  } catch (error) {
    console.error("Erreur inattendue récupération historique:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer une entrée spécifique de l'historique
 * @param {string} historyId - ID de l'entrée historique
 * @returns {Promise<{success: boolean, entry?: Object, error?: string}>}
 */
export const getHistoryEntry = async (historyId) => {
  try {
    const { data, error } = await supabase
      .from("commande_history")
      .select(
        `
        *,
        user:users!user_id(
          id,
          nom,
          prenoms,
          email
        )
      `
      )
      .eq("id", historyId)
      .single();

    if (error) {
      console.error("Erreur récupération entrée historique:", error);
      return { success: false, error: error.message };
    }

    return { success: true, entry: data };
  } catch (error) {
    console.error("Erreur inattendue récupération entrée:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer les modifications récentes (toutes commandes)
 * @param {Object} options - Options
 * @param {number} options.limit - Nombre max d'entrées (défaut: 20)
 * @param {string} options.userId - Filtrer par utilisateur
 * @param {string} options.action - Filtrer par type d'action
 * @returns {Promise<{success: boolean, history?: Array, error?: string}>}
 */
export const getRecentHistory = async (options = {}) => {
  try {
    const { limit = 20, userId, action } = options;

    let query = supabase
      .from("commande_history")
      .select(
        `
        *,
        user:users!user_id(
          id,
          nom,
          prenoms,
          email
        ),
        commande:commandes!commande_id(
          id,
          client,
          montant_total,
          statut_commande
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (action) {
      query = query.eq("action", action);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur récupération historique récent:", error);
      return { success: false, error: error.message };
    }

    return { success: true, history: data || [] };
  } catch (error) {
    console.error("Erreur inattendue récupération historique récent:", error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// ROLLBACK
// ============================================================================

/**
 * Restaurer une commande à un état antérieur
 * @param {string} commandeId - ID de la commande
 * @param {string} historyId - ID de l'entrée historique à restaurer
 * @param {string} userId - ID de l'utilisateur effectuant le rollback
 * @param {number} currentVersion - Version actuelle de la commande (pour éviter les collisions)
 * @returns {Promise<{success: boolean, commande?: Object, error?: string}>}
 */
export const rollbackToHistory = async (
  commandeId,
  historyId,
  userId,
  currentVersion
) => {
  try {
    // Récupérer l'entrée historique
    const historyResult = await getHistoryEntry(historyId);
    if (!historyResult.success || !historyResult.entry?.snapshot) {
      return {
        success: false,
        error: "Entrée historique non trouvée ou sans snapshot",
      };
    }

    const snapshot = historyResult.entry.snapshot;

    // Préparer les données à restaurer (exclure certains champs)
    const {
      id,
      vendeur,
      vendeur_id,
      vendeur_info,
      version,
      created_at,
      updated_at,
      ...restorableData
    } = snapshot;

    // Mettre à jour la commande
    const { data, error } = await supabase
      .from("commandes")
      .update({
        ...restorableData,
        version: currentVersion + 1,
      })
      .eq("id", commandeId)
      .eq("version", currentVersion)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error:
            "Collision de version détectée. La commande a été modifiée par un autre utilisateur.",
        };
      }
      console.error("Erreur rollback commande:", error);
      return { success: false, error: error.message };
    }

    // Enregistrer le rollback dans l'historique
    await recordRollback(commandeId, userId, historyId, data);

    return { success: true, commande: data };
  } catch (error) {
    console.error("Erreur inattendue rollback:", error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// COMPARAISON
// ============================================================================

/**
 * Comparer deux états de commande
 * @param {Object} stateA - Premier état
 * @param {Object} stateB - Deuxième état
 * @returns {Object} Différences entre les deux états
 */
export const compareStates = (stateA, stateB) => {
  const differences = {};
  const ignoreFields = ["version", "updated_at", "created_at"];

  const allKeys = new Set([...Object.keys(stateA), ...Object.keys(stateB)]);

  allKeys.forEach((key) => {
    if (ignoreFields.includes(key)) return;

    const valueA = JSON.stringify(stateA[key]);
    const valueB = JSON.stringify(stateB[key]);

    if (valueA !== valueB) {
      differences[key] = {
        before: stateA[key],
        after: stateB[key],
      };
    }
  });

  return differences;
};

/**
 * Comparer deux entrées historiques
 * @param {string} historyIdA - ID de la première entrée
 * @param {string} historyIdB - ID de la deuxième entrée
 * @returns {Promise<{success: boolean, differences?: Object, error?: string}>}
 */
export const compareHistoryEntries = async (historyIdA, historyIdB) => {
  try {
    const [resultA, resultB] = await Promise.all([
      getHistoryEntry(historyIdA),
      getHistoryEntry(historyIdB),
    ]);

    if (!resultA.success || !resultA.entry?.snapshot) {
      return { success: false, error: "Première entrée non trouvée" };
    }

    if (!resultB.success || !resultB.entry?.snapshot) {
      return { success: false, error: "Deuxième entrée non trouvée" };
    }

    const differences = compareStates(
      resultA.entry.snapshot,
      resultB.entry.snapshot
    );

    return {
      success: true,
      differences,
      entryA: resultA.entry,
      entryB: resultB.entry,
    };
  } catch (error) {
    console.error("Erreur comparaison entrées:", error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// UTILITAIRES
// ============================================================================

/**
 * Calculer les changements entre deux états
 * @param {Object} previousState - État avant
 * @param {Object} newState - État après
 * @returns {Object} Changements détaillés
 */
export const calculateChanges = (previousState, newState) => {
  const changes = {};
  const ignoreFields = ["version", "updated_at"];

  Object.keys(newState).forEach((key) => {
    if (ignoreFields.includes(key)) return;

    const prevValue = previousState[key];
    const newValue = newState[key];

    if (JSON.stringify(prevValue) !== JSON.stringify(newValue)) {
      changes[key] = {
        from: prevValue,
        to: newValue,
      };
    }
  });

  return changes;
};

/**
 * Formater une entrée historique pour l'affichage
 * @param {Object} entry - Entrée historique
 * @returns {Object} Entrée formatée
 */
export const formatHistoryEntry = (entry) => {
  const actionLabels = {
    [HISTORY_ACTIONS.CREATE]: "Création",
    [HISTORY_ACTIONS.UPDATE]: "Modification",
    [HISTORY_ACTIONS.DELETE]: "Suppression",
    [HISTORY_ACTIONS.DELIVER]: "Livraison",
    [HISTORY_ACTIONS.CLOSE]: "Clôture",
    [HISTORY_ACTIONS.ROLLBACK]: "Restauration",
  };

  const actionColors = {
    [HISTORY_ACTIONS.CREATE]: "green",
    [HISTORY_ACTIONS.UPDATE]: "blue",
    [HISTORY_ACTIONS.DELETE]: "red",
    [HISTORY_ACTIONS.DELIVER]: "purple",
    [HISTORY_ACTIONS.CLOSE]: "orange",
    [HISTORY_ACTIONS.ROLLBACK]: "yellow",
  };

  return {
    ...entry,
    actionLabel: actionLabels[entry.action] || entry.action,
    actionColor: actionColors[entry.action] || "gray",
    userName: entry.user
      ? `${entry.user.prenoms} ${entry.user.nom}`
      : "Utilisateur inconnu",
    formattedDate: new Date(entry.created_at).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }),
    changeCount: entry.changes ? Object.keys(entry.changes).length : 0,
  };
};

/**
 * Obtenir un résumé des modifications
 * @param {Object} changes - Objet des changements
 * @returns {string} Résumé textuel
 */
export const getChangesSummary = (changes) => {
  if (!changes || Object.keys(changes).length === 0) {
    return "Aucune modification";
  }

  const fieldLabels = {
    client: "Client",
    contact_client: "Contact",
    type: "Type",
    lieu_livraison: "Lieu de livraison",
    statut_commande: "Statut commande",
    statut_livraison: "Statut livraison",
    montant_total: "Montant total",
    details_commandes: "Détails",
    details_paiement: "Paiement",
    livreur_id: "Livreur",
    instructions_livraison: "Instructions",
    frais_livraison: "Frais de livraison",
  };

  const summaryParts = Object.keys(changes).map((key) => {
    return fieldLabels[key] || key;
  });

  return `Modifié: ${summaryParts.join(", ")}`;
};
