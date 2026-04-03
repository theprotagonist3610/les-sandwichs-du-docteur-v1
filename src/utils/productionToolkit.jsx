/**
 * productionToolkit.jsx
 * Toolkit pour la gestion des schémas et instances de production
 *
 * === TABLE : production_schemas ===
 * {
 *   id: UUID PK auto-généré,
 *   nom: string,
 *   categorie: enum('pain','sauce','garniture','boisson','autre'),
 *   ingredient_principal: JSONB { nom, unite, quantite },
 *   ingredients_secondaires: JSONB [{ nom, unite, quantite }],
 *   rendement_estime: JSONB { quantite, unite },
 *   duree_preparation_minutes: number,
 *   notes: string,
 *   actif: boolean (défaut true),
 *   created_by: UUID FK vers users,
 *   created_at: timestamptz,
 *   updated_at: timestamptz,
 * }
 *
 * === TABLE : productions ===
 * {
 *   id: UUID PK auto-généré,
 *   schema_id: UUID FK vers production_schemas,
 *   nom: string,
 *   statut: enum('planifiee','en_cours','terminee','annulee'),
 *   production: JSONB {
 *     ingredient_principal: { nom, unite, quantite, cout_unitaire, cout_total },
 *     ingredients_secondaires: [{ nom, unite, quantite, cout_unitaire, cout_total }],
 *   },
 *   cout_total: number,
 *   cout_unitaire: number,
 *   date_production: date (YYYY-MM-DD),
 *   duree_reelle_minutes: number,
 *   rendement_reel: JSONB { quantite, unite },
 *   taux_rendement: number (rendement_reel / rendement_estime * 100),
 *   ecart_cout: number (cout_total - cout_estime_schema),
 *   resultats: JSONB [{ nom, quantite }],
 *   operateur_id: UUID FK vers users,
 *   notes: string,
 *   created_by: UUID FK vers users,
 *   created_at: timestamptz,
 *   updated_at: timestamptz,
 * }
 *
 * Permissions : admin + superviseur uniquement pour CRUD
 */

import { supabase } from "@/config/supabase";
import { isSupervisorOrAdmin, ROLES } from "@/utils/permissions";
import { getLots } from "@/utils/stockToolkit";

// ============================================================================
// CONSTANTES
// ============================================================================

export const CATEGORIES_PRODUCTION = {
  PAIN: "pain",
  SAUCE: "sauce",
  GARNITURE: "garniture",
  BOISSON: "boisson",
  AUTRE: "autre",
};

export const CATEGORIES_LABELS = {
  [CATEGORIES_PRODUCTION.PAIN]: "Pain",
  [CATEGORIES_PRODUCTION.SAUCE]: "Sauce",
  [CATEGORIES_PRODUCTION.GARNITURE]: "Garniture",
  [CATEGORIES_PRODUCTION.BOISSON]: "Boisson",
  [CATEGORIES_PRODUCTION.AUTRE]: "Autre",
};

export const STATUTS_PRODUCTION = {
  PLANIFIEE: "planifiee",
  EN_COURS: "en_cours",
  TERMINEE: "terminee",
  ANNULEE: "annulee",
};

export const STATUTS_LABELS = {
  [STATUTS_PRODUCTION.PLANIFIEE]: "Planifiée",
  [STATUTS_PRODUCTION.EN_COURS]: "En cours",
  [STATUTS_PRODUCTION.TERMINEE]: "Terminée",
  [STATUTS_PRODUCTION.ANNULEE]: "Annulée",
};

export const UNITES = {
  KG: "kg",
  G: "g",
  L: "l",
  CL: "cl",
  ML: "ml",
  UNITE: "unité",
  PORTION: "portion",
  TRANCHE: "tranche",
  SACHET: "sachet",
  BOITE: "boîte",
};

export const UNITES_LABELS = {
  [UNITES.KG]: "Kilogramme (kg)",
  [UNITES.G]: "Gramme (g)",
  [UNITES.L]: "Litre (l)",
  [UNITES.CL]: "Centilitre (cl)",
  [UNITES.ML]: "Millilitre (ml)",
  [UNITES.UNITE]: "Unité",
  [UNITES.PORTION]: "Portion",
  [UNITES.TRANCHE]: "Tranche",
  [UNITES.SACHET]: "Sachet",
  [UNITES.BOITE]: "Boîte",
};

export const MODES_PRODUCTION = {
  A_LA_DEMANDE:     "a_la_demande",
  PAR_CONSERVATION: "par_conservation",
  CYCLIQUE:         "cyclique",
};

export const MODES_PRODUCTION_LABELS = {
  [MODES_PRODUCTION.A_LA_DEMANDE]:     "À la demande",
  [MODES_PRODUCTION.PAR_CONSERVATION]: "Par conservation (batch)",
  [MODES_PRODUCTION.CYCLIQUE]:         "Cyclique (relance auto)",
};

// ============================================================================
// PERMISSIONS
// ============================================================================

/**
 * Vérifier si un utilisateur peut gérer les productions (CRUD)
 * Réservé aux admins et superviseurs
 * @param {string} userRole
 * @returns {boolean}
 */
export const canManageProductions = (userRole) => {
  return isSupervisorOrAdmin(userRole);
};

/**
 * Vérifier si un utilisateur peut supprimer un schéma
 * Réservé aux admins uniquement
 * @param {string} userRole
 * @returns {boolean}
 */
export const canDeleteSchema = (userRole) => {
  return userRole === ROLES.ADMIN;
};

// ============================================================================
// SÉLECT AVEC JOINTURES
// ============================================================================

const SELECT_SCHEMA_WITH_RELATIONS = `
  *,
  created_by_info:users!created_by(id, nom, prenoms)
`;

