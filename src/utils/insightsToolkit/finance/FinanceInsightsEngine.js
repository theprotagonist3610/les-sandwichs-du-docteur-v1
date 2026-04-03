/**
 * FinanceInsightsEngine.js
 * Moteur de calcul pour les insights financiers.
 *
 * Fonctions principales :
 *  - linearRegression(points)        → { a, b, r2 }
 *  - classifyTrend(slope, mean)      → HAUSSIERE | CONSTANTE | BAISSIERE
 *  - buildForecast(points, horizon)  → ForecastResult[]
 *  - analyzeSeriesFinance(data)      → FinanceAnalysis complet
 */

import { HORIZONS } from "../engine/insightTypes.js";

// ─── Constantes tendance ──────────────────────────────────────────────────────

export const TENDANCES = {
  HAUSSIERE: "haussiere",
  CONSTANTE:  "constante",
  BAISSIERE:  "baissiere",
};

export const TENDANCE_LABELS = {
  [TENDANCES.HAUSSIERE]: "Hausse",
  [TENDANCES.CONSTANTE]:  "Stable",
  [TENDANCES.BAISSIERE]:  "Baisse",
};

// Seuil en % de variation normalisée par rapport à la moyenne pour classer la tendance
const SEUIL_TENDANCE = 0.05; // 5 %

// Coefficient σ pour la fourchette d'incertitude (1.5 × écart-type résidus)
const SIGMA_FACTOR = 1.5;

// ─── Régression linéaire simple ───────────────────────────────────────────────

/**
 * Calcule la régression linéaire y = a*x + b sur un tableau de valeurs numériques.
 * Les x sont les indices 0, 1, 2, …, n-1.
 *
 * @param {number[]} values
 * @returns {{ a: number, b: number, r2: number, predicted: number[] }}
 */
export const linearRegression = (values) => {
  const n = values.length;
  if (n < 2) return { a: 0, b: values[0] ?? 0, r2: 0, predicted: values };

  const xs = values.map((_, i) => i);
  const meanX = xs.reduce((s, x) => s + x, 0) / n;
  const meanY = values.reduce((s, y) => s + y, 0) / n;

  let ssXY = 0, ssXX = 0, ssYY = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (xs[i] - meanX) * (values[i] - meanY);
    ssXX += (xs[i] - meanX) ** 2;
    ssYY += (values[i] - meanY) ** 2;
  }

  const a = ssXX === 0 ? 0 : ssXY / ssXX;
  const b = meanY - a * meanX;
  const r2 = ssYY === 0 ? 1 : ssXY ** 2 / (ssXX * ssYY);

  const predicted = xs.map((x) => a * x + b);
  return { a, b, r2, predicted };
};

// ─── Classification de tendance ───────────────────────────────────────────────

/**
 * Classifie une tendance à partir de la pente normalisée par la moyenne.
 *
 * @param {number} slope   — coefficient directeur `a`
 * @param {number} mean    — moyenne de la série
 * @returns {string}       — TENDANCES.*
 */
export const classifyTrend = (slope, mean) => {
  if (mean === 0) return TENDANCES.CONSTANTE;
  const normalizedSlope = slope / mean;
  if (normalizedSlope > SEUIL_TENDANCE)  return TENDANCES.HAUSSIERE;
  if (normalizedSlope < -SEUIL_TENDANCE) return TENDANCES.BAISSIERE;
  return TENDANCES.CONSTANTE;
};

// ─── Calcul de l'écart-type des résidus ──────────────────────────────────────

const stdResiduals = (actual, predicted) => {
  const n = actual.length;
  if (n < 2) return 0;
  const residuals = actual.map((v, i) => v - predicted[i]);
  const mean = residuals.reduce((s, r) => s + r, 0) / n;
  const variance = residuals.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
};

// ─── Génération des forecasts ─────────────────────────────────────────────────

