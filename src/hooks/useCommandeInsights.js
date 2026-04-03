/**
 * useCommandeInsights.js
 * Hook React pour les insights commandes.
 *
 * Requête directe Supabase (avec plage de dates) → agrégations locales → analyzeCommandes.
 *
 * Retourne : { analysis, loading, error }
 * analysis = {
 *   periodes, volume, ca, panier, alertes, chartData,  ← depuis analyzeCommandes
 *   menus,   ← [{ nom, quantite, ca, ratio }] triés par quantite desc
 *   jours,   ← [{ idx, label, volume, ca }] lun→dim
 *   pdv,     ← [{ nom, volume, ca, ratio }] triés par ca desc
 * }
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/config/supabase";
import { analyzeCommandes } from "@/utils/insightsToolkit/commandes/CommandeInsightsEngine";
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
      endDate:     toISO(end) + "T23:59:59",
      groupFn:     (dateStr) => dateStr.slice(0, 10),
      labelFn:     (key) => {
        const d = new Date(key + "T12:00:00");
        return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      },
      isCurrentFn: () => false,
    };
  }

  if (horizon === HORIZONS.J7) {
    const dayOfWeek        = now.getDay() === 0 ? 7 : now.getDay();
    const lundiCetteSemaine = addDays(now, -(dayOfWeek - 1));
    const end              = addDays(lundiCetteSemaine, -1);
    const start            = addDays(end, -7 * 8 + 1);
    const lundiCourant     = toISO(lundiCetteSemaine);

    const getWeekKey = (dateStr) => {
      const d   = new Date(dateStr + "T12:00:00");
      const dow = d.getDay() === 0 ? 7 : d.getDay();
      const lundi = new Date(d);
      lundi.setDate(d.getDate() - (dow - 1));
      return toISO(lundi);
    };

    return {
      startDate:   toISO(start),
      endDate:     toISO(end) + "T23:59:59",
      groupFn:     (dateStr) => getWeekKey(dateStr),
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
    endDate:     toISO(finMoisPasse) + "T23:59:59",
    groupFn:     (dateStr) => dateStr.slice(0, 7),
    labelFn:     (key) => {
      const [y, m] = key.split("-").map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    },
    isCurrentFn: (key) => key === moisCourant,
  };
};

// ─── Ordre lun→dim ────────────────────────────────────────────────────────────

const JOURS_SEMAINE = [
  { idx: 1, label: "Lun" },
  { idx: 2, label: "Mar" },
  { idx: 3, label: "Mer" },
  { idx: 4, label: "Jeu" },
  { idx: 5, label: "Ven" },
  { idx: 6, label: "Sam" },
  { idx: 0, label: "Dim" },
];

// ─── Agrégations locales ──────────────────────────────────────────────────────

const buildAggregations = (commandes, groupFn, labelFn, isCurrentFn) => {
  const periodesMap = new Map();
  const menusMap    = new Map();
  const joursMap    = new Map();
  const pdvMap      = new Map();

  for (const { idx, label } of JOURS_SEMAINE) {
    joursMap.set(idx, { idx, label, volume: 0, ca: 0 });
  }

  let totalCA = 0;

  for (const commande of commandes) {
    const dateStr = commande.created_at?.slice(0, 10);
    if (!dateStr) continue;

    const key     = groupFn(dateStr);
    const montant = commande.details_paiement?.total_apres_reduction
                 ?? commande.details_paiement?.total
                 ?? 0;
    const details = Array.isArray(commande.details_commandes) ? commande.details_commandes : [];

    // ── Périodes ──
    if (!periodesMap.has(key)) periodesMap.set(key, { volume: 0, ca: 0 });
    const p = periodesMap.get(key);
    p.volume += 1;
    p.ca     += montant;
    totalCA  += montant;

    // ── Menus ──
    for (const item of details) {
      const nom    = item.item ?? "Inconnu";
      const qty    = item.quantite ?? 1;
      const itemCA = item.total ?? (qty * (item.prix_unitaire ?? 0));
      if (!menusMap.has(nom)) menusMap.set(nom, { nom, quantite: 0, ca: 0 });
      const m = menusMap.get(nom);
      m.quantite += qty;
      m.ca       += itemCA;
    }

    // ── Jours ──
    const dow      = new Date(dateStr + "T12:00:00").getDay();
    const jourBucket = joursMap.get(dow);
    if (jourBucket) {
      jourBucket.volume += 1;
      jourBucket.ca     += montant;
    }

    // ── PDV ──
    const pdvNom = commande.point_de_vente_info?.nom ?? "Inconnu";
    if (!pdvMap.has(pdvNom)) pdvMap.set(pdvNom, { nom: pdvNom, volume: 0, ca: 0 });
    const pdv = pdvMap.get(pdvNom);
    pdv.volume += 1;
    pdv.ca     += montant;
  }

  // Périodes ordonnées chronologiquement
  const periodes = [...periodesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { volume, ca }]) => ({
      label:     labelFn(key),
      volume,
      ca,
      isCurrent: isCurrentFn(key),
    }));

  // Menus triés par CA desc + ratio
  const menus = [...menusMap.values()]
    .sort((a, b) => b.ca - a.ca)
    .map((m) => ({ ...m, ratio: totalCA > 0 ? m.ca / totalCA : 0 }));

  // Jours lun→dim (ordre fixe)
  const jours = JOURS_SEMAINE.map(({ idx }) => joursMap.get(idx));

  // PDV triés par CA desc + ratio
  const totalCAPDV = [...pdvMap.values()].reduce((s, pdv) => s + pdv.ca, 0);
  const pdv = [...pdvMap.values()]
    .sort((a, b) => b.ca - a.ca)
    .map((pdvEntry) => ({ ...pdvEntry, ratio: totalCAPDV > 0 ? pdvEntry.ca / totalCAPDV : 0 }));

  return { periodes, menus, jours, pdv };
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useCommandeInsights = (horizon = HORIZONS.H24, refreshKey = 0) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate, groupFn, labelFn, isCurrentFn } = getWindowConfig(horizon);

      const { data, error: dbErr } = await supabase
        .from("commandes")
        .select(`
          created_at,
          details_commandes,
          details_paiement,
          point_de_vente_info:emplacements!point_de_vente(id, nom)
        `)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .neq("statut_commande", "annulee");

      if (dbErr) throw new Error(dbErr.message);

      const { periodes, menus, jours, pdv } = buildAggregations(
        data ?? [],
        groupFn,
        labelFn,
        isCurrentFn,
      );

      const computed = analyzeCommandes(periodes, horizon);
      setAnalysis({ ...computed, menus, jours, pdv });
    } catch (err) {
      console.error("[useCommandeInsights]", err);
      setError("Impossible de charger les données de commandes.");
    } finally {
      setLoading(false);
    }
  }, [horizon, refreshKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { analysis, loading, error };
};

export default useCommandeInsights;
