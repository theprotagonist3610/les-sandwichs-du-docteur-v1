/**
 * CommandeAnalyzer.js
 * Plugin d'analyse des commandes.
 *
 * Sources : commandeToolkit
 * Règles :
 *  - Prévision volume J+1 basée sur la moyenne glissante des 7 derniers jours
 *  - Taux d'annulation élevé aujourd'hui
 *  - Taux de livraison en baisse sur 7 jours
 *  - Aucune commande enregistrée aujourd'hui (H24)
 *  - Tendance CA hebdo vs semaine précédente (J7)
 *  - Panier moyen en baisse mensuelle (MOIS)
 */

import { getAllCommandes, getCommandesStats, getLocalDateString } from "@/utils/commandeToolkit";
import { STATUTS_COMMANDE, TYPES_COMMANDE } from "@/utils/commandeToolkit";
import { HORIZONS, PRIORITES, CATEGORIES, createInsight } from "../engine/insightTypes.js";

// ─── Seuils ───────────────────────────────────────────────────────────────────

const SEUIL_TAUX_ANNULATION  = 0.10;  // 10 % d'annulations → alerte
const SEUIL_BAISSE_CA_HEBDO  = 0.15;  // -15 % CA semaine vs précédente → alerte
const SEUIL_BAISSE_PANIER    = 0.10;  // -10 % panier moyen mensuel → info

// ─── Helpers date ─────────────────────────────────────────────────────────────

