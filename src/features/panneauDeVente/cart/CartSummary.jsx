import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Button } from "@/shared/components/ui/button";
import { ShoppingCart, Trash2 } from "lucide-react";
import { fadeIn, fadeOut } from "@/lib/animations";
import { CartItem } from "./CartItem";
import { CartTotals } from "./CartTotals";
import { PromoInput } from "./PromoInput";

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
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      if (isEmpty) {
        fadeOut(listRef.current);
      } else {
        fadeIn(listRef.current);
      }
    }
  }, [isEmpty]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
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

      {isEmpty ? (
        <div ref={listRef} className="flex-1 flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Le panier est vide</p>
            <p className="text-sm mt-1">Ajoutez des articles pour commencer</p>
          </div>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1 py-3">
            <div ref={listRef} className="space-y-2 pr-2">
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
            </div>
          </ScrollArea>

          <div className="py-3 border-t">
            <PromoInput
              promotion={promotion}
              onApply={onApplyPromo}
              onRemove={onRemovePromo}
            />
          </div>

          <div className="py-3 border-t">
            <CartTotals
              subtotal={subtotal}
              discount={discount}
              deliveryFee={deliveryFee}
              total={total}
              promotion={promotion}
            />
          </div>

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

export { CartSummary };
