/**
 * OngletCommandes.jsx
 * Onglet 1 du Back-Day : saisie de commandes rétroactives + dépenses du jour
 * Réutilise les composants POS existants, date verrouillée sur le jour sélectionné
 */

import { useState, useCallback } from "react";
import { ShoppingCart, Trash2, ClipboardList, CreditCard } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import useCartStore from "@/store/cartStore";
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
import DepensesJour from "./DepensesJour";

// ─── Liste des commandes déjà saisies ────────────────────────────────────────

const CommandesDuJour = ({ commandes, loading }) => {
  if (loading) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Chargement des commandes…
      </div>
    );
  }

  const commandesReelles = commandes.filter((c) => c.client !== "SYNTHESE JOURNEE");

  if (commandesReelles.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-3">
        Aucune commande enregistrée pour ce jour
      </p>
    );
  }

  const total = commandesReelles.reduce((s, c) => {
    return s + (c.details_paiement?.total_apres_reduction ?? c.details_paiement?.total ?? 0);
  }, 0);

  return (
    <div className="space-y-1">
      {commandesReelles.map((c, i) => {
        const montant = c.details_paiement?.total_apres_reduction ?? c.details_paiement?.total ?? 0;
        return (
          <div
            key={c.id || i}
            className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {c.client !== "non identifie" ? c.client : "Client anonyme"}
              </p>
              <p className="text-xs text-muted-foreground">
                {c.details_commandes?.length || 0} article
                {(c.details_commandes?.length || 0) > 1 ? "s" : ""} ·{" "}
                {c.statut_paiement === "payee" ? "Payée" : "Non payée"}
              </p>
            </div>
            <span className="text-sm font-semibold text-primary ml-3 shrink-0">
              {montant.toLocaleString("fr-FR")} F
            </span>
          </div>
        );
      })}
      <div className="flex justify-between items-center pt-2">
        <span className="text-xs text-muted-foreground font-medium">
          {commandesReelles.length} commande{commandesReelles.length > 1 ? "s" : ""}
        </span>
        <span className="text-sm font-bold text-primary">
          {total.toLocaleString("fr-FR")} F
        </span>
      </div>
    </div>
  );
};

// ─── Version Mobile ──────────────────────────────────────────────────────────

