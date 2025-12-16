import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

/**
 * Composant SoundPicker
 * Permet de sélectionner une sonnerie avec preview audio
 */
const SoundPicker = ({ options, value, onChange, volume = 80, name, className }) => {
  const [playingSound, setPlayingSound] = useState(null);
  const { play, stop } = useAudioPlayer();

  const handlePlayPreview = (soundUrl) => {
    if (playingSound === soundUrl) {
      // Arrêter si on clique sur le même son
      stop();
      setPlayingSound(null);
    } else {
      // Jouer le nouveau son
      stop(); // Arrêter le son précédent
      play(soundUrl, volume);
      setPlayingSound(soundUrl);

      // Auto-stop après 2 secondes (preview)
      setTimeout(() => {
        setPlayingSound(null);
      }, 2000);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <RadioGroup value={value} onValueChange={onChange}>
        {options.map((option) => {
          const isPlaying = playingSound === option.url;

          return (
            <div
              key={option.url}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                value === option.url
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-accent/50"
              )}
            >
              {/* Radio button */}
              <RadioGroupItem value={option.url} id={`${name}-${option.url}`} />

              {/* Label */}
              <Label
                htmlFor={`${name}-${option.url}`}
                className="flex-1 cursor-pointer"
              >
                <div className="text-sm font-medium text-foreground">
                  {option.label}
                </div>
                {option.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </div>
                )}
              </Label>

              {/* Play/Stop button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handlePlayPreview(option.url);
                }}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  isPlaying
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-accent text-accent-foreground hover:bg-accent/80"
                )}
                aria-label={isPlaying ? "Arrêter" : "Écouter"}
              >
                {isPlaying ? (
                  <Square className="w-4 h-4" fill="currentColor" />
                ) : (
                  <Play className="w-4 h-4" fill="currentColor" />
                )}
              </button>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
};

export default SoundPicker;
