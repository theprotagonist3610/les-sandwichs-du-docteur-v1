import { create } from "zustand";
import Cookies from "js-cookie";
import { useCookieConsentStore } from "./cookieConsentStore";

// Valeurs par défaut
const defaultSettings = {
  // Activation globale
  notificationsEnabled: true, // Activer/désactiver toutes les notifications

  // Paramètres d'affichage
  position: "bottom-right", // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
  duration: 4000, // Durée d'affichage en ms (1000-10000)

  // Notifications par type
  showSuccessNotifications: true,
  showErrorNotifications: true,
  showInfoNotifications: true,
  showWarningNotifications: true,

  // Comportement
  closeButton: true, // Afficher le bouton de fermeture
  richColors: true, // Utiliser les couleurs vives
  expandByDefault: false, // Étendre les notifications par défaut

  // Effets visuels
  confettiEnabled: true, // Afficher les confetti sur les notifications de succès

  // Notifications sonores (utilise soundSettingsStore)
  playSoundOnNotification: true, // Jouer un son lors des notifications
  vibrateOnNotification: true, // Vibrer lors des notifications

  // Notifications système (PWA)
  systemNotificationsEnabled: false, // Notifications système natives
  systemNotificationPermission: "default", // 'default' | 'granted' | 'denied'
};

// Noms de stockage
const COOKIE_NAME = "lsd_notification_settings";
const LOCALSTORAGE_NAME = "lsd_notification_settings";
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
    console.error("Error loading notification settings from storage:", error);
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
    console.error("Error saving notification settings to storage:", error);
  }
};

// Créer le store
export const useNotificationSettingsStore = create((set) => {
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

    // Fonction pour demander la permission des notifications système
    requestSystemNotificationPermission: async () => {
      if (!("Notification" in window)) {
        console.warn("This browser does not support system notifications");
        return "denied";
      }

      try {
        const permission = await Notification.requestPermission();
        set((state) => {
          const newSettings = {
            ...state.settings,
            systemNotificationPermission: permission,
            systemNotificationsEnabled: permission === "granted",
          };
          saveToStorage(newSettings);
          return { settings: newSettings };
        });
        return permission;
      } catch (error) {
        console.error("Error requesting notification permission:", error);
        return "denied";
      }
    },
  };
});

// Hook pour faciliter l'utilisation
export const useNotificationSettings = () => {
  const settings = useNotificationSettingsStore((state) => state.settings);
  const updateSetting = useNotificationSettingsStore(
    (state) => state.updateSetting
  );
  const resetSettings = useNotificationSettingsStore(
    (state) => state.resetSettings
  );
  const requestSystemNotificationPermission = useNotificationSettingsStore(
    (state) => state.requestSystemNotificationPermission
  );

  return {
    settings,
    updateSetting,
    resetSettings,
    requestSystemNotificationPermission,
  };
};
