import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVibration } from "@/hooks/useVibration";

/**
 * Composant VibrationPatternPicker
 * Permet de sélectionner un pattern de vibration avec test
 */
const VibrationPatternPicker = ({ options, value, onChange, name, className }) => {
  const { vibrate, isSupported } = useVibration();

  const handleTestVibration = (patternValue) => {
    if (!isSupported()) {
      alert("La vibration n'est pas supportée sur cet appareil");
      return;
    }
    vibrate(patternValue);
  };

  if (!isSupported()) {
    return (
      <div className="p-4 rounded-lg border border-border bg-muted/30">
        <p className="text-sm text-muted-foreground text-center">
          La vibration n'est pas supportée sur cet appareil
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <RadioGroup value={value} onValueChange={onChange}>
        {options.map((option) => (
          <div
            key={option.value}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              value === option.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-accent/50"
            )}
          >
            {/* Radio button */}
            <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />

            {/* Label */}
            <Label
              htmlFor={`${name}-${option.value}`}
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

            {/* Test button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleTestVibration(option.value);
              }}
              className="p-2 rounded-md bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
              aria-label="Tester la vibration"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

export default VibrationPatternPicker;
