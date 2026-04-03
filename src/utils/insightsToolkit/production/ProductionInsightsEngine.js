/**
 * ProductionInsightsEngine.js
 * Moteur de calcul pour les insights production.
 *
 * Réutilise linearRegression, classifyTrend, buildForecast depuis FinanceInsightsEngine.
 *
 * Entrée  : periodes[] { label, count, coutTotal, isCurrent }
 * Sortie  : { periodes, volume, cout, alertes, chartData }
 */

import {
  linearRegression,
  classifyTrend,
  buildForecast,
  TENDANCES,
  TENDANCE_LABELS,
} from "../finance/FinanceInsightsEngine.js";
import { HORIZONS } from "../engine/insightTypes.js";

export { TENDANCES, TENDANCE_LABELS };

// ─── Analyse d'une série ──────────────────────────────────────────────────────

const analyzeSerie = (values, horizon) => {
  const n = values.length;
  if (n === 0) {
    return { moyenne: 0, total: 0, variation: 0, tendance: TENDANCES.CONSTANTE, r2: 0, predicted: [], forecast: [] };
  }

  const total   = values.reduce((s, v) => s + v, 0);
  const moyenne = total / n;

  const { a, predicted, r2 } = linearRegression(values);
  const tendance = classifyTrend(a, moyenne);
  const forecast = buildForecast(values, horizon);

  const premier  = values[0] ?? 0;
  const dernier  = values[n - 1] ?? 0;
  const variation = premier === 0 ? 0 : (dernier - premier) / premier;

  return { moyenne, total, variation, tendance, r2, predicted, forecast };
};

// ─── Données graphique ────────────────────────────────────────────────────────

const buildChartData = (periodes, volAnalysis, coutAnalysis, horizon) => {
  const historique = periodes.map((p, i) => ({
    label:      p.label,
    count:      p.count,
    coutTotal:  p.coutTotal,
    countPred:  Math.max(0, volAnalysis.predicted[i] ?? 0),
    coutPred:   Math.max(0, coutAnalysis.predicted[i] ?? 0),
    isForecast: false,
    isCurrent:  p.isCurrent ?? false,
  }));

  const forecastVol  = volAnalysis.forecast;
  const forecastCout = coutAnalysis.forecast;
  const nbF = Math.min(forecastVol.length, forecastCout.length);

  const forecasts = Array.from({ length: nbF }, (_, k) => ({
    label:       forecastVol[k].label,
    countMin:    forecastVol[k].min,
    countMoy:    forecastVol[k].moy,
    countMax:    forecastVol[k].max,
    coutMin:     forecastCout[k].min,
    coutMoy:     forecastCout[k].moy,
    coutMax:     forecastCout[k].max,
    isForecast:  true,
    isCurrent:   false,
  }));

  return [...historique, ...forecasts];
};

// ─── Alertes ─────────────────────────────────────────────────────────────────

const buildAlertes = (vol, cout, rendementMoyen, schemas, horizon) => {
  const alertes = [];

  // Volume en baisse
  if (vol.tendance === TENDANCES.BAISSIERE) {
    alertes.push({
      id:      "volume_production_baissier",
      niveau:  Math.abs(vol.variation) > 0.20 ? "critique" : "haute",
      message: `Le volume de productions est en baisse de ${Math.round(Math.abs(vol.variation) * 100)} % sur la période. Vérifiez la cadence de production.`,
    });
  }

  // Coût en hausse sans volume correspondant
  if (cout.tendance === TENDANCES.HAUSSIERE && vol.tendance !== TENDANCES.HAUSSIERE) {
    alertes.push({
      id:      "cout_hausse_sans_volume",
      niveau:  "haute",
      message: "Les coûts de production augmentent alors que le volume est stable. Les prix des matières premières sont en dérive.",
    });
  }

  // Rendement moyen faible
  if (rendementMoyen > 0 && rendementMoyen < 80) {
    alertes.push({
      id:      "rendement_faible_global",
      niveau:  "critique",
      message: `Rendement moyen global : ${Math.round(rendementMoyen)} %. Des pertes matière significatives sont constatées sur l'ensemble des productions.`,
    });
  } else if (rendementMoyen > 0 && rendementMoyen < 92) {
    alertes.push({
      id:      "rendement_sous_objectif",
      niveau:  "haute",
      message: `Rendement moyen : ${Math.round(rendementMoyen)} %. Objectif : 95 %. Analysez les schémas les moins performants.`,
    });
  }

  // Schéma avec rendement très faible
  const schemasFaibles = schemas.filter((s) => s.rendementMoyen > 0 && s.rendementMoyen < 75);
  if (schemasFaibles.length > 0) {
    const noms = schemasFaibles.map((s) => s.nomSchema).join(", ");
    alertes.push({
      id:      "schemas_rendement_critique",
      niveau:  "critique",
      message: `Rendement critique (< 75 %) détecté sur : ${noms}. Action corrective urgente requise.`,
    });
  }

  // Dépassements de coût récurrents
  const schemasDepassement = schemas.filter((s) => s.ecartCoutTotal > 0 && s.count >= 2);
  if (schemasDepassement.length > 0) {
    const pire = schemasDepassement.sort((a, b) => b.ecartCoutTotal - a.ecartCoutTotal)[0];
    alertes.push({
      id:      "depassement_cout_schema",
      niveau:  "haute",
      message: `Dépassement budgétaire récurrent sur « ${pire.nomSchema} » : +${Math.round(pire.ecartCoutTotal).toLocaleString("fr-FR")} F au-dessus du coût estimé.`,
    });
  }

  // Projection
  const countF = vol.forecast[0];
  const coutF  = cout.forecast[0];
  if (countF && coutF) {
    const label = horizon === HORIZONS.H24 ? "aujourd'hui" : horizon === HORIZONS.J7 ? "cette semaine" : "ce mois";
    alertes.push({
      id:      "projection_production",
      niveau:  "info",
      message: `Prévision ${label} : ~${Math.round(countF.moy)} production(s), coût estimé ~${Math.round(coutF.moy).toLocaleString("fr-FR")} F.`,
    });
  }

  return alertes;
};

// ─── Point d'entrée ───────────────────────────────────────────────────────────

/**
 * @param {Array<{ label, count, coutTotal, isCurrent }>} periodes
 * @param {Array} schemas — agrégat par schéma (pour les alertes rendement/dépassement)
 * @param {number} rendementMoyen — taux de rendement moyen global
 * @param {string} horizon — HORIZONS.*
 */
export const analyzeProduction = (periodes, schemas, rendementMoyen, horizon) => {
  const counts = periodes.map((p) => p.count);
  const couts  = periodes.map((p) => p.coutTotal);

  const volAnalysis  = analyzeSerie(counts, horizon);
  const coutAnalysis = analyzeSerie(couts,  horizon);

  const alertes   = buildAlertes(volAnalysis, coutAnalysis, rendementMoyen, schemas, horizon);
  const chartData = buildChartData(periodes, volAnalysis, coutAnalysis, horizon);

  return {
    periodes,
    volume:  volAnalysis,
    cout:    coutAnalysis,
    alertes,
    chartData,
  };
};
