import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import useCommandeEditorStore from "@/store/commandeEditorStore";
import useActiveUserStore from "@/store/activeUserStore";
import { useMenus } from "@/hooks/useMenus";
import useLivreursLocal from "@/hooks/useLivreursLocal";
import useAdressesLocal from "@/hooks/useAdressesLocal";
import * as commandeToolkit from "@/utils/commandeToolkit";
import * as commandeHistoryToolkit from "@/utils/commandeHistoryToolkit";

/**
 * Hook Controller pour l'édition d'une commande
 * Fait le lien entre le store, les services et les composants
 */
export const useCommandeEditor = () => {
  // ============================================================================
  // HOOKS EXTERNES
  // ============================================================================

  const navigate = useNavigate();
  const { id: commandeId } = useParams();
  const { user } = useActiveUserStore();

  // Store principal
  const store = useCommandeEditorStore();

  // Données associées
  const { menus, loading: menusLoading } = useMenus();
  const { livreurs, loading: livreursLoading } = useLivreursLocal();
  const { adresses, loading: adressesLoading } = useAdressesLocal();

  // ============================================================================
  // ÉTAT LOCAL
  // ============================================================================

  // Historique des modifications
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);

  // Modal de confirmation pour actions dangereuses
  const [confirmAction, setConfirmAction] = useState(null);

  // Modal d'ajout d'item
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  // Modal de sélection d'adresse
  const [showAdresseModal, setShowAdresseModal] = useState(false);

  // Modal d'historique
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Entrée historique sélectionnée pour prévisualisation
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);

  // ============================================================================
  // INITIALISATION
  // ============================================================================

  /**
   * Charger la commande et les données associées
   */
  useEffect(() => {
    console.log("[useCommandeEditor] useEffect triggered, commandeId:", commandeId);

    const loadData = async () => {
      if (!commandeId) {
        console.error("[useCommandeEditor] No commandeId provided");
        toast.error("ID de commande manquant");
        navigate("/commandes");
        return;
      }

      console.log("[useCommandeEditor] Loading commande:", commandeId);

      // Charger la commande
      const result = await store.loadCommande(commandeId);
      console.log("[useCommandeEditor] loadCommande result:", result);

      if (!result.success) {
        console.error("[useCommandeEditor] Failed to load commande:", result.error);
        toast.error(result.error || "Erreur lors du chargement");
        navigate("/commandes");
        return;
      }

      console.log("[useCommandeEditor] Commande loaded successfully");
      // Charger l'historique initial
      loadHistory();
    };

    loadData();

    // Cleanup au démontage
    return () => {
      store.clearStore();
    };
  }, [commandeId]);

  /**
   * Mettre à jour les données associées dans le store
   */
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

  // ============================================================================
  // CHARGEMENT HISTORIQUE
  // ============================================================================

  /**
   * Charger l'historique des modifications
   */
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
      } catch (error) {
        console.error("Erreur chargement historique:", error);
      } finally {
        setHistoryLoading(false);
      }
    },
    [commandeId]
  );

  /**
   * Charger plus d'entrées historiques
   */
  const loadMoreHistory = useCallback(() => {
    if (history.length < historyTotal) {
      loadHistory(history.length);
    }
  }, [history.length, historyTotal, loadHistory]);

  // ============================================================================
  // CALCULS DÉRIVÉS
  // ============================================================================

  /**
   * Commande formatée avec données enrichies
   */
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

  /**
   * Menus disponibles (pour ajouter des items)
   */
  const availableMenus = useMemo(() => {
    return menus.filter((menu) => menu.statut === "disponible");
  }, [menus]);

  /**
   * Adresses actives
   */
  const activeAdresses = useMemo(() => {
    return adresses.filter((adresse) => adresse.is_active);
  }, [adresses]);

  /**
   * Livreurs actifs
   */
  const activeLivreurs = useMemo(() => {
    return livreurs.filter((livreur) => livreur.is_active);
  }, [livreurs]);

  /**
   * La commande peut être modifiée ?
   */
  const canEdit = useMemo(() => {
    if (!store.commande) return false;

    // Ne peut pas modifier une commande terminée ou annulée
    return !["terminee", "annulee"].includes(store.commande.statut_commande);
  }, [store.commande]);

  /**
   * La commande peut être livrée ?
   */
  const canDeliver = useMemo(() => {
    if (!store.commande) return false;

    return (
      store.commande.type === "livraison" &&
      store.commande.statut_livraison === "en_attente" &&
      store.commande.statut_commande !== "annulee"
    );
  }, [store.commande]);

  /**
   * La commande peut être clôturée ?
   */
  const canClose = useMemo(() => {
    if (!store.commande) return false;

    return store.commande.statut_commande === "en_cours";
  }, [store.commande]);

  // ============================================================================
  // ACTIONS DE MODIFICATION
  // ============================================================================

  /**
   * Mettre à jour un champ
   */
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

  /**
   * Mettre à jour plusieurs champs
   */
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

  /**
   * Ajouter un item au panier
   */
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

  /**
   * Supprimer un item
   */
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

  /**
   * Mettre à jour la quantité d'un item
   */
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

  /**
   * Assigner un livreur
   */
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

  /**
   * Définir l'adresse de livraison
   */
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

  /**
   * Mettre à jour le paiement
   */
  const updatePaiement = useCallback(
    (paiement) => {
      store.updatePaiement(paiement);
    },
    [store]
  );

  // ============================================================================
  // ACTIONS DE SAUVEGARDE
  // ============================================================================

  /**
   * Sauvegarder les modifications
   */
  const save = useCallback(async () => {
    if (!store.isDirty) {
      toast.info("Aucune modification à sauvegarder");
      return { success: true };
    }

    const result = await store.save();

    if (result.success) {
      toast.success("Modifications sauvegardées");
      loadHistory(); // Rafraîchir l'historique
    } else {
      toast.error(result.error || "Erreur lors de la sauvegarde");
    }

    return result;
  }, [store, user, commandeId, loadHistory]);

  /**
   * Annuler les modifications
   */
  const cancel = useCallback(() => {
    if (store.isDirty) {
      setConfirmAction({
        title: "Annuler les modifications ?",
        message:
          "Toutes les modifications non sauvegardées seront perdues.",
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

  /**
   * Retourner à la liste
   */
  const goBack = useCallback(() => {
    if (store.isDirty) {
      setConfirmAction({
        title: "Quitter sans sauvegarder ?",
        message:
          "Vous avez des modifications non sauvegardées. Voulez-vous quitter ?",
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

  // ============================================================================
  // ACTIONS LIVRAISON / CLÔTURE
  // ============================================================================

  /**
   * Marquer comme livrée
   */
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

  /**
   * Clôturer la commande
   */
  const close = useCallback(async () => {
    if (!canClose) {
      toast.error("Cette commande ne peut pas être clôturée");
      return { success: false };
    }

    setConfirmAction({
      title: "Clôturer la commande ?",
      message: "Cette action ne peut pas être annulée.",
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
  }, [canClose, store, user, commandeId, loadHistory]);

  /**
   * Livrer et clôturer
   */
  const deliverAndClose = useCallback(async () => {
    if (!canDeliver && !canClose) {
      toast.error("Cette action n'est pas disponible");
      return { success: false };
    }

    setConfirmAction({
      title: "Livrer et clôturer ?",
      message:
        "La commande sera marquée comme livrée et clôturée. Cette action ne peut pas être annulée.",
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
  }, [canDeliver, canClose, store, user, commandeId, loadHistory]);

  // ============================================================================
  // ACTIONS HISTORIQUE
  // ============================================================================

  /**
   * Prévisualiser une entrée historique
   */
  const previewHistoryEntry = useCallback((entry) => {
    setSelectedHistoryEntry(entry);
  }, []);

  /**
   * Restaurer depuis l'historique
   */
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
            // Recharger la commande
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

  // ============================================================================
  // UNDO / REDO
  // ============================================================================

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

  // ============================================================================
  // RETOUR
  // ============================================================================

  return {
    // État principal
    commande: commandeFormatted,
    originalCommande: store.originalCommande,
    isLoading: store.isLoading || menusLoading || livreursLoading || adressesLoading,
    isSaving: store.isSaving,
    isDirty: store.isDirty,
    errors: store.errors,
    globalError: store.globalError,

    // Données associées
    menus: availableMenus,
    livreurs: activeLivreurs,
    adresses: activeAdresses,

    // Historique
    history,
    historyLoading,
    historyTotal,
    loadMoreHistory,
    hasMoreHistory: history.length < historyTotal,

    // Permissions
    canEdit,
    canDeliver,
    canClose,
    canUndo: store.canUndo(),
    canRedo: store.canRedo(),

    // Actions de modification
    updateField,
    updateFields,
    addItem,
    removeItem,
    updateItemQuantity,
    assignLivreur,
    setAdresse,
    updatePaiement,

    // Actions sauvegarde
    save,
    cancel,
    goBack,
    reset: store.reset,

    // Actions livraison/clôture
    deliver,
    close,
    deliverAndClose,

    // Actions historique
    previewHistoryEntry,
    rollbackToEntry,
    selectedHistoryEntry,
    setSelectedHistoryEntry,

    // Undo/Redo
    undo,
    redo,

    // Modals
    confirmAction,
    setConfirmAction,
    showAddItemModal,
    setShowAddItemModal,
    showAdresseModal,
    setShowAdresseModal,
    showHistoryModal,
    setShowHistoryModal,

    // Section active (pour mobile)
    activeSection: store.activeSection,
    setActiveSection: store.setActiveSection,

    // Constantes
    STATUTS_COMMANDE: commandeToolkit.STATUTS_COMMANDE,
    STATUTS_LIVRAISON: commandeToolkit.STATUTS_LIVRAISON,
    STATUTS_PAIEMENT: commandeToolkit.STATUTS_PAIEMENT,
    TYPES_COMMANDE: commandeToolkit.TYPES_COMMANDE,

    // Utilitaires
    getChanges: store.getChanges,
    isFieldDirty: store.isFieldDirty,
  };
};

// ============================================================================
// HELPERS
// ============================================================================

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
