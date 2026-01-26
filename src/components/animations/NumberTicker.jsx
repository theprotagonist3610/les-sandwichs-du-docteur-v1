import { useEffect, useState, useRef } from "react";

/**
 * Composant pour animer les changements de nombres avec un effet de "ticker" (défilement)
 * @param {number} value - Valeur finale à afficher
 * @param {number} duration - Durée de l'animation en millisecondes (défaut: 1000)
 * @param {string} className - Classes CSS
 * @param {boolean} showDecimals - Afficher les décimales
 * @param {number} decimals - Nombre de décimales
 * @param {function} formatter - Fonction de formatage personnalisée (reçoit la valeur, doit retourner un string)
 */
export const NumberTicker = ({
  value = 0,
  duration = 1000,
  className = "",
  showDecimals = false,
  decimals = 0,
  formatter = null,
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const displayValueRef = useRef(value);

  useEffect(() => {
    if (displayValueRef.current === value) return;

    const startValue = displayValueRef.current;
    const difference = value - startValue;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function pour une animation fluide (ease-out)
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const newValue = startValue + difference * easeProgress;

      setDisplayValue(newValue);
      displayValueRef.current = newValue;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        displayValueRef.current = value;
      }
    };

    const animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [value, duration]);

  let formattedValue;

  if (formatter) {
    formattedValue = formatter(displayValue);
  } else if (showDecimals) {
    formattedValue = displayValue.toFixed(decimals);
  } else {
    formattedValue = Math.round(displayValue).toLocaleString();
  }

  return <span className={className}>{formattedValue}</span>;
};

export default NumberTicker;
