/**
 * useFinanceInsights.js
 * Hook React pour les insights financiers.
 *
 * Fetch les données historiques selon l'horizon, les agrège en séries
 * par période (jour / semaine / mois), puis appelle FinanceInsightsEngine.
 *
 * Retourne : { analysis, loading, error }
 * analysis = { periodes, encaissements, depenses, revenus, alertes, chartData }
 */

import { useState, useEffect, useCallback } from "react";
import { getOperations, TYPES_OPERATION } from "@/utils/comptabiliteToolkit";
import { analyzeFinance } from "@/utils/insightsToolkit/finance/FinanceInsightsEngine";
import { HORIZONS } from "@/utils/insightsToolkit/engine/insightTypes";

// ─── Helpers date ─────────────────────────────────────────────────────────────

const toISO  = (d) => d.toISOString().slice(0, 10);
const today  = () => new Date();
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

/** Retourne { startDate, endDate, labelFn, groupFn } selon l'horizon */
const getWindowConfig = (horizon) => {
  const now = today();

  if (horizon === HORIZONS.H24) {
    // 30 derniers jours, granularité : jour
    const end   = addDays(now, -1); // hier inclus
    const start = addDays(now, -30);
    return {
      startDate: toISO(start),
      endDate:   toISO(end),
      groupFn:   (dateStr) => dateStr, // clé = YYYY-MM-DD
      labelFn:   (dateStr) => {
        const d = new Date(dateStr + "T12:00:00");
        return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      },
      isCurrentFn: () => false, // pas de "période en cours" dans l'historique H24
    };
  }

  if (horizon === HORIZONS.J7) {
    // 8 dernières semaines complètes, granularité : semaine (lun-dim)
    // Trouver le lundi de la semaine en cours
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1=lun … 7=dim
    const lundiCetteSemaine = addDays(now, -(dayOfWeek - 1));
    const end   = addDays(lundiCetteSemaine, -1); // dim de la semaine passée
    const start = addDays(end, -7 * 8 + 1);       // 8 semaines en arrière

    const getWeekKey = (dateStr) => {
      const d = new Date(dateStr + "T12:00:00");
      const dow = d.getDay() === 0 ? 7 : d.getDay();
      const lundi = new Date(d);
      lundi.setDate(d.getDate() - (dow - 1));
      return toISO(lundi);
    };

    const lundiCourant = toISO(lundiCetteSemaine);

    return {
      startDate:   toISO(start),
      endDate:     toISO(end),
      groupFn:     getWeekKey,
      labelFn:     (weekKey) => {
        const d = new Date(weekKey + "T12:00:00");
        return `S${getISOWeek(d)}`;
      },
      isCurrentFn: (key) => key === lundiCourant,
    };
  }

  // MOIS — 6 derniers mois complets, granularité : mois
  const debutCeMois = new Date(now.getFullYear(), now.getMonth(), 1);
  const finMoisPasse = new Date(debutCeMois - 1);
  const debutFenetre = new Date(finMoisPasse.getFullYear(), finMoisPasse.getMonth() - 5, 1);
  const moisCourant  = toISO(debutCeMois).slice(0, 7); // YYYY-MM

  return {
    startDate:   toISO(debutFenetre),
    endDate:     toISO(finMoisPasse),
    groupFn:     (dateStr) => dateStr.slice(0, 7), // YYYY-MM
    labelFn:     (moisKey) => {
      const [y, m] = moisKey.split("-").map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    },
    isCurrentFn: (key) => key === moisCourant,
  };
};

/** Numéro de semaine ISO */
const getISOWeek = (d) => {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp - yearStart) / 86400_000 + 1) / 7);
};

// ─── Parsing du motif de dépense ─────────────────────────────────────────────

/**
 * Extrait la catégorie réelle depuis le motif JSONB.
 * Format : "Achat légumes - Achat carottes" → "Achat légumes"
 */
const parseMotifCategorie = (rawMotif) => {
  try {
    const obj  = typeof rawMotif === "string" ? JSON.parse(rawMotif) : rawMotif;
    const text = obj?.motif ?? "";
    return text.split("-")[0].trim() || "Autre";
  } catch {
    const text = typeof rawMotif === "string" ? rawMotif : "";
    return text.split("-")[0].trim() || "Autre";
  }
};

