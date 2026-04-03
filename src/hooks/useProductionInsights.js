/**
 * useProductionInsights.js
 * Hook React pour les insights production.
 *
 * Requête directe Supabase (date_production range) → agrégations locales → analyzeProduction.
 *
 * Retourne : { analysis, loading, error }
 * analysis = {
 *   periodes, volume, cout, alertes, chartData,   ← depuis analyzeProduction
 *   schemas,     ← [{ nomSchema, categorie, count, coutTotal, coutUnitaireMoyen, rendementMoyen, ecartCoutTotal }]
 *   coutsChart,  ← [{ label, [schema]: coutTotal }] pour linechart interactif
 *   rendementMoyen, ← taux global
 * }
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/config/supabase";
import { analyzeProduction } from "@/utils/insightsToolkit/production/ProductionInsightsEngine";
import { HORIZONS } from "@/utils/insightsToolkit/engine/insightTypes";

// ─── Helpers date ─────────────────────────────────────────────────────────────

const toISO   = (d) => d.toISOString().slice(0, 10);
const today   = () => new Date();
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const getISOWeek = (d) => {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp - yearStart) / 86400_000 + 1) / 7);
};

const getWindowConfig = (horizon) => {
  const now = today();

  if (horizon === HORIZONS.H24) {
    const end   = addDays(now, -1);
    const start = addDays(now, -30);
    return {
      startDate:   toISO(start),
      endDate:     toISO(end),
      groupFn:     (d) => d,
      labelFn:     (key) => {
        const d = new Date(key + "T12:00:00");
        return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      },
      isCurrentFn: () => false,
    };
  }

  if (horizon === HORIZONS.J7) {
    const dow              = now.getDay() === 0 ? 7 : now.getDay();
    const lundiCetteSem    = addDays(now, -(dow - 1));
    const end              = addDays(lundiCetteSem, -1);
    const start            = addDays(end, -7 * 8 + 1);
    const lundiCourant     = toISO(lundiCetteSem);

    const getWeekKey = (dateStr) => {
      const d   = new Date(dateStr + "T12:00:00");
      const dw  = d.getDay() === 0 ? 7 : d.getDay();
      const lun = new Date(d);
      lun.setDate(d.getDate() - (dw - 1));
      return toISO(lun);
    };

    return {
      startDate:   toISO(start),
      endDate:     toISO(end),
      groupFn:     getWeekKey,
      labelFn:     (key) => {
        const d = new Date(key + "T12:00:00");
        return `S${getISOWeek(d)}`;
      },
      isCurrentFn: (key) => key === lundiCourant,
    };
  }

  // MOIS — 6 derniers mois complets
  const debutCeMois  = new Date(now.getFullYear(), now.getMonth(), 1);
  const finMoisPasse = new Date(debutCeMois - 1);
  const debutFenetre = new Date(finMoisPasse.getFullYear(), finMoisPasse.getMonth() - 5, 1);
  const moisCourant  = toISO(debutCeMois).slice(0, 7);

  return {
    startDate:   toISO(debutFenetre),
    endDate:     toISO(finMoisPasse),
    groupFn:     (d) => d.slice(0, 7),
    labelFn:     (key) => {
      const [y, m] = key.split("-").map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    },
    isCurrentFn: (key) => key === moisCourant,
  };
};

// ─── Agrégations locales ──────────────────────────────────────────────────────

const buildAggregations = (productions, groupFn, labelFn, isCurrentFn) => {
  const periodesMap = new Map(); // periodKey → { count, coutTotal, rendementSum, rendementN }
  const schemasMap  = new Map(); // nomSchema → { categorie, count, coutTotal, coutUnitaireSum, rendementSum, rendementN, ecartCoutTotal }
  const coutsMap    = new Map(); // nomSchema → Map(periodKey → coutTotal)
  const allKeys     = new Set();

  for (const prod of productions) {
    const dateStr = prod.date_production;
    if (!dateStr) continue;

    const key       = groupFn(dateStr);
    const nomSchema = prod.schema?.nom ?? prod.nom ?? "Inconnu";
    const categorie = prod.schema?.categorie ?? "autre";
    const cout      = prod.cout_total ?? 0;
    const coutU     = prod.cout_unitaire ?? 0;
    const rendt     = prod.taux_rendement;
    const ecart     = prod.ecart_cout ?? 0;

    allKeys.add(key);

    // ── Périodes ──
    if (!periodesMap.has(key)) periodesMap.set(key, { count: 0, coutTotal: 0, rendementSum: 0, rendementN: 0 });
    const per = periodesMap.get(key);
    per.count     += 1;
    per.coutTotal += cout;
    if (rendt != null) { per.rendementSum += rendt; per.rendementN += 1; }

    // ── Schémas ──
    if (!schemasMap.has(nomSchema)) {
      schemasMap.set(nomSchema, { categorie, count: 0, coutTotal: 0, coutUnitaireSum: 0, coutUnitaireN: 0, rendementSum: 0, rendementN: 0, ecartCoutTotal: 0 });
    }
    const sch = schemasMap.get(nomSchema);
    sch.count        += 1;
    sch.coutTotal    += cout;
    sch.ecartCoutTotal += ecart;
    if (coutU > 0) { sch.coutUnitaireSum += coutU; sch.coutUnitaireN += 1; }
    if (rendt != null) { sch.rendementSum += rendt; sch.rendementN += 1; }

    // ── Coûts par schéma par période ──
    if (!coutsMap.has(nomSchema)) coutsMap.set(nomSchema, new Map());
    const cm = coutsMap.get(nomSchema);
    cm.set(key, (cm.get(key) ?? 0) + cout);
  }

  // Périodes ordonnées
  const periodes = [...allKeys].sort().map((key) => {
    const { count, coutTotal } = periodesMap.get(key);
    return { label: labelFn(key), count, coutTotal, isCurrent: isCurrentFn(key) };
  });

  // Schémas triés par coût total desc
  const schemas = [...schemasMap.entries()]
    .map(([nomSchema, s]) => ({
      nomSchema,
      categorie:         s.categorie,
      count:             s.count,
      coutTotal:         s.coutTotal,
      coutUnitaireMoyen: s.coutUnitaireN > 0 ? s.coutUnitaireSum / s.coutUnitaireN : 0,
      rendementMoyen:    s.rendementN    > 0 ? s.rendementSum    / s.rendementN    : 0,
      ecartCoutTotal:    s.ecartCoutTotal,
    }))
    .sort((a, b) => b.coutTotal - a.coutTotal);

  // Rendement moyen global
  const totalRendSum = schemas.reduce((s, sc) => s + sc.rendementMoyen * sc.count, 0);
  const totalN       = schemas.reduce((s, sc) => s + (sc.rendementMoyen > 0 ? sc.count : 0), 0);
  const rendementMoyen = totalN > 0 ? totalRendSum / totalN : 0;

  // CoutsChart : par schéma (trié par coût desc) par période
  const sortedKeys = [...allKeys].sort();
  const coutsChart = sortedKeys.map((key) => {
    const point = { label: labelFn(key) };
    for (const { nomSchema } of schemas) {
      point[nomSchema] = coutsMap.get(nomSchema)?.get(key) ?? 0;
    }
    return point;
  });

  return { periodes, schemas, rendementMoyen, coutsChart };
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
      const { startDate, endDate, groupFn, labelFn, isCurrentFn } = getWindowConfig(horizon);

      const { data, error: dbErr } = await supabase
        .from("productions")
        .select(`
          date_production,
          nom,
          cout_total,
          cout_unitaire,
          taux_rendement,
          ecart_cout,
          rendement_reel,
          statut,
          schema:production_schemas(nom, categorie)
        `)
        .gte("date_production", startDate)
        .lte("date_production", endDate)
        .neq("statut", "annulee");

      if (dbErr) throw new Error(dbErr.message);

      const { periodes, schemas, rendementMoyen, coutsChart } = buildAggregations(
        data ?? [],
        groupFn,
        labelFn,
        isCurrentFn,
      );

      const computed = analyzeProduction(periodes, schemas, rendementMoyen, horizon);
      setAnalysis({ ...computed, schemas, coutsChart, rendementMoyen });
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
