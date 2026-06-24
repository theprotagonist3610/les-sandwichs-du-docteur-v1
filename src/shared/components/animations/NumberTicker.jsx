import { useRef, useEffect } from "react";
import { countUp } from "@/lib/animations";
import { cn } from "@/lib/utils";

const NumberTicker = ({
  value,
  delay = 0,
  decimalPlaces = 0,
  prefix = "",
  suffix = "",
  className = "",
}) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const tween = countUp(ref.current, value, { delay, decimalPlaces });
    return () => tween?.kill();
  }, [value, delay, decimalPlaces]);

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      <span ref={ref}>0</span>
      {suffix}
    </span>
  );
};

export default NumberTicker;
