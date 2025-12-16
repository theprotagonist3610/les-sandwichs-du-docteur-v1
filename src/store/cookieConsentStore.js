import { create } from "zustand";
import Cookies from "js-cookie";

// Nom du cookie de consentement
const CONSENT_COOKIE_NAME = "lsd_cookie_consent";
const CONSENT_COOKIE_OPTIONS = {
  expires: 365, // 1 an
  sameSite: "lax",
  secure: window.location.protocol === "https:",
};

// Vérifier le consentement stocké
const getStoredConsent = () => {
  try {
    const consent = Cookies.get(CONSENT_COOKIE_NAME);
    if (consent === "true") return true;
    if (consent === "false") return false;
    return null; // Pas de consentement enregistré
  } catch (error) {
    console.error("Error reading consent cookie:", error);
    return null;
  }
};

// Store de gestion du consentement
export const useCookieConsentStore = create((set) => ({
  // null = pas encore décidé, true = accepté, false = refusé
  hasConsent: getStoredConsent(),

  // Définir le consentement
  setConsent: (consent) => {
    try {
      // Sauvegarder le consentement dans un cookie (toujours autorisé, c'est un cookie de consentement)
      Cookies.set(
        CONSENT_COOKIE_NAME,
        String(consent),
        CONSENT_COOKIE_OPTIONS
      );

      set({ hasConsent: consent });

      // Recharger la page pour appliquer le changement de consentement
      // (permet de charger/supprimer les cookies selon le choix)
      if (consent !== null) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Error setting consent:", error);
    }
  },

  // Révoquer le consentement
  revokeConsent: () => {
    try {
      Cookies.remove(CONSENT_COOKIE_NAME);
      set({ hasConsent: null });
    } catch (error) {
      console.error("Error revoking consent:", error);
    }
  },
}));

// Hook pour faciliter l'utilisation
export const useCookieConsent = () => {
  const hasConsent = useCookieConsentStore((state) => state.hasConsent);
  const setConsent = useCookieConsentStore((state) => state.setConsent);
  const revokeConsent = useCookieConsentStore((state) => state.revokeConsent);

  return {
    hasConsent,
    setConsent,
    revokeConsent,
    canUseCookies: hasConsent === true,
  };
};
