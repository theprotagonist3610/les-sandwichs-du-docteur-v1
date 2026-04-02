/**
 * OngletCommandes.jsx
 * Onglet 1 du Back-Day : saisie de commandes rétroactives + dépenses du jour
 * Réutilise les composants POS existants, date verrouillée sur le jour sélectionné
 */

import { useState, useCallback, useEffect } from "react";
import { ShoppingCart, Trash2, ClipboardList, CreditCard, ChevronDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
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

  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [panierExpanded, setPanierExpanded] = useState(false);

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

  // Auto-expand panier quand des articles sont ajoutés
  useEffect(() => {
    if (!cartIsEmpty) setPanierExpanded(true);
  }, [cartIsEmpty]);

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
    <div className="px-3 pt-3 pb-8 space-y-3">

      {/* ── Catalogue inline ── */}
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
        inline={true}
      />

      <Separator />

      {/* ── Panier collapsible ── */}
      <Card className="overflow-hidden">
        <button
          className="w-full flex items-center gap-3 px-4 py-3 text-left"
          onClick={() => setPanierExpanded((v) => !v)}>
          <ShoppingCart className={cn("w-4 h-4 shrink-0", cartIsEmpty ? "text-muted-foreground" : "text-primary")} />
          <span className="text-sm font-semibold flex-1">Panier</span>
          {!cartIsEmpty && (
            <>
              <Badge variant="secondary" className="text-xs">{totalItems}</Badge>
              <span className="text-sm font-bold text-primary">{total.toLocaleString("fr-FR")} F</span>
            </>
          )}
          {cartIsEmpty && <span className="text-xs text-muted-foreground">Vide</span>}
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", panierExpanded && "rotate-180")} />
        </button>

        {panierExpanded && (
          <div className="border-t">
            {cartIsEmpty ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Sélectionnez des articles dans le catalogue
              </p>
            ) : (
              <div className="px-4 py-3 space-y-4">
                {/* Articles */}
                <div className="space-y-1">
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
                {/* Promo */}
                <div className="border-t pt-3">
                  <PromoInput promotion={promotion} onApply={applyPromoCode} onRemove={removePromoCode} />
                </div>
                {/* Client */}
                <div className="border-t pt-3">
                  <ClientInfo
                    client={client} contactClient={contactClient}
                    orderType={orderType} deliveryInfo={deliveryInfo}
                    onClientChange={setClientInfo} onOrderTypeChange={setOrderType}
                    onDeliveryChange={setDeliveryInfo} compact
                  />
                </div>
                {/* Totaux */}
                <CartTotals
                  subtotal={subtotal} discount={discount}
                  deliveryFee={deliveryFee} total={total}
                  promotion={promotion}
                />
                {/* Actions */}
                <div className="flex gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" className="text-destructive shrink-0" onClick={clearCart}>
                    <Trash2 className="w-4 h-4 mr-1" /> Vider
                  </Button>
                  <Button className="flex-1" onClick={openPaymentPanel} disabled={!canSubmitCommande}>
                    <CreditCard className="w-4 h-4 mr-2" /> Passer au paiement
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Separator />

      {/* ── Commandes saisies ── */}
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Commandes saisies</span>
        </div>
        <CommandesDuJour commandes={commandesDuJour} loading={loadingCommandes} />
      </Card>

      {/* ── Dépenses ── */}
      <Card className="p-3">
        <DepensesJour
          depenses={depenses}
          onAjouter={ajouterDepense}
          loading={loadingOperations}
          readOnly={readOnly}
        />
      </Card>

      {/* ── Dialogs / Sheets ── */}
      <QuantityDialog
        open={quantityDialogOpen}
        onOpenChange={setQuantityDialogOpen}
        menu={selectedMenu}
        currentQuantity={selectedMenu ? getCartQuantity(selectedMenu.id) : 0}
        onConfirm={handleQuantityConfirm}
      />

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
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity);
  const addItem = useCartStore((state) => state.addItem);

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
    <div className="flex gap-4 h-full overflow-hidden">
      {/* Colonne gauche : Catalogue */}
      <div className="flex-1 min-w-0">
        <Card className="h-full p-4 overflow-hidden flex flex-col">
          <MenuCatalog
            menus={menus} loading={menusLoading} error={menusError}
            activeCategory={activeCategory} onCategoryChange={setActiveCategory}
            searchTerm={searchTerm} onSearchChange={setSearchTerm}
            onAddToCart={readOnly ? undefined : handleMenuClick}
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

      {/* Dialog quantité */}
      <QuantityDialog
        open={quantityDialogOpen}
        onOpenChange={setQuantityDialogOpen}
        menu={selectedMenu}
        currentQuantity={selectedMenu ? getCartQuantity(selectedMenu.id) : 0}
        onConfirm={handleQuantityConfirm}
      />

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