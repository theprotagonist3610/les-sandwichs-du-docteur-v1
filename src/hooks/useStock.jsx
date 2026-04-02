/**
 * useStock.jsx
 * Hook principal pour la gestion du stock
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import useActiveUserStore from "@/store/activeUserStore";
import {
  getLots,
  getMouvementsLot,
  getDashboardStock,
  getAlertes,
  getStockActuel,
  createLotManuel,
  deleteLot,
  enregistrerPerte,
  marquerLotsPerimes,
  canManageStock,
  canDeleteLot,
  canAjusterStock,
} from "@/utils/stockToolkit";

export const ONGLETS_STOCK = {
  LOTS: "lots",
  VUE: "vue",
};

const useStock = () => {
  const { user } = useActiveUserStore();
  const userRole = user?.role;

  const canManage  = canManageStock(userRole);
  const canDelete  = canDeleteLot(userRole);
  const canAjuster = canAjusterStock(userRole);

  // ── Onglet actif ───────────────────────────────────────────────────────────
  const [ongletActif, setOngletActif] = useState(ONGLETS_STOCK.LOTS);

  // ── État Lots ──────────────────────────────────────────────────────────────
  const [lots, setLots]                         = useState([]);
  const [loadingLots, setLoadingLots]           = useState(false);
  const [lotSelectionne, setLotSelectionne]     = useState(null);
  const [mouvements, setMouvements]             = useState([]);
  const [loadingMouvements, setLoadingMouvements] = useState(false);

  // ── Filtres lots ───────────────────────────────────────────────────────────
  const [filtreCategorie, setFiltreCategorie] = useState("");
  const [filtreStatut, setFiltreStatut]       = useState("");
  const [searchTerm, setSearchTerm]           = useState("");
  const [includeEpuise, setIncludeEpuise]     = useState(false);
  const [includePerime, setIncludePerime]     = useState(false);

  // ── Vue d'ensemble ─────────────────────────────────────────────────────────
  const [dashboard, setDashboard]     = useState(null);
  const [stockActuel, setStockActuel] = useState([]);
  const [alertes, setAlertes]         = useState(null);
  const [loadingVue, setLoadingVue]   = useState(false);

  // ── Formulaires & dialogs ──────────────────────────────────────────────────
  const [dialogCreerLotOuvert, setDialogCreerLotOuvert] = useState(false);
  const [dialogPerteOuvert, setDialogPerteOuvert]       = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [perteLoading, setPerteLoading] = useState(false);

  // ── Confirmation suppression ───────────────────────────────────────────────
  const [confirmSupprimer, setConfirmSupprimer] = useState(null);

  // ============================================================================
  // LOTS — Chargement
  // ============================================================================

  const chargerLots = useCallback(async () => {
    setLoadingLots(true);
    const opts = {
      categorie:    filtreCategorie || undefined,
      searchTerm:   searchTerm     || undefined,
      includeEpuise,
      includePerime,
    };
    if (filtreStatut) opts.statuts = [filtreStatut];

    const result = await getLots(opts);
    setLoadingLots(false);
    if (result.success) {
      setLots(result.lots);
    } else {
      toast.error("Erreur lors du chargement des lots", {
        description: result.error,
      });
    }
  }, [filtreCategorie, searchTerm, filtreStatut, includeEpuise, includePerime]);

  useEffect(() => {
    chargerLots();
  }, [chargerLots]);

  // ============================================================================
  // VUE D'ENSEMBLE — Chargement
  // ============================================================================

  const chargerVue = useCallback(async () => {
    setLoadingVue(true);
    const [dashResult, alertesResult, stockResult] = await Promise.all([
      getDashboardStock(),
      getAlertes(),
      getStockActuel(),
    ]);
    setLoadingVue(false);
    if (dashResult.success)   setDashboard(dashResult.dashboard);
    if (alertesResult.success) setAlertes(alertesResult.alertes);
    if (stockResult.success)  setStockActuel(stockResult.items);
  }, []);

  useEffect(() => {
    if (ongletActif === ONGLETS_STOCK.VUE) {
      chargerVue();
    }
  }, [ongletActif, chargerVue]);

  // ============================================================================
  // LOT — Sélection + mouvements
  // ============================================================================

  const selectionnerLot = useCallback(async (lot) => {
    setLotSelectionne(lot);
    if (!lot) {
      setMouvements([]);
      return;
    }
    setLoadingMouvements(true);
    const result = await getMouvementsLot(lot.id);
    setLoadingMouvements(false);
    if (result.success) setMouvements(result.mouvements);
  }, []);

  // ============================================================================
  // ACTIONS — Perte, création manuelle, suppression
  // ============================================================================

  const enregistrerPerteAction = async (lotId, quantite, motif) => {
    setPerteLoading(true);
    const result = await enregistrerPerte(lotId, quantite, motif, userRole);
    setPerteLoading(false);

    if (result.success) {
      toast.success("Perte enregistrée");
      setDialogPerteOuvert(false);
      chargerLots();
      if (lotSelectionne?.id === lotId) {
        setLotSelectionne(result.lot);
        const mouvResult = await getMouvementsLot(lotId);
        if (mouvResult.success) setMouvements(mouvResult.mouvements);
      }
    } else {
      const msg = result.errors?.join(", ") || result.error;
      toast.error("Erreur", { description: msg });
    }
    return result;
  };

  const creerLotManuelAction = async (formData) => {
    setSubmitting(true);
    const result = await createLotManuel(formData, userRole);
    setSubmitting(false);

    if (result.success) {
      toast.success("Lot créé avec succès");
      setDialogCreerLotOuvert(false);
      chargerLots();
    } else {
      const msg = result.errors?.join(", ") || result.error;
      toast.error("Erreur", { description: msg });
    }
    return result;
  };

  const supprimerLotAction = async (lotId) => {
    const result = await deleteLot(lotId, userRole);
    setConfirmSupprimer(null);
    if (result.success) {
      toast.success("Lot supprimé");
      chargerLots();
      if (ongletActif === ONGLETS_STOCK.VUE) chargerVue();
      if (lotSelectionne?.id === lotId) selectionnerLot(null);
    } else {
      toast.error("Erreur", { description: result.error });
    }
  };

  const marquerPerimesAction = async () => {
    const result = await marquerLotsPerimes();
    if (result.success) {
      toast.success(`${result.nb_mis_a_jour} lot(s) marqué(s) comme périmé(s)`);
      chargerLots();
      if (ongletActif === ONGLETS_STOCK.VUE) chargerVue();
    } else {
      toast.error("Erreur", { description: result.error });
    }
  };

  return {
    // User / Permissions
    user,
    userRole,
    canManage,
    canDelete,
    canAjuster,

    // Onglets
    ongletActif,
    setOngletActif,

    // Lots
    lots,
    loadingLots,
    lotSelectionne,
    selectionnerLot,
    mouvements,
    loadingMouvements,
    chargerLots,

    // Filtres
    filtreCategorie,
    setFiltreCategorie,
    filtreStatut,
    setFiltreStatut,
    searchTerm,
    setSearchTerm,
    includeEpuise,
    setIncludeEpuise,
    includePerime,
    setIncludePerime,

    // Vue d'ensemble
    dashboard,
    stockActuel,
    alertes,
    loadingVue,

    // Actions
    enregistrerPerteAction,
    creerLotManuelAction,
    supprimerLotAction,
    marquerPerimesAction,

    // Confirmations
    confirmSupprimer,
    setConfirmSupprimer,

    // Dialogs
    dialogCreerLotOuvert,
    setDialogCreerLotOuvert,
    dialogPerteOuvert,
    setDialogPerteOuvert,
    submitting,
    perteLoading,
  };
};

export default useStock;