/**
 * Génère les prévisions pour les prochaines périodes.
 *
 * @param {number[]} values   — série historique
 * @param {string}  horizon   — HORIZONS.*
 * @returns {ForecastPoint[]}
 */
export const buildForecast = (values, horizon) => {
  const n = values.length;
  if (n < 3) return [];

  const { a, b, predicted } = linearRegression(values);
  const sigma = stdResiduals(values, predicted) * SIGMA_FACTOR;

  // Nombre de périodes futures selon l'horizon
  const nbPeriodes = horizon === HORIZONS.H24 ? 2 : 2; // toujours 2 : période en cours + suivante

  const labels = {
    [HORIZONS.H24]:  ["Aujourd'hui",    "Demain"],
    [HORIZONS.J7]:   ["Cette semaine",  "Semaine prochaine"],
    [HORIZONS.MOIS]: ["Ce mois",        "Mois prochain"],
  }[horizon] ?? ["Période 1", "Période 2"];

  return Array.from({ length: nbPeriodes }, (_, k) => {
    const x   = n + k;
    const moy = Math.max(0, a * x + b);
    const min = Math.max(0, moy - sigma);
    const max = moy + sigma;
    return { label: labels[k], x, moy, min, max };
  });
};

// ─── Analyse d'une série unique ───────────────────────────────────────────────

/**
 * @typedef {Object} SerieAnalysis
 * @property {number}   moyenne
 * @property {number}   total
 * @property {number}   variation     — % entre premier et dernier point
 * @property {string}   tendance      — TENDANCES.*
 * @property {number}   r2            — qualité de la régression (0-1)
 * @property {number[]} predicted     — valeurs prédites par la régression
 * @property {ForecastPoint[]} forecast
 */

const analyzeSerie = (values, horizon) => {
  const n = values.length;
  if (n === 0) return { moyenne: 0, total: 0, variation: 0, tendance: TENDANCES.CONSTANTE, r2: 0, predicted: [], forecast: [] };

  const total   = values.reduce((s, v) => s + v, 0);
  const moyenne = total / n;

  const { a, b, r2, predicted } = linearRegression(values);
  const tendance  = classifyTrend(a, moyenne);
  const forecast  = buildForecast(values, horizon);

  const premier  = values[0] ?? 0;
  const dernier  = values[n - 1] ?? 0;
  const variation = premier === 0 ? 0 : (dernier - premier) / premier;

  return { moyenne, total, variation, tendance, r2, predicted, forecast };
};

// ─── Analyse complète Finance ─────────────────────────────────────────────────

/**
 * @typedef {Object} PeriodePoint
 * @property {string} label    — libellé de la période (ex: "14 mar", "S12", "mars 2025")
 * @property {number} enc      — encaissements réels
 * @property {number} dep      — dépenses réelles
 * @property {number} revenu   — enc - dep
 * @property {boolean} [isCurrent] — true pour la période en cours
 */

/**
 * Analyse complète : encaissements, dépenses, revenus.
 *
 * @param {PeriodePoint[]} periodes — série historique ordonnée
 * @param {string}         horizon  — HORIZONS.*
 * @returns {FinanceAnalysis}
 */
export const analyzeFinance = (periodes, horizon) => {
  const encs    = periodes.map((p) => p.enc);
  const deps    = periodes.map((p) => p.dep);
  const revenus = periodes.map((p) => p.enc - p.dep);

  const encAnalysis = analyzeSerie(encs,    horizon);
  const depAnalysis = analyzeSerie(deps,    horizon);
  const revAnalysis = analyzeSerie(revenus, horizon);

  // Alertes dérivées
  const alertes = buildAlertes(encAnalysis, depAnalysis, revAnalysis, horizon);

  // Données graphique : historique enrichi + forecasts
  const chartData = buildChartData(periodes, encAnalysis, depAnalysis, horizon);

  return {
    periodes,
    encaissements: encAnalysis,
    depenses:      depAnalysis,
    revenus:       revAnalysis,
    alertes,
    chartData,
  };
};

