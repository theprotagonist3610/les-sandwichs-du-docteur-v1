/**
 * RapportAnalyzer.js
 * Plugin d'analyse des rapports journaliers.
 *
 * Sources : rapportToolkit
 * Règles :
 *  - Rapport du jour manquant (H24)
 *  - Jours consécutifs sous objectif (J7)
 *  - Tendance ventes mensuelle dégradée (MOIS)
 *  - Ratio dépenses/encaissements dégradé (MOIS)
 */

import {
  getRapportByDate,
  getRapportsByPeriode,
  getStatistiquesPeriode,
} from "@/utils/rapportToolkit";
import { HORIZONS, PRIORITES, CATEGORIES, createInsight } from "../engine/insightTypes.js";

// ─── Seuils ───────────────────────────────────────────────────────────────────

const SEUIL_JOURS_SOUS_OBJECTIF = 3;   // 3 jours consécutifs → alerte haute
const SEUIL_RATIO_DEPENSES      = 0.75; // dépenses > 75 % des encaissements → alerte

// ─── Helpers date ─────────────────────────────────────────────────────────────

const today     = () => new Date().toISOString().slice(0, 10);
const hier      = () => new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
const ilYa7j    = () => new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
const debutMois = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

// ─── Règles ───────────────────────────────────────────────────────────────────

async function analyserRapportDuJour(horizon) {
  if (horizon !== HORIZONS.H24) return [];
  const insights = [];

  const { success, rapport } = await getRapportByDate(hier());
  if (!success) return insights;

  if (!rapport) {
    insights.push(createInsight({
      id:          "rapport_hier_manquant",
      source:      "RapportAnalyzer",
      categorie:   CATEGORIES.RAPPORTS,
      horizon,
      priorite:    PRIORITES.HAUTE,
      titre:       "Rapport d'hier non généré",
      description: "Le rapport journalier d'hier n'a pas été créé. Clôturez la journée pour générer le rapport automatiquement.",
      actions:     [
        { label: "Clôturer via Back-Day", path: "/back-day" },
        { label: "Voir les rapports",     path: "/rapports" },
      ],
      meta: { date: hier() },
    }));
  }

  return insights;
}

async function analyserJoursSousObjectif(horizon) {
  if (horizon !== HORIZONS.J7) return [];
  const insights = [];

  const { success, rapports } = await getRapportsByPeriode(ilYa7j(), today());
  if (!success || !rapports || rapports.length === 0) return insights;

  // Compter les jours consécutifs les plus récents sous objectif ventes
  let consecutifs = 0;
  const tries = [...rapports].sort((a, b) => b.created_at.localeCompare(a.created_at));

  for (const r of tries) {
    const ecartVentes = r.objectifs?.ventes ?? 0;
    if (ecartVentes < 0) {
      consecutifs++;
    } else {
      break;
    }
  }

  if (consecutifs >= SEUIL_JOURS_SOUS_OBJECTIF) {
    insights.push(createInsight({
      id:          "rapport_jours_consecutifs_sous_objectif",
      source:      "RapportAnalyzer",
      categorie:   CATEGORIES.RAPPORTS,
      horizon,
      priorite:    PRIORITES.HAUTE,
      titre:       `${consecutifs} jours consécutifs sous objectif de ventes`,
      description: `Les ${consecutifs} derniers jours n'ont pas atteint l'objectif de ventes. Identifiez les freins et ajustez votre stratégie commerciale.`,
      actions:     [
        { label: "Voir les rapports",    path: "/rapports" },
        { label: "Voir les statistiques", path: "/statistiques" },
      ],
      meta: { consecutifs },
    }));
  }

  // Rapport global de la semaine
  const stats = await getStatistiquesPeriode(ilYa7j(), today());
  if (stats.success && stats.statistiques) {
    const s = stats.statistiques;
    insights.push(createInsight({
      id:          "rapport_synthese_hebdo",
      source:      "RapportAnalyzer",
      categorie:   CATEGORIES.RAPPORTS,
      horizon,
      priorite:    PRIORITES.INFO,
      titre:       "Synthèse de la semaine",
      description: `Sur 7 jours — Ventes moy. : ${Math.round(s.moyenne_ventes ?? 0).toLocaleString("fr-FR")} F | Encaissements moy. : ${Math.round(s.moyenne_encaissement ?? 0).toLocaleString("fr-FR")} F | Dépenses moy. : ${Math.round(s.moyenne_depense ?? 0).toLocaleString("fr-FR")} F.`,
      actions:     [{ label: "Voir les rapports", path: "/rapports" }],
      meta: { statistiques: s },
    }));
  }

  return insights;
}