export const MobileOngletCommandes = ({ hook }) => {
  const cartPayments = useCartStore((state) => state.details_paiement);
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity);
  const addItem = useCartStore((state) => state.addItem);

  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState(null);

  const {
    menus, menusLoading, menusError, categories, activeCategory,
    setActiveCategory, searchTerm, setSearchTerm,
    cartItems, cartIsEmpty, totalItems, total, canSubmitCommande,
    removeFromCart, incrementQuantity, decrementQuantity, clearCart,
    subtotal, discount, deliveryFee, totalPaid, remainingAmount,
    client, contactClient, orderType, deliveryInfo,
    setClientInfo, setOrderType, setDeliveryInfo,
    promotion, applyPromoCode, removePromoCode,
    recordPayment, resetPayments, payRemainingInCash,
    submitCommandeRetroactive, startNewOrder, isSubmittingCommande,
    showPaymentPanel, openPaymentPanel, closePaymentPanel,
    showConfirmation, closeConfirmation, lastOrder,
    commandesDuJour, loadingCommandes,
    depenses, ajouterDepense, loadingOperations,
    statutJournee,
  } = hook;

  const getCartQuantity = useCallback(
    (menuId) => {
      const item = cartItems.find((i) => i.menu.id === menuId);
      return item ? item.quantite : 0;
    },
    [cartItems]
  );

  const handleMenuClick = (menu) => {
    setSelectedMenu(menu);
    setQuantityDialogOpen(true);
  };

  const handleQuantityConfirm = (menu, quantity) => {
    const current = getCartQuantity(menu.id);
    if (quantity === 0) {
      if (current > 0) removeFromCart(menu.id);
    } else if (current > 0) {
      updateItemQuantity(menu.id, quantity);
    } else {
      addItem(menu, quantity);
    }
  };

  const readOnly = statutJournee?.has_closure;

  return (
    <div className="flex flex-col pb-24">
      {/* Catalogue */}
      <MenuCatalog
        menus={menus}
        loading={menusLoading}
        error={menusError}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAddToCart={readOnly ? undefined : handleMenuClick}
        cartItems={cartItems}
        categories={categories}
        compact={true}
      />

      {/* Dépenses + Commandes dans un bloc scrollable sous le catalogue */}
      <div className="px-4 pt-4 space-y-4">
        {/* Commandes du jour */}
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Commandes saisies</span>
          </div>
          <CommandesDuJour commandes={commandesDuJour} loading={loadingCommandes} />
        </div>

        {/* Dépenses */}
        <div className="rounded-lg border border-border bg-card p-3">
          <DepensesJour
            depenses={depenses}
            onAjouter={ajouterDepense}
            loading={loadingOperations}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* Bouton sticky panier */}
      {!cartIsEmpty && !readOnly && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-14 left-0 right-0 p-4 bg-background border-t shadow-lg z-10">
          <Button size="lg" className="w-full" onClick={() => setCartSheetOpen(true)}>
            <ShoppingCart className="w-5 h-5 mr-2" />
            Voir panier ({totalItems} article{totalItems > 1 ? "s" : ""})
            <span className="ml-auto font-bold">{total.toLocaleString("fr-FR")} F</span>
          </Button>
        </motion.div>
      )}

      {/* Dialog quantité */}
      <QuantityDialog
        open={quantityDialogOpen}
        onOpenChange={setQuantityDialogOpen}
        menu={selectedMenu}
        currentQuantity={selectedMenu ? getCartQuantity(selectedMenu.id) : 0}
        onConfirm={handleQuantityConfirm}
      />

      {/* Sheet panier */}
      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] px-0">
          <div className="flex flex-col h-full">
            <div className="px-4 pb-3 border-b">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 pr-8">
                  <ShoppingCart className="w-5 h-5" />
                  Panier rétroactif
                  {!cartIsEmpty && <Badge variant="secondary">{totalItems}</Badge>}
                </SheetTitle>
              </SheetHeader>
              {!cartIsEmpty && (
                <Button variant="ghost" size="sm" className="text-destructive mt-2" onClick={clearCart}>
                  Vider le panier
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="py-3 space-y-1">
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
              <div className="py-3 border-t">
                <PromoInput promotion={promotion} onApply={applyPromoCode} onRemove={removePromoCode} />
              </div>
              <div className="py-3 border-t">
                <ClientInfo
                  client={client} contactClient={contactClient}
                  orderType={orderType} deliveryInfo={deliveryInfo}
                  onClientChange={setClientInfo} onOrderTypeChange={setOrderType}
                  onDeliveryChange={setDeliveryInfo} compact
                />
              </div>
            </div>
            <div className="flex-shrink-0 px-4 py-3 border-t bg-background">
              <CartTotals subtotal={subtotal} discount={discount} deliveryFee={deliveryFee} total={total} promotion={promotion} className="mb-3" />
              <Button size="lg" className="w-full" onClick={() => { setCartSheetOpen(false); openPaymentPanel(); }} disabled={!canSubmitCommande}>
                Passer au paiement
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet paiement */}
      <Sheet open={showPaymentPanel} onOpenChange={closePaymentPanel}>
        <SheetContent side="bottom" className="h-[90vh] px-0">
          <div className="h-full overflow-y-auto px-4 pb-6">
            <PaymentPanel
              total={total} totalPaid={totalPaid} remainingAmount={remainingAmount}
              payments={{ momo: cartPayments.momo || 0, cash: cartPayments.cash || 0, autre: cartPayments.autre || 0 }}
              onRecordPayment={recordPayment} onResetPayments={resetPayments}
              onPayRemainingInCash={payRemainingInCash}
              onSubmit={submitCommandeRetroactive} onClose={closePaymentPanel}
              isSubmitting={isSubmittingCommande} canSubmit={canSubmitCommande}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet confirmation */}
      <Sheet open={showConfirmation} onOpenChange={closeConfirmation}>
        <SheetContent side="bottom" className="h-[80vh]">
          <PaymentConfirmation order={lastOrder} onNewOrder={startNewOrder} onClose={closeConfirmation} />
        </SheetContent>
      </Sheet>
    </div>
  );
};

// ─── Version Desktop ─────────────────────────────────────────────────────────

