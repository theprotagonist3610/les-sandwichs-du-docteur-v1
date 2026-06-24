import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Plus, ImageOff } from "lucide-react";
import { scaleInTight, applyTapPress } from "@/lib/animations";

const MenuCard = ({
  menu,
  onAdd,
  isInCart,
  quantityInCart,
  compact = false,
  hideImage = false,
  className,
}) => {
  const hasImage = menu.image_url && menu.image_url.trim() !== "";
  const elRef = useRef(null);

  useEffect(() => {
    if (elRef.current) {
      scaleInTight(elRef.current);
      applyTapPress(elRef.current, compact ? 0.97 : 0.98);
    }
  }, [compact]);

  if (compact) {
    return (
      <div ref={elRef} className="p-1">
        <Card
          className={cn(
            "relative cursor-pointer transition-all select-none p-3",
            "hover:shadow-md active:shadow-sm",
            isInCart
              ? "ring-2 ring-primary ring-offset-2 bg-primary/5"
              : "hover:bg-accent/50",
            className
          )}
          onClick={() => onAdd(menu)}>
          {isInCart && quantityInCart > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 shadow-lg z-10">
              × {quantityInCart}
            </Badge>
          )}

          <div className="flex flex-col gap-1">
            <h3 className="font-medium text-sm leading-tight line-clamp-2">
              {menu.nom}
            </h3>

            <span className="text-base font-bold text-primary">
              {menu.prix?.toLocaleString("fr-FR")} F
            </span>
          </div>

          <div className="absolute inset-0 rounded-lg bg-primary/10 opacity-0 active:opacity-100 transition-opacity pointer-events-none" />
        </Card>
      </div>
    );
  }

  return (
    <div ref={elRef} className="p-1">
      <Card
        className={cn(
          "relative overflow-hidden cursor-pointer transition-all select-none",
          "hover:shadow-lg active:shadow-md",
          isInCart
            ? "ring-2 ring-primary ring-offset-2"
            : "",
          className
        )}
        onClick={() => onAdd(menu)}>
        {!hideImage && (
          <div className="relative aspect-square bg-muted">
            {hasImage ? (
              <img
                src={menu.image_url}
                alt={menu.nom}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <ImageOff className="w-8 h-8 text-muted-foreground/50" />
              </div>
            )}

            {isInCart && quantityInCart > 0 && (
              <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 shadow-md">
                × {quantityInCart}
              </Badge>
            )}

            <div className="absolute inset-0 bg-primary/10 opacity-0 active:opacity-100 transition-opacity" />
          </div>
        )}

        <div className="p-2.5 space-y-1">
          {hideImage && isInCart && quantityInCart > 0 && (
            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 shadow-md">
              × {quantityInCart}
            </Badge>
          )}

          <h3 className="font-medium text-sm leading-tight line-clamp-1">
            {menu.nom}
          </h3>

          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-primary">
              {menu.prix?.toLocaleString("fr-FR")} F
            </span>

            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full bg-primary/10 hover:bg-primary/20"
              onClick={(e) => {
                e.stopPropagation();
                onAdd(menu);
              }}>
              <Plus className="w-4 h-4 text-primary" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export { MenuCard };