const SELECT_PRODUCTION_WITH_RELATIONS = `
  *,
  schema:production_schemas!schema_id(
    id, nom, categorie, rendement_estime, duree_preparation_minutes
  ),
  operateur:users!operateur_id(id, nom, prenoms, role),
  created_by_info:users!created_by(id, nom, prenoms)
`;

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Valider un ingrédient
 * @param {Object} ingredient - { nom, unite, quantite }
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateIngredient = (ingredient, label = "Ingrédient") => {
  const errors = [];
  if (!ingredient?.nom?.trim()) errors.push(`${label} : le nom est requis.`);
  if (!ingredient?.unite) errors.push(`${label} : l'unité est requise.`);
  if (!ingredient?.quantite || parseFloat(ingredient.quantite) <= 0)
    errors.push(`${label} : la quantité doit être > 0.`);
  return { valid: errors.length === 0, errors };
};

/**
 * Valider les données d'un schéma de production
 * @param {Object} schemaData
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validateSchema = (schemaData) => {
  const errors = [];

  if (!schemaData.nom?.trim()) errors.push("Le nom du schéma est requis.");
  if (!schemaData.categorie) errors.push("La catégorie est requise.");

  const ipValidation = validateIngredient(
    schemaData.ingredient_principal,
    "Ingrédient principal"
  );
  errors.push(...ipValidation.errors);

  if (Array.isArray(schemaData.ingredients_secondaires)) {
    schemaData.ingredients_secondaires.forEach((ing, i) => {
      const v = validateIngredient(ing, `Ingrédient secondaire #${i + 1}`);
      errors.push(...v.errors);
    });
  }

  if (
    schemaData.rendement_estime &&
    (parseFloat(schemaData.rendement_estime.quantite) <= 0 ||
      !schemaData.rendement_estime.unite)
  ) {
    errors.push("Le rendement estimé est invalide.");
  }

  // Validation mode de production
  const modeValide = Object.values(MODES_PRODUCTION);
  if (schemaData.mode_production && !modeValide.includes(schemaData.mode_production)) {
    errors.push("Le mode de production est invalide.");
  }

  if (schemaData.mode_production === MODES_PRODUCTION.CYCLIQUE) {
    if (!schemaData.cycle_jours || parseInt(schemaData.cycle_jours) <= 0) {
      errors.push("Le mode cyclique requiert une durée de cycle en jours (> 0).");
    }
    if (
      schemaData.seuil_relance &&
      (!schemaData.seuil_relance.quantite || parseFloat(schemaData.seuil_relance.quantite) <= 0)
    ) {
      errors.push("Le seuil de relance doit avoir une quantité > 0.");
    }
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Valider les données d'une instance de production
 * @param {Object} productionData
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validateProduction = (productionData) => {
  const errors = [];

  if (!productionData.schema_id) errors.push("Le schéma de production est requis.");
  if (!productionData.nom?.trim()) errors.push("Le nom de la production est requis.");
  if (!productionData.date_production) errors.push("La date de production est requise.");

  if (
    productionData.production?.ingredient_principal
  ) {
    const v = validateIngredient(
      productionData.production.ingredient_principal,
      "Ingrédient principal"
    );
    errors.push(...v.errors);
  }

  return { valid: errors.length === 0, errors };
};

// ============================================================================
// CALCULS
// ============================================================================

/**
 * Calculer le coût total d'une production
 * @param {Object} production - { ingredient_principal, ingredients_secondaires }
 * @returns {number}
 */
export const calculerCoutTotal = (production) => {
  if (!production) return 0;

  const coutPrincipal =
    parseFloat(production.ingredient_principal?.cout_total || 0);

  const coutSecondaires = (production.ingredients_secondaires || []).reduce(
    (sum, ing) => sum + parseFloat(ing.cout_total || 0),
    0
  );

  return coutPrincipal + coutSecondaires;
};

/**
 * Calculer le coût unitaire d'une production
 * @param {number} coutTotal
 * @param {Object} rendementReel - { quantite, unite }
 * @returns {number}
 */
export const calculerCoutUnitaire = (coutTotal, rendementReel) => {
  const quantite = parseFloat(rendementReel?.quantite || 0);
  if (quantite <= 0) return 0;
  return Math.round((coutTotal / quantite) * 100) / 100;
};

/**
 * Calculer le taux de rendement
 * @param {Object} rendementReel    - { quantite }
 * @param {Object} rendementEstime  - { quantite }
 * @returns {number} Pourcentage (ex: 95.5)
 */
export const calculerTauxRendement = (rendementReel, rendementEstime) => {
  const reel = parseFloat(rendementReel?.quantite || 0);
  const estime = parseFloat(rendementEstime?.quantite || 0);
  if (estime <= 0) return 0;
  return Math.round((reel / estime) * 10000) / 100; // 2 décimales
};

/**
 * Calculer l'écart de coût entre coût réel et coût estimé depuis le schéma
 * @param {number} coutReel
 * @param {Object} schema - schéma de production
 * @returns {number} Positif = dépassement, négatif = économie
 */
export const calculerEcartCout = (coutReel, coutEstimeSchema) => {
  return Math.round((coutReel - parseFloat(coutEstimeSchema || 0)) * 100) / 100;
};

/**
 * Initialiser le snapshot production depuis un schéma
 * Pré-remplit les quantités depuis le schéma, coûts à saisir
 * @param {Object} schema - production_schema
 * @returns {Object} snapshot production
 */
