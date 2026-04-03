/**
 * insightTypes.js
 * Enums et type canonique d'un Insight pour le moteur de recommandations.
 */

// ─── Horizons temporels ───────────────────────────────────────────────────────

export const HORIZONS = {
  H24:  "h24",   // Prochaines 24 heures
  J7:   "j7",    // Prochains 7 jours
  MOIS: "mois",  // Prochain mois
};

export const HORIZON_LABELS = {
  [HORIZONS.H24]:  "Prochaines 24 h",
  [HORIZONS.J7]:   "7 prochains jours",
  [HORIZONS.MOIS]: "Mois à venir",
};

// ─── Niveaux de priorité ──────────────────────────────────────────────────────

export const PRIORITES = {
  CRITIQUE: 4, // Blocage immédiat — action urgente
  HAUTE:    3, // Impact fort — à traiter aujourd'hui
  MOYENNE:  2, // Amélioration recommandée
  INFO:     1, // Information contextuelle
};

export const PRIORITE_LABELS = {
  [PRIORITES.CRITIQUE]: "Critique",
  [PRIORITES.HAUTE]:    "Haute",
  [PRIORITES.MOYENNE]:  "Moyenne",
  [PRIORITES.INFO]:     "Info",
};

// ─── Catégories métier ────────────────────────────────────────────────────────

export const CATEGORIES = {
  FINANCE:    "finance",
  COMMANDES:  "commandes",
  STOCK:      "stock",
  PRODUCTION: "production",
  RAPPORTS:   "rapports",
  CLOTURE:    "cloture",
};

export const CATEGORIE_LABELS = {
  [CATEGORIES.FINANCE]:    "Finance",
  [CATEGORIES.COMMANDES]:  "Commandes",
  [CATEGORIES.STOCK]:      "Stock",
  [CATEGORIES.PRODUCTION]: "Production",
  [CATEGORIES.RAPPORTS]:   "Rapports",
  [CATEGORIES.CLOTURE]:    "Clôture",
};

// ─── Type canonique Insight ───────────────────────────────────────────────────

/**
 * Structure d'un Insight produit par un analyzer.
 *
 * @typedef {Object} Insight
 * @property {string}   id          - Identifiant unique (ex: "finance_solde_bas")
 * @property {string}   source      - Nom de l'analyzer émetteur (ex: "FinanceAnalyzer")
 * @property {string}   categorie   - CATEGORIES.*
 * @property {string}   horizon     - HORIZONS.*
 * @property {number}   priorite    - PRIORITES.*
 * @property {string}   titre       - Titre court affiché dans l'UI
 * @property {string}   description - Explication détaillée avec chiffres contextuels
 * @property {Action[]} actions     - Liste d'actions recommandées
 * @property {Object}   [meta]      - Données brutes ayant produit l'insight (pour debug)
 */

/**
 * @typedef {Object} Action
 * @property {string} label  - Libellé du bouton CTA
 * @property {string} [path] - Route interne React Router (optionnel)
 */

/**
 * Fabrique un Insight avec valeurs par défaut.
 * @param {Partial<Insight>} data
 * @returns {Insight}
 */
export const createInsight = ({
  id,
  source,
  categorie,
  horizon,
  priorite = PRIORITES.INFO,
  titre,
  description,
  actions = [],
  meta = {},
}) => ({
  id,
  source,
  categorie,
  horizon,
  priorite,
  titre,
  description,
  actions,
  meta,
});
