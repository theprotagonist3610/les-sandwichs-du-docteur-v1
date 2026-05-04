/**
 * useProductionInsights.js
 * Hook React pour les insights production (3 recettes fixes).
 *
 * Retourne : { analysis, loading, error }
 * analysis = {
 *   periodes,     — [{ label, count, coutTotal, margeTotal, prixVenteTotal, viande_count, poisson_count, yaourt_count }]
 *   parRecette,   — { viande: { count, coutTotal, margeTotal, prixVenteTotal, rendementMoyen }, ... }
 *   charts,       — { volumes, marges, rendements, couts }
 *   totaux,       — { count, coutTotal, margeTotal, prixVenteTotal, rendementMoyen }
 *   tendanceVolume, tendanceCout, tendanceMarge,
 *   alertes,
 *   previsionCount,
 * }
 */

import { useState, useEffect, useCallback } from "react";
import { supabase }            from "@/config/supabase";
import { analyzeProduction }   from "@/utils/insightsToolkit/production/ProductionInsightsEngine";
import { HORIZONS }            from "@/utils/insightsToolkit/engine/insightTypes";
import { RECETTES_IDS }        from "@/utils/productionToolkit";

// ─── Helpers date ─────────────────────────────────────────────────────────────

const toISO   = (d) => d.toISOString().slice(0, 10);
const today   = () => new Date();
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const getISOWeek = (d) => {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp - yearStart) / 86_400_000 + 1) / 7);
};

