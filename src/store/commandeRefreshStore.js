import { create } from "zustand";

/**
 * Store pour gérer le rafraîchissement global des commandes
 * Utilisé quand une nouvelle commande est créée ou modifiée
 * Toutes les pages/widgets écoutant ce store se rafraîchissent
 */
export const useCommandeRefreshStore = create((set) => ({
  // Timestamp de la dernière actualisation
  lastRefresh: null,

  // ID de la dernière commande créée/modifiée
  lastCommandeId: null,

  // Type de changement détecté
  changeType: null, // 'insert' | 'update'

  /**
   * Déclencher un rafraîchissement global des commandes
   * @param {string} commandeId - ID de la commande qui a changé
   * @param {string} type - Type de changement: 'insert' ou 'update'
   */
  triggerRefresh: (commandeId, type = "insert") => {
    const now = new Date().getTime();
    console.log(`
╔════════════════════════════════════════════════════════════╗
║ 🔄 [CommandeRefreshStore] REFRESH DÉCLENCHÉ               ║
║   Type: ${type.toUpperCase()}                                    
║   CommandeId: ${commandeId}                    
║   Timestamp: ${now}                           
╚════════════════════════════════════════════════════════════╝
    `);
    set({
      lastRefresh: now,
      lastCommandeId: commandeId,
      changeType: type,
    });
  },

  /**
   * Réinitialiser le store
   */
  reset: () => {
    console.log("🧹 [CommandeRefreshStore] Réinitialisation du store");
    set({
      lastRefresh: null,
      lastCommandeId: null,
      changeType: null,
    });
  },
}));

export default useCommandeRefreshStore;
