import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const RadioGroupSetting = ({ options, value, onChange, name, className }) => {
  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      className={cn("space-y-2", className)}
    >
      {options.map((option) => (
        <label
          key={option.value}
          htmlFor={`${name}-${option.value}`}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
            value === option.value
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-accent/50"
          )}
        >
          <RadioGroupItem
            value={option.value}
            id={`${name}-${option.value}`}
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-foreground">
              {option.label}
            </div>
            {option.description && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {option.description}
              </div>
            )}
          </div>
        </label>
      ))}
    </RadioGroup>
  );
};

export default RadioGroupSetting;
