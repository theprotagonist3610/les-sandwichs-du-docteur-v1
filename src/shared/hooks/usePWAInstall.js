import { useState, useEffect } from "react";
import { usePreferencesSettingsStore } from "@/store/preferencesSettingsStore";

const INSTALL_INSTRUCTIONS = {
  ios: "Sur iOS, appuyez sur le bouton Partager puis « Sur l'écran d'accueil »",
  android: "Sur Android, utilisez le menu du navigateur et sélectionnez « Installer l'application »",
  windows: "Cliquez sur l'icône d'installation dans la barre d'adresse ou utilisez le menu du navigateur",
  macos: "Cliquez sur l'icône d'installation dans la barre d'adresse ou utilisez le menu du navigateur",
};

const detectPlatform = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/win/.test(ua)) return "windows";
  if (/mac/.test(ua)) return "macos";
  if (/linux/.test(ua)) return "linux";
  return "other";
};

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installSupported, setInstallSupported] = useState(false);
  const [platform, setPlatform] = useState("unknown");

  const updateSetting = usePreferencesSettingsStore((s) => s.updateSetting);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true ||
      document.referrer.includes("android-app://");

    setIsStandalone(standalone);
    setIsInstalled(standalone);
    if (standalone) updateSetting("pwaInstalled", true);

    setInstallSupported("BeforeInstallPromptEvent" in window || "onbeforeinstallprompt" in window);
    setPlatform(detectPlatform());

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      updateSetting("pwaInstalled", true);
      updateSetting("pwaInstallPromptShown", true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [updateSetting]);

  const promptInstall = async () => {
    if (!deferredPrompt) return { success: false, error: "Installation prompt non disponible" };
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      updateSetting("pwaInstallPromptShown", true);
      if (outcome === "accepted") {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
      return { success: outcome === "accepted", outcome };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const getInstallInstructions = () =>
    INSTALL_INSTRUCTIONS[platform] ?? "Utilisez le menu de votre navigateur pour installer l'application";

  const canInstall = () => isInstallable && deferredPrompt !== null && !isInstalled;

  return {
    isInstallable,
    isInstalled,
    isStandalone,
    installSupported,
    platform,
    deferredPrompt,
    promptInstall,
    getInstallInstructions,
    canInstall,
  };
};
