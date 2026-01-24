import { cn } from "@/lib/utils";

/**
 * ScrollArea simple et fiable basé sur CSS natif
 * Fonctionne sur mobile et desktop
 */
const SimpleScrollArea = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        "overflow-y-auto overflow-x-hidden",
        // Scrollbar styling pour webkit (Chrome, Safari, Edge)
        "[&::-webkit-scrollbar]:w-2",
        "[&::-webkit-scrollbar-track]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:bg-border",
        "[&::-webkit-scrollbar-thumb]:rounded-full",
        "[&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50",
        // Firefox scrollbar
        "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border",
        className
      )}
      {...props}>
      {children}
    </div>
  );
};

export { SimpleScrollArea };
