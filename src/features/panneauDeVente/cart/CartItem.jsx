import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Minus, Plus, Trash2, ImageOff } from "lucide-react";
import { fadeInLeft, slideOutLeft } from "@/lib/animations";

const CartItem = ({
  item,
  onIncrement,
  onDecrement,
  onRemove,
  compact = false,
  className,
}) => {
  const { menu, quantite, prix_unitaire, total } = item;
  const hasImage = menu.image_url && menu.image_url.trim() !== "";
  const elRef = useRef(null);

  useEffect(() => {
    if (elRef.current) {
      fadeInLeft(elRef.current);
    }
  }, []);

  const handleRemove = () => {
    if (elRef.current) {
      slideOutLeft(elRef.current, () => onRemove(menu.id));
    } else {
      onRemove(menu.id);
    }
  };

  if (compact) {
    return (
      <div
        ref={elRef}
        className={cn(
          "flex items-center gap-2 py-2 border-b last:border-b-0",
          className
        )}>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{menu.nom}</p>
          <p className="text-xs text-muted-foreground">
            {prix_unitaire.toLocaleString("fr-FR")} F
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7"
            onClick={() => onDecrement(menu.id)}>
            <Minus className="w-3 h-3" />
          </Button>
          <span className="w-6 text-center text-sm font-medium">{quantite}</span>
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7"
            onClick={() => onIncrement(menu.id)}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        <span className="font-semibold text-sm text-primary w-16 text-right">
          {total.toLocaleString("fr-FR")} F
        </span>
      </div>
    );
  }

  return (
    <div
      ref={elRef}
      className={cn(
        "flex items-center gap-3 p-3 bg-muted/30 rounded-lg",
        className
      )}>
      <div className="w-14 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
        {hasImage ? (
          <img
            src={menu.image_url}
            alt={menu.nom}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-5 h-5 text-muted-foreground/50" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{menu.nom}</p>
        <p className="text-xs text-muted-foreground">
          {prix_unitaire.toLocaleString("fr-FR")} F / unité
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={() => onDecrement(menu.id)}>
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <span className="w-8 text-center font-medium">{quantite}</span>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={() => onIncrement(menu.id)}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex flex-col items-end gap-1">
        <span className="font-semibold text-primary">
          {total.toLocaleString("fr-FR")} F
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleRemove}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

export { CartItem };
