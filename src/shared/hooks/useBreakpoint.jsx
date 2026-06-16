import { useState, useEffect } from "react";

const BREAKPOINT = 1024;

/**
 * Détecte le breakpoint actuel (mobile < 1024px, desktop >= 1024px).
 * Écoute resize et orientationchange pour rester synchronisé.
 */
export default function useBreakpoint() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < BREAKPOINT);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < BREAKPOINT);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return { isMobile, isDesktop: !isMobile };
}
