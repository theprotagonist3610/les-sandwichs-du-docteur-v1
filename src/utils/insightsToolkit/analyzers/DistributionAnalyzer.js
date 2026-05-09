/**
 * DistributionAnalyzer.js
 * Plugin d'analyse distribution pour le moteur d'insights.
 *
 * Règles :
 *  - Distributeurs actifs sans tournée aujourd'hui (H24)
 *  - Taux de recouvrement < 80 % sur 7 jours + solde global impayé (J7)
 *  - Distributeurs avec solde en attente > seuil + zones sans activité ce mois (MOIS)
 */

import { supabase }                                          from "@/config/supabase";
import { HORIZONS, PRIORITES, CATEGORIES, createInsight }   from "../engine/insightTypes.js";

const SEUIL_RECOUVREMENT   = 0.80;    // en dessous → alerte recouvrement
const SEUIL_SOLDE_ALERTE   = 5_000;   // FCFA — solde individuel déclenche MOYENNE
const SEUIL_SOLDE_CRITIQUE = 20_000;  // FCFA — solde individuel déclenche HAUTE

const today     = () => new Date().toISOString().slice(0, 10);
const ilYa7j    = () => new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
const debutMois = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10);
};

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

// ─── H24 : distributeurs actifs sans tournée aujourd'hui ─────────────────────

async function analyserSansTournee(horizon) {
  if (horizon !== HORIZONS.H24) return [];

  const [{ data: actifs }, { data: tournees }] = await Promise.all([
    supabase.from("distributeurs_eligibles").select("id, nom").eq("statut", true),
    supabase.from("tournees_distribution").select("id_distributeur").eq("date_tournee", today()),
  ]);

  if (!actifs || actifs.length === 0) return [];

  const avecTournee = new Set((tournees ?? []).map((t) => t.id_distributeur));
  const sans        = actifs.filter((d) => !avecTournee.has(d.id));

  if (sans.length === 0) return [];

  const noms   = sans.slice(0, 3).map((d) => d.nom).join(", ");
  const suffix = sans.length > 3 ? ` et ${sans.length - 3} autre(s)` : "";

  return [createInsight({
    id:          "distribution_sans_tournee_aujourd_hui",
    source:      "DistributionAnalyzer",
    categorie:   CATEGORIES.DISTRIBUTION,
    horizon,
    priorite:    sans.length >= actifs.length / 2 ? PRIORITES.HAUTE : PRIORITES.MOYENNE,
    titre:       `${sans.length} distributeur(s) sans tournée aujourd'hui`,
    description: `${noms}${suffix} n'ont pas encore de tournée enregistrée ce jour. Vérifiez qu'ils ont bien effectué leur passage.`,
    actions:     [{ label: "Voir les tournées", path: "/distribution" }],
    meta:        { total: sans.length, ids: sans.map((d) => d.id) },
  })];
}

// ─── J7 : taux de recouvrement faible ────────────────────────────────────────

async function analyserRecouvrement(horizon) {
  if (horizon !== HORIZONS.J7) return [];

  const { data: tournees } = await supabase
    .from("tournees_distribution")
    .select("lignes:lignes_tournee(quantite_recue, quantite_recuperee)")
    .gte("date_tournee", ilYa7j())
    .lte("date_tournee", today());

  if (!tournees || tournees.length === 0) return [];

  let totalRecue = 0, totalRecuperee = 0;
  for (const t of tournees) {
    for (const l of (t.lignes ?? [])) {
      totalRecue      += Number(l.quantite_recue      ?? 0);
      totalRecuperee  += Number(l.quantite_recuperee  ?? 0);
    }
  }

  if (totalRecue === 0) return [];
  const taux = totalRecuperee / totalRecue;
  if (taux >= SEUIL_RECOUVREMENT) return [];

  return [createInsight({
    id:          "distribution_recouvrement_faible_7j",
    source:      "DistributionAnalyzer",
    categorie:   CATEGORIES.DISTRIBUTION,
    horizon,
    priorite:    taux < 0.65 ? PRIORITES.HAUTE : PRIORITES.MOYENNE,
    titre:       `Taux de recouvrement faible — ${(taux * 100).toFixed(1)} %`,
    description: `Sur les 7 derniers jours, ${totalRecuperee} unités récupérées sur ${totalRecue} distribuées (${(taux * 100).toFixed(1)} %). Le seuil attendu est ${(SEUIL_RECOUVREMENT * 100).toFixed(0)} %.`,
    actions:     [{ label: "Voir les tournées", path: "/distribution" }],
    meta:        { taux, totalRecue, totalRecuperee },
  })];
}

// ─── J7 : solde global impayé ─────────────────────────────────────────────────

