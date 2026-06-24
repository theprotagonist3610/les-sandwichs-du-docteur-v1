import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useCommandeEditor } from "@/features/commandes/hooks/useCommandeEditor";
import { Loader2, User, ShoppingBag, Truck, CreditCard, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  CommandeHeader,
  CommandeInfoSection,
  CommandeDetailsSection,
  CommandeLivraisonSection,
  CommandePaiementSection,
  CommandeHistorySection,
  AdresseSelector,
  AddItemModal,
  ConfirmDialog,
} from "@/features/commandes/components";

const Commande = () => {
  const location = useLocation();

  const {
    commande,
    isLoading,
    isSaving,
    isDirty,
    errors,
    globalError,
    menus,
    livreurs,
    adresses,
    history,
    historyLoading,
    hasMoreHistory,
    loadMoreHistory,
    canEdit,
    canDeliver,
    canClose,
    canUndo,
    canRedo,
    resteAPayer,
    updateField,
    addItem,
    removeItem,
    updateItemQuantity,
    assignLivreur,
    setAdresse,
    updatePaiement,
    save,
    cancel,
    goBack,
    deliver,
    close,
    deliverAndClose,
    previewHistoryEntry,
    rollbackToEntry,
    selectedHistoryEntry,
    setSelectedHistoryEntry,
    undo,
    redo,
    confirmAction,
    setConfirmAction,
    showAddItemModal,
    setShowAddItemModal,
    showAdresseModal,
    setShowAdresseModal,
    showHistoryModal,
    setShowHistoryModal,
    activeSection,
    setActiveSection,
    TYPES_COMMANDE,
    isFieldDirty,
  } = useCommandeEditor();

  const addressReturnHandledRef = useRef(false);

  useEffect(() => {
    if (
      location.state?.newAdresseId &&
      adresses?.length > 0 &&
      !addressReturnHandledRef.current
    ) {
      addressReturnHandledRef.current = true;
      const newAdresse = adresses.find((a) => a.id === location.state.newAdresseId);
      if (newAdresse) {
        setAdresse(newAdresse);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.newAdresseId, adresses]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Chargement de la commande...</p>
        </div>
      </div>
    );
  }

  if (globalError && !commande) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive mb-4">{globalError}</p>
          <button onClick={goBack} className="text-primary hover:underline">
            Retourner à la liste
          </button>
        </div>
      </div>
    );
  }

  if (!commande) return null;

  const isLivraison = commande.type === "livraison";

  const sharedHeaderProps = {
    commande,
    isDirty,
    isSaving,
    canEdit,
    canDeliver,
    canClose,
    canUndo,
    canRedo,
    onSave: save,
    onCancel: cancel,
    onGoBack: goBack,
    onUndo: undo,
    onRedo: redo,
    onDeliver: deliver,
    onClose: close,
    onDeliverAndClose: deliverAndClose,
    onShowHistory: () => setShowHistoryModal(true),
    resteAPayer,
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* ===== DESKTOP LAYOUT ===== */}
      <div className="hidden lg:block">
        <CommandeHeader {...sharedHeaderProps} isMobile={false} />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-6">
                <CommandeInfoSection
                  commande={commande}
                  canEdit={canEdit}
                  onUpdateField={updateField}
                  TYPES_COMMANDE={TYPES_COMMANDE}
                  errors={errors}
                  isFieldDirty={isFieldDirty}
                />
                <CommandeLivraisonSection
                  commande={commande}
                  livreurs={livreurs}
                  canEdit={canEdit}
                  onUpdateField={updateField}
                  onAssignLivreur={assignLivreur}
                  onSelectAdresse={() => setShowAdresseModal(true)}
                  isFieldDirty={isFieldDirty}
                  selectedAdresse={adresses?.find((a) => a.id === commande.adresse_id)}
                />
              </div>
              <div className="lg:col-span-1">
                <CommandeDetailsSection
                  commande={commande}
                  canEdit={canEdit}
                  onAddItem={() => setShowAddItemModal(true)}
                  onRemoveItem={removeItem}
                  onUpdateQuantity={updateItemQuantity}
                  isFieldDirty={isFieldDirty}
                />
              </div>
              <div className="space-y-6">
                <CommandePaiementSection
                  commande={commande}
                  canEdit={canEdit}
                  onUpdatePaiement={updatePaiement}
                  isFieldDirty={isFieldDirty}
                />
                <CommandeHistorySection
                  history={history}
                  historyLoading={historyLoading}
                  hasMoreHistory={hasMoreHistory}
                  onLoadMore={loadMoreHistory}
                  onPreview={previewHistoryEntry}
                  onRollback={rollbackToEntry}
                  selectedEntry={selectedHistoryEntry}
                  onClosePreview={() => setSelectedHistoryEntry(null)}
                  showModal={showHistoryModal}
                  onCloseModal={() => setShowHistoryModal(false)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MOBILE LAYOUT (Tabs) ===== */}
      <div className="lg:hidden">
        <CommandeHeader {...sharedHeaderProps} isMobile={true} />
        <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
          <div className="sticky top-[120px] z-30 bg-background border-b">
            <TabsList className="w-full justify-start h-12 rounded-none bg-transparent px-2 overflow-x-auto">
              <TabsTrigger
                value="info"
                className="flex items-center gap-1.5 data-[state=active]:bg-primary/10">
                <User className="h-4 w-4" />
                <span className="text-xs">Client</span>
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="flex items-center gap-1.5 data-[state=active]:bg-primary/10">
                <ShoppingBag className="h-4 w-4" />
                <span className="text-xs">Articles</span>
              </TabsTrigger>
              {isLivraison && (
                <TabsTrigger
                  value="livraison"
                  className="flex items-center gap-1.5 data-[state=active]:bg-primary/10">
                  <Truck className="h-4 w-4" />
                  <span className="text-xs">Livraison</span>
                </TabsTrigger>
              )}
              <TabsTrigger
                value="paiement"
                className="flex items-center gap-1.5 data-[state=active]:bg-primary/10">
                <CreditCard className="h-4 w-4" />
                <span className="text-xs">Paiement</span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex items-center gap-1.5 data-[state=active]:bg-primary/10">
                <History className="h-4 w-4" />
                <span className="text-xs">Historique</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4">
            <TabsContent value="info" className="mt-0">
              <CommandeInfoSection
                commande={commande}
                canEdit={canEdit}
                onUpdateField={updateField}
                TYPES_COMMANDE={TYPES_COMMANDE}
                errors={errors}
                isFieldDirty={isFieldDirty}
              />
            </TabsContent>

            <TabsContent value="details" className="mt-0">
              <CommandeDetailsSection
                commande={commande}
                canEdit={canEdit}
                onAddItem={() => setShowAddItemModal(true)}
                onRemoveItem={removeItem}
                onUpdateQuantity={updateItemQuantity}
                isFieldDirty={isFieldDirty}
              />
            </TabsContent>

            {isLivraison && (
              <TabsContent value="livraison" className="mt-0">
                <CommandeLivraisonSection
                  commande={commande}
                  livreurs={livreurs}
                  canEdit={canEdit}
                  onUpdateField={updateField}
                  onAssignLivreur={assignLivreur}
                  onSelectAdresse={() => setShowAdresseModal(true)}
                  isFieldDirty={isFieldDirty}
                  selectedAdresse={adresses?.find((a) => a.id === commande.adresse_id)}
                />
              </TabsContent>
            )}

            <TabsContent value="paiement" className="mt-0">
              <CommandePaiementSection
                commande={commande}
                canEdit={canEdit}
                onUpdatePaiement={updatePaiement}
                isFieldDirty={isFieldDirty}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <CommandeHistorySection
                history={history}
                historyLoading={historyLoading}
                hasMoreHistory={hasMoreHistory}
                onLoadMore={loadMoreHistory}
                onPreview={previewHistoryEntry}
                onRollback={rollbackToEntry}
                selectedEntry={selectedHistoryEntry}
                onClosePreview={() => setSelectedHistoryEntry(null)}
                showModal={showHistoryModal}
                onCloseModal={() => setShowHistoryModal(false)}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* ===== MODALS (shared) ===== */}
      <AddItemModal
        open={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        menus={menus}
        onAddItem={addItem}
      />

      <AdresseSelector
        open={showAdresseModal}
        onClose={() => setShowAdresseModal(false)}
        adresses={adresses}
        currentAdresseId={commande.adresse_id}
        onSelect={setAdresse}
        commandeId={commande.id}
      />

      <ConfirmDialog config={confirmAction} onClose={() => setConfirmAction(null)} />
    </div>
  );
};

export default Commande;
