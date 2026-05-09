/**
 * useDistributeurs.js
 * Gestion d'état CRUD pour les distributeurs éligibles.
 * Charge également les zones pour alimenter les selects du formulaire.
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  getDistributeurs, createDistributeur, updateDistributeur, deleteDistributeur,
  getZones,
} from "@/utils/distributionToolkit";

const useDistributeurs = () => {
  // ── Données ───────────────────────────────────────────────────────────────
  const [distributeurs, setDistributeurs] = useState([]);
  const [zones, setZones]                 = useState([]);
  const [loading, setLoading]             = useState(true);

  // ── Filtres ───────────────────────────────────────────────────────────────
  const [filtreIdZone, setFiltreIdZone] = useState(null); // null = toutes
  const [filtreStatut, setFiltreStatut] = useState(null); // null = tous
  const [filtreType,   setFiltreType]   = useState(null); // null = tous

  // ── UI ────────────────────────────────────────────────────────────────────
  const [dialog, setDialog]               = useState({ open: false, mode: "create", data: null });
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  // ── Chargement des zones (une seule fois) ─────────────────────────────────
  const chargerZones = useCallback(async () => {
    const { success, zones: data } = await getZones();
    if (success) setZones(data);
  }, []);

  // ── Chargement des distributeurs (réactif aux filtres) ────────────────────
  const charger = useCallback(async () => {
    setLoading(true);
    const { success, distributeurs: data, error } = await getDistributeurs({
      idZone: filtreIdZone ?? undefined,
      statut: filtreStatut ?? undefined,
      type:   filtreType   ?? undefined,
    });
    if (success) setDistributeurs(data);
    else toast.error(error ?? "Erreur lors du chargement des distributeurs");
    setLoading(false);
  }, [filtreIdZone, filtreStatut, filtreType]);

  useEffect(() => { chargerZones(); }, [chargerZones]);
  useEffect(() => { charger();      }, [charger]);

  // ── Créer / modifier ──────────────────────────────────────────────────────
  const soumettre = useCallback(async (formData) => {
    const fn = dialog.mode === "create"
      ? () => createDistributeur(formData)
      : () => updateDistributeur(dialog.data.id, formData);

    const { success, error } = await fn();
    if (!success) { toast.error(error ?? "Erreur lors de l'enregistrement"); return false; }
    toast.success(dialog.mode === "create" ? "Distributeur créé" : "Distributeur mis à jour");
    setDialog({ open: false, mode: "create", data: null });
    charger();
    return true;
  }, [dialog, charger]);

  // ── Supprimer ─────────────────────────────────────────────────────────────
  const supprimer = useCallback(async () => {
    if (!confirmDelete.id) return;
    const { success, error } = await deleteDistributeur(confirmDelete.id);
    if (!success) { toast.error(error ?? "Erreur lors de la suppression"); return; }
    toast.success("Distributeur supprimé");
    setConfirmDelete({ open: false, id: null });
    charger();
  }, [confirmDelete, charger]);

  // ── Activer / désactiver ──────────────────────────────────────────────────
  const toggleStatut = useCallback(async (distributeur) => {
    const { success, error } = await updateDistributeur(distributeur.id, {
      statut_eligibilite: !distributeur.statut_eligibilite,
    });
    if (!success) { toast.error(error ?? "Erreur lors de la mise à jour"); return; }
    toast.success(distributeur.statut_eligibilite ? "Distributeur désactivé" : "Distributeur activé");
    charger();
  }, [charger]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const ouvrirCreation    = useCallback(() => setDialog({ open: true, mode: "create", data: null }), []);
  const ouvrirEdition     = useCallback((d) => setDialog({ open: true, mode: "edit", data: d }), []);
  const ouvrirSuppression = useCallback((id) => setConfirmDelete({ open: true, id }), []);
  const distributeurParId = useCallback((id) => distributeurs.find(d => d.id === id), [distributeurs]);

  return {
    // données
    distributeurs, zones, loading,
    // filtres
    filtreIdZone, setFiltreIdZone,
    filtreStatut, setFiltreStatut,
    filtreType,   setFiltreType,
    // UI
    dialog,        setDialog,
    confirmDelete, setConfirmDelete,
    // actions
    soumettre, supprimer, toggleStatut,
    rafraichir: charger,
    // helpers
    ouvrirCreation, ouvrirEdition, ouvrirSuppression,
    distributeurParId,
  };
};

export default useDistributeurs;
