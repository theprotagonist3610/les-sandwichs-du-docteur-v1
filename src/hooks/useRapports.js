/**
 * useRapports.js
 * Données agrégées pour l'onglet Rapports du module distribution.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getTournees, getDistributeurs, getPrixProduits,
  agregerParProduit, calculerTournee,
} from "@/utils/distributionToolkit";

const getDateRange = (periode) => {
  const today = new Date().toISOString().slice(0, 10);
  const past  = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  if (periode === "j7")  return { start: past(7),  end: today };
  if (periode === "j30") return { start: past(30), end: today };
  if (periode === "j90") return { start: past(90), end: today };
  return { start: null, end: null };
};

const useRapports = () => {
  const [tournees,      setTournees]      = useState([]);
  const [distributeurs, setDistributeurs] = useState([]);
  const [prix,          setPrix]          = useState({});
  const [loading,       setLoading]       = useState(true);

  const [periode,              setPeriode]              = useState("j30");
  const [filtreIdDistributeur, setFiltreIdDistributeur] = useState(null);

  const charger = useCallback(async () => {
    setLoading(true);
    const range = getDateRange(periode);
    const [tRes, dRes, pRes] = await Promise.all([
      getTournees({
        limit:          100,
        startDate:      range.start   ?? undefined,
        endDate:        range.end     ?? undefined,
        idDistributeur: filtreIdDistributeur ?? undefined,
      }),
      getDistributeurs(),
      getPrixProduits(),
    ]);
    if (tRes.success) setTournees(tRes.tournees);
    if (dRes.success) setDistributeurs(dRes.distributeurs);
    if (pRes.success) setPrix(pRes.prix);
    setLoading(false);
  }, [periode, filtreIdDistributeur]);

  useEffect(() => { charger(); }, [charger]);

  const stats = useMemo(() => {
    let ca_total = 0, ristourne_due = 0, ristourne_payee = 0;
    for (const t of tournees) {
      const { vente_totale } = calculerTournee(
        t.lignes ?? [],
        t.distributeur?.taux_ristourne ?? 0,
      );
      ca_total        += vente_totale;
      ristourne_due   += Number(t.ristourne_due  ?? 0);
      ristourne_payee += Number(t.montant_paye   ?? 0);
    }
    return {
      ca_total:         Math.round(ca_total         * 100) / 100,
      ristourne_due:    Math.round(ristourne_due    * 100) / 100,
      ristourne_payee:  Math.round(ristourne_payee  * 100) / 100,
      solde:            Math.round((ristourne_due - ristourne_payee) * 100) / 100,
      nb_tournees:      tournees.length,
      nb_distributeurs: new Set(tournees.map(t => t.id_distributeur)).size,
      parProduit:       agregerParProduit(tournees),
    };
  }, [tournees]);

  return {
    tournees, distributeurs, prix, loading,
    periode,              setPeriode,
    filtreIdDistributeur, setFiltreIdDistributeur,
    stats,
    rafraichir: charger,
  };
};

export default useRapports;
