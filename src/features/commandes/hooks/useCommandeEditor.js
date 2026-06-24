import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import useCommandeEditorStore from "@/features/commandes/store/commandeEditorStore";
import useActiveUserStore from "@/features/auth/store/activeUserStore";
import { useMenus } from "@/features/menus/hooks/useMenus";
import useLivreursLocal from "@/features/livreurs/hooks/useLivreursLocal";
import useAdressesLocal from "@/features/adresses/hooks/useAdressesLocal";
import * as commandeToolkit from "@/features/commandes/utils/commandeToolkit";
import * as commandeHistoryToolkit from "@/features/commandes/utils/commandeHistoryToolkit";

export const useCommandeEditor = () => {
  const navigate = useNavigate();
  const { id: commandeId } = useParams();
  const { user } = useActiveUserStore();

  const store = useCommandeEditorStore();

  const { menus, loading: menusLoading } = useMenus();
  const { livreurs, loading: livreursLoading } = useLivreursLocal();
  const { adresses, loading: adressesLoading } = useAdressesLocal();

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);

  const [confirmAction, setConfirmAction] = useState(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAdresseModal, setShowAdresseModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      if (!commandeId) {
        toast.error("ID de commande manquant");
        navigate("/commandes");
        return;
      }

      const result = await store.loadCommande(commandeId);

      if (!result.success) {
        toast.error(result.error || "Erreur lors du chargement");
        navigate("/commandes");
        return;
      }

      loadHistory();
    };

    loadData();

    return () => {
      store.clearStore();
    };
  }, [commandeId]);

  useEffect(() => {
    if (menus.length > 0) {
      store.setMenus(menus);
    }
  }, [menus]);

  useEffect(() => {
    if (livreurs.length > 0) {
      store.setLivreurs(livreurs);
    }
  }, [livreurs]);

  useEffect(() => {
    if (adresses.length > 0) {
      store.setAdresses(adresses);
    }
  }, [adresses]);

  const loadHistory = useCallback(
    async (offset = 0) => {
      if (!commandeId) return;

      setHistoryLoading(true);

      try {
        const result = await commandeHistoryToolkit.getCommandeHistory(
          commandeId,
          { limit: 20, offset }
        );

        if (result.success) {
          const formatted = result.history.map((entry) =>
            commandeHistoryToolkit.formatHistoryEntry(entry)
          );

          if (offset === 0) {
            setHistory(formatted);
          } else {
            setHistory((prev) => [...prev, ...formatted]);
          }

          setHistoryTotal(result.total);
        }
      } catch {} finally {
        setHistoryLoading(false);
      }
    },
    [commandeId]
  );

  const loadMoreHistory = useCallback(() => {
    if (history.length < historyTotal) {
      loadHistory(history.length);
    }
  }, [history.length, historyTotal, loadHistory]);

  const commandeFormatted = useMemo(() => {
    if (!store.commande) return null;

    const livreur = store.commande.livreur_id
      ? livreurs.find((l) => l.id === store.commande.livreur_id)
      : null;

    return {
      ...store.commande,
      livreurNom: livreur?.denomination || "Non assigné",
      statusLabel: getStatusLabel(store.commande.statut_commande),
      livraisonLabel: getLivraisonLabel(store.commande.statut_livraison),
      paiementLabel: getPaiementLabel(store.commande.statut_paiement),
    };
  }, [store.commande, livreurs]);

  const availableMenus = useMemo(() => {
    return menus.filter((menu) => menu.statut === "disponible");
  }, [menus]);

  const activeAdresses = useMemo(() => {
    return adresses.filter((adresse) => adresse.is_active);
  }, [adresses]);

  const activeLivreurs = useMemo(() => {
    return livreurs.filter((livreur) => livreur.is_active);
  }, [livreurs]);

  const canEdit = useMemo(() => {
    if (!store.commande) return false;
    return !["terminee", "annulee"].includes(store.commande.statut_commande);
  }, [store.commande]);

  const canDeliver = useMemo(() => {
    if (!store.commande) return false;
    return (
      store.commande.type === "livraison" &&
      store.commande.statut_livraison === "en_attente" &&
      store.commande.statut_commande !== "annulee"
    );
  }, [store.commande]);

  const canClose = useMemo(() => {
    if (!store.commande) return false;
    return store.commande.statut_commande === "en_cours";
  }, [store.commande]);

  const resteAPayer = useMemo(() => {
    if (!store.commande) return 0;
    const paiement = store.commande.details_paiement || {};
    const totalAPayer =
      paiement.total_apres_reduction ??
      paiement.total ??
      store.commande.montant_total ??
      0;
    const totalPaye =
      (paiement.momo || 0) + (paiement.cash || 0) + (paiement.autre || 0);
    return Math.max(0, totalAPayer - totalPaye);
  }, [store.commande]);

  const updateField = useCallback(
    (field, value) => {
      if (!canEdit) {
        toast.error("Cette commande ne peut plus être modifiée");
        return;
      }
      store.updateField(field, value);
    },
    [canEdit, store]
  );

  const updateFields = useCallback(
    (updates) => {
      if (!canEdit) {
        toast.error("Cette commande ne peut plus être modifiée");
        return;
      }
      store.updateFields(updates);
    },
    [canEdit, store]
  );

  const addItem = useCallback(
    (menu, quantite = 1) => {
      if (!canEdit) {
        toast.error("Cette commande ne peut plus être modifiée");
        return;
      }
      store.addItem(menu, quantite);
      setShowAddItemModal(false);
      toast.success(`${menu.nom} ajouté à la commande`);
    },
    [canEdit, store]
  );

  const removeItem = useCallback(
    (index) => {
      if (!canEdit) {
        toast.error("Cette commande ne peut plus être modifiée");
        return;
      }
      const item = store.commande?.details_commandes?.[index];
      store.removeItem(index);
      if (item) {
        toast.info(`${item.item} retiré de la commande`);
      }
    },
    [canEdit, store]
  );

  const updateItemQuantity = useCallback(
    (index, quantite) => {
      if (!canEdit) {
        toast.error("Cette commande ne peut plus être modifiée");
        return;
      }
      store.updateItemQuantity(index, quantite);
    },
    [canEdit, store]
  );

  const assignLivreur = useCallback(
    (livreurId) => {
      if (!canEdit) {
        toast.error("Cette commande ne peut plus être modifiée");
        return;
      }
      store.assignLivreur(livreurId);
      const livreur = livreurs.find((l) => l.id === livreurId);
      if (livreur) {
        toast.success(`Livreur ${livreur.denomination} assigné`);
      } else if (!livreurId) {
        toast.info("Livreur désassigné");
      }
    },
    [canEdit, store, livreurs]
  );

  const setAdresse = useCallback(
    (adresse) => {
      if (!canEdit) {
        toast.error("Cette commande ne peut plus être modifiée");
        return;
      }
      store.setAdresseLivraison(adresse);
      setShowAdresseModal(false);
      if (adresse) {
        toast.success("Adresse de livraison mise à jour");
      }
    },
    [canEdit, store]
  );

  const updatePaiement = useCallback(
    (paiement) => {
      store.updatePaiement(paiement);
    },
    [store]
  );

  const save = useCallback(async () => {
    if (!store.isDirty) {
      toast.info("Aucune modification à sauvegarder");
      return { success: true };
    }

    const result = await store.save();

    if (result.success) {
      toast.success("Modifications sauvegardées");
      loadHistory();
    } else {
      toast.error(result.error || "Erreur lors de la sauvegarde");
    }

    return result;
  }, [store, user, commandeId, loadHistory]);

  const cancel = useCallback(() => {
    if (store.isDirty) {
      setConfirmAction({
        title: "Annuler les modifications ?",
        message: "Toutes les modifications non sauvegardées seront perdues.",
        onConfirm: () => {
          store.reset();
          setConfirmAction(null);
          toast.info("Modifications annulées");
        },
        onCancel: () => setConfirmAction(null),
      });
    } else {
      navigate("/commandes");
    }
  }, [store, navigate]);

  const goBack = useCallback(() => {
    if (store.isDirty) {
      setConfirmAction({
        title: "Quitter sans sauvegarder ?",
        message: "Vous avez des modifications non sauvegardées. Voulez-vous quitter ?",
        onConfirm: () => {
          store.clearStore();
          navigate("/commandes");
        },
        onCancel: () => setConfirmAction(null),
      });
    } else {
      navigate("/commandes");
    }
  }, [store, navigate]);

  const deliver = useCallback(async () => {
    if (!canDeliver) {
      toast.error("Cette commande ne peut pas être livrée");
      return { success: false };
    }

    setConfirmAction({
      title: "Marquer comme livrée ?",
      message: "La date et l'heure de livraison seront enregistrées.",
      onConfirm: async () => {
        setConfirmAction(null);
        const result = await store.deliver();
        if (result.success) {
          toast.success("Commande marquée comme livrée");
          loadHistory();
        } else {
          toast.error(result.error || "Erreur lors de la livraison");
        }
      },
      onCancel: () => setConfirmAction(null),
    });
  }, [canDeliver, store, user, commandeId, loadHistory]);

  const close = useCallback(async () => {
    if (!canClose) {
      toast.error("Cette commande ne peut pas être clôturée");
      return { success: false };
    }

    const warningPaiement =
      resteAPayer > 0
        ? `⚠️ Il reste ${new Intl.NumberFormat("fr-FR").format(resteAPayer)} FCFA à percevoir. `
        : "";

    setConfirmAction({
      title: "Clôturer la commande ?",
      message: `${warningPaiement}Cette action ne peut pas être annulée.`,
      variant: resteAPayer > 0 ? "destructive" : undefined,
      onConfirm: async () => {
        setConfirmAction(null);
        const result = await store.close();
        if (result.success) {
          toast.success("Commande clôturée");
          loadHistory();
        } else {
          toast.error(result.error || "Erreur lors de la clôture");
        }
      },
      onCancel: () => setConfirmAction(null),
    });
  }, [canClose, store, user, commandeId, loadHistory, resteAPayer]);

  const deliverAndClose = useCallback(async () => {
    if (!canDeliver && !canClose) {
      toast.error("Cette action n'est pas disponible");
      return { success: false };
    }

    const warningPaiementLivr =
      resteAPayer > 0
        ? `⚠️ Il reste ${new Intl.NumberFormat("fr-FR").format(resteAPayer)} FCFA à percevoir. `
        : "";

    setConfirmAction({
      title: "Livrer et clôturer ?",
      message: `${warningPaiementLivr}La commande sera marquée comme livrée et clôturée. Cette action ne peut pas être annulée.`,
      variant: resteAPayer > 0 ? "destructive" : undefined,
      onConfirm: async () => {
        setConfirmAction(null);
        const result = await store.deliverAndClose();
        if (result.success) {
          toast.success("Commande livrée et clôturée");
          loadHistory();
        } else {
          toast.error(result.error || "Erreur lors de l'opération");
        }
      },
      onCancel: () => setConfirmAction(null),
    });
  }, [canDeliver, canClose, store, user, commandeId, loadHistory, resteAPayer]);

  const previewHistoryEntry = useCallback((entry) => {
    setSelectedHistoryEntry(entry);
  }, []);

  const rollbackToEntry = useCallback(
    async (entry) => {
      if (!entry?.id || !entry?.snapshot) {
        toast.error("Entrée historique invalide");
        return { success: false };
      }

      setConfirmAction({
        title: "Restaurer cette version ?",
        message: `La commande sera restaurée à l'état du ${entry.formattedDate}. Les modifications actuelles seront perdues.`,
        onConfirm: async () => {
          setConfirmAction(null);

          const result = await commandeHistoryToolkit.rollbackToHistory(
            commandeId,
            entry.id,
            user?.id,
            store.commande?.version
          );

          if (result.success) {
            await store.loadCommande(commandeId);
            toast.success("Commande restaurée avec succès");
            loadHistory();
            setShowHistoryModal(false);
            setSelectedHistoryEntry(null);
          } else {
            toast.error(result.error || "Erreur lors de la restauration");
          }
        },
        onCancel: () => setConfirmAction(null),
      });
    },
    [commandeId, user, store, loadHistory]
  );

  const undo = useCallback(() => {
    if (store.canUndo()) {
      store.undo();
      toast.info("Modification annulée");
    }
  }, [store]);

  const redo = useCallback(() => {
    if (store.canRedo()) {
      store.redo();
      toast.info("Modification rétablie");
    }
  }, [store]);

  return {
    commande: commandeFormatted,
    originalCommande: store.originalCommande,
    isLoading: store.isLoading || menusLoading || livreursLoading || adressesLoading,
    isSaving: store.isSaving,
    isDirty: store.isDirty,
    errors: store.errors,
    globalError: store.globalError,

    menus: availableMenus,
    livreurs: activeLivreurs,
    adresses: activeAdresses,

    history,
    historyLoading,
    historyTotal,
    loadMoreHistory,
    hasMoreHistory: history.length < historyTotal,

    canEdit,
    canDeliver,
    canClose,
    canUndo: store.canUndo(),
    canRedo: store.canRedo(),
    resteAPayer,

    updateField,
    updateFields,
    addItem,
    removeItem,
    updateItemQuantity,
    assignLivreur,
    setAdresse,
    updatePaiement,

    save,
    cancel,
    goBack,
    reset: store.reset,

    deliver,
    close,
    deliverAndClose,

    previewHistoryEntry,
    rollbackToEntry,
    selectedHistoryEntry,
    setSelectedHistoryEntry,

    undo,
    redo,

    confirmAction,
    setConfirmAction,
    showAddItemModal,
    setShowAddItemModal,
    showAdresseModal,
    setShowAdresseModal,
    showHistoryModal,
    setShowHistoryModal,

    activeSection: store.activeSection,
    setActiveSection: store.setActiveSection,

    STATUTS_COMMANDE: commandeToolkit.STATUTS_COMMANDE,
    STATUTS_LIVRAISON: commandeToolkit.STATUTS_LIVRAISON,
    STATUTS_PAIEMENT: commandeToolkit.STATUTS_PAIEMENT,
    TYPES_COMMANDE: commandeToolkit.TYPES_COMMANDE,

    getChanges: store.getChanges,
    isFieldDirty: store.isFieldDirty,
  };
};

function getStatusLabel(status) {
  const labels = {
    "en-cours": "En cours",
    terminee: "Terminée",
    annulee: "Annulée",
  };
  return labels[status] || status;
}

function getLivraisonLabel(status) {
  const labels = {
    "en-attente": "En attente",
    livree: "Livrée",
  };
  return labels[status] || status || "N/A";
}

function getPaiementLabel(status) {
  const labels = {
    "non-payee": "Non payée",
    "partiellement-payee": "Partiellement payée",
    payee: "Payée",
  };
  return labels[status] || status;
}

export default useCommandeEditor;
