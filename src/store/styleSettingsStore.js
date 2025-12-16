import { create } from "zustand";
import Cookies from "js-cookie";
import { useCookieConsentStore } from "./cookieConsentStore";

// Valeurs par défaut
const defaultSettings = {
  theme: "light", // 'light' | 'dark' | 'auto'
  fontFamily: "system", // 'system' | 'inter' | 'roboto' | 'opensans' | 'poppins' | 'nunito'
  fontSize: "medium", // 'small' | 'medium' | 'large' | 'xlarge'
  fontWeight: "normal", // 'normal' | 'medium' | 'semibold'
  italic: false,
  density: "comfortable", // 'compact' | 'comfortable' | 'spacious'
  contrast: "standard", // 'standard' | 'high' | 'maximum'
  borderBeamEnabled: false, // Activer les effets de bordure animés
};

// Noms de stockage
const COOKIE_NAME = "lsd_style_settings";
const LOCALSTORAGE_NAME = "lsd_style_settings";
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
    console.error("Error loading settings from storage:", error);
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
    console.error("Error saving settings to storage:", error);
  }
};

// Appliquer les styles au document
const applyStyles = (settings) => {
  const root = document.documentElement;

  // Thème
  if (settings.theme === "dark") {
    root.classList.add("dark");
  } else if (settings.theme === "light") {
    root.classList.remove("dark");
  } else if (settings.theme === "auto") {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    if (prefersDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }

  // Police de caractères
  const fontFamilies = {
    system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    inter: "'Inter', sans-serif",
    roboto: "'Roboto', sans-serif",
    opensans: "'Open Sans', sans-serif",
    poppins: "'Poppins', sans-serif",
    nunito: "'Nunito', sans-serif",
  };
  root.style.setProperty("--font-family", fontFamilies[settings.fontFamily]);

  // Taille de police
  const fontSizes = {
    small: "90%",
    medium: "100%",
    large: "110%",
    xlarge: "120%",
  };
  root.style.setProperty("--font-size-base", fontSizes[settings.fontSize]);

  // Graisse de police
  const fontWeights = {
    normal: "400",
    medium: "500",
    semibold: "600",
  };
  root.style.setProperty(
    "--font-weight-base",
    fontWeights[settings.fontWeight]
  );

  // Style italic
  root.style.setProperty(
    "--font-style-description",
    settings.italic ? "italic" : "normal"
  );

  // Densité
  const densities = {
    compact: { spacing: "0.75rem", padding: "0.5rem", factor: 0.75 },
    comfortable: { spacing: "1rem", padding: "0.75rem", factor: 1 },
    spacious: { spacing: "1.5rem", padding: "1rem", factor: 1.5 },
  };
  const density = densities[settings.density];
  root.style.setProperty("--spacing-base", density.spacing);
  root.style.setProperty("--padding-base", density.padding);
  root.style.setProperty("--density-factor", density.factor.toString());

  // Contraste
  const contrastMultipliers = {
    standard: "1",
    high: "1.2",
    maximum: "1.5",
  };
  root.style.setProperty(
    "--contrast-multiplier",
    contrastMultipliers[settings.contrast]
  );
};

// Créer le store
export const useStyleSettingsStore = create((set) => {
  // Charger les paramètres au démarrage
  const initialSettings = loadFromStorage();

  // Appliquer immédiatement les styles
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

// Hook pour faciliter l'utilisation (compatible avec l'ancien Context)
export const useStyleSettings = () => {
  const settings = useStyleSettingsStore((state) => state.settings);
  const updateSetting = useStyleSettingsStore((state) => state.updateSetting);
  const resetSettings = useStyleSettingsStore((state) => state.resetSettings);

  return { settings, updateSetting, resetSettings };
};
