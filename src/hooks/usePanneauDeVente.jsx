import { useState, useMemo, useCallback } from "react";
import { useMenus } from "@/hooks/useMenus";
import useCartStore from "@/store/cartStore";
import useActiveUserStore from "@/store/activeUserStore";
import * as commandeToolkit from "@/utils/commandeToolkit";
import {
  validateCodePromo,
  calculateReduction,
  incrementInstanceUsage,
} from "@/utils/promotionToolkit";
import { toast } from "sonner";

/**
 * Hook Controller pour le Panneau de Vente (POS)
 * Gère la logique métier entre le catalogue de menus et le panier
 */
export const usePanneauDeVente = () => {
  // ============================================================================
  // HOOKS EXTERNES
  // ============================================================================

  const { menus, loading: menusLoading, error: menusError, MENU_TYPES, MENU_STATUTS } = useMenus();
  const { user } = useActiveUserStore();

  // Store du panier
  const cart = useCartStore();

  // ============================================================================
  // ÉTAT LOCAL
  // ============================================================================

  // Filtrage catalogue
  const [activeCategory, setActiveCategory] = useState("tous");
  const [searchTerm, setSearchTerm] = useState("");

  // États UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  // ============================================================================
  // MENUS FILTRÉS
  // ============================================================================

  // Filtrer uniquement les menus disponibles
  const availableMenus = useMemo(() => {
    return menus.filter((menu) => menu.statut === MENU_STATUTS.DISPONIBLE);
  }, [menus, MENU_STATUTS]);

  // Appliquer les filtres de catégorie et recherche
  const filteredMenus = useMemo(() => {
    return availableMenus.filter((menu) => {
      // Filtre par catégorie
      const matchCategory =
        activeCategory === "tous" || menu.type === activeCategory;

      // Filtre par recherche
      const matchSearch =
        !searchTerm ||
        menu.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        menu.description?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchCategory && matchSearch;
    });
  }, [availableMenus, activeCategory, searchTerm]);

  // Grouper les menus par type pour affichage
  const menusByType = useMemo(() => {
    const grouped = {};
    Object.values(MENU_TYPES).forEach((type) => {
      grouped[type] = availableMenus.filter((menu) => menu.type === type);
    });
    return grouped;
  }, [availableMenus, MENU_TYPES]);

  // ============================================================================
  // CALCULS DÉRIVÉS
  // ============================================================================

  const subtotal = cart.getSubtotal();
  const discount = cart.getDiscount();
  const deliveryFee = cart.frais_livraison;
  const total = cart.details_paiement.total_apres_reduction;
  const totalItems = cart.getTotalItems();
  const totalPaid = cart.getTotalPaid();
  const remainingAmount = cart.getRemainingAmount();
  const canSubmit = cart.canSubmit();
  const isFullyPaid = remainingAmount <= 0 && total > 0;

  // ============================================================================
  // ACTIONS PANIER
  // ============================================================================

  /**
   * Ajouter un article au panier avec feedback
   */
  const addToCart = useCallback(
    (menu) => {
      cart.addItem(menu);
      toast.success(`${menu.nom} ajouté au panier`);
    },
    [cart]
  );

  /**
   * Retirer un article du panier
   */
  const removeFromCart = useCallback(
    (menuId) => {
      const item = cart.items.find((i) => i.menu.id === menuId);
      if (item) {
        cart.removeItem(menuId);
        toast.info(`${item.menu.nom} retiré du panier`);
      }
    },
    [cart]
  );

  /**
   * Incrémenter la quantité
   */
  const incrementQuantity = useCallback(
    (menuId) => {
      cart.incrementQuantity(menuId);
    },
    [cart]
  );

  /**
   * Décrémenter la quantité
   */
  const decrementQuantity = useCallback(
    (menuId) => {
      cart.decrementQuantity(menuId);
    },
    [cart]
  );

  /**
   * Mettre à jour la quantité directement
   */
  const updateQuantity = useCallback(
    (menuId, quantity) => {
      cart.updateItemQuantity(menuId, quantity);
    },
    [cart]
  );

  // ============================================================================
  // ACTIONS CLIENT
  // ============================================================================

  /**
   * Définir les infos client
   */
  const setClientInfo = useCallback(
    (clientInfo) => {
      cart.setClient(clientInfo);
    },
    [cart]
  );

  /**
   * Définir le type de commande
   */
  const setOrderType = useCallback(
    (type) => {
      cart.setType(type);
    },
    [cart]
  );

  /**
   * Définir les infos de livraison
   */
  const setDeliveryInfo = useCallback(
    (deliveryInfo) => {
      cart.setLivraison(deliveryInfo);
    },
    [cart]
  );

  // ============================================================================
  // ACTIONS PROMOTION
  // ============================================================================

  /**
   * Appliquer un code promo via le promotionToolkit
   */
  const applyPromoCode = useCallback(
    async (code) => {
      try {
        // Valider le code promo via le toolkit
        const panierMontant = cart.getSubtotal();
        const { valid, instance, message } = await validateCodePromo(
          code,
          panierMontant,
          user?.id
        );

        if (!valid) {
          toast.error(message || "Code promo invalide");
          return { success: false, error: message };
        }

        // Calculer la réduction
        const reductionAmount = calculateReduction(instance, panierMontant);

        // Convertir l'instance en format attendu par le store
        const promo = {
          id: instance.id,
          code: instance.code_promo,
          denomination: instance.denomination,
          type: instance.reduction_relative > 0 ? "pourcentage" : "montant",
          valeur:
            instance.reduction_relative > 0
              ? instance.reduction_relative
              : instance.reduction_absolue,
          reduction_absolue: instance.reduction_absolue,
          reduction_relative: instance.reduction_relative,
          reductionAmount,
          instance, // Garder la référence complète pour l'utilisation lors de la commande
        };

        cart.applyPromotion(promo);
        toast.success(`Code promo "${code}" appliqué !`);
        return { success: true, promotion: promo };
      } catch (error) {
        console.error("Erreur validation code promo:", error);
        toast.error("Erreur lors de la validation du code promo");
        return { success: false, error: error.message };
      }
    },
    [cart, user]
  );

  /**
   * Retirer le code promo
   */
  const removePromoCode = useCallback(() => {
    cart.removePromotion();
    toast.info("Code promo retiré");
  }, [cart]);

  // ============================================================================
  // ACTIONS PAIEMENT
  // ============================================================================

  /**
   * Enregistrer un paiement
   */
  const recordPayment = useCallback(
    (method, amount) => {
      cart.setPayment(method, amount);
    },
    [cart]
  );

  /**
   * Réinitialiser les paiements
   */
  const resetPayments = useCallback(() => {
    cart.resetPayments();
  }, [cart]);

  /**
   * Payer le reste en cash
   */
  const payRemainingInCash = useCallback(() => {
    const remaining = cart.getRemainingAmount();
    if (remaining > 0) {
      const currentCash = cart.details_paiement.cash;
      cart.setPayment("cash", currentCash + remaining);
      toast.success("Paiement complété en espèces");
    }
  }, [cart]);

  // ============================================================================
  // SOUMISSION COMMANDE
  // ============================================================================

  /**
   * Soumettre la commande
   */
  const submitCommande = useCallback(async () => {
    if (!canSubmit) {
      toast.error("Impossible de valider la commande");
      return { success: false, error: "Validation impossible" };
    }

    if (!user?.id) {
      toast.error("Vous devez être connecté");
      return { success: false, error: "Non authentifié" };
    }

    setIsSubmitting(true);

    try {
      // Préparer les données de la commande
      const commandeData = cart.prepareCommandeData();

      // Déterminer le statut de paiement
      const totalPaid = cart.getTotalPaid();
      const totalDue = cart.details_paiement.total_apres_reduction;

      let statut_paiement;
      if (totalPaid >= totalDue) {
        statut_paiement = commandeToolkit.STATUTS_PAIEMENT.PAYEE;
      } else if (totalPaid > 0) {
        statut_paiement = commandeToolkit.STATUTS_PAIEMENT.PARTIELLEMENT_PAYEE;
      } else {
        statut_paiement = commandeToolkit.STATUTS_PAIEMENT.NON_PAYEE;
      }

      // Créer la commande
      const { commande, error } = await commandeToolkit.createCommande(
        {
          ...commandeData,
          statut_paiement,
          statut_commande: commandeToolkit.STATUTS_COMMANDE.EN_COURS,
          statut_livraison:
            commandeData.type === commandeToolkit.TYPES_COMMANDE.LIVRAISON
              ? commandeToolkit.STATUTS_LIVRAISON.EN_ATTENTE
              : null,
        },
        user.id
      );

      if (error) {
        throw error;
      }

      // Incrémenter l'utilisation de la promotion si elle existe
      if (cart.promotion?.instance?.id) {
        try {
          await incrementInstanceUsage(cart.promotion.instance.id);
        } catch (promoError) {
          console.warn(
            "Erreur lors de l'incrémentation de l'utilisation de la promotion:",
            promoError
          );
        }
      }

      // Succès
      setLastOrder(commande);
      setShowConfirmation(true);
      cart.clearCart();
      toast.success("Commande créée avec succès !");

      return { success: true, commande };
    } catch (error) {
      console.error("Erreur lors de la création de la commande:", error);
      toast.error("Erreur lors de la création de la commande");
      return { success: false, error: error.message };
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, user, cart]);

  // ============================================================================
  // ACTIONS UI
  // ============================================================================

  /**
   * Ouvrir le panneau de paiement
   */
  const openPaymentPanel = useCallback(() => {
    if (cart.isEmpty()) {
      toast.warning("Le panier est vide");
      return;
    }
    setShowPaymentPanel(true);
  }, [cart]);

  /**
   * Fermer le panneau de paiement
   */
  const closePaymentPanel = useCallback(() => {
    setShowPaymentPanel(false);
  }, []);

  /**
   * Fermer la confirmation
   */
  const closeConfirmation = useCallback(() => {
    setShowConfirmation(false);
    setLastOrder(null);
  }, []);

  /**
   * Nouvelle commande (réinitialiser)
   */
  const startNewOrder = useCallback(() => {
    cart.clearCart();
    setShowConfirmation(false);
    setShowPaymentPanel(false);
    setLastOrder(null);
    setSearchTerm("");
    setActiveCategory("tous");
  }, [cart]);

  // ============================================================================
  // RETOUR
  // ============================================================================

  return {
    // États du catalogue
    menus: filteredMenus,
    allMenus: availableMenus,
    menusByType,
    menusLoading,
    menusError,
    activeCategory,
    setActiveCategory,
    searchTerm,
    setSearchTerm,

    // État du panier
    cartItems: cart.items,
    cartIsEmpty: cart.isEmpty(),
    totalItems,

    // Infos client & commande
    client: cart.client,
    contactClient: cart.contact_client,
    orderType: cart.type,
    deliveryInfo: {
      lieu_livraison: cart.lieu_livraison,
      instructions_livraison: cart.instructions_livraison,
      date_livraison: cart.date_livraison,
      heure_livraison: cart.heure_livraison,
      frais_livraison: cart.frais_livraison,
    },

    // Promotion
    promotion: cart.promotion,

    // Calculs
    subtotal,
    discount,
    deliveryFee,
    total,
    totalPaid,
    remainingAmount,
    isFullyPaid,

    // Validation
    canSubmit,
    isSubmitting,

    // Actions panier
    addToCart,
    removeFromCart,
    incrementQuantity,
    decrementQuantity,
    updateQuantity,
    clearCart: cart.clearCart,

    // Actions client
    setClientInfo,
    setOrderType,
    setDeliveryInfo,

    // Actions promo
    applyPromoCode,
    removePromoCode,

    // Actions paiement
    recordPayment,
    resetPayments,
    payRemainingInCash,

    // Actions commande
    submitCommande,
    startNewOrder,

    // UI
    showPaymentPanel,
    openPaymentPanel,
    closePaymentPanel,
    showConfirmation,
    closeConfirmation,
    lastOrder,

    // Constantes
    MENU_TYPES,
    TYPES_COMMANDE: commandeToolkit.TYPES_COMMANDE,
  };
};

export default usePanneauDeVente;
