/**
 * distributionToolkit.js
 * CRUD Supabase + utilitaires de calcul pour le suivi de distribution.
 * Produits : yaourt | gateau
 */

import { supabase } from "@/config/supabase";

// ─── Constantes ───────────────────────────────────────────────────────────────

export const PRODUITS = ["yaourt", "gateau"];

export const PRODUIT_LABELS = { yaourt: "Yaourt", gateau: "Gâteau" };
export const PRODUIT_COLORS = { yaourt: "#f59e0b", gateau: "#a855f7" };
export const PRODUIT_ICONS  = { yaourt: "🥛",      gateau: "🎂"     };

export const JOURS_SEMAINE = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
export const JOURS_LABELS  = {
  lundi: "Lun", mardi: "Mar", mercredi: "Mer", jeudi: "Jeu",
  vendredi: "Ven", samedi: "Sam", dimanche: "Dim",
};

export const TYPE_DISTRIBUTEUR_LABELS = { ambulant: "Ambulant", statique: "Statique" };

export const PERIODICITE_PAIEMENT_LABELS = {
  journalier:   "Journalier",
  hebdomadaire: "Hebdomadaire",
  mensuel:      "Mensuel",
};

export const STATUT_PAIEMENT_LABELS = {
  non_paye: "Non payé",
  partiel:  "Partiel",
  paye:     "Payé",
};
export const STATUT_PAIEMENT_COLORS = {
  non_paye: "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400",
  partiel:  "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400",
  paye:     "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400",
};

export const MODE_PAIEMENT_LABELS = {
  especes:      "Espèces",
  mobile_money: "Mobile Money",
  virement:     "Virement",
};

// ─── Calculs (fonctions pures) ────────────────────────────────────────────────

/**
 * Calcule les métriques d'une ligne de tournée.
 * @param {{ quantite_recue, quantite_recuperee, prix_unitaire_applique }} ligne
 * @param {number} tauxRistourne — ex: 0.10 pour 10 %
 */
export const calculerLigne = (ligne, tauxRistourne = 0) => {
  const qte_vendue = (ligne.quantite_recue ?? 0) - (ligne.quantite_recuperee ?? 0);
  const vente      = Math.round(qte_vendue * (ligne.prix_unitaire_applique ?? 0) * 100) / 100;
  const ristourne  = Math.round(vente * tauxRistourne * 100) / 100;
  return { qte_vendue, vente, ristourne };
};

/**
 * Calcule les métriques consolidées d'une tournée à partir de ses lignes.
 * @param {Array} lignes — tableau de lignes_tournee
 * @param {number} tauxRistourne
 */
export const calculerTournee = (lignes = [], tauxRistourne = 0) => {
  let vente_totale        = 0;
  let qte_recue_totale    = 0;
  let qte_recuperee_totale = 0;
  const par_produit = {};

  for (const ligne of lignes) {
    const calc = calculerLigne(ligne, tauxRistourne);
    vente_totale          += calc.vente;
    qte_recue_totale      += ligne.quantite_recue    ?? 0;
    qte_recuperee_totale  += ligne.quantite_recuperee ?? 0;
    par_produit[ligne.type_produit] = { ...ligne, ...calc };
  }

  const ristourne_due     = Math.round(vente_totale * tauxRistourne * 100) / 100;
  const qte_vendue_totale = qte_recue_totale - qte_recuperee_totale;
  const taux_recouvrement = qte_recue_totale > 0
    ? Math.round((qte_recuperee_totale / qte_recue_totale) * 1000) / 10
    : 0;

  return {
    vente_totale:         Math.round(vente_totale * 100) / 100,
    ristourne_due,
    qte_recue_totale,
    qte_vendue_totale,
    qte_recuperee_totale,
    taux_recouvrement,
    par_produit,
  };
};

/**
 * Détermine le statut de paiement d'une tournée.
 */
