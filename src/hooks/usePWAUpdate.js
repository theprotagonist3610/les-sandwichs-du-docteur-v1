import { useEffect } from "react";

/**
 * Hook pour détecter les mises à jour de la PWA et recharger automatiquement
 * Force la mise à jour du service worker et nettoie les caches obsolètes
 */
export const usePWAUpdate = () => {
  useEffect(() => {
    // Désactiver en mode développement (pas de SW généré)
    if (import.meta.env.DEV) {
      return;
    }

    // Vérifier si le navigateur supporte les Service Workers
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let refreshing = false;

    // Écouter les mises à jour du Service Worker
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Éviter les rechargements multiples
      if (refreshing) return;
      refreshing = true;

      // Une nouvelle version du SW a pris le contrôle
      // Recharger la page pour appliquer la mise à jour
      console.log("🔄 Mise à jour PWA détectée, rechargement de la page...");
      window.location.reload();
    });

    // Vérifier les mises à jour au démarrage et périodiquement
    const checkUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();

        if (registration) {
          // Forcer la vérification des mises à jour
          await registration.update();

          // Si un nouveau SW est en attente, l'activer immédiatement
          if (registration.waiting) {
            console.log("🔄 Nouvelle version en attente, activation...");
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification des mises à jour PWA:",
          error
        );
      }
    };

    // Écouter quand un nouveau SW est installé et en attente
    const handleStateChange = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        console.log("🔄 Nouveau service worker en attente, activation...");
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    };

    // Observer l'installation de nouveaux service workers
    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              handleStateChange();
            }
          });
        }
      });
    });

    // Vérifier immédiatement au montage
    checkUpdates();

    // Vérifier toutes les 30 secondes
    const interval = setInterval(checkUpdates, 30 * 1000);

    return () => clearInterval(interval);
  }, []);
};

export default usePWAUpdate;
