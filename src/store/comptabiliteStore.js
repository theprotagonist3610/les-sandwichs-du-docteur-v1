import { create } from "zustand";
import * as comptabiliteToolkit from "@/utils/comptabiliteToolkit";

/**
 * Store Zustand pour la gestion de l'état de la comptabilité
 *
 * Gère:
 * - Liste des opérations
 * - Filtres actifs
 * - Pagination
 * - Statistiques
 * - État de chargement
 */

const useComptabiliteStore = create((set, get) => ({
  // ============================================================================
  // ÉTAT
  // ============================================================================

  // Opérations
  operations: [],
  selectedOperation: null,
  loading: false,
  error: null,

  // Pagination
  total: 0,
  limit: 50,
  offset: 0,
  currentPage: 1,

  // Filtres
  filters: {
    operation: null, // 'encaissement' | 'depense' | null
    compte: null, // Type de compte ou null
    startDate: null,
    endDate: null,
    searchTerm: "",
  },

  // Tri
  orderBy: "date_operation",
  ascending: false,

  // Statistiques
  soldes: null,
  statistiques: null,
  statsLoading: false,

  // ============================================================================
  // ACTIONS - OPÉRATIONS
  // ============================================================================

  /**
   * Charger les opérations avec les filtres actuels
   */
  fetchOperations: async () => {
    set({ loading: true, error: null });

    try {
      const state = get();
      const result = await comptabiliteToolkit.getOperations({
        ...state.filters,
        limit: state.limit,
        offset: state.offset,
        orderBy: state.orderBy,
        ascending: state.ascending,
      });

      if (result.success) {
        set({
          operations: result.operations,
          total: result.total,
          loading: false,
        });
      } else {
        set({ error: result.error, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  /**
   * Recharger les opérations (reset pagination)
   */
  refreshOperations: async () => {
    set({ offset: 0, currentPage: 1 });
    await get().fetchOperations();
  },

  /**
   * Créer une nouvelle opération
   */
  createOperation: async (operationData) => {
    set({ loading: true, error: null });

    try {
      const result = await comptabiliteToolkit.createOperation(operationData);

      if (result.success) {
        // Recharger les opérations et les soldes
        await get().refreshOperations();
        await get().fetchSoldes();
        set({ loading: false });
        return { success: true, operation: result.operation };
      } else {
        set({ error: result.error, loading: false });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  /**
   * Mettre à jour une opération existante
   */
  updateOperation: async (operationId, updates) => {
    set({ loading: true, error: null });

    try {
      const result = await comptabiliteToolkit.updateOperation(
        operationId,
        updates
      );

      if (result.success) {
        // Recharger les opérations et les soldes
        await get().fetchOperations();
        await get().fetchSoldes();
        set({ loading: false });
        return { success: true, operation: result.operation };
      } else {
        set({ error: result.error, loading: false });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  /**
   * Supprimer une opération
   */
  deleteOperation: async (operationId) => {
    set({ loading: true, error: null });

    try {
      const result = await comptabiliteToolkit.deleteOperation(operationId);

      if (result.success) {
        // Recharger les opérations et les soldes
        await get().refreshOperations();
        await get().fetchSoldes();
        set({ loading: false });
        return { success: true };
      } else {
        set({ error: result.error, loading: false });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  /**
   * Sélectionner une opération
   */
  selectOperation: (operation) => {
    set({ selectedOperation: operation });
  },

  /**
   * Désélectionner l'opération
   */
  clearSelection: () => {
    set({ selectedOperation: null });
  },

  // ============================================================================
  // ACTIONS - FILTRES
  // ============================================================================

  /**
   * Mettre à jour les filtres
   */
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      offset: 0,
      currentPage: 1,
    }));
  },

  /**
   * Réinitialiser les filtres
   */
  resetFilters: () => {
    set({
      filters: {
        operation: null,
        compte: null,
        startDate: null,
        endDate: null,
        searchTerm: "",
      },
      offset: 0,
      currentPage: 1,
    });
  },

  /**
   * Mettre à jour le terme de recherche
   */
  setSearchTerm: (searchTerm) => {
    set((state) => ({
      filters: { ...state.filters, searchTerm },
      offset: 0,
      currentPage: 1,
    }));
  },

  // ============================================================================
  // ACTIONS - PAGINATION
  // ============================================================================

  /**
   * Aller à la page suivante
   */
  nextPage: () => {
    const state = get();
    const maxPages = Math.ceil(state.total / state.limit);

    if (state.currentPage < maxPages) {
      set((state) => ({
        currentPage: state.currentPage + 1,
        offset: state.currentPage * state.limit,
      }));
      get().fetchOperations();
    }
  },

  /**
   * Aller à la page précédente
   */
  previousPage: () => {
    const state = get();

    if (state.currentPage > 1) {
      set((state) => ({
        currentPage: state.currentPage - 1,
        offset: (state.currentPage - 2) * state.limit,
      }));
      get().fetchOperations();
    }
  },

  /**
   * Aller à une page spécifique
   */
  goToPage: (page) => {
    const state = get();
    const maxPages = Math.ceil(state.total / state.limit);

    if (page >= 1 && page <= maxPages) {
      set({
        currentPage: page,
        offset: (page - 1) * state.limit,
      });
      get().fetchOperations();
    }
  },

  /**
   * Changer la limite de pagination
   */
  setLimit: (limit) => {
    set({ limit, offset: 0, currentPage: 1 });
    get().fetchOperations();
  },

  // ============================================================================
  // ACTIONS - TRI
  // ============================================================================

  /**
   * Changer le tri
   */
  setSort: (orderBy, ascending = false) => {
    set({ orderBy, ascending });
    get().fetchOperations();
  },

  /**
   * Inverser l'ordre de tri
   */
  toggleSortOrder: () => {
    set((state) => ({ ascending: !state.ascending }));
    get().fetchOperations();
  },

  // ============================================================================
  // ACTIONS - STATISTIQUES
  // ============================================================================

  /**
   * Charger les soldes de tous les comptes
   */
  fetchSoldes: async () => {
    set({ statsLoading: true });

    try {
      const state = get();
      const result = await comptabiliteToolkit.getAllSoldes(
        state.filters.startDate,
        state.filters.endDate
      );

      if (result.success) {
        set({ soldes: result, statsLoading: false });
      } else {
        set({ statsLoading: false });
      }
    } catch (error) {
      console.error("Erreur chargement soldes:", error);
      set({ statsLoading: false });
    }
  },

  /**
   * Charger les statistiques pour la période filtrée
   */
  fetchStatistiques: async () => {
    set({ statsLoading: true });

    try {
      const state = get();
      const result = await comptabiliteToolkit.getStatistiquesPeriode(
        state.filters.startDate,
        state.filters.endDate
      );

      if (result.success) {
        set({ statistiques: result.stats, statsLoading: false });
      } else {
        set({ statsLoading: false });
      }
    } catch (error) {
      console.error("Erreur chargement statistiques:", error);
      set({ statsLoading: false });
    }
  },

  /**
   * Charger toutes les données (opérations + statistiques)
   */
  fetchAll: async () => {
    await Promise.all([
      get().fetchOperations(),
      get().fetchSoldes(),
      get().fetchStatistiques(),
    ]);
  },

  // ============================================================================
  // ACTIONS - RÉINITIALISATION
  // ============================================================================

  /**
   * Réinitialiser le store
   */
  reset: () => {
    set({
      operations: [],
      selectedOperation: null,
      loading: false,
      error: null,
      total: 0,
      offset: 0,
      currentPage: 1,
      filters: {
        operation: null,
        compte: null,
        startDate: null,
        endDate: null,
        searchTerm: "",
      },
      orderBy: "date_operation",
      ascending: false,
      soldes: null,
      statistiques: null,
      statsLoading: false,
    });
  },
}));

export default useComptabiliteStore;