export const calculerStatutPaiement = (montantPaye, ristourneDue) => {
  if (ristourneDue <= 0)           return "paye";
  if (montantPaye <= 0)            return "non_paye";
  if (montantPaye >= ristourneDue) return "paye";
  return "partiel";
};

/**
 * Calcule le solde ristourne d'un distributeur.
 * Sources : toutes ses tournées + tous ses paiements enregistrés.
 */
export const calculerSoldeDistributeur = (tournees = [], paiements = []) => {
  const ristourne_totale    = tournees.reduce((s, t) => s + Number(t.ristourne_due ?? 0), 0);
  const montant_paye_total  = paiements.reduce((s, p) => s + Number(p.montant       ?? 0), 0);
  const solde = Math.round((ristourne_totale - montant_paye_total) * 100) / 100;
  return {
    ristourne_totale:   Math.round(ristourne_totale   * 100) / 100,
    montant_paye_total: Math.round(montant_paye_total * 100) / 100,
    solde,
  };
};

// ─── Agrégations ──────────────────────────────────────────────────────────────

/**
 * Agrège les volumes et ventes par produit sur un ensemble de tournées.
 */
export const agregerParProduit = (tournees = []) => {
  const result = {
    yaourt: { qte_recue: 0, qte_vendue: 0, qte_recuperee: 0, vente: 0 },
    gateau: { qte_recue: 0, qte_vendue: 0, qte_recuperee: 0, vente: 0 },
  };
  for (const t of tournees) {
    for (const l of t.lignes ?? []) {
      const p = l.type_produit;
      if (!result[p]) continue;
      const { qte_vendue, vente } = calculerLigne(l, 0);
      result[p].qte_recue     += l.quantite_recue     ?? 0;
      result[p].qte_recuperee += l.quantite_recuperee ?? 0;
      result[p].qte_vendue    += qte_vendue;
      result[p].vente         += vente;
    }
  }
  for (const p of PRODUITS) result[p].vente = Math.round(result[p].vente * 100) / 100;
  return result;
};

/**
 * Agrège ventes et ristournes par zone géographique.
 * Les distributeurs doivent avoir leur objet zone embarqué (via DIST_SELECT).
 * Retourne un objet indexé par l'id de zone (ou "sans-zone").
 */
export const agregerParZone = (distributeurs = [], tournees = []) => {
  const distMap = Object.fromEntries(distributeurs.map(d => [d.id, d]));
  const zones   = {};

  const cleZone = (d) => d?.zone?.id ?? "sans-zone";
  const nomZone = (d) => d?.zone?.nom ?? "Sans zone";

  for (const d of distributeurs) {
    const k = cleZone(d);
    if (!zones[k]) zones[k] = { id: d.zone?.id ?? null, nom: nomZone(d), nb_distributeurs: 0, nb_tournees: 0, vente: 0, ristourne: 0 };
    zones[k].nb_distributeurs++;
  }

  for (const t of tournees) {
    const d = distMap[t.id_distributeur];
    const k = cleZone(d);
    if (!zones[k]) zones[k] = { id: d?.zone?.id ?? null, nom: nomZone(d), nb_distributeurs: 0, nb_tournees: 0, vente: 0, ristourne: 0 };
    zones[k].nb_tournees++;
    const { vente_totale, ristourne_due } = calculerTournee(t.lignes ?? [], d?.taux_ristourne ?? 0);
    zones[k].vente     += vente_totale;
    zones[k].ristourne += ristourne_due;
  }

  for (const k of Object.keys(zones)) {
    zones[k].vente     = Math.round(zones[k].vente     * 100) / 100;
    zones[k].ristourne = Math.round(zones[k].ristourne * 100) / 100;
  }

  return zones;
};

/**
 * Retourne la liste des alertes actives :
 * - ristourne impayée depuis N jours (selon periodicite_paiement)
 * - distributeur sans tournée depuis 7 jours
 */
