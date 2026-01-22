import { useState, useEffect, useCallback } from "react";
import * as menuToolkit from "@/utils/menuToolkit";
import { supabase } from "@/config/supabase";
import useActiveUserStore from "@/store/activeUserStore";

/**
 * Hook personnalisé pour la gestion des menus
 * Fournit toutes les fonctionnalités CRUD, filtrage, recherche et exports
 */
export const useMenus = () => {
  const { user } = useActiveUserStore();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // État pour les filtres
  const [filters, setFilters] = useState({
    type: null,
    statut: null,
    searchTerm: "",
  });

  /**
   * Charger tous les menus
   */
  const loadMenus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let result;

      // Appliquer les filtres
      if (filters.searchTerm) {
        result = await menuToolkit.searchMenus(filters.searchTerm);
      } else if (filters.type || filters.statut) {
        result = await menuToolkit.filterMenus({
          type: filters.type,
          statut: filters.statut,
        });
      } else {
        result = await menuToolkit.getMenus();
      }

      if (result.error) {
        throw result.error;
      }

      setMenus(result.menus);

      // Calculer les statistiques
      const menuStats = menuToolkit.getMenusStats(result.menus);
      setStats(menuStats);
    } catch (err) {
      console.error("Erreur lors du chargement des menus:", err);
      setError(err.message || "Erreur lors du chargement des menus");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /**
   * Créer un nouveau menu
   */
  const createMenu = async (menuData, imageFile = null) => {
    try {
      setError(null);

      // Vérifier les permissions
      if (!menuToolkit.canManageMenus(user?.role, "create")) {
        throw new Error("Vous n'avez pas les permissions nécessaires");
      }

      const { menu, error: createError } = await menuToolkit.createMenu(
        menuData,
        imageFile
      );

      if (createError) {
        throw createError;
      }

      // Recharger la liste
      await loadMenus();

      return { success: true, menu };
    } catch (err) {
      console.error("Erreur lors de la création:", err);
      setError(err.message || "Erreur lors de la création du menu");
      return { success: false, error: err.message };
    }
  };

  /**
   * Mettre à jour un menu
   */
  const updateMenu = async (menuId, updates, newImageFile = null) => {
    try {
      setError(null);

      // Vérifier les permissions
      if (!menuToolkit.canManageMenus(user?.role, "update")) {
        throw new Error("Vous n'avez pas les permissions nécessaires");
      }

      const { menu, error: updateError } = await menuToolkit.updateMenu(
        menuId,
        updates,
        newImageFile
      );

      if (updateError) {
        throw updateError;
      }

      // Recharger la liste
      await loadMenus();

      return { success: true, menu };
    } catch (err) {
      console.error("Erreur lors de la mise à jour:", err);
      setError(err.message || "Erreur lors de la mise à jour du menu");
      return { success: false, error: err.message };
    }
  };

  /**
   * Supprimer un menu
   */
  const deleteMenu = async (menuId) => {
    try {
      setError(null);

      // Vérifier les permissions
      if (!menuToolkit.canManageMenus(user?.role, "delete")) {
        throw new Error("Vous n'avez pas les permissions nécessaires");
      }

      const { success, error: deleteError } = await menuToolkit.deleteMenu(
        menuId
      );

      if (deleteError) {
        throw deleteError;
      }

      // Recharger la liste
      await loadMenus();

      return { success: true };
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      setError(err.message || "Erreur lors de la suppression du menu");
      return { success: false, error: err.message };
    }
  };

  /**
   * Changer le statut d'un menu (disponible/indisponible)
   */
  const toggleStatut = async (menuId, currentStatut) => {
    const newStatut =
      currentStatut === menuToolkit.MENU_STATUTS.DISPONIBLE
        ? menuToolkit.MENU_STATUTS.INDISPONIBLE
        : menuToolkit.MENU_STATUTS.DISPONIBLE;

    return updateMenu(menuId, { statut: newStatut });
  };

  /**
   * Appliquer des filtres
   */
  const applyFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * Réinitialiser les filtres
   */
  const resetFilters = useCallback(() => {
    setFilters({
      type: null,
      statut: null,
      searchTerm: "",
    });
  }, []);

  /**
   * Exporter les menus en CSV
   */
  const exportToCSV = () => {
    menuToolkit.exportMenusToCSV(menus);
  };

  /**
   * Exporter les menus en JSON
   */
  const exportToJSON = () => {
    menuToolkit.exportMenusToJSON(menus);
  };

  /**
   * S'abonner aux changements en temps réel
   */
  useEffect(() => {
    loadMenus();

    // Écouter les changements Realtime
    const channel = supabase
      .channel("menus-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menus",
        },
        (payload) => {
          console.log("Changement détecté:", payload);
          loadMenus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMenus]);

  return {
    // État
    menus,
    loading,
    error,
    stats,
    filters,

    // Actions CRUD
    createMenu,
    updateMenu,
    deleteMenu,
    toggleStatut,

    // Filtrage et recherche
    applyFilters,
    resetFilters,
    loadMenus,

    // Exports
    exportToCSV,
    exportToJSON,

    // Permissions
    canCreate: menuToolkit.canManageMenus(user?.role, "create"),
    canUpdate: menuToolkit.canManageMenus(user?.role, "update"),
    canDelete: menuToolkit.canManageMenus(user?.role, "delete"),

    // Constantes
    MENU_TYPES: menuToolkit.MENU_TYPES,
    MENU_STATUTS: menuToolkit.MENU_STATUTS,
    MENU_TYPE_LABELS: menuToolkit.MENU_TYPE_LABELS,
    MENU_STATUT_LABELS: menuToolkit.MENU_STATUT_LABELS,
  };
};

export default useMenus;
