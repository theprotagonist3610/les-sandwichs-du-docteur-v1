import { create } from "zustand";
import Cookies from "js-cookie";
import { useCookieConsentStore } from "./cookieConsentStore";

const defaultSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  notificationVolume: 80,
  errorVolume: 90,
  livreurVolume: 85,
  notificationSound: "/notification-1.mp3",
  errorSound: "/error-1.mp3",
  livreurSound: "/livreur-1.mp3",
  vibrationPattern: "medium",
  customVibrationPattern: [200, 100, 200],
};

const COOKIE_NAME = "lsd_sound_settings";
const LOCALSTORAGE_NAME = "lsd_sound_settings";
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

export const useSoundSettingsStore = create((set) => {
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

export const useSoundSettings = () => ({
  settings: useSoundSettingsStore((s) => s.settings),
  updateSetting: useSoundSettingsStore((s) => s.updateSetting),
  resetSettings: useSoundSettingsStore((s) => s.resetSettings),
});
