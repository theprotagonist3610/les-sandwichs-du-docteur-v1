import { create } from "zustand";
import * as commandeToolkit from "@/features/commandes/utils/commandeToolkit";

const calculerStatutPaiement = (details_paiement) => {
  const totalDu  = details_paiement?.total_apres_reduction
                ?? details_paiement?.total
                ?? 0;
  const totalPaye = (details_paiement?.momo   || 0)
                  + (details_paiement?.cash   || 0)
                  + (details_paiement?.autre  || 0);

  if (totalDu <= 0)           return "non_payee";
  if (totalPaye >= totalDu)   return "payee";
  if (totalPaye > 0)          return "partiellement_payee";
  return "non_payee";
};

const recalculerTotaux = (details_commandes, details_paiement, promotion, frais_livraison) => {
  const sousTotal = (details_commandes || []).reduce(
    (sum, item) => sum + (item.total ?? item.quantite * item.prix_unitaire),
    0
  );

  const frais = frais_livraison || 0;
  const totalAvecFrais = sousTotal + frais;

  let reduction = 0;
  if (promotion) {
    if (promotion.type === "pourcentage") {
      reduction = (totalAvecFrais * promotion.valeur) / 100;
    } else {
      reduction = promotion.valeur || 0;
    }
  }

  const nouveauDetailsPaiement = {
    ...details_paiement,
    total:                 sousTotal,
    total_apres_reduction: Math.max(0, totalAvecFrais - reduction),
  };

  return {
    montant_total:   sousTotal,
    details_paiement: nouveauDetailsPaiement,
    statut_paiement: calculerStatutPaiement(nouveauDetailsPaiement),
  };
};

