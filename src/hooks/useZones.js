/**
 * useZones.js
 * Gestion d'état CRUD pour les zones de distribution.
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  getZones, createZone, updateZone, deleteZone,
} from "@/utils/distributionToolkit";

const useZones = () => {
  // ── Données ───────────────────────────────────────────────────────────────
  const [zones, setZones]     = useState([]);
  const [loading, setLoading] = useState(true);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [dialog, setDialog]               = useState({ open: false, mode: "create", data: null });
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  // ── Chargement ────────────────────────────────────────────────────────────
  const charger = useCallback(async () => {
    setLoading(true);
    const { success, zones: data, error } = await getZones();
    if (success) setZones(data);
    else toast.error(error ?? "Erreur lors du chargement des zones");
    setLoading(false);
  }, []);

  useEffect(() => { charger(); }, [charger]);

  // ── Créer / modifier ──────────────────────────────────────────────────────
  const soumettre = useCallback(async (formData) => {
    const fn = dialog.mode === "create"
      ? () => createZone(formData)
      : () => updateZone(dialog.data.id, formData);

    console.debug("[useZones] soumettre — mode:", dialog.mode, "payload:", formData);
    const result = await fn();
    console.debug("[useZones] résultat:", result);

    if (!result.success) {
      toast.error(result.error ?? "Erreur lors de l'enregistrement");
      return false;
    }
    toast.success(dialog.mode === "create" ? "Zone créée" : "Zone mise à jour");
    setDialog({ open: false, mode: "create", data: null });
    charger();
    return true;
  }, [dialog, charger]);

  // ── Supprimer ─────────────────────────────────────────────────────────────
  const supprimer = useCallback(async () => {
    if (!confirmDelete.id) return;
    const { success, error } = await deleteZone(confirmDelete.id);
    if (!success) { toast.error(error ?? "Erreur lors de la suppression"); return; }
    toast.success("Zone supprimée");
    setConfirmDelete({ open: false, id: null });
    charger();
  }, [confirmDelete, charger]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const ouvrirCreation    = useCallback(() => setDialog({ open: true, mode: "create", data: null }), []);
  const ouvrirEdition     = useCallback((zone) => setDialog({ open: true, mode: "edit", data: zone }), []);
  const ouvrirSuppression = useCallback((id) => setConfirmDelete({ open: true, id }), []);
  const zoneParId         = useCallback((id) => zones.find(z => z.id === id), [zones]);

  return {
    // données
    zones, loading,
    // UI
    dialog,        setDialog,
    confirmDelete, setConfirmDelete,
    // actions
    soumettre, supprimer,
    rafraichir: charger,
    // helpers
    ouvrirCreation, ouvrirEdition, ouvrirSuppression,
    zoneParId,
  };
};

export default useZones;
