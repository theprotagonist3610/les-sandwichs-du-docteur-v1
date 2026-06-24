import { create } from "zustand";
import Cookies from "js-cookie";

const CONSENT_COOKIE_NAME = "lsd_cookie_consent";
const CONSENT_COOKIE_OPTIONS = {
  expires: 365,
  sameSite: "lax",
  secure: window.location.protocol === "https:",
};

const getStoredConsent = () => {
  try {
    const consent = Cookies.get(CONSENT_COOKIE_NAME);
    if (consent === "true") return true;
    if (consent === "false") return false;
    return null;
  } catch {
    return null;
  }
};

// null = pas encore décidé | true = accepté | false = refusé
export const useCookieConsentStore = create((set) => ({
  hasConsent: getStoredConsent(),

  setConsent: (consent) => {
    try {
      Cookies.set(CONSENT_COOKIE_NAME, String(consent), CONSENT_COOKIE_OPTIONS);
      set({ hasConsent: consent });
      // Reload pour appliquer/supprimer les cookies selon le choix
      if (consent !== null) window.location.reload();
    } catch { /* expected */ }
  },

  revokeConsent: () => {
    try {
      Cookies.remove(CONSENT_COOKIE_NAME);
      set({ hasConsent: null });
    } catch { /* expected */ }
  },
}));

export const useCookieConsent = () => ({
  hasConsent: useCookieConsentStore((s) => s.hasConsent),
  setConsent: useCookieConsentStore((s) => s.setConsent),
  revokeConsent: useCookieConsentStore((s) => s.revokeConsent),
  canUseCookies: useCookieConsentStore((s) => s.hasConsent === true),
});