export const DesktopOngletCommandes = ({ hook }) => {
  const cartPayments = useCartStore((state) => state.details_paiement);

  const {
    menus, menusLoading, menusError, categories, activeCategory,
    setActiveCategory, searchTerm, setSearchTerm,
    cartItems, cartIsEmpty, totalItems, total, canSubmitCommande,
    addToCart, removeFromCart, incrementQuantity, decrementQuantity, clearCart,
    subtotal, discount, deliveryFee, totalPaid, remainingAmount,
    client, contactClient, orderType, deliveryInfo,
    setClientInfo, setOrderType, setDeliveryInfo,
    promotion, applyPromoCode, removePromoCode,
    recordPayment, resetPayments, payRemainingInCash,
    submitCommandeRetroactive, startNewOrder, isSubmittingCommande,
    showPaymentPanel, openPaymentPanel, closePaymentPanel,
    showConfirmation, closeConfirmation, lastOrder,
    commandesDuJour, loadingCommandes,
    depenses, ajouterDepense, loadingOperations,
    statutJournee,
  } = hook;

  const readOnly = statutJournee?.has_closure;

  return (
    <div className="flex gap-4 h-full overflow-hidden">
      {/* Colonne gauche : Catalogue */}
      <div className="flex-1 min-w-0">
        <Card className="h-full p-4 overflow-hidden flex flex-col">
          <MenuCatalog
            menus={menus} loading={menusLoading} error={menusError}
            activeCategory={activeCategory} onCategoryChange={setActiveCategory}
            searchTerm={searchTerm} onSearchChange={setSearchTerm}
            onAddToCart={readOnly ? undefined : addToCart}
            cartItems={cartItems} categories={categories}
            compact={false} className="h-full"
          />
        </Card>
      </div>

      {/* Colonne droite : Panier + Commandes + Dépenses */}
      <div className="w-[400px] xl:w-[450px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
        {/* Panier */}
        <Card className="flex flex-col overflow-hidden flex-shrink-0">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Panier rétroactif</h2>
              {!cartIsEmpty && <span className="text-sm text-muted-foreground">({totalItems})</span>}
            </div>
            {!cartIsEmpty && (
              <Button variant="ghost" size="sm" className="text-destructive" onClick={clearCart}>
                <Trash2 className="w-4 h-4 mr-1" /> Vider
              </Button>
            )}
          </div>

          {cartIsEmpty ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Cliquez sur un article pour l'ajouter</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-72">
                <div className="space-y-2">
                  <AnimatePresence>
                    {cartItems.map((item) => (
                      <CartItem key={item.menu.id} item={item}
                        onIncrement={incrementQuantity} onDecrement={decrementQuantity} onRemove={removeFromCart} />
                    ))}
                  </AnimatePresence>
                </div>
                <div className="border-t pt-4">
                  <PromoInput promotion={promotion} onApply={applyPromoCode} onRemove={removePromoCode} />
                </div>
                <div className="border-t pt-4">
                  <ClientInfo client={client} contactClient={contactClient}
                    orderType={orderType} deliveryInfo={deliveryInfo}
                    onClientChange={setClientInfo} onOrderTypeChange={setOrderType}
                    onDeliveryChange={setDeliveryInfo} />
                </div>
              </div>
              <div className="border-t p-4 bg-muted/30">
                <CartTotals subtotal={subtotal} discount={discount} deliveryFee={deliveryFee}
                  total={total} promotion={promotion} className="mb-4" />
                <Button size="lg" className="w-full" onClick={openPaymentPanel} disabled={!canSubmitCommande}>
                  <CreditCard className="w-4 h-4 mr-2" /> Passer au paiement
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Commandes du jour */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Commandes saisies</span>
          </div>
          <CommandesDuJour commandes={commandesDuJour} loading={loadingCommandes} />
        </Card>

        {/* Dépenses */}
        <Card className="p-4">
          <DepensesJour
            depenses={depenses}
            onAjouter={ajouterDepense}
            loading={loadingOperations}
            readOnly={readOnly}
          />
        </Card>
      </div>

      {/* Dialog paiement */}
      <Dialog open={showPaymentPanel} onOpenChange={closePaymentPanel}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-auto">
          <PaymentPanel
            total={total} totalPaid={totalPaid} remainingAmount={remainingAmount}
            payments={{ momo: cartPayments.momo || 0, cash: cartPayments.cash || 0, autre: cartPayments.autre || 0 }}
            onRecordPayment={recordPayment} onResetPayments={resetPayments}
            onPayRemainingInCash={payRemainingInCash}
            onSubmit={submitCommandeRetroactive} onClose={closePaymentPanel}
            isSubmitting={isSubmittingCommande} canSubmit={canSubmitCommande}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog confirmation */}
      <Dialog open={showConfirmation} onOpenChange={closeConfirmation}>
        <DialogContent className="max-w-md">
          <PaymentConfirmation order={lastOrder} onNewOrder={startNewOrder} onClose={closeConfirmation} />
        </DialogContent>
      </Dialog>
    </div>
  );
};