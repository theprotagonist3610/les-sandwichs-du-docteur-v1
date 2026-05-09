/**
 * usePaiements.js
 * Gestion d'état CRUD pour les paiements de ristourne.
 * Charge également les tournées et distributeurs pour calculer les soldes.
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  getPaiements, createPaiement, deletePaiement,
  getTournees, getDistributeurs,
  calculerSoldeDistributeur,
} from "@/utils/distributionToolkit";

const usePaiements = () => {
  // ── Données ───────────────────────────────────────────────────────────────
  const [paiements, setPaiements]         = useState([]);
  const [tournees, setTournees]           = useState([]);
  const [distributeurs, setDistributeurs] = useState([]);
  const [loading, setLoading]             = useState(true);

  // ── Filtres ───────────────────────────────────────────────────────────────
  const [filtreIdDistributeur, setFiltreIdDistributeur] = useState(null);
  const [filtrePeriode, setFiltrePeriode]               = useState({ start: null, end: null });

  // ── UI ────────────────────────────────────────────────────────────────────
  // Pas de mode "edit" : un paiement se supprime, pas se modifie
  const [dialog, setDialog]               = useState({ open: false, data: null });
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  // ── Chargement des référentiels ───────────────────────────────────────────
  const chargerDistributeurs = useCallback(async () => {
    const { success, distributeurs: data } = await getDistributeurs();
    if (success) setDistributeurs(data);
  }, []);

  // Toutes les tournées — nécessaires pour calculer les soldes complets
  const chargerTournees = useCallback(async () => {
    const { success, tournees: data } = await getTournees({ limit: 1000 });
    if (success) setTournees(data);
  }, []);

  // ── Chargement des paiements (réactif aux filtres) ────────────────────────
  const charger = useCallback(async () => {
    setLoading(true);
    const { success, paiements: data, error } = await getPaiements({
      idDistributeur: filtreIdDistributeur ?? undefined,
      startDate:      filtrePeriode.start  ?? undefined,
      endDate:        filtrePeriode.end    ?? undefined,
    });
    if (success) setPaiements(data);
    else toast.error(error ?? "Erreur lors du chargement des paiements");
    setLoading(false);
  }, [filtreIdDistributeur, filtrePeriode]);

  useEffect(() => { chargerDistributeurs(); chargerTournees(); }, [chargerDistributeurs, chargerTournees]);
  useEffect(() => { charger(); }, [charger]);

  // ── Enregistrer un paiement ───────────────────────────────────────────────
  const soumettre = useCallback(async (formData) => {
    const { success, error } = await createPaiement(formData);
    if (!success) { toast.error(error ?? "Erreur lors de l'enregistrement"); return false; }
    toast.success("Paiement enregistré");
    setDialog({ open: false, data: null });
    // Recharger paiements + tournées pour recalculer les soldes
    charger();
    chargerTournees();
    return true;
  }, [charger, chargerTournees]);

  // ── Supprimer un paiement ─────────────────────────────────────────────────
  const supprimer = useCallback(async () => {
    if (!confirmDelete.id) return;
    const { success, error } = await deletePaiement(confirmDelete.id);
    if (!success) { toast.error(error ?? "Erreur lors de la suppression"); return; }
    toast.success("Paiement supprimé");
    setConfirmDelete({ open: false, id: null });
    charger();
  }, [confirmDelete, charger]);

  // ── Dérivés : soldes ──────────────────────────────────────────────────────

  /** Solde ristourne d'un distributeur donné (toutes périodes). */
  const soldeParDistributeur = useCallback((idDistributeur) => {
    const t = tournees.filter(t => t.id_distributeur === idDistributeur);
    // Tous les paiements de ce distributeur (pas seulement ceux filtrés)
    // → on refetch si nécessaire, sinon on utilise les données disponibles
    const p = paiements.filter(p => p.id_distributeur === idDistributeur);
    return calculerSoldeDistributeur(t, p);
  }, [tournees, paiements]);

  /** Soldes de tous les distributeurs, triés par solde décroissant. */
  const soldesTous = useCallback(() =>
    distributeurs.map(d => ({
      distributeur: d,
      ...calculerSoldeDistributeur(
        tournees.filter(t => t.id_distributeur === d.id),
        paiements.filter(p => p.id_distributeur === d.id),
      ),
    })).sort((a, b) => b.solde - a.solde),
  [distributeurs, tournees, paiements]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const ouvrirPaiement = useCallback((idDistributeur = null) => {
    setDialog({ open: true, data: idDistributeur ? { id_distributeur: idDistributeur } : null });
  }, []);
  const ouvrirSuppression = useCallback((id) => setConfirmDelete({ open: true, id }), []);

  return {
    // données
    paiements, tournees, distributeurs, loading,
    // filtres
    filtreIdDistributeur, setFiltreIdDistributeur,
    filtrePeriode,        setFiltrePeriode,
    // UI
    dialog,        setDialog,
    confirmDelete, setConfirmDelete,
    // actions
    soumettre, supprimer,
    rafraichir: charger,
    // helpers
    ouvrirPaiement, ouvrirSuppression,
    // dérivés
    soldeParDistributeur, soldesTous,
  };
};

export default usePaiements;