// ─── Agrégation des motifs de dépenses ───────────────────────────────────────

/**
 * Produit, à partir des opérations brutes :
 *  - ranking  : [{ categorie, total, ratio }] trié par total desc
 *  - chartData: [{ label, [categorie]: montant, … }] par période chronologique
 */
const aggregerMotifs = (operations, groupFn, labelFn) => {
  const motifsMap    = new Map(); // categorie → Map(periodKey → montant)
  let   totalDep     = 0;
  const allPeriodKeys = new Set();

  for (const op of operations) {
    if (op.operation !== TYPES_OPERATION.DEPENSE) continue;

    const dateStr = op.date_operation?.slice(0, 10) ?? op.created_at?.slice(0, 10);
    if (!dateStr) continue;

    const key     = groupFn(dateStr);
    const cat     = parseMotifCategorie(op.motif);
    const montant = op.montant ?? 0;

    allPeriodKeys.add(key);
    totalDep += montant;

    if (!motifsMap.has(cat)) motifsMap.set(cat, new Map());
    const pm = motifsMap.get(cat);
    pm.set(key, (pm.get(key) ?? 0) + montant);
  }

  // Ranking (avec référence aux Maps internes pour le chartData)
  const sorted = [...motifsMap.entries()]
    .map(([categorie, pm]) => ({
      categorie,
      pm,
      total: [...pm.values()].reduce((s, v) => s + v, 0),
    }))
    .sort((a, b) => b.total - a.total);

  const ranking = sorted.map(({ categorie, total }) => ({
    categorie,
    total,
    ratio: totalDep > 0 ? total / totalDep : 0,
  }));

  // ChartData : une entrée par période chronologique
  const chartData = [...allPeriodKeys]
    .sort()
    .map((key) => {
      const point = { label: labelFn(key) };
      for (const { categorie, pm } of sorted) {
        point[categorie] = pm.get(key) ?? 0;
      }
      return point;
    });

  return { ranking, chartData };
};

// ─── Agrégation des opérations en périodes ───────────────────────────────────

const aggregerOperations = (operations, groupFn, labelFn, isCurrentFn) => {
  const map = new Map();

  for (const op of operations) {
    const dateStr = op.date_operation?.slice(0, 10) ?? op.created_at?.slice(0, 10);
    if (!dateStr) continue;

    const key = groupFn(dateStr);
    if (!map.has(key)) map.set(key, { enc: 0, dep: 0 });

    const bucket = map.get(key);
    const montant = op.montant ?? 0;
    if (op.operation === TYPES_OPERATION.ENCAISSEMENT) bucket.enc += montant;
    else if (op.operation === TYPES_OPERATION.DEPENSE)  bucket.dep += montant;
  }

  // Trier par clé chronologique
  const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));

  return sorted.map(([key, { enc, dep }]) => ({
    label:     labelFn(key),
    enc,
    dep,
    isCurrent: isCurrentFn(key),
  }));
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useFinanceInsights = (horizon = HORIZONS.H24, refreshKey = 0) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate, groupFn, labelFn, isCurrentFn } = getWindowConfig(horizon);

      // Fetch toutes les opérations de la fenêtre (pas de pagination — on veut tout)
      const result = await getOperations({ startDate, endDate, limit: 2000, offset: 0 });

      if (!result.success) throw new Error(result.error ?? "Erreur de chargement");

      const ops = result.operations ?? [];

      const periodes = aggregerOperations(ops, groupFn, labelFn, isCurrentFn);
      const motifData = aggregerMotifs(ops, groupFn, labelFn);

      const computed = analyzeFinance(periodes, horizon);
      setAnalysis({ ...computed, motifData });
    } catch (err) {
      console.error("[useFinanceInsights]", err);
      setError("Impossible de charger les données financières.");
    } finally {
      setLoading(false);
    }
  }, [horizon, refreshKey]);

  useEffect(() => { fetch(); }, [fetch]);

  return { analysis, loading, error };
};

export default useFinanceInsights;
