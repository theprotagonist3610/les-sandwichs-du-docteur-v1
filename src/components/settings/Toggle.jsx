import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const Toggle = ({ label, description, checked, onChange, className }) => {
  return (
    <label
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors",
        className
      )}
    >
      <div className="flex-1">
        <Label className="text-sm font-medium text-foreground cursor-pointer">
          {label}
        </Label>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {description}
          </div>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
};

export default Toggle;
