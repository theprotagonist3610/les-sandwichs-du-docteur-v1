import { useCallback } from "react";
import * as commandeToolkit from "@/features/commandes/utils/commandeToolkit";

export const useCommandeCache = () => {
  const syncAndLoadCommandes = useCallback(async () => {
    try {
      const { commandes, error: fetchError } =
        await commandeToolkit.getAllCommandes();

      if (fetchError) {
        const cachedCommandes = await commandeToolkit.getFromCache();
        return { commandes: cachedCommandes, error: null, fromCache: true };
      }

      if (commandes && commandes.length > 0) {
        for (const commande of commandes) {
          await commandeToolkit.saveToCache(commande);
        }
      }

      return { commandes, error: null, fromCache: false };
    } catch {
      try {
        const cachedCommandes = await commandeToolkit.getFromCache();
        return { commandes: cachedCommandes, error: null, fromCache: true };
      } catch (cacheError) {
        return { commandes: [], error: cacheError, fromCache: true };
      }
    }
  }, []);

  const saveCommandeToCache = useCallback(async (commande) => {
    try {
      await commandeToolkit.saveToCache(commande);
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  }, []);

  const removeCommandeFromCache = useCallback(async (commandeId) => {
    try {
      await commandeToolkit.removeFromCache(commandeId);
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  }, []);

  const cleanOldCache = useCallback(async () => {
    try {
      await commandeToolkit.cleanCache();
      return { success: true, error: null };
    } catch (error) {
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