export const detecterAnomalies = (distributeurs = [], tournees = [], paiements = []) => {
  const alertes = [];
  const today   = new Date();

  // Seuil d'alerte ristourne par périodicité (en jours)
  const SEUIL_JOURS = { journalier: 2, hebdomadaire: 8, mensuel: 32 };

  for (const d of distributeurs.filter(d => d.statut_eligibilite)) {
    const tourneesDist  = tournees.filter(t => t.id_distributeur === d.id);
    const paiementsDist = paiements.filter(p => p.id_distributeur === d.id);

    // Solde impayé
    const { solde } = calculerSoldeDistributeur(tourneesDist, paiementsDist);
    if (solde > 0) {
      const dernierPaiement = [...paiementsDist]
        .sort((a, b) => new Date(b.date_paiement) - new Date(a.date_paiement))[0];
      const refDate   = dernierPaiement
        ? new Date(dernierPaiement.date_paiement)
        : new Date(d.date_inscription);
      const joursDepuis = Math.floor((today - refDate) / 86400000);
      const seuil       = SEUIL_JOURS[d.periodicite_paiement] ?? 7;

      if (joursDepuis >= seuil) {
        alertes.push({ type: "ristourne_impayee", distributeur: d, solde, jours: joursDepuis });
      }
    }

    // Inactivité > 7 jours
    const derniereTournee = [...tourneesDist]
      .sort((a, b) => new Date(b.date_tournee) - new Date(a.date_tournee))[0];
    if (derniereTournee) {
      const joursInactif = Math.floor((today - new Date(derniereTournee.date_tournee)) / 86400000);
      if (joursInactif > 7) {
        alertes.push({ type: "inactivite", distributeur: d, jours: joursInactif });
      }
    }
  }

  return alertes;
};

// ─── CRUD : config_prix_produits ──────────────────────────────────────────────

export const getPrixProduits = async () => {
  const { data, error } = await supabase
    .from("config_prix_produits")
    .select("*")
    .order("produit");
  if (error) return { success: false, error: error.message };
  const prix = Object.fromEntries((data ?? []).map(r => [r.produit, r]));
  return { success: true, prix, data: data ?? [] };
};

export const updatePrixProduit = async (produit, prixUnitaire) => {
  const { data, error } = await supabase
    .from("config_prix_produits")
    .update({ prix_unitaire: prixUnitaire, updated_at: new Date().toISOString() })
    .eq("produit", produit)
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, config: data };
};

// ─── CRUD : zones_distribution ────────────────────────────────────────────────

const ZONE_SELECT = `
  id, nom, description, departement, arrondissement, commune, quartiers,
  centre, rayon, created_at, updated_at
`;

export const getZones = async () => {
  const { data, error } = await supabase
    .from("zones_distribution")
    .select(ZONE_SELECT)
    .order("nom");
  if (error) return { success: false, error: error.message };
  return { success: true, zones: data ?? [] };
};

export const getZone = async (id) => {
  const { data, error } = await supabase
    .from("zones_distribution")
    .select(ZONE_SELECT)
    .eq("id", id)
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, zone: data };
};

export const createZone = async (payload) => {
  // Diagnostic : rôle vu par Supabase au moment de l'appel
  const { data: roleData, error: roleErr } = await supabase.rpc("get_current_user_role");
  console.debug("[createZone] get_current_user_role =>", roleData, roleErr ?? "");

  const { data, error } = await supabase
    .from("zones_distribution")
    .insert({
      nom:            payload.nom,
      description:    payload.description    || null,
      departement:    payload.departement    || null,
      arrondissement: payload.arrondissement || null,
      commune:        payload.commune        || null,
      quartiers:      payload.quartiers      ?? [],
      centre:         payload.centre         ?? null,
      rayon:          payload.rayon != null ? Number(payload.rayon) : null,
    })
    .select(ZONE_SELECT)
    .single();

  if (error) {
    console.error("[createZone] Erreur Supabase =>", {
      message: error.message,
      code:    error.code,
      details: error.details,
      hint:    error.hint,
    });
    return { success: false, error: error.message };
  }
  return { success: true, zone: data };
};

