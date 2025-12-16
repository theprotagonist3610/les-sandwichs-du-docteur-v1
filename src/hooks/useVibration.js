import { useCallback } from "react";

/**
 * Hook pour gérer la vibration sur les appareils compatibles
 * Utilise l'API Vibration du navigateur
 */
export const useVibration = () => {
  /**
   * Vérifie si l'API Vibration est supportée
   */
  const isSupported = useCallback(() => {
    return "vibrate" in navigator;
  }, []);

  /**
   * Patterns de vibration prédéfinis
   */
  const patterns = {
    short: [100], // Vibration courte
    medium: [200], // Vibration moyenne
    long: [400], // Vibration longue
    double: [100, 100, 100], // Double vibration
    triple: [100, 50, 100, 50, 100], // Triple vibration
    pulse: [200, 100, 200, 100, 200], // Pattern pulsé
    custom: [200, 100, 200], // Pattern personnalisé par défaut
  };

  /**
   * Déclenche une vibration avec le pattern spécifié
   * @param {string|Array} pattern - Nom du pattern ou array personnalisé [vibrate, pause, vibrate...]
   */
  const vibrate = useCallback(
    (pattern = "medium") => {
      if (!isSupported()) {
        console.warn("Vibration API not supported on this device");
        return false;
      }

      try {
        let vibrationPattern;

        // Si c'est une string, utiliser le pattern prédéfini
        if (typeof pattern === "string") {
          vibrationPattern = patterns[pattern] || patterns.medium;
        }
        // Si c'est un array, l'utiliser directement
        else if (Array.isArray(pattern)) {
          vibrationPattern = pattern;
        } else {
          vibrationPattern = patterns.medium;
        }

        // Déclencher la vibration
        navigator.vibrate(vibrationPattern);
        return true;
      } catch (error) {
        console.error("Error triggering vibration:", error);
        return false;
      }
    },
    [isSupported]
  );

  /**
   * Arrête toute vibration en cours
   */
  const stop = useCallback(() => {
    if (!isSupported()) {
      return false;
    }

    try {
      navigator.vibrate(0);
      return true;
    } catch (error) {
      console.error("Error stopping vibration:", error);
      return false;
    }
  }, [isSupported]);

  return {
    vibrate,
    stop,
    isSupported,
    patterns,
  };
};
