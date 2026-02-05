import { create } from "zustand";
import * as commandeToolkit from "@/utils/commandeToolkit";

/**
 * Store Zustand pour l'édition d'une commande existante
 *
 * Gère:
 * - L'état de la commande en cours d'édition
 * - L'historique des modifications avec rollback
 * - Les données associées (livreurs, adresses)
 * - Les états UI (loading, saving, dirty)
 */
const useCommandeEditorStore = create((set, get) => ({
  // ============================================================================
  // ÉTAT - COMMANDE
  // ============================================================================

  // Commande originale (pour comparaison et reset)
  originalCommande: null,

  // Commande en cours d'édition
  commande: null,

  // Historique des modifications pour rollback
  history: [],

  // Index actuel dans l'historique (-1 = état courant)
  historyIndex: -1,

  // ============================================================================
  // ÉTAT - DONNÉES ASSOCIÉES
  // ============================================================================

  // Liste des livreurs disponibles
  livreurs: [],

  // Liste des adresses disponibles
  adresses: [],

  // Liste des menus disponibles (pour ajouter des items)
  menus: [],

  // ============================================================================
  // ÉTAT - UI
  // ============================================================================

  // Chargement initial
  isLoading: false,

  // Sauvegarde en cours
  isSaving: false,

  // La commande a été modifiée
  isDirty: false,

  // Erreurs de validation par champ
  errors: {},

  // Message d'erreur global
  globalError: null,

  // Section active (pour navigation mobile)
  activeSection: "info",

  // ============================================================================
  // ACTIONS - INITIALISATION
  // ============================================================================

  /**
   * Charger une commande pour édition
   * @param {string} commandeId - ID de la commande
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  loadCommande: async (commandeId) => {
    console.log("[commandeEditorStore] loadCommande called with ID:", commandeId);
    set({ isLoading: true, globalError: null });

    try {
      console.log("[commandeEditorStore] Calling getCommandeById...");
      // getCommandeById retourne { commande, error } (pas de success)
      const { commande, error } = await commandeToolkit.getCommandeById(commandeId);
      console.log("[commandeEditorStore] getCommandeById result:", { commande, error });

      if (error || !commande) {
        const errorMsg = error?.message || error || "Commande non trouvée";
        console.error("[commandeEditorStore] Failed:", errorMsg);
        set({
          isLoading: false,
          globalError: errorMsg,
        });
        return { success: false, error: errorMsg };
      }

      console.log("[commandeEditorStore] Commande loaded:", commande);

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

      console.log("[commandeEditorStore] State updated successfully");
      return { success: true };
    } catch (error) {
      console.error("[commandeEditorStore] Exception:", error);
      set({
        isLoading: false,
        globalError: error.message,
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Définir les livreurs disponibles
   * @param {Array} livreurs - Liste des livreurs
   */
  setLivreurs: (livreurs) => set({ livreurs }),

  /**
   * Définir les adresses disponibles
   * @param {Array} adresses - Liste des adresses
   */
  setAdresses: (adresses) => set({ adresses }),

  /**
   * Définir les menus disponibles
   * @param {Array} menus - Liste des menus
   */
  setMenus: (menus) => set({ menus }),

  /**
   * Définir la section active
   * @param {string} section - Nom de la section
   */
  setActiveSection: (section) => set({ activeSection: section }),

  // ============================================================================
  // ACTIONS - MODIFICATION DE LA COMMANDE
  // ============================================================================

  /**
   * Mettre à jour un champ de la commande
   * @param {string} field - Nom du champ
   * @param {any} value - Nouvelle valeur
   */
  updateField: (field, value) => {
    const state = get();
    if (!state.commande) return;

    // Sauvegarder l'état actuel dans l'historique
    get().saveToHistory();

    set((state) => ({
      commande: {
        ...state.commande,
        [field]: value,
      },
      isDirty: true,
      errors: {
        ...state.errors,
        [field]: null, // Effacer l'erreur de ce champ
      },
    }));
  },

  /**
   * Mettre à jour plusieurs champs à la fois
   * @param {Object} updates - Objet avec les champs à mettre à jour
   */
  updateFields: (updates) => {
    const state = get();
    if (!state.commande) return;

    // Sauvegarder l'état actuel dans l'historique
    get().saveToHistory();

    // Effacer les erreurs des champs modifiés
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

  /**
   * Mettre à jour les détails de la commande (items)
   * @param {Array} details - Nouveaux détails
   */
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

  /**
   * Ajouter un item à la commande
   * @param {Object} menu - Menu à ajouter
   * @param {number} quantite - Quantité (défaut: 1)
   */
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
      // Item existe déjà, augmenter la quantité
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
      // Nouvel item
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

    set({
      commande: {
        ...state.commande,
        details_commandes: newDetails,
      },
      isDirty: true,
    });
  },

  /**
   * Supprimer un item de la commande
   * @param {number} index - Index de l'item à supprimer
   */
  removeItem: (index) => {
    const state = get();
    if (!state.commande) return;

    get().saveToHistory();

    const newDetails = state.commande.details_commandes.filter(
      (_, i) => i !== index
    );

    set({
      commande: {
        ...state.commande,
        details_commandes: newDetails,
      },
      isDirty: true,
    });
  },

  /**
   * Mettre à jour la quantité d'un item
   * @param {number} index - Index de l'item
   * @param {number} quantite - Nouvelle quantité
   */
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

    set({
      commande: {
        ...state.commande,
        details_commandes: newDetails,
      },
      isDirty: true,
    });
  },

  /**
   * Assigner un livreur à la commande
   * @param {string} livreurId - ID du livreur (ou null pour désassigner)
   */
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

  /**
   * Définir l'adresse de livraison
   * @param {Object|null} adresse - Adresse sélectionnée ou null
   */
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

  /**
   * Mettre à jour les détails de paiement
   * @param {Object} paiement - Nouveaux détails de paiement
   */
  updatePaiement: (paiement) => {
    const state = get();
    if (!state.commande) return;

    get().saveToHistory();

    set({
      commande: {
        ...state.commande,
        details_paiement: {
          ...state.commande.details_paiement,
          ...paiement,
        },
      },
      isDirty: true,
    });
  },

  // ============================================================================
  // ACTIONS - HISTORIQUE
  // ============================================================================

  /**
   * Sauvegarder l'état actuel dans l'historique
   */
  saveToHistory: () => {
    const state = get();
    if (!state.commande) return;

    // Limiter l'historique à 50 entrées
    const maxHistory = 50;
    let newHistory = [...state.history];

    // Si on est dans le passé de l'historique, supprimer les entrées futures
    if (state.historyIndex >= 0) {
      newHistory = newHistory.slice(0, state.historyIndex + 1);
    }

    // Ajouter l'état actuel
    newHistory.push(JSON.parse(JSON.stringify(state.commande)));

    // Limiter la taille
    if (newHistory.length > maxHistory) {
      newHistory = newHistory.slice(-maxHistory);
    }

    set({
      history: newHistory,
      historyIndex: -1,
    });
  },

  /**
   * Annuler la dernière modification (undo)
   */
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

  /**
   * Refaire la modification annulée (redo)
   */
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

  /**
   * Vérifier si on peut annuler
   */
  canUndo: () => {
    const state = get();
    return state.history.length > 0 && state.historyIndex !== 0;
  },

  /**
   * Vérifier si on peut refaire
   */
  canRedo: () => {
    const state = get();
    return state.historyIndex >= 0 && state.historyIndex < state.history.length - 1;
  },

  // ============================================================================
  // ACTIONS - SAUVEGARDE
  // ============================================================================

  /**
   * Sauvegarder les modifications
   * @returns {Promise<{success: boolean, error?: string}>}
   */
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
      // Préparer les mises à jour (exclure id, vendeur, version, created_at, montant_total et les infos de jointure)
      const {
        id,
        vendeur,
        vendeur_id,
        vendeur_info,  // Données de jointure - ne pas envoyer
        point_de_vente_info,  // Données de jointure - ne pas envoyer
        version,
        created_at,
        montant_total,  // Champ calculé - ne pas envoyer
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

      // Mettre à jour avec la nouvelle version
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
      set({
        isSaving: false,
        globalError: error.message,
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Réinitialiser aux valeurs originales
   */
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

  // ============================================================================
  // ACTIONS - LIVRAISON ET CLÔTURE
  // ============================================================================

  /**
   * Marquer la commande comme livrée
   * @returns {Promise<{success: boolean, error?: string}>}
   */
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
        set({
          isSaving: false,
          globalError: result.error.message,
        });
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

  /**
   * Clôturer la commande
   * @returns {Promise<{success: boolean, error?: string}>}
   */
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
        set({
          isSaving: false,
          globalError: result.error.message,
        });
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

  /**
   * Livrer et clôturer en une seule opération
   * @returns {Promise<{success: boolean, error?: string}>}
   */
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
        set({
          isSaving: false,
          globalError: result.error.message,
        });
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

  // ============================================================================
  // GETTERS
  // ============================================================================

  /**
   * Obtenir les modifications entre l'original et l'actuel
   */
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

  /**
   * Vérifier si un champ a été modifié
   * @param {string} field - Nom du champ
   */
  isFieldDirty: (field) => {
    const state = get();
    if (!state.originalCommande || !state.commande) return false;

    return (
      JSON.stringify(state.originalCommande[field]) !==
      JSON.stringify(state.commande[field])
    );
  },

  // ============================================================================
  // RESET COMPLET
  // ============================================================================

  /**
   * Réinitialiser complètement le store
   */
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