export const updateZone = async (id, updates) => {
  const CHAMPS = ["nom", "description", "departement", "arrondissement", "commune", "quartiers", "centre", "rayon"];
  const payload = {};
  for (const k of CHAMPS) if (k in updates) payload[k] = updates[k];

  const { data, error } = await supabase
    .from("zones_distribution")
    .update(payload)
    .eq("id", id)
    .select(ZONE_SELECT)
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, zone: data };
};

export const deleteZone = async (id) => {
  const { error } = await supabase
    .from("zones_distribution")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
};

// ─── CRUD : distributeurs_eligibles ───────────────────────────────────────────

const DIST_SELECT = `
  id, nom, adresse, contact, id_zone, statut_eligibilite, date_inscription,
  periodicite_distribution, type_distributeur, taux_ristourne,
  periodicite_paiement, notes, created_at, updated_at,
  zone:zones_distribution(id, nom, departement, arrondissement, commune, quartiers)
`;

export const getDistributeurs = async ({ idZone, statut, type } = {}) => {
  let q = supabase
    .from("distributeurs_eligibles")
    .select(DIST_SELECT)
    .order("nom");
  if (idZone !== undefined) q = q.eq("id_zone",            idZone);
  if (statut !== undefined) q = q.eq("statut_eligibilite", statut);
  if (type   !== undefined) q = q.eq("type_distributeur",  type);
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, distributeurs: data ?? [] };
};

export const getDistributeur = async (id) => {
  const { data, error } = await supabase
    .from("distributeurs_eligibles")
    .select(DIST_SELECT)
    .eq("id", id)
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, distributeur: data };
};

export const createDistributeur = async (payload) => {
  const { data, error } = await supabase
    .from("distributeurs_eligibles")
    .insert({
      nom:                      payload.nom,
      adresse:                  payload.adresse   || null,
      contact:                  payload.contact   || null,
      id_zone:                  payload.id_zone   || null,
      statut_eligibilite:       payload.statut_eligibilite       ?? true,
      date_inscription:         payload.date_inscription         ?? new Date().toISOString().slice(0, 10),
      periodicite_distribution: payload.periodicite_distribution ?? [],
      type_distributeur:        payload.type_distributeur        ?? "ambulant",
      taux_ristourne:           Number(payload.taux_ristourne    ?? 0),
      periodicite_paiement:     payload.periodicite_paiement     ?? "journalier",
      notes:                    payload.notes || null,
    })
    .select(DIST_SELECT)
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, distributeur: data };
};

export const updateDistributeur = async (id, updates) => {
  const CHAMPS = [
    "nom", "adresse", "contact", "id_zone", "statut_eligibilite",
    "date_inscription", "periodicite_distribution", "type_distributeur",
    "taux_ristourne", "periodicite_paiement", "notes",
  ];
  const payload = {};
  for (const k of CHAMPS) if (k in updates) payload[k] = updates[k];
  if ("taux_ristourne" in payload) payload.taux_ristourne = Number(payload.taux_ristourne);

  const { data, error } = await supabase
    .from("distributeurs_eligibles")
    .update(payload)
    .eq("id", id)
    .select(DIST_SELECT)
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, distributeur: data };
};

export const deleteDistributeur = async (id) => {
  const { error } = await supabase
    .from("distributeurs_eligibles")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
};

// ─── CRUD : tournees_distribution + lignes_tournee ────────────────────────────

const TOURNEE_SELECT = `
  id, id_distributeur, date_tournee, ristourne_due, montant_paye,
  statut_paiement, feedback, created_by, created_at, updated_at,
  distributeur:distributeurs_eligibles(
    id, nom, taux_ristourne, periodicite_paiement,
    zone:zones_distribution(id, nom, departement, commune)
  ),
  lignes:lignes_tournee(id, type_produit, prix_unitaire_applique, quantite_recue, quantite_recuperee, created_at)
`;

