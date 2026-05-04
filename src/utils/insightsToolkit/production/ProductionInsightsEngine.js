/**
 * ProductionInsightsEngine.js
 * Analyse statistique des productions (3 recettes fixes).
 * Calcule tendances, alertes et données de graphiques.
 */

import { HORIZONS } from "../engine/insightTypes.js";
import { RECETTES_IDS, RECETTE_LABELS } from "@/utils/productionToolkit.js";

// ─── Régression linéaire ──────────────────────────────────────────────────────

function regressionLineaire(values) {
  const n = values.length;
  if (n < 2) return { pente: 0, tendance: "stable" };
  const xs = values.map((_, i) => i);
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = values.reduce((s, y) => s + y, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (values[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const pente = den === 0 ? 0 : num / den;
  const pct   = my === 0 ? 0 : Math.abs(pente) / Math.abs(my);
  const tendance = pct < 0.05 ? "stable" : pente > 0 ? "hausse" : "baisse";
  return { pente, tendance };
}

// ─── Analyse principale ───────────────────────────────────────────────────────

/**
 * @param {Object[]} periodes   — [{ label, viande_count, poisson_count, yaourt_count, coutTotal, margeTotal, prixVenteTotal }]
 * @param {Object}   parRecette — { viande: { count, coutTotal, margeTotal, prixVenteTotal, rendementMoyen }, ... }
 * @param {string}   horizon
 */
export function analyzeProduction(periodes, parRecette, horizon) {
  const n = periodes.length;

  // ── Tendances globales ────────────────────────────────────────────────────
  const counts     = periodes.map((p) => p.count ?? 0);
  const cout       = periodes.map((p) => p.coutTotal ?? 0);
  const marges     = periodes.map((p) => p.margeTotal ?? 0);

  const tendanceVolume = regressionLineaire(counts);
  const tendanceCout   = regressionLineaire(cout);
  const tendanceMarge  = regressionLineaire(marges);

  const totaux = {
    count:          Object.values(parRecette).reduce((s, r) => s + r.count, 0),
    coutTotal:      Object.values(parRecette).reduce((s, r) => s + r.coutTotal, 0),
    margeTotal:     Object.values(parRecette).reduce((s, r) => s + r.margeTotal, 0),
    prixVenteTotal: Object.values(parRecette).reduce((s, r) => s + r.prixVenteTotal, 0),
    rendementMoyen: (() => {
      const withRend = RECETTES_IDS.filter((id) => parRecette[id]?.count > 0 && parRecette[id]?.rendementMoyen > 0);
      if (!withRend.length) return 0;
      return withRend.reduce((s, id) => s + parRecette[id].rendementMoyen, 0) / withRend.length;
    })(),
  };

  // ── Alertes ───────────────────────────────────────────────────────────────
  const alertes = [];

  RECETTES_IDS.forEach((id) => {
    const r = parRecette[id];
    if (!r || r.count === 0) return;

    if (r.rendementMoyen > 0 && r.rendementMoyen < 70) {
      alertes.push({
        recette:  RECETTE_LABELS[id],
        type:     "rendement_faible",
        valeur:   r.rendementMoyen,
        message:  `Rendement moyen de ${r.rendementMoyen.toFixed(1)} % — inférieur au seuil critique de 70 %.`,
      });
    }

    if (r.margeTotal < 0) {
      alertes.push({
        recette:  RECETTE_LABELS[id],
        type:     "marge_negative",
        valeur:   r.margeTotal,
        message:  `Marge totale négative (${r.margeTotal.toFixed(0)} FCFA) — revoyez le prix de vente ou réduisez les coûts.`,
      });
    }
  });

  // Dérive de coût sur la dernière période vs la moyenne
  if (n >= 3) {
    const moyenneCout = cout.slice(0, -1).reduce((s, c) => s + c, 0) / (n - 1);
    const dernierCout = cout[n - 1];
    if (moyenneCout > 0 && (dernierCout - moyenneCout) / moyenneCout > 0.2) {
      alertes.push({
        recette:  "global",
        type:     "derive_cout",
        valeur:   (dernierCout - moyenneCout) / moyenneCout,
        message:  `Les coûts de la dernière période dépassent la moyenne de +${Math.round(((dernierCout - moyenneCout) / moyenneCout) * 100)} %.`,
      });
    }
  }

  // ── Prévision (dernière période × tendance) ───────────────────────────────
  const previsionCount = n > 0
    ? Math.max(0, Math.round((counts[n - 1] ?? 0) + (tendanceVolume.pente ?? 0)))
    : 0;

  return {
    totaux,
    tendanceVolume: tendanceVolume.tendance,
    tendanceCout:   tendanceCout.tendance,
    tendanceMarge:  tendanceMarge.tendance,
    alertes,
    previsionCount,
  };
}
