import { useState, useLayoutEffect, useRef, useEffect, useCallback } from "react";
import { usePointDeVenteStore } from "@/features/panneauDeVente/store/pointDeVenteStore";
import { useCartStore } from "@/features/panneauDeVente/store/cartStore";
import { usePanneauDeVente } from "@/features/panneauDeVente/hooks/usePanneauDeVente";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Dialog, DialogContent } from "@/shared/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { ShoppingCart, Trash2, MapPin, Store } from "lucide-react";
import { fadeIn, fadeOut, springSlideUp, slideOutDown } from "@/lib/animations";
import { MenuCatalog } from "@/features/panneauDeVente/catalog/MenuCatalog";
import { CartItem } from "@/features/panneauDeVente/cart/CartItem";
import { CartTotals } from "@/features/panneauDeVente/cart/CartTotals";
import { PromoInput } from "@/features/panneauDeVente/cart/PromoInput";
import { ClientInfo } from "@/features/panneauDeVente/client/ClientInfo";
import { PaymentPanel } from "@/features/panneauDeVente/payment/PaymentPanel";
import { PaymentConfirmation } from "@/features/panneauDeVente/payment/PaymentConfirmation";
import { QuantityDialog } from "@/features/panneauDeVente/catalog/QuantityDialog";
import { PointDeVenteSelector } from "@/features/panneauDeVente/PointDeVenteSelector";

const PanneauDeVente = () => {
  const [isReady, setIsReady] = useState(false);
  const clearPointDeVente = usePointDeVenteStore((state) => state.clearPointDeVente);

  useLayoutEffect(() => {
    clearPointDeVente();
    setIsReady(true);
  }, [clearPointDeVente]);

  if (!isReady) return null;

  return <PanneauDeVenteInner />;
};

