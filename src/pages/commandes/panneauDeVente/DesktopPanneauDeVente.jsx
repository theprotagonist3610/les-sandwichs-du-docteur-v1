import { useState, useEffect } from "react";
import useBreakpoint from "@/hooks/useBreakpoint";
import usePanneauDeVente from "@/hooks/usePanneauDeVente";
import useCartStore from "@/store/cartStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ShoppingCart, Trash2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";

import {
  MenuCatalog,
  CartItem,
  CartTotals,
  PromoInput,
  ClientInfo,
  PaymentPanel,
  PaymentConfirmation,
} from "@/components/panneauDeVente";
import PointDeVenteSelector from "@/components/panneauDeVente/PointDeVenteSelector";

/**
 * Interface desktop du Panneau de Vente (POS)
 * Layout split: Catalogue à gauche, Panier à droite
 */
const DesktopPanneauDeVente = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  // Accès direct au store pour les paiements
  const cartPayments = useCartStore((state) => state.details_paiement);

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
    addToCart,
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

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  // Catégories disponibles
  const categories = Object.values(MENU_TYPES);

  return (
    <div
      className="min-h-screen flex flex-col bg-muted/30"
      style={{ display: visible ? "flex" : "none" }}>
      {/* Dialog de sélection du point de vente */}
      <PointDeVenteSelector />

      {/* Header */}
      <div className="bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <h1 className="text-xl font-semibold">Panneau de Vente</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShoppingCart className="w-4 h-4" />
            <span>
              {totalItems} article{totalItems > 1 ? "s" : ""} dans le panier
            </span>
          </div>
        </div>
      </div>

      {/* Contenu principal: Layout split */}
      <div className="flex-1 flex gap-4 p-4 max-w-[1800px] mx-auto w-full overflow-hidden">
        {/* Colonne gauche: Catalogue */}
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
              className="h-full"
            />
          </Card>
        </div>

        {/* Colonne droite: Panier */}
        <div className="w-[400px] xl:w-[450px] flex-shrink-0">
          <Card className="h-full flex flex-col overflow-hidden">
            {/* Header panier */}
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
              // Panier vide
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
                {/* Liste des articles */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-2">
                    <AnimatePresence>
                      {cartItems.map((item) => (
                        <CartItem
                          key={item.menu.id}
                          item={item}
                          onIncrement={incrementQuantity}
                          onDecrement={decrementQuantity}
                          onRemove={removeFromCart}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>

                {/* Section infos client et promo */}
                <div className="border-t">
                  <ScrollArea className="max-h-[250px]">
                    <div className="p-4 space-y-4">
                      {/* Code promo */}
                      <PromoInput
                        promotion={promotion}
                        onApply={applyPromoCode}
                        onRemove={removePromoCode}
                      />

                      {/* Infos client */}
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
                  </ScrollArea>
                </div>

                {/* Footer: Totaux et validation */}
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

      {/* Dialog Paiement */}
      <Dialog open={showPaymentPanel} onOpenChange={closePaymentPanel}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-auto">
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

      {/* Dialog Confirmation */}
      <Dialog open={showConfirmation} onOpenChange={closeConfirmation}>
        <DialogContent className="max-w-md">
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

export default DesktopPanneauDeVente;
