/**
 * FinanceAnalyzer.js
 * Plugin d'analyse financière.
 *
 * Sources : comptabiliteToolkit
 * Règles :
 *  - Solde global bas (< seuil critique)
 *  - Drift des dépenses vs budget du mois
 *  - Projection des encaissements sur la période
 *  - Aucune opération enregistrée aujourd'hui (H24)
 */

import {
  getAllSoldes,
  getSommeOperations,
  compareBudgetVsRealise,
  TYPES_OPERATION,
} from "@/utils/comptabiliteToolkit";
import { HORIZONS, PRIORITES, CATEGORIES, createInsight } from "../engine/insightTypes.js";

// ─── Seuils configurables ─────────────────────────────────────────────────────

const SEUIL_SOLDE_CRITIQUE = 50_000;  // FCFA — solde global en dessous duquel on alerte
const SEUIL_SOLDE_ATTENTION = 150_000;
const SEUIL_DRIFT_DEPENSES = 0.15;    // 15 % au-dessus du budget → alerte haute
const SEUIL_DRIFT_ELEVE    = 0.30;    // 30 % au-dessus → critique

// ─── Helpers date ─────────────────────────────────────────────────────────────

const aujourd_hui = () => new Date().toISOString().slice(0, 10);
const debutMois   = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const finMois     = () => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
const debutJ7     = () => new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);

// ─── Règles d'analyse ─────────────────────────────────────────────────────────

async function analyserSolde(horizon) {
  const insights = [];
  const { success, soldes, total } = await getAllSoldes();
  if (!success) return insights;

  const soldePlateforme = total ?? 0;

  if (soldePlateforme < SEUIL_SOLDE_CRITIQUE) {
    insights.push(createInsight({
      id:          "finance_solde_critique",
      source:      "FinanceAnalyzer",
      categorie:   CATEGORIES.FINANCE,
      horizon,
      priorite:    PRIORITES.CRITIQUE,
      titre:       "Solde global critique",
      description: `Le solde consolidé de toutes les caisses est de ${soldePlateforme.toLocaleString("fr-FR")} F, en dessous du seuil d'alerte de ${SEUIL_SOLDE_CRITIQUE.toLocaleString("fr-FR")} F. Un encaissement urgent est recommandé.`,
      actions:     [
        { label: "Enregistrer un encaissement", path: "/comptabilite" },
        { label: "Voir la caisse",              path: "/caisse" },
      ],
      meta: { soldePlateforme, soldes },
    }));
  } else if (soldePlateforme < SEUIL_SOLDE_ATTENTION) {
    insights.push(createInsight({
      id:          "finance_solde_attention",
      source:      "FinanceAnalyzer",
      categorie:   CATEGORIES.FINANCE,
      horizon,
      priorite:    PRIORITES.HAUTE,
      titre:       "Solde en baisse",
      description: `Le solde consolidé (${soldePlateforme.toLocaleString("fr-FR")} F) approche du seuil critique. Surveillez les encaissements prévus.`,
      actions:     [{ label: "Voir la caisse", path: "/caisse" }],
      meta: { soldePlateforme },
    }));
  }

  return insights;
}

async function analyserDriftDepenses(horizon) {
  const insights = [];
  const mois  = new Date().getMonth() + 1;
  const annee = new Date().getFullYear();

  const { success, comparison } = await compareBudgetVsRealise(mois, annee);
  if (!success || !comparison) return insights;

  const { budget_depenses, realise_depenses } = comparison;
  if (!budget_depenses || budget_depenses === 0) return insights;

  const drift = (realise_depenses - budget_depenses) / budget_depenses;

  if (drift >= SEUIL_DRIFT_ELEVE) {
    insights.push(createInsight({
      id:          "finance_drift_depenses_critique",
      source:      "FinanceAnalyzer",
      categorie:   CATEGORIES.FINANCE,
      horizon,
      priorite:    PRIORITES.CRITIQUE,
      titre:       "Dépenses très au-dessus du budget",
      description: `Les dépenses du mois (${realise_depenses.toLocaleString("fr-FR")} F) dépassent le budget de ${Math.round(drift * 100)} % (budget : ${budget_depenses.toLocaleString("fr-FR")} F). Un arbitrage immédiat est nécessaire.`,
      actions:     [
        { label: "Voir le budget",   path: "/budget" },
        { label: "Voir les dépenses", path: "/depense" },
      ],
      meta: { drift, budget_depenses, realise_depenses },
    }));
  } else if (drift >= SEUIL_DRIFT_DEPENSES) {
    insights.push(createInsight({
      id:          "finance_drift_depenses_haute",
      source:      "FinanceAnalyzer",
      categorie:   CATEGORIES.FINANCE,
      horizon,
      priorite:    PRIORITES.HAUTE,
      titre:       "Dépenses au-dessus du budget",
      description: `Les dépenses du mois dépassent le budget de ${Math.round(drift * 100)} %. Pensez à réviser les prévisions ou à limiter les nouvelles dépenses.`,
      actions:     [{ label: "Voir le budget", path: "/budget" }],
      meta: { drift, budget_depenses, realise_depenses },
    }));
  }

  return insights;
}

