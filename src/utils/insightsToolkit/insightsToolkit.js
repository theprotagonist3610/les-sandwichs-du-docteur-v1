/**
 * insightsToolkit.js
 * Point d'entrée public du moteur d'insights.
 *
 * Usage :
 *   import { generateInsights, HORIZONS } from "@/utils/insightsToolkit/insightsToolkit";
 *   const insights = await generateInsights(HORIZONS.H24);
 */

import engine                        from "./engine/InsightEngine.js";
import { HORIZONS, CATEGORIES, PRIORITES } from "./engine/insightTypes.js";
import { renderInsights, groupByCategorie, groupByPriorite, filterUrgents } from "./renderer/insightRenderer.js";

import FinanceAnalyzer    from "./analyzers/FinanceAnalyzer.js";
import CommandeAnalyzer   from "./analyzers/CommandeAnalyzer.js";
import StockAnalyzer      from "./analyzers/StockAnalyzer.js";
import ProductionAnalyzer from "./analyzers/ProductionAnalyzer.js";
import RapportAnalyzer    from "./analyzers/RapportAnalyzer.js";
import ClotureAnalyzer    from "./analyzers/ClotureAnalyzer.js";

// ─── Enregistrement des plugins ───────────────────────────────────────────────

engine.register(FinanceAnalyzer);
engine.register(CommandeAnalyzer);
engine.register(StockAnalyzer);
engine.register(ProductionAnalyzer);
engine.register(RapportAnalyzer);
engine.register(ClotureAnalyzer);

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Génère et retourne les insights enrichis pour un horizon donné.
 *
 * @param {string} horizon — HORIZONS.H24 | HORIZONS.J7 | HORIZONS.MOIS
 * @returns {Promise<{
 *   insights: RenderedInsight[],
 *   parCategorie: Record<string, RenderedInsight[]>,
 *   parPriorite:  Record<string, RenderedInsight[]>,
 *   urgents:      RenderedInsight[],
 *   total:        number,
 * }>}
 */
export const generateInsights = async (horizon = HORIZONS.H24) => {
  const raw      = await engine.run(horizon);
  const rendered = renderInsights(raw);

  return {
    insights:     rendered,
    parCategorie: groupByCategorie(rendered),
    parPriorite:  groupByPriorite(rendered),
    urgents:      filterUrgents(rendered),
    total:        rendered.length,
  };
};

// ─── Re-exports pratiques ─────────────────────────────────────────────────────

export { HORIZONS, CATEGORIES, PRIORITES };
export { renderInsights, groupByCategorie, filterUrgents };
