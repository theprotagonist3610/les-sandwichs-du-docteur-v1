/**
 * InsightEngine.js
 * Moteur central du système d'insights.
 *
 * Responsabilités :
 *  - Maintenir le registre des analyzers plugins
 *  - Exécuter tous les analyzers compatibles avec un horizon en parallèle
 *  - Fusionner, dédupliquer et trier les résultats par priorité décroissante
 */

import { HORIZONS } from "./insightTypes.js";

class InsightEngine {
  constructor() {
    /** @type {Map<string, Object>} */
    this._analyzers = new Map();
  }

  // ─── Enregistrement des plugins ─────────────────────────────────────────────

  /**
   * Enregistre un analyzer dans le moteur.
   * L'analyzer doit implémenter :
   *   - name     {string}   — identifiant unique
   *   - horizons {string[]} — HORIZONS.* supportés
   *   - run(horizon) → Promise<Insight[]>
   *
   * @param {Object} analyzer
   */
  register(analyzer) {
    if (!analyzer.name || !analyzer.horizons || typeof analyzer.run !== "function") {
      console.warn("[InsightEngine] Analyzer invalide ignoré :", analyzer);
      return;
    }
    this._analyzers.set(analyzer.name, analyzer);
  }

  /**
   * Désenregistre un analyzer par nom.
   * @param {string} name
   */
  unregister(name) {
    this._analyzers.delete(name);
  }

  // ─── Exécution ──────────────────────────────────────────────────────────────

  /**
   * Exécute tous les analyzers compatibles avec l'horizon demandé en parallèle.
   * Les erreurs d'un analyzer n'interrompent pas les autres.
   *
   * @param {string} horizon — HORIZONS.*
   * @returns {Promise<Insight[]>} — triés par priorité décroissante
   */
  async run(horizon = HORIZONS.H24) {
    const compatibles = [...this._analyzers.values()].filter((a) =>
      a.horizons.includes(horizon)
    );

    if (compatibles.length === 0) return [];

    const results = await Promise.allSettled(
      compatibles.map((analyzer) =>
        analyzer.run(horizon).catch((err) => {
          console.error(`[InsightEngine] Erreur dans ${analyzer.name} :`, err);
          return [];
        })
      )
    );

    const insights = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : []
    );

    return this._postProcess(insights);
  }

  // ─── Post-traitement ────────────────────────────────────────────────────────

  /**
   * Déduplique par id et trie par priorité décroissante.
   * @param {Insight[]} insights
   * @returns {Insight[]}
   */
  _postProcess(insights) {
    const seen = new Set();
    const unique = insights.filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });

    return unique.sort((a, b) => b.priorite - a.priorite);
  }

  // ─── Introspection ──────────────────────────────────────────────────────────

  /** @returns {string[]} noms des analyzers enregistrés */
  get registeredAnalyzers() {
    return [...this._analyzers.keys()];
  }
}

// Singleton — une seule instance partagée dans l'application
const engine = new InsightEngine();
export default engine;
