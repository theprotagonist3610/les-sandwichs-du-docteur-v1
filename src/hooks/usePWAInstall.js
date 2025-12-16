import { useState, useEffect } from "react";
import { usePreferencesSettingsStore } from "@/store/preferencesSettingsStore";

/**
 * Hook personnalisé pour gérer l'installation de la PWA
 *
 * Fonctionnalités :
 * - Détection du support du navigateur
 * - Capture de l'événement beforeinstallprompt
 * - Installation de la PWA
 * - Détection si l'app est déjà installée
 * - Feedback d'installation
 */
export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installSupported, setInstallSupported] = useState(false);
  const [platform, setPlatform] = useState("unknown");

  const updateSetting = usePreferencesSettingsStore(
    (state) => state.updateSetting
  );

  useEffect(() => {
    // Détecter le support de l'installation PWA
    const checkInstallSupport = () => {
      // Vérifier si beforeinstallprompt est supporté
      const supported = "BeforeInstallPromptEvent" in window ||
                       "onbeforeinstallprompt" in window;
      setInstallSupported(supported);

      // Détecter la plateforme
      const userAgent = navigator.userAgent.toLowerCase();
      if (/android/.test(userAgent)) {
        setPlatform("android");
      } else if (/iphone|ipad|ipod/.test(userAgent)) {
        setPlatform("ios");
      } else if (/win/.test(userAgent)) {
        setPlatform("windows");
      } else if (/mac/.test(userAgent)) {
        setPlatform("macos");
      } else if (/linux/.test(userAgent)) {
        setPlatform("linux");
      } else {
        setPlatform("other");
      }
    };

    // Vérifier si l'app est déjà en mode standalone (installée)
    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true ||
        document.referrer.includes("android-app://");

      setIsStandalone(standalone);
      setIsInstalled(standalone);

      if (standalone) {
        updateSetting("pwaInstalled", true);
      }
    };

    checkInstallSupport();
    checkStandalone();

    // Capturer l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      // Empêcher le mini-infobar d'apparaître sur mobile
      e.preventDefault();

      // Stocker l'événement pour l'utiliser plus tard
      setDeferredPrompt(e);
      setIsInstallable(true);

      console.log("PWA: beforeinstallprompt event captured");
    };

    // Détecter l'installation de la PWA
    const handleAppInstalled = () => {
      console.log("PWA: App installed successfully");
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      updateSetting("pwaInstalled", true);
      updateSetting("pwaInstallPromptShown", true);
    };

    // Écouter les événements
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Cleanup
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [updateSetting]);

  /**
   * Demander l'installation de la PWA
   * @returns {Promise<{success: boolean, outcome?: string, error?: string}>}
   */
  const promptInstall = async () => {
    if (!deferredPrompt) {
      return {
        success: false,
        error: "Installation prompt not available",
      };
    }

    try {
      // Afficher le prompt d'installation
      deferredPrompt.prompt();

      // Attendre le choix de l'utilisateur
      const choiceResult = await deferredPrompt.userChoice;

      console.log(`PWA: User choice: ${choiceResult.outcome}`);

      if (choiceResult.outcome === "accepted") {
        updateSetting("pwaInstallPromptShown", true);
        setIsInstallable(false);
        setDeferredPrompt(null);

        return {
          success: true,
          outcome: "accepted",
        };
      } else {
        updateSetting("pwaInstallPromptShown", true);
        return {
          success: false,
          outcome: "dismissed",
        };
      }
    } catch (error) {
      console.error("PWA: Error during installation:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  /**
   * Obtenir les instructions d'installation selon la plateforme
   * @returns {string}
   */
  const getInstallInstructions = () => {
    switch (platform) {
      case "ios":
        return "Sur iOS, appuyez sur le bouton Partager puis 'Sur l'écran d'accueil'";
      case "android":
        return "Sur Android, utilisez le menu du navigateur et sélectionnez 'Installer l'application'";
      case "windows":
        return "Cliquez sur l'icône d'installation dans la barre d'adresse ou utilisez le menu du navigateur";
      case "macos":
        return "Cliquez sur l'icône d'installation dans la barre d'adresse ou utilisez le menu du navigateur";
      default:
        return "Utilisez le menu de votre navigateur pour installer l'application";
    }
  };

  /**
   * Vérifier si l'installation est possible
   * @returns {boolean}
   */
  const canInstall = () => {
    return isInstallable && deferredPrompt !== null && !isInstalled;
  };

  return {
    // États
    isInstallable,
    isInstalled,
    isStandalone,
    installSupported,
    platform,
    deferredPrompt,

    // Méthodes
    promptInstall,
    getInstallInstructions,
    canInstall,
  };
};