const PanneauDeVenteInner = () => {
  const cartPayments = useCartStore((state) => state.details_paiement);
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity);
  const addItem = useCartStore((state) => state.addItem);

  const { selectedPointDeVente } = usePointDeVenteStore();
  const [showPointDeVenteSelector, setShowPointDeVenteSelector] = useState(false);

  const {
    menus,
    menusLoading,
    menusError,
    activeCategory,
    setActiveCategory,
    searchTerm,
    setSearchTerm,
    MENU_TYPES,

    cartItems,
    cartIsEmpty,
    totalItems,
    addToCart,
    removeFromCart,
    incrementQuantity,
    decrementQuantity,
    clearCart,

    subtotal,
    discount,
    deliveryFee,
    total,
    totalPaid,
    remainingAmount,

    client,
    contactClient,
    orderType,
    deliveryInfo,
    setClientInfo,
    setOrderType,
    setDeliveryInfo,

    promotion,
    applyPromoCode,
    removePromoCode,

    recordPayment,
    resetPayments,
    payRemainingInCash,

    submitCommande,
    startNewOrder,
    canSubmit,
    isSubmitting,

    showPaymentPanel,
    openPaymentPanel,
    closePaymentPanel,
    showConfirmation,
    closeConfirmation,
    lastOrder,
  } = usePanneauDeVente();

  const categories = Object.values(MENU_TYPES);

  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState(null);

  const stickyBarRef = useRef(null);

  useEffect(() => {
    if (!stickyBarRef.current) return;
    if (!cartIsEmpty) {
      springSlideUp(stickyBarRef.current);
    } else {
      slideOutDown(stickyBarRef.current);
    }
  }, [cartIsEmpty]);

  const getCartQuantity = useCallback(
    (menuId) => {
      const cartItem = cartItems.find((item) => item.menu.id === menuId);
      return cartItem ? cartItem.quantite : 0;
    },
    [cartItems]
  );

  const handleMenuClickMobile = (menu) => {
    setSelectedMenu(menu);
    setQuantityDialogOpen(true);
  };

  const handleQuantityConfirm = (menu, quantity) => {
    const currentQty = getCartQuantity(menu.id);

    if (quantity === 0) {
      if (currentQty > 0) {
        removeFromCart(menu.id);
      }
    } else if (currentQty > 0) {
      updateItemQuantity(menu.id, quantity);
    } else {
      addItem(menu, quantity);
    }
  };

  const handleGoToPayment = () => {
    setCartSheetOpen(false);
    openPaymentPanel();
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30 lg:bg-muted/30">
      <PointDeVenteSelector
        open={showPointDeVenteSelector}
        onOpenChange={setShowPointDeVenteSelector}
      />

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-background border-b">
        {/* Mobile header */}
        <div className="lg:hidden px-4 py-3 h-[73px] flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <h1 className="text-lg font-semibold leading-tight">Nouvelle commande</h1>
              <button
                onClick={() => setShowPointDeVenteSelector(true)}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                <MapPin className="w-3 h-3" />
                <span className="font-medium">
                  {selectedPointDeVente?.nom || "Sélectionner"}
                </span>
                <Store className="w-2.5 h-2.5" />
              </button>
            </div>
            <Button
              variant="outline"
              className="relative"
              onClick={() => setCartSheetOpen(true)}>
              <ShoppingCart className="w-5 h-5" />
              {!cartIsEmpty && (
                <>
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {totalItems}
                  </Badge>
                  <span className="ml-2 font-semibold">
                    {total.toLocaleString("fr-FR")} F
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:block px-6 py-4">
          <div className="flex items-center justify-between max-w-[1800px] mx-auto">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold">Panneau de Vente</h1>
              <button
                onClick={() => setShowPointDeVenteSelector(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <MapPin className="w-3.5 h-3.5" />
                <span className="font-medium">
                  {selectedPointDeVente?.nom || "Sélectionner un point de vente"}
                </span>
                <Store className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart className="w-4 h-4" />
              <span>
                {totalItems} article{totalItems > 1 ? "s" : ""} dans le panier
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile catalogue ── */}
      <div className="lg:hidden flex-1">
        <MenuCatalog
          menus={menus}
          loading={menusLoading}
          error={menusError}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onAddToCart={handleMenuClickMobile}
          cartItems={cartItems}
          categories={categories}
          compact={true}
        />

        {!cartIsEmpty && (
          <div ref={stickyBarRef} className="sticky bottom-0 p-4 bg-background border-t shadow-lg">
            <Button size="lg" className="w-full" onClick={() => setCartSheetOpen(true)}>
              <ShoppingCart className="w-5 h-5 mr-2" />
              Voir panier ({totalItems} article{totalItems > 1 ? "s" : ""})
              <span className="ml-auto font-bold">
                {total.toLocaleString("fr-FR")} F
              </span>
            </Button>
          </div>
        )}
      </div>

      {/* ── Desktop split layout ── */}
      <div className="hidden lg:flex flex-1 gap-4 p-4 max-w-[1800px] mx-auto w-full overflow-hidden">
        {/* Catalogue */}
        <div className="flex-1 min-w-0">
          <Card className="h-full p-4 overflow-hidden flex flex-col">
            <MenuCatalog
              menus={menus}
              loading={menusLoading}
              error={menusError}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onAddToCart={addToCart}
              cartItems={cartItems}
              categories={categories}
              compact={false}
              className="h-full"
            />
          </Card>
        </div>

        {/* Panier */}
        <div className="w-[400px] xl:w-[450px] flex-shrink-0">
          <Card className="h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Panier</h2>
                {!cartIsEmpty && (
                  <span className="text-sm text-muted-foreground">
                    ({totalItems})
                  </span>
                )}
              </div>
              {!cartIsEmpty && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={clearCart}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Vider
                </Button>
              )}
            </div>

            {cartIsEmpty ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center text-muted-foreground">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Panier vide</p>
                  <p className="text-sm mt-1">
                    Cliquez sur un article pour l'ajouter
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="space-y-2">
                    {cartItems.map((item) => (
                      <CartItem
                        key={item.menu.id}
                        item={item}
                        onIncrement={incrementQuantity}
                        onDecrement={decrementQuantity}
                        onRemove={removeFromCart}
                      />
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <PromoInput
                      promotion={promotion}
                      onApply={applyPromoCode}
                      onRemove={removePromoCode}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <ClientInfo
                      client={client}
                      contactClient={contactClient}
                      orderType={orderType}
                      deliveryInfo={deliveryInfo}
                      onClientChange={setClientInfo}
                      onOrderTypeChange={setOrderType}
                      onDeliveryChange={setDeliveryInfo}
                    />
                  </div>
                </div>

                <div className="border-t p-4 bg-muted/30">
                  <CartTotals
                    subtotal={subtotal}
                    discount={discount}
                    deliveryFee={deliveryFee}
                    total={total}
                    promotion={promotion}
                    className="mb-4"
                  />

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={openPaymentPanel}
                    disabled={!canSubmit}>
                    Passer au paiement
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* ── Mobile: Dialog quantité ── */}
      <QuantityDialog
        open={quantityDialogOpen}
        onOpenChange={setQuantityDialogOpen}
        menu={selectedMenu}
        currentQuantity={selectedMenu ? getCartQuantity(selectedMenu.id) : 0}
        onConfirm={handleQuantityConfirm}
      />

      {/* ── Mobile: Sheet panier ── */}
      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] px-0 lg:hidden">
          <div className="flex flex-col h-full">
            <div className="px-4 pb-3 border-b">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 pr-8">
                  <ShoppingCart className="w-5 h-5" />
                  Panier
                  {!cartIsEmpty && (
                    <Badge variant="secondary">{totalItems}</Badge>
                  )}
                </SheetTitle>
              </SheetHeader>
              {!cartIsEmpty && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive mt-2"
                  onClick={clearCart}>
                  Vider le panier
                </Button>
              )}
            </div>

            {cartIsEmpty ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Le panier est vide</p>
                  <p className="text-sm mt-1">Ajoutez des articles pour commencer</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setCartSheetOpen(false)}>
                    Parcourir le catalogue
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="flex-1 overflow-y-auto px-4 pb-4"
                  style={{
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                  }}>
                  <div className="py-3 space-y-1">
                    {cartItems.map((item) => (
                      <CartItem
                        key={item.menu.id}
                        item={item}
                        onIncrement={incrementQuantity}
                        onDecrement={decrementQuantity}
                        onRemove={removeFromCart}
                        compact
                      />
                    ))}
                  </div>

                  <div className="py-3 border-t">
                    <PromoInput
                      promotion={promotion}
                      onApply={applyPromoCode}
                      onRemove={removePromoCode}
                    />
                  </div>

                  <div className="py-3 border-t">
                    <p className="text-sm font-medium mb-3">Informations commande</p>
                    <ClientInfo
                      client={client}
                      contactClient={contactClient}
                      orderType={orderType}
                      deliveryInfo={deliveryInfo}
                      onClientChange={setClientInfo}
                      onOrderTypeChange={setOrderType}
                      onDeliveryChange={setDeliveryInfo}
                      compact
                    />
                  </div>
                </div>

                <div className="flex-shrink-0 px-4 py-3 border-t bg-background">
                  <CartTotals
                    subtotal={subtotal}
                    discount={discount}
                    deliveryFee={deliveryFee}
                    total={total}
                    promotion={promotion}
                    className="mb-3"
                  />
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleGoToPayment}
                    disabled={!canSubmit}>
                    Passer au paiement
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Mobile: Sheet paiement ── */}
      <Sheet open={showPaymentPanel && !window.matchMedia("(min-width: 1024px)").matches} onOpenChange={closePaymentPanel}>
        <SheetContent side="bottom" className="h-[90vh] px-0 lg:hidden">
          <div className="h-full overflow-y-auto px-4 pb-6">
            <PaymentPanel
              total={total}
              totalPaid={totalPaid}
              remainingAmount={remainingAmount}
              payments={{
                momo: cartPayments.momo || 0,
                cash: cartPayments.cash || 0,
                autre: cartPayments.autre || 0,
              }}
              onRecordPayment={recordPayment}
              onResetPayments={resetPayments}
              onPayRemainingInCash={payRemainingInCash}
              onSubmit={submitCommande}
              onClose={closePaymentPanel}
              isSubmitting={isSubmitting}
              canSubmit={canSubmit}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Mobile: Sheet confirmation ── */}
      <Sheet open={showConfirmation && !window.matchMedia("(min-width: 1024px)").matches} onOpenChange={closeConfirmation}>
        <SheetContent side="bottom" className="h-[80vh] lg:hidden">
          <PaymentConfirmation
            order={lastOrder}
            onNewOrder={startNewOrder}
            onClose={closeConfirmation}
          />
        </SheetContent>
      </Sheet>

      {/* ── Desktop: Dialog paiement ── */}
      <Dialog open={showPaymentPanel} onOpenChange={closePaymentPanel}>
        <DialogContent className="hidden lg:flex max-w-md max-h-[90vh] overflow-auto">
          <PaymentPanel
            total={total}
            totalPaid={totalPaid}
            remainingAmount={remainingAmount}
            payments={{
              momo: cartPayments.momo || 0,
              cash: cartPayments.cash || 0,
              autre: cartPayments.autre || 0,
            }}
            onRecordPayment={recordPayment}
            onResetPayments={resetPayments}
            onPayRemainingInCash={payRemainingInCash}
            onSubmit={submitCommande}
            onClose={closePaymentPanel}
            isSubmitting={isSubmitting}
            canSubmit={canSubmit}
          />
        </DialogContent>
      </Dialog>

      {/* ── Desktop: Dialog confirmation ── */}
      <Dialog open={showConfirmation} onOpenChange={closeConfirmation}>
        <DialogContent className="hidden lg:flex max-w-md">
          <PaymentConfirmation
            order={lastOrder}
            onNewOrder={startNewOrder}
            onClose={closeConfirmation}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PanneauDeVente;