const useCommandeEditorStore = create((set, get) => ({
  originalCommande: null,
  commande: null,
  history: [],
  historyIndex: -1,

  livreurs: [],
  adresses: [],
  menus: [],

  isLoading: false,
  isSaving: false,
  isDirty: false,
  errors: {},
  globalError: null,
  activeSection: "info",

  loadCommande: async (commandeId) => {
    set({ isLoading: true, globalError: null });

    try {
      const { commande, error } = await commandeToolkit.getCommandeById(commandeId);

      if (error || !commande) {
        const errorMsg = error?.message || error || "Commande non trouvée";
        set({ isLoading: false, globalError: errorMsg });
        return { success: false, error: errorMsg };
      }

      set({
        originalCommande: JSON.parse(JSON.stringify(commande)),
        commande: JSON.parse(JSON.stringify(commande)),
        history: [],
        historyIndex: -1,
        isLoading: false,
        isDirty: false,
        errors: {},
        globalError: null,
      });

      return { success: true };
    } catch (error) {
      set({ isLoading: false, globalError: error.message });
      return { success: false, error: error.message };
    }
  },

  setLivreurs: (livreurs) => set({ livreurs }),
  setAdresses: (adresses) => set({ adresses }),
  setMenus: (menus) => set({ menus }),
  setActiveSection: (section) => set({ activeSection: section }),

  updateField: (field, value) => {
    const state = get();
    if (!state.commande) return;

    get().saveToHistory();

    set((state) => ({
      commande: {
        ...state.commande,
        [field]: value,
      },
      isDirty: true,
      errors: {
        ...state.errors,
        [field]: null,
      },
    }));
  },

  updateFields: (updates) => {
    const state = get();
    if (!state.commande) return;

    get().saveToHistory();

    const clearedErrors = { ...state.errors };
    Object.keys(updates).forEach((key) => {
      clearedErrors[key] = null;
    });

    set({
      commande: {
        ...state.commande,
        ...updates,
      },
      isDirty: true,
      errors: clearedErrors,
    });
  },

  updateDetails: (details) => {
    const state = get();
    if (!state.commande) return;

    get().saveToHistory();

    set({
      commande: {
        ...state.commande,
        details_commandes: details,
      },
      isDirty: true,
    });
  },

  addItem: (menu, quantite = 1) => {
    const state = get();
    if (!state.commande) return;

    get().saveToHistory();

    const currentDetails = state.commande.details_commandes || [];
    const existingIndex = currentDetails.findIndex(
      (item) => item.menu_id === menu.id
    );

    let newDetails;
    if (existingIndex >= 0) {
      newDetails = currentDetails.map((item, index) =>
        index === existingIndex
          ? {
              ...item,
              quantite: item.quantite + quantite,
              total: (item.quantite + quantite) * item.prix_unitaire,
            }
          : item
      );
    } else {
      newDetails = [
        ...currentDetails,
        {
          item: menu.nom,
          menu_id: menu.id,
          quantite,
          prix_unitaire: menu.prix,
          total: menu.prix * quantite,
        },
      ];
    }

    const totaux = recalculerTotaux(
      newDetails,
      state.commande.details_paiement,
      state.commande.promotion,
      state.commande.frais_livraison,
    );

    set({
      commande: {
        ...state.commande,
        details_commandes: newDetails,
        ...totaux,
      },
      isDirty: true,
    });
  },

  removeItem: (index) => {
    const state = get();
    if (!state.commande) return;

    get().saveToHistory();

    const newDetails = state.commande.details_commandes.filter(
      (_, i) => i !== index
    );

    const totaux = recalculerTotaux(
      newDetails,
      state.commande.details_paiement,
      state.commande.promotion,
      state.commande.frais_livraison,
    );

    set({
      commande: {
        ...state.commande,
        details_commandes: newDetails,
        ...totaux,
      },
      isDirty: true,
    });
  },

  updateItemQuantity: (index, quantite) => {
    const state = get();
    if (!state.commande) return;

    if (quantite <= 0) {
      get().removeItem(index);
      return;
    }

    get().saveToHistory();

    const newDetails = state.commande.details_commandes.map((item, i) =>
      i === index
        ? {
            ...item,
            quantite,
            total: quantite * item.prix_unitaire,
          }
        : item
    );

    const totaux = recalculerTotaux(
      newDetails,
      state.commande.details_paiement,
      state.commande.promotion,
      state.commande.frais_livraison,
    );

    set({
      commande: {
        ...state.commande,
        details_commandes: newDetails,
        ...totaux,
      },
      isDirty: true,
    });
  },

  assignLivreur: (livreurId) => {
    const state = get();
    if (!state.commande) return;

    get().saveToHistory();

    const livreur = livreurId
      ? state.livreurs.find((l) => l.id === livreurId)
      : null;

    set({
      commande: {
        ...state.commande,
        livreur_id: livreurId,
        livreur: livreur || null,
      },
      isDirty: true,
    });
  },

  setAdresseLivraison: (adresse) => {
    const state = get();
    if (!state.commande) return;

    get().saveToHistory();

    set({
      commande: {
        ...state.commande,
        lieu_livraison: adresse
          ? `${adresse.adresse}, ${adresse.quartier}, ${adresse.commune}`
          : null,
        adresse_id: adresse?.id || null,
      },
      isDirty: true,
    });
  },

  updatePaiement: (paiement) => {
    const state = get();
    if (!state.commande) return;

    get().saveToHistory();

    const nouveauDetailsPaiement = {
      ...state.commande.details_paiement,
      ...paiement,
    };

    set({
      commande: {
        ...state.commande,
        details_paiement: nouveauDetailsPaiement,
        statut_paiement:  calculerStatutPaiement(nouveauDetailsPaiement),
      },
      isDirty: true,
    });
  },

  saveToHistory: () => {
    const state = get();
    if (!state.commande) return;

    const maxHistory = 50;
    let newHistory = [...state.history];

    if (state.historyIndex >= 0) {
      newHistory = newHistory.slice(0, state.historyIndex + 1);
    }

    newHistory.push(JSON.parse(JSON.stringify(state.commande)));

    if (newHistory.length > maxHistory) {
      newHistory = newHistory.slice(-maxHistory);
    }

    set({
      history: newHistory,
      historyIndex: -1,
    });
  },

  undo: () => {
    const state = get();
    if (state.history.length === 0) return;

    const newIndex =
      state.historyIndex === -1
        ? state.history.length - 1
        : state.historyIndex - 1;

    if (newIndex < 0) return;

    set({
      commande: JSON.parse(JSON.stringify(state.history[newIndex])),
      historyIndex: newIndex,
      isDirty: true,
    });
  },

  redo: () => {
    const state = get();
    if (state.historyIndex === -1 || state.historyIndex >= state.history.length - 1) {
      return;
    }

    const newIndex = state.historyIndex + 1;

    set({
      commande: JSON.parse(JSON.stringify(state.history[newIndex])),
      historyIndex: newIndex === state.history.length - 1 ? -1 : newIndex,
      isDirty: true,
    });
  },

  canUndo: () => {
    const state = get();
    return state.history.length > 0 && state.historyIndex !== 0;
  },

  canRedo: () => {
    const state = get();
    return state.historyIndex >= 0 && state.historyIndex < state.history.length - 1;
  },

  save: async () => {
    const state = get();
    if (!state.commande || !state.originalCommande) {
      return { success: false, error: "Aucune commande à sauvegarder" };
    }

    if (!state.isDirty) {
      return { success: true };
    }

    set({ isSaving: true, globalError: null });

    try {
      const {
        id,
        vendeur,
        vendeur_id,
        vendeur_info,
        point_de_vente_info,
        version,
        created_at,
        montant_total,
        ...updates
      } = state.commande;

      const result = await commandeToolkit.updateCommande(
        state.commande.id,
        updates,
        state.originalCommande.version
      );

      if (result.error) {
        set({
          isSaving: false,
          globalError: result.error.message || "Erreur lors de la sauvegarde",
        });
        return { success: false, error: result.error.message };
      }

      set({
        originalCommande: JSON.parse(JSON.stringify(result.commande)),
        commande: JSON.parse(JSON.stringify(result.commande)),
        isSaving: false,
        isDirty: false,
        history: [],
        historyIndex: -1,
      });

      return { success: true };
    } catch (error) {
      set({ isSaving: false, globalError: error.message });
      return { success: false, error: error.message };
    }
  },

  reset: () => {
    const state = get();
    if (!state.originalCommande) return;

    set({
      commande: JSON.parse(JSON.stringify(state.originalCommande)),
      isDirty: false,
      errors: {},
      globalError: null,
      history: [],
      historyIndex: -1,
    });
  },

  deliver: async () => {
    const state = get();
    if (!state.commande) {
      return { success: false, error: "Aucune commande" };
    }

    set({ isSaving: true, globalError: null });

    try {
      const result = await commandeToolkit.updateStatutLivraison(
        state.commande.id,
        commandeToolkit.STATUTS_LIVRAISON.LIVREE,
        state.commande.version
      );

      if (result.error) {
        set({ isSaving: false, globalError: result.error.message });
        return { success: false, error: result.error.message };
      }

      set({
        originalCommande: JSON.parse(JSON.stringify(result.commande)),
        commande: JSON.parse(JSON.stringify(result.commande)),
        isSaving: false,
        isDirty: false,
      });

      return { success: true };
    } catch (error) {
      set({ isSaving: false, globalError: error.message });
      return { success: false, error: error.message };
    }
  },

  close: async () => {
    const state = get();
    if (!state.commande) {
      return { success: false, error: "Aucune commande" };
    }

    set({ isSaving: true, globalError: null });

    try {
      const result = await commandeToolkit.closeCommande(
        state.commande.id,
        "terminee",
        state.commande.version
      );

      if (result.error) {
        set({ isSaving: false, globalError: result.error.message });
        return { success: false, error: result.error.message };
      }

      set({
        originalCommande: JSON.parse(JSON.stringify(result.commande)),
        commande: JSON.parse(JSON.stringify(result.commande)),
        isSaving: false,
        isDirty: false,
      });

      return { success: true };
    } catch (error) {
      set({ isSaving: false, globalError: error.message });
      return { success: false, error: error.message };
    }
  },

  deliverAndClose: async () => {
    const state = get();
    if (!state.commande) {
      return { success: false, error: "Aucune commande" };
    }

    set({ isSaving: true, globalError: null });

    try {
      const result = await commandeToolkit.deliverAndCloseCommande(
        state.commande.id,
        state.commande.version
      );

      if (result.error) {
        set({ isSaving: false, globalError: result.error.message });
        return { success: false, error: result.error.message };
      }

      set({
        originalCommande: JSON.parse(JSON.stringify(result.commande)),
        commande: JSON.parse(JSON.stringify(result.commande)),
        isSaving: false,
        isDirty: false,
      });

      return { success: true };
    } catch (error) {
      set({ isSaving: false, globalError: error.message });
      return { success: false, error: error.message };
    }
  },

  getChanges: () => {
    const state = get();
    if (!state.originalCommande || !state.commande) return {};

    const changes = {};
    const ignore = ["version", "updated_at"];

    Object.keys(state.commande).forEach((key) => {
      if (ignore.includes(key)) return;

      const original = JSON.stringify(state.originalCommande[key]);
      const current = JSON.stringify(state.commande[key]);

      if (original !== current) {
        changes[key] = {
          original: state.originalCommande[key],
          current: state.commande[key],
        };
      }
    });

    return changes;
  },

  isFieldDirty: (field) => {
    const state = get();
    if (!state.originalCommande || !state.commande) return false;

    return (
      JSON.stringify(state.originalCommande[field]) !==
      JSON.stringify(state.commande[field])
    );
  },

  clearStore: () => {
    set({
      originalCommande: null,
      commande: null,
      history: [],
      historyIndex: -1,
      livreurs: [],
      adresses: [],
      menus: [],
      isLoading: false,
      isSaving: false,
      isDirty: false,
      errors: {},
      globalError: null,
      activeSection: "info",
    });
  },
}));

export default useCommandeEditorStore;