async function analyserActiviteJour(horizon) {
  if (horizon !== HORIZONS.H24) return [];
  const insights = [];

  const today = aujourd_hui();
  const [encResult, depResult] = await Promise.all([
    getSommeOperations({ operation: TYPES_OPERATION.ENCAISSEMENT, startDate: today, endDate: today }),
    getSommeOperations({ operation: TYPES_OPERATION.DEPENSE,      startDate: today, endDate: today }),
  ]);

  const aucunEnc = encResult.success && (encResult.somme ?? 0) === 0;
  const aucunDep = depResult.success && (depResult.somme ?? 0) === 0;

  if (aucunEnc && aucunDep) {
    insights.push(createInsight({
      id:          "finance_aucune_operation_jour",
      source:      "FinanceAnalyzer",
      categorie:   CATEGORIES.FINANCE,
      horizon,
      priorite:    PRIORITES.MOYENNE,
      titre:       "Aucune opération comptable aujourd'hui",
      description: "Aucun encaissement ni dépense n'a été enregistré pour aujourd'hui. Pensez à saisir les mouvements de caisse.",
      actions:     [{ label: "Saisir une opération", path: "/comptabilite" }],
      meta: {},
    }));
  } else if (aucunEnc) {
    insights.push(createInsight({
      id:          "finance_aucun_encaissement_jour",
      source:      "FinanceAnalyzer",
      categorie:   CATEGORIES.FINANCE,
      horizon,
      priorite:    PRIORITES.MOYENNE,
      titre:       "Aucun encaissement enregistré aujourd'hui",
      description: "Les dépenses ont été saisies mais aucun encaissement n'a été enregistré. Vérifiez les recettes de la journée.",
      actions:     [{ label: "Saisir un encaissement", path: "/comptabilite" }],
      meta: {},
    }));
  }

  return insights;
}

async function analyserProjectionEncaissements(horizon) {
  if (horizon !== HORIZONS.MOIS) return [];
  const insights = [];

  const debut  = debutMois();
  const fin    = finMois();
  const today  = aujourd_hui();

  const [encMois, depMois] = await Promise.all([
    getSommeOperations({ operation: TYPES_OPERATION.ENCAISSEMENT, startDate: debut, endDate: today }),
    getSommeOperations({ operation: TYPES_OPERATION.DEPENSE,      startDate: debut, endDate: today }),
  ]);

  if (!encMois.success || !depMois.success) return insights;

  const joursEcoules = new Date(today).getDate();
  const joursDuMois  = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const joursRestants = joursDuMois - joursEcoules;

  if (joursEcoules < 3) return insights; // Pas assez de données

  const rythmeJournalier = (encMois.somme ?? 0) / joursEcoules;
  const projectionFin    = rythmeJournalier * joursDuMois;
  const marge            = projectionFin - (depMois.somme ?? 0) * (joursDuMois / joursEcoules);

  if (marge < 0) {
    insights.push(createInsight({
      id:          "finance_projection_deficitaire",
      source:      "FinanceAnalyzer",
      categorie:   CATEGORIES.FINANCE,
      horizon,
      priorite:    PRIORITES.HAUTE,
      titre:       "Projection mensuelle déficitaire",
      description: `Au rythme actuel, le mois se terminerait avec un solde négatif de ${Math.abs(Math.round(marge)).toLocaleString("fr-FR")} F. Il reste ${joursRestants} jours pour corriger la trajectoire.`,
      actions:     [
        { label: "Voir les prévisions", path: "/prevision" },
        { label: "Voir le budget",      path: "/budget" },
      ],
      meta: { rythmeJournalier, projectionFin, marge, joursRestants },
    }));
  }

  return insights;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

const FinanceAnalyzer = {
  name: "FinanceAnalyzer",
  horizons: [HORIZONS.H24, HORIZONS.J7, HORIZONS.MOIS],

  /**
   * @param {string} horizon — HORIZONS.*
   * @returns {Promise<Insight[]>}
   */
  async run(horizon) {
    const [solde, drift, activite, projection] = await Promise.allSettled([
      analyserSolde(horizon),
      analyserDriftDepenses(horizon),
      analyserActiviteJour(horizon),
      analyserProjectionEncaissements(horizon),
    ]);

    return [
      ...(solde.status      === "fulfilled" ? solde.value      : []),
      ...(drift.status      === "fulfilled" ? drift.value      : []),
      ...(activite.status   === "fulfilled" ? activite.value   : []),
      ...(projection.status === "fulfilled" ? projection.value : []),
    ];
  },
};

export default FinanceAnalyzer;
