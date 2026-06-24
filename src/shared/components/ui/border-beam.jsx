import { useRef } from "react";
import { useGSAP } from "@/shared/hooks/useGSAP";
import { animateBorderBeamFull, animateBorderBeamEdge } from "@/lib/animations";
import { cn } from "@/lib/utils";

export const BorderBeam = ({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1,
  borderOnly = null,
}) => {
  const containerRef = useRef(null);
  const beamRef = useRef(null);

  useGSAP(
    () => {
      if (!beamRef.current) return;
      const isHorizontal = borderOnly === "bottom" || borderOnly === "top";

      const tween = borderOnly
        ? animateBorderBeamEdge(beamRef.current, { duration, delay, reverse, horizontal: isHorizontal })
        : animateBorderBeamFull(beamRef.current, { duration, delay, reverse, initialOffset });

      return () => tween?.kill();
    },
    { scope: containerRef, dependencies: [duration, delay, reverse, initialOffset, borderOnly] }
  );

  if (borderOnly) {
    const isHorizontal = borderOnly === "bottom" || borderOnly === "top";
    return (
      <div ref={containerRef} className="pointer-events-none absolute inset-0">
        <div
          ref={beamRef}
          className={cn(
            "absolute",
            isHorizontal ? "h-[var(--beam-width)]" : "w-[var(--beam-width)]",
            borderOnly === "bottom" && "bottom-0 left-0 right-0",
            borderOnly === "top" && "top-0 left-0 right-0",
            borderOnly === "left" && "left-0 top-0 bottom-0 h-auto bg-gradient-to-b",
            borderOnly === "right" && "right-0 top-0 bottom-0 h-auto bg-gradient-to-b",
            !isHorizontal
              ? "bg-gradient-to-b from-transparent via-[var(--color-from)] to-[var(--color-to)]"
              : "bg-gradient-to-r from-transparent via-[var(--color-from)] to-[var(--color-to)]",
            className
          )}
          style={{
            "--beam-width": `${borderWidth}px`,
            "--color-from": colorFrom,
            "--color-to": colorTo,
            ...style,
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--beam-width) border-transparent [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)] [mask-composite:intersect] [mask-clip:padding-box,border-box]"
      style={{ "--beam-width": `${borderWidth}px` }}
    >
      <div
        ref={beamRef}
        className={cn("absolute aspect-square bg-gradient-to-l from-[var(--color-from)] via-[var(--color-to)] to-transparent", className)}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          offsetDistance: `${initialOffset}%`,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          ...style,
        }}
      />
    </div>
  );
};

export default BorderBeam;