const today    = () => new Date();
const dateStr  = (d) => getLocalDateString(d);
const addDays  = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const rangeDates = (n) => {
  const end   = today();
  const start = addDays(end, -n);
  return { startDate: dateStr(start), endDate: dateStr(end) };
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchCommandesPeriode(startDate, endDate) {
  const { data, error } = await getAllCommandes({ startDate, endDate });
  return error ? [] : (data ?? []);
}

// ─── Règles ───────────────────────────────────────────────────────────────────

async function analyserVolumeJour(horizon) {
  if (horizon !== HORIZONS.H24) return [];
  const insights = [];

  const todayStr = dateStr(today());
  const commandes = await fetchCommandesPeriode(todayStr, todayStr);

  if (commandes.length === 0) {
    insights.push(createInsight({
      id:          "commandes_aucune_aujourd_hui",
      source:      "CommandeAnalyzer",
      categorie:   CATEGORIES.COMMANDES,
      horizon,
      priorite:    PRIORITES.HAUTE,
      titre:       "Aucune commande enregistrée aujourd'hui",
      description: "Aucune commande n'a été saisie pour la journée en cours. Vérifiez le panneau de vente ou effectuez une saisie rétroactive.",
      actions:     [
        { label: "Panneau de vente", path: "/panneau-de-vente" },
        { label: "Saisie Back-Day",  path: "/back-day" },
      ],
      meta: {},
    }));
  }

  // Taux d'annulation
  const annulees = commandes.filter((c) => c.statut_commande === STATUTS_COMMANDE.ANNULEE);
  if (commandes.length > 0) {
    const taux = annulees.length / commandes.length;
    if (taux >= SEUIL_TAUX_ANNULATION) {
      insights.push(createInsight({
        id:          "commandes_taux_annulation_eleve",
        source:      "CommandeAnalyzer",
        categorie:   CATEGORIES.COMMANDES,
        horizon,
        priorite:    PRIORITES.HAUTE,
        titre:       "Taux d'annulation élevé aujourd'hui",
        description: `${annulees.length} commande(s) annulée(s) sur ${commandes.length} (${Math.round(taux * 100)} %). Identifiez les causes pour réduire ce taux.`,
        actions:     [{ label: "Voir les commandes", path: "/gestion-des-commandes" }],
        meta: { taux, total: commandes.length, annulees: annulees.length },
      }));
    }
  }

  return insights;
}

async function analyserPrevisionJ1(horizon) {
  if (horizon !== HORIZONS.H24) return [];
  const insights = [];

  const { startDate, endDate } = rangeDates(7);
  const commandes7j = await fetchCommandesPeriode(startDate, endDate);

  if (commandes7j.length === 0) return insights;

  const stats = getCommandesStats(commandes7j);
  const moyenneJournaliere = stats.total / 7;

  insights.push(createInsight({
    id:          "commandes_prevision_j1",
    source:      "CommandeAnalyzer",
    categorie:   CATEGORIES.COMMANDES,
    horizon,
    priorite:    PRIORITES.INFO,
    titre:       "Prévision de commandes pour demain",
    description: `Sur les 7 derniers jours, la moyenne est de ${Math.round(moyenneJournaliere)} commandes/jour pour un CA moyen de ${Math.round(stats.chiffreAffaires / 7).toLocaleString("fr-FR")} F. Préparez vos ressources en conséquence.`,
    actions:     [{ label: "Voir les statistiques", path: "/statistiques" }],
    meta: { moyenneJournaliere, stats },
  }));

  return insights;
}

async function analyserTendanceHebdo(horizon) {
  if (horizon !== HORIZONS.J7) return [];
  const insights = [];

  const s1End   = dateStr(addDays(today(), -1));
  const s1Start = dateStr(addDays(today(), -7));
  const s2End   = dateStr(addDays(today(), -8));
  const s2Start = dateStr(addDays(today(), -14));

  const [sem1, sem2] = await Promise.all([
    fetchCommandesPeriode(s1Start, s1End),
    fetchCommandesPeriode(s2Start, s2End),
  ]);

  if (sem1.length === 0 || sem2.length === 0) return insights;

  const ca1 = getCommandesStats(sem1).chiffreAffaires;
  const ca2 = getCommandesStats(sem2).chiffreAffaires;

  if (ca2 === 0) return insights;

  const variation = (ca1 - ca2) / ca2;

  if (variation <= -SEUIL_BAISSE_CA_HEBDO) {
    insights.push(createInsight({
      id:          "commandes_baisse_ca_hebdo",
      source:      "CommandeAnalyzer",
      categorie:   CATEGORIES.COMMANDES,
      horizon,
      priorite:    PRIORITES.HAUTE,
      titre:       "CA en baisse cette semaine",
      description: `Le chiffre d'affaires de cette semaine (${ca1.toLocaleString("fr-FR")} F) est en recul de ${Math.round(Math.abs(variation) * 100)} % par rapport à la semaine précédente (${ca2.toLocaleString("fr-FR")} F).`,
      actions:     [{ label: "Voir les statistiques", path: "/statistiques" }],
      meta: { ca1, ca2, variation },
    }));
  } else if (variation > 0.1) {
    insights.push(createInsight({
      id:          "commandes_hausse_ca_hebdo",
      source:      "CommandeAnalyzer",
      categorie:   CATEGORIES.COMMANDES,
      horizon,
      priorite:    PRIORITES.INFO,
      titre:       "CA en hausse cette semaine",
      description: `Le CA de cette semaine (${ca1.toLocaleString("fr-FR")} F) progresse de ${Math.round(variation * 100)} % vs la semaine précédente. Bonne dynamique à maintenir.`,
      actions:     [],
      meta: { ca1, ca2, variation },
    }));
  }

  // Taux de livraison
  const livraisons1 = sem1.filter((c) => c.type === TYPES_COMMANDE.LIVRAISON).length;
  const taux1 = sem1.length > 0 ? livraisons1 / sem1.length : 0;
  const livraisons2 = sem2.filter((c) => c.type === TYPES_COMMANDE.LIVRAISON).length;
  const taux2 = sem2.length > 0 ? livraisons2 / sem2.length : 0;

  if (taux2 > 0 && (taux2 - taux1) / taux2 > 0.15) {
    insights.push(createInsight({
      id:          "commandes_taux_livraison_baisse",
      source:      "CommandeAnalyzer",
      categorie:   CATEGORIES.COMMANDES,
      horizon,
      priorite:    PRIORITES.MOYENNE,
      titre:       "Taux de livraison en baisse",
      description: `Le taux de livraison est passé de ${Math.round(taux2 * 100)} % à ${Math.round(taux1 * 100)} % cette semaine. Vérifiez la disponibilité des livreurs.`,
      actions:     [{ label: "Gérer les livreurs", path: "/livreurs" }],
      meta: { taux1, taux2 },
    }));
  }

  return insights;
}

async function analyserPanierMensuel(horizon) {
  if (horizon !== HORIZONS.MOIS) return [];
  const insights = [];

  const moisActStart  = dateStr(new Date(today().getFullYear(), today().getMonth(), 1));
  const moisActEnd    = dateStr(today());
  const moisPrecStart = dateStr(new Date(today().getFullYear(), today().getMonth() - 1, 1));
  const moisPrecEnd   = dateStr(new Date(today().getFullYear(), today().getMonth(), 0));

  const [moisAct, moisPrec] = await Promise.all([
    fetchCommandesPeriode(moisActStart, moisActEnd),
    fetchCommandesPeriode(moisPrecStart, moisPrecEnd),
  ]);

  if (moisAct.length === 0 || moisPrec.length === 0) return insights;

  const statsAct  = getCommandesStats(moisAct);
  const statsPrec = getCommandesStats(moisPrec);

  if (statsPrec.panierMoyen === 0) return insights;

  const variation = (statsAct.panierMoyen - statsPrec.panierMoyen) / statsPrec.panierMoyen;

  if (variation <= -SEUIL_BAISSE_PANIER) {
    insights.push(createInsight({
      id:          "commandes_panier_moyen_baisse",
      source:      "CommandeAnalyzer",
      categorie:   CATEGORIES.COMMANDES,
      horizon,
      priorite:    PRIORITES.MOYENNE,
      titre:       "Panier moyen en baisse ce mois-ci",
      description: `Le panier moyen ce mois (${Math.round(statsAct.panierMoyen).toLocaleString("fr-FR")} F) est inférieur de ${Math.round(Math.abs(variation) * 100)} % au mois précédent (${Math.round(statsPrec.panierMoyen).toLocaleString("fr-FR")} F). Envisagez des actions promotionnelles.`,
      actions:     [{ label: "Gérer les promotions", path: "/promotions" }],
      meta: { panierAct: statsAct.panierMoyen, panierPrec: statsPrec.panierMoyen, variation },
    }));
  }

  return insights;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

const CommandeAnalyzer = {
  name: "CommandeAnalyzer",
  horizons: [HORIZONS.H24, HORIZONS.J7, HORIZONS.MOIS],

  async run(horizon) {
    const [volume, prevision, tendance, panier] = await Promise.allSettled([
      analyserVolumeJour(horizon),
      analyserPrevisionJ1(horizon),
      analyserTendanceHebdo(horizon),
      analyserPanierMensuel(horizon),
    ]);

    return [
      ...(volume.status    === "fulfilled" ? volume.value    : []),
      ...(prevision.status === "fulfilled" ? prevision.value : []),
      ...(tendance.status  === "fulfilled" ? tendance.value  : []),
      ...(panier.status    === "fulfilled" ? panier.value    : []),
    ];
  },
};

export default CommandeAnalyzer;
