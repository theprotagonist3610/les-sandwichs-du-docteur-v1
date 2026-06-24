import { useState, useEffect, useCallback } from "react";
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

const fetchCommandes = async (dateFrom, dateTo) => {
  let query = supabase
    .from("commandes")
    .select("details_commandes, details_paiement, type, point_de_vente, client, created_at")
    .neq("statut_commande", "annulee");

  if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
  if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
};

const fetchMenu = async (menuId) => {
  const { data, error } = await supabase
    .from("menus")
    .select("id, nom, type, description, ingredients, indice_calorique, prix, statut, image_url")
    .eq("id", menuId)
    .single();
  if (error) throw error;
  return data;
};

const fetchEmplacements = async () => {
  const { data, error } = await supabase.from("emplacements").select("id, nom");
  if (error) throw error;
  return new Map((data ?? []).map((e) => [e.id, e.nom]));
};

// Compte total tous produits pour le rang
const countAllProducts = (commandes) => {
  const seen = new Set();
  for (const cmd of commandes) {
    for (const item of cmd.details_commandes ?? []) {
      seen.add(item.menu_id || item.item);
    }
  }
  return seen.size;
};

// Classement par quantité et par CA
const computeRangs = (commandes, menuId) => {
  const map = new Map();
  for (const cmd of commandes) {
    for (const item of cmd.details_commandes ?? []) {
      const key = item.menu_id || item.item;
      if (!map.has(key)) map.set(key, { qty: 0, ca: 0 });
      const e = map.get(key);
      e.qty += item.quantite ?? 1;
      e.ca += item.total ?? (item.quantite ?? 1) * (item.prix_unitaire ?? 0);
    }
  }
  const byQty = [...map.entries()].sort((a, b) => b[1].qty - a[1].qty);
  const byCA = [...map.entries()].sort((a, b) => b[1].ca - a[1].ca);
  const rangQty = byQty.findIndex(([k]) => k === menuId) + 1;
  const rangCA = byCA.findIndex(([k]) => k === menuId) + 1;
  return { par_quantite: rangQty || null, par_ca: rangCA || null, total_produits: map.size };
};

