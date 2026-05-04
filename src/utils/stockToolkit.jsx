/**
 * stockToolkit.jsx
 * Toolkit pour la gestion du stock
 *
 * === TABLE : stock_lots ===
 * Un lot = les résultats d'une production pour un item spécifique.
 * Alimenté depuis les productions terminées ou saisi manuellement.
 * {
 *   id, nom, categorie,
 *   production_id (FK nullable), schema_id (FK nullable),
 *   quantite_initiale, quantite_disponible, quantite_vendue, quantite_perdue,
 *   cout_unitaire, cout_total, cout_vendu, cout_perdu,
 *   date_production, duree_conservation_jours, date_peremption,
 *   statut: disponible | partiellement_vendu | epuise | perime,
 *   notes, created_by, created_at, updated_at
 * }
 *
 * === TABLE : stock_mouvements ===
 * Journal immuable — INSERT uniquement, jamais UPDATE/DELETE.
 * {
 *   id, lot_id (FK),
 *   type: entree | vente | perte | ajustement,
 *   quantite, cout, motif, date_mouvement,
 *   commande_id (nullable), created_by, created_at
 * }
 *
 * Permissions : admin + superviseur pour CRUD
 *               admin seul pour suppression et ajustements
 */

import { supabase } from "@/config/supabase";
import { isSupervisorOrAdmin, ROLES } from "@/utils/permissions";

// ============================================================================
// CONSTANTES
// ============================================================================

export const STATUTS_LOT = {
  DISPONIBLE:          "disponible",
  PARTIELLEMENT_VENDU: "partiellement_vendu",
  EPUISE:              "epuise",
  PERIME:              "perime",
};

export const STATUTS_LOT_LABELS = {
  [STATUTS_LOT.DISPONIBLE]:          "Disponible",
  [STATUTS_LOT.PARTIELLEMENT_VENDU]: "Partiellement vendu",
  [STATUTS_LOT.EPUISE]:              "Épuisé",
  [STATUTS_LOT.PERIME]:              "Périmé",
};

export const TYPES_MOUVEMENT = {
  ENTREE:      "entree",
  VENTE:       "vente",
  PERTE:       "perte",
  AJUSTEMENT:  "ajustement",
};

export const TYPES_MOUVEMENT_LABELS = {
  [TYPES_MOUVEMENT.ENTREE]:     "Entrée",
  [TYPES_MOUVEMENT.VENTE]:      "Vente",
  [TYPES_MOUVEMENT.PERTE]:      "Perte",
  [TYPES_MOUVEMENT.AJUSTEMENT]: "Ajustement",
};

// Repris du productionToolkit pour éviter l'import circulaire
export const CATEGORIES_STOCK = {
  PAIN:      "pain",
  SAUCE:     "sauce",
  GARNITURE: "garniture",
  BOISSON:   "boisson",
  AUTRE:     "autre",
};

export const CATEGORIES_STOCK_LABELS = {
  [CATEGORIES_STOCK.PAIN]:      "Pain",
  [CATEGORIES_STOCK.SAUCE]:     "Sauce",
  [CATEGORIES_STOCK.GARNITURE]: "Garniture",
  [CATEGORIES_STOCK.BOISSON]:   "Boisson",
  [CATEGORIES_STOCK.AUTRE]:     "Autre",
};

// Seuils d'alerte péremption (en jours)
export const SEUILS_ALERTE = {
  CRITIQUE: 1,  // expire demain ou aujourd'hui
  URGENT:   3,  // expire dans 3 jours
  ATTENTION: 7, // expire dans 7 jours
};

// ============================================================================
// PERMISSIONS
// ============================================================================

export const canManageStock = (userRole) => isSupervisorOrAdmin(userRole);
export const canDeleteLot   = (userRole) => userRole === ROLES.ADMIN;
export const canAjusterStock = (userRole) => userRole === ROLES.ADMIN;

// ============================================================================
// SÉLECT AVEC JOINTURES
// ============================================================================

const SELECT_LOT_WITH_RELATIONS = `
  *,
  production:productions!production_id(
    id, recette_id, date_production, cout_total_reel, rendement_reel_pct, qte_produite_reelle
  ),
  created_by_info:users!created_by(id, nom, prenoms)
`;

const SELECT_MOUVEMENT_WITH_RELATIONS = `
  *,
  lot:stock_lots!lot_id(id, nom, categorie, cout_unitaire),
  created_by_info:users!created_by(id, nom, prenoms)
`;

// ============================================================================
// CALCULS
// ============================================================================

/**
 * Calculer le coût unitaire d'un lot depuis une production
 * Répartit le coût total de la production proportionnellement
 * à la quantité de chaque item dans les résultats.
 *
 * @param {number} coutTotalProduction - cout_total de la production
 * @param {number} quantiteItem        - quantite de cet item dans resultats
 * @param {number} quantiteTotale      - somme de toutes les quantites dans resultats
 * @returns {number}
 */
