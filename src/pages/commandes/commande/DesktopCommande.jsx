import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useCommandeEditor } from "@/hooks/useCommandeEditor";
import { Loader2 } from "lucide-react";
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

const DesktopCommande = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

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
          <p className="text-muted-foreground">Chargement de la commande...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (globalError && !commande) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ display: visible ? "flex" : "none" }}>
        <div className="text-center">
          <p className="text-destructive mb-4">{globalError}</p>
          <button
            onClick={goBack}
            className="text-primary hover:underline">
            Retourner à la liste
          </button>
        </div>
      </div>
    );
  }

  if (!commande) return null;

  return (
    <div
      className="min-h-screen bg-background"
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
        isMobile={false}
      />

      {/* Contenu principal */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne gauche: Info client + Livraison */}
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
                selectedAdresse={adresses?.find(a => a.id === commande.adresse_id)}
              />
            </div>

            {/* Colonne centrale: Détails commande */}
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

            {/* Colonne droite: Paiement + Historique */}
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

export default DesktopCommande;
