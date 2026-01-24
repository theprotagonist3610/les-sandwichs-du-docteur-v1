import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as commandeToolkit from "@/utils/commandeToolkit";

/**
 * Store Zustand pour la gestion du panier (Panneau de Vente)
 */
const useCartStore = create(
  persist(
    (set, get) => ({
      // ============================================================================
      // ÉTAT
      // ============================================================================

      // Articles dans le panier: [{ menu: {...}, quantite: number, prix_unitaire: number, total: number }]
      items: [],

      // Informations client
      client: "non identifie",
      contact_client: "",
      contact_alternatif: "",

      // Type de commande
      type: commandeToolkit.TYPES_COMMANDE.SUR_PLACE,

      // Informations livraison
      lieu_livraison: null,
      instructions_livraison: "",
      date_livraison: null,
      heure_livraison: null,
      frais_livraison: 0,

      // Promotion appliquée: { code: string, type: "pourcentage" | "montant", valeur: number }
      promotion: null,

      // Détails du paiement
      details_paiement: {
        total: 0,
        total_apres_reduction: 0,
        momo: 0,
        cash: 0,
        autre: 0,
      },

      // ============================================================================
      // ACTIONS - GESTION DES ARTICLES
      // ============================================================================

      /**
       * Ajouter un article au panier
       * @param {Object} menu - L'article menu à ajouter
       * @param {number} quantite - Quantité à ajouter (défaut: 1)
       */
      addItem: (menu, quantite = 1) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.menu.id === menu.id
          );

          let newItems;
          if (existingIndex >= 0) {
            // L'article existe déjà, augmenter la quantité
            newItems = state.items.map((item, index) =>
              index === existingIndex
                ? {
                    ...item,
                    quantite: item.quantite + quantite,
                    total: (item.quantite + quantite) * item.prix_unitaire,
                  }
                : item
            );
          } else {
            // Nouvel article
            newItems = [
              ...state.items,
              {
                menu,
                quantite,
                prix_unitaire: menu.prix,
                total: menu.prix * quantite,
              },
            ];
          }

          return { items: newItems };
        });

        // Recalculer les totaux
        get().calculateTotals();
      },

      /**
       * Retirer un article du panier
       * @param {string} menuId - ID du menu à retirer
       */
      removeItem: (menuId) => {
        set((state) => ({
          items: state.items.filter((item) => item.menu.id !== menuId),
        }));
        get().calculateTotals();
      },

      /**
       * Mettre à jour la quantité d'un article
       * @param {string} menuId - ID du menu
       * @param {number} quantite - Nouvelle quantité
       */
      updateItemQuantity: (menuId, quantite) => {
        if (quantite <= 0) {
          get().removeItem(menuId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.menu.id === menuId
              ? {
                  ...item,
                  quantite,
                  total: quantite * item.prix_unitaire,
                }
              : item
          ),
        }));
        get().calculateTotals();
      },

      /**
       * Incrémenter la quantité d'un article
       * @param {string} menuId - ID du menu
       */
      incrementQuantity: (menuId) => {
        const item = get().items.find((i) => i.menu.id === menuId);
        if (item) {
          get().updateItemQuantity(menuId, item.quantite + 1);
        }
      },

      /**
       * Décrémenter la quantité d'un article
       * @param {string} menuId - ID du menu
       */
      decrementQuantity: (menuId) => {
        const item = get().items.find((i) => i.menu.id === menuId);
        if (item) {
          get().updateItemQuantity(menuId, item.quantite - 1);
        }
      },

      // ============================================================================
      // ACTIONS - INFORMATIONS CLIENT
      // ============================================================================

      /**
       * Définir les informations client
       * @param {Object} clientInfo - { client, contact_client, contact_alternatif }
       */
      setClient: (clientInfo) => {
        set({
          client: clientInfo.client || "non identifie",
          contact_client: clientInfo.contact_client || "",
          contact_alternatif: clientInfo.contact_alternatif || "",
        });
      },

      /**
       * Définir le type de commande
       * @param {string} type - "sur-place" ou "livraison"
       */
      setType: (type) => {
        set({ type });
        // Réinitialiser les frais de livraison si sur place
        if (type === commandeToolkit.TYPES_COMMANDE.SUR_PLACE) {
          set({
            lieu_livraison: null,
            instructions_livraison: "",
            date_livraison: null,
            heure_livraison: null,
            frais_livraison: 0,
          });
        }
        get().calculateTotals();
      },

      /**
       * Définir les informations de livraison
       * @param {Object} livraisonInfo - Infos de livraison
       */
      setLivraison: (livraisonInfo) => {
        set({
          lieu_livraison: livraisonInfo.lieu_livraison || null,
          instructions_livraison: livraisonInfo.instructions_livraison || "",
          date_livraison: livraisonInfo.date_livraison || null,
          heure_livraison: livraisonInfo.heure_livraison || null,
          frais_livraison: livraisonInfo.frais_livraison || 0,
        });
        get().calculateTotals();
      },

      // ============================================================================
      // ACTIONS - PROMOTION
      // ============================================================================

      /**
       * Appliquer une promotion
       * @param {Object} promotion - { code, type: "pourcentage"|"montant", valeur }
       */
      applyPromotion: (promotion) => {
        set({ promotion });
        get().calculateTotals();
      },

      /**
       * Retirer la promotion
       */
      removePromotion: () => {
        set({ promotion: null });
        get().calculateTotals();
      },

      // ============================================================================
      // ACTIONS - PAIEMENT
      // ============================================================================

      /**
       * Définir un montant de paiement
       * @param {string} method - "momo", "cash", ou "autre"
       * @param {number} amount - Montant payé
       */
      setPayment: (method, amount) => {
        set((state) => ({
          details_paiement: {
            ...state.details_paiement,
            [method]: amount,
          },
        }));
      },

      /**
       * Réinitialiser les paiements
       */
      resetPayments: () => {
        set((state) => ({
          details_paiement: {
            ...state.details_paiement,
            momo: 0,
            cash: 0,
            autre: 0,
          },
        }));
      },

      // ============================================================================
      // CALCULS
      // ============================================================================

      /**
       * Calculer les totaux
       */
      calculateTotals: () => {
        const state = get();

        // Sous-total des articles
        const subtotal = state.items.reduce((sum, item) => sum + item.total, 0);

        // Total avec frais de livraison
        let total = subtotal + state.frais_livraison;

        // Appliquer la promotion
        let reduction = 0;
        if (state.promotion) {
          if (state.promotion.type === "pourcentage") {
            reduction = (total * state.promotion.valeur) / 100;
          } else if (state.promotion.type === "montant") {
            reduction = state.promotion.valeur;
          }
        }

        const total_apres_reduction = Math.max(0, total - reduction);

        set({
          details_paiement: {
            ...state.details_paiement,
            total,
            total_apres_reduction,
          },
        });
      },

      // ============================================================================
      // GETTERS
      // ============================================================================

      /**
       * Obtenir le nombre total d'articles
       */
      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantite, 0);
      },

      /**
       * Obtenir le sous-total (sans frais de livraison ni réduction)
       */
      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.total, 0);
      },

      /**
       * Obtenir le montant de la réduction
       */
      getDiscount: () => {
        const state = get();
        const subtotal = state.items.reduce((sum, item) => sum + item.total, 0);
        const total = subtotal + state.frais_livraison;

        if (!state.promotion) return 0;

        if (state.promotion.type === "pourcentage") {
          return (total * state.promotion.valeur) / 100;
        }
        return state.promotion.valeur;
      },

      /**
       * Obtenir le montant total payé
       */
      getTotalPaid: () => {
        const { momo, cash, autre } = get().details_paiement;
        return momo + cash + autre;
      },

      /**
       * Obtenir le montant restant à payer
       */
      getRemainingAmount: () => {
        const state = get();
        const totalPaid = state.getTotalPaid();
        return Math.max(
          0,
          state.details_paiement.total_apres_reduction - totalPaid
        );
      },

      /**
       * Vérifier si le panier est vide
       */
      isEmpty: () => {
        return get().items.length === 0;
      },

      /**
       * Vérifier si la commande peut être validée
       */
      canSubmit: () => {
        const state = get();
        // Au moins un article
        if (state.items.length === 0) return false;
        // Si livraison, lieu requis
        if (
          state.type === commandeToolkit.TYPES_COMMANDE.LIVRAISON &&
          !state.lieu_livraison
        ) {
          return false;
        }
        return true;
      },

      // ============================================================================
      // RESET
      // ============================================================================

      /**
       * Vider complètement le panier
       */
      clearCart: () => {
        set({
          items: [],
          client: "non identifie",
          contact_client: "",
          contact_alternatif: "",
          type: commandeToolkit.TYPES_COMMANDE.SUR_PLACE,
          lieu_livraison: null,
          instructions_livraison: "",
          date_livraison: null,
          heure_livraison: null,
          frais_livraison: 0,
          promotion: null,
          details_paiement: {
            total: 0,
            total_apres_reduction: 0,
            momo: 0,
            cash: 0,
            autre: 0,
          },
        });
      },

      // ============================================================================
      // EXPORT POUR COMMANDE
      // ============================================================================

      /**
       * Préparer les données pour créer une commande
       * @returns {Object} Données formatées pour commandeToolkit.createCommande
       */
      prepareCommandeData: () => {
        const state = get();

        return {
          type: state.type,
          client: state.client,
          contact_client: state.contact_client,
          contact_alternatif: state.contact_alternatif,
          lieu_livraison: state.lieu_livraison,
          instructions_livraison: state.instructions_livraison,
          date_livraison: state.date_livraison,
          heure_livraison: state.heure_livraison,
          frais_livraison: state.frais_livraison,
          details_commandes: state.items.map((item) => ({
            item: item.menu.nom,
            menu_id: item.menu.id,
            quantite: item.quantite,
            prix_unitaire: item.prix_unitaire,
            total: item.total,
          })),
          promotion: state.promotion,
          details_paiement: state.details_paiement,
        };
      },
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({
        items: state.items,
        client: state.client,
        contact_client: state.contact_client,
        type: state.type,
        lieu_livraison: state.lieu_livraison,
        frais_livraison: state.frais_livraison,
        promotion: state.promotion,
        details_paiement: state.details_paiement,
      }),
    }
  )
);

export default useCartStore;
