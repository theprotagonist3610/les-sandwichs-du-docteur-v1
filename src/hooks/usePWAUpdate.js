import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Hook pour détecter les mises à jour de la PWA et rechargeur automatiquement
 * Affiche une notification toast quand une mise à jour est disponible
 */
export const usePWAUpdate = () => {
  useEffect(() => {
    // Vérifier si le navigateur supporte les Service Workers
    if (!("serviceWorker" in navigator)) {
      return;
    }

    // Écouter les mises à jour du Service Worker
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Une nouvelle version du SW a pris le contrôle
      // Recharger la page pour appliquer la mise à jour
      console.log("🔄 Mise à jour PWA détectée, rechargement de la page...");
      window.location.reload();
    });

    // Vérifier les mises à jour au démarrage et périodiquement
    const checkUpdates = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();

        for (const registration of registrations) {
          // Vérifier les mises à jour
          await registration.update();
        }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des mises à jour PWA:",
          error,
        );
      }
    };

    // Vérifier immédiatement au montage
    checkUpdates();

    // Vérifier toutes les 30 secondes
    const interval = setInterval(checkUpdates, 30 * 1000);

    return () => clearInterval(interval);
  }, []);
};

export default usePWAUpdate;
