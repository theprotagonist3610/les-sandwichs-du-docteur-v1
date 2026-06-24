import { create } from "zustand";
import Cookies from "js-cookie";
import { useCookieConsentStore } from "./cookieConsentStore";

const defaultSettings = {
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24h",
  currency: "XOF",
  highPerformanceMode: false,
  reducedAnimations: false,
  fullScreenMode: false,
  locationPermission: "default",
  locationEnabled: false,
  savedLocation: null,
  pwaInstalled: false,
  pwaInstallPromptShown: false,
  appVersion: "2.0.0",
};

const COOKIE_NAME = "lsd_preferences_settings";
const LOCALSTORAGE_NAME = "lsd_preferences_settings";
const COOKIE_OPTIONS = {
  expires: 365,
  sameSite: "lax",
  secure: window.location.protocol === "https:",
};

const canUseCookies = () => useCookieConsentStore.getState().hasConsent === true;

const loadFromStorage = () => {
  try {
    if (canUseCookies()) {
      const saved = Cookies.get(COOKIE_NAME);
      if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
    }
    const saved = localStorage.getItem(LOCALSTORAGE_NAME);
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch { /* expected */ }
  return defaultSettings;
};

const saveToStorage = (settings) => {
  try {
    if (canUseCookies()) {
      Cookies.set(COOKIE_NAME, JSON.stringify(settings), COOKIE_OPTIONS);
      localStorage.removeItem(LOCALSTORAGE_NAME);
    } else {
      localStorage.setItem(LOCALSTORAGE_NAME, JSON.stringify(settings));
      Cookies.remove(COOKIE_NAME);
    }
  } catch { /* expected */ }
};

const applyPreferences = (settings) => {
  const root = document.documentElement;
  if (settings.reducedAnimations) {
    root.style.setProperty("--animation-duration", "0ms");
    root.classList.add("reduce-motion");
  } else {
    root.style.setProperty("--animation-duration", "200ms");
    root.classList.remove("reduce-motion");
  }
  root.classList.toggle("high-performance", settings.highPerformanceMode);
};

export const usePreferencesSettingsStore = create((set, get) => {
  const initialSettings = loadFromStorage();
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

    clearCache: async () => {
      try {
        if (!("caches" in window)) return false;
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
        return true;
      } catch {
        return false;
      }
    },

    getCacheSize: async () => {
      try {
        if (!("storage" in navigator && "estimate" in navigator.storage)) return null;
        const { usage = 0, quota = 0 } = await navigator.storage.estimate();
        return {
          usage,
          quota,
          usageMB: (usage / (1024 * 1024)).toFixed(2),
          quotaMB: (quota / (1024 * 1024)).toFixed(2),
        };
      } catch {
        return null;
      }
    },

    clearAllCookies: () => {
      try {
        document.cookie.split(";").forEach((cookie) => {
          const name = cookie.split("=")[0].trim();
          if (name !== "lsd_cookie_consent") Cookies.remove(name);
        });
        return true;
      } catch {
        return false;
      }
    },

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
      } catch {
        return false;
      }
    },

    requestLocationPermission: async () => {
      try {
        const position = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject)
        );
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

    installPWA: (deferredPrompt) => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(({ outcome }) => {
        if (outcome === "accepted") {
          set((state) => {
            const newSettings = { ...state.settings, pwaInstalled: true, pwaInstallPromptShown: true };
            saveToStorage(newSettings);
            return { settings: newSettings };
          });
        }
      });
    },

    formatDate: (dateString) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      const { dateFormat, timeFormat } = get().settings;
      const d = String(date.getDate()).padStart(2, "0");
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const y = date.getFullYear();
      const h = date.getHours();
      const min = String(date.getMinutes()).padStart(2, "0");
      const datePart =
        dateFormat === "MM/DD/YYYY" ? `${m}/${d}/${y}` :
        dateFormat === "YYYY-MM-DD" ? `${y}-${m}-${d}` :
        `${d}/${m}/${y}`;
      const timePart =
        timeFormat === "12h"
          ? `${h % 12 || 12}:${min} ${h >= 12 ? "PM" : "AM"}`
          : `${String(h).padStart(2, "0")}:${min}`;
      return `${datePart} ${timePart}`;
    },

    formatDateOnly: (dateString) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      const { dateFormat } = get().settings;
      const d = String(date.getDate()).padStart(2, "0");
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const y = date.getFullYear();
      if (dateFormat === "MM/DD/YYYY") return `${m}/${d}/${y}`;
      if (dateFormat === "YYYY-MM-DD") return `${y}-${m}-${d}`;
      return `${d}/${m}/${y}`;
    },
  };
});

export const usePreferencesSettings = () => ({
  settings: usePreferencesSettingsStore((s) => s.settings),
  updateSetting: usePreferencesSettingsStore((s) => s.updateSetting),
  resetSettings: usePreferencesSettingsStore((s) => s.resetSettings),
  clearCache: usePreferencesSettingsStore((s) => s.clearCache),
  getCacheSize: usePreferencesSettingsStore((s) => s.getCacheSize),
  clearAllCookies: usePreferencesSettingsStore((s) => s.clearAllCookies),
  toggleFullScreen: usePreferencesSettingsStore((s) => s.toggleFullScreen),
  requestLocationPermission: usePreferencesSettingsStore((s) => s.requestLocationPermission),
  installPWA: usePreferencesSettingsStore((s) => s.installPWA),
  formatDate: usePreferencesSettingsStore((s) => s.formatDate),
  formatDateOnly: usePreferencesSettingsStore((s) => s.formatDateOnly),
});
