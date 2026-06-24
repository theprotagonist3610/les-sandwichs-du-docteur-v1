import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

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

const fetchCommandes = async (dateFrom, dateTo, pointDeVente) => {
  let query = supabase
    .from("commandes")
    .select("details_commandes, details_paiement, type, point_de_vente, created_at")
    .neq("statut_commande", "annulee");

  if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
  if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);

  if (pointDeVente) query = query.eq("point_de_vente", pointDeVente);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
};

const fetchMenus = async () => {
  const { data, error } = await supabase.from("menus").select("id, nom, type, image_url, prix");
  if (error) throw error;
  return data ?? [];
};

const aggregate = (commandes, menusMap) => {
  const prodMap = new Map();
  let globalCA = 0;
  let globalQty = 0;

  for (const cmd of commandes) {
    const items = Array.isArray(cmd.details_commandes) ? cmd.details_commandes : [];
    for (const item of items) {
      const key = item.menu_id || item.item;
      if (!key) continue;

      if (!prodMap.has(key)) {
        const menu = item.menu_id ? menusMap.get(item.menu_id) : null;
        prodMap.set(key, {
          menu_id: item.menu_id || null,
          nom: menu?.nom || item.item || "Inconnu",
          type: menu?.type || null,
          image_url: menu?.image_url || null,
          prix_catalogue: menu?.prix || item.prix_unitaire || 0,
          quantite_totale: 0,
          ca_total: 0,
          nb_commandes: 0,
          _commandeIds: new Set(),
        });
      }

      const p = prodMap.get(key);
      const qty = item.quantite ?? 1;
      const itemCA = item.total ?? qty * (item.prix_unitaire ?? 0);
      p.quantite_totale += qty;
      p.ca_total += itemCA;
      p._commandeIds.add(cmd.created_at);
      globalCA += itemCA;
      globalQty += qty;
    }
  }

  const products = [];
  for (const [, p] of prodMap) {
    p.nb_commandes = p._commandeIds.size;
    delete p._commandeIds;
    p.ca_apres_promo = p.ca_total;
    p.quantite_moyenne_par_commande = p.nb_commandes > 0
      ? Math.round((p.quantite_totale / p.nb_commandes) * 10) / 10
      : 0;
    p.prix_moyen_vente = p.quantite_totale > 0
      ? Math.round(p.ca_total / p.quantite_totale)
      : 0;
    p.part_ca = globalCA > 0 ? Math.round((p.ca_total / globalCA) * 1000) / 1000 : 0;
    p.part_volume = globalQty > 0 ? Math.round((p.quantite_totale / globalQty) * 1000) / 1000 : 0;
    p.tendance_quantite = null;
    p.tendance_ca = null;
    products.push(p);
  }

  return {
    products,
    totaux: {
      ca_total: globalCA,
      quantite_totale: globalQty,
      nb_commandes: commandes.length,
      nb_produits_distincts: products.length,
    },
  };
};

const computeTendances = (current, previous) => {
  const prevMap = new Map();
  for (const p of previous.products) {
    prevMap.set(p.menu_id || p.nom, p);
  }
  for (const p of current.products) {
    const prev = prevMap.get(p.menu_id || p.nom);
    if (prev && prev.quantite_totale > 0) {
      p.tendance_quantite = Math.round(((p.quantite_totale - prev.quantite_totale) / prev.quantite_totale) * 1000) / 10;
      p.tendance_ca = Math.round(((p.ca_total - prev.ca_total) / prev.ca_total) * 1000) / 10;
    }
  }
};

const sortProducts = (products, sortBy, sortOrder) => {
  const dir = sortOrder === "asc" ? 1 : -1;
  return [...products].sort((a, b) => {
    if (sortBy === "nom") return dir * a.nom.localeCompare(b.nom);
    return dir * ((a[sortBy] ?? 0) - (b[sortBy] ?? 0));
  });
};

const useSummaryOfProducts = ({
  dateFrom,
  dateTo,
  type = null,
  pointDeVente = null,
  sortBy = "quantite_totale",
  sortOrder = "desc",
} = {}) => {
  const [data, setData] = useState({ products: [], totaux: { ca_total: 0, quantite_totale: 0, nb_commandes: 0, nb_produits_distincts: 0 } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    // dateFrom/dateTo can be null (= all time)
    setLoading(true);
    setError(null);

    try {
      const [commandes, menus] = await Promise.all([
        fetchCommandes(dateFrom, dateTo, pointDeVente),
        fetchMenus(),
      ]);

      const menusMap = new Map(menus.map((m) => [m.id, m]));
      const result = aggregate(commandes, menusMap);

      // Tendances vs période N-1
      if (!dateFrom || !dateTo) { setData(result); setLoading(false); return; }
      const { prevFrom, prevTo } = getPreviousPeriod(dateFrom, dateTo);
      try {
        const prevCommandes = await fetchCommandes(prevFrom, prevTo, pointDeVente);
        const prevResult = aggregate(prevCommandes, menusMap);
        computeTendances(result, prevResult);
      } catch { /* expected — pas de données N-1 */ }

      // Filtre par type de menu
      if (type) {
        result.products = result.products.filter((p) => p.type === type);
      }

      setData(result);
    } catch (err) {
      setError(err.message || "Erreur lors du chargement des statistiques produits");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, type, pointDeVente]);

  useEffect(() => { fetch(); }, [fetch]);

  const sorted = useMemo(
    () => ({ ...data, products: sortProducts(data.products, sortBy, sortOrder) }),
    [data, sortBy, sortOrder]
  );

  return { ...sorted, loading, error, refetch: fetch };
};

export default useSummaryOfProducts;