export const getTournees = async ({
  idDistributeur, startDate, endDate, statut, limit = 200,
} = {}) => {
  let q = supabase
    .from("tournees_distribution")
    .select(TOURNEE_SELECT)
    .order("date_tournee", { ascending: false })
    .order("created_at",   { ascending: false })
    .limit(limit);

  if (idDistributeur) q = q.eq("id_distributeur", idDistributeur);
  if (startDate)      q = q.gte("date_tournee",    startDate);
  if (endDate)        q = q.lte("date_tournee",    endDate);
  if (statut)         q = q.eq("statut_paiement",  statut);

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, tournees: data ?? [] };
};

export const getTournee = async (id) => {
  const { data, error } = await supabase
    .from("tournees_distribution")
    .select(TOURNEE_SELECT)
    .eq("id", id)
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, tournee: data };
};

/**
 * Crée une tournée avec ses lignes en séquence.
 * En cas d'échec de l'insertion des lignes, supprime la tournée créée.
 */
export const createTournee = async (tourneePayload, lignesPayload, tauxRistourne = 0) => {
  const { ristourne_due } = calculerTournee(lignesPayload, tauxRistourne);

  const { data: tournee, error: tErr } = await supabase
    .from("tournees_distribution")
    .insert({
      id_distributeur: tourneePayload.id_distributeur,
      date_tournee:    tourneePayload.date_tournee,
      ristourne_due,
      montant_paye:    tourneePayload.montant_paye    ?? 0,
      statut_paiement: tourneePayload.statut_paiement ?? "non_paye",
      feedback:        tourneePayload.feedback        || null,
    })
    .select("id")
    .single();
  if (tErr) return { success: false, error: tErr.message };

  const { error: lErr } = await supabase.from("lignes_tournee").insert(
    lignesPayload.map(l => ({
      id_tournee:             tournee.id,
      type_produit:           l.type_produit,
      prix_unitaire_applique: l.prix_unitaire_applique ?? 0,
      quantite_recue:         Number(l.quantite_recue      ?? 0),
      quantite_recuperee:     Number(l.quantite_recuperee  ?? 0),
    }))
  );
  if (lErr) {
    await supabase.from("tournees_distribution").delete().eq("id", tournee.id);
    return { success: false, error: lErr.message };
  }

  return getTournee(tournee.id);
};

/**
 * Met à jour une tournée : recalcule la ristourne et remplace les lignes.
 */
export const updateTournee = async (id, tourneePayload, lignesPayload, tauxRistourne = 0) => {
  const { ristourne_due } = calculerTournee(lignesPayload, tauxRistourne);
  const statut_paiement   = calculerStatutPaiement(tourneePayload.montant_paye ?? 0, ristourne_due);

  const { error: tErr } = await supabase
    .from("tournees_distribution")
    .update({
      date_tournee: tourneePayload.date_tournee,
      ristourne_due,
      montant_paye:    tourneePayload.montant_paye ?? 0,
      statut_paiement,
      feedback:        tourneePayload.feedback || null,
    })
    .eq("id", id);
  if (tErr) return { success: false, error: tErr.message };

  // Remplacer les lignes (DELETE + INSERT — ON DELETE CASCADE géré par la DB)
  await supabase.from("lignes_tournee").delete().eq("id_tournee", id);
  const { error: lErr } = await supabase.from("lignes_tournee").insert(
    lignesPayload.map(l => ({
      id_tournee:             id,
      type_produit:           l.type_produit,
      prix_unitaire_applique: l.prix_unitaire_applique ?? 0,
      quantite_recue:         Number(l.quantite_recue      ?? 0),
      quantite_recuperee:     Number(l.quantite_recuperee  ?? 0),
    }))
  );
  if (lErr) return { success: false, error: lErr.message };

  return getTournee(id);
};

/**
 * Met à jour le montant payé et le statut d'une tournée (paiement direct).
 */
export const updateStatutTournee = async (id, montantPaye, ristourneDue) => {
  const statut_paiement = calculerStatutPaiement(montantPaye, ristourneDue);
  const { error } = await supabase
    .from("tournees_distribution")
    .update({ montant_paye: montantPaye, statut_paiement })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
};

