import { useEffect, useRef } from "react";
import useCommandeRefreshStore from "@/store/commandeRefreshStore";

/**
 * Hook pour rafraîchir automatiquement les données quand une commande change
 * À utiliser dans les pages/composants qui affichent des commandes
 *
 * @param {Function} onRefresh - Callback appelé quand il y a un changement
 * @param {boolean} includeInsertOnly - Si true, rafraîchir seulement sur INSERT (pas UPDATE)
 * @param {string} componentName - Nom du composant pour les logs
 *
 * @example
 * const MyCommandesPage = () => {
 *   const loadCommandes = () => { ... };
 *   useCommandeRefresh(loadCommandes, false, "MyCommandesPage");
 *   return ...
 * }
 */
export const useCommandeRefresh = (
  onRefresh,
  includeInsertOnly = false,
  componentName = "Unknown",
) => {
  const { lastRefresh, changeType, lastCommandeId } = useCommandeRefreshStore();
  const onRefreshRef = useRef(onRefresh);

  // Mettre à jour la ref quand onRefresh change
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    console.log(
      `📡 [useCommandeRefresh] ${componentName} - State change detected:`,
      {
        lastRefresh,
        changeType,
        lastCommandeId,
        includeInsertOnly,
      },
    );

    if (!lastRefresh) {
      console.log(
        `📡 [useCommandeRefresh] ${componentName} - Pas de refresh (lastRefresh = null)`,
      );
      return;
    }

    // Si on veut seulement les INSERTs
    if (includeInsertOnly && changeType !== "insert") {
      console.log(
        `⏭️ [useCommandeRefresh] ${componentName} - UPDATE ignoré (includeInsertOnly=true)`,
      );
      return;
    }

    if (!onRefreshRef.current) {
      console.error(
        `❌ [useCommandeRefresh] ${componentName} - onRefresh est null!`,
      );
      return;
    }

    console.log(`
╔════════════════════════════════════════════════════════════╗
║ 🔄 [useCommandeRefresh] EXÉCUTION DU CALLBACK              ║
║   Composant: ${componentName}                    
║   Type: ${changeType?.toUpperCase()}                           
║   CommandeId: ${lastCommandeId}                  
║   Timestamp: ${new Date().toISOString()}        
╚════════════════════════════════════════════════════════════╝
    `);

    console.log(
      `🚀 [useCommandeRefresh] ${componentName} - Appel de onRefreshRef.current()...`,
    );
    onRefreshRef.current();
    console.log(
      `✅ [useCommandeRefresh] ${componentName} - Callback onRefresh exécuté avec succès`,
    );
  }, [
    lastRefresh,
    changeType,
    includeInsertOnly,
    componentName,
    lastCommandeId,
  ]);
};

export default useCommandeRefresh;