async function analyserTendanceMensuelle(horizon) {
  if (horizon !== HORIZONS.MOIS) return [];
  const insights = [];

  const { success, statistiques } = await getStatistiquesPeriode(debutMois(), today());
  if (!success || !statistiques) return insights;

  const { total_ventes, total_encaissement, total_depense, nb_rapports } = statistiques;

  if (!nb_rapports || nb_rapports < 5) return insights; // Pas assez de données

  // Ratio dépenses / encaissements
  if (total_encaissement > 0) {
    const ratio = total_depense / total_encaissement;

    if (ratio >= SEUIL_RATIO_DEPENSES) {
      insights.push(createInsight({
        id:          "rapport_ratio_depenses_eleve",
        source:      "RapportAnalyzer",
        categorie:   CATEGORIES.RAPPORTS,
        horizon,
        priorite:    ratio >= 0.90 ? PRIORITES.CRITIQUE : PRIORITES.HAUTE,
        titre:       "Ratio dépenses/encaissements trop élevé",
        description: `Ce mois, les dépenses (${total_depense.toLocaleString("fr-FR")} F) représentent ${Math.round(ratio * 100)} % des encaissements (${total_encaissement.toLocaleString("fr-FR")} F). La marge opérationnelle est sous pression.`,
        actions:     [
          { label: "Voir le budget",    path: "/budget" },
          { label: "Voir les dépenses", path: "/depense" },
        ],
        meta: { ratio, total_depense, total_encaissement },
      }));
    }
  }

  // Ventes vs encaissements — cohérence
  if (total_ventes > 0 && total_encaissement > 0) {
    const ecartVentesEnc = Math.abs(total_ventes - total_encaissement) / total_ventes;
    if (ecartVentesEnc > 0.20) {
      insights.push(createInsight({
        id:          "rapport_ecart_ventes_encaissements",
        source:      "RapportAnalyzer",
        categorie:   CATEGORIES.RAPPORTS,
        horizon,
        priorite:    PRIORITES.MOYENNE,
        titre:       "Écart notable entre ventes et encaissements",
        description: `Les ventes (${total_ventes.toLocaleString("fr-FR")} F) et les encaissements (${total_encaissement.toLocaleString("fr-FR")} F) présentent un écart de ${Math.round(ecartVentesEnc * 100)} % ce mois. Vérifiez les paiements non enregistrés.`,
        actions:     [{ label: "Voir la caisse", path: "/caisse" }],
        meta: { total_ventes, total_encaissement, ecart: ecartVentesEnc },
      }));
    }
  }

  return insights;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

const RapportAnalyzer = {
  name: "RapportAnalyzer",
  horizons: [HORIZONS.H24, HORIZONS.J7, HORIZONS.MOIS],

  async run(horizon) {
    const [jour, hebdo, mensuel] = await Promise.allSettled([
      analyserRapportDuJour(horizon),
      analyserJoursSousObjectif(horizon),
      analyserTendanceMensuelle(horizon),
    ]);

    return [
      ...(jour.status    === "fulfilled" ? jour.value    : []),
      ...(hebdo.status   === "fulfilled" ? hebdo.value   : []),
      ...(mensuel.status === "fulfilled" ? mensuel.value : []),
    ];
  },
};

export default RapportAnalyzer;
