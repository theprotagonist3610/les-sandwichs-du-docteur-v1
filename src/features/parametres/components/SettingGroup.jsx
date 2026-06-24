import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const SettingGroup = ({
  title,
  description,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!collapsible) {
    // Mode non-collapsible (comportement d'origine)
    return (
      <div className={cn("space-y-3", className)}>
        <div>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <div>{children}</div>
      </div>
    );
  }

  // Mode collapsible
  return (
    <div className={cn("space-y-3", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start justify-between gap-3 text-left group hover:opacity-80 transition-opacity"
      >
        <div className="flex-1">
          <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <div className="mt-0.5 text-muted-foreground group-hover:text-primary transition-colors">
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className={cn("pb-1", isOpen && "pt-1")}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingGroup;
