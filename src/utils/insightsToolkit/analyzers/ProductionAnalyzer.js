/**
 * ProductionAnalyzer.js
 * Plugin d'analyse production pour le moteur d'insights.
 *
 * Règles :
 *  - Aucun lot enregistré aujourd'hui (H24)
 *  - Rendement < 70 % sur les 7 derniers jours (J7)
 *  - Marge négative sur le mois en cours (MOIS)
 */

import { supabase }                    from "@/config/supabase";
import { HORIZONS, PRIORITES, CATEGORIES, createInsight } from "../engine/insightTypes.js";
import { RECETTE_LABELS, RECETTES_IDS } from "@/utils/productionToolkit.js";

const today    = () => new Date().toISOString().slice(0, 10);
const ilYa7j   = () => new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
const debutMois = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10);
};

// ─── H24 : aucun lot aujourd'hui ─────────────────────────────────────────────

async function analyserLotDuJour(horizon) {
  if (horizon !== HORIZONS.H24) return [];

  const { data } = await supabase
    .from("productions")
    .select("id")
    .eq("date_production", today())
    .limit(1);

  if (data && data.length > 0) return [];

  return [createInsight({
    id:          "production_aucun_lot_aujourd_hui",
    source:      "ProductionAnalyzer",
    categorie:   CATEGORIES.PRODUCTION,
    horizon,
    priorite:    PRIORITES.INFO,
    titre:       "Aucun lot enregistré aujourd'hui",
    description: "Aucune production n'a été saisie pour aujourd'hui. Si vous avez produit, pensez à enregistrer vos lots.",
    actions:     [{ label: "Enregistrer un lot", path: "/productions" }],
  })];
}

// ─── J7 : rendement faible ────────────────────────────────────────────────────

async function analyserRendement(horizon) {
  if (horizon !== HORIZONS.J7) return [];

  const { data } = await supabase
    .from("productions")
    .select("recette_id, rendement_reel_pct, recette:recettes(rendement_estime_pct)")
    .gte("date_production", ilYa7j())
    .lte("date_production", today());

  if (!data || data.length === 0) return [];

  const parRecette = {};
  for (const p of data) {
    const id = p.recette_id;
    if (!parRecette[id]) parRecette[id] = { sum: 0, n: 0, estime: p.recette?.rendement_estime_pct ?? 85 };
    if (p.rendement_reel_pct != null) { parRecette[id].sum += p.rendement_reel_pct; parRecette[id].n++; }
  }

  const insights = [];
  for (const [id, val] of Object.entries(parRecette)) {
    if (val.n === 0) continue;
    const moyen = val.sum / val.n;
    if (moyen < val.estime * 0.8) {
      insights.push(createInsight({
        id:          `production_rendement_faible_${id}`,
        source:      "ProductionAnalyzer",
        categorie:   CATEGORIES.PRODUCTION,
        horizon,
        priorite:    PRIORITES.MOYENNE,
        titre:       `Rendement faible — ${RECETTE_LABELS[id] ?? id}`,
        description: `Le rendement moyen sur 7 jours est de ${moyen.toFixed(1)} % pour ${RECETTE_LABELS[id] ?? id}, soit en dessous de 80 % du rendement estimé (${val.estime} %).`,
        actions:     [{ label: "Voir les productions", path: "/productions" }],
        meta:        { recetteId: id, rendementMoyen: moyen, rendementEstime: val.estime },
      }));
    }
  }

  return insights;
}

// ─── MOIS : marge négative ────────────────────────────────────────────────────

async function analyserMarge(horizon) {
  if (horizon !== HORIZONS.MOIS) return [];

  const { data } = await supabase
    .from("productions")
    .select("recette_id, marge_estimee")
    .gte("date_production", debutMois())
    .lte("date_production", today());

  if (!data || data.length === 0) return [];

  const parRecette = {};
  for (const p of data) {
    const id = p.recette_id;
    if (!parRecette[id]) parRecette[id] = 0;
    parRecette[id] += Number(p.marge_estimee ?? 0);
  }

  const insights = [];
  for (const [id, margeTotal] of Object.entries(parRecette)) {
    if (margeTotal < 0) {
      insights.push(createInsight({
        id:          `production_marge_negative_${id}`,
        source:      "ProductionAnalyzer",
        categorie:   CATEGORIES.PRODUCTION,
        horizon,
        priorite:    PRIORITES.HAUTE,
        titre:       `Marge négative — ${RECETTE_LABELS[id] ?? id}`,
        description: `La marge cumulée du mois pour ${RECETTE_LABELS[id] ?? id} est négative (${margeTotal.toFixed(0)} FCFA). Revoyez le prix de vente ou réduisez les coûts matières.`,
        actions:     [{ label: "Voir les productions", path: "/productions" }],
        meta:        { recetteId: id, margeTotal },
      }));
    }
  }

  return insights;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

const ProductionAnalyzer = {
  name:    "ProductionAnalyzer",
  horizons: [HORIZONS.H24, HORIZONS.J7, HORIZONS.MOIS],

  async run(horizon) {
    const [lotJ, rendement, marge] = await Promise.allSettled([
      analyserLotDuJour(horizon),
      analyserRendement(horizon),
      analyserMarge(horizon),
    ]);

    return [
      ...(lotJ.status     === "fulfilled" ? lotJ.value     : []),
      ...(rendement.status === "fulfilled" ? rendement.value : []),
      ...(marge.status    === "fulfilled" ? marge.value    : []),
    ];
  },
};

export default ProductionAnalyzer;
