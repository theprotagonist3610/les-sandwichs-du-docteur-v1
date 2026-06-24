import { cn } from "@/lib/utils";
import { Separator } from "@/shared/components/ui/separator";
import { Truck, Percent, Tag, MapPin } from "lucide-react";
import { usePointDeVenteStore } from "@/features/panneauDeVente/store/pointDeVenteStore";

const CartTotals = ({
  subtotal,
  discount,
  deliveryFee,
  total,
  promotion,
  className,
}) => {
  const { selectedPointDeVente } = usePointDeVenteStore();

  return (
    <div className={cn("space-y-2", className)}>
      {selectedPointDeVente && (
        <div className="flex justify-between items-center text-sm pb-2 border-b bg-muted/30 -mx-3 px-3 py-2 rounded">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            Point de vente
          </span>
          <span className="font-medium text-xs text-foreground">
            {selectedPointDeVente.nom}
          </span>
        </div>
      )}

      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Sous-total</span>
        <span>{subtotal.toLocaleString("fr-FR")} F</span>
      </div>

      {deliveryFee > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            Livraison
          </span>
          <span>+{deliveryFee.toLocaleString("fr-FR")} F</span>
        </div>
      )}

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

      <div className="flex justify-between items-center pt-1">
        <span className="font-semibold text-base">Total</span>
        <span className="font-bold text-xl text-primary">
          {total.toLocaleString("fr-FR")} F
        </span>
      </div>
    </div>
  );
};

export { CartTotals };
