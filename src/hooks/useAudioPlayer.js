import { useRef, useCallback } from "react";

/**
 * Hook pour jouer des fichiers audio avec contrôle du volume
 * Utilise l'API Web Audio pour un meilleur contrôle
 */
export const useAudioPlayer = () => {
  const audioRef = useRef(null);

  /**
   * Joue un fichier audio avec un volume spécifié
   * @param {string} url - URL du fichier audio
   * @param {number} volume - Volume de 0 à 100
   */
  const play = useCallback((url, volume = 100) => {
    try {
      // Arrêter l'audio précédent si en cours de lecture
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Créer une nouvelle instance Audio
      const audio = new Audio(url);

      // Convertir le volume de 0-100 à 0-1
      audio.volume = Math.max(0, Math.min(100, volume)) / 100;

      // Jouer l'audio
      audio.play().catch((error) => {
        console.error("Error playing audio:", error);
      });

      // Stocker la référence
      audioRef.current = audio;

      // Nettoyer après la lecture
      audio.addEventListener("ended", () => {
        audioRef.current = null;
      });
    } catch (error) {
      console.error("Error in useAudioPlayer:", error);
    }
  }, []);

  /**
   * Arrête la lecture en cours
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  /**
   * Vérifie si un audio est en cours de lecture
   */
  const isPlaying = useCallback(() => {
    return audioRef.current && !audioRef.current.paused;
  }, []);

  return { play, stop, isPlaying };
};
