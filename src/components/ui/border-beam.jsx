import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * BorderBeam Component - Animated border beam effect
 * @param {Object} props - Component props
 * @param {string} props.className - Additional class names
 * @param {number} props.size - Size of the border beam (default: 50)
 * @param {number} props.delay - Delay before animation starts (default: 0)
 * @param {number} props.duration - Duration of animation (default: 6)
 * @param {string} props.colorFrom - Starting gradient color (default: "#ffaa40")
 * @param {string} props.colorTo - Ending gradient color (default: "#9c40ff")
 * @param {Object} props.transition - Motion transition object
 * @param {Object} props.style - Additional inline styles
 * @param {boolean} props.reverse - Reverse animation direction (default: false)
 * @param {number} props.initialOffset - Initial offset position 0-100 (default: 0)
 * @param {number} props.borderWidth - Border width of the beam (default: 1)
 * @param {string} props.borderOnly - Animate only specific border: 'bottom' | 'top' | 'left' | 'right' | null
 */
export const BorderBeam = ({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1,
  borderOnly = null,
}) => {
  // Si borderOnly est spécifié, utiliser une animation linéaire sur un bord spécifique
  if (borderOnly) {
    return (
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className={cn(
            "absolute h-[var(--border-beam-width)]",
            "bg-gradient-to-r from-transparent via-[var(--color-from)] via-[var(--color-to)] to-transparent",
            borderOnly === "bottom" && "bottom-0 left-0 right-0",
            borderOnly === "top" && "top-0 left-0 right-0",
            borderOnly === "left" && "left-0 top-0 bottom-0 w-[var(--border-beam-width)] h-auto bg-gradient-to-b",
            borderOnly === "right" && "right-0 top-0 bottom-0 w-[var(--border-beam-width)] h-auto bg-gradient-to-b",
            className
          )}
          style={{
            "--border-beam-width": `${borderWidth}px`,
            "--color-from": colorFrom,
            "--color-to": colorTo,
            ...style,
          }}
          initial={{
            x: borderOnly === "bottom" || borderOnly === "top" ? "-100%" : 0,
            y: borderOnly === "left" || borderOnly === "right" ? "-100%" : 0,
          }}
          animate={{
            x: borderOnly === "bottom" || borderOnly === "top"
              ? (reverse ? ["-100%", "100%"] : ["100%", "-100%"])
              : 0,
            y: borderOnly === "left" || borderOnly === "right"
              ? (reverse ? ["-100%", "100%"] : ["100%", "-100%"])
              : 0,
          }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration,
            delay: -delay,
            ...transition,
          }}
        />
      </div>
    );
  }

  // Animation originale sur tout le périmètre
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)] [mask-composite:intersect] [mask-clip:padding-box,border-box]"
      style={{
        "--border-beam-width": `${borderWidth}px`,
      }}
    >
      <motion.div
        className={cn(
          "absolute aspect-square",
          "bg-gradient-to-l from-[var(--color-from)] via-[var(--color-to)] to-transparent",
          className
        )}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          ...style,
        }}
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={{
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration,
          delay: -delay,
          ...transition,
        }}
      />
    </div>
  );
};

export default BorderBeam;