export const calculerCoutUnitaireLot = (coutTotalProduction, quantiteItem, quantiteTotale) => {
  if (!quantiteTotale || quantiteTotale <= 0 || !quantiteItem || quantiteItem <= 0) return 0;
  const coutProportionnel = (coutTotalProduction * quantiteItem) / quantiteTotale;
  return Math.round((coutProportionnel / quantiteItem) * 100) / 100;
};

/**
 * Calculer la date de péremption
 * @param {string} dateProduction       - format YYYY-MM-DD
 * @param {number} dureeConservationJours
 * @returns {string|null} YYYY-MM-DD ou null
 */
export const calculerDatePeremption = (dateProduction, dureeConservationJours) => {
  if (!dateProduction || !dureeConservationJours) return null;
  const date = new Date(dateProduction);
  date.setDate(date.getDate() + dureeConservationJours);
  return date.toISOString().split("T")[0];
};

/**
 * Calculer le nombre de jours avant péremption
 * @param {string} datePeremption - format YYYY-MM-DD
 * @returns {number} Négatif si déjà périmé
 */
export const joursAvantPeremption = (datePeremption) => {
  if (!datePeremption) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const peremption = new Date(datePeremption);
  return Math.round((peremption - today) / (1000 * 60 * 60 * 24));
};

/**
 * Niveau d'alerte pour un lot selon sa date de péremption
 * @param {string} datePeremption
 * @returns {"critique"|"urgent"|"attention"|"ok"|null}
 */
export const niveauAlertePeremption = (datePeremption) => {
  const jours = joursAvantPeremption(datePeremption);
  if (jours === null) return null;
  if (jours <= SEUILS_ALERTE.CRITIQUE)  return "critique";
  if (jours <= SEUILS_ALERTE.URGENT)    return "urgent";
  if (jours <= SEUILS_ALERTE.ATTENTION) return "attention";
  return "ok";
};

// ============================================================================
// VALIDATION
// ============================================================================

export const validateLotManuel = (lotData) => {
  const errors = [];
  if (!lotData.nom?.trim())          errors.push("Le nom de l'item est requis.");
  if (!lotData.categorie)            errors.push("La catégorie est requise.");
  if (!lotData.date_production)      errors.push("La date de production est requise.");
  if (!lotData.quantite_initiale || parseFloat(lotData.quantite_initiale) <= 0)
    errors.push("La quantité initiale doit être supérieure à 0.");
  if (lotData.cout_unitaire !== undefined && parseFloat(lotData.cout_unitaire) < 0)
    errors.push("Le coût unitaire ne peut pas être négatif.");
  return { valid: errors.length === 0, errors };
};

const validateMouvement = (lotId, quantite, quantiteDisponible, type) => {
  const errors = [];
  if (!lotId)             errors.push("Lot non spécifié.");
  if (!quantite || parseFloat(quantite) <= 0)
    errors.push("La quantité doit être supérieure à 0.");
  if (type !== TYPES_MOUVEMENT.ENTREE && parseFloat(quantite) > parseFloat(quantiteDisponible))
    errors.push(`Quantité insuffisante. Disponible : ${quantiteDisponible}`);
  return { valid: errors.length === 0, errors };
};

// ============================================================================
// INTÉGRATION PRODUCTION → STOCK
// ============================================================================

/**
 * Vérifier si une production a déjà été intégrée au stock
 * @param {string} productionId
 * @returns {Promise<{ success: boolean, deja_integre: boolean, nb_lots?: number }>}
 */
