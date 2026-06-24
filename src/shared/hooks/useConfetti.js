import { useCallback } from "react";
import confetti from "@hiseb/confetti";

export const useConfetti = () => {
  const fireConfetti = useCallback((options = {}) => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, ...options });
  }, []);

  const successConfetti = useCallback(() => {
    const fire = (ratio, opts) =>
      confetti({ origin: { y: 0.7 }, ...opts, particleCount: Math.floor(200 * ratio) });
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2,  { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1,  { spread: 120, startVelocity: 45 });
  }, []);

  const burstConfetti = useCallback(() => {
    confetti({
      particleCount: 150,
      spread: 180,
      startVelocity: 30,
      origin: { y: 0.6 },
      colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d"],
    });
  }, []);

  const sideConfetti = useCallback(() => {
    const end = Date.now() + 1_000;
    const colors = ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42"];
    const frame = () => {
      confetti({ particleCount: 2, angle: 60,  spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const starsConfetti = useCallback(() => {
    const defaults = {
      spread: 360, ticks: 50, gravity: 0, decay: 0.94, startVelocity: 30,
      colors: ["#FFE400", "#FFBD00", "#E89400", "#FFCA6C", "#FDFFB8"],
    };
    confetti({ ...defaults, particleCount: 40, scalar: 1.2, shapes: ["star"] });
    confetti({ ...defaults, particleCount: 10, scalar: 0.75, shapes: ["circle"] });
  }, []);

  const clearConfetti = useCallback(() => confetti.reset(), []);

  return { fireConfetti, successConfetti, burstConfetti, sideConfetti, starsConfetti, clearConfetti };
};

export default useConfetti;
