import { useCallback } from "react";
import confetti from "@hiseb/confetti";

/**
 * Hook personnalisé pour gérer les animations confetti
 * @returns {Object} Fonctions pour lancer des confetti
 */
export const useConfetti = () => {
  /**
   * Lance des confetti basiques
   * @param {Object} options - Options de configuration des confetti
   */
  const fireConfetti = useCallback((options = {}) => {
    const defaultOptions = {
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      ...options,
    };

    confetti(defaultOptions);
  }, []);

  /**
   * Lance des confetti pour une notification de succès
   * Lance depuis le centre vers les côtés
   */
  const successConfetti = useCallback(() => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
    };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });

    fire(0.2, {
      spread: 60,
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }, []);

  /**
   * Lance des confetti en explosion rapide
   */
  const burstConfetti = useCallback(() => {
    confetti({
      particleCount: 150,
      spread: 180,
      startVelocity: 30,
      origin: { y: 0.6 },
      colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d"],
    });
  }, []);

  /**
   * Lance des confetti depuis les côtés (effet canon)
   */
  const sideConfetti = useCallback(() => {
    const end = Date.now() + 1 * 1000; // 1 seconde
    const colors = ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42"];

    (function frame() {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });

      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  /**
   * Lance des confetti en étoiles qui tombent
   */
  const starsConfetti = useCallback(() => {
    const defaults = {
      spread: 360,
      ticks: 50,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      shapes: ["star"],
      colors: ["#FFE400", "#FFBD00", "#E89400", "#FFCA6C", "#FDFFB8"],
    };

    confetti({
      ...defaults,
      particleCount: 40,
      scalar: 1.2,
      shapes: ["star"],
    });

    confetti({
      ...defaults,
      particleCount: 10,
      scalar: 0.75,
      shapes: ["circle"],
    });
  }, []);

  /**
   * Nettoie tous les confetti actifs
   */
  const clearConfetti = useCallback(() => {
    confetti.reset();
  }, []);

  return {
    fireConfetti,
    successConfetti,
    burstConfetti,
    sideConfetti,
    starsConfetti,
    clearConfetti,
  };
};

export default useConfetti;