async function analyserSoldeGlobal(horizon) {
  if (horizon !== HORIZONS.J7) return [];

  const { data } = await supabase
    .from("paiements_ristourne")
    .select("type_mouvement, montant");

  if (!data || data.length === 0) return [];

  let totalDu = 0, totalVerse = 0;
  for (const p of data) {
    if (p.type_mouvement === "debit")  totalDu    += Number(p.montant ?? 0);
    if (p.type_mouvement === "credit") totalVerse += Number(p.montant ?? 0);
  }

  const solde = totalDu - totalVerse;
  if (solde <= SEUIL_SOLDE_ALERTE * 3) return [];

  return [createInsight({
    id:          "distribution_solde_global_impaye",
    source:      "DistributionAnalyzer",
    categorie:   CATEGORIES.DISTRIBUTION,
    horizon,
    priorite:    solde > SEUIL_SOLDE_CRITIQUE * 5 ? PRIORITES.HAUTE : PRIORITES.MOYENNE,
    titre:       `Ristournes impayées : ${fmt(solde)}`,
    description: `Le solde global des ristournes non versées est de ${fmt(solde)} (dû : ${fmt(totalDu)}, versé : ${fmt(totalVerse)}). Réglez les distributeurs pour maintenir leur engagement.`,
    actions:     [{ label: "Gérer les paiements", path: "/distribution" }],
    meta:        { solde, totalDu, totalVerse },
  })];
}

// ─── MOIS : distributeurs avec solde en attente important ────────────────────

async function analyserSoldesIndividuels(horizon) {
  if (horizon !== HORIZONS.MOIS) return [];

  const { data } = await supabase
    .from("paiements_ristourne")
    .select("id_distributeur, type_mouvement, montant, distributeur:distributeurs_eligibles(nom)");

  if (!data || data.length === 0) return [];

  const parDist = {};
  for (const p of data) {
    const id = p.id_distributeur;
    if (!parDist[id]) parDist[id] = { nom: p.distributeur?.nom ?? id, du: 0, verse: 0 };
    if (p.type_mouvement === "debit")  parDist[id].du    += Number(p.montant ?? 0);
    if (p.type_mouvement === "credit") parDist[id].verse += Number(p.montant ?? 0);
  }

  const insights = [];
  for (const [id, val] of Object.entries(parDist)) {
    const solde = val.du - val.verse;
    if (solde <= SEUIL_SOLDE_ALERTE) continue;

    insights.push(createInsight({
      id:          `distribution_solde_distributeur_${id}`,
      source:      "DistributionAnalyzer",
      categorie:   CATEGORIES.DISTRIBUTION,
      horizon,
      priorite:    solde >= SEUIL_SOLDE_CRITIQUE ? PRIORITES.HAUTE : PRIORITES.MOYENNE,
      titre:       `Solde impayé — ${val.nom}`,
      description: `${val.nom} a ${fmt(solde)} de ristourne en attente (dû : ${fmt(val.du)}, versé : ${fmt(val.verse)}).`,
      actions:     [{ label: "Régler la ristourne", path: "/distribution" }],
      meta:        { distributeurId: id, solde, du: val.du, verse: val.verse },
    }));
  }

  return insights;
}

// ─── MOIS : zones sans activité ce mois ──────────────────────────────────────

async function analyserZonesSansActivite(horizon) {
  if (horizon !== HORIZONS.MOIS) return [];

  const [{ data: zones }, { data: tournees }] = await Promise.all([
    supabase.from("zones_distribution").select("id, nom"),
    supabase
      .from("tournees_distribution")
      .select("distributeur:distributeurs_eligibles!inner(id_zone)")
      .gte("date_tournee", debutMois())
      .lte("date_tournee", today()),
  ]);

  if (!zones || zones.length === 0) return [];

  const zonesActives     = new Set((tournees ?? []).map((t) => t.distributeur?.id_zone).filter(Boolean));
  const zonesSilencieuses = zones.filter((z) => !zonesActives.has(z.id));

  if (zonesSilencieuses.length === 0) return [];

  const noms = zonesSilencieuses.map((z) => z.nom).join(", ");

  return [createInsight({
    id:          "distribution_zones_sans_activite_mois",
    source:      "DistributionAnalyzer",
    categorie:   CATEGORIES.DISTRIBUTION,
    horizon,
    priorite:    PRIORITES.MOYENNE,
    titre:       `${zonesSilencieuses.length} zone(s) sans activité ce mois`,
    description: `Aucune livraison enregistrée depuis le début du mois pour : ${noms}. Vérifiez si des distributeurs y sont actifs.`,
    actions:     [{ label: "Voir les distributeurs", path: "/distribution" }],
    meta:        { zones: zonesSilencieuses.map((z) => ({ id: z.id, nom: z.nom })) },
  })];
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

const DistributionAnalyzer = {
  name:     "DistributionAnalyzer",
  horizons: [HORIZONS.H24, HORIZONS.J7, HORIZONS.MOIS],

  async run(horizon) {
    const [sansTournee, recouvrement, soldeGlobal, soldesIndividuels, zonesSansActivite] =
      await Promise.allSettled([
        analyserSansTournee(horizon),
        analyserRecouvrement(horizon),
        analyserSoldeGlobal(horizon),
        analyserSoldesIndividuels(horizon),
        analyserZonesSansActivite(horizon),
      ]);

    return [
      ...(sansTournee.status       === "fulfilled" ? sansTournee.value       : []),
      ...(recouvrement.status      === "fulfilled" ? recouvrement.value      : []),
      ...(soldeGlobal.status       === "fulfilled" ? soldeGlobal.value       : []),
      ...(soldesIndividuels.status === "fulfilled" ? soldesIndividuels.value : []),
      ...(zonesSansActivite.status === "fulfilled" ? zonesSansActivite.value : []),
    ];
  },
};

export default DistributionAnalyzer;
