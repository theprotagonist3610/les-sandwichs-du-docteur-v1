import { useEffect } from "react";

// Déverrouille le contexte audio au premier geste — résout l'erreur
// "play() failed because the user didn't interact with the document first"
export const useAudioAutoplay = () => {
  useEffect(() => {
    const unlock = async () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") await ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.value = 0;
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.001);
      } catch { /* expected */ }
    };

    // { once: true } retire l'écouteur automatiquement après le premier déclenchement
    document.addEventListener("click",      unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("keydown",    unlock, { once: true });

    return () => {
      document.removeEventListener("click",      unlock);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("keydown",    unlock);
    };
  }, []);
};

export default useAudioAutoplay;
