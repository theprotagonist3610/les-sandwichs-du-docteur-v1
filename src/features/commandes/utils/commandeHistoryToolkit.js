import { supabase } from "@/lib/supabase";

export const HISTORY_ACTIONS = {
  INSERT: "INSERT",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
};

export const getCommandeHistory = async (commandeId, options = {}) => {
  try {
    const { limit = 50, offset = 0 } = options;

    const { count } = await supabase
      .from("commandes_history")
      .select("*", { count: "exact", head: true })
      .eq("commande_id", commandeId);

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
      return { success: false, error: error.message };
    }

    return { success: true, history: data || [], total: count || 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

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
      return { success: false, error: error.message };
    }

    return { success: true, entry: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

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
      return { success: false, error: error.message };
    }

    return { success: true, history: data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const rollbackToHistory = async (commandeId, historyId) => {
  try {
    const historyResult = await getHistoryEntry(historyId);
    if (!historyResult.success || !historyResult.entry?.commande_data) {
      return {
        success: false,
        error: "Entrée historique non trouvée ou sans données",
      };
    }

    const { data, error } = await supabase.rpc("restore_commande_version", {
      p_commande_id: commandeId,
      p_history_id: historyId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: commande, error: fetchError } = await supabase
      .from("commandes")
      .select("*")
      .eq("id", commandeId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    return { success: true, commande };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const compareStates = (stateA, stateB) => {
  const differences = {};
  const ignoreFields = ["version", "updated_at", "created_at"];

  const allKeys = new Set([...Object.keys(stateA), ...Object.keys(stateB)]);

  allKeys.forEach((key) => {
    if (ignoreFields.includes(key)) return;

    const valueA = JSON.stringify(stateA[key]);
    const valueB = JSON.stringify(stateB[key]);

    if (valueA !== valueB) {
      differences[key] = { before: stateA[key], after: stateB[key] };
    }
  });

  return differences;
};

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
    return { success: false, error: error.message };
  }
};

export const calculateChanges = (previousState, newState) => {
  const changes = {};
  const ignoreFields = ["version", "updated_at"];

  Object.keys(newState).forEach((key) => {
    if (ignoreFields.includes(key)) return;

    const prevValue = previousState[key];
    const newValue = newState[key];

    if (JSON.stringify(prevValue) !== JSON.stringify(newValue)) {
      changes[key] = { from: prevValue, to: newValue };
    }
  });

  return changes;
};

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
