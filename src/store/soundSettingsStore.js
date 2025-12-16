import { create } from "zustand";
import Cookies from "js-cookie";
import { useCookieConsentStore } from "./cookieConsentStore";

// Valeurs par défaut
const defaultSettings = {
  soundEnabled: true, // Activer/désactiver les sons
  vibrationEnabled: true, // Activer/désactiver les vibrations
  notificationVolume: 80, // Volume notifications (0-100)
  errorVolume: 90, // Volume erreurs (0-100)
  livreurVolume: 85, // Volume alerte livreur (0-100)
  notificationSound: "/notification-1.mp3",
  errorSound: "/error-1.mp3",
  livreurSound: "/livreur-1.mp3",
  vibrationPattern: "medium", // 'short' | 'medium' | 'long' | 'custom'
  customVibrationPattern: [200, 100, 200], // Pattern personnalisé [vibrate, pause, vibrate...]
};

// Noms de stockage
const COOKIE_NAME = "lsd_sound_settings";
const LOCALSTORAGE_NAME = "lsd_sound_settings";
const COOKIE_OPTIONS = {
  expires: 365, // 1 an
  sameSite: "lax",
  secure: window.location.protocol === "https:",
};

// Vérifier si l'utilisateur a consenti aux cookies
const canUseCookies = () => {
  const state = useCookieConsentStore.getState();
  return state.hasConsent === true;
};

// Charger depuis le stockage (cookies ou localStorage)
const loadFromStorage = () => {
  try {
    // Priorité aux cookies si consentement donné
    if (canUseCookies()) {
      const saved = Cookies.get(COOKIE_NAME);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultSettings, ...parsed };
      }
    }

    // Fallback sur localStorage
    const saved = localStorage.getItem(LOCALSTORAGE_NAME);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.error("Error loading sound settings from storage:", error);
  }
  return defaultSettings;
};

// Sauvegarder dans le stockage approprié
const saveToStorage = (settings) => {
  try {
    if (canUseCookies()) {
      // Sauvegarder dans les cookies si consentement donné
      Cookies.set(COOKIE_NAME, JSON.stringify(settings), COOKIE_OPTIONS);
      // Nettoyer localStorage si présent
      localStorage.removeItem(LOCALSTORAGE_NAME);
    } else {
      // Fallback sur localStorage
      localStorage.setItem(LOCALSTORAGE_NAME, JSON.stringify(settings));
      // Nettoyer les cookies si présents
      Cookies.remove(COOKIE_NAME);
    }
  } catch (error) {
    console.error("Error saving sound settings to storage:", error);
  }
};

// Créer le store
export const useSoundSettingsStore = create((set) => {
  // Charger les paramètres au démarrage
  const initialSettings = loadFromStorage();

  return {
    settings: initialSettings,

    updateSetting: (key, value) =>
      set((state) => {
        const newSettings = { ...state.settings, [key]: value };
        saveToStorage(newSettings);
        return { settings: newSettings };
      }),

    resetSettings: () =>
      set(() => {
        saveToStorage(defaultSettings);
        return { settings: defaultSettings };
      }),
  };
});

// Hook pour faciliter l'utilisation (compatible avec le pattern utilisé)
export const useSoundSettings = () => {
  const settings = useSoundSettingsStore((state) => state.settings);
  const updateSetting = useSoundSettingsStore((state) => state.updateSetting);
  const resetSettings = useSoundSettingsStore((state) => state.resetSettings);

  return { settings, updateSetting, resetSettings };
};