export const deleteTournee = async (id) => {
  const { error } = await supabase
    .from("tournees_distribution")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
};

// ─── CRUD : paiements_ristourne ───────────────────────────────────────────────

const PAIEMENT_SELECT = `
  id, id_distributeur, date_paiement, montant, mode_paiement, reference, notes, created_at,
  distributeur:distributeurs_eligibles(id, nom, zone:zones_distribution(id, nom))
`;

export const getPaiements = async ({
  idDistributeur, startDate, endDate, limit = 200,
} = {}) => {
  let q = supabase
    .from("paiements_ristourne")
    .select(PAIEMENT_SELECT)
    .order("date_paiement", { ascending: false })
    .order("created_at",    { ascending: false })
    .limit(limit);

  if (idDistributeur) q = q.eq("id_distributeur", idDistributeur);
  if (startDate)      q = q.gte("date_paiement",   startDate);
  if (endDate)        q = q.lte("date_paiement",   endDate);

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, paiements: data ?? [] };
};

export const createPaiement = async (payload) => {
  const { data, error } = await supabase
    .from("paiements_ristourne")
    .insert({
      id_distributeur: payload.id_distributeur,
      date_paiement:   payload.date_paiement ?? new Date().toISOString().slice(0, 10),
      montant:         Number(payload.montant),
      mode_paiement:   payload.mode_paiement ?? "especes",
      reference:       payload.reference     || null,
      notes:           payload.notes         || null,
    })
    .select(PAIEMENT_SELECT)
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, paiement: data };
};

export const deletePaiement = async (id) => {
  const { error } = await supabase.from("paiements_ristourne").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
};

// ─── Formatage ────────────────────────────────────────────────────────────────

export const formatMontant = (v) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "XAF", maximumFractionDigits: 0,
  }).format(v ?? 0);

export const formatDate = (d) =>
  d
    ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "—";

export const formatTaux = (v) =>
  v != null ? `${Math.round(Number(v) * 100)} %` : "—";

export const formatJours = (jours = []) =>
  jours.map(j => JOURS_LABELS[j] ?? j).join(", ") || "—";

export const formatQte = (v) =>
  (Number(v) || 0).toLocaleString("fr-FR");

// ─── Géographie ───────────────────────────────────────────────────────────────

/**
 * Formate les coordonnées d'un centre géographique.
 * ex: "4.0511° N, 9.7679° E"
 */
export const formatCentre = (centre) => {
  if (!centre?.lat || !centre?.lng) return "—";
  const lat = Number(centre.lat).toFixed(4);
  const lng = Number(centre.lng).toFixed(4);
  return `${lat}° N, ${lng}° E`;
};

/**
 * Construit un objet centre depuis des valeurs brutes.
 * Retourne null si lat ou lng sont invalides.
 */
export const buildCentre = (lat, lng) => {
  const la = Number(lat);
  const lo = Number(lng);
  if (!isFinite(la) || !isFinite(lo)) return null;
  return { lat: la, lng: lo };
};

/**
 * Distance haversine entre deux points (lat/lng) en kilomètres.
 */
export const distanceKm = (lat1, lng1, lat2, lng2) => {
  const R  = 6371;
  const dL = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a  =
    Math.sin(dL / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Vérifie si un point {lat, lng} est dans le cercle d'une zone.
 * Retourne false si la zone n'a pas de centre ou de rayon définis.
 */
export const estDansZone = (point, zone) => {
  if (!zone?.centre?.lat || !zone?.centre?.lng || !zone?.rayon) return false;
  return distanceKm(point.lat, point.lng, zone.centre.lat, zone.centre.lng) <= zone.rayon;
};

/**
 * Formate un objet zone en libellé lisible.
 * ex: "Akwa · Douala · Wouri"
 */
export const formatZone = (zone) => {
  if (!zone) return "—";
  const parties = [zone.nom, zone.commune, zone.departement].filter(Boolean);
  return parties.join(" · ");
};