// ─── Données graphique ────────────────────────────────────────────────────────

/**
 * Construit le tableau de données pour le ComposedChart Recharts.
 * Structure : [...historique, ...forecast]
 * Chaque point : { label, enc?, dep?, encMin?, encMax?, depMin?, depMax?, isForecast, isCurrent }
 */
const buildChartData = (periodes, encAnalysis, depAnalysis, horizon) => {
  const historique = periodes.map((p, i) => ({
    label:      p.label,
    enc:        p.enc,
    dep:        p.dep,
    encPred:    Math.max(0, encAnalysis.predicted[i] ?? 0),
    depPred:    Math.max(0, depAnalysis.predicted[i] ?? 0),
    isForecast: false,
    isCurrent:  p.isCurrent ?? false,
  }));

  const forecastEnc = encAnalysis.forecast;
  const forecastDep = depAnalysis.forecast;
  const nbF = Math.min(forecastEnc.length, forecastDep.length);

  const forecasts = Array.from({ length: nbF }, (_, k) => ({
    label:      forecastEnc[k].label,
    encMin:     forecastEnc[k].min,
    encMoy:     forecastEnc[k].moy,
    encMax:     forecastEnc[k].max,
    depMin:     forecastDep[k].min,
    depMoy:     forecastDep[k].moy,
    depMax:     forecastDep[k].max,
    isForecast: true,
    isCurrent:  false,
  }));

  return [...historique, ...forecasts];
};

// ─── Alertes textuelles ───────────────────────────────────────────────────────

const buildAlertes = (enc, dep, rev, horizon) => {
  const alertes = [];

  // Dépenses croissent plus vite que les encaissements
  if (dep.tendance === TENDANCES.HAUSSIERE && enc.tendance !== TENDANCES.HAUSSIERE) {
    alertes.push({
      id:       "drift_depenses_vs_enc",
      niveau:   "critique",
      message:  "Les dépenses progressent alors que les encaissements sont stables ou en baisse. La marge se comprime.",
    });
  }

  // Revenus en baisse
  if (rev.tendance === TENDANCES.BAISSIERE) {
    const varPct = Math.round(Math.abs(rev.variation) * 100);
    alertes.push({
      id:       "revenus_baissiers",
      niveau:   rev.variation < -0.20 ? "critique" : "haute",
      message:  `Les revenus nets (encaissements − dépenses) sont en baisse de ${varPct} % sur la période. Analysez les causes.`,
    });
  }

  // Bonne nouvelle : revenus en hausse
  if (rev.tendance === TENDANCES.HAUSSIERE && rev.variation > 0.10) {
    alertes.push({
      id:       "revenus_haussiers",
      niveau:   "info",
      message:  `Les revenus nets progressent de ${Math.round(rev.variation * 100)} % sur la période. Bonne dynamique.`,
    });
  }

  // Projection forecast : solde attendu
  const encF = enc.forecast[0];
  const depF = dep.forecast[0];
  if (encF && depF) {
    const soldeMoy = encF.moy - depF.moy;
    const soldeMin = encF.min - depF.max;
    const label = horizon === HORIZONS.H24 ? "aujourd'hui" : horizon === HORIZONS.J7 ? "cette semaine" : "ce mois";
    alertes.push({
      id:       "projection_solde",
      niveau:   soldeMoy < 0 ? "haute" : "info",
      message:  soldeMoy >= 0
        ? `Solde net estimé ${label} : entre ${Math.round(soldeMin).toLocaleString("fr-FR")} F et ${Math.round(encF.max - depF.min).toLocaleString("fr-FR")} F (central : ${Math.round(soldeMoy).toLocaleString("fr-FR")} F).`
        : `Attention : la projection ${label} indique un solde net négatif possible (central : ${Math.round(soldeMoy).toLocaleString("fr-FR")} F).`,
    });
  }

  return alertes;
};
