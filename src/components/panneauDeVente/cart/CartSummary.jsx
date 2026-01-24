import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import CartItem from "./CartItem";
import CartTotals from "./CartTotals";
import PromoInput from "./PromoInput";

/**
 * Résumé complet du panier
 */
const CartSummary = ({
  items,
  subtotal,
  discount,
  deliveryFee,
  total,
  promotion,
  onIncrement,
  onDecrement,
  onRemove,
  onApplyPromo,
  onRemovePromo,
  onClearCart,
  onCheckout,
  isSubmitting,
  canCheckout,
  compact = false,
  className,
}) => {
  const isEmpty = items.length === 0;
  const totalItems = items.reduce((sum, item) => sum + item.quantite, 0);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Panier</h3>
          {!isEmpty && (
            <span className="text-sm text-muted-foreground">
              ({totalItems} article{totalItems > 1 ? "s" : ""})
            </span>
          )}
        </div>
        {!isEmpty && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onClearCart}>
            <Trash2 className="w-4 h-4 mr-1" />
            Vider
          </Button>
        )}
      </div>

      {/* Liste des articles */}
      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Le panier est vide</p>
            <p className="text-sm mt-1">Ajoutez des articles pour commencer</p>
          </div>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1 py-3">
            <div className="space-y-2 pr-2">
              <AnimatePresence>
                {items.map((item) => (
                  <CartItem
                    key={item.menu.id}
                    item={item}
                    onIncrement={onIncrement}
                    onDecrement={onDecrement}
                    onRemove={onRemove}
                    compact={compact}
                  />
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>

          {/* Code promo */}
          <div className="py-3 border-t">
            <PromoInput
              promotion={promotion}
              onApply={onApplyPromo}
              onRemove={onRemovePromo}
            />
          </div>

          {/* Totaux */}
          <div className="py-3 border-t">
            <CartTotals
              subtotal={subtotal}
              discount={discount}
              deliveryFee={deliveryFee}
              total={total}
              promotion={promotion}
            />
          </div>

          {/* Bouton validation */}
          <Button
            size="lg"
            className="w-full mt-2"
            onClick={onCheckout}
            disabled={!canCheckout || isSubmitting}>
            {isSubmitting ? "Validation..." : "Passer au paiement"}
          </Button>
        </>
      )}
    </div>
  );
};

export default CartSummary;
