import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { COMPTE_LABELS } from "@/features/comptabilite/utils/comptabiliteToolkit";

const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const getPreviousPeriod = (dateFrom, dateTo) => {
  const from = new Date(dateFrom + "T12:00:00");
  const to = new Date(dateTo + "T12:00:00");
  const durationMs = to - from;
  const prevTo = new Date(from.getTime() - 86400000);
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  return { prevFrom: prevFrom.toISOString().slice(0, 10), prevTo: prevTo.toISOString().slice(0, 10) };
};

const fetchDepenses = async (dateFrom, dateTo) => {
  let query = supabase
    .from("operations_comptables")
    .select(`*, user:users!user_id(id, nom, prenoms)`)
    .eq("operation", "depense")
    .order("date_operation", { ascending: false });

  if (dateFrom) query = query.gte("date_operation", dateFrom);
  if (dateTo) query = query.lte("date_operation", dateTo);
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

const computeRang = (allDepenses, categorie) => {
  const catTotals = new Map();
  for (const op of allDepenses) {
    const cat = extractCategorie(op.motif);
    catTotals.set(cat, (catTotals.get(cat) || 0) + (parseFloat(op.montant) || 0));
  }
  const sorted = [...catTotals.entries()].sort((a, b) => b[1] - a[1]);
  const rang = sorted.findIndex(([c]) => c === categorie) + 1;
  return { par_montant: rang || null, total_categories: catTotals.size };
};

const analyze = (depenses, categorie) => {
  const ops = depenses.filter((op) => extractCategorie(op.motif) === categorie);
  const allMontant = depenses.reduce((s, op) => s + (parseFloat(op.montant) || 0), 0);

  let montant_total = 0;
  let quantite_totale = 0;
  const unites = {};
  const timelineMap = new Map();
  const parJour = Array.from({ length: 7 }, (_, i) => ({ jour: JOURS[i], montant: 0, nb: 0 }));
  const parEmplacement = new Map();
  const parCompte = new Map();
  const parUtilisateur = new Map();

  for (const op of ops) {
    const montant = parseFloat(op.montant) || 0;
    const motifObj = typeof op.motif === "object" ? op.motif : {};
    const qty = motifObj.quantite || 0;
    const unite = motifObj.unite || "";
    const empl = motifObj.emplacement || "Non spécifié";
    const userName = op.user ? `${op.user.prenoms} ${op.user.nom}`.trim() : "Inconnu";
    const userId = op.user?.id || "unknown";

    montant_total += montant;
    quantite_totale += qty;
    if (unite) unites[unite] = (unites[unite] || 0) + 1;

    // Timeline
    const dateKey = op.date_operation;
    if (dateKey) {
      if (!timelineMap.has(dateKey)) timelineMap.set(dateKey, { date: dateKey, montant: 0, quantite: 0 });
      const tl = timelineMap.get(dateKey);
      tl.montant += montant;
      tl.quantite += qty;
    }

    // Jour semaine
    if (op.date_operation) {
      const d = new Date(op.date_operation + "T12:00:00");
      parJour[d.getDay()].montant += montant;
      parJour[d.getDay()].nb += 1;
    }

    // Emplacement
    if (!parEmplacement.has(empl)) parEmplacement.set(empl, { emplacement: empl, montant: 0, nb: 0 });
    const e = parEmplacement.get(empl);
    e.montant += montant;
    e.nb += 1;

    // Compte
    if (!parCompte.has(op.compte)) parCompte.set(op.compte, { compte: op.compte, label: COMPTE_LABELS[op.compte] || op.compte, montant: 0, nb: 0 });
    const co = parCompte.get(op.compte);
    co.montant += montant;
    co.nb += 1;

    // Utilisateur
    if (!parUtilisateur.has(userId)) parUtilisateur.set(userId, { user_id: userId, nom: userName, montant: 0, nb: 0 });
    const u = parUtilisateur.get(userId);
    u.montant += montant;
    u.nb += 1;
  }

  const uniteEntries = Object.entries(unites);
  const unite_principale = uniteEntries.length > 0 ? uniteEntries.sort((a, b) => b[1] - a[1])[0][0] : null;

  // Lun→Dim
  const parJourSemaine = [parJour[1], parJour[2], parJour[3], parJour[4], parJour[5], parJour[6], parJour[0]];

  // Opérations récentes (top 20)
  const operations_recentes = ops.slice(0, 20).map((op) => {
    const motifObj = typeof op.motif === "object" ? op.motif : {};
    return {
      id: op.id,
      montant: parseFloat(op.montant) || 0,
      motif: motifObj.motif || "",
      quantite: motifObj.quantite || 0,
      unite: motifObj.unite || "",
      date: op.date_operation,
      compte: op.compte,
      user_nom: op.user ? `${op.user.prenoms} ${op.user.nom}`.trim() : "Inconnu",
    };
  });

  return {
    categorie,
    montant_total,
    nb_operations: ops.length,
    quantite_totale,
    unite_principale,
    montant_moyen: ops.length > 0 ? Math.round(montant_total / ops.length) : 0,
    prix_unitaire_moyen: quantite_totale > 0 ? Math.round(montant_total / quantite_totale) : 0,
    part_budget: allMontant > 0 ? Math.round((montant_total / allMontant) * 1000) / 1000 : 0,
    timeline: [...timelineMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    par_jour_semaine: parJourSemaine,
    par_emplacement: [...parEmplacement.values()].sort((a, b) => b.montant - a.montant),
    par_compte: [...parCompte.values()].sort((a, b) => b.montant - a.montant),
    par_utilisateur: [...parUtilisateur.values()].sort((a, b) => b.montant - a.montant),
    operations_recentes,
  };
};

const useDepense = ({ categorie, dateFrom, dateTo } = {}) => {
  const [depense, setDepense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!categorie) return;
    setLoading(true);
    setError(null);

    try {
      const depenses = await fetchDepenses(dateFrom, dateTo);
      const stats = analyze(depenses, categorie);
      const rang = computeRang(depenses, categorie);

      // Tendance N-1
      let tendance = null;
      if (dateFrom && dateTo) {
      const { prevFrom, prevTo } = getPreviousPeriod(dateFrom, dateTo);
      try {
        const prevDepenses = await fetchDepenses(prevFrom, prevTo);
        const prevStats = analyze(prevDepenses, categorie);
        const pct = (a, b) => b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : null;
        tendance = {
          montant: { actuel: stats.montant_total, precedent: prevStats.montant_total, variation: pct(stats.montant_total, prevStats.montant_total) },
          quantite: { actuel: stats.quantite_totale, precedent: prevStats.quantite_totale, variation: pct(stats.quantite_totale, prevStats.quantite_totale) },
          prix_unitaire: { actuel: stats.prix_unitaire_moyen, precedent: prevStats.prix_unitaire_moyen, variation: pct(stats.prix_unitaire_moyen, prevStats.prix_unitaire_moyen) },
          nb_operations: { actuel: stats.nb_operations, precedent: prevStats.nb_operations, variation: pct(stats.nb_operations, prevStats.nb_operations) },
        };
      } catch { /* expected */ }
      }

      setDepense({ ...stats, tendance, rang });
    } catch (err) {
      setError(err.message || "Erreur lors du chargement de la catégorie");
    } finally {
      setLoading(false);
    }
  }, [categorie, dateFrom, dateTo]);

  useEffect(() => { fetch(); }, [fetch]);

  return { depense, loading, error, refetch: fetch };
};

export default useDepense;
