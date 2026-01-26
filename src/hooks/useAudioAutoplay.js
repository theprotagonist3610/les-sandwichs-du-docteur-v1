import { useEffect } from "react";

/**
 * Hook pour débloquer l'autoplay audio au premier clic utilisateur
 * Résout le problème : "play() failed because the user didn't interact with the document first"
 *
 * Au premier clic/touch, on "déverrouille" le contexte audio du navigateur
 * Après cela, les sons autoplay fonctionnent normalement
 */
export const useAudioAutoplay = () => {
  useEffect(() => {
    console.log(
      "🔓 [useAudioAutoplay] Attente d'interaction utilisateur pour débloquer l'audio...",
    );

    const unlockAudio = async () => {
      try {
        // Créer un contexte audio et le reprendre s'il est suspendu
        const audioContext = new (
          window.AudioContext || window.webkitAudioContext
        )();

        if (audioContext.state === "suspended") {
          console.log(
            "🔊 [useAudioAutoplay] AudioContext suspendu - Reprise...",
          );
          await audioContext.resume();
          console.log("✅ [useAudioAutoplay] AudioContext déverrouillé !");
        } else {
          console.log("✅ [useAudioAutoplay] AudioContext déjà actif");
        }

        // Créer un oscillo silencieux et le jouer/arrêter pour confirmer
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 0; // Volume à 0 (silencieux)

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.001);

        console.log(
          "🎵 [useAudioAutoplay] Son silencieux joué - Autoplay DÉBLOQUÉ !",
        );
      } catch (error) {
        console.error(
          "❌ [useAudioAutoplay] Erreur lors du déverrouillage :",
          error.message,
        );
      }

      // Retirer les listeners après le premier clic
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);

      console.log("🧹 [useAudioAutoplay] Listeners supprimés");
    };

    // Écouter le premier clic, touch ou appui clavier
    document.addEventListener("click", unlockAudio, { once: true });
    document.addEventListener("touchstart", unlockAudio, { once: true });
    document.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };
  }, []);
};

export default useAudioAutoplay;
