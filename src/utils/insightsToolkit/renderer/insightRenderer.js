/**
 * insightRenderer.js
 * Mappe chaque Insight vers ses propriétés d'affichage UI.
 *
 * Retourne pour chaque insight :
 *  - icon       : nom de l'icône Lucide (string) — à résoudre côté composant React
 *  - colorScheme: { bg, text, border, dot } — classes Tailwind
 *  - badgeLabel : libellé du badge de priorité
 *  - ctaLabel   : libellé du bouton principal (premier action)
 *  - ctaPath    : route React Router du bouton principal
 */

import { PRIORITES, PRIORITE_LABELS, CATEGORIES, HORIZONS } from "../engine/insightTypes.js";

// ─── Schémas de couleur par priorité ─────────────────────────────────────────

const COLOR_SCHEMES = {
  [PRIORITES.CRITIQUE]: {
    bg:     "bg-red-50 dark:bg-red-950",
    text:   "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    dot:    "bg-red-500",
    badge:  "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
  [PRIORITES.HAUTE]: {
    bg:     "bg-orange-50 dark:bg-orange-950",
    text:   "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
    dot:    "bg-orange-500",
    badge:  "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  },
  [PRIORITES.MOYENNE]: {
    bg:     "bg-yellow-50 dark:bg-yellow-950",
    text:   "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-800",
    dot:    "bg-yellow-500",
    badge:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  },
  [PRIORITES.INFO]: {
    bg:     "bg-blue-50 dark:bg-blue-950",
    text:   "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    dot:    "bg-blue-400",
    badge:  "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
};

// ─── Icônes par catégorie (noms Lucide React) ─────────────────────────────────

const CATEGORY_ICONS = {
  [CATEGORIES.FINANCE]:    "TrendingUp",
  [CATEGORIES.COMMANDES]:  "ShoppingCart",
  [CATEGORIES.STOCK]:      "Package",
  [CATEGORIES.PRODUCTION]: "Factory",
  [CATEGORIES.RAPPORTS]:   "BarChart3",
  [CATEGORIES.CLOTURE]:    "CalendarCheck",
};

// ─── Icônes de remplacement par id d'insight ─────────────────────────────────
// Permet de surcharger l'icône catégorie pour des insights spécifiques

const INSIGHT_ICON_OVERRIDES = {
  "finance_solde_critique":              "AlertTriangle",
  "finance_solde_attention":             "AlertCircle",
  "finance_projection_deficitaire":      "TrendingDown",
  "stock_peremption_critique":           "Clock",
  "stock_peremption_urgent":             "Clock",
  "stock_rupture":                       "PackageX",
  "production_aucune_planifiee_j1":      "CalendarPlus",
  "production_en_cours_non_terminees":   "Loader",
  "cloture_hier_manquante":              "CalendarX",
  "cloture_ecart_forecast_hier":         "TrendingDown",
  "cloture_heure_pointe_recurrente":     "Zap",
  "rapport_hier_manquant":               "FileX",
  "rapport_jours_consecutifs_sous_objectif": "AlertTriangle",
  "commandes_aucune_aujourd_hui":        "ShoppingBag",
  "commandes_taux_annulation_eleve":     "XCircle",
  "commandes_baisse_ca_hebdo":           "TrendingDown",
};

// ─── Renderer ─────────────────────────────────────────────────────────────────

/**
 * Enrichit un Insight avec ses propriétés d'affichage.
 *
 * @param {Insight} insight
 * @returns {RenderedInsight}
 */
export const renderInsight = (insight) => {
  const colorScheme = COLOR_SCHEMES[insight.priorite] ?? COLOR_SCHEMES[PRIORITES.INFO];
  const icon        = INSIGHT_ICON_OVERRIDES[insight.id] ?? CATEGORY_ICONS[insight.categorie] ?? "Lightbulb";
  const firstAction = insight.actions?.[0] ?? null;

  return {
    ...insight,
    icon,
    colorScheme,
    badgeLabel: PRIORITE_LABELS[insight.priorite] ?? "Info",
    ctaLabel:   firstAction?.label ?? null,
    ctaPath:    firstAction?.path  ?? null,
  };
};

/**
 * Enrichit un tableau d'insights.
 *
 * @param {Insight[]} insights
 * @returns {RenderedInsight[]}
 */
export const renderInsights = (insights) => insights.map(renderInsight);

/**
 * Groupe les insights rendus par catégorie.
 *
 * @param {RenderedInsight[]} rendered
 * @returns {Record<string, RenderedInsight[]>}
 */
export const groupByCategorie = (rendered) =>
  rendered.reduce((acc, insight) => {
    const cat = insight.categorie;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(insight);
    return acc;
  }, {});

/**
 * Groupe les insights rendus par priorité (décroissante).
 *
 * @param {RenderedInsight[]} rendered
 * @returns {Record<string, RenderedInsight[]>}
 */
export const groupByPriorite = (rendered) =>
  rendered.reduce((acc, insight) => {
    const p = String(insight.priorite);
    if (!acc[p]) acc[p] = [];
    acc[p].push(insight);
    return acc;
  }, {});

/**
 * Retourne uniquement les insights critiques et hauts.
 *
 * @param {RenderedInsight[]} rendered
 * @returns {RenderedInsight[]}
 */
export const filterUrgents = (rendered) =>
  rendered.filter((i) => i.priorite >= PRIORITES.HAUTE);
