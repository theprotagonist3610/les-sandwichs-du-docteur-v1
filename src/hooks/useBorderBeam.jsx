import { useStyleSettings } from "@/store/styleSettingsStore";
import { useEffect, useState } from "react";
import BorderBeam from "@/components/ui/border-beam";

/**
 * Détecte le thème actuel (light ou dark)
 */
const useTheme = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkTheme();

    // Observer les changements de classe sur <html>
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
};

/**
 * Retourne les couleurs du border-beam adaptées au thème actif
 */
const getThemeColors = (isDark) => {
  if (isDark) {
    // Dark mode: Orange-rouge (#d9571d) → Miel (#ffb564)
    return {
      colorFrom: "#d9571d", // primary dark
      colorTo: "#ffb564",   // accent (miel)
    };
  } else {
    // Light mode: Rouge corporate (#a41624) uniquement
    return {
      colorFrom: "#a41624", // primary light
      colorTo: "#a41624",   // même couleur pour un beam uniforme
    };
  }
};

/**
 * Hook pour gérer l'application du border-beam sur un composant
 * @param {Object} options - Options du border-beam
 * @param {boolean} options.enabled - Forcer l'activation/désactivation (override le setting global)
 * @param {number} options.size - Taille du beam (default: 200)
 * @param {number} options.duration - Durée de l'animation en secondes (default: 15)
 * @param {number} options.delay - Délai avant démarrage (default: 0)
 * @param {string} options.colorFrom - Couleur de départ (override thème)
 * @param {string} options.colorTo - Couleur d'arrivée (override thème)
 * @param {number} options.borderWidth - Largeur de la bordure (default: 1.5)
 * @param {boolean} options.autoTheme - Utiliser automatiquement les couleurs du thème (default: true)
 * @param {string} options.borderOnly - Animer seulement un bord spécifique: 'bottom' | 'top' | 'left' | 'right' | null
 * @returns {Object} { BeamComponent, isEnabled }
 */
export const useBorderBeam = (options = {}) => {
  const { settings } = useStyleSettings();
  const isDark = useTheme();

  const {
    enabled,
    size = 200,
    duration = 15,
    delay = 0,
    colorFrom,
    colorTo,
    borderWidth = 1.5,
    autoTheme = true,
    borderOnly = null,
  } = options;

  // Déterminer si le border-beam doit être affiché
  const isEnabled = enabled !== undefined ? enabled : settings.borderBeamEnabled;

  // Obtenir les couleurs du thème si autoTheme est activé
  const themeColors = autoTheme ? getThemeColors(isDark) : {};
  const finalColorFrom = colorFrom || themeColors.colorFrom || "#ffaa40";
  const finalColorTo = colorTo || themeColors.colorTo || "#9c40ff";

  // Composant BorderBeam à rendre (null si désactivé)
  const BeamComponent = isEnabled ? (
    <BorderBeam
      size={size}
      duration={duration}
      delay={delay}
      colorFrom={finalColorFrom}
      colorTo={finalColorTo}
      borderWidth={borderWidth}
      borderOnly={borderOnly}
    />
  ) : null;

  return {
    BeamComponent,
    isEnabled,
  };
};

/**
 * Composant wrapper qui ajoute facilement un border-beam à ses enfants
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenu enfant
 * @param {string} props.className - Classes CSS additionnelles
 * @param {Object} props.beamOptions - Options du border-beam
 * @param {Object} props.rest - Autres props HTML
 */
export const WithBorderBeam = ({
  children,
  className = "",
  beamOptions = {},
  ...rest
}) => {
  const { BeamComponent } = useBorderBeam(beamOptions);

  return (
    <div className={`relative ${className}`} {...rest}>
      {children}
      {BeamComponent}
    </div>
  );
};

export default useBorderBeam;
