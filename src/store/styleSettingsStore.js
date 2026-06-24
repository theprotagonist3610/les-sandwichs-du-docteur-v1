import { create } from "zustand";
import Cookies from "js-cookie";
import { useCookieConsentStore } from "./cookieConsentStore";

const defaultSettings = {
  theme: "light",
  fontFamily: "system",
  fontSize: "medium",
  fontWeight: "normal",
  italic: false,
  density: "comfortable",
  contrast: "standard",
  borderBeamEnabled: false,
};

const COOKIE_NAME = "lsd_style_settings";
const LOCALSTORAGE_NAME = "lsd_style_settings";
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

const applyStyles = (settings) => {
  const root = document.documentElement;

  // Thème
  if (settings.theme === "dark") root.classList.add("dark");
  else if (settings.theme === "light") root.classList.remove("dark");
  else if (settings.theme === "auto") {
    root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  // Police — "system" retire l'override pour laisser --font-body CSS actif (Karla)
  const fontMap = {
    inter: "'Inter', sans-serif",
    roboto: "'Roboto', sans-serif",
    opensans: "'Open Sans', sans-serif",
    poppins: "'Poppins', sans-serif",
    nunito: "'Nunito', sans-serif",
  };
  if (settings.fontFamily === "system") root.style.removeProperty("--font-body");
  else root.style.setProperty("--font-body", fontMap[settings.fontFamily]);

  // Taille de police
  const sizeMap = { small: "90%", medium: "100%", large: "110%", xlarge: "120%" };
  root.style.setProperty("--font-size-base", sizeMap[settings.fontSize] ?? "100%");

  // Graisse
  const weightMap = { normal: "400", medium: "500", semibold: "600" };
  root.style.setProperty("--font-weight-base", weightMap[settings.fontWeight] ?? "400");

  // Italique sur les descriptions
  root.style.setProperty("--font-style-description", settings.italic ? "italic" : "normal");

  // Densité
  const densityMap = {
    compact: { spacing: "0.75rem", padding: "0.5rem", factor: "0.75" },
    comfortable: { spacing: "1rem", padding: "0.75rem", factor: "1" },
    spacious: { spacing: "1.5rem", padding: "1rem", factor: "1.5" },
  };
  const d = densityMap[settings.density] ?? densityMap.comfortable;
  root.style.setProperty("--spacing-base", d.spacing);
  root.style.setProperty("--padding-base", d.padding);
  root.style.setProperty("--density-factor", d.factor);

  // Contraste
  const contrastMap = { standard: "1", high: "1.2", maximum: "1.5" };
  root.style.setProperty("--contrast-multiplier", contrastMap[settings.contrast] ?? "1");
};

export const useStyleSettingsStore = create((set) => {
  const initialSettings = loadFromStorage();
  applyStyles(initialSettings);
  return {
    settings: initialSettings,
    updateSetting: (key, value) =>
      set((state) => {
        const newSettings = { ...state.settings, [key]: value };
        saveToStorage(newSettings);
        applyStyles(newSettings);
        return { settings: newSettings };
      }),
    resetSettings: () =>
      set(() => {
        saveToStorage(defaultSettings);
        applyStyles(defaultSettings);
        return { settings: defaultSettings };
      }),
  };
});

export const useStyleSettings = () => ({
  settings: useStyleSettingsStore((s) => s.settings),
  updateSetting: useStyleSettingsStore((s) => s.updateSetting),
  resetSettings: useStyleSettingsStore((s) => s.resetSettings),
});
