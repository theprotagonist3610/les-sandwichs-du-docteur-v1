import { supabase } from "@/config/supabase";

/**
 * Toolkit pour la gestion de la comptabilité de caisse
 *
 * Schema de la table operations_comptables:
 * {
 *   id: UUID auto-généré (PK),
 *   operation: ENUM('encaissement', 'depense'),
 *   compte: ENUM('caisse', 'MTN MoMo', 'Moov Money', 'Celtiis Cash', 'banque', 'autre'),
 *   montant: float,
 *   motif: string,
 *   date_operation: date,
 *   user_id: UUID (FK vers users),
 *   created_at: timestamptz,
 *   updated_at: timestamptz,
 * }
 *
 * Fonctionnalités:
 * - CRUD complet des opérations comptables
 * - Calcul des soldes par compte
 * - Filtrage et recherche
 * - Statistiques et rapports
 * - Export de données
 */

// ============================================================================
// CONSTANTES
// ============================================================================

export const TYPES_OPERATION = {
  ENCAISSEMENT: "encaissement",
  DEPENSE: "depense",
};

export const TYPES_COMPTE = {
  CAISSE: "caisse",
  MTN_MOMO: "MTN MoMo",
  MOOV_MONEY: "Moov Money",
  CELTIIS_CASH: "Celtiis Cash",
  BANQUE: "banque",
  AUTRE: "autre",
};

export const COMPTE_LABELS = {
  [TYPES_COMPTE.CAISSE]: "Caisse",
  [TYPES_COMPTE.MTN_MOMO]: "MTN MoMo",
  [TYPES_COMPTE.MOOV_MONEY]: "Moov Money",
  [TYPES_COMPTE.CELTIIS_CASH]: "Celtiis Cash",
  [TYPES_COMPTE.BANQUE]: "Banque",
  [TYPES_COMPTE.AUTRE]: "Autre",
};

export const TYPES_BUDGET = {
  BUDGET: "budget",
  PREVISION: "prevision",
};

export const STATUTS_BUDGET = {
  BROUILLON: "brouillon",
  VALIDE: "valide",
  CLOTURE: "cloture",
};

// ============================================================================
// CRÉATION
// ============================================================================

/**
 * Créer une nouvelle opération comptable
 * @param {Object} operationData - Données de l'opération
 * @param {string} operationData.operation - Type d'opération (encaissement/depense)
 * @param {string} operationData.compte - Type de compte
 * @param {number} operationData.montant - Montant de l'opération
 * @param {string} operationData.motif - Motif de l'opération
 * @param {string} operationData.date_operation - Date de l'opération (ISO format)
 * @returns {Promise<{success: boolean, operation?: Object, error?: string}>}
 */
