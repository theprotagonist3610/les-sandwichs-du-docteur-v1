import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Truck, Percent, Tag } from "lucide-react";

/**
 * Affichage des totaux du panier
 */
const CartTotals = ({
  subtotal,
  discount,
  deliveryFee,
  total,
  promotion,
  className,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Sous-total */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Sous-total</span>
        <span>{subtotal.toLocaleString("fr-FR")} F</span>
      </div>

      {/* Frais de livraison */}
      {deliveryFee > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            Livraison
          </span>
          <span>+{deliveryFee.toLocaleString("fr-FR")} F</span>
        </div>
      )}

      {/* Réduction */}
      {discount > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span className="flex items-center gap-1.5">
            {promotion?.type === "pourcentage" ? (
              <Percent className="w-3.5 h-3.5" />
            ) : (
              <Tag className="w-3.5 h-3.5" />
            )}
            Réduction
            {promotion?.code && (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                {promotion.code}
              </span>
            )}
          </span>
          <span>-{discount.toLocaleString("fr-FR")} F</span>
        </div>
      )}

      <Separator />

      {/* Total */}
      <div className="flex justify-between items-center pt-1">
        <span className="font-semibold text-base">Total</span>
        <span className="font-bold text-xl text-primary">
          {total.toLocaleString("fr-FR")} F
        </span>
      </div>
    </div>
  );
};

export default CartTotals;
