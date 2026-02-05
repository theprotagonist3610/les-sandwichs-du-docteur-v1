import { useEffect, useCallback, useMemo } from "react";
import useComptabiliteStore from "@/store/comptabiliteStore";
import * as comptabiliteToolkit from "@/utils/comptabiliteToolkit";

/**
 * Hook personnalisé pour gérer la comptabilité
 *
 * Ce hook orchestre toute la logique métier de la comptabilité:
 * - Chargement et rafraîchissement des données
 * - Gestion des opérations CRUD
 * - Filtrage et recherche
 * - Calculs et statistiques
 * - Export de données
 *
 * @param {Object} options - Options du hook
 * @param {boolean} options.autoLoad - Charger automatiquement au montage (défaut: true)
 * @param {string} options.defaultOperation - Filtre par défaut sur le type d'opération
 * @param {string} options.defaultCompte - Filtre par défaut sur le compte
 * @returns {Object} État et fonctions de gestion
 */
const useComptabilite = (options = {}) => {
  const { autoLoad = true, defaultOperation = null, defaultCompte = null } = options;

  // ============================================================================
  // ÉTAT DU STORE
  // ============================================================================

  const {
    // Données
    operations,
    selectedOperation,
    loading,
    error,
    total,
    currentPage,
    limit,
    filters,
    orderBy,
    ascending,
    soldes,
    statistiques,
    statsLoading,

    // Actions
    fetchOperations,
    refreshOperations,
    createOperation,
    updateOperation,
    deleteOperation,
    selectOperation,
    clearSelection,
    setFilters,
    resetFilters,
    setSearchTerm,
    nextPage,
    previousPage,
    goToPage,
    setLimit,
    setSort,
    toggleSortOrder,
    fetchSoldes,
    fetchStatistiques,
    fetchAll,
    reset,
  } = useComptabiliteStore();

  // ============================================================================
  // CHARGEMENT INITIAL
  // ============================================================================

  useEffect(() => {
    if (autoLoad) {
      // Appliquer les filtres par défaut si fournis
      if (defaultOperation || defaultCompte) {
        setFilters({
          ...(defaultOperation && { operation: defaultOperation }),
          ...(defaultCompte && { compte: defaultCompte }),
        });
      }

      // Charger toutes les données
      fetchAll();
    }

    // Cleanup au démontage
    return () => {
      clearSelection();
    };
  }, [autoLoad, defaultOperation, defaultCompte]);

  // ============================================================================
  // FONCTIONS CRUD AVEC GESTION D'ERREUR
  // ============================================================================

  /**
   * Créer une nouvelle opération avec gestion d'erreur
   */
  const handleCreateOperation = useCallback(
    async (operationData) => {
      try {
        const result = await createOperation(operationData);
        return result;
      } catch (error) {
        console.error("Erreur création opération:", error);
        return { success: false, error: error.message };
      }
    },
    [createOperation]
  );

  /**
   * Mettre à jour une opération avec gestion d'erreur
   */
  const handleUpdateOperation = useCallback(
    async (operationId, updates) => {
      try {
        const result = await updateOperation(operationId, updates);
        return result;
      } catch (error) {
        console.error("Erreur mise à jour opération:", error);
        return { success: false, error: error.message };
      }
    },
    [updateOperation]
  );

  /**
   * Supprimer une opération avec gestion d'erreur
   */
  const handleDeleteOperation = useCallback(
    async (operationId) => {
      try {
        const result = await deleteOperation(operationId);
        return result;
      } catch (error) {
        console.error("Erreur suppression opération:", error);
        return { success: false, error: error.message };
      }
    },
    [deleteOperation]
  );

  // ============================================================================
  // FILTRAGE
  // ============================================================================

  /**
   * Appliquer les filtres et recharger
   */
  const applyFilters = useCallback(
    async (newFilters) => {
      setFilters(newFilters);
      await fetchAll();
    },
    [setFilters, fetchAll]
  );

  /**
   * Réinitialiser les filtres et recharger
   */
  const clearFilters = useCallback(async () => {
    resetFilters();
    await fetchAll();
  }, [resetFilters, fetchAll]);

  /**
   * Rechercher dans les opérations
   */
  const search = useCallback(
    async (searchTerm) => {
      setSearchTerm(searchTerm);
      await fetchOperations();
    },
    [setSearchTerm, fetchOperations]
  );

  // ============================================================================
  // PAGINATION
  // ============================================================================

  const totalPages = useMemo(() => {
    return Math.ceil(total / limit);
  }, [total, limit]);

  const hasNextPage = useMemo(() => {
    return currentPage < totalPages;
  }, [currentPage, totalPages]);

  const hasPreviousPage = useMemo(() => {
    return currentPage > 1;
  }, [currentPage]);

  // ============================================================================
  // STATISTIQUES ET CALCULS
  // ============================================================================

  /**
   * Obtenir le solde d'un compte spécifique
   */
  const getSoldeCompte = useCallback(
    (compte) => {
      if (!soldes || !soldes.soldes) return null;
      return soldes.soldes[compte] || null;
    },
    [soldes]
  );

  /**
   * Obtenir le solde total
   */
  const getSoldeTotal = useMemo(() => {
    if (!soldes) return 0;
    return soldes.totalGeneral || 0;
  }, [soldes]);

  /**
   * Rafraîchir les statistiques
   */
  const refreshStats = useCallback(async () => {
    await Promise.all([fetchSoldes(), fetchStatistiques()]);
  }, [fetchSoldes, fetchStatistiques]);

  // ============================================================================
  // EXPORT
  // ============================================================================

  /**
   * Exporter les opérations au format CSV
   */
  const exportOperations = useCallback(() => {
    try {
      const csvContent = comptabiliteToolkit.exportToCSV(operations);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `operations_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { success: true };
    } catch (error) {
      console.error("Erreur export CSV:", error);
      return { success: false, error: error.message };
    }
  }, [operations]);

  // ============================================================================
  // UTILITAIRES
  // ============================================================================

  /**
   * Formater une opération pour l'affichage
   */
  const formatOperation = useCallback((operation) => {
    return comptabiliteToolkit.formatOperation(operation);
  }, []);

  /**
   * Valider les données d'une opération
   */
  const validateOperation = useCallback((operationData) => {
    return comptabiliteToolkit.validateOperation(operationData);
  }, []);

  /**
   * Obtenir les opérations formatées
   */
  const formattedOperations = useMemo(() => {
    return operations.map((op) => formatOperation(op));
  }, [operations, formatOperation]);

  // ============================================================================
  // RETOUR
  // ============================================================================

  return {
    // État
    operations,
    formattedOperations,
    selectedOperation,
    loading,
    error,
    statsLoading,

    // Pagination
    currentPage,
    totalPages,
    total,
    limit,
    hasNextPage,
    hasPreviousPage,

    // Filtres
    filters,
    orderBy,
    ascending,

    // Statistiques
    soldes,
    statistiques,
    soldeTotal: getSoldeTotal,

    // Actions CRUD
    createOperation: handleCreateOperation,
    updateOperation: handleUpdateOperation,
    deleteOperation: handleDeleteOperation,
    selectOperation,
    clearSelection,

    // Actions de chargement
    refresh: refreshOperations,
    refreshAll: fetchAll,
    refreshStats,

    // Actions de filtrage
    applyFilters,
    clearFilters,
    search,

    // Actions de pagination
    nextPage,
    previousPage,
    goToPage,
    setLimit,

    // Actions de tri
    setSort,
    toggleSortOrder,

    // Utilitaires
    formatOperation,
    validateOperation,
    getSoldeCompte,
    exportOperations,

    // Constantes
    TYPES_OPERATION: comptabiliteToolkit.TYPES_OPERATION,
    TYPES_COMPTE: comptabiliteToolkit.TYPES_COMPTE,
    COMPTE_LABELS: comptabiliteToolkit.COMPTE_LABELS,

    // Reset
    reset,
  };
};

export default useComptabilite;