export const initProductionFromSchema = (schema) => {
  return {
    ingredient_principal: {
      nom: schema.ingredient_principal?.nom || "",
      unite: schema.ingredient_principal?.unite || "",
      quantite: schema.ingredient_principal?.quantite || 0,
      cout_unitaire: 0,
      cout_total: 0,
    },
    ingredients_secondaires: (schema.ingredients_secondaires || []).map((ing) => ({
      nom: ing.nom || "",
      unite: ing.unite || "",
      quantite: ing.quantite || 0,
      cout_unitaire: 0,
      cout_total: 0,
    })),
    // Métadonnées du mode de production (lecture seule — héritées du schéma)
    _mode_production: schema.mode_production || MODES_PRODUCTION.A_LA_DEMANDE,
    _cycle_jours:     schema.cycle_jours     || null,
    _seuil_relance:   schema.seuil_relance   || null,
  };
};

// ============================================================================
// CRUD — SCHÉMAS DE PRODUCTION
// ============================================================================

/**
 * Créer un schéma de production
 * @param {Object} schemaData
 * @param {string} userRole - Rôle de l'utilisateur connecté
 * @returns {Promise<{ success: boolean, schema?: Object, errors?: string[], error?: string }>}
 */
export const createSchema = async (schemaData, userRole) => {
  if (!canManageProductions(userRole)) {
    return { success: false, error: "Permission refusée. Rôle admin ou superviseur requis." };
  }

  const validation = validateSchema(schemaData);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Utilisateur non authentifié." };

    const payload = {
      nom: schemaData.nom.trim(),
      categorie: schemaData.categorie,
      ingredient_principal: {
        nom: schemaData.ingredient_principal.nom.trim(),
        unite: schemaData.ingredient_principal.unite,
        quantite: parseFloat(schemaData.ingredient_principal.quantite),
      },
      ingredients_secondaires: (schemaData.ingredients_secondaires || []).map((ing) => ({
        nom: ing.nom.trim(),
        unite: ing.unite,
        quantite: parseFloat(ing.quantite),
      })),
      rendement_estime: schemaData.rendement_estime
        ? {
            quantite: parseFloat(schemaData.rendement_estime.quantite),
            unite: schemaData.rendement_estime.unite,
          }
        : null,
      duree_preparation_minutes: schemaData.duree_preparation_minutes
        ? parseInt(schemaData.duree_preparation_minutes)
        : null,
      duree_conservation_jours: schemaData.duree_conservation_jours
        ? parseInt(schemaData.duree_conservation_jours)
        : null,
      notes: schemaData.notes?.trim() || null,
      actif: true,
      created_by: user.id,
      mode_production: schemaData.mode_production || MODES_PRODUCTION.A_LA_DEMANDE,
      cycle_jours: schemaData.cycle_jours ? parseInt(schemaData.cycle_jours) : null,
      seuil_relance: schemaData.seuil_relance
        ? {
            quantite: parseFloat(schemaData.seuil_relance.quantite),
            unite:    schemaData.seuil_relance.unite || "",
          }
        : null,
    };

    const { data, error } = await supabase
      .from("production_schemas")
      .insert(payload)
      .select(SELECT_SCHEMA_WITH_RELATIONS)
      .single();

    if (error) {
      console.error("Erreur createSchema:", error);
      return { success: false, error: error.message };
    }

    return { success: true, schema: data };
  } catch (error) {
    console.error("Exception createSchema:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer tous les schémas de production
 * @param {Object} options - { actifSeulement, categorie, searchTerm }
 * @returns {Promise<{ success: boolean, schemas?: Array, error?: string }>}
 */
export const getSchemas = async (options = {}) => {
  try {
    const { actifSeulement = true, categorie, searchTerm } = options;

    let query = supabase
      .from("production_schemas")
      .select(SELECT_SCHEMA_WITH_RELATIONS)
      .order("nom", { ascending: true });

    if (actifSeulement) query = query.eq("actif", true);
    if (categorie) query = query.eq("categorie", categorie);

    const { data, error } = await query;

    if (error) {
      console.error("Erreur getSchemas:", error);
      return { success: false, error: error.message };
    }

    let schemas = data || [];

    // Filtre recherche côté client (nom)
    if (searchTerm?.trim()) {
      const term = searchTerm.toLowerCase();
      schemas = schemas.filter((s) => s.nom.toLowerCase().includes(term));
    }

    return { success: true, schemas };
  } catch (error) {
    console.error("Exception getSchemas:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer un schéma par son ID
 * @param {string} schemaId
 * @returns {Promise<{ success: boolean, schema?: Object, error?: string }>}
 */
export const getSchemaById = async (schemaId) => {
  try {
    const { data, error } = await supabase
      .from("production_schemas")
      .select(SELECT_SCHEMA_WITH_RELATIONS)
      .eq("id", schemaId)
      .single();

    if (error) {
      console.error("Erreur getSchemaById:", error);
      return { success: false, error: error.message };
    }

    return { success: true, schema: data };
  } catch (error) {
    console.error("Exception getSchemaById:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Mettre à jour un schéma de production
 * @param {string} schemaId
 * @param {Object} updates
 * @param {string} userRole
 * @returns {Promise<{ success: boolean, schema?: Object, error?: string }>}
 */
export const updateSchema = async (schemaId, updates, userRole) => {
  if (!canManageProductions(userRole)) {
    return { success: false, error: "Permission refusée." };
  }

  try {
    const payload = { ...updates, updated_at: new Date().toISOString() };

    // Nettoyage des champs texte
    if (payload.nom) payload.nom = payload.nom.trim();
    if (payload.notes) payload.notes = payload.notes.trim();
    if (payload.ingredient_principal?.nom)
      payload.ingredient_principal.nom = payload.ingredient_principal.nom.trim();

    // Nettoyage des champs de mode production
    if (payload.cycle_jours !== undefined && payload.cycle_jours !== null)
      payload.cycle_jours = parseInt(payload.cycle_jours);
    if (payload.seuil_relance?.quantite !== undefined)
      payload.seuil_relance = {
        quantite: parseFloat(payload.seuil_relance.quantite),
        unite:    payload.seuil_relance.unite || "",
      };

    const { data, error } = await supabase
      .from("production_schemas")
      .update(payload)
      .eq("id", schemaId)
      .select(SELECT_SCHEMA_WITH_RELATIONS)
      .single();

    if (error) {
      console.error("Erreur updateSchema:", error);
      return { success: false, error: error.message };
    }

    return { success: true, schema: data };
  } catch (error) {
    console.error("Exception updateSchema:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Archiver (désactiver) un schéma — préférable à la suppression
 * @param {string} schemaId
 * @param {string} userRole
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export const archiverSchema = async (schemaId, userRole) => {
  if (!canManageProductions(userRole)) {
    return { success: false, error: "Permission refusée." };
  }
  return updateSchema(schemaId, { actif: false }, userRole);
};

/**
 * Supprimer définitivement un schéma (admin uniquement)
 * Bloqué si des productions sont liées à ce schéma
 * @param {string} schemaId
 * @param {string} userRole
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export const deleteSchema = async (schemaId, userRole) => {
  if (!canDeleteSchema(userRole)) {
    return { success: false, error: "Permission refusée. Rôle admin requis." };
  }

  try {
    // Vérifier qu'aucune production n'est liée
    const { count, error: countError } = await supabase
      .from("productions")
      .select("id", { count: "exact", head: true })
      .eq("schema_id", schemaId);

    if (countError) return { success: false, error: countError.message };

    if (count > 0) {
      return {
        success: false,
        error: `Impossible de supprimer : ${count} production(s) sont liées à ce schéma. Archivez-le plutôt.`,
      };
    }

    const { error } = await supabase
      .from("production_schemas")
      .delete()
      .eq("id", schemaId);

    if (error) {
      console.error("Erreur deleteSchema:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception deleteSchema:", error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// CRUD — INSTANCES DE PRODUCTION
// ============================================================================

/**
 * Créer une instance de production
 * @param {Object} productionData
 * @param {string} userRole
 * @returns {Promise<{ success: boolean, production?: Object, errors?: string[], error?: string }>}
 */
export const createProduction = async (productionData, userRole) => {
  if (!canManageProductions(userRole)) {
    return { success: false, error: "Permission refusée." };
  }

  const validation = validateProduction(productionData);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Utilisateur non authentifié." };

    const coutTotal = calculerCoutTotal(productionData.production);
    const coutUnitaire = calculerCoutUnitaire(coutTotal, productionData.rendement_reel);

    // Récupérer le rendement estimé du schéma pour calculer le taux
    let tauxRendement = null;
    let ecartCout = null;

    if (productionData.schema_id) {
      const { schema } = await getSchemaById(productionData.schema_id);
      if (schema) {
        tauxRendement = calculerTauxRendement(
          productionData.rendement_reel,
          schema.rendement_estime
        );
        // Coût estimé = coût unitaire estimé * quantité produite
        // Ici on compare le coût réel total vs l'estimé (non connu à l'avance → 0 si non fourni)
        ecartCout = calculerEcartCout(coutTotal, productionData.cout_estime || 0);
      }
    }

    const payload = {
      schema_id: productionData.schema_id,
      nom: productionData.nom.trim(),
      statut: productionData.statut || STATUTS_PRODUCTION.TERMINEE,
      production: productionData.production,
      cout_total: coutTotal,
      cout_unitaire: coutUnitaire,
      date_production: productionData.date_production,
      duree_reelle_minutes: productionData.duree_reelle_minutes
        ? parseInt(productionData.duree_reelle_minutes)
        : null,
      rendement_reel: productionData.rendement_reel || null,
      taux_rendement: tauxRendement,
      ecart_cout: ecartCout,
      resultats: productionData.resultats || [],
      operateur_id: productionData.operateur_id || user.id,
      notes: productionData.notes?.trim() || null,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from("productions")
      .insert(payload)
      .select(SELECT_PRODUCTION_WITH_RELATIONS)
      .single();

    if (error) {
      console.error("Erreur createProduction:", error);
      return { success: false, error: error.message };
    }

    return { success: true, production: data };
  } catch (error) {
    console.error("Exception createProduction:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer les productions avec filtres
 * @param {Object} options - { schemaId, statut, operateurId, startDate, endDate, limit, offset }
 * @returns {Promise<{ success: boolean, productions?: Array, total?: number, error?: string }>}
 */
export const getProductions = async (options = {}) => {
  try {
    const {
      schemaId,
      statut,
      operateurId,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = options;

    let query = supabase
      .from("productions")
      .select(SELECT_PRODUCTION_WITH_RELATIONS, { count: "exact" })
      .order("date_production", { ascending: false })
      .range(offset, offset + limit - 1);

    if (schemaId) query = query.eq("schema_id", schemaId);
    if (statut) query = query.eq("statut", statut);
    if (operateurId) query = query.eq("operateur_id", operateurId);
    if (startDate) query = query.gte("date_production", startDate);
    if (endDate) query = query.lte("date_production", endDate);

    const { data, error, count } = await query;

    if (error) {
      console.error("Erreur getProductions:", error);
      return { success: false, error: error.message };
    }

    return { success: true, productions: data || [], total: count || 0 };
  } catch (error) {
    console.error("Exception getProductions:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer une production par son ID
 * @param {string} productionId
 * @returns {Promise<{ success: boolean, production?: Object, error?: string }>}
 */
export const getProductionById = async (productionId) => {
  try {
    const { data, error } = await supabase
      .from("productions")
      .select(SELECT_PRODUCTION_WITH_RELATIONS)
      .eq("id", productionId)
      .single();

    if (error) {
      console.error("Erreur getProductionById:", error);
      return { success: false, error: error.message };
    }

    return { success: true, production: data };
  } catch (error) {
    console.error("Exception getProductionById:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Mettre à jour une instance de production
 * @param {string} productionId
 * @param {Object} updates
 * @param {string} userRole
 * @returns {Promise<{ success: boolean, production?: Object, error?: string }>}
 */
export const updateProduction = async (productionId, updates, userRole) => {
  if (!canManageProductions(userRole)) {
    return { success: false, error: "Permission refusée." };
  }

  try {
    // Recalculer les métriques si le snapshot production ou rendement changent
    const payload = { ...updates, updated_at: new Date().toISOString() };

    if (updates.production || updates.rendement_reel) {
      const production = updates.production;
      const rendementReel = updates.rendement_reel;

      if (production) {
        payload.cout_total = calculerCoutTotal(production);
        if (rendementReel) {
          payload.cout_unitaire = calculerCoutUnitaire(payload.cout_total, rendementReel);
        }
      }
    }

    const { data, error } = await supabase
      .from("productions")
      .update(payload)
      .eq("id", productionId)
      .select(SELECT_PRODUCTION_WITH_RELATIONS)
      .single();

    if (error) {
      console.error("Erreur updateProduction:", error);
      return { success: false, error: error.message };
    }

    return { success: true, production: data };
  } catch (error) {
    console.error("Exception updateProduction:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Changer le statut d'une production
 * @param {string} productionId
 * @param {string} statut - STATUTS_PRODUCTION.*
 * @param {string} userRole
 * @returns {Promise<{ success: boolean, production?: Object, error?: string }>}
 */
export const changerStatutProduction = async (productionId, statut, userRole) => {
  if (!canManageProductions(userRole)) {
    return { success: false, error: "Permission refusée." };
  }

  return updateProduction(productionId, { statut }, userRole);
};

/**
 * Supprimer une instance de production (admin uniquement)
 * @param {string} productionId
 * @param {string} userRole
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export const deleteProduction = async (productionId, userRole) => {
  if (!canDeleteSchema(userRole)) {
    return { success: false, error: "Permission refusée. Rôle admin requis." };
  }

  try {
    const { error } = await supabase
      .from("productions")
      .delete()
      .eq("id", productionId);

    if (error) {
      console.error("Erreur deleteProduction:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception deleteProduction:", error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// MÉTRIQUES RÉTRO-ANALYSE
// ============================================================================

/**
 * Calculer les métriques d'un schéma sur une période donnée
 * Utilisé pour l'analyse historique et les prévisions
 *
 * @param {string} schemaId
 * @param {Object} options - { startDate, endDate }
 * @returns {Promise<{
 *   success: boolean,
 *   metriques?: {
 *     // Rendement
 *     taux_rendement_moyen: number,
 *     taux_rendement_min: number,
 *     taux_rendement_max: number,
 *     tendance_rendement: number,  // % de progression sur la période
 *     // Coûts
 *     cout_unitaire_moyen: number,
 *     cout_unitaire_min: number,
 *     cout_unitaire_max: number,
 *     cout_total_moyen: number,
 *     evolution_cout: number,       // % d'évolution du coût unitaire
 *     ecart_cout_moyen: number,
 *     // Temps
 *     duree_moyenne_minutes: number,
 *     ecart_duree_moyen: number,    // réel - estimé (en minutes)
 *     // Volume
 *     nb_productions: number,
 *     volume_total_produit: number,
 *     frequence_production: number, // productions / jours
 *     // Résultats agrégés
 *     resultats_agrege: [{ nom, quantite_totale }],
 *     // Opérateurs
 *     productions_par_operateur: [{ operateur_id, nom, nb_productions, taux_rendement_moyen }],
 *   },
 *   error?: string
 * }>}
 */
export const getMetriquesSchema = async (schemaId, options = {}) => {
  try {
    const { startDate, endDate } = options;

    // Récupérer toutes les productions terminées du schéma sur la période
    let query = supabase
      .from("productions")
      .select(`
        *,
        operateur:users!operateur_id(id, nom, prenoms)
      `)
      .eq("schema_id", schemaId)
      .eq("statut", STATUTS_PRODUCTION.TERMINEE)
      .order("date_production", { ascending: true });

    if (startDate) query = query.gte("date_production", startDate);
    if (endDate) query = query.lte("date_production", endDate);

    const { data: productions, error } = await query;

    if (error) {
      console.error("Erreur getMetriquesSchema:", error);
      return { success: false, error: error.message };
    }

    if (!productions || productions.length === 0) {
      return { success: true, metriques: null, nb_productions: 0 };
    }

    // ─── Rendement ────────────────────────────────────────────────────────
    const tauxRendements = productions
      .map((p) => parseFloat(p.taux_rendement || 0))
      .filter((v) => v > 0);

    const tauxRendementMoyen =
      tauxRendements.length > 0
        ? Math.round((tauxRendements.reduce((s, v) => s + v, 0) / tauxRendements.length) * 100) / 100
        : 0;

    // Tendance : comparer la première moitié vs la seconde moitié
    let tendanceRendement = 0;
    if (tauxRendements.length >= 4) {
      const mid = Math.floor(tauxRendements.length / 2);
      const premiereMoitie = tauxRendements.slice(0, mid);
      const secondeMoitie = tauxRendements.slice(mid);
      const moyPremiere = premiereMoitie.reduce((s, v) => s + v, 0) / premiereMoitie.length;
      const moySeconde = secondeMoitie.reduce((s, v) => s + v, 0) / secondeMoitie.length;
      if (moyPremiere > 0) {
        tendanceRendement = Math.round(((moySeconde - moyPremiere) / moyPremiere) * 10000) / 100;
      }
    }

    // ─── Coûts ────────────────────────────────────────────────────────────
    const coutsUnitaires = productions
      .map((p) => parseFloat(p.cout_unitaire || 0))
      .filter((v) => v > 0);

    const coutUnitaireMoyen =
      coutsUnitaires.length > 0
        ? Math.round((coutsUnitaires.reduce((s, v) => s + v, 0) / coutsUnitaires.length) * 100) / 100
        : 0;

    // Évolution du coût : premier vs dernier
    let evolutionCout = 0;
    if (coutsUnitaires.length >= 2) {
      const premier = coutsUnitaires[0];
      const dernier = coutsUnitaires[coutsUnitaires.length - 1];
      if (premier > 0) {
        evolutionCout = Math.round(((dernier - premier) / premier) * 10000) / 100;
      }
    }

    const cotsEcart = productions.map((p) => parseFloat(p.ecart_cout || 0));
    const ecartCoutMoyen =
      cotsEcart.length > 0
        ? Math.round((cotsEcart.reduce((s, v) => s + v, 0) / cotsEcart.length) * 100) / 100
        : 0;

    // ─── Temps ────────────────────────────────────────────────────────────
    const durees = productions
      .map((p) => parseFloat(p.duree_reelle_minutes || 0))
      .filter((v) => v > 0);

    const dureeMoyenne =
      durees.length > 0
        ? Math.round(durees.reduce((s, v) => s + v, 0) / durees.length)
        : 0;

    // Récupérer la durée estimée du schéma
    const { schema } = await getSchemaById(schemaId);
    const dureeEstimee = schema?.duree_preparation_minutes || 0;
    const ecartDureeMoyen = dureeMoyenne - dureeEstimee;

    // ─── Volume ───────────────────────────────────────────────────────────
    const volumeTotal = productions.reduce(
      (s, p) => s + parseFloat(p.rendement_reel?.quantite || 0),
      0
    );

    // Fréquence : nb productions / nombre de jours dans la période
    let frequenceProduction = 0;
    if (productions.length >= 2) {
      const dateDebut = new Date(productions[0].date_production);
      const dateFin = new Date(productions[productions.length - 1].date_production);
      const nbJours = Math.max(1, Math.round((dateFin - dateDebut) / (1000 * 60 * 60 * 24)));
      frequenceProduction = Math.round((productions.length / nbJours) * 100) / 100;
    }

    // ─── Résultats agrégés ────────────────────────────────────────────────
    const resultatsMap = {};
    productions.forEach((p) => {
      if (!Array.isArray(p.resultats)) return;
      p.resultats.forEach((r) => {
        if (!r.nom) return;
        resultatsMap[r.nom] = (resultatsMap[r.nom] || 0) + parseFloat(r.quantite || 0);
      });
    });

    const resultatsAgrege = Object.entries(resultatsMap)
      .map(([nom, quantite_totale]) => ({ nom, quantite_totale: Math.round(quantite_totale * 100) / 100 }))
      .sort((a, b) => b.quantite_totale - a.quantite_totale);

    // ─── Métriques par opérateur ──────────────────────────────────────────
    const operateursMap = {};
    productions.forEach((p) => {
      const opId = p.operateur_id;
      if (!opId) return;
      if (!operateursMap[opId]) {
        operateursMap[opId] = {
          operateur_id: opId,
          nom: p.operateur
            ? `${p.operateur.prenoms || ""} ${p.operateur.nom || ""}`.trim()
            : "Inconnu",
          nb_productions: 0,
          taux_rendements: [],
          cout_unitaires: [],
        };
      }
      operateursMap[opId].nb_productions++;
      if (p.taux_rendement) operateursMap[opId].taux_rendements.push(parseFloat(p.taux_rendement));
      if (p.cout_unitaire) operateursMap[opId].cout_unitaires.push(parseFloat(p.cout_unitaire));
    });

    const productionsParOperateur = Object.values(operateursMap).map((op) => ({
      operateur_id: op.operateur_id,
      nom: op.nom,
      nb_productions: op.nb_productions,
      taux_rendement_moyen:
        op.taux_rendements.length > 0
          ? Math.round((op.taux_rendements.reduce((s, v) => s + v, 0) / op.taux_rendements.length) * 100) / 100
          : 0,
      cout_unitaire_moyen:
        op.cout_unitaires.length > 0
          ? Math.round((op.cout_unitaires.reduce((s, v) => s + v, 0) / op.cout_unitaires.length) * 100) / 100
          : 0,
    }));

    return {
      success: true,
      metriques: {
        // Rendement
        taux_rendement_moyen: tauxRendementMoyen,
        taux_rendement_min: tauxRendements.length > 0 ? Math.min(...tauxRendements) : 0,
        taux_rendement_max: tauxRendements.length > 0 ? Math.max(...tauxRendements) : 0,
        tendance_rendement: tendanceRendement,

        // Coûts
        cout_unitaire_moyen: coutUnitaireMoyen,
        cout_unitaire_min: coutsUnitaires.length > 0 ? Math.min(...coutsUnitaires) : 0,
        cout_unitaire_max: coutsUnitaires.length > 0 ? Math.max(...coutsUnitaires) : 0,
        cout_total_moyen:
          productions.length > 0
            ? Math.round((productions.reduce((s, p) => s + parseFloat(p.cout_total || 0), 0) / productions.length) * 100) / 100
            : 0,
        evolution_cout: evolutionCout,
        ecart_cout_moyen: ecartCoutMoyen,

        // Temps
        duree_moyenne_minutes: dureeMoyenne,
        duree_estimee_minutes: dureeEstimee,
        ecart_duree_moyen: ecartDureeMoyen,

        // Volume
        nb_productions: productions.length,
        volume_total_produit: Math.round(volumeTotal * 100) / 100,
        unite_volume: productions[0]?.rendement_reel?.unite || schema?.rendement_estime?.unite || "",
        frequence_production: frequenceProduction,

        // Résultats
        resultats_agrege: resultatsAgrege,

        // Opérateurs
        productions_par_operateur: productionsParOperateur,
      },
    };
  } catch (error) {
    console.error("Exception getMetriquesSchema:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Prévoir une production future basée sur l'historique
 * @param {string} schemaId
 * @returns {Promise<{
 *   success: boolean,
 *   prevision?: {
 *     cout_estime: number,
 *     cout_unitaire_estime: number,
 *     rendement_estime: { quantite: number, unite: string },
 *     duree_estimee_minutes: number,
 *     confiance: number,  // 0-1
 *     basee_sur: number,  // nb de productions historiques
 *   },
 *   error?: string
 * }>}
 */
export const prevoir_production = async (schemaId) => {
  try {
    const { success, metriques } = await getMetriquesSchema(schemaId, {});

    if (!success || !metriques || metriques.nb_productions === 0) {
      // Fallback : utiliser les valeurs du schéma si pas d'historique
      const { schema } = await getSchemaById(schemaId);
      return {
        success: true,
        prevision: {
          cout_estime: 0,
          cout_unitaire_estime: 0,
          rendement_estime: schema?.rendement_estime || { quantite: 0, unite: "" },
          duree_estimee_minutes: schema?.duree_preparation_minutes || 0,
          confiance: 0,
          basee_sur: 0,
        },
      };
    }

    // Score de confiance basé sur le nombre de productions et la variance du rendement
    const nbProd = metriques.nb_productions;
    const varianceRendement = metriques.taux_rendement_max - metriques.taux_rendement_min;
    const stabiliteRendement = varianceRendement <= 10 ? 1 : varianceRendement <= 20 ? 0.7 : 0.4;
    const bonusNombre = Math.min(nbProd / 10, 1) * 0.3;
    const confiance = Math.min(1, stabiliteRendement * 0.7 + bonusNombre);

    return {
      success: true,
      prevision: {
        cout_estime: metriques.cout_total_moyen,
        cout_unitaire_estime: metriques.cout_unitaire_moyen,
        rendement_estime: {
          quantite:
            metriques.volume_total_produit / metriques.nb_productions,
          unite: metriques.unite_volume,
        },
        duree_estimee_minutes: metriques.duree_moyenne_minutes,
        confiance: Math.round(confiance * 100) / 100,
        basee_sur: nbProd,
      },
    };
  } catch (error) {
    console.error("Exception prevoir_production:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtenir un tableau de bord global des productions sur une période
 * @param {Object} options - { startDate, endDate }
 * @returns {Promise<{ success: boolean, dashboard?: Object, error?: string }>}
 */
export const getDashboardProductions = async (options = {}) => {
  try {
    const { startDate, endDate } = options;

    let query = supabase
      .from("productions")
      .select(`
        *,
        schema:production_schemas!schema_id(id, nom, categorie)
      `)
      .eq("statut", STATUTS_PRODUCTION.TERMINEE)
      .order("date_production", { ascending: false });

    if (startDate) query = query.gte("date_production", startDate);
    if (endDate) query = query.lte("date_production", endDate);

    const { data: productions, error } = await query;

    if (error) return { success: false, error: error.message };

    const prod = productions || [];

    // Agrégats globaux
    const coutTotal = prod.reduce((s, p) => s + parseFloat(p.cout_total || 0), 0);
    const tauxRendements = prod.filter((p) => p.taux_rendement).map((p) => parseFloat(p.taux_rendement));
    const tauxRendementGlobal =
      tauxRendements.length > 0
        ? Math.round(tauxRendements.reduce((s, v) => s + v, 0) / tauxRendements.length * 100) / 100
        : 0;

    // Par catégorie
    const parCategorie = {};
    prod.forEach((p) => {
      const cat = p.schema?.categorie || "autre";
      if (!parCategorie[cat]) parCategorie[cat] = { nb: 0, cout: 0 };
      parCategorie[cat].nb++;
      parCategorie[cat].cout += parseFloat(p.cout_total || 0);
    });

    // Par schéma (top 5)
    const parSchema = {};
    prod.forEach((p) => {
      const id = p.schema_id;
      if (!parSchema[id]) parSchema[id] = { nom: p.schema?.nom || "Inconnu", nb: 0, cout: 0 };
      parSchema[id].nb++;
      parSchema[id].cout += parseFloat(p.cout_total || 0);
    });
    const topSchemas = Object.entries(parSchema)
      .map(([id, v]) => ({ schema_id: id, ...v }))
      .sort((a, b) => b.nb - a.nb)
      .slice(0, 5);

    return {
      success: true,
      dashboard: {
        nb_productions_total: prod.length,
        cout_total: Math.round(coutTotal * 100) / 100,
        taux_rendement_global: tauxRendementGlobal,
        par_categorie: parCategorie,
        top_schemas: topSchemas,
      },
    };
  } catch (error) {
    console.error("Exception getDashboardProductions:", error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// GESTION DES CYCLES DE PRODUCTION
// ============================================================================

/**
 * Récupérer le lot actif (disponible / partiellement vendu, non périmé)
 * issu d'un schéma de production donné.
 * Retourne le lot le plus récent ou null si aucun.
 *
 * @param {string} schemaId
 * @returns {Promise<{ success: boolean, lot?: Object|null, error?: string }>}
 */
export const getBatchActif = async (schemaId) => {
  try {
    const result = await getLots({
      schemaId,
      includeEpuise: false,
      includePerime: false,
      limit: 1,
    });

    if (!result.success) return { success: false, error: result.error };

    const lot = result.lots?.[0] ?? null;
    return { success: true, lot };
  } catch (error) {
    console.error("Exception getBatchActif:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Détecter si un schéma nécessite une relance de production.
 *
 * Logique par mode :
 *  - a_la_demande    : jamais de relance automatique → false
 *  - par_conservation: relance si aucun lot actif (épuisé ou périmé)
 *  - cyclique        : relance si lot actif en dessous du seuil_relance,
 *                      ou si aucun lot actif, ou si le cycle est dépassé.
 *
 * @param {string} schemaId
 * @param {Object} schema - production_schema (avec mode_production, cycle_jours, seuil_relance)
 * @returns {Promise<{ success: boolean, besoinRelance: boolean, raison?: string, error?: string }>}
 */
export const detecterBesoinRelance = async (schemaId, schema) => {
  try {
    const mode = schema?.mode_production || MODES_PRODUCTION.A_LA_DEMANDE;

    if (mode === MODES_PRODUCTION.A_LA_DEMANDE) {
      return { success: true, besoinRelance: false };
    }

    const { success, lot, error } = await getBatchActif(schemaId);
    if (!success) return { success: false, error };

    if (mode === MODES_PRODUCTION.PAR_CONSERVATION) {
      if (!lot) {
        return { success: true, besoinRelance: true, raison: "Aucun lot actif en stock." };
      }
      return { success: true, besoinRelance: false };
    }

    if (mode === MODES_PRODUCTION.CYCLIQUE) {
      // Pas de lot actif
      if (!lot) {
        return { success: true, besoinRelance: true, raison: "Aucun lot actif en stock." };
      }

      // Vérification seuil_relance
      const seuil = schema.seuil_relance;
      if (seuil?.quantite > 0) {
        const qteDispo = parseFloat(lot.quantite_disponible ?? 0);
        if (qteDispo <= parseFloat(seuil.quantite)) {
          return {
            success: true,
            besoinRelance: true,
            raison: `Stock (${qteDispo} ${seuil.unite}) ≤ seuil de relance (${seuil.quantite} ${seuil.unite}).`,
          };
        }
      }

      // Vérification cycle_jours : la dernière production date de plus de cycle_jours
      if (schema.cycle_jours > 0 && lot.date_production) {
        const derniereProduction = new Date(lot.date_production);
        const maintenant = new Date();
        const joursEcoules = Math.floor(
          (maintenant - derniereProduction) / (1000 * 60 * 60 * 24)
        );
        if (joursEcoules >= schema.cycle_jours) {
          return {
            success: true,
            besoinRelance: true,
            raison: `Cycle dépassé : ${joursEcoules}j depuis la dernière production (cycle = ${schema.cycle_jours}j).`,
          };
        }
      }

      return { success: true, besoinRelance: false };
    }

    return { success: true, besoinRelance: false };
  } catch (error) {
    console.error("Exception detecterBesoinRelance:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer l'état complet du cycle pour un schéma donné.
 * Agrège lot actif, besoin de relance et métriques utiles pour l'UI.
 *
 * @param {string} schemaId
 * @param {Object} schema - production_schema
 * @returns {Promise<{
 *   success: boolean,
 *   etat?: {
 *     lot: Object|null,
 *     quantite_disponible: number,
 *     jours_avant_peremption: number|null,
 *     besoinRelance: boolean,
 *     raison: string|null,
 *     mode_production: string,
 *   },
 *   error?: string
 * }>}
 */
export const getEtatCycleSchema = async (schemaId, schema) => {
  try {
    const [batchResult, relanceResult] = await Promise.all([
      getBatchActif(schemaId),
      detecterBesoinRelance(schemaId, schema),
    ]);

    if (!batchResult.success) return { success: false, error: batchResult.error };
    if (!relanceResult.success) return { success: false, error: relanceResult.error };

    const lot = batchResult.lot;
    return {
      success: true,
      etat: {
        lot,
        quantite_disponible:    parseFloat(lot?.quantite_disponible ?? 0),
        jours_avant_peremption: lot?.jours_avant_peremption ?? null,
        besoinRelance:          relanceResult.besoinRelance,
        raison:                 relanceResult.raison ?? null,
        mode_production:        schema?.mode_production || MODES_PRODUCTION.A_LA_DEMANDE,
      },
    };
  } catch (error) {
    console.error("Exception getEtatCycleSchema:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer tous les schémas cycliques / par conservation qui nécessitent une relance.
 * Utile pour un tableau de bord des alertes de production.
 *
 * @param {string} userRole - Pour filtrer selon les permissions
 * @returns {Promise<{
 *   success: boolean,
 *   schemas?: Array<{ schema: Object, etat: Object }>,
 *   error?: string
 * }>}
 */
export const getSchemasCycliquesARelancer = async () => {
  try {
    // Récupérer uniquement les schémas avec un mode non "a_la_demande"
    const { data, error } = await supabase
      .from("production_schemas")
      .select("*")
      .eq("actif", true)
      .in("mode_production", [
        MODES_PRODUCTION.PAR_CONSERVATION,
        MODES_PRODUCTION.CYCLIQUE,
      ])
      .order("nom", { ascending: true });

    if (error) return { success: false, error: error.message };

    const schemas = data || [];

    // Évaluer le besoin de relance en parallèle
    const resultats = await Promise.all(
      schemas.map(async (schema) => {
        const etatResult = await getEtatCycleSchema(schema.id, schema);
        if (!etatResult.success) return null;
        return { schema, etat: etatResult.etat };
      })
    );

    // Ne garder que ceux qui nécessitent une relance
    const aRelancer = resultats
      .filter((r) => r !== null && r.etat.besoinRelance);

    return { success: true, schemas: aRelancer };
  } catch (error) {
    console.error("Exception getSchemasCycliquesARelancer:", error);
    return { success: false, error: error.message };
  }
};
