import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ImageOff } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Carte d'article pour le catalogue (optimisée tactile)
 * @param {Object} menu - L'article menu
 * @param {Function} onAdd - Callback lors du clic
 * @param {boolean} isInCart - Si l'article est dans le panier
 * @param {number} quantityInCart - Quantité dans le panier
 * @param {boolean} compact - Mode compact sans image (mobile)
 * @param {boolean} hideImage - Cache l'image en mode desktop (garde le layout desktop)
 * @param {string} className - Classes CSS additionnelles
 */
const MenuCard = ({
  menu,
  onAdd,
  isInCart,
  quantityInCart,
  compact = false,
  hideImage = false,
  className,
}) => {
  // État image
  const hasImage = menu.image_url && menu.image_url.trim() !== "";

  // Mode compact (mobile) - sans image
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className="p-1">
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
          {/* Badge quantité - coin supérieur droit */}
          {isInCart && quantityInCart > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 shadow-lg z-10">
              × {quantityInCart}
            </Badge>
          )}

          {/* Contenu */}
          <div className="flex flex-col gap-1">
            {/* Nom */}
            <h3 className="font-medium text-sm leading-tight line-clamp-2">
              {menu.nom}
            </h3>

            {/* Prix */}
            <span className="text-base font-bold text-primary">
              {menu.prix?.toLocaleString("fr-FR")} F
            </span>
          </div>

          {/* Overlay au tap */}
          <div className="absolute inset-0 rounded-lg bg-primary/10 opacity-0 active:opacity-100 transition-opacity pointer-events-none" />
        </Card>
      </motion.div>
    );
  }

  // Mode standard (desktop) - avec ou sans image
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="p-1">
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
        {/* Image - masquée si hideImage */}
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

            {/* Badge quantité */}
            {isInCart && quantityInCart > 0 && (
              <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 shadow-md">
                × {quantityInCart}
              </Badge>
            )}

            {/* Overlay au tap */}
            <div className="absolute inset-0 bg-primary/10 opacity-0 active:opacity-100 transition-opacity" />
          </div>
        )}

        {/* Infos */}
        <div className="p-2.5 space-y-1">
          {/* Badge quantité - en haut si pas d'image */}
          {hideImage && isInCart && quantityInCart > 0 && (
            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 shadow-md">
              × {quantityInCart}
            </Badge>
          )}

          {/* Nom */}
          <h3 className="font-medium text-sm leading-tight line-clamp-1">
            {menu.nom}
          </h3>

          {/* Prix */}
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-primary">
              {menu.prix?.toLocaleString("fr-FR")} F
            </span>

            {/* Bouton ajout (version desktop) */}
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
    </motion.div>
  );
};

export default MenuCard;
