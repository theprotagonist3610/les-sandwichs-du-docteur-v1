import { supabase } from "@/config/supabase";

/**
 * Toolkit pour la gestion de l'historique des modifications de commandes
 *
 * IMPORTANT: L'historique est géré automatiquement par un trigger PostgreSQL
 * (voir sql/create_commandes_history_trigger.sql)
 *
 * Schema de la table commandes_history:
 * {
 *   history_id: UUID auto-généré (PK),
 *   commande_id: UUID (FK vers commandes),
 *   modified_by: UUID (FK vers users),
 *   action: ENUM ('INSERT', 'UPDATE', 'DELETE'),
 *   commande_data: JSONB (état complet de la commande au moment de la modification),
 *   metadata: JSONB (informations additionnelles),
 *   modified_at: timestamptz,
 *   version: integer,
 * }
 *
 * Le trigger enregistre automatiquement:
 * - Toutes les créations de commandes (INSERT)
 * - Toutes les modifications de commandes (UPDATE)
 * - Toutes les suppressions de commandes (DELETE)
 *
 * Fonctionnalités de ce toolkit:
 * - Consultation de l'historique d'une commande (READ-ONLY)
 * - Rollback vers une version antérieure (via fonction PostgreSQL restore_commande_version)
 * - Comparaison entre versions
 *
 * Note: Les fonctions d'insertion manuelle sont désactivées car le trigger
 * gère l'historique automatiquement et les RLS policies bloquent les inserts directs.
 */

// ============================================================================
// TYPES D'ACTIONS (mappés aux valeurs ENUM du trigger)
// ============================================================================

export const HISTORY_ACTIONS = {
  INSERT: "INSERT",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
};

// ============================================================================
// ENREGISTREMENT DE L'HISTORIQUE
// ============================================================================

/**
 * NOTE: L'enregistrement de l'historique est géré automatiquement par un trigger PostgreSQL.
 * Les fonctions ci-dessous sont DÉSACTIVÉES car elles ne fonctionnent pas avec la configuration actuelle:
 * - Le trigger enregistre automatiquement toutes les modifications sur la table 'commandes'
 * - Les RLS policies bloquent les inserts directs dans 'commandes_history'
 * - Seul le trigger peut insérer dans la table d'historique
 *
 * Pour enregistrer une modification dans l'historique:
 * 1. Modifiez directement la table 'commandes' (INSERT/UPDATE/DELETE)
 * 2. Le trigger 'log_commande_changes' enregistrera automatiquement la modification
 * 3. L'utilisateur authentifié (auth.uid()) sera automatiquement enregistré comme 'modified_by'
 *
 * Voir: sql/create_commandes_history_trigger.sql pour la configuration du trigger
 */

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
      .from("commandes_history")
      .select("*", { count: "exact", head: true })
      .eq("commande_id", commandeId);

    // Récupérer les entrées
    const { data, error } = await supabase
      .from("commandes_history")
      .select(
        `
        *,
        user:users!modified_by(
          id,
          nom,
          prenoms,
          email
        )
      `
      )
      .eq("commande_id", commandeId)
      .order("modified_at", { ascending: false })
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
      .from("commandes_history")
      .select(
        `
        *,
        user:users!modified_by(
          id,
          nom,
          prenoms,
          email
        )
      `
      )
      .eq("history_id", historyId)
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
      .from("commandes_history")
      .select(
        `
        *,
        user:users!modified_by(
          id,
          nom,
          prenoms,
          email
        ),
        commande:commandes!commande_id(
          id,
          client,
          statut_commande,
          details_paiement
        )
      `
      )
      .order("modified_at", { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq("modified_by", userId);
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
 * Utilise la fonction PostgreSQL restore_commande_version()
 * @param {string} commandeId - ID de la commande
 * @param {string} historyId - ID de l'entrée historique à restaurer
 * @returns {Promise<{success: boolean, commande?: Object, error?: string}>}
 */
export const rollbackToHistory = async (commandeId, historyId) => {
  try {
    // Vérifier que l'entrée historique existe
    const historyResult = await getHistoryEntry(historyId);
    if (!historyResult.success || !historyResult.entry?.commande_data) {
      return {
        success: false,
        error: "Entrée historique non trouvée ou sans données",
      };
    }

    // Utiliser la fonction PostgreSQL pour restaurer
    // Note: Cette fonction gère automatiquement:
    // - La restauration des données
    // - L'enregistrement de l'action de rollback dans l'historique
    // - L'incrémentation de la version
    const { data, error } = await supabase.rpc("restore_commande_version", {
      p_commande_id: commandeId,
      p_history_id: historyId,
    });

    if (error) {
      console.error("Erreur rollback commande:", error);
      return { success: false, error: error.message };
    }

    // Récupérer la commande restaurée
    const { data: commande, error: fetchError } = await supabase
      .from("commandes")
      .select("*")
      .eq("id", commandeId)
      .single();

    if (fetchError) {
      console.error("Erreur récupération commande restaurée:", fetchError);
      return { success: false, error: fetchError.message };
    }

    return { success: true, commande };
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

    if (!resultA.success || !resultA.entry?.commande_data) {
      return { success: false, error: "Première entrée non trouvée" };
    }

    if (!resultB.success || !resultB.entry?.commande_data) {
      return { success: false, error: "Deuxième entrée non trouvée" };
    }

    const differences = compareStates(
      resultA.entry.commande_data,
      resultB.entry.commande_data
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
    [HISTORY_ACTIONS.INSERT]: "Créée le",
    [HISTORY_ACTIONS.UPDATE]: "Modifiée le",
    [HISTORY_ACTIONS.DELETE]: "Supprimée le",
  };

  const actionColors = {
    [HISTORY_ACTIONS.INSERT]: "green",
    [HISTORY_ACTIONS.UPDATE]: "blue",
    [HISTORY_ACTIONS.DELETE]: "red",
  };

  return {
    ...entry,
    actionLabel: actionLabels[entry.action] || entry.action,
    actionColor: actionColors[entry.action] || "gray",
    userName: entry.user
      ? `${entry.user.prenoms} ${entry.user.nom}`
      : "Utilisateur inconnu",
    formattedDate: new Date(entry.modified_at).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    changeCount: entry.metadata?.changes ? Object.keys(entry.metadata.changes).length : 0,
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
    point_de_vente: "Point de vente",
  };

  const summaryParts = Object.keys(changes).map((key) => {
    return fieldLabels[key] || key;
  });

  return `Modifié: ${summaryParts.join(", ")}`;
};