export const verifierIntegration = async (productionId) => {
  try {
    const { count, error } = await supabase
      .from("stock_lots")
      .select("id", { count: "exact", head: true })
      .eq("production_id", productionId);

    if (error) return { success: false, error: error.message };
    return { success: true, deja_integre: count > 0, nb_lots: count };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Intégrer les résultats d'une production terminée dans le stock
 *
 * Crée un stock_lot par item dans production.resultats.
 * Le coût unitaire est réparti proportionnellement sur chaque item.
 * Crée également les mouvements d'entrée correspondants.
 *
 * @param {string} productionId
 * @param {string} userRole
 * @returns {Promise<{ success: boolean, lots?: Array, error?: string }>}
 */
export const integrerProductionAuStock = async (_productionId, _userRole) => {
  // Fonctionnalité non disponible dans le nouveau système de production simplifié.
  return { success: false, error: "L'intégration automatique au stock n'est pas disponible dans cette version." };
};

// ============================================================================
// CRUD — LOTS
// ============================================================================

/**
 * Créer un lot manuellement (entrée hors production)
 * @param {Object} lotData
 * @param {string} userRole
 * @returns {Promise<{ success: boolean, lot?: Object, errors?: string[], error?: string }>}
 */
export const createLotManuel = async (lotData, userRole) => {
  if (!canManageStock(userRole)) {
    return { success: false, error: "Permission refusée." };
  }

  const validation = validateLotManuel(lotData);
  if (!validation.valid) return { success: false, errors: validation.errors };

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Utilisateur non authentifié." };

    const quantiteInitiale = parseFloat(lotData.quantite_initiale);
    const coutUnitaire     = parseFloat(lotData.cout_unitaire || 0);
    const coutTotal        = Math.round(coutUnitaire * quantiteInitiale * 100) / 100;
    const datePeremption   = calculerDatePeremption(
      lotData.date_production,
      lotData.duree_conservation_jours || null
    );

    const payload = {
      nom:                       lotData.nom.trim(),
      categorie:                 lotData.categorie,
      production_id:             null,
      schema_id:                 null,
      quantite_initiale:         quantiteInitiale,
      quantite_disponible:       quantiteInitiale,
      quantite_vendue:           0,
      quantite_perdue:           0,
      cout_unitaire:             coutUnitaire,
      cout_total:                coutTotal,
      cout_vendu:                0,
      cout_perdu:                0,
      date_production:           lotData.date_production,
      duree_conservation_jours:  lotData.duree_conservation_jours
        ? parseInt(lotData.duree_conservation_jours) : null,
      date_peremption:           datePeremption,
      notes:                     lotData.notes?.trim() || null,
      created_by:                user.id,
    };

    const { data: lot, error } = await supabase
      .from("stock_lots")
      .insert(payload)
      .select(SELECT_LOT_WITH_RELATIONS)
      .single();

    if (error) {
      console.error("Erreur createLotManuel:", error);
      return { success: false, error: error.message };
    }

    // Mouvement d'entrée
    await supabase.from("stock_mouvements").insert({
      lot_id:         lot.id,
      type:           TYPES_MOUVEMENT.ENTREE,
      quantite:       lot.quantite_initiale,
      cout:           lot.cout_total,
      motif:          "Entrée manuelle",
      date_mouvement: lot.date_production,
      created_by:     user.id,
    });

    return { success: true, lot };
  } catch (err) {
    console.error("Exception createLotManuel:", err);
    return { success: false, error: err.message };
  }
};

/**
 * Récupérer les lots avec filtres
 * @param {Object} options - { statuts[], categorie, searchTerm, productionId,
 *                             includeEpuise, includePerime, startDate, endDate,
 *                             alertesPeremption }
 * @returns {Promise<{ success: boolean, lots?: Array, error?: string }>}
 */
export const getLots = async (options = {}) => {
  try {
    const {
      statuts,
      categorie,
      searchTerm,
      productionId,
      schemaId,
      includeEpuise   = false,
      includePerime   = false,
      startDate,
      endDate,
      alertesPeremption = false,
      limit = 100,
      offset = 0,
    } = options;

    let query = supabase
      .from("stock_lots")
      .select(SELECT_LOT_WITH_RELATIONS, { count: "exact" })
      .order("date_production", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtres statut
    if (statuts && statuts.length > 0) {
      query = query.in("statut", statuts);
    } else {
      // Par défaut : exclure épuisés et périmés sauf demande explicite
      const statutsFiltres = [STATUTS_LOT.DISPONIBLE, STATUTS_LOT.PARTIELLEMENT_VENDU];
      if (includeEpuise) statutsFiltres.push(STATUTS_LOT.EPUISE);
      if (includePerime) statutsFiltres.push(STATUTS_LOT.PERIME);
      query = query.in("statut", statutsFiltres);
    }

    if (categorie)    query = query.eq("categorie", categorie);
    if (productionId) query = query.eq("production_id", productionId);
    if (schemaId)     query = query.eq("schema_id", schemaId);
    if (startDate)    query = query.gte("date_production", startDate);
    if (endDate)      query = query.lte("date_production", endDate);

    // Alerte péremption : uniquement les lots proches de péremption
    if (alertesPeremption) {
      const dateAlerte = new Date();
      dateAlerte.setDate(dateAlerte.getDate() + SEUILS_ALERTE.ATTENTION);
      query = query
        .not("date_peremption", "is", null)
        .lte("date_peremption", dateAlerte.toISOString().split("T")[0]);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Erreur getLots:", error);
      return { success: false, error: error.message };
    }

    let lots = data || [];

    // Filtre recherche côté client
    if (searchTerm?.trim()) {
      const term = searchTerm.toLowerCase();
      lots = lots.filter((l) => l.nom.toLowerCase().includes(term));
    }

    // Enrichir avec le niveau d'alerte
    lots = lots.map((l) => ({
      ...l,
      alerte_peremption: niveauAlertePeremption(l.date_peremption),
      jours_avant_peremption: joursAvantPeremption(l.date_peremption),
    }));

    return { success: true, lots, total: count || 0 };
  } catch (err) {
    console.error("Exception getLots:", err);
    return { success: false, error: err.message };
  }
};

/**
 * Récupérer un lot par son ID
 * @param {string} lotId
 * @returns {Promise<{ success: boolean, lot?: Object, error?: string }>}
 */
export const getLotById = async (lotId) => {
  try {
    const { data, error } = await supabase
      .from("stock_lots")
      .select(SELECT_LOT_WITH_RELATIONS)
      .eq("id", lotId)
      .single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      lot: {
        ...data,
        alerte_peremption:      niveauAlertePeremption(data.date_peremption),
        jours_avant_peremption: joursAvantPeremption(data.date_peremption),
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Récupérer tous les lots d'une production
 * @param {string} productionId
 * @returns {Promise<{ success: boolean, lots?: Array, error?: string }>}
 */
export const getLotsByProduction = async (productionId) => {
  return getLots({ productionId, statuts: Object.values(STATUTS_LOT) });
};

/**
 * Mettre à jour les infos d'un lot (notes, duree_conservation_jours)
 * Ne modifie PAS les quantités — utiliser les fonctions de mouvements.
 * @param {string} lotId
 * @param {Object} updates - { notes, duree_conservation_jours }
 * @param {string} userRole
 * @returns {Promise<{ success: boolean, lot?: Object, error?: string }>}
 */
export const updateLot = async (lotId, updates, userRole) => {
  if (!canManageStock(userRole)) {
    return { success: false, error: "Permission refusée." };
  }

  try {
    // Champs autorisés à la modification directe
    const payload = {};
    if (updates.notes !== undefined)                    payload.notes = updates.notes?.trim() || null;
    if (updates.duree_conservation_jours !== undefined) {
      payload.duree_conservation_jours = updates.duree_conservation_jours
        ? parseInt(updates.duree_conservation_jours) : null;
    }

    // Recalculer date_peremption si la durée change
    if (payload.duree_conservation_jours !== undefined) {
      const { data: lot } = await supabase
        .from("stock_lots")
        .select("date_production")
        .eq("id", lotId)
        .single();
      if (lot) {
        payload.date_peremption = calculerDatePeremption(
          lot.date_production,
          payload.duree_conservation_jours
        );
      }
    }

    const { data, error } = await supabase
      .from("stock_lots")
      .update(payload)
      .eq("id", lotId)
      .select(SELECT_LOT_WITH_RELATIONS)
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, lot: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Supprimer un lot — admin uniquement
 * Supprime également ses mouvements (ON DELETE CASCADE)
 * @param {string} lotId
 * @param {string} userRole
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export const deleteLot = async (lotId, userRole) => {
  if (!canDeleteLot(userRole)) {
    return { success: false, error: "Permission refusée. Rôle admin requis." };
  }

  try {
    const { error } = await supabase
      .from("stock_lots")
      .delete()
      .eq("id", lotId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ============================================================================
// MOUVEMENTS — VENTE, PERTE, AJUSTEMENT
// ============================================================================

/**
 * Enregistrer une vente sur un lot
 * Met à jour quantite_vendue, quantite_disponible, cout_vendu du lot.
 * Crée un mouvement de type "vente".
 *
 * @param {string} lotId
 * @param {number} quantite
 * @param {string} userRole
 * @param {Object} options - { commandeId, motif, dateMouvement }
 * @returns {Promise<{ success: boolean, lot?: Object, mouvement?: Object, error?: string }>}
 */
export const enregistrerVente = async (lotId, quantite, userRole, options = {}) => {
  if (!canManageStock(userRole)) {
    return { success: false, error: "Permission refusée." };
  }

  try {
    // Récupérer le lot actuel
    const { data: lot, error: fetchError } = await supabase
      .from("stock_lots")
      .select("id, quantite_disponible, quantite_vendue, cout_unitaire, cout_vendu, statut, date_production")
      .eq("id", lotId)
      .single();

    if (fetchError || !lot) return { success: false, error: "Lot introuvable." };

    if (lot.statut === STATUTS_LOT.PERIME) {
      return { success: false, error: "Ce lot est périmé. Impossible d'enregistrer une vente." };
    }

    const validation = validateMouvement(lotId, quantite, lot.quantite_disponible, TYPES_MOUVEMENT.VENTE);
    if (!validation.valid) return { success: false, errors: validation.errors };

    const { data: { user } } = await supabase.auth.getUser();
    const qte      = parseFloat(quantite);
    const cout     = Math.round(qte * parseFloat(lot.cout_unitaire) * 100) / 100;
    const nvVendue = parseFloat(lot.quantite_vendue) + qte;
    const nvDispo  = parseFloat(lot.quantite_disponible) - qte;
    const nvCoutVendu = Math.round((parseFloat(lot.cout_vendu) + cout) * 100) / 100;

    // Mettre à jour le lot
    const { data: lotMaj, error: updateError } = await supabase
      .from("stock_lots")
      .update({
        quantite_vendue:     nvVendue,
        quantite_disponible: nvDispo,
        cout_vendu:          nvCoutVendu,
        // statut recalculé automatiquement par le trigger PostgreSQL
      })
      .eq("id", lotId)
      .select(SELECT_LOT_WITH_RELATIONS)
      .single();

    if (updateError) return { success: false, error: updateError.message };

    // Créer le mouvement
    const { data: mouvement, error: mouvError } = await supabase
      .from("stock_mouvements")
      .insert({
        lot_id:         lotId,
        type:           TYPES_MOUVEMENT.VENTE,
        quantite:       qte,
        cout,
        motif:          options.motif || null,
        date_mouvement: options.dateMouvement || new Date().toISOString().split("T")[0],
        commande_id:    options.commandeId || null,
        created_by:     user?.id || null,
      })
      .select()
      .single();

    if (mouvError) console.error("Erreur mouvement vente:", mouvError);

    return { success: true, lot: lotMaj, mouvement };
  } catch (err) {
    console.error("Exception enregistrerVente:", err);
    return { success: false, error: err.message };
  }
};

/**
 * Enregistrer une perte sur un lot (péremption, accident, vol, etc.)
 * Met à jour quantite_perdue, quantite_disponible, cout_perdu du lot.
 * Crée un mouvement de type "perte".
 *
 * @param {string} lotId
 * @param {number} quantite
 * @param {string} motif - raison de la perte
 * @param {string} userRole
 * @param {Object} options - { dateMouvement }
 * @returns {Promise<{ success: boolean, lot?: Object, mouvement?: Object, error?: string }>}
 */
export const enregistrerPerte = async (lotId, quantite, motif, userRole, options = {}) => {
  if (!canManageStock(userRole)) {
    return { success: false, error: "Permission refusée." };
  }

  try {
    const { data: lot, error: fetchError } = await supabase
      .from("stock_lots")
      .select("id, quantite_disponible, quantite_perdue, cout_unitaire, cout_perdu, date_production")
      .eq("id", lotId)
      .single();

    if (fetchError || !lot) return { success: false, error: "Lot introuvable." };

    const validation = validateMouvement(lotId, quantite, lot.quantite_disponible, TYPES_MOUVEMENT.PERTE);
    if (!validation.valid) return { success: false, errors: validation.errors };

    const { data: { user } } = await supabase.auth.getUser();
    const qte        = parseFloat(quantite);
    const cout       = Math.round(qte * parseFloat(lot.cout_unitaire) * 100) / 100;
    const nvPerdue   = parseFloat(lot.quantite_perdue) + qte;
    const nvDispo    = parseFloat(lot.quantite_disponible) - qte;
    const nvCoutPerdu = Math.round((parseFloat(lot.cout_perdu) + cout) * 100) / 100;

    const { data: lotMaj, error: updateError } = await supabase
      .from("stock_lots")
      .update({
        quantite_perdue:     nvPerdue,
        quantite_disponible: nvDispo,
        cout_perdu:          nvCoutPerdu,
      })
      .eq("id", lotId)
      .select(SELECT_LOT_WITH_RELATIONS)
      .single();

    if (updateError) return { success: false, error: updateError.message };

    const { data: mouvement, error: mouvError } = await supabase
      .from("stock_mouvements")
      .insert({
        lot_id:         lotId,
        type:           TYPES_MOUVEMENT.PERTE,
        quantite:       qte,
        cout,
        motif:          motif?.trim() || "Perte non précisée",
        date_mouvement: options.dateMouvement || new Date().toISOString().split("T")[0],
        created_by:     user?.id || null,
      })
      .select()
      .single();

    if (mouvError) console.error("Erreur mouvement perte:", mouvError);

    return { success: true, lot: lotMaj, mouvement };
  } catch (err) {
    console.error("Exception enregistrerPerte:", err);
    return { success: false, error: err.message };
  }
};

/**
 * Ajustement manuel du stock — admin uniquement
 * Permet de corriger un écart (inventaire physique vs système).
 * delta positif = ajout, delta négatif = retrait
 *
 * @param {string} lotId
 * @param {number} delta - quantité à ajouter (>0) ou retirer (<0)
 * @param {string} motif
 * @param {string} userRole
 * @returns {Promise<{ success: boolean, lot?: Object, error?: string }>}
 */
export const ajusterStock = async (lotId, delta, motif, userRole) => {
  if (!canAjusterStock(userRole)) {
    return { success: false, error: "Permission refusée. Rôle admin requis." };
  }
  if (!delta || delta === 0) {
    return { success: false, error: "Le delta doit être non nul." };
  }
  if (!motif?.trim()) {
    return { success: false, error: "Un motif est requis pour un ajustement." };
  }

  try {
    const { data: lot, error: fetchError } = await supabase
      .from("stock_lots")
      .select("id, quantite_disponible, quantite_initiale, quantite_vendue, quantite_perdue, cout_unitaire")
      .eq("id", lotId)
      .single();

    if (fetchError || !lot) return { success: false, error: "Lot introuvable." };

    const nvDispo = parseFloat(lot.quantite_disponible) + parseFloat(delta);
    if (nvDispo < 0) {
      return { success: false, error: `Ajustement impossible : le stock disponible passerait à ${nvDispo}.` };
    }

    const { data: { user } } = await supabase.auth.getUser();
    const absDelta = Math.abs(parseFloat(delta));
    const cout     = Math.round(absDelta * parseFloat(lot.cout_unitaire) * 100) / 100;

    // Pour les ajustements en retrait, on impacte quantite_perdue pour la cohérence comptable
    const updatePayload = { quantite_disponible: nvDispo };
    if (delta < 0) {
      updatePayload.quantite_perdue = parseFloat(lot.quantite_perdue) + absDelta;
      updatePayload.cout_perdu = Math.round(
        (parseFloat(lot.cout_perdu || 0) + cout) * 100
      ) / 100;
    } else {
      // Ajout : on augmente également quantite_initiale (car c'est réellement plus de stock)
      updatePayload.quantite_initiale = parseFloat(lot.quantite_initiale) + absDelta;
      updatePayload.cout_total = Math.round(
        ((parseFloat(lot.quantite_initiale) + absDelta) * parseFloat(lot.cout_unitaire)) * 100
      ) / 100;
    }

    const { data: lotMaj, error: updateError } = await supabase
      .from("stock_lots")
      .update(updatePayload)
      .eq("id", lotId)
      .select(SELECT_LOT_WITH_RELATIONS)
      .single();

    if (updateError) return { success: false, error: updateError.message };

    await supabase.from("stock_mouvements").insert({
      lot_id:         lotId,
      type:           TYPES_MOUVEMENT.AJUSTEMENT,
      quantite:       absDelta,
      cout,
      motif:          `Ajustement ${delta > 0 ? "+" : "-"}${absDelta} : ${motif.trim()}`,
      date_mouvement: new Date().toISOString().split("T")[0],
      created_by:     user?.id || null,
    });

    return { success: true, lot: lotMaj };
  } catch (err) {
    console.error("Exception ajusterStock:", err);
    return { success: false, error: err.message };
  }
};

// ============================================================================
// MOUVEMENTS — LECTURE
// ============================================================================

/**
 * Récupérer les mouvements d'un lot
 * @param {string} lotId
 * @returns {Promise<{ success: boolean, mouvements?: Array, error?: string }>}
 */
export const getMouvementsLot = async (lotId) => {
  try {
    const { data, error } = await supabase
      .from("stock_mouvements")
      .select(SELECT_MOUVEMENT_WITH_RELATIONS)
      .eq("lot_id", lotId)
      .order("date_mouvement", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, mouvements: data || [] };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Récupérer tous les mouvements avec filtres
 * @param {Object} options - { type, startDate, endDate, lotId, limit }
 * @returns {Promise<{ success: boolean, mouvements?: Array, error?: string }>}
 */
export const getMouvements = async (options = {}) => {
  try {
    const { type, startDate, endDate, lotId, limit = 200 } = options;

    let query = supabase
      .from("stock_mouvements")
      .select(SELECT_MOUVEMENT_WITH_RELATIONS)
      .order("date_mouvement", { ascending: false })
      .limit(limit);

    if (type)      query = query.eq("type", type);
    if (lotId)     query = query.eq("lot_id", lotId);
    if (startDate) query = query.gte("date_mouvement", startDate);
    if (endDate)   query = query.lte("date_mouvement", endDate);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, mouvements: data || [] };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ============================================================================
// STOCK ACTUEL — VUE AGRÉGÉE
// ============================================================================

/**
 * Récupérer le stock actuel depuis la vue stock_vue_actuel
 * Vue agrégée par (nom, catégorie) — tous lots confondus
 * @param {Object} options - { categorie, enStockSeulement }
 * @returns {Promise<{ success: boolean, items?: Array, error?: string }>}
 */
export const getStockActuel = async (options = {}) => {
  try {
    const { categorie, enStockSeulement = true } = options;

    let query = supabase
      .from("stock_vue_actuel")
      .select("*")
      .order("categorie")
      .order("nom");

    if (categorie)        query = query.eq("categorie", categorie);
    if (enStockSeulement) query = query.eq("en_stock", true);

    const { data, error } = await query;
    if (error) {
      console.error("Erreur getStockActuel:", error);
      return { success: false, error: error.message };
    }
    return { success: true, items: data || [] };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ============================================================================
// ALERTES & PÉREMPTIONS
// ============================================================================

/**
 * Récupérer toutes les alertes actives
 * Retourne les lots périmés ou proches de péremption
 * @param {number} horizonJours - horizon de l'alerte (défaut : SEUIL ATTENTION = 7j)
 * @returns {Promise<{ success: boolean, alertes?: Object, error?: string }>}
 */
export const getAlertes = async (horizonJours = SEUILS_ALERTE.ATTENTION) => {
  try {
    const dateHorizon = new Date();
    dateHorizon.setDate(dateHorizon.getDate() + horizonJours);
    const dateHorizonStr = dateHorizon.toISOString().split("T")[0];
    const todayStr = new Date().toISOString().split("T")[0];

    // Lots déjà périmés (statut = perime)
    const { data: perimes, error: e1 } = await supabase
      .from("stock_lots")
      .select("id, nom, categorie, quantite_disponible, date_peremption, cout_perdu")
      .eq("statut", STATUTS_LOT.PERIME)
      .gt("quantite_disponible", 0)
      .order("date_peremption");

    // Lots proches de péremption (encore disponibles)
    const { data: proches, error: e2 } = await supabase
      .from("stock_lots")
      .select("id, nom, categorie, quantite_disponible, date_peremption, cout_unitaire")
      .in("statut", [STATUTS_LOT.DISPONIBLE, STATUTS_LOT.PARTIELLEMENT_VENDU])
      .not("date_peremption", "is", null)
      .lte("date_peremption", dateHorizonStr)
      .gte("date_peremption", todayStr)
      .order("date_peremption");

    if (e1 || e2) return { success: false, error: e1?.message || e2?.message };

    const prochesAvecNiveau = (proches || []).map((l) => ({
      ...l,
      jours: joursAvantPeremption(l.date_peremption),
      niveau: niveauAlertePeremption(l.date_peremption),
    }));

    return {
      success: true,
      alertes: {
        perimes:         perimes || [],
        proches_peremption: prochesAvecNiveau,
        nb_perimes:      (perimes || []).length,
        nb_proches:      prochesAvecNiveau.length,
        critique: prochesAvecNiveau.filter((l) => l.niveau === "critique"),
        urgent:   prochesAvecNiveau.filter((l) => l.niveau === "urgent"),
        attention: prochesAvecNiveau.filter((l) => l.niveau === "attention"),
      },
    };
  } catch (err) {
    console.error("Exception getAlertes:", err);
    return { success: false, error: err.message };
  }
};

/**
 * Déclencher la mise à jour des lots périmés
 * Appelle la fonction PostgreSQL marquer_lots_perimes()
 * @returns {Promise<{ success: boolean, nb_mis_a_jour?: number, error?: string }>}
 */
export const marquerLotsPerimes = async () => {
  try {
    const { data, error } = await supabase.rpc("marquer_lots_perimes");
    if (error) return { success: false, error: error.message };
    return { success: true, nb_mis_a_jour: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ============================================================================
// ANALYTIQUE & DASHBOARD
// ============================================================================

/**
 * Calculer les métriques de stock sur une période
 * @param {Object} options - { startDate, endDate, categorie }
 * @returns {Promise<{ success: boolean, metriques?: Object, error?: string }>}
 */
export const getMetriquesStock = async (options = {}) => {
  try {
    const { startDate, endDate, categorie } = options;

    let query = supabase
      .from("stock_lots")
      .select("*");

    if (categorie)  query = query.eq("categorie", categorie);
    if (startDate)  query = query.gte("date_production", startDate);
    if (endDate)    query = query.lte("date_production", endDate);

    const { data: lots, error } = await query;
    if (error) return { success: false, error: error.message };

    const data = lots || [];
    if (data.length === 0) {
      return { success: true, metriques: null };
    }

    // ── Volumes ──────────────────────────────────────────────────────────────
    const totalInitiale   = data.reduce((s, l) => s + parseFloat(l.quantite_initiale || 0), 0);
    const totalVendue     = data.reduce((s, l) => s + parseFloat(l.quantite_vendue || 0), 0);
    const totalPerdue     = data.reduce((s, l) => s + parseFloat(l.quantite_perdue || 0), 0);
    const totalDisponible = data.reduce((s, l) => s + parseFloat(l.quantite_disponible || 0), 0);

    // ── Coûts ─────────────────────────────────────────────────────────────────
    const totalCoutEngage = data.reduce((s, l) => s + parseFloat(l.cout_total || 0), 0);
    const totalCoutVendu  = data.reduce((s, l) => s + parseFloat(l.cout_vendu || 0), 0);
    const totalCoutPerdu  = data.reduce((s, l) => s + parseFloat(l.cout_perdu || 0), 0);

    // ── Taux ──────────────────────────────────────────────────────────────────
    const tauxVente = totalInitiale > 0
      ? Math.round((totalVendue / totalInitiale) * 10000) / 100 : 0;
    const tauxPerte = totalInitiale > 0
      ? Math.round((totalPerdue / totalInitiale) * 10000) / 100 : 0;
    const tauxValorisation = totalCoutEngage > 0
      ? Math.round((totalCoutVendu / totalCoutEngage) * 10000) / 100 : 0;

    // ── Par catégorie ─────────────────────────────────────────────────────────
    const parCategorie = {};
    data.forEach((l) => {
      const cat = l.categorie;
      if (!parCategorie[cat]) {
        parCategorie[cat] = { nb_lots: 0, cout_total: 0, cout_vendu: 0, cout_perdu: 0,
                               quantite_vendue: 0, quantite_perdue: 0, quantite_initiale: 0 };
      }
      parCategorie[cat].nb_lots++;
      parCategorie[cat].quantite_initiale += parseFloat(l.quantite_initiale || 0);
      parCategorie[cat].quantite_vendue   += parseFloat(l.quantite_vendue   || 0);
      parCategorie[cat].quantite_perdue   += parseFloat(l.quantite_perdue   || 0);
      parCategorie[cat].cout_total        += parseFloat(l.cout_total        || 0);
      parCategorie[cat].cout_vendu        += parseFloat(l.cout_vendu        || 0);
      parCategorie[cat].cout_perdu        += parseFloat(l.cout_perdu        || 0);
    });

    // ── Top items par valeur de vente ─────────────────────────────────────────
    const parItem = {};
    data.forEach((l) => {
      const key = l.nom;
      if (!parItem[key]) parItem[key] = { nom: key, cout_vendu: 0, quantite_vendue: 0 };
      parItem[key].cout_vendu     += parseFloat(l.cout_vendu || 0);
      parItem[key].quantite_vendue += parseFloat(l.quantite_vendue || 0);
    });

    const topItems = Object.values(parItem)
      .sort((a, b) => b.cout_vendu - a.cout_vendu)
      .slice(0, 10);

    // ── Rotation : fréquence moyenne vente/jour ───────────────────────────────
    let rotationMoyenne = 0;
    if (data.length >= 2 && startDate && endDate) {
      const nbJours = Math.max(
        1,
        Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
      );
      rotationMoyenne = Math.round((totalVendue / nbJours) * 100) / 100;
    }

    return {
      success: true,
      metriques: {
        // Volumes
        total_lots:           data.length,
        quantite_initiale:    Math.round(totalInitiale * 1000) / 1000,
        quantite_vendue:      Math.round(totalVendue   * 1000) / 1000,
        quantite_perdue:      Math.round(totalPerdue   * 1000) / 1000,
        quantite_disponible:  Math.round(totalDisponible * 1000) / 1000,
        // Coûts
        cout_total_engage:    Math.round(totalCoutEngage * 100) / 100,
        cout_vendu_total:     Math.round(totalCoutVendu  * 100) / 100,
        cout_perdu_total:     Math.round(totalCoutPerdu  * 100) / 100,
        cout_disponible:      Math.round((totalCoutEngage - totalCoutVendu - totalCoutPerdu) * 100) / 100,
        // Taux
        taux_vente_pct:       tauxVente,
        taux_perte_pct:       tauxPerte,
        taux_valorisation_pct: tauxValorisation,
        // Rotation
        rotation_moyenne_par_jour: rotationMoyenne,
        // Détails
        par_categorie:        parCategorie,
        top_items_par_vente:  topItems,
      },
    };
  } catch (err) {
    console.error("Exception getMetriquesStock:", err);
    return { success: false, error: err.message };
  }
};

/**
 * Dashboard stock — vue globale pour la page d'accueil du stock
 * @returns {Promise<{ success: boolean, dashboard?: Object, error?: string }>}
 */
export const getDashboardStock = async () => {
  try {
    // Lots actifs (disponible + partiellement_vendu)
    const { data: lotsActifs, error: e1 } = await supabase
      .from("stock_lots")
      .select("id, nom, categorie, quantite_disponible, quantite_initiale, quantite_vendue, quantite_perdue, cout_total, cout_vendu, cout_perdu, date_peremption, statut")
      .in("statut", [STATUTS_LOT.DISPONIBLE, STATUTS_LOT.PARTIELLEMENT_VENDU]);

    // Lots périmés avec du stock restant
    const { data: lotsPerimes, error: e2 } = await supabase
      .from("stock_lots")
      .select("id, nom, quantite_disponible, cout_perdu")
      .eq("statut", STATUTS_LOT.PERIME)
      .gt("quantite_disponible", 0);

    // Alertes péremption
    const alertesResult = await getAlertes();

    if (e1 || e2) return { success: false, error: e1?.message || e2?.message };

    const actifs = lotsActifs || [];

    const valeurStockTotal = actifs.reduce((s, l) => s + parseFloat(l.cout_total || 0), 0);
    const valeurVendue     = actifs.reduce((s, l) => s + parseFloat(l.cout_vendu || 0), 0);
    const valeurPerdue     = actifs.reduce((s, l) => s + parseFloat(l.cout_perdu || 0), 0);
    const qteDisponible    = actifs.reduce((s, l) => s + parseFloat(l.quantite_disponible || 0), 0);

    return {
      success: true,
      dashboard: {
        nb_lots_actifs:          actifs.length,
        nb_lots_perimes:         (lotsPerimes || []).length,
        valeur_stock_total:      Math.round(valeurStockTotal * 100) / 100,
        valeur_vendue:           Math.round(valeurVendue * 100) / 100,
        valeur_perdue:           Math.round(valeurPerdue * 100) / 100,
        quantite_disponible:     Math.round(qteDisponible * 1000) / 1000,
        taux_valorisation:       valeurStockTotal > 0
          ? Math.round((valeurVendue / valeurStockTotal) * 10000) / 100 : 0,
        alertes: alertesResult.success ? alertesResult.alertes : null,
      },
    };
  } catch (err) {
    console.error("Exception getDashboardStock:", err);
    return { success: false, error: err.message };
  }
};
