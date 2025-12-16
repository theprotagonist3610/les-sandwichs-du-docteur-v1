import { create } from "zustand";
import Cookies from "js-cookie";
import { useCookieConsentStore } from "./cookieConsentStore";

// Valeurs par défaut
const defaultSettings = {
  // Formats
  dateFormat: "DD/MM/YYYY", // 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  timeFormat: "24h", // '12h' | '24h'
  currency: "EUR", // 'EUR' | 'USD' | 'XOF'

  // Performance & Apparence
  highPerformanceMode: false,
  reducedAnimations: false,
  fullScreenMode: false,

  // Localisation
  locationPermission: "default", // 'default' | 'granted' | 'denied'
  locationEnabled: false,
  savedLocation: null, // { latitude, longitude, city }

  // PWA
  pwaInstalled: false,
  pwaInstallPromptShown: false,

  // Infos app
  appVersion: "1.0.0",
};

// Noms de stockage
const COOKIE_NAME = "lsd_preferences_settings";
const LOCALSTORAGE_NAME = "lsd_preferences_settings";
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
    console.error("Error loading preferences from storage:", error);
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
    console.error("Error saving preferences to storage:", error);
  }
};

// Appliquer les préférences
const applyPreferences = (settings) => {
  const root = document.documentElement;

  // Animations réduites
  if (settings.reducedAnimations) {
    root.style.setProperty("--animation-duration", "0ms");
    root.classList.add("reduce-motion");
  } else {
    root.style.setProperty("--animation-duration", "200ms");
    root.classList.remove("reduce-motion");
  }

  // Mode haute performance (désactive certains effets)
  if (settings.highPerformanceMode) {
    root.classList.add("high-performance");
  } else {
    root.classList.remove("high-performance");
  }
};

// Créer le store
export const usePreferencesSettingsStore = create((set, get) => {
  // Charger les paramètres au démarrage
  const initialSettings = loadFromStorage();

  // Appliquer immédiatement les préférences
  applyPreferences(initialSettings);

  return {
    settings: initialSettings,

    updateSetting: (key, value) =>
      set((state) => {
        const newSettings = { ...state.settings, [key]: value };
        saveToStorage(newSettings);
        applyPreferences(newSettings);
        return { settings: newSettings };
      }),

    resetSettings: () =>
      set(() => {
        saveToStorage(defaultSettings);
        applyPreferences(defaultSettings);
        return { settings: defaultSettings };
      }),

    // Gérer le cache de l'application
    clearCache: async () => {
      try {
        if ("caches" in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error clearing cache:", error);
        return false;
      }
    },

    // Obtenir la taille du cache
    getCacheSize: async () => {
      try {
        if ("storage" in navigator && "estimate" in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          return {
            usage: estimate.usage || 0,
            quota: estimate.quota || 0,
            usageMB: ((estimate.usage || 0) / (1024 * 1024)).toFixed(2),
            quotaMB: ((estimate.quota || 0) / (1024 * 1024)).toFixed(2),
          };
        }
        return null;
      } catch (error) {
        console.error("Error getting cache size:", error);
        return null;
      }
    },

    // Effacer tous les cookies (sauf consentement)
    clearAllCookies: () => {
      try {
        const cookies = document.cookie.split(";");
        for (let cookie of cookies) {
          const cookieName = cookie.split("=")[0].trim();
          // Ne pas supprimer le cookie de consentement
          if (cookieName !== "lsd_cookie_consent") {
            Cookies.remove(cookieName);
          }
        }
        return true;
      } catch (error) {
        console.error("Error clearing cookies:", error);
        return false;
      }
    },

    // Gérer le mode plein écran
    toggleFullScreen: async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          set((state) => {
            const newSettings = { ...state.settings, fullScreenMode: true };
            saveToStorage(newSettings);
            return { settings: newSettings };
          });
        } else {
          await document.exitFullscreen();
          set((state) => {
            const newSettings = { ...state.settings, fullScreenMode: false };
            saveToStorage(newSettings);
            return { settings: newSettings };
          });
        }
        return true;
      } catch (error) {
        console.error("Error toggling fullscreen:", error);
        return false;
      }
    },

    // Demander la permission de localisation
    requestLocationPermission: async () => {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        set((state) => {
          const newSettings = {
            ...state.settings,
            locationPermission: "granted",
            locationEnabled: true,
            savedLocation: location,
          };
          saveToStorage(newSettings);
          return { settings: newSettings };
        });

        return { success: true, location };
      } catch (error) {
        set((state) => {
          const newSettings = {
            ...state.settings,
            locationPermission: "denied",
            locationEnabled: false,
          };
          saveToStorage(newSettings);
          return { settings: newSettings };
        });

        return { success: false, error: error.message };
      }
    },

    // Installer la PWA
    installPWA: (deferredPrompt) => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === "accepted") {
            set((state) => {
              const newSettings = {
                ...state.settings,
                pwaInstalled: true,
                pwaInstallPromptShown: true,
              };
              saveToStorage(newSettings);
              return { settings: newSettings };
            });
          }
        });
      }
    },
  };
});

// Hook pour faciliter l'utilisation
export const usePreferencesSettings = () => {
  const settings = usePreferencesSettingsStore((state) => state.settings);
  const updateSetting = usePreferencesSettingsStore(
    (state) => state.updateSetting
  );
  const resetSettings = usePreferencesSettingsStore(
    (state) => state.resetSettings
  );
  const clearCache = usePreferencesSettingsStore((state) => state.clearCache);
  const getCacheSize = usePreferencesSettingsStore(
    (state) => state.getCacheSize
  );
  const clearAllCookies = usePreferencesSettingsStore(
    (state) => state.clearAllCookies
  );
  const toggleFullScreen = usePreferencesSettingsStore(
    (state) => state.toggleFullScreen
  );
  const requestLocationPermission = usePreferencesSettingsStore(
    (state) => state.requestLocationPermission
  );
  const installPWA = usePreferencesSettingsStore((state) => state.installPWA);

  return {
    settings,
    updateSetting,
    resetSettings,
    clearCache,
    getCacheSize,
    clearAllCookies,
    toggleFullScreen,
    requestLocationPermission,
    installPWA,
  };
};
