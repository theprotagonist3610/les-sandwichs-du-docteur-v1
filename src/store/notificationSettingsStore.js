import { create } from "zustand";
import Cookies from "js-cookie";
import { useCookieConsentStore } from "./cookieConsentStore";

const defaultSettings = {
  notificationsEnabled: true,
  position: "bottom-right",
  duration: 4000,
  showSuccessNotifications: true,
  showErrorNotifications: true,
  showInfoNotifications: true,
  showWarningNotifications: true,
  closeButton: true,
  richColors: true,
  expandByDefault: false,
  confettiEnabled: true,
  playSoundOnNotification: true,
  vibrateOnNotification: true,
  systemNotificationsEnabled: false,
  systemNotificationPermission: "default",
};

const COOKIE_NAME = "lsd_notification_settings";
const LOCALSTORAGE_NAME = "lsd_notification_settings";
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

export const useNotificationSettingsStore = create((set) => {
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

    requestSystemNotificationPermission: async () => {
      if (!("Notification" in window)) return "denied";
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
      } catch {
        return "denied";
      }
    },
  };
});

export const useNotificationSettings = () => ({
  settings: useNotificationSettingsStore((s) => s.settings),
  updateSetting: useNotificationSettingsStore((s) => s.updateSetting),
  resetSettings: useNotificationSettingsStore((s) => s.resetSettings),
  requestSystemNotificationPermission: useNotificationSettingsStore(
    (s) => s.requestSystemNotificationPermission
  ),
});
