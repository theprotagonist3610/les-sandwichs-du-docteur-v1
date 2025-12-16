import { useState, useEffect } from 'react';

/**
 * Hook pour détecter le breakpoint actuel de l'écran
 * @returns {Object} { isMobile: boolean, isDesktop: boolean }
 * - isMobile: true si largeur < 1024px
 * - isDesktop: true si largeur >= 1024px
 */
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState(() => ({
    isMobile: window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
  }));

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setBreakpoint({
        isMobile: width < 1024,
        isDesktop: width >= 1024,
      });
    };

    // Écouter l'événement de resize
    window.addEventListener('resize', handleResize);

    // Écouter l'événement de rotation d'écran (pour les devices mobiles/tablettes)
    window.addEventListener('orientationchange', handleResize);

    // Nettoyage des listeners au démontage du composant
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return breakpoint;
};

export default useBreakpoint;
