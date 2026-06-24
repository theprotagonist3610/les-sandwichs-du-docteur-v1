import { useState, useCallback, useEffect } from "react";
import { initDB } from "@/db/indexedDB";

/**
 * Hook personnalisé pour gérer les livreurs en local (IndexedDB)
 * CRUD + recherche + statistiques
 */
const useLivreursLocal = () => {
  const [livreurs, setLivreurs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    recentlyAdded: 0,
    recentlyUpdated: 0,
  });

  // ==================== CHARGEMENT ====================

  /**
   * Charger tous les livreurs depuis IndexedDB
   */
  const loadLivreurs = useCallback(async (options = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      const { includeInactive = false, orderBy = "denomination" } = options;

      const db = await initDB();
      let results = await db.getAll("livreurs");

      // Filtrer les inactifs si nécessaire
      if (!includeInactive) {
        results = results.filter((l) => l.is_active);
      }

      // Tri
      results.sort((a, b) => {
        if (orderBy === "created_at" || orderBy === "updated_at") {
          return new Date(b[orderBy]) - new Date(a[orderBy]);
        }
        return (a[orderBy] || "").localeCompare(b[orderBy] || "");
      });

      setLivreurs(results);
      return { success: true, livreurs: results };
    } catch (err) {
      console.error("Erreur lors du chargement des livreurs:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Charger les statistiques
   */
  const loadStats = useCallback(async () => {
    try {
      const db = await initDB();
      const allLivreurs = await db.getAll("livreurs");

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const newStats = {
        total: allLivreurs.length,
        active: allLivreurs.filter((l) => l.is_active).length,
        inactive: allLivreurs.filter((l) => !l.is_active).length,
        recentlyAdded: allLivreurs.filter(
          (l) => new Date(l.created_at) >= weekAgo
        ).length,
        recentlyUpdated: allLivreurs.filter(
          (l) => new Date(l.updated_at) >= weekAgo
        ).length,
      };

      setStats(newStats);
      return { success: true, stats: newStats };
    } catch (err) {
      console.error("Erreur lors du chargement des stats:", err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Rafraîchir les données
   */
  const refresh = useCallback(async () => {
    await loadLivreurs({ includeInactive: true });
    await loadStats();
  }, [loadLivreurs, loadStats]);

  // Charger automatiquement au montage (avec les inactifs)
  useEffect(() => {
    loadLivreurs({ includeInactive: true });
    loadStats();
  }, []);

  // ==================== CRUD ====================

  /**
   * Créer un nouveau livreur
   */
  const createLivreur = useCallback(
    async (livreurData) => {
      try {
        setIsLoading(true);
        setError(null);

        const db = await initDB();

        const newLivreur = {
          id: crypto.randomUUID(),
          denomination: livreurData.denomination,
          contact: livreurData.contact,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await db.add("livreurs", newLivreur);
        await refresh();

        return { success: true, livreur: newLivreur };
      } catch (err) {
        console.error("Erreur création livreur:", err);
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setIsLoading(false);
      }
    },
    [refresh]
  );

  /**
   * Mettre à jour un livreur
   */
  const updateLivreur = useCallback(
    async (livreurId, updates) => {
      try {
        setIsLoading(true);
        setError(null);

        const db = await initDB();
        const livreur = await db.get("livreurs", livreurId);

        if (!livreur) {
          throw new Error("Livreur non trouvé");
        }

        const updatedLivreur = {
          ...livreur,
          ...updates,
          updated_at: new Date().toISOString(),
        };

        await db.put("livreurs", updatedLivreur);
        await refresh();

        return { success: true, livreur: updatedLivreur };
      } catch (err) {
        console.error("Erreur mise à jour livreur:", err);
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setIsLoading(false);
      }
    },
    [refresh]
  );

  /**
   * Supprimer un livreur (hard delete)
   */
  const deleteLivreur = useCallback(
    async (livreurId) => {
      try {
        setIsLoading(true);
        setError(null);

        const db = await initDB();
        await db.delete("livreurs", livreurId);
        await refresh();

        return { success: true };
      } catch (err) {
        console.error("Erreur suppression livreur:", err);
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setIsLoading(false);
      }
    },
    [refresh]
  );

  /**
   * Désactiver un livreur
   */
  const deactivateLivreur = useCallback(
    async (livreurId) => {
      return updateLivreur(livreurId, { is_active: false });
    },
    [updateLivreur]
  );

  /**
   * Activer un livreur
   */
  const activateLivreur = useCallback(
    async (livreurId) => {
      return updateLivreur(livreurId, { is_active: true });
    },
    [updateLivreur]
  );

  // ==================== RECHERCHE ====================

  /**
   * Rechercher des livreurs
   */
  const searchLivreurs = useCallback(async (searchTerm, includeInactive = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const db = await initDB();
      let results = await db.getAll("livreurs");

      const term = searchTerm.toLowerCase().trim();

      // Filtrer par terme de recherche
      results = results.filter((livreur) => {
        const matchDenomination = livreur.denomination
          ?.toLowerCase()
          .includes(term);
        const matchContact = livreur.contact?.toLowerCase().includes(term);
        return matchDenomination || matchContact;
      });

      // Filtrer les inactifs
      if (!includeInactive) {
        results = results.filter((livreur) => livreur.is_active);
      }

      // Trier par dénomination
      results.sort((a, b) =>
        (a.denomination || "").localeCompare(b.denomination || "")
      );

      return { success: true, livreurs: results };
    } catch (err) {
      console.error("Erreur recherche livreurs:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ==================== BULK ====================

  /**
   * Importer plusieurs livreurs
   */
  const bulkImport = useCallback(
    async (livreursData) => {
      try {
        setIsLoading(true);
        setError(null);

        const db = await initDB();
        const tx = db.transaction("livreurs", "readwrite");
        const store = tx.objectStore("livreurs");

        for (const livreur of livreursData) {
          await store.put(livreur);
        }

        await tx.done;
        await refresh();

        return { success: true, count: livreursData.length };
      } catch (err) {
        console.error("Erreur import bulk:", err);
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setIsLoading(false);
      }
    },
    [refresh]
  );

  return {
    // État
    livreurs,
    isLoading,
    error,
    stats,

    // Chargement
    loadLivreurs,
    loadStats,
    refresh,

    // CRUD
    createLivreur,
    updateLivreur,
    deleteLivreur,
    deactivateLivreur,
    activateLivreur,

    // Recherche
    searchLivreurs,

    // Bulk
    bulkImport,
  };
};

export default useLivreursLocal;