const analyze = (commandes, menuId, emplacementsMap) => {
  let quantite_totale = 0;
  let ca_total = 0;
  const commandeIds = new Set();
  const parType = {};
  const parPdv = new Map();
  const parPaiement = { momo: 0, cash: 0, autre: 0 };
  const timelineMap = new Map();
  const parJour = Array.from({ length: 7 }, (_, i) => ({ jour: JOURS[i], quantite: 0, ca: 0 }));
  const parHeure = Array.from({ length: 24 }, (_, i) => ({ heure: i, quantite: 0 }));
  const clientsMap = new Map();

  for (const cmd of commandes) {
    const items = (cmd.details_commandes ?? []).filter(
      (it) => (it.menu_id === menuId) || (!it.menu_id && it.item === menuId)
    );
    if (items.length === 0) continue;

    for (const item of items) {
      const qty = item.quantite ?? 1;
      const itemCA = item.total ?? qty * (item.prix_unitaire ?? 0);
      quantite_totale += qty;
      ca_total += itemCA;
      commandeIds.add(cmd.created_at);

      // Par type de commande
      const t = cmd.type || "sur-place";
      if (!parType[t]) parType[t] = { quantite: 0, ca: 0 };
      parType[t].quantite += qty;
      parType[t].ca += itemCA;

      // Par PDV
      const pdvId = cmd.point_de_vente;
      if (pdvId) {
        if (!parPdv.has(pdvId)) parPdv.set(pdvId, { pdv_id: pdvId, pdv_nom: emplacementsMap.get(pdvId) || "Inconnu", quantite: 0, ca: 0 });
        const pdv = parPdv.get(pdvId);
        pdv.quantite += qty;
        pdv.ca += itemCA;
      }

      // Timeline
      const dateKey = cmd.created_at?.slice(0, 10);
      if (dateKey) {
        if (!timelineMap.has(dateKey)) timelineMap.set(dateKey, { date: dateKey, quantite: 0, ca: 0 });
        const tl = timelineMap.get(dateKey);
        tl.quantite += qty;
        tl.ca += itemCA;
      }

      // Jour de semaine + heure
      if (cmd.created_at) {
        const d = new Date(cmd.created_at);
        parJour[d.getDay()].quantite += qty;
        parJour[d.getDay()].ca += itemCA;
        parHeure[d.getHours()].quantite += qty;
      }

      // Clients
      const client = cmd.client || "Inconnu";
      if (!clientsMap.has(client)) clientsMap.set(client, { client, nb_commandes: 0, quantite: 0 });
      const cl = clientsMap.get(client);
      cl.quantite += qty;
    }

    // Comptabiliser une commande par client
    const client = cmd.client || "Inconnu";
    if (clientsMap.has(client)) clientsMap.get(client).nb_commandes++;

    // Répartition paiement (proportionnelle au poids de ce produit dans la commande)
    const totalCmd = cmd.details_paiement?.total || 1;
    const itemsCA = items.reduce((s, it) => s + (it.total ?? (it.quantite ?? 1) * (it.prix_unitaire ?? 0)), 0);
    const ratio = totalCmd > 0 ? itemsCA / totalCmd : 0;
    parPaiement.momo += Math.round((cmd.details_paiement?.momo || 0) * ratio);
    parPaiement.cash += Math.round((cmd.details_paiement?.cash || 0) * ratio);
    parPaiement.autre += Math.round((cmd.details_paiement?.autre || 0) * ratio);
  }

  const nb_commandes = commandeIds.size;

  // Lun→Dim order
  const parJourSemaine = [parJour[1], parJour[2], parJour[3], parJour[4], parJour[5], parJour[6], parJour[0]];

  return {
    quantite_totale,
    ca_total,
    ca_apres_promo: ca_total,
    nb_commandes,
    prix_moyen_vente: quantite_totale > 0 ? Math.round(ca_total / quantite_totale) : 0,
    marge_promo: 0,
    par_type: parType,
    par_pdv: [...parPdv.values()].sort((a, b) => b.ca - a.ca),
    par_paiement: parPaiement,
    timeline: [...timelineMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    par_jour_semaine: parJourSemaine,
    par_heure: parHeure.filter((h) => h.quantite > 0),
    top_clients: [...clientsMap.values()].sort((a, b) => b.quantite - a.quantite).slice(0, 10),
  };
};

const useProduct = ({ menuId, dateFrom, dateTo } = {}) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!menuId) return;
    setLoading(true);
    setError(null);

    try {
      const [menu, commandes, emplacementsMap] = await Promise.all([
        fetchMenu(menuId),
        fetchCommandes(dateFrom, dateTo),
        fetchEmplacements(),
      ]);

      const stats = analyze(commandes, menuId, emplacementsMap);
      const rang = computeRangs(commandes, menuId);

      // Tendance vs N-1
      let tendance = null;
      if (dateFrom && dateTo) {
      const { prevFrom, prevTo } = getPreviousPeriod(dateFrom, dateTo);
      try {
        const prevCommandes = await fetchCommandes(prevFrom, prevTo);
        const prevStats = analyze(prevCommandes, menuId, emplacementsMap);
        tendance = {
          quantite: {
            actuel: stats.quantite_totale,
            precedent: prevStats.quantite_totale,
            variation: prevStats.quantite_totale > 0
              ? Math.round(((stats.quantite_totale - prevStats.quantite_totale) / prevStats.quantite_totale) * 1000) / 10
              : null,
          },
          ca: {
            actuel: stats.ca_total,
            precedent: prevStats.ca_total,
            variation: prevStats.ca_total > 0
              ? Math.round(((stats.ca_total - prevStats.ca_total) / prevStats.ca_total) * 1000) / 10
              : null,
          },
          prix_moyen: {
            actuel: stats.prix_moyen_vente,
            precedent: prevStats.prix_moyen_vente,
            variation: prevStats.prix_moyen_vente > 0
              ? Math.round(((stats.prix_moyen_vente - prevStats.prix_moyen_vente) / prevStats.prix_moyen_vente) * 1000) / 10
              : null,
          },
        };
      } catch { /* expected */ }
      }

      setProduct({
        menu_id: menu.id,
        nom: menu.nom,
        type: menu.type,
        image_url: menu.image_url,
        prix_catalogue: menu.prix,
        statut: menu.statut,
        ingredients: menu.ingredients || [],
        ...stats,
        tendance,
        rang,
      });
    } catch (err) {
      setError(err.message || "Erreur lors du chargement des statistiques produit");
    } finally {
      setLoading(false);
    }
  }, [menuId, dateFrom, dateTo]);

  useEffect(() => { fetch(); }, [fetch]);

  return { product, loading, error, refetch: fetch };
};

export default useProduct;
