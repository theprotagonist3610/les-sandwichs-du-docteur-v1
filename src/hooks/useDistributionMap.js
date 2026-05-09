/**
 * useDistributionMap.js
 * Charge les données nécessaires à la carte de distribution :
 *   - emplacement de type "base" (centre de la carte)
 *   - zones de distribution (cercles)
 *   - stats agrégées par zone sur la période sélectionnée
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/config/supabase";

// ─── Helpers période ──────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

const debutPeriode = (periode) => {
  const n = new Date();
  if (periode === "jour") return today();
  if (periode === "j7")   return new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10); // mois
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useDistributionMap = () => {
  const [periode,  setPeriode]  = useState("j7");
  const [base,     setBase]     = useState(null);   // { lat, lng, nom }
  const [zones,    setZones]    = useState([]);      // zones enrichies de stats
  const [loading,  setLoading]  = useState(true);

  const charger = useCallback(async () => {
    setLoading(true);

    const fin   = today();
    const debut = debutPeriode(periode);

    const [baseRes, zonesRes, tourneesRes] = await Promise.all([
      // 1. Emplacement de base
      supabase
        .from("emplacements")
        .select("lat, lng, nom")
        .eq("type", "base")
        .limit(1)
        .maybeSingle(),

      // 2. Toutes les zones
      supabase
        .from("zones_distribution")
        .select("id, nom, description, departement, arrondissement, commune, quartiers, centre, rayon"),

      // 3. Tournées de la période avec lignes + zone du distributeur
      supabase
        .from("tournees_distribution")
        .select(`
          id_distributeur,
          distributeur:distributeurs_eligibles!inner(id_zone, taux_ristourne),
          lignes:lignes_tournee(quantite_recue, quantite_recuperee, prix_unitaire_applique)
        `)
        .gte("date_tournee", debut)
        .lte("date_tournee", fin),
    ]);

    // ── Agrégation des stats par id_zone ──────────────────────────────────────
    const statsMap = {};

    for (const t of tourneesRes.data ?? []) {
      const idZone = t.distributeur?.id_zone;
      if (!idZone) continue;

      if (!statsMap[idZone]) {
        statsMap[idZone] = { ca: 0, qte_recue: 0, qte_recuperee: 0, distributeurs: new Set() };
      }

      statsMap[idZone].distributeurs.add(t.id_distributeur);

      for (const l of t.lignes ?? []) {
        const qte_vendue = (l.quantite_recue ?? 0) - (l.quantite_recuperee ?? 0);
        statsMap[idZone].ca           += qte_vendue * (l.prix_unitaire_applique ?? 0);
        statsMap[idZone].qte_recue    += l.quantite_recue    ?? 0;
        statsMap[idZone].qte_recuperee += l.quantite_recuperee ?? 0;
      }
    }

    // Finaliser les stats (arrondi + taux recouvrement)
    const stats = {};
    for (const [id, s] of Object.entries(statsMap)) {
      stats[id] = {
        ca:               Math.round(s.ca),
        qte_recue:        s.qte_recue,
        qte_recuperee:    s.qte_recuperee,
        nb_distributeurs: s.distributeurs.size,
        taux_recouvrement: s.qte_recue > 0
          ? Math.round((s.qte_recuperee / s.qte_recue) * 100)
          : 0,
      };
    }

    // ── Fusion zones + stats ──────────────────────────────────────────────────
    const STATS_VIDE = { ca: 0, qte_recue: 0, qte_recuperee: 0, nb_distributeurs: 0, taux_recouvrement: 0 };
    const zonesEnrichies = (zonesRes.data ?? []).map((z) => ({
      ...z,
      stats: stats[z.id] ?? STATS_VIDE,
    }));

    setBase(baseRes.data ?? null);
    setZones(zonesEnrichies);
    setLoading(false);
  }, [periode]);

  useEffect(() => { charger(); }, [charger]);

  return { base, zones, loading, periode, setPeriode, rafraichir: charger };
};

export default useDistributionMap;
