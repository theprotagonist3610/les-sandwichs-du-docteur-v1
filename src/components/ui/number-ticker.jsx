import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

/**
 * NumberTicker - Composant d'animation de nombres
 * @param {number} value - La valeur à afficher
 * @param {number} delay - Délai avant l'animation (ms)
 * @param {string} className - Classes CSS additionnelles
 * @param {number} decimalPlaces - Nombre de décimales à afficher
 */
export default function NumberTicker({
  value,
  delay = 0,
  className = "",
  decimalPlaces = 0,
}) {
  const ref = useRef(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (isInView) {
      setTimeout(() => {
        motionValue.set(value);
      }, delay);
    }
  }, [motionValue, isInView, delay, value]);

  useEffect(() => {
    springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Intl.NumberFormat("fr-FR", {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(latest);
      }
    });
  }, [springValue, decimalPlaces]);

  return (
    <span className={className} ref={ref}>
      0
    </span>
  );
}
