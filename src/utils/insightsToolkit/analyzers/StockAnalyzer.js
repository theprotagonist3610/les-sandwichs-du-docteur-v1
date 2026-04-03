/**
 * StockAnalyzer.js
 * Plugin d'analyse du stock.
 *
 * Sources : stockToolkit
 * Règles :
 *  - Alertes péremption imminentes (critique / urgent / attention)
 *  - Lots en rupture (quantité disponible = 0)
 *  - Taux de perte élevé sur la période
 *  - Valeur stock totale en baisse mensuelle
 */

import {
  getAlertes,
  getStockActuel,
  getMetriquesStock,
  SEUILS_ALERTE,
} from "@/utils/stockToolkit";
import { HORIZONS, PRIORITES, CATEGORIES, createInsight } from "../engine/insightTypes.js";

// ─── Seuils ───────────────────────────────────────────────────────────────────

const SEUIL_TAUX_PERTE = 0.08; // 8 % de perte → alerte

// ─── Règles ───────────────────────────────────────────────────────────────────

async function analyserPeremptions(horizon) {
  const insights = [];

  // Horizon détermine la fenêtre d'alerte
  const horizonJours = horizon === HORIZONS.H24 ? 1 : horizon === HORIZONS.J7 ? 7 : 30;
  const { success, critique, urgent, attention } = await getAlertes(horizonJours);
  if (!success) return insights;

  if (critique?.length > 0) {
    insights.push(createInsight({
      id:          "stock_peremption_critique",
      source:      "StockAnalyzer",
      categorie:   CATEGORIES.STOCK,
      horizon,
      priorite:    PRIORITES.CRITIQUE,
      titre:       `${critique.length} lot(s) expirant aujourd'hui`,
      description: `Les lots suivants expirent dans moins de ${SEUILS_ALERTE.CRITIQUE} jour : ${critique.map((l) => l.nom).join(", ")}. Utilisez ou retirez-les immédiatement.`,
      actions:     [{ label: "Voir le stock", path: "/stock" }],
      meta: { lots: critique },
    }));
  }

  if (urgent?.length > 0) {
    insights.push(createInsight({
      id:          "stock_peremption_urgent",
      source:      "StockAnalyzer",
      categorie:   CATEGORIES.STOCK,
      horizon,
      priorite:    PRIORITES.HAUTE,
      titre:       `${urgent.length} lot(s) expirant dans ${SEUILS_ALERTE.URGENT} jours`,
      description: `${urgent.map((l) => l.nom).join(", ")} — planifiez leur utilisation prioritaire.`,
      actions:     [{ label: "Voir le stock", path: "/stock" }],
      meta: { lots: urgent },
    }));
  }

  if (attention?.length > 0 && horizon !== HORIZONS.H24) {
    insights.push(createInsight({
      id:          "stock_peremption_attention",
      source:      "StockAnalyzer",
      categorie:   CATEGORIES.STOCK,
      horizon,
      priorite:    PRIORITES.MOYENNE,
      titre:       `${attention.length} lot(s) à surveiller (< ${SEUILS_ALERTE.ATTENTION} jours)`,
      description: `${attention.map((l) => l.nom).join(", ")} — anticipez leur rotation pour éviter les pertes.`,
      actions:     [{ label: "Voir le stock", path: "/stock" }],
      meta: { lots: attention },
    }));
  }

  return insights;
}

async function analyserRuptures(horizon) {
  const insights = [];
  const { success, lots } = await getStockActuel();
  if (!success || !lots) return insights;

  const enRupture = lots.filter((l) => (l.quantite_disponible ?? 0) === 0 && l.statut !== "perime");
  if (enRupture.length === 0) return insights;

  insights.push(createInsight({
    id:          "stock_rupture",
    source:      "StockAnalyzer",
    categorie:   CATEGORIES.STOCK,
    horizon,
    priorite:    PRIORITES.HAUTE,
    titre:       `${enRupture.length} article(s) en rupture de stock`,
    description: `${enRupture.map((l) => l.nom).join(", ")} — stock épuisé. Planifiez une production ou un réassort.`,
    actions:     [
      { label: "Lancer une production", path: "/productions" },
      { label: "Voir le stock",         path: "/stock" },
    ],
    meta: { lots: enRupture },
  }));

  return insights;
}

