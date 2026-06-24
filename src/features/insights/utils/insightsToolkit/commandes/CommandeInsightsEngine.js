/**
 * CommandeInsightsEngine.js
 * Moteur de calcul pour les insights commandes.
 *
 * Réutilise linearRegression, classifyTrend, buildForecast depuis FinanceInsightsEngine.
 *
 * Entrée  : periodes[] { label, volume, ca, isCurrent }
 * Sortie  : { periodes, volume, ca, panier, alertes, chartData }
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

  const { a, b, r2, predicted } = linearRegression(values);
  const tendance = classifyTrend(a, moyenne);
  const forecast = buildForecast(values, horizon);

  const premier  = values[0] ?? 0;
  const dernier  = values[n - 1] ?? 0;
  const variation = premier === 0 ? 0 : (dernier - premier) / premier;

  return { moyenne, total, variation, tendance, r2, predicted, forecast };
};

// ─── Chart data ───────────────────────────────────────────────────────────────

const buildChartData = (periodes, volAnalysis, caAnalysis, horizon) => {
  const historique = periodes.map((p, i) => ({
    label:      p.label,
    volume:     p.volume,
    ca:         p.ca,
    volPred:    Math.max(0, volAnalysis.predicted[i] ?? 0),
    caPred:     Math.max(0, caAnalysis.predicted[i] ?? 0),
    isForecast: false,
    isCurrent:  p.isCurrent ?? false,
  }));

  const forecastVol = volAnalysis.forecast;
  const forecastCA  = caAnalysis.forecast;
  const nbF = Math.min(forecastVol.length, forecastCA.length);

  const forecasts = Array.from({ length: nbF }, (_, k) => ({
    label:      forecastVol[k].label,
    volMin:     forecastVol[k].min,
    volMoy:     forecastVol[k].moy,
    volMax:     forecastVol[k].max,
    caMin:      forecastCA[k].min,
    caMoy:      forecastCA[k].moy,
    caMax:      forecastCA[k].max,
    isForecast: true,
    isCurrent:  false,
  }));

  return [...historique, ...forecasts];
};

// ─── Alertes ─────────────────────────────────────────────────────────────────

const buildAlertes = (vol, ca, panier, horizon) => {
  const alertes = [];

  if (vol.tendance === TENDANCES.BAISSIERE) {
    alertes.push({
      id:      "volume_baissier",
      niveau:  Math.abs(vol.variation) > 0.20 ? "critique" : "haute",
      message: `Le volume de commandes est en baisse de ${Math.round(Math.abs(vol.variation) * 100)} % sur la période.`,
    });
  }

  if (vol.tendance === TENDANCES.HAUSSIERE) {
    alertes.push({
      id:      "volume_haussier",
      niveau:  "info",
      message: `Le volume de commandes progresse de ${Math.round(vol.variation * 100)} % sur la période. Belle dynamique.`,
    });
  }

  if (ca.tendance === TENDANCES.HAUSSIERE && vol.tendance !== TENDANCES.HAUSSIERE) {
    alertes.push({
      id:      "ca_hausse_panier",
      niveau:  "info",
      message: "Le CA progresse malgré un volume stable — le panier moyen est en hausse.",
    });
  }

  if (panier.tendance === TENDANCES.BAISSIERE) {
    alertes.push({
      id:      "panier_baissier",
      niveau:  "haute",
      message: "Le panier moyen est en baisse. Analysez la composition des commandes récentes.",
    });
  }

  const volF = vol.forecast[0];
  const caF  = ca.forecast[0];
  if (volF && caF) {
    const label = horizon === HORIZONS.H24 ? "aujourd'hui" : horizon === HORIZONS.J7 ? "cette semaine" : "ce mois";
    alertes.push({
      id:      "projection_commandes",
      niveau:  "info",
      message: `Prévision ${label} : ~${Math.round(volF.moy)} commandes, CA estimé ~${Math.round(caF.moy).toLocaleString("fr-FR")} F.`,
    });
  }

  return alertes;
};

// ─── Point d'entrée ───────────────────────────────────────────────────────────

/**
 * @param {Array<{ label, volume, ca, isCurrent }>} periodes
 * @param {string} horizon — HORIZONS.*
 */
export const analyzeCommandes = (periodes, horizon) => {
  const volumes = periodes.map((p) => p.volume);
  const cas     = periodes.map((p) => p.ca);
  const paniers = periodes.map((p) => (p.volume > 0 ? p.ca / p.volume : 0));

  const volumeAnalysis = analyzeSerie(volumes, horizon);
  const caAnalysis     = analyzeSerie(cas,     horizon);
  const panierAnalysis = analyzeSerie(paniers, horizon);

  const totalVol = volumeAnalysis.total;
  const totalCA  = caAnalysis.total;
  const panierGlobal = totalVol > 0 ? totalCA / totalVol : 0;

  const alertes   = buildAlertes(volumeAnalysis, caAnalysis, panierAnalysis, horizon);
  const chartData = buildChartData(periodes, volumeAnalysis, caAnalysis, horizon);

  return {
    periodes,
    volume:  volumeAnalysis,
    ca:      caAnalysis,
    panier:  { ...panierAnalysis, value: panierGlobal },
    alertes,
    chartData,
  };
};
