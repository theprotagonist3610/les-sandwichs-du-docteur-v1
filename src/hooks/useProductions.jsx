/**
 * useProductions.jsx
 * Gestion d'état complète pour la page Productions.
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  getRecettes, updateRecette,
  getProductions, createProduction, updateProduction, deleteProduction,
} from "@/utils/productionToolkit";

const useProductions = () => {
  // ── Recettes ──────────────────────────────────────────────────────────────
  const [recettes, setRecettes]               = useState([]);
  const [recettesLoading, setRecettesLoading] = useState(true);

  // ── Productions ───────────────────────────────────────────────────────────
  const [productions, setProductions]               = useState([]);
  const [productionsLoading, setProductionsLoading] = useState(false);
  const [filtreRecette, setFiltreRecette]           = useState(null); // null = toutes
  const [filtrePeriode, setFiltrePeriode]           = useState({ start: null, end: null });

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const [dialogProduction, setDialogProduction] = useState({
    open: false, mode: "create", data: null, recetteId: null,
  });
  const [dialogConfig, setDialogConfig] = useState({ open: false, recetteId: null });
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  // ── Chargement recettes ───────────────────────────────────────────────────
  const chargerRecettes = useCallback(async () => {
    setRecettesLoading(true);
    const { success, recettes: data, error } = await getRecettes();
    if (success) setRecettes(data);
    else toast.error(error ?? "Erreur lors du chargement des recettes");
    setRecettesLoading(false);
  }, []);

  // ── Chargement productions ────────────────────────────────────────────────
  const chargerProductions = useCallback(async () => {
    setProductionsLoading(true);
    const { success, productions: data, error } = await getProductions({
      recetteId: filtreRecette,
      startDate:  filtrePeriode.start,
      endDate:    filtrePeriode.end,
    });
    if (success) setProductions(data);
    else toast.error(error ?? "Erreur lors du chargement des productions");
    setProductionsLoading(false);
  }, [filtreRecette, filtrePeriode]);

  useEffect(() => { chargerRecettes();    }, [chargerRecettes]);
  useEffect(() => { chargerProductions(); }, [chargerProductions]);

  // ── Soumettre un lot de production ────────────────────────────────────────
  const soumettreProduction = useCallback(async (formData) => {
    const recette = recettes.find((r) => r.id === formData.recette_id);
    const payload = { ...formData, recette };

    const fn = dialogProduction.mode === "create" ? createProduction : updateProduction;
    const args = dialogProduction.mode === "create"
      ? [payload]
      : [dialogProduction.data.id, payload];

    const result = await fn(...args);

    if (!result.success) {
      toast.error(result.error ?? "Erreur lors de l'enregistrement");
      return false;
    }

    toast.success(dialogProduction.mode === "create" ? "Lot enregistré" : "Lot mis à jour");
    setDialogProduction({ open: false, mode: "create", data: null, recetteId: null });
    chargerProductions();
    return true;
  }, [recettes, dialogProduction, chargerProductions]);

  // ── Supprimer un lot ──────────────────────────────────────────────────────
  const supprimerProduction = useCallback(async () => {
    if (!confirmDelete.id) return;
    const { success, error } = await deleteProduction(confirmDelete.id);
    if (!success) { toast.error(error ?? "Erreur lors de la suppression"); return; }
    toast.success("Lot supprimé");
    setConfirmDelete({ open: false, id: null });
    chargerProductions();
  }, [confirmDelete, chargerProductions]);

  // ── Sauvegarder config recette ────────────────────────────────────────────
  const sauvegarderConfig = useCallback(async (id, updates) => {
    const { success, error } = await updateRecette(id, updates);
    if (!success) { toast.error(error ?? "Erreur lors de la sauvegarde"); return false; }
    toast.success("Configuration sauvegardée");
    setDialogConfig({ open: false, recetteId: null });
    chargerRecettes();
    return true;
  }, [chargerRecettes]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const ouvrirNouveauLot = useCallback((recetteId = null) => {
    setDialogProduction({ open: true, mode: "create", data: null, recetteId });
  }, []);

  const ouvrirEditionLot = useCallback((production) => {
    setDialogProduction({ open: true, mode: "edit", data: production, recetteId: production.recette_id });
  }, []);

  const ouvrirConfig = useCallback((recetteId) => {
    setDialogConfig({ open: true, recetteId });
  }, []);

  const recetteParId = useCallback((id) => recettes.find((r) => r.id === id), [recettes]);

  const derniersLots = useCallback(() => {
    const map = {};
    for (const prod of productions) {
      if (!map[prod.recette_id]) map[prod.recette_id] = prod;
    }
    return map;
  }, [productions]);

  return {
    // données
    recettes,    recettesLoading,
    productions, productionsLoading,
    // filtres
    filtreRecette, setFiltreRecette,
    filtrePeriode, setFiltrePeriode,
    // dialogs
    dialogProduction, setDialogProduction,
    dialogConfig,     setDialogConfig,
    confirmDelete,    setConfirmDelete,
    // actions
    soumettreProduction,
    supprimerProduction,
    sauvegarderConfig,
    rafraichir: chargerProductions,
    // helpers
    ouvrirNouveauLot,
    ouvrirEditionLot,
    ouvrirConfig,
    recetteParId,
    derniersLots,
  };
};

export default useProductions;
