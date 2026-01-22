import { useCallback } from "react";
import * as commandeToolkit from "@/utils/commandeToolkit";

/**
 * Hook personnalisé pour gérer la synchronisation du cache des commandes
 */
export const useCommandeCache = () => {
  /**
   * Charger et synchroniser les commandes avec le cache local
   */
  const syncAndLoadCommandes = useCallback(async () => {
    try {
      // D'abord, récupérer toutes les commandes depuis Supabase
      const { commandes, error: fetchError } =
        await commandeToolkit.getAllCommandes();
      console.log(commandes[0]);
      if (fetchError) {
        console.error(
          "Erreur lors de la récupération des commandes:",
          fetchError,
        );
        // En cas d'erreur, charger depuis le cache local
        const cachedCommandes = await commandeToolkit.getFromCache();
        return { commandes: cachedCommandes, error: null, fromCache: true };
      }

      // Sauvegarder dans le cache
      if (commandes && commandes.length > 0) {
        for (const commande of commandes) {
          await commandeToolkit.saveToCache(commande);
        }
      }

      return { commandes, error: null, fromCache: false };
    } catch (error) {
      console.error("Exception lors de la récupération des commandes:", error);
      // Fallback: charger depuis le cache local
      try {
        const cachedCommandes = await commandeToolkit.getFromCache();
        return { commandes: cachedCommandes, error: null, fromCache: true };
      } catch (cacheError) {
        return { commandes: [], error: cacheError, fromCache: true };
      }
    }
  }, []);

  /**
   * Sauvegarder une commande dans le cache local
   */
  const saveCommandeToCache = useCallback(async (commande) => {
    try {
      await commandeToolkit.saveToCache(commande);
      return { success: true, error: null };
    } catch (error) {
      console.error("Erreur lors de la sauvegarde en cache:", error);
      return { success: false, error };
    }
  }, []);

  /**
   * Supprimer une commande du cache local
   */
  const removeCommandeFromCache = useCallback(async (commandeId) => {
    try {
      await commandeToolkit.removeFromCache(commandeId);
      return { success: true, error: null };
    } catch (error) {
      console.error("Erreur lors de la suppression du cache:", error);
      return { success: false, error };
    }
  }, []);

  /**
   * Nettoyer le cache (supprimer les anciennes commandes)
   */
  const cleanOldCache = useCallback(async () => {
    try {
      await commandeToolkit.cleanCache();
      return { success: true, error: null };
    } catch (error) {
      console.error("Erreur lors du nettoyage du cache:", error);
      return { success: false, error };
    }
  }, []);

  return {
    syncAndLoadCommandes,
    saveCommandeToCache,
    removeCommandeFromCache,
    cleanOldCache,
  };
};

export default useCommandeCache;
