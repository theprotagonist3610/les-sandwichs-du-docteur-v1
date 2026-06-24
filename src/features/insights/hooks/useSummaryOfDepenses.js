import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { COMPTE_LABELS } from "@/features/comptabilite/utils/comptabiliteToolkit";

const getPreviousPeriod = (dateFrom, dateTo) => {
  const from = new Date(dateFrom + "T12:00:00");
  const to = new Date(dateTo + "T12:00:00");
  const durationMs = to - from;
  const prevTo = new Date(from.getTime() - 86400000);
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  return {
    prevFrom: prevFrom.toISOString().slice(0, 10),
    prevTo: prevTo.toISOString().slice(0, 10),
  };
};

const fetchDepenses = async (dateFrom, dateTo, compte, emplacement) => {
  let query = supabase
    .from("operations_comptables")
    .select("id, montant, motif, compte, date_operation, created_at")
    .eq("operation", "depense");

  if (dateFrom) query = query.gte("date_operation", dateFrom);
  if (dateTo) query = query.lte("date_operation", dateTo);

  if (compte) query = query.eq("compte", compte);
  if (emplacement) query = query.contains("motif", { emplacement });

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
};

const extractCategorie = (motif) => {
  const text = typeof motif === "object" ? motif?.motif : motif;
  if (!text) return "Non classé";
  const idx = text.indexOf(" - ");
  return idx > 0 ? text.slice(0, idx) : text;
};

const aggregate = (depenses) => {
  const catMap = new Map();
  let globalMontant = 0;

  for (const op of depenses) {
    const cat = extractCategorie(op.motif);
    const montant = parseFloat(op.montant) || 0;
    const motifObj = typeof op.motif === "object" ? op.motif : {};
    const qty = motifObj.quantite || 0;
    const unite = motifObj.unite || "";

    if (!catMap.has(cat)) {
      catMap.set(cat, {
        categorie: cat,
        montant_total: 0,
        nb_operations: 0,
        quantite_totale: 0,
        unites: {},
        par_compte: {},
      });
    }

    const c = catMap.get(cat);
    c.montant_total += montant;
    c.nb_operations += 1;
    c.quantite_totale += qty;
    if (unite) c.unites[unite] = (c.unites[unite] || 0) + 1;
    c.par_compte[op.compte] = (c.par_compte[op.compte] || 0) + montant;
    globalMontant += montant;
  }

  const categories = [];
  for (const [, c] of catMap) {
    const uniteEntries = Object.entries(c.unites);
    c.unite_principale = uniteEntries.length > 0
      ? uniteEntries.sort((a, b) => b[1] - a[1])[0][0]
      : null;
    delete c.unites;

    c.montant_moyen = c.nb_operations > 0 ? Math.round(c.montant_total / c.nb_operations) : 0;
    c.quantite_moyenne = c.nb_operations > 0 ? Math.round((c.quantite_totale / c.nb_operations) * 10) / 10 : 0;
    c.prix_unitaire_moyen = c.quantite_totale > 0 ? Math.round(c.montant_total / c.quantite_totale) : 0;
    c.part_budget = globalMontant > 0 ? Math.round((c.montant_total / globalMontant) * 1000) / 1000 : 0;
    c.tendance_montant = null;
    c.tendance_quantite = null;
    categories.push(c);
  }

  // Top 3 opérations les plus chères
  const top_operations = [...depenses]
    .sort((a, b) => (parseFloat(b.montant) || 0) - (parseFloat(a.montant) || 0))
    .slice(0, 3)
    .map((op) => ({
      montant: parseFloat(op.montant) || 0,
      motif: typeof op.motif === "object" ? op.motif.motif : op.motif,
      date: op.date_operation,
      compte: op.compte,
    }));

  // Nb jours de la période
  const dates = new Set(depenses.map((op) => op.date_operation));
  const nbJours = Math.max(dates.size, 1);

  return {
    categories,
    totaux: {
      montant_total: globalMontant,
      nb_operations: depenses.length,
      nb_categories: categories.length,
      montant_moyen_par_jour: Math.round(globalMontant / nbJours),
    },
    top_operations,
  };
};

const computeTendances = (current, previous) => {
  const prevMap = new Map(previous.categories.map((c) => [c.categorie, c]));
  for (const c of current.categories) {
    const prev = prevMap.get(c.categorie);
    if (prev && prev.montant_total > 0) {
      c.tendance_montant = Math.round(((c.montant_total - prev.montant_total) / prev.montant_total) * 1000) / 10;
    }
    if (prev && prev.quantite_totale > 0) {
      c.tendance_quantite = Math.round(((c.quantite_totale - prev.quantite_totale) / prev.quantite_totale) * 1000) / 10;
    }
  }
};

const sortCategories = (categories, sortBy, sortOrder) => {
  const dir = sortOrder === "asc" ? 1 : -1;
  return [...categories].sort((a, b) => {
    if (sortBy === "categorie") return dir * a.categorie.localeCompare(b.categorie);
    return dir * ((a[sortBy] ?? 0) - (b[sortBy] ?? 0));
  });
};

const useSummaryOfDepenses = ({
  dateFrom,
  dateTo,
  compte = null,
  emplacement = null,
  sortBy = "montant_total",
  sortOrder = "desc",
} = {}) => {
  const [data, setData] = useState({ categories: [], totaux: { montant_total: 0, nb_operations: 0, nb_categories: 0, montant_moyen_par_jour: 0 }, top_operations: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    // dateFrom/dateTo can be null (= all time)
    setLoading(true);
    setError(null);

    try {
      const depenses = await fetchDepenses(dateFrom, dateTo, compte, emplacement);
      const result = aggregate(depenses);

      if (dateFrom && dateTo) {
      const { prevFrom, prevTo } = getPreviousPeriod(dateFrom, dateTo);
      try {
        const prevDepenses = await fetchDepenses(prevFrom, prevTo, compte, emplacement);
        const prevResult = aggregate(prevDepenses);
        computeTendances(result, prevResult);
      } catch { /* expected */ }
      }

      setData(result);
    } catch (err) {
      setError(err.message || "Erreur lors du chargement des dépenses");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, compte, emplacement]);

  useEffect(() => { fetch(); }, [fetch]);

  const sorted = useMemo(
    () => ({ ...data, categories: sortCategories(data.categories, sortBy, sortOrder) }),
    [data, sortBy, sortOrder]
  );

  return { ...sorted, loading, error, refetch: fetch };
};

export default useSummaryOfDepenses;
