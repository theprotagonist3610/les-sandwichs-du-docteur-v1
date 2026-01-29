import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useCommandeEditor } from "@/hooks/useCommandeEditor";
import { Loader2, User, ShoppingBag, Truck, CreditCard, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/commande";

const MobileCommande = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  // Hook controller
  const {
    // État principal
    commande,
    isLoading,
    isSaving,
    isDirty,
    errors,
    globalError,

    // Données associées
    menus,
    livreurs,
    adresses,

    // Historique
    history,
    historyLoading,
    hasMoreHistory,
    loadMoreHistory,

    // Permissions
    canEdit,
    canDeliver,
    canClose,
    canUndo,
    canRedo,

    // Actions de modification
    updateField,
    addItem,
    removeItem,
    updateItemQuantity,
    assignLivreur,
    setAdresse,
    updatePaiement,

    // Actions sauvegarde
    save,
    cancel,
    goBack,

    // Actions livraison/clôture
    deliver,
    close,
    deliverAndClose,

    // Actions historique
    previewHistoryEntry,
    rollbackToEntry,
    selectedHistoryEntry,
    setSelectedHistoryEntry,

    // Undo/Redo
    undo,
    redo,

    // Modals
    confirmAction,
    setConfirmAction,
    showAddItemModal,
    setShowAddItemModal,
    showAdresseModal,
    setShowAdresseModal,
    showHistoryModal,
    setShowHistoryModal,

    // Section active
    activeSection,
    setActiveSection,

    // Constantes
    TYPES_COMMANDE,

    // Utilitaires
    isFieldDirty,
  } = useCommandeEditor();

  // Ref pour éviter les doubles traitements du retour d'adresse
  const addressReturnHandledRef = useRef(false);

  // Gérer le retour depuis la page adresses-livraison avec une nouvelle adresse
  useEffect(() => {
    if (
      location.state?.newAdresseId &&
      adresses?.length > 0 &&
      !addressReturnHandledRef.current
    ) {
      // Marquer comme traité immédiatement
      addressReturnHandledRef.current = true;

      // Trouver l'adresse dans la liste et la sélectionner
      const newAdresse = adresses.find(a => a.id === location.state.newAdresseId);
      if (newAdresse) {
        setAdresse(newAdresse);
      }
      // Nettoyer le state
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.newAdresseId, adresses]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ display: visible ? "flex" : "none" }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (globalError && !commande) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ display: visible ? "flex" : "none" }}>
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

  // Vérifier si la commande est une livraison
  const isLivraison = commande.type === "livraison";

  return (
    <div
      className="min-h-screen bg-background pb-20"
      style={{ display: visible ? "block" : "none" }}>
      {/* Header */}
      <CommandeHeader
        commande={commande}
        isDirty={isDirty}
        isSaving={isSaving}
        canEdit={canEdit}
        canDeliver={canDeliver}
        canClose={canClose}
        canUndo={canUndo}
        canRedo={canRedo}
        onSave={save}
        onCancel={cancel}
        onGoBack={goBack}
        onUndo={undo}
        onRedo={redo}
        onDeliver={deliver}
        onClose={close}
        onDeliverAndClose={deliverAndClose}
        onShowHistory={() => setShowHistoryModal(true)}
        isMobile={true}
      />

      {/* Navigation par onglets */}
      <Tabs
        value={activeSection}
        onValueChange={setActiveSection}
        className="w-full">
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

        {/* Contenu des onglets */}
        <div className="p-4">
          {/* Onglet Client */}
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

          {/* Onglet Articles */}
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

          {/* Onglet Livraison */}
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
                selectedAdresse={adresses?.find(a => a.id === commande.adresse_id)}
              />
            </TabsContent>
          )}

          {/* Onglet Paiement */}
          <TabsContent value="paiement" className="mt-0">
            <CommandePaiementSection
              commande={commande}
              canEdit={canEdit}
              onUpdatePaiement={updatePaiement}
              isFieldDirty={isFieldDirty}
            />
          </TabsContent>

          {/* Onglet Historique */}
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

      {/* Modals */}
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

      <ConfirmDialog
        config={confirmAction}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
};

export default MobileCommande;
