import { useState, useEffect, useCallback } from "react";
import * as menuToolkit from "@/features/menus/utils/menuToolkit";
import { supabase } from "@/lib/supabase";
import useActiveUserStore from "@/features/auth/store/activeUserStore";

export const useMenus = () => {
  const { user } = useActiveUserStore();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const [filters, setFilters] = useState({
    type: null,
    statut: null,
    searchTerm: "",
  });

  const loadMenus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let result;

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

      const menuStats = menuToolkit.getMenusStats(result.menus);
      setStats(menuStats);
    } catch (err) {
      setError(err.message || "Erreur lors du chargement des menus");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const createMenu = async (menuData, imageFile = null) => {
    try {
      setError(null);

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

      await loadMenus();

      return { success: true, menu };
    } catch (err) {
      setError(err.message || "Erreur lors de la création du menu");
      return { success: false, error: err.message };
    }
  };

  const updateMenu = async (menuId, updates, newImageFile = null) => {
    try {
      setError(null);

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

      await loadMenus();

      return { success: true, menu };
    } catch (err) {
      setError(err.message || "Erreur lors de la mise à jour du menu");
      return { success: false, error: err.message };
    }
  };

  const deleteMenu = async (menuId) => {
    try {
      setError(null);

      if (!menuToolkit.canManageMenus(user?.role, "delete")) {
        throw new Error("Vous n'avez pas les permissions nécessaires");
      }

      const { success, error: deleteError } = await menuToolkit.deleteMenu(
        menuId
      );

      if (deleteError) {
        throw deleteError;
      }

      await loadMenus();

      return { success: true };
    } catch (err) {
      setError(err.message || "Erreur lors de la suppression du menu");
      return { success: false, error: err.message };
    }
  };

  const toggleStatut = async (menuId, currentStatut) => {
    const newStatut =
      currentStatut === menuToolkit.MENU_STATUTS.DISPONIBLE
        ? menuToolkit.MENU_STATUTS.INDISPONIBLE
        : menuToolkit.MENU_STATUTS.DISPONIBLE;

    return updateMenu(menuId, { statut: newStatut });
  };

  const applyFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      type: null,
      statut: null,
      searchTerm: "",
    });
  }, []);

  const exportToCSV = () => {
    menuToolkit.exportMenusToCSV(menus);
  };

  const exportToJSON = () => {
    menuToolkit.exportMenusToJSON(menus);
  };

  useEffect(() => {
    loadMenus();

    const channel = supabase
      .channel(`menus-changes-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menus",
        },
        () => {
          loadMenus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMenus]);

  return {
    menus,
    loading,
    error,
    stats,
    filters,

    createMenu,
    updateMenu,
    deleteMenu,
    toggleStatut,

    applyFilters,
    resetFilters,
    loadMenus,

    exportToCSV,
    exportToJSON,

    canCreate: menuToolkit.canManageMenus(user?.role, "create"),
    canUpdate: menuToolkit.canManageMenus(user?.role, "update"),
    canDelete: menuToolkit.canManageMenus(user?.role, "delete"),

    createMenuPromo: menuToolkit.createMenuPromo,

    MENU_TYPES: menuToolkit.MENU_TYPES,
    MENU_STATUTS: menuToolkit.MENU_STATUTS,
    MENU_TYPE_LABELS: menuToolkit.MENU_TYPE_LABELS,
    MENU_STATUT_LABELS: menuToolkit.MENU_STATUT_LABELS,
  };
};

export default useMenus;
