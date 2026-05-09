/**
 * useTournees.js
 * Gestion d'état CRUD pour les tournées de distribution.
 * Charge aussi les distributeurs actifs et les prix produits pour les formulaires.
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  getTournees, createTournee, updateTournee, deleteTournee,
  getDistributeurs, getPrixProduits,
  calculerTournee,
} from "@/utils/distributionToolkit";

const useTournees = () => {
  // ── Données ───────────────────────────────────────────────────────────────
  const [tournees, setTournees]           = useState([]);
  const [distributeurs, setDistributeurs] = useState([]);
  const [prix, setPrix]                   = useState({});
  const [loading, setLoading]             = useState(true);

  // ── Filtres ───────────────────────────────────────────────────────────────
  const [filtreIdDistributeur, setFiltreIdDistributeur] = useState(null);
  const [filtreStatut, setFiltreStatut]                 = useState(null);
  const [filtrePeriode, setFiltrePeriode]               = useState({ start: null, end: null });

  // ── UI ────────────────────────────────────────────────────────────────────
  const [dialog, setDialog]               = useState({ open: false, mode: "create", data: null });
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  // ── Chargement des référentiels (une seule fois) ───────────────────────────
  const chargerDistributeurs = useCallback(async () => {
    const { success, distributeurs: data } = await getDistributeurs({ statut: true });
    if (success) setDistributeurs(data);
  }, []);

  const chargerPrix = useCallback(async () => {
    const { success, prix: data } = await getPrixProduits();
    if (success) setPrix(data);
  }, []);

  // ── Chargement des tournées (réactif aux filtres) ─────────────────────────
  const charger = useCallback(async () => {
    setLoading(true);
    const { success, tournees: data, error } = await getTournees({
      idDistributeur: filtreIdDistributeur ?? undefined,
      startDate:      filtrePeriode.start  ?? undefined,
      endDate:        filtrePeriode.end    ?? undefined,
      statut:         filtreStatut         ?? undefined,
    });
    if (success) setTournees(data);
    else toast.error(error ?? "Erreur lors du chargement des tournées");
    setLoading(false);
  }, [filtreIdDistributeur, filtreStatut, filtrePeriode]);

  useEffect(() => { chargerDistributeurs(); chargerPrix(); }, [chargerDistributeurs, chargerPrix]);
  useEffect(() => { charger(); }, [charger]);

  // ── Créer / modifier ──────────────────────────────────────────────────────
  const soumettre = useCallback(async (formData) => {
    const { lignes, ...tourneeData } = formData;
    const distributeur = distributeurs.find(d => d.id === tourneeData.id_distributeur);
    const taux         = Number(distributeur?.taux_ristourne ?? 0);

    const fn = dialog.mode === "create"
      ? () => createTournee(tourneeData, lignes, taux)
      : () => updateTournee(dialog.data.id, tourneeData, lignes, taux);

    const { success, error } = await fn();
    if (!success) { toast.error(error ?? "Erreur lors de l'enregistrement"); return false; }
    toast.success(dialog.mode === "create" ? "Tournée enregistrée" : "Tournée mise à jour");
    setDialog({ open: false, mode: "create", data: null });
    charger();
    return true;
  }, [dialog, distributeurs, charger]);

  // ── Supprimer ─────────────────────────────────────────────────────────────
  const supprimer = useCallback(async () => {
    if (!confirmDelete.id) return;
    const { success, error } = await deleteTournee(confirmDelete.id);
    if (!success) { toast.error(error ?? "Erreur lors de la suppression"); return; }
    toast.success("Tournée supprimée");
    setConfirmDelete({ open: false, id: null });
    charger();
  }, [confirmDelete, charger]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const ouvrirCreation = useCallback((idDistributeur = null) => {
    setDialog({
      open: true,
      mode: "create",
      data: idDistributeur ? { id_distributeur: idDistributeur } : null,
    });
  }, []);

  const ouvrirEdition     = useCallback((t) => setDialog({ open: true, mode: "edit", data: t }), []);
  const ouvrirSuppression = useCallback((id) => setConfirmDelete({ open: true, id }), []);

  /** Calcule un aperçu ristourne en temps réel pour le formulaire (sans appel Supabase). */
  const previewTournee = useCallback((lignes, idDistributeur) => {
    const d = distributeurs.find(d => d.id === idDistributeur);
    return calculerTournee(lignes, d?.taux_ristourne ?? 0);
  }, [distributeurs]);

  return {
    // données
    tournees, distributeurs, prix, loading,
    // filtres
    filtreIdDistributeur, setFiltreIdDistributeur,
    filtreStatut,         setFiltreStatut,
    filtrePeriode,        setFiltrePeriode,
    // UI
    dialog,        setDialog,
    confirmDelete, setConfirmDelete,
    // actions
    soumettre, supprimer,
    rafraichir: charger,
    // helpers
    ouvrirCreation, ouvrirEdition, ouvrirSuppression,
    previewTournee,
  };
};

export default useTournees;
