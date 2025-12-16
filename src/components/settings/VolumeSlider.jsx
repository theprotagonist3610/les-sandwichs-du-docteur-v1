import { Slider } from "@/components/ui/slider";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Composant VolumeSlider
 * Affiche un slider de volume avec icône et valeur en pourcentage
 */
const VolumeSlider = ({ label, description, value, onChange, className }) => {
  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-border hover:border-primary/50 transition-colors",
        className
      )}
    >
      <div className="space-y-3">
        {/* Label et description */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-sm font-medium text-foreground">{label}</div>
            {description && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {description}
              </div>
            )}
          </div>
          {/* Valeur affichée */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary min-w-[3ch] text-right">
              {value}%
            </span>
            {value === 0 ? (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Volume2 className="w-4 h-4 text-primary" />
            )}
          </div>
        </div>

        {/* Slider */}
        <Slider
          value={[value]}
          onValueChange={(values) => onChange(values[0])}
          min={0}
          max={100}
          step={5}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default VolumeSlider;
