import { useCallback } from "react";

const PATTERNS = {
  short:  [100],
  medium: [200],
  long:   [400],
  double: [100, 100, 100],
  triple: [100, 50, 100, 50, 100],
  pulse:  [200, 100, 200, 100, 200],
  custom: [200, 100, 200],
};

export const useVibration = () => {
  const isSupported = useCallback(() => "vibrate" in navigator, []);

  const vibrate = useCallback(
    (pattern = "medium") => {
      if (!isSupported()) return false;
      try {
        const vibrationPattern = Array.isArray(pattern)
          ? pattern
          : (PATTERNS[pattern] ?? PATTERNS.medium);
        navigator.vibrate(vibrationPattern);
        return true;
      } catch {
        return false;
      }
    },
    [isSupported]
  );

  const stop = useCallback(() => {
    if (!isSupported()) return false;
    try { navigator.vibrate(0); return true; }
    catch { return false; }
  }, [isSupported]);

  return { vibrate, stop, isSupported, patterns: PATTERNS };
};