async function analyserTauxPerte(horizon) {
  if (horizon === HORIZONS.H24) return [];
  const insights = [];

  const { success, metriques } = await getMetriquesStock();
  if (!success || !metriques) return insights;

  const categsAvecPerte = metriques.filter((m) => {
    const total = (m.quantite_vendue ?? 0) + (m.quantite_perdue ?? 0);
    if (total === 0) return false;
    return (m.quantite_perdue ?? 0) / total >= SEUIL_TAUX_PERTE;
  });

  if (categsAvecPerte.length === 0) return insights;

  insights.push(createInsight({
    id:          "stock_taux_perte_eleve",
    source:      "StockAnalyzer",
    categorie:   CATEGORIES.STOCK,
    horizon,
    priorite:    PRIORITES.MOYENNE,
    titre:       "Taux de perte élevé sur certaines catégories",
    description: `Les catégories suivantes affichent un taux de perte ≥ ${SEUIL_TAUX_PERTE * 100} % : ${categsAvecPerte.map((m) => m.categorie).join(", ")}. Révisez les quantités produites ou les conditions de conservation.`,
    actions:     [{ label: "Voir le stock", path: "/stock" }],
    meta: { categories: categsAvecPerte },
  }));

  return insights;
}

async function analyserValeurStock(horizon) {
  if (horizon !== HORIZONS.MOIS) return [];
  const insights = [];

  const { success, lots } = await getStockActuel();
  if (!success || !lots) return insights;

  const valeurTotale = lots.reduce((sum, l) => sum + (l.valeur_stock ?? 0), 0);

  if (valeurTotale === 0) {
    insights.push(createInsight({
      id:          "stock_valeur_nulle",
      source:      "StockAnalyzer",
      categorie:   CATEGORIES.STOCK,
      horizon,
      priorite:    PRIORITES.HAUTE,
      titre:       "Stock valorisé à zéro",
      description: "La valeur totale du stock est nulle. Vérifiez les lots disponibles ou planifiez des entrées de stock.",
      actions:     [
        { label: "Voir le stock",         path: "/stock" },
        { label: "Lancer une production", path: "/productions" },
      ],
      meta: { valeurTotale },
    }));
  } else {
    insights.push(createInsight({
      id:          "stock_valeur_totale",
      source:      "StockAnalyzer",
      categorie:   CATEGORIES.STOCK,
      horizon,
      priorite:    PRIORITES.INFO,
      titre:       "Valeur du stock disponible",
      description: `Le stock actuel est valorisé à ${valeurTotale.toLocaleString("fr-FR")} F. Anticipez les besoins du mois pour maintenir un niveau optimal.`,
      actions:     [{ label: "Voir le stock", path: "/stock" }],
      meta: { valeurTotale },
    }));
  }

  return insights;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

const StockAnalyzer = {
  name: "StockAnalyzer",
  horizons: [HORIZONS.H24, HORIZONS.J7, HORIZONS.MOIS],

  async run(horizon) {
    const [peremptions, ruptures, perte, valeur] = await Promise.allSettled([
      analyserPeremptions(horizon),
      analyserRuptures(horizon),
      analyserTauxPerte(horizon),
      analyserValeurStock(horizon),
    ]);

    return [
      ...(peremptions.status === "fulfilled" ? peremptions.value : []),
      ...(ruptures.status    === "fulfilled" ? ruptures.value    : []),
      ...(perte.status       === "fulfilled" ? perte.value       : []),
      ...(valeur.status      === "fulfilled" ? valeur.value      : []),
    ];
  },
};

export default StockAnalyzer;
