import { useRef, useCallback } from "react";

export const useAudioPlayer = () => {
  const audioRef = useRef(null);

  const play = useCallback((url, volume = 100) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(100, volume)) / 100;
      audio.play().catch(() => {});
      audio.addEventListener("ended", () => { audioRef.current = null; });
      audioRef.current = audio;
    } catch { /* expected */ }
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current = null;
  }, []);

  const isPlaying = useCallback(
    () => Boolean(audioRef.current && !audioRef.current.paused),
    []
  );

  return { play, stop, isPlaying };
};
