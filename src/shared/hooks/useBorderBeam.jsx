import { useEffect, useState } from "react";
import { useStyleSettings } from "@/store/styleSettingsStore";
import { BorderBeam } from "@/shared/components/ui/border-beam";

// Couleurs adaptées au thème corporate (light: rouge brand, dark: orange→miel)
const THEME_COLORS = {
  dark:  { colorFrom: "#d9571d", colorTo: "#ffb564" },
  light: { colorFrom: "#a41624", colorTo: "#a41624" },
};

const useCurrentTheme = () => {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
};

export const useBorderBeam = (options = {}) => {
  const { settings } = useStyleSettings();
  const isDark = useCurrentTheme();

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

  const isEnabled = enabled !== undefined ? enabled : settings.borderBeamEnabled;

  const themeColors = autoTheme ? THEME_COLORS[isDark ? "dark" : "light"] : {};
  const finalColorFrom = colorFrom ?? themeColors.colorFrom ?? "#ffaa40";
  const finalColorTo   = colorTo   ?? themeColors.colorTo   ?? "#9c40ff";

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

  return { BeamComponent, isEnabled };
};

export const WithBorderBeam = ({ children, className = "", beamOptions = {}, ...rest }) => {
  const { BeamComponent } = useBorderBeam(beamOptions);
  return (
    <div className={`relative ${className}`} {...rest}>
      {children}
      {BeamComponent}
    </div>
  );
};

export default useBorderBeam;
