import { useState, useEffect, useCallback } from "react";
import useBreakpoint from "@/hooks/useBreakpoint";
import usePanneauDeVente from "@/hooks/usePanneauDeVente";
import useCartStore from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ShoppingCart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import {
  MenuCatalog,
  CartItem,
  CartTotals,
  PromoInput,
  ClientInfo,
  PaymentPanel,
  PaymentConfirmation,
  QuantityDialog,
} from "@/components/panneauDeVente";

/**
 * Interface mobile du Panneau de Vente (POS)
 * Optimisée pour écrans tactiles
 */
const MobilePanneauDeVente = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  // Accès direct au store pour les paiements et la mise à jour de quantité
  const cartPayments = useCartStore((state) => state.details_paiement);
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity);
  const addItem = useCartStore((state) => state.addItem);

  // Hook principal
  const {
    // Catalogue
    menus,
    menusLoading,
    menusError,
    activeCategory,
    setActiveCategory,
    searchTerm,
    setSearchTerm,
    MENU_TYPES,

    // Panier
    cartItems,
    cartIsEmpty,
    totalItems,
    removeFromCart,
    incrementQuantity,
    decrementQuantity,
    clearCart,

    // Calculs
    subtotal,
    discount,
    deliveryFee,
    total,
    totalPaid,
    remainingAmount,

    // Client
    client,
    contactClient,
    orderType,
    deliveryInfo,
    setClientInfo,
    setOrderType,
    setDeliveryInfo,

    // Promo
    promotion,
    applyPromoCode,
    removePromoCode,

    // Paiement
    recordPayment,
    resetPayments,
    payRemainingInCash,

    // Commande
    submitCommande,
    startNewOrder,
    canSubmit,
    isSubmitting,

    // UI
    showPaymentPanel,
    openPaymentPanel,
    closePaymentPanel,
    showConfirmation,
    closeConfirmation,
    lastOrder,
  } = usePanneauDeVente();

  // État local pour le sheet panier
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  // État pour le dialog de quantité
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState(null);

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  // Catégories disponibles
  const categories = Object.values(MENU_TYPES);

  // Obtenir la quantité actuelle d'un menu dans le panier
  const getCartQuantity = useCallback(
    (menuId) => {
      const cartItem = cartItems.find((item) => item.menu.id === menuId);
      return cartItem ? cartItem.quantite : 0;
    },
    [cartItems]
  );

  // Gérer le clic sur un menu - ouvrir le dialog calculatrice
  const handleMenuClick = (menu) => {
    setSelectedMenu(menu);
    setQuantityDialogOpen(true);
  };

  // Confirmer la quantité depuis le dialog
  const handleQuantityConfirm = (menu, quantity) => {
    const currentQty = getCartQuantity(menu.id);

    if (quantity === 0) {
      // Supprimer du panier
      if (currentQty > 0) {
        removeFromCart(menu.id);
      }
    } else if (currentQty > 0) {
      // Mettre à jour la quantité existante
      updateItemQuantity(menu.id, quantity);
    } else {
      // Ajouter au panier avec la quantité spécifiée
      addItem(menu, quantity);
    }
  };

  // Ouvrir le panier
  const handleOpenCart = () => {
    setCartSheetOpen(true);
  };

  // Passer au paiement depuis le panier
  const handleGoToPayment = () => {
    setCartSheetOpen(false);
    openPaymentPanel();
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-background"
      style={{ display: visible ? "flex" : "none" }}>
      {/* Header avec bouton panier */}
      <div className="sticky top-0 z-20 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Nouvelle commande</h1>
          <Button
            variant="outline"
            className="relative"
            onClick={handleOpenCart}>
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

      {/* Catalogue (scrollable) - Mode compact sans images */}
      <div className="p-4">
        <MenuCatalog
          menus={menus}
          loading={menusLoading}
          error={menusError}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onAddToCart={handleMenuClick}
          cartItems={cartItems}
          categories={categories}
          compact={true}
        />
      </div>

      {/* Bouton sticky "Voir panier" */}
      {!cartIsEmpty && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="sticky bottom-0 p-4 bg-background border-t shadow-lg">
          <Button size="lg" className="w-full" onClick={handleOpenCart}>
            <ShoppingCart className="w-5 h-5 mr-2" />
            Voir panier ({totalItems} article{totalItems > 1 ? "s" : ""})
            <span className="ml-auto font-bold">
              {total.toLocaleString("fr-FR")} F
            </span>
          </Button>
        </motion.div>
      )}

      {/* Dialog Calculatrice pour la quantité */}
      <QuantityDialog
        open={quantityDialogOpen}
        onOpenChange={setQuantityDialogOpen}
        menu={selectedMenu}
        currentQuantity={selectedMenu ? getCartQuantity(selectedMenu.id) : 0}
        onConfirm={handleQuantityConfirm}
      />

      {/* Sheet Panier (slide-up) */}
      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] px-0">
          <div className="flex flex-col h-full">
            {/* Header */}
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
              // Panier vide
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Le panier est vide</p>
                  <p className="text-sm mt-1">
                    Ajoutez des articles pour commencer
                  </p>
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
                {/* Zone scrollable du panier */}
                <div className="flex-1 overflow-y-auto">
                  <div className="px-4 py-3 space-y-1">
                    <AnimatePresence>
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
                    </AnimatePresence>
                  </div>

                  {/* Code promo */}
                  <div className="px-4 py-3 border-t">
                    <PromoInput
                      promotion={promotion}
                      onApply={applyPromoCode}
                      onRemove={removePromoCode}
                    />
                  </div>

                  {/* Infos client */}
                  <div className="px-4 py-3 border-t pb-6">
                    <p className="text-sm font-medium mb-3">
                      Informations commande
                    </p>
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

                {/* Footer avec totaux et bouton - fixé en bas */}
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

      {/* Sheet Paiement */}
      <Sheet open={showPaymentPanel} onOpenChange={closePaymentPanel}>
        <SheetContent side="bottom" className="h-[90vh] px-0">
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

      {/* Sheet Confirmation */}
      <Sheet open={showConfirmation} onOpenChange={closeConfirmation}>
        <SheetContent side="bottom" className="h-[80vh]">
          <PaymentConfirmation
            order={lastOrder}
            onNewOrder={startNewOrder}
            onClose={closeConfirmation}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobilePanneauDeVente;