export const createOperation = async (operationData) => {
  try {
    // Validation des données
    if (!operationData.operation || !operationData.compte) {
      return {
        success: false,
        error: "Le type d'opération et le compte sont requis",
      };
    }

    if (!operationData.montant || operationData.montant <= 0) {
      return {
        success: false,
        error: "Le montant doit être supérieur à 0",
      };
    }

    if (!operationData.motif || operationData.motif.trim() === "") {
      return {
        success: false,
        error: "Le motif est requis",
      };
    }

    // Récupérer l'utilisateur authentifié
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Utilisateur non authentifié" };
    }

    // Préparer les données
    const dataToInsert = {
      operation: operationData.operation,
      compte: operationData.compte,
      montant: parseFloat(operationData.montant),
      motif: operationData.motif.trim(),
      date_operation: operationData.date_operation || new Date().toISOString(),
      user_id: user.id,
    };

    // Insérer dans la base de données
    const { data, error } = await supabase
      .from("operations_comptables")
      .insert(dataToInsert)
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
      console.error("Erreur création opération:", error);
      return { success: false, error: error.message };
    }

    return { success: true, operation: data };
  } catch (error) {
    console.error("Erreur inattendue création opération:", error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// LECTURE
// ============================================================================

/**
 * Récupérer toutes les opérations avec filtres et pagination
 * @param {Object} options - Options de filtrage
 * @param {string} options.operation - Filtrer par type d'opération
 * @param {string} options.compte - Filtrer par type de compte
 * @param {string} options.startDate - Date de début (ISO format)
 * @param {string} options.endDate - Date de fin (ISO format)
 * @param {string} options.searchTerm - Terme de recherche dans le motif
 * @param {number} options.limit - Nombre max d'opérations (défaut: 50)
 * @param {number} options.offset - Offset pour pagination
 * @param {string} options.orderBy - Champ de tri (défaut: date_operation)
 * @param {boolean} options.ascending - Ordre croissant (défaut: false)
 * @returns {Promise<{success: boolean, operations?: Array, total?: number, error?: string}>}
 */
export const getOperations = async (options = {}) => {
  try {
    const {
      operation,
      compte,
      startDate,
      endDate,
      searchTerm,
      limit = 50,
      offset = 0,
      orderBy = "date_operation",
      ascending = false,
    } = options;

    // Construire la requête
    let query = supabase
      .from("operations_comptables")
      .select(
        `
        *,
        user:users!user_id(
          id,
          nom,
          prenoms,
          email
        )
      `,
        { count: "exact" }
      );

    // Appliquer les filtres
    if (operation) {
      query = query.eq("operation", operation);
    }

    if (compte) {
      query = query.eq("compte", compte);
    }

    if (startDate) {
      query = query.gte("date_operation", startDate);
    }

    if (endDate) {
      query = query.lte("date_operation", endDate);
    }

    if (searchTerm) {
      query = query.ilike("motif", `%${searchTerm}%`);
    }

    // Appliquer tri et pagination
    query = query
      .order(orderBy, { ascending })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Erreur récupération opérations:", error);
      return { success: false, error: error.message };
    }

    return { success: true, operations: data || [], total: count || 0 };
  } catch (error) {
    console.error("Erreur inattendue récupération opérations:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer une opération spécifique par ID
 * @param {string} operationId - ID de l'opération
 * @returns {Promise<{success: boolean, operation?: Object, error?: string}>}
 */
export const getOperationById = async (operationId) => {
  try {
    const { data, error } = await supabase
      .from("operations_comptables")
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
      .eq("id", operationId)
      .single();

    if (error) {
      console.error("Erreur récupération opération:", error);
      return { success: false, error: error.message };
    }

    return { success: true, operation: data };
  } catch (error) {
    console.error("Erreur inattendue récupération opération:", error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// MISE À JOUR
// ============================================================================

/**
 * Mettre à jour une opération existante
 * @param {string} operationId - ID de l'opération à modifier
 * @param {Object} updates - Données à mettre à jour
 * @returns {Promise<{success: boolean, operation?: Object, error?: string}>}
 */
export const updateOperation = async (operationId, updates) => {
  try {
    // Validation
    if (!operationId) {
      return { success: false, error: "ID de l'opération requis" };
    }

    // Filtrer les champs non modifiables
    const { id, user_id, created_at, ...allowedUpdates } = updates;

    // Validation du montant si présent
    if (allowedUpdates.montant !== undefined) {
      if (allowedUpdates.montant <= 0) {
        return {
          success: false,
          error: "Le montant doit être supérieur à 0",
        };
      }
      allowedUpdates.montant = parseFloat(allowedUpdates.montant);
    }

    // Validation du motif si présent
    if (
      allowedUpdates.motif !== undefined &&
      allowedUpdates.motif.trim() === ""
    ) {
      return { success: false, error: "Le motif ne peut pas être vide" };
    }

    // Mettre à jour
    const { data, error } = await supabase
      .from("operations_comptables")
      .update(allowedUpdates)
      .eq("id", operationId)
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
      console.error("Erreur mise à jour opération:", error);
      return { success: false, error: error.message };
    }

    return { success: true, operation: data };
  } catch (error) {
    console.error("Erreur inattendue mise à jour opération:", error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// SUPPRESSION
// ============================================================================

/**
 * Supprimer une opération
 * @param {string} operationId - ID de l'opération à supprimer
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteOperation = async (operationId) => {
  try {
    if (!operationId) {
      return { success: false, error: "ID de l'opération requis" };
    }

    const { error } = await supabase
      .from("operations_comptables")
      .delete()
      .eq("id", operationId);

    if (error) {
      console.error("Erreur suppression opération:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur inattendue suppression opération:", error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// CALCULS ET STATISTIQUES
// ============================================================================

/**
 * Calculer le solde d'un compte spécifique
 * @param {string} compte - Type de compte
 * @param {string} startDate - Date de début (optionnel)
 * @param {string} endDate - Date de fin (optionnel)
 * @returns {Promise<{success: boolean, solde?: number, encaissements?: number, depenses?: number, error?: string}>}
 */
export const getSoldeCompte = async (compte, startDate = null, endDate = null) => {
  try {
    let query = supabase
      .from("operations_comptables")
      .select("operation, montant");

    if (compte) {
      query = query.eq("compte", compte);
    }

    if (startDate) {
      query = query.gte("date_operation", startDate);
    }

    if (endDate) {
      query = query.lte("date_operation", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur calcul solde:", error);
      return { success: false, error: error.message };
    }

    // Calculer les totaux
    let encaissements = 0;
    let depenses = 0;

    data.forEach((op) => {
      if (op.operation === TYPES_OPERATION.ENCAISSEMENT) {
        encaissements += parseFloat(op.montant);
      } else if (op.operation === TYPES_OPERATION.DEPENSE) {
        depenses += parseFloat(op.montant);
      }
    });

    const solde = encaissements - depenses;

    return {
      success: true,
      solde,
      encaissements,
      depenses,
    };
  } catch (error) {
    console.error("Erreur inattendue calcul solde:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtenir les soldes de tous les comptes
 * @param {string} startDate - Date de début (optionnel)
 * @param {string} endDate - Date de fin (optionnel)
 * @returns {Promise<{success: boolean, soldes?: Object, error?: string}>}
 */
export const getAllSoldes = async (startDate = null, endDate = null) => {
  try {
    const comptes = Object.values(TYPES_COMPTE);
    const soldesPromises = comptes.map((compte) =>
      getSoldeCompte(compte, startDate, endDate)
    );

    const results = await Promise.all(soldesPromises);

    const soldes = {};
    let totalGeneral = 0;

    comptes.forEach((compte, index) => {
      if (results[index].success) {
        soldes[compte] = results[index];
        totalGeneral += results[index].solde;
      }
    });

    return {
      success: true,
      soldes,
      totalGeneral,
    };
  } catch (error) {
    console.error("Erreur inattendue calcul soldes:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtenir les statistiques pour une période donnée
 * @param {string} startDate - Date de début
 * @param {string} endDate - Date de fin
 * @returns {Promise<{success: boolean, stats?: Object, error?: string}>}
 */
export const getStatistiquesPeriode = async (startDate, endDate) => {
  try {
    let query = supabase
      .from("operations_comptables")
      .select("operation, compte, montant, date_operation");

    if (startDate) {
      query = query.gte("date_operation", startDate);
    }

    if (endDate) {
      query = query.lte("date_operation", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur récupération statistiques:", error);
      return { success: false, error: error.message };
    }

    // Calculer les statistiques
    const stats = {
      totalEncaissements: 0,
      totalDepenses: 0,
      nombreEncaissements: 0,
      nombreDepenses: 0,
      parCompte: {},
      evolution: [],
    };

    // Stats par type d'opération
    data.forEach((op) => {
      const montant = parseFloat(op.montant);

      if (op.operation === TYPES_OPERATION.ENCAISSEMENT) {
        stats.totalEncaissements += montant;
        stats.nombreEncaissements += 1;
      } else if (op.operation === TYPES_OPERATION.DEPENSE) {
        stats.totalDepenses += montant;
        stats.nombreDepenses += 1;
      }

      // Stats par compte
      if (!stats.parCompte[op.compte]) {
        stats.parCompte[op.compte] = {
          encaissements: 0,
          depenses: 0,
          solde: 0,
        };
      }

      if (op.operation === TYPES_OPERATION.ENCAISSEMENT) {
        stats.parCompte[op.compte].encaissements += montant;
      } else {
        stats.parCompte[op.compte].depenses += montant;
      }
    });

    // Calculer les soldes par compte
    Object.keys(stats.parCompte).forEach((compte) => {
      stats.parCompte[compte].solde =
        stats.parCompte[compte].encaissements -
        stats.parCompte[compte].depenses;
    });

    stats.soldeNet = stats.totalEncaissements - stats.totalDepenses;
    stats.moyenneEncaissement =
      stats.nombreEncaissements > 0
        ? stats.totalEncaissements / stats.nombreEncaissements
        : 0;
    stats.moyenneDepense =
      stats.nombreDepenses > 0
        ? stats.totalDepenses / stats.nombreDepenses
        : 0;

    return { success: true, stats };
  } catch (error) {
    console.error("Erreur inattendue calcul statistiques:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtenir les opérations récentes
 * @param {number} limit - Nombre d'opérations à récupérer (défaut: 10)
 * @returns {Promise<{success: boolean, operations?: Array, error?: string}>}
 */
export const getOperationsRecentes = async (limit = 10) => {
  try {
    const { data, error } = await supabase
      .from("operations_comptables")
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
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Erreur récupération opérations récentes:", error);
      return { success: false, error: error.message };
    }

    return { success: true, operations: data || [] };
  } catch (error) {
    console.error("Erreur inattendue récupération opérations récentes:", error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// UTILITAIRES
// ============================================================================

/**
 * Formater une opération pour l'affichage
 * @param {Object} operation - Opération à formater
 * @returns {Object} Opération formatée
 */
export const formatOperation = (operation) => {
  return {
    ...operation,
    montantFormate: new Intl.NumberFormat("fr-FR").format(operation.montant) + " FCFA",
    dateFormatee: new Date(operation.date_operation).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    dateHeureFormatee: new Date(operation.created_at).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    userName: operation.user
      ? `${operation.user.prenoms} ${operation.user.nom}`
      : "Utilisateur inconnu",
    compteLabel: COMPTE_LABELS[operation.compte] || operation.compte,
    operationLabel:
      operation.operation === TYPES_OPERATION.ENCAISSEMENT
        ? "Encaissement"
        : "Dépense",
  };
};

/**
 * Valider les données d'une opération
 * @param {Object} operationData - Données à valider
 * @returns {{valid: boolean, errors: Array<string>}}
 */
export const validateOperation = (operationData) => {
  const errors = [];

  if (!operationData.operation) {
    errors.push("Le type d'opération est requis");
  } else if (
    ![TYPES_OPERATION.ENCAISSEMENT, TYPES_OPERATION.DEPENSE].includes(
      operationData.operation
    )
  ) {
    errors.push("Type d'opération invalide");
  }

  if (!operationData.compte) {
    errors.push("Le compte est requis");
  } else if (!Object.values(TYPES_COMPTE).includes(operationData.compte)) {
    errors.push("Type de compte invalide");
  }

  if (!operationData.montant) {
    errors.push("Le montant est requis");
  } else if (parseFloat(operationData.montant) <= 0) {
    errors.push("Le montant doit être supérieur à 0");
  }

  if (!operationData.motif || operationData.motif.trim() === "") {
    errors.push("Le motif est requis");
  }

  if (!operationData.date_operation) {
    errors.push("La date de l'opération est requise");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Exporter les opérations au format CSV
 * @param {Array} operations - Liste des opérations à exporter
 * @returns {string} Contenu CSV
 */
export const exportToCSV = (operations) => {
  const headers = [
    "Date",
    "Type",
    "Compte",
    "Montant",
    "Motif",
    "Utilisateur",
  ];

  const rows = operations.map((op) => {
    const formatted = formatOperation(op);
    return [
      formatted.dateFormatee,
      formatted.operationLabel,
      formatted.compteLabel,
      formatted.montantFormate,
      op.motif,
      formatted.userName,
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
};

// ============================================================================
// GESTION DES BUDGETS ET PRÉVISIONS
// ============================================================================

/**
 * Créer un nouveau budget ou prévision
 * @param {Object} budgetData - Données du budget
 * @param {string} budgetData.type - Type ('budget' ou 'prevision')
 * @param {number} budgetData.mois - Mois (1-12)
 * @param {number} budgetData.annee - Année
 * @param {Object} budgetData.details - Détails du budget (structure JSON)
 * @returns {Promise<{success: boolean, budget?: Object, error?: string}>}
 */
export const createBudget = async (budgetData) => {
  try {
    // Validation des données
    if (!budgetData.type || !budgetData.mois || !budgetData.annee) {
      return {
        success: false,
        error: "Le type, le mois et l'année sont requis",
      };
    }

    if (budgetData.mois < 1 || budgetData.mois > 12) {
      return {
        success: false,
        error: "Le mois doit être entre 1 et 12",
      };
    }

    // Récupérer l'utilisateur authentifié
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Utilisateur non authentifié" };
    }

    // Préparer les données
    const dataToInsert = {
      type: budgetData.type,
      mois: budgetData.mois,
      annee: budgetData.annee,
      details: budgetData.details || {
        comptes: {},
        categories_depenses: {},
        total_encaissements_prevus: 0,
        total_depenses_prevues: 0,
        solde_net_prevu: 0,
        notes: "",
        objectifs: [],
      },
      statut: budgetData.statut || STATUTS_BUDGET.BROUILLON,
      created_by: user.id,
    };

    // Insérer dans la base de données
    const { data, error } = await supabase
      .from("budget_comptable")
      .insert(dataToInsert)
      .select(
        `
        *,
        created_by_user:users!created_by(
          id,
          nom,
          prenoms,
          email
        ),
        valide_par_user:users!valide_par(
          id,
          nom,
          prenoms,
          email
        )
      `
      )
      .single();

    if (error) {
      console.error("Erreur création budget:", error);
      return { success: false, error: error.message };
    }

    return { success: true, budget: data };
  } catch (error) {
    console.error("Erreur inattendue création budget:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer les budgets avec filtres
 * @param {Object} options - Options de filtrage
 * @param {string} options.type - Filtrer par type (budget/prevision)
 * @param {number} options.mois - Filtrer par mois
 * @param {number} options.annee - Filtrer par année
 * @param {string} options.statut - Filtrer par statut
 * @returns {Promise<{success: boolean, budgets?: Array, error?: string}>}
 */
export const getBudgets = async (options = {}) => {
  try {
    const { type, mois, annee, statut } = options;

    let query = supabase.from("budget_comptable").select(
      `
        *,
        created_by_user:users!created_by(
          id,
          nom,
          prenoms,
          email
        ),
        valide_par_user:users!valide_par(
          id,
          nom,
          prenoms,
          email
        )
      `
    );

    if (type) {
      query = query.eq("type", type);
    }

    if (mois) {
      query = query.eq("mois", mois);
    }

    if (annee) {
      query = query.eq("annee", annee);
    }

    if (statut) {
      query = query.eq("statut", statut);
    }

    query = query.order("annee", { ascending: false }).order("mois", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Erreur récupération budgets:", error);
      return { success: false, error: error.message };
    }

    return { success: true, budgets: data || [] };
  } catch (error) {
    console.error("Erreur inattendue récupération budgets:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer un budget spécifique
 * @param {string} budgetId - ID du budget
 * @returns {Promise<{success: boolean, budget?: Object, error?: string}>}
 */
export const getBudgetById = async (budgetId) => {
  try {
    const { data, error } = await supabase
      .from("budget_comptable")
      .select(
        `
        *,
        created_by_user:users!created_by(
          id,
          nom,
          prenoms,
          email
        ),
        valide_par_user:users!valide_par(
          id,
          nom,
          prenoms,
          email
        )
      `
      )
      .eq("id", budgetId)
      .single();

    if (error) {
      console.error("Erreur récupération budget:", error);
      return { success: false, error: error.message };
    }

    return { success: true, budget: data };
  } catch (error) {
    console.error("Erreur inattendue récupération budget:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Mettre à jour un budget
 * @param {string} budgetId - ID du budget
 * @param {Object} updates - Données à mettre à jour
 * @returns {Promise<{success: boolean, budget?: Object, error?: string}>}
 */
export const updateBudget = async (budgetId, updates) => {
  try {
    if (!budgetId) {
      return { success: false, error: "ID du budget requis" };
    }

    // Filtrer les champs non modifiables
    const { id, created_by, created_at, ...allowedUpdates } = updates;

    const { data, error } = await supabase
      .from("budget_comptable")
      .update(allowedUpdates)
      .eq("id", budgetId)
      .select(
        `
        *,
        created_by_user:users!created_by(
          id,
          nom,
          prenoms,
          email
        ),
        valide_par_user:users!valide_par(
          id,
          nom,
          prenoms,
          email
        )
      `
      )
      .single();

    if (error) {
      console.error("Erreur mise à jour budget:", error);
      return { success: false, error: error.message };
    }

    return { success: true, budget: data };
  } catch (error) {
    console.error("Erreur inattendue mise à jour budget:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Supprimer un budget
 * @param {string} budgetId - ID du budget
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteBudget = async (budgetId) => {
  try {
    if (!budgetId) {
      return { success: false, error: "ID du budget requis" };
    }

    const { error } = await supabase
      .from("budget_comptable")
      .delete()
      .eq("id", budgetId);

    if (error) {
      console.error("Erreur suppression budget:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur inattendue suppression budget:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Valider un budget (changer le statut à 'valide')
 * @param {string} budgetId - ID du budget
 * @returns {Promise<{success: boolean, budget?: Object, error?: string}>}
 */
export const validateBudget = async (budgetId) => {
  return await updateBudget(budgetId, { statut: STATUTS_BUDGET.VALIDE });
};

/**
 * Clôturer un budget (changer le statut à 'cloture')
 * @param {string} budgetId - ID du budget
 * @returns {Promise<{success: boolean, budget?: Object, error?: string}>}
 */
export const cloturerBudget = async (budgetId) => {
  return await updateBudget(budgetId, { statut: STATUTS_BUDGET.CLOTURE });
};

// ============================================================================
// CALCUL DU RÉALISÉ EN TEMPS RÉEL
// ============================================================================

/**
 * Calculer le réalisé pour un mois donné (depuis operations_comptables)
 * @param {number} mois - Mois (1-12)
 * @param {number} annee - Année
 * @returns {Promise<{success: boolean, realise?: Object, error?: string}>}
 */
export const getRealiseMois = async (mois, annee) => {
  try {
    // Utiliser la fonction PostgreSQL pour le calcul en temps réel
    const { data, error } = await supabase.rpc("get_realise_mois", {
      p_mois: mois,
      p_annee: annee,
    });

    if (error) {
      console.error("Erreur récupération réalisé:", error);
      return { success: false, error: error.message };
    }

    // data est un array avec un seul élément
    const realise = data && data.length > 0 ? data[0] : null;

    if (!realise) {
      return {
        success: true,
        realise: {
          total_encaissements: 0,
          total_depenses: 0,
          solde_net: 0,
          par_compte: {},
          nombre_operations: 0,
        },
      };
    }

    return { success: true, realise };
  } catch (error) {
    console.error("Erreur inattendue récupération réalisé:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Comparer le budget vs le réalisé pour un mois
 * @param {number} mois - Mois (1-12)
 * @param {number} annee - Année
 * @returns {Promise<{success: boolean, comparaison?: Object, error?: string}>}
 */
export const compareBudgetVsRealise = async (mois, annee) => {
  try {
    // Utiliser la fonction PostgreSQL pour la comparaison
    const { data, error } = await supabase.rpc("compare_budget_vs_realise", {
      p_mois: mois,
      p_annee: annee,
    });

    if (error) {
      console.error("Erreur comparaison budget vs réalisé:", error);
      return { success: false, error: error.message };
    }

    return { success: true, comparaison: data };
  } catch (error) {
    console.error("Erreur inattendue comparaison:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtenir le dashboard budgétaire complet pour un mois
 * @param {number} mois - Mois (1-12)
 * @param {number} annee - Année
 * @returns {Promise<{success: boolean, dashboard?: Object, error?: string}>}
 */
export const getDashboardBudgetaire = async (mois, annee) => {
  try {
    // Récupérer la comparaison budget vs réalisé
    const comparaisonResult = await compareBudgetVsRealise(mois, annee);

    if (!comparaisonResult.success) {
      return comparaisonResult;
    }

    const comp = comparaisonResult.comparaison;

    // Calculer les indicateurs
    const indicateurs = {
      tauxRealisationEncaissements:
        comp.ecarts?.global?.encaissements?.taux_realisation || 0,
      tauxRealisationDepenses:
        comp.ecarts?.global?.depenses?.taux_realisation || 0,
      ecartEncaissements: comp.ecarts?.global?.encaissements?.ecart || 0,
      ecartDepenses: comp.ecarts?.global?.depenses?.ecart || 0,
      ecartSoldeNet: comp.ecarts?.global?.solde_net?.ecart || 0,
      margeNette:
        comp.realise?.total_encaissements > 0
          ? ((comp.realise.solde_net / comp.realise.total_encaissements) * 100).toFixed(2)
          : 0,
      tendance: determineTendance(comp.ecarts),
    };

    // Identifier les alertes
    const alertes = generateAlertes(comp);

    // Construire le dashboard
    const dashboard = {
      mois,
      annee,
      budget: comp.budget,
      realise: comp.realise,
      ecarts: comp.ecarts,
      indicateurs,
      alertes,
      statut_budget: comp.statut_budget,
    };

    return { success: true, dashboard };
  } catch (error) {
    console.error("Erreur inattendue dashboard budgétaire:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Déterminer la tendance basée sur les écarts
 * @param {Object} ecarts - Écarts calculés
 * @returns {string} 'positive' | 'negative' | 'stable'
 */
const determineTendance = (ecarts) => {
  if (!ecarts || !ecarts.global) return "stable";

  const ecartEncaissements = ecarts.global.encaissements?.ecart || 0;
  const ecartDepenses = ecarts.global.depenses?.ecart || 0;
  const ecartSoldeNet = ecarts.global.solde_net?.ecart || 0;

  // Tendance positive si encaissements supérieurs au prévu ET dépenses inférieures
  if (ecartEncaissements > 0 && ecartDepenses < 0 && ecartSoldeNet > 0) {
    return "positive";
  }

  // Tendance négative si encaissements inférieurs au prévu OU dépenses supérieures
  if (ecartEncaissements < 0 || ecartDepenses > 0 || ecartSoldeNet < 0) {
    return "negative";
  }

  return "stable";
};

/**
 * Générer les alertes budgétaires
 * @param {Object} comparaison - Résultat de la comparaison
 * @returns {Array} Liste des alertes
 */
const generateAlertes = (comparaison) => {
  const alertes = [];

  if (!comparaison.ecarts) return alertes;

  const { global, par_compte } = comparaison.ecarts;

  // Alerte sur les encaissements globaux
  if (global?.encaissements?.taux_realisation < 80) {
    alertes.push({
      type: "warning",
      categorie: "encaissements",
      message: `Les encaissements sont à ${global.encaissements.taux_realisation}% du prévu`,
      ecart: global.encaissements.ecart,
    });
  }

  // Alerte sur les dépenses globales
  if (global?.depenses?.taux_realisation > 120) {
    alertes.push({
      type: "danger",
      categorie: "depenses",
      message: `Les dépenses dépassent de ${(global.depenses.taux_realisation - 100).toFixed(1)}% le budget prévu`,
      ecart: global.depenses.ecart,
    });
  }

  // Alertes par compte
  if (par_compte) {
    Object.entries(par_compte).forEach(([compte, data]) => {
      // Dépassement de dépenses sur un compte
      if (data.depenses?.ecart > 0 && Math.abs(data.depenses.ecart) > 10000) {
        alertes.push({
          type: "warning",
          categorie: "compte",
          compte: COMPTE_LABELS[compte] || compte,
          message: `Dépassement de ${formatMontant(data.depenses.ecart)} sur ${COMPTE_LABELS[compte] || compte}`,
          ecart: data.depenses.ecart,
        });
      }

      // Sous-réalisation importante des encaissements sur un compte
      if (data.encaissements?.ecart < -10000) {
        alertes.push({
          type: "info",
          categorie: "compte",
          compte: COMPTE_LABELS[compte] || compte,
          message: `Sous-réalisation de ${formatMontant(Math.abs(data.encaissements.ecart))} sur ${COMPTE_LABELS[compte] || compte}`,
          ecart: data.encaissements.ecart,
        });
      }
    });
  }

  return alertes;
};

/**
 * Dupliquer le budget du mois précédent
 * @param {number} mois - Mois cible (1-12)
 * @param {number} annee - Année cible
 * @returns {Promise<{success: boolean, budget?: Object, error?: string}>}
 */
export const duplicateBudgetFromPreviousMonth = async (mois, annee) => {
  try {
    // Calculer le mois précédent
    let moisPrecedent = mois - 1;
    let anneePrecedente = annee;

    if (moisPrecedent === 0) {
      moisPrecedent = 12;
      anneePrecedente = annee - 1;
    }

    // Récupérer le budget du mois précédent
    const budgetsResult = await getBudgets({
      type: TYPES_BUDGET.BUDGET,
      mois: moisPrecedent,
      annee: anneePrecedente,
    });

    if (!budgetsResult.success || budgetsResult.budgets.length === 0) {
      return {
        success: false,
        error: "Aucun budget trouvé pour le mois précédent",
      };
    }

    const budgetPrecedent = budgetsResult.budgets[0];

    // Créer le nouveau budget avec les mêmes détails
    return await createBudget({
      type: TYPES_BUDGET.BUDGET,
      mois,
      annee,
      details: budgetPrecedent.details,
      statut: STATUTS_BUDGET.BROUILLON,
    });
  } catch (error) {
    console.error("Erreur duplication budget:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Créer un budget basé sur une prévision
 * @param {string} previsionId - ID de la prévision
 * @returns {Promise<{success: boolean, budget?: Object, error?: string}>}
 */
export const createBudgetFromPrevision = async (previsionId) => {
  try {
    // Récupérer la prévision
    const previsionResult = await getBudgetById(previsionId);

    if (!previsionResult.success) {
      return previsionResult;
    }

    const prevision = previsionResult.budget;

    // Créer le budget avec les mêmes détails
    return await createBudget({
      type: TYPES_BUDGET.BUDGET,
      mois: prevision.mois,
      annee: prevision.annee,
      details: prevision.details,
      statut: STATUTS_BUDGET.BROUILLON,
    });
  } catch (error) {
    console.error("Erreur création budget depuis prévision:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtenir l'historique des budgets sur plusieurs mois
 * @param {number} annee - Année
 * @returns {Promise<{success: boolean, historique?: Array, error?: string}>}
 */
export const getHistoriqueBudgets = async (annee) => {
  try {
    const historique = [];

    // Récupérer les budgets de tous les mois de l'année
    for (let mois = 1; mois <= 12; mois++) {
      const dashboardResult = await getDashboardBudgetaire(mois, annee);

      if (dashboardResult.success) {
        historique.push({
          mois,
          annee,
          ...dashboardResult.dashboard,
        });
      }
    }

    return { success: true, historique };
  } catch (error) {
    console.error("Erreur récupération historique budgets:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Formater un montant pour l'affichage
 * @param {number} montant - Montant à formater
 * @returns {string} Montant formaté
 */
const formatMontant = (montant) => {
  return new Intl.NumberFormat("fr-FR").format(montant) + " FCFA";
};

// ============================================================================
// CALCUL AUTOMATIQUE DES PRÉVISIONS
// ============================================================================

/**
 * Calculer les prévisions automatiques basées sur l'historique
 * @param {number} mois - Mois cible (1-12)
 * @param {number} annee - Année cible
 * @param {number} moisHistorique - Nombre de mois d'historique à analyser (défaut: 3)
 * @returns {Promise<{success: boolean, previsions?: Object, error?: string}>}
 */
export const calculerPrevisionsAutomatiques = async (
  mois,
  annee,
  moisHistorique = 3
) => {
  try {
    // Récupérer les opérations des N derniers mois
    const dateDebut = new Date(annee, mois - moisHistorique - 1, 1);
    const dateFin = new Date(annee, mois - 1, 0);

    const result = await getOperations({
      startDate: dateDebut.toISOString().split("T")[0],
      endDate: dateFin.toISOString().split("T")[0],
      limit: 10000, // Récupérer toutes les opérations
      offset: 0,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const operations = result.operations;

    // Organiser les données par compte et par mois
    const dataParMois = {};

    operations.forEach((op) => {
      const dateOp = new Date(op.date_operation);
      const moisOp = dateOp.getMonth() + 1;
      const anneeOp = dateOp.getFullYear();
      const cle = `${anneeOp}-${moisOp}`;

      if (!dataParMois[cle]) {
        dataParMois[cle] = {};
        Object.values(TYPES_COMPTE).forEach((compte) => {
          dataParMois[cle][compte] = {
            encaissements: 0,
            depenses: 0,
          };
        });
      }

      const montant = parseFloat(op.montant);
      if (op.operation === TYPES_OPERATION.ENCAISSEMENT) {
        dataParMois[cle][op.compte].encaissements += montant;
      } else {
        dataParMois[cle][op.compte].depenses += montant;
      }
    });

    // Calculer les moyennes, min, max par compte
    const stats = {};
    Object.values(TYPES_COMPTE).forEach((compte) => {
      stats[compte] = {
        encaissements: { valeurs: [], moyenne: 0, min: 0, max: 0 },
        depenses: { valeurs: [], moyenne: 0, min: 0, max: 0 },
      };
    });

    Object.values(dataParMois).forEach((moisData) => {
      Object.entries(moisData).forEach(([compte, montants]) => {
        stats[compte].encaissements.valeurs.push(montants.encaissements);
        stats[compte].depenses.valeurs.push(montants.depenses);
      });
    });

    // Calculer les statistiques pour chaque compte
    Object.keys(stats).forEach((compte) => {
      // Encaissements
      const encValues = stats[compte].encaissements.valeurs;
      if (encValues.length > 0) {
        stats[compte].encaissements.moyenne =
          encValues.reduce((a, b) => a + b, 0) / encValues.length;
        stats[compte].encaissements.min = Math.min(...encValues);
        stats[compte].encaissements.max = Math.max(...encValues);
      }

      // Dépenses
      const depValues = stats[compte].depenses.valeurs;
      if (depValues.length > 0) {
        stats[compte].depenses.moyenne =
          depValues.reduce((a, b) => a + b, 0) / depValues.length;
        stats[compte].depenses.min = Math.min(...depValues);
        stats[compte].depenses.max = Math.max(...depValues);
      }
    });

    // Générer les trois scénarios
    const scenarios = {
      pessimiste: {},
      realiste: {},
      optimiste: {},
    };

    Object.entries(stats).forEach(([compte, stat]) => {
      // Pessimiste: 80% de la moyenne des encaissements, 120% de la moyenne des dépenses
      scenarios.pessimiste[compte] = {
        encaissements: Math.round(stat.encaissements.moyenne * 0.8),
        depenses: Math.round(stat.depenses.moyenne * 1.2),
      };

      // Réaliste: moyenne exacte
      scenarios.realiste[compte] = {
        encaissements: Math.round(stat.encaissements.moyenne),
        depenses: Math.round(stat.depenses.moyenne),
      };

      // Optimiste: 120% de la moyenne des encaissements, 80% de la moyenne des dépenses
      scenarios.optimiste[compte] = {
        encaissements: Math.round(stat.encaissements.moyenne * 1.2),
        depenses: Math.round(stat.depenses.moyenne * 0.8),
      };
    });

    // Calculer les totaux pour chaque scénario
    const calculerTotaux = (scenario) => {
      let totalEncaissements = 0;
      let totalDepenses = 0;

      Object.values(scenario).forEach((montants) => {
        totalEncaissements += montants.encaissements;
        totalDepenses += montants.depenses;
      });

      return {
        total_encaissements: totalEncaissements,
        total_depenses: totalDepenses,
        solde_net: totalEncaissements - totalDepenses,
      };
    };

    return {
      success: true,
      previsions: {
        mois,
        annee,
        moisHistorique,
        nbOperations: operations.length,
        scenarios: {
          pessimiste: {
            comptes: scenarios.pessimiste,
            totaux: calculerTotaux(scenarios.pessimiste),
          },
          realiste: {
            comptes: scenarios.realiste,
            totaux: calculerTotaux(scenarios.realiste),
          },
          optimiste: {
            comptes: scenarios.optimiste,
            totaux: calculerTotaux(scenarios.optimiste),
          },
        },
        statistiques: stats,
      },
    };
  } catch (error) {
    console.error("Erreur calcul prévisions automatiques:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Créer une prévision à partir d'un scénario calculé
 * @param {number} mois - Mois
 * @param {number} annee - Année
 * @param {Object} scenario - Scénario choisi (comptes + totaux)
 * @returns {Promise<{success: boolean, prevision?: Object, error?: string}>}
 */
export const creerPrevisionDepuisScenario = async (mois, annee, scenario) => {
  try {
    const details = {
      comptes: scenario.comptes,
      total_encaissements: scenario.totaux.total_encaissements,
      total_depenses: scenario.totaux.total_depenses,
      solde_net: scenario.totaux.solde_net,
      genere_automatiquement: true,
      date_generation: new Date().toISOString(),
    };

    return await createBudget({
      type: TYPES_BUDGET.PREVISION,
      mois,
      annee,
      details,
    });
  } catch (error) {
    console.error("Erreur création prévision depuis scénario:", error);
    return { success: false, error: error.message };
  }
};


// ============================================================================
// SUIVI DES REVENUS (Encaissements - Dépenses)
// ============================================================================

/**
 * Calculer le revenu par période (jour, semaine, mois)
 * @param {string} startDate - Date de début (ISO format)
 * @param {string} endDate - Date de fin (ISO format)
 * @param {string} granularite - Granularité ('jour', 'semaine', 'mois')
 * @returns {Promise<{success: boolean, revenus?: Array, error?: string}>}
 */
export const getRevenusParPeriode = async (
  startDate,
  endDate,
  granularite = "jour"
) => {
  try {
    // Récupérer toutes les opérations de la période
    const result = await getOperations({
      startDate,
      endDate,
      limit: 10000,
      offset: 0,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const operations = result.operations;

    // Organiser les données par période
    const revenusParPeriode = {};

    operations.forEach((op) => {
      const date = new Date(op.date_operation);
      let cle;

      // Déterminer la clé selon la granularité
      if (granularite === "jour") {
        cle = date.toISOString().split("T")[0]; // YYYY-MM-DD
      } else if (granularite === "semaine") {
        // Obtenir le numéro de semaine
        const premierJanvier = new Date(date.getFullYear(), 0, 1);
        const joursDepuisDebut = Math.floor(
          (date - premierJanvier) / (24 * 60 * 60 * 1000)
        );
        const numeroSemaine = Math.ceil((joursDepuisDebut + premierJanvier.getDay() + 1) / 7);
        cle = `${date.getFullYear()}-S${numeroSemaine.toString().padStart(2, "0")}`;
      } else if (granularite === "mois") {
        cle = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      }

      // Initialiser la période si nécessaire
      if (!revenusParPeriode[cle]) {
        revenusParPeriode[cle] = {
          periode: cle,
          encaissements: 0,
          depenses: 0,
          revenu: 0,
          operations: [],
        };
      }

      // Ajouter l'opération
      const montant = parseFloat(op.montant);
      revenusParPeriode[cle].operations.push(op);

      if (op.operation === TYPES_OPERATION.ENCAISSEMENT) {
        revenusParPeriode[cle].encaissements += montant;
      } else {
        revenusParPeriode[cle].depenses += montant;
      }

      // Calculer le revenu net
      revenusParPeriode[cle].revenu =
        revenusParPeriode[cle].encaissements - revenusParPeriode[cle].depenses;
    });

    // Convertir en tableau et trier par période
    const revenus = Object.values(revenusParPeriode).sort(
      (a, b) => a.periode.localeCompare(b.periode)
    );

    // Calculer les variations jour/jour (pour les bougies)
    revenus.forEach((revenu, index) => {
      if (index > 0) {
        const precedent = revenus[index - 1];
        revenu.variation = revenu.revenu - precedent.revenu;
        revenu.variationPourcent =
          precedent.revenu !== 0
            ? ((revenu.variation / Math.abs(precedent.revenu)) * 100).toFixed(2)
            : 0;
      } else {
        revenu.variation = 0;
        revenu.variationPourcent = 0;
      }

      // Pour les bougies : calculer ouverture/fermeture/max/min
      revenu.ouverture = index > 0 ? revenus[index - 1].revenu : revenu.revenu;
      revenu.fermeture = revenu.revenu;
      revenu.max = Math.max(revenu.ouverture, revenu.fermeture);
      revenu.min = Math.min(revenu.ouverture, revenu.fermeture);
    });

    return { success: true, revenus };
  } catch (error) {
    console.error("Erreur calcul revenus par période:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtenir les statistiques globales de revenu pour une période
 * @param {string} startDate - Date de début
 * @param {string} endDate - Date de fin
 * @returns {Promise<{success: boolean, stats?: Object, error?: string}>}
 */
export const getStatistiquesRevenu = async (startDate, endDate) => {
  try {
    const result = await getRevenusParPeriode(startDate, endDate, "jour");

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const revenus = result.revenus;

    // Calculer les statistiques
    const totalEncaissements = revenus.reduce((sum, r) => sum + r.encaissements, 0);
    const totalDepenses = revenus.reduce((sum, r) => sum + r.depenses, 0);
    const revenuTotal = totalEncaissements - totalDepenses;

    const revenuMoyen =
      revenus.length > 0 ? revenus.reduce((sum, r) => sum + r.revenu, 0) / revenus.length : 0;

    const revenusPositifs = revenus.filter((r) => r.revenu > 0);
    const revenusNegatifs = revenus.filter((r) => r.revenu < 0);

    const revenuMax = revenus.length > 0 ? Math.max(...revenus.map((r) => r.revenu)) : 0;
    const revenuMin = revenus.length > 0 ? Math.min(...revenus.map((r) => r.revenu)) : 0;

    // Calculer la tendance (régression linéaire simple)
    let tendance = "stable";
    if (revenus.length >= 3) {
      const variations = revenus.slice(1).map((r) => r.variation);
      const moyenneVariations =
        variations.reduce((sum, v) => sum + v, 0) / variations.length;

      if (moyenneVariations > 0) {
        tendance = "hausse";
      } else if (moyenneVariations < 0) {
        tendance = "baisse";
      }
    }

    return {
      success: true,
      stats: {
        totalEncaissements,
        totalDepenses,
        revenuTotal,
        revenuMoyen,
        revenuMax,
        revenuMin,
        nombreJoursPositifs: revenusPositifs.length,
        nombreJoursNegatifs: revenusNegatifs.length,
        tauxJoursPositifs:
          revenus.length > 0 ? (revenusPositifs.length / revenus.length) * 100 : 0,
        tendance,
      },
    };
  } catch (error) {
    console.error("Erreur calcul statistiques revenu:", error);
    return { success: false, error: error.message };
  }
};