const getWindowConfig = (horizon) => {
  const now = today();

  if (horizon === HORIZONS.H24) {
    return {
      startDate: toISO(addDays(now, -30)),
      endDate:   toISO(addDays(now, -1)),
      groupFn:   (d) => d,
      labelFn:   (k) => new Date(k + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    };
  }

  if (horizon === HORIZONS.J7) {
    const dow   = now.getDay() === 0 ? 7 : now.getDay();
    const lundi = addDays(now, -(dow - 1));
    const end   = addDays(lundi, -1);
    const start = addDays(end, -7 * 8 + 1);
    const getWeekKey = (dateStr) => {
      const d  = new Date(dateStr + "T12:00:00");
      const dw = d.getDay() === 0 ? 7 : d.getDay();
      const l  = new Date(d);
      l.setDate(d.getDate() - (dw - 1));
      return toISO(l);
    };
    return {
      startDate: toISO(start), endDate: toISO(end),
      groupFn:   getWeekKey,
      labelFn:   (k) => `S${getISOWeek(new Date(k + "T12:00:00"))}`,
    };
  }

  // MOIS
  const debutCeMois  = new Date(now.getFullYear(), now.getMonth(), 1);
  const finMoisPasse = new Date(debutCeMois - 1);
  const debutFenetre = new Date(finMoisPasse.getFullYear(), finMoisPasse.getMonth() - 5, 1);
  return {
    startDate: toISO(debutFenetre),
    endDate:   toISO(finMoisPasse),
    groupFn:   (d) => d.slice(0, 7),
    labelFn:   (k) => {
      const [y, m] = k.split("-").map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    },
  };
};

// ─── Agrégations ──────────────────────────────────────────────────────────────

const buildAggregations = (productions, groupFn, labelFn) => {
  const periodesMap  = new Map();
  const recetteMap   = {};
  RECETTES_IDS.forEach((id) => {
    recetteMap[id] = { count: 0, coutTotal: 0, margeTotal: 0, prixVenteTotal: 0, rendSum: 0, rendN: 0 };
  });
  const allKeys = new Set();

  for (const p of productions) {
    const key      = groupFn(p.date_production);
    const rid      = p.recette_id;
    const cout     = Number(p.cout_total_reel     ?? 0);
    const marge    = Number(p.marge_estimee        ?? 0);
    const prixV    = Number(p.prix_vente_estime    ?? 0);
    const rend     = p.rendement_reel_pct != null ? Number(p.rendement_reel_pct) : null;

    allKeys.add(key);

    // Périodes
    if (!periodesMap.has(key)) {
      periodesMap.set(key, {
        count: 0, coutTotal: 0, margeTotal: 0, prixVenteTotal: 0,
        viande_count: 0, poisson_count: 0, yaourt_count: 0,
      });
    }
    const per = periodesMap.get(key);
    per.count++;
    per.coutTotal      += cout;
    per.margeTotal     += marge;
    per.prixVenteTotal += prixV;
    if (rid in per) per[`${rid}_count`] = (per[`${rid}_count`] ?? 0) + 1;
    per[`${rid}_count`] = (per[`${rid}_count`] ?? 0) + 1;

    // Par recette
    if (recetteMap[rid]) {
      recetteMap[rid].count++;
      recetteMap[rid].coutTotal      += cout;
      recetteMap[rid].margeTotal     += marge;
      recetteMap[rid].prixVenteTotal += prixV;
      if (rend !== null) { recetteMap[rid].rendSum += rend; recetteMap[rid].rendN++; }
    }
  }

  // Normaliser rendement
  const parRecette = {};
  RECETTES_IDS.forEach((id) => {
    const r = recetteMap[id];
    parRecette[id] = {
      ...r,
      rendementMoyen: r.rendN > 0 ? r.rendSum / r.rendN : 0,
    };
  });

  const sortedKeys = [...allKeys].sort();

  const periodes = sortedKeys.map((key) => ({
    label:          labelFn(key),
    ...periodesMap.get(key),
  }));

  // Charts
  const charts = {
    volumes: sortedKeys.map((key) => {
      const p = periodesMap.get(key);
      return {
        label:         labelFn(key),
        viande_count:  p.viande_count  ?? 0,
        poisson_count: p.poisson_count ?? 0,
        yaourt_count:  p.yaourt_count  ?? 0,
      };
    }),
    marges: sortedKeys.map((key) => {
      // Marge par recette pour la période — besoin d'un map par recette × période
      return { label: labelFn(key) }; // rempli plus bas
    }),
    rendements: RECETTES_IDS.map((id) => ({
      recette:        id,
      label:          id,
      rendementMoyen: parRecette[id].rendementMoyen,
      count:          parRecette[id].count,
    })),
    couts: sortedKeys.map((key) => ({ label: labelFn(key) })),
  };

  // Marges et coûts par recette × période
  const margesMap = {};
  const coutsMap  = {};
  RECETTES_IDS.forEach((id) => { margesMap[id] = new Map(); coutsMap[id] = new Map(); });
  for (const p of productions) {
    const key = groupFn(p.date_production);
    const id  = p.recette_id;
    if (!margesMap[id]) continue;
    margesMap[id].set(key, (margesMap[id].get(key) ?? 0) + Number(p.marge_estimee ?? 0));
    coutsMap[id].set(key,  (coutsMap[id].get(key)  ?? 0) + Number(p.cout_total_reel ?? 0));
  }
  charts.marges = sortedKeys.map((key) => {
    const pt = { label: labelFn(key) };
    RECETTES_IDS.forEach((id) => { pt[id] = margesMap[id]?.get(key) ?? 0; });
    return pt;
  });
  charts.couts = sortedKeys.map((key) => {
    const pt = { label: labelFn(key) };
    RECETTES_IDS.forEach((id) => { pt[id] = coutsMap[id]?.get(key) ?? 0; });
    return pt;
  });

  return { periodes, parRecette, charts };
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useProductionInsights = (horizon = HORIZONS.H24, refreshKey = 0) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate, groupFn, labelFn } = getWindowConfig(horizon);

      const { data, error: dbError } = await supabase
        .from("productions")
        .select("recette_id, date_production, cout_total_reel, marge_estimee, prix_vente_estime, rendement_reel_pct, recette:recettes(rendement_estime_pct)")
        .gte("date_production", startDate)
        .lte("date_production", endDate);

      if (dbError) throw new Error(dbError.message);

      const { periodes, parRecette, charts } = buildAggregations(data ?? [], groupFn, labelFn);
      const engineResult = analyzeProduction(periodes, parRecette, horizon);

      setAnalysis({ periodes, parRecette, charts, ...engineResult });
    } catch (err) {
      console.error("[useProductionInsights]", err);
      setError("Impossible de charger les données de production.");
    } finally {
      setLoading(false);
    }
  }, [horizon, refreshKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { analysis, loading, error };
};

export default useProductionInsights;
