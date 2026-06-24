import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as commandeToolkit from "@/features/commandes/utils/commandeToolkit";

const useCartStore = create(
  persist(
    (set, get) => ({
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

      addItem: (menu, quantite = 1) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.menu.id === menu.id
          );

          let newItems;
          if (existingIndex >= 0) {
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

        get().calculateTotals();
      },

      removeItem: (menuId) => {
        set((state) => ({
          items: state.items.filter((item) => item.menu.id !== menuId),
        }));
        get().calculateTotals();
      },

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

      incrementQuantity: (menuId) => {
        const item = get().items.find((i) => i.menu.id === menuId);
        if (item) {
          get().updateItemQuantity(menuId, item.quantite + 1);
        }
      },

      decrementQuantity: (menuId) => {
        const item = get().items.find((i) => i.menu.id === menuId);
        if (item) {
          get().updateItemQuantity(menuId, item.quantite - 1);
        }
      },

      setClient: (clientInfo) => {
        set({
          client: clientInfo.client || "non identifie",
          contact_client: clientInfo.contact_client || "",
          contact_alternatif: clientInfo.contact_alternatif || "",
        });
      },

      setType: (type) => {
        set({ type });
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

      applyPromotion: (promotion) => {
        set({ promotion });
        get().calculateTotals();
      },

      removePromotion: () => {
        set({ promotion: null });
        get().calculateTotals();
      },

      setPayment: (method, amount) => {
        set((state) => ({
          details_paiement: {
            ...state.details_paiement,
            [method]: amount,
          },
        }));
      },

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

      calculateTotals: () => {
        const state = get();

        const subtotal = state.items.reduce((sum, item) => sum + item.total, 0);

        let total = subtotal + state.frais_livraison;

        let reduction = 0;
        if (state.promotion) {
          const promoItems = state.items.filter(
            (item) =>
              item.menu.is_promo &&
              item.menu.promotion_id === state.promotion.id
          );

          if (promoItems.length > 0) {
            const promoSubtotal = promoItems.reduce(
              (sum, item) => sum + item.total,
              0
            );
            const promoQuantite = promoItems.reduce(
              (sum, item) => sum + item.quantite,
              0
            );

            if (state.promotion.type === "pourcentage") {
              reduction = (promoSubtotal * state.promotion.valeur) / 100;
            } else if (state.promotion.type === "montant") {
              reduction = state.promotion.valeur * promoQuantite;
            }

            reduction = Math.min(reduction, promoSubtotal);
          } else {
            if (state.promotion.type === "pourcentage") {
              reduction = (subtotal * state.promotion.valeur) / 100;
            } else if (state.promotion.type === "montant") {
              reduction = state.promotion.valeur;
            }
            reduction = Math.min(reduction, subtotal);
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

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantite, 0);
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.total, 0);
      },

      getDiscount: () => {
        const state = get();
        if (!state.promotion) return 0;

        const subtotal = state.items.reduce((sum, item) => sum + item.total, 0);

        const promoItems = state.items.filter(
          (item) =>
            item.menu.is_promo &&
            item.menu.promotion_id === state.promotion.id
        );

        let reduction = 0;

        if (promoItems.length > 0) {
          const promoSubtotal = promoItems.reduce(
            (sum, item) => sum + item.total,
            0
          );
          const promoQuantite = promoItems.reduce(
            (sum, item) => sum + item.quantite,
            0
          );

          if (state.promotion.type === "pourcentage") {
            reduction = (promoSubtotal * state.promotion.valeur) / 100;
          } else if (state.promotion.type === "montant") {
            reduction = state.promotion.valeur * promoQuantite;
          }

          reduction = Math.min(reduction, promoSubtotal);
        } else {
          if (state.promotion.type === "pourcentage") {
            reduction = (subtotal * state.promotion.valeur) / 100;
          } else if (state.promotion.type === "montant") {
            reduction = state.promotion.valeur;
          }
          reduction = Math.min(reduction, subtotal);
        }

        return reduction;
      },

      getTotalPaid: () => {
        const { momo, cash, autre } = get().details_paiement;
        return momo + cash + autre;
      },

      getRemainingAmount: () => {
        const state = get();
        const totalPaid = state.getTotalPaid();
        return Math.max(
          0,
          state.details_paiement.total_apres_reduction - totalPaid
        );
      },

      isEmpty: () => {
        return get().items.length === 0;
      },

      canSubmit: () => {
        const state = get();
        if (state.items.length === 0) return false;
        if (
          state.type === commandeToolkit.TYPES_COMMANDE.LIVRAISON &&
          !state.lieu_livraison
        ) {
          return false;
        }
        return true;
      },

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

export { useCartStore };
export default useCartStore;
