import { useState, useMemo, useCallback } from "react";
import { useMenus } from "@/features/menus/hooks/useMenus";
import { useCartStore } from "@/features/panneauDeVente/store/cartStore";
import useActiveUserStore from "@/features/auth/store/activeUserStore";
import { usePointDeVenteStore } from "@/features/panneauDeVente/store/pointDeVenteStore";
import * as commandeToolkit from "@/features/commandes/utils/commandeToolkit";
import {
  validateCodePromo,
  calculateReduction,
  incrementInstanceUsage,
  getPromotionInstanceById,
} from "@/features/promotions/utils/promotionToolkit";
import { toast } from "sonner";

export const usePanneauDeVente = () => {
  const { menus, loading: menusLoading, error: menusError, MENU_TYPES, MENU_STATUTS } = useMenus();
  const { user } = useActiveUserStore();
  const { getPointDeVenteId } = usePointDeVenteStore();

  const cart = useCartStore();

  const [activeCategory, setActiveCategory] = useState("tous");
  const [searchTerm, setSearchTerm] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  const availableMenus = useMemo(() => {
    return menus.filter((menu) => menu.statut === MENU_STATUTS.DISPONIBLE);
  }, [menus, MENU_STATUTS]);

  const filteredMenus = useMemo(() => {
    return availableMenus.filter((menu) => {
      const matchCategory =
        activeCategory === "tous" || menu.type === activeCategory;

      const matchSearch =
        !searchTerm ||
        menu.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        menu.description?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchCategory && matchSearch;
    });
  }, [availableMenus, activeCategory, searchTerm]);

  const menusByType = useMemo(() => {
    const grouped = {};
    Object.values(MENU_TYPES).forEach((type) => {
      grouped[type] = availableMenus.filter((menu) => menu.type === type);
    });
    return grouped;
  }, [availableMenus, MENU_TYPES]);

  const subtotal = cart.getSubtotal();
  const discount = cart.getDiscount();
  const deliveryFee = cart.frais_livraison;
  const total = cart.details_paiement.total_apres_reduction;
  const totalItems = cart.getTotalItems();
  const totalPaid = cart.getTotalPaid();
  const remainingAmount = cart.getRemainingAmount();
  const canSubmit = cart.canSubmit();
  const isFullyPaid = remainingAmount <= 0 && total > 0;

  const addToCart = useCallback(
    async (menu, quantite = 1) => {
      cart.addItem(menu, quantite);
      toast.success(`${menu.nom_court ?? menu.nom} ajouté au panier`);

      if (menu.is_promo && menu.promotion_id && !cart.promotion) {
        try {
          const { success, instance } = await getPromotionInstanceById(
            menu.promotion_id
          );
          if (success && instance?.code_promo && instance.is_active) {
            const panierMontant = cart.getSubtotal();
            const reductionAmount = calculateReduction(instance, panierMontant);

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
              instance,
            };

            cart.applyPromotion(promo);
            toast.success(`Promo "${instance.code_promo}" appliquée automatiquement`);
          }
        } catch (err) {
          // silently ignore auto-promo errors
        }
      }
    },
    [cart]
  );

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

  const incrementQuantity = useCallback(
    (menuId) => {
      cart.incrementQuantity(menuId);
    },
    [cart]
  );

  const decrementQuantity = useCallback(
    (menuId) => {
      cart.decrementQuantity(menuId);
    },
    [cart]
  );

  const updateQuantity = useCallback(
    (menuId, quantity) => {
      cart.updateItemQuantity(menuId, quantity);
    },
    [cart]
  );

  const setClientInfo = useCallback(
    (clientInfo) => {
      cart.setClient(clientInfo);
    },
    [cart]
  );

  const setOrderType = useCallback(
    (type) => {
      cart.setType(type);
    },
    [cart]
  );

  const setDeliveryInfo = useCallback(
    (deliveryInfo) => {
      cart.setLivraison(deliveryInfo);
    },
    [cart]
  );

  const applyPromoCode = useCallback(
    async (code) => {
      try {
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

        const reductionAmount = calculateReduction(instance, panierMontant);

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
          instance,
        };

        cart.applyPromotion(promo);
        toast.success(`Code promo "${code}" appliqué !`);
        return { success: true, promotion: promo };
      } catch (error) {
        toast.error("Erreur lors de la validation du code promo");
        return { success: false, error: error.message };
      }
    },
    [cart, user]
  );

  const removePromoCode = useCallback(() => {
    cart.removePromotion();
    toast.info("Code promo retiré");
  }, [cart]);

  const recordPayment = useCallback(
    (method, amount) => {
      cart.setPayment(method, amount);
    },
    [cart]
  );

  const resetPayments = useCallback(() => {
    cart.resetPayments();
  }, [cart]);

  const payRemainingInCash = useCallback(() => {
    const remaining = cart.getRemainingAmount();
    if (remaining > 0) {
      const currentCash = cart.details_paiement.cash;
      cart.setPayment("cash", currentCash + remaining);
      toast.success("Paiement complété en espèces");
    }
  }, [cart]);

  const submitCommande = useCallback(async () => {
    if (!canSubmit) {
      toast.error("Impossible de valider la commande");
      return { success: false, error: "Validation impossible" };
    }

    if (!user?.id) {
      toast.error("Vous devez être connecté");
      return { success: false, error: "Non authentifié" };
    }

    const pointDeVenteId = getPointDeVenteId();
    if (!pointDeVenteId) {
      toast.error("Aucun point de vente sélectionné");
      return { success: false, error: "Point de vente manquant" };
    }

    setIsSubmitting(true);

    try {
      const commandeData = cart.prepareCommandeData();

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

      const { commande, error } = await commandeToolkit.createCommande(
        {
          ...commandeData,
          point_de_vente: pointDeVenteId,
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

      if (cart.promotion?.instance?.id) {
        try {
          await incrementInstanceUsage(cart.promotion.instance.id);
        } catch {
          // silently ignore promo increment errors
        }
      }

      setLastOrder(commande);
      setShowConfirmation(true);
      cart.clearCart();
      toast.success("Commande créée avec succès !");

      return { success: true, commande };
    } catch (error) {
      toast.error("Erreur lors de la création de la commande");
      return { success: false, error: error.message };
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, user, cart, getPointDeVenteId]);

  const openPaymentPanel = useCallback(() => {
    if (cart.isEmpty()) {
      toast.warning("Le panier est vide");
      return;
    }
    setShowPaymentPanel(true);
  }, [cart]);

  const closePaymentPanel = useCallback(() => {
    setShowPaymentPanel(false);
  }, []);

  const closeConfirmation = useCallback(() => {
    setShowConfirmation(false);
    setLastOrder(null);
  }, []);

  const startNewOrder = useCallback(() => {
    cart.clearCart();
    setShowConfirmation(false);
    setShowPaymentPanel(false);
    setLastOrder(null);
    setSearchTerm("");
    setActiveCategory("tous");
  }, [cart]);

  return {
    menus: filteredMenus,
    allMenus: availableMenus,
    menusByType,
    menusLoading,
    menusError,
    activeCategory,
    setActiveCategory,
    searchTerm,
    setSearchTerm,

    cartItems: cart.items,
    cartIsEmpty: cart.isEmpty(),
    totalItems,

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

    promotion: cart.promotion,

    subtotal,
    discount,
    deliveryFee,
    total,
    totalPaid,
    remainingAmount,
    isFullyPaid,

    canSubmit,
    isSubmitting,

    addToCart,
    removeFromCart,
    incrementQuantity,
    decrementQuantity,
    updateQuantity,
    clearCart: cart.clearCart,

    setClientInfo,
    setOrderType,
    setDeliveryInfo,

    applyPromoCode,
    removePromoCode,

    recordPayment,
    resetPayments,
    payRemainingInCash,

    submitCommande,
    startNewOrder,

    showPaymentPanel,
    openPaymentPanel,
    closePaymentPanel,
    showConfirmation,
    closeConfirmation,
    lastOrder,

    MENU_TYPES,
    TYPES_COMMANDE: commandeToolkit.TYPES_COMMANDE,
  };
};
