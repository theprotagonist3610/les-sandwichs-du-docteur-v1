/**
 * useBackDay.jsx
 * Hook controller pour la saisie rétroactive (Back-Day)
 * Orchestre les 3 onglets : Commandes, Synthèse, Clôture
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import useActiveUserStore from "@/store/activeUserStore";
import { useMenus } from "@/hooks/useMenus";
import useCartStore from "@/store/cartStore";
import {
  // Toolkit
  createCommandeRetroactive,
  createSyntheseJournee,
  createDepenseRetroactive,
  createEncaissementRetroactif,
  getCommandesRetroactives,
  getOperationsRetroactives,
  cloturerJourneeRetroactive,
  getStatutJournee,
  getJourneesDisponibles,
  validateBackDayDate,
  getYesterdayStr,
  navigateDay,
  formatDateFr,
  formatDateStr,
  STATUTS_JOURNEE,
  TYPES_COMMANDE,
  STATUTS_PAIEMENT,
  STATUTS_COMMANDE,
  STATUTS_LIVRAISON,
  TYPES_COMPTE,
} from "@/utils/backDaysToolkit";
import * as commandeToolkit from "@/utils/commandeToolkit";
import {
  validateCodePromo,
  calculateReduction,
  incrementInstanceUsage,
  getPromotionInstanceById,
} from "@/utils/promotionToolkit";

// ============================================================================
// ONGLETS
// ============================================================================

export const ONGLETS = {
  COMMANDES: "commandes",
  SYNTHESE: "synthese",
  CLOTURE: "cloture",
};

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

const useBackDay = () => {
  const { user } = useActiveUserStore();
  const { menus, loading: menusLoading, error: menusError, MENU_TYPES, MENU_STATUTS } = useMenus();
  const cart = useCartStore();

  // ─── DATE & ONGLET ──────────────────────────────────────────────────────────

  const [selectedDate, setSelectedDate] = useState(getYesterdayStr());
  const [ongletActif, setOngletActif] = useState(ONGLETS.COMMANDES);

  // ─── STATUT JOURNÉE ─────────────────────────────────────────────────────────

  const [statutJournee, setStatutJournee] = useState(null);
  const [loadingStatut, setLoadingStatut] = useState(false);

  // ─── COMMANDES DU JOUR ──────────────────────────────────────────────────────

  const [commandesDuJour, setCommandesDuJour] = useState([]);
  const [loadingCommandes, setLoadingCommandes] = useState(false);

  // ─── OPÉRATIONS DU JOUR ─────────────────────────────────────────────────────

  const [depenses, setDepenses] = useState([]);
  const [encaissements, setEncaissements] = useState([]);
  const [loadingOperations, setLoadingOperations] = useState(false);

  // ─── POS - CATALOGUE ────────────────────────────────────────────────────────

  const [activeCategory, setActiveCategory] = useState("tous");
  const [searchTerm, setSearchTerm] = useState("");

  // ─── POS - UI ───────────────────────────────────────────────────────────────

  const [isSubmittingCommande, setIsSubmittingCommande] = useState(false);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  // ─── CLÔTURE ────────────────────────────────────────────────────────────────

  const [notesClôture, setNotesClôture] = useState("");
  const [isClôturing, setIsClôturing] = useState(false);

  // ─── CALENDRIER (desktop) ───────────────────────────────────────────────────

  const [joursCalendrier, setJoursCalendrier] = useState([]);

  // ============================================================================
  // CHARGEMENT DES DONNÉES DU JOUR SÉLECTIONNÉ
  // ============================================================================

  const chargerDonneesJour = useCallback(async (date) => {
    if (!date) return;
    const validation = validateBackDayDate(date);
    if (!validation.valid) return;

    setLoadingStatut(true);
    setLoadingCommandes(true);
    setLoadingOperations(true);

    try {
      const [statutResult, commandesResult, operationsResult] = await Promise.all([
        getStatutJournee(date),
        getCommandesRetroactives(date),
        getOperationsRetroactives(date),
      ]);

      if (statutResult.statut) setStatutJournee(statutResult.statut);
      setCommandesDuJour(commandesResult.commandes || []);
      setDepenses(operationsResult.depenses || []);
      setEncaissements(operationsResult.encaissements || []);
    } catch (err) {
      console.error("Erreur chargement données jour:", err);
    } finally {
      setLoadingStatut(false);
      setLoadingCommandes(false);
      setLoadingOperations(false);
    }
  }, []);

  // Recharger à chaque changement de date
  useEffect(() => {
    chargerDonneesJour(selectedDate);
    // Réinitialiser le panier sur changement de date
    cart.clearCart();
    setShowPaymentPanel(false);
    setShowConfirmation(false);
    setNotesClôture("");
  }, [selectedDate]);

  // Charger le calendrier au montage (30 derniers jours)
  useEffect(() => {
    const fin = getYesterdayStr();
    const debut = navigateDay(fin, -29);
    getJourneesDisponibles(debut, fin).then(({ jours }) => {
      setJoursCalendrier(jours || []);
    });
  }, []);

  // ============================================================================
  // NAVIGATION DE DATE
  // ============================================================================

  const allerJourPrecedent = useCallback(() => {
    const nouvelle = navigateDay(selectedDate, -1);
    setSelectedDate(nouvelle);
  }, [selectedDate]);

  const allerJourSuivant = useCallback(() => {
    const nouvelle = navigateDay(selectedDate, 1);
    const validation = validateBackDayDate(nouvelle);
    if (validation.valid) setSelectedDate(nouvelle);
  }, [selectedDate]);

  const changerDate = useCallback((date) => {
    const validation = validateBackDayDate(date);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }
    setSelectedDate(date);
  }, []);

  const peutAllerSuivant = validateBackDayDate(navigateDay(selectedDate, 1)).valid;

  // ============================================================================
  // MENUS FILTRÉS (pour l'onglet Commandes)
  // ============================================================================

  const availableMenus = (menus || []).filter(
    (m) => m.statut === MENU_STATUTS?.DISPONIBLE
  );

  const filteredMenus = availableMenus.filter((menu) => {
    const matchCategory = activeCategory === "tous" || menu.type === activeCategory;
    const matchSearch =
      !searchTerm ||
      menu.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      menu.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const categories = MENU_TYPES
    ? Object.values(MENU_TYPES).filter((type) =>
        availableMenus.some((m) => m.type === type)
      )
    : [];

  // ============================================================================
  // ACTIONS PANIER (Onglet Commandes)
  // ============================================================================

  const addToCart = useCallback(
    (menu, quantite = 1) => {
      cart.addItem(menu, quantite);
    },
    [cart]
  );

  const removeFromCart = useCallback((menuId) => cart.removeItem(menuId), [cart]);
  const incrementQuantity = useCallback((menuId) => cart.incrementQuantity(menuId), [cart]);
  const decrementQuantity = useCallback((menuId) => cart.decrementQuantity(menuId), [cart]);
  const updateQuantity = useCallback((menuId, q) => cart.updateItemQuantity(menuId, q), [cart]);
  const setClientInfo = useCallback((info) => cart.setClient(info), [cart]);
  const setOrderType = useCallback((type) => cart.setType(type), [cart]);
  const setDeliveryInfo = useCallback((info) => cart.setLivraison(info), [cart]);
  const recordPayment = useCallback((method, amount) => cart.setPayment(method, amount), [cart]);
  const resetPayments = useCallback(() => cart.resetPayments(), [cart]);

  const payRemainingInCash = useCallback(() => {
    const remaining = cart.getRemainingAmount();
    if (remaining > 0) cart.setPayment("cash", (cart.details_paiement.cash || 0) + remaining);
  }, [cart]);

  const applyPromoCode = useCallback(
    async (code) => {
      if (!code?.trim()) return;
      const { promotion, error } = await validateCodePromo(code);
      if (error || !promotion) {
        toast.error(error?.message || "Code promo invalide.");
        return;
      }
      cart.applyPromotion(promotion);
      toast.success(`Promo "${promotion.code_promo}" appliquée.`);
    },
    [cart]
  );

  const removePromoCode = useCallback(() => {
    cart.removePromotion();
  }, [cart]);

  // ============================================================================
  // SOUMISSION COMMANDE RÉTROACTIVE (Onglet Commandes)
  // ============================================================================

  const submitCommandeRetroactive = useCallback(async () => {
    if (!user?.id) {
      toast.error("Utilisateur non identifié.");
      return;
    }
    if (cart.isEmpty()) {
      toast.error("Le panier est vide.");
      return;
    }

    setIsSubmittingCommande(true);
    try {
      const commandeData = cart.prepareCommandeData();

      // Déterminer le statut paiement
      const totalPaid = cart.getTotalPaid();
      const total = cart.details_paiement.total_apres_reduction;
      let statutPaiement = STATUTS_PAIEMENT.NON_PAYEE;
      if (totalPaid >= total) {
        statutPaiement = STATUTS_PAIEMENT.PAYEE;
      } else if (totalPaid > 0) {
        statutPaiement = STATUTS_PAIEMENT.PARTIELLEMENT_PAYEE;
      }

      const payload = {
        ...commandeData,
        statut_paiement: statutPaiement,
        statut_commande: STATUTS_COMMANDE.TERMINEE,
        statut_livraison:
          commandeData.type === TYPES_COMMANDE.LIVRAISON
            ? STATUTS_LIVRAISON.LIVREE
            : STATUTS_LIVRAISON.EN_ATTENTE,
        details_commandes: commandeData.details_commandes,
        details_paiement: {
          ...commandeData.details_paiement,
          total: commandeData.details_paiement.total,
          total_apres_reduction: commandeData.details_paiement.total_apres_reduction,
          cash: commandeData.details_paiement.cash || 0,
          momo: commandeData.details_paiement.momo || 0,
          autre: commandeData.details_paiement.autre || 0,
        },
      };

      const { commande, error } = await createCommandeRetroactive(
        payload,
        user.id,
        selectedDate
      );

      if (error) {
        toast.error(error.message || "Erreur lors de la création de la commande.");
        return;
      }

      // Incrémenter l'utilisation de la promo si applicable
      if (cart.promotion?.id) {
        await incrementInstanceUsage(cart.promotion.id).catch(() => {});
      }

      setLastOrder(commande);
      setShowPaymentPanel(false);
      setShowConfirmation(true);
      cart.clearCart();

      // Rafraîchir les données du jour
      await chargerDonneesJour(selectedDate);
      toast.success("Commande enregistrée.");
    } catch (err) {
      console.error("Erreur submitCommandeRetroactive:", err);
      toast.error("Erreur inattendue.");
    } finally {
      setIsSubmittingCommande(false);
    }
  }, [user, cart, selectedDate, chargerDonneesJour]);

  const startNewOrder = useCallback(() => {
    cart.clearCart();
    setShowConfirmation(false);
    setShowPaymentPanel(false);
    setLastOrder(null);
  }, [cart]);

  // ============================================================================
  // DÉPENSES (Onglets 1 & 2)
  // ============================================================================

  const ajouterDepense = useCallback(
    async (depenseData) => {
      if (!user?.id) return;
      const { operation, error } = await createDepenseRetroactive(
        { ...depenseData, date: selectedDate },
        user.id
      );
      if (error) {
        toast.error(error.message);
        return false;
      }
      setDepenses((prev) => [...prev, operation]);
      toast.success("Dépense enregistrée.");
      await chargerDonneesJour(selectedDate);
      return true;
    },
    [user, selectedDate, chargerDonneesJour]
  );

  // ============================================================================
  // ENCAISSEMENTS AUTONOMES (Onglet Synthèse)
  // ============================================================================

  const ajouterEncaissement = useCallback(
    async (encaissementData) => {
      if (!user?.id) return;
      const { operation, error } = await createEncaissementRetroactif(
        { ...encaissementData, date: selectedDate },
        user.id
      );
      if (error) {
        toast.error(error.message);
        return false;
      }
      setEncaissements((prev) => [...prev, operation]);
      toast.success("Encaissement enregistré.");
      await chargerDonneesJour(selectedDate);
      return true;
    },
    [user, selectedDate, chargerDonneesJour]
  );

  // ============================================================================
  // SYNTHÈSE JOURNALIÈRE (Onglet Synthèse)
  // ============================================================================

  const enregistrerSynthese = useCallback(
    async (syntheseData) => {
      if (!user?.id) return false;
      const { commande, operations, error } = await createSyntheseJournee(
        selectedDate,
        syntheseData,
        user.id
      );
      if (error && !commande) {
        toast.error(error.message);
        return false;
      }
      if (error) toast.warning("Synthèse créée avec quelques erreurs : " + error.message);
      else toast.success("Synthèse de la journée enregistrée.");

      await chargerDonneesJour(selectedDate);
      return true;
    },
    [user, selectedDate, chargerDonneesJour]
  );

  // ============================================================================
  // CLÔTURE (Onglet Clôture)
  // ============================================================================

  const cloturerJournee = useCallback(async () => {
    if (!user?.id) return;
    setIsClôturing(true);
    try {
      const { closure, error } = await cloturerJourneeRetroactive(
        selectedDate,
        user.id,
        notesClôture
      );
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Journée clôturée avec succès.");
      await chargerDonneesJour(selectedDate);

      // Mettre à jour le calendrier
      const fin = getYesterdayStr();
      const debut = navigateDay(fin, -29);
      getJourneesDisponibles(debut, fin).then(({ jours }) => setJoursCalendrier(jours || []));
    } catch (err) {
      toast.error("Erreur lors de la clôture.");
    } finally {
      setIsClôturing(false);
    }
  }, [user, selectedDate, notesClôture, chargerDonneesJour]);

  // ============================================================================
  // CALCULS DÉRIVÉS
  // ============================================================================

  const subtotal = cart.getSubtotal();
  const discount = cart.getDiscount();
  const deliveryFee = cart.frais_livraison || 0;
  const total = cart.details_paiement.total_apres_reduction || 0;
  const totalPaid = cart.getTotalPaid();
  const remainingAmount = cart.getRemainingAmount();
  const isFullyPaid = remainingAmount <= 0 && totalPaid > 0;

  const totalDepensesJour = depenses.reduce(
    (s, d) => s + parseFloat(d.montant || 0),
    0
  );
  const totalEncaissementsJour = encaissements.reduce(
    (s, e) => s + parseFloat(e.montant || 0),
    0
  );

  // Mode journée : commandes individuelles OU synthèse globale, pas les deux
  const hasSynthese = commandesDuJour.some((c) => c.client === "SYNTHESE JOURNEE");
  const hasCommandes = commandesDuJour.some((c) => c.client !== "SYNTHESE JOURNEE");

  // ============================================================================
  // RETOUR
  // ============================================================================

  return {
    // ─── Date & Navigation ───────────────────────────────────────────────────
    selectedDate,
    changerDate,
    allerJourPrecedent,
    allerJourSuivant,
    peutAllerSuivant,
    formatDateFr,

    // ─── Onglets ─────────────────────────────────────────────────────────────
    ongletActif,
    setOngletActif,
    ONGLETS,

    // ─── Statut journée ──────────────────────────────────────────────────────
    statutJournee,
    loadingStatut,
    STATUTS_JOURNEE,

    // ─── Commandes du jour ───────────────────────────────────────────────────
    commandesDuJour,
    loadingCommandes,
    chargerDonneesJour,

    // ─── Opérations du jour ──────────────────────────────────────────────────
    depenses,
    encaissements,
    loadingOperations,
    totalDepensesJour,
    totalEncaissementsJour,

    // ─── Catalogue menus ─────────────────────────────────────────────────────
    menus: filteredMenus,
    allMenus: availableMenus,
    menusLoading,
    menusError,
    categories,
    activeCategory,
    setActiveCategory,
    searchTerm,
    setSearchTerm,
    MENU_TYPES,

    // ─── Panier ──────────────────────────────────────────────────────────────
    cartItems: cart.items,
    cartIsEmpty: cart.isEmpty(),
    totalItems: cart.getTotalItems(),
    client: cart.client,
    contactClient: cart.contact_client,
    orderType: cart.type,
    deliveryInfo: {
      lieu_livraison: cart.lieu_livraison,
      instructions_livraison: cart.instructions_livraison,
      date_livraison: cart.date_livraison,
      heure_livraison: cart.heure_livraison,
      frais_livraison: cart.frais_livraison,
    },
    promotion: cart.promotion,
    subtotal,
    discount,
    deliveryFee,
    total,
    totalPaid,
    remainingAmount,
    isFullyPaid,
    detailsPaiement: cart.details_paiement,

    // ─── Actions panier ──────────────────────────────────────────────────────
    addToCart,
    removeFromCart,
    incrementQuantity,
    decrementQuantity,
    updateQuantity,
    clearCart: () => cart.clearCart(),
    setClientInfo,
    setOrderType,
    setDeliveryInfo,
    applyPromoCode,
    removePromoCode,
    recordPayment,
    resetPayments,
    payRemainingInCash,

    // ─── Soumission commande ─────────────────────────────────────────────────
    submitCommandeRetroactive,
    startNewOrder,
    isSubmittingCommande,
    canSubmitCommande: !cart.isEmpty() && cart.canSubmit(),
    showPaymentPanel,
    openPaymentPanel: () => setShowPaymentPanel(true),
    closePaymentPanel: () => setShowPaymentPanel(false),
    showConfirmation,
    closeConfirmation: () => setShowConfirmation(false),
    lastOrder,

    // ─── Dépenses ────────────────────────────────────────────────────────────
    ajouterDepense,

    // ─── Encaissements ───────────────────────────────────────────────────────
    ajouterEncaissement,

    // ─── Synthèse ────────────────────────────────────────────────────────────
    enregistrerSynthese,

    // ─── Clôture ─────────────────────────────────────────────────────────────
    notesClôture,
    setNotesClôture,
    cloturerJournee,
    isClôturing,

    // ─── Calendrier ──────────────────────────────────────────────────────────
    joursCalendrier,

    // ─── Mode journée ────────────────────────────────────────────────────────
    hasSynthese,
    hasCommandes,

    // ─── Constantes ──────────────────────────────────────────────────────────
    TYPES_COMMANDE,
    TYPES_COMPTE,
  };
};

export default useBackDay;
