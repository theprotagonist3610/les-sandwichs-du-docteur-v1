import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  Lock,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Target,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import dayClosureService from "@/services/DayClosureService";
import useActiveUserStore from "@/store/activeUserStore";
import MetricsComparison from "./MetricsComparison";
import { getLocalDateString } from "@/utils/commandeToolkit";
import {
  getDashboardPrevisions,
  REGLES_PREVISIONS,
} from "@/utils/comptabiliteToolkit";

/**
 * Widget de clôture journalière
 * Permet de visualiser l'état du jour et effectuer la clôture
 */
const ClotureWidget = ({ isMobile = false }) => {
  const { user } = useActiveUserStore();

  // États
  const [loading, setLoading] = useState(true);
  const [canClose, setCanClose] = useState(false);
  const [checkReason, setCheckReason] = useState("");
  const [commandesCount, setCommandesCount] = useState(0);
  const [existingClosure, setExistingClosure] = useState(null);

  // Dialog états
  const [showDialog, setShowDialog] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // États pour prévisions vs temps réel
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  // États pour les prévisions comptables
  const [comptaPrevisions, setComptaPrevisions] = useState(null);

  // Date du jour (en state pour détecter les changements) - utilise le fuseau local
  const [today, setToday] = useState(() => getLocalDateString());
  const [autoClosureTriggered, setAutoClosureTriggered] = useState(false);

  // Vérifier l'état au chargement et charger les comparaisons
  useEffect(() => {
    checkClosureStatus();
    loadComparisonData();
  }, [today]); // Réexécuter quand la date change

  // Détecter le changement de jour (vérifie toutes les minutes)
  useEffect(() => {
    const checkDateChange = () => {
      const currentDate = getLocalDateString();
      if (currentDate !== today) {
        console.log(`📅 Changement de jour détecté: ${today} → ${currentDate}`);

        // Déclencher la clôture automatique de la veille si pas déjà fait
        if (!existingClosure && !autoClosureTriggered) {
          triggerAutoClosure(today);
        }

        // Mettre à jour la date
        setToday(currentDate);
        setAutoClosureTriggered(false);
        setExistingClosure(null);
      }
    };

    // Vérifier immédiatement
    checkDateChange();

    // Vérifier toutes les minutes
    const interval = setInterval(checkDateChange, 60 * 1000);

    // Vérifier aussi quand l'onglet redevient visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkDateChange();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [today, existingClosure, autoClosureTriggered]);

  // Rafraîchir les comparaisons toutes les 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!existingClosure) {
        loadComparisonData();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [existingClosure]);

  /**
   * Charge les données de comparaison prévisions vs temps réel
   */
  const loadComparisonData = async () => {
    setLoadingComparison(true);
    try {
      // Charger les prévisions de vente
      const { success, comparison } = await dayClosureService.getRealtimeVsForecast(today);
      if (success && comparison) {
        setComparisonData(comparison);
        setShowComparison(true);
      }

      // Charger les prévisions comptables (CA minimum, plafond dépenses)
      const comptaResult = await getDashboardPrevisions();
      if (comptaResult.success) {
        setComptaPrevisions(comptaResult.dashboard);
      }
    } catch (error) {
      console.error("Erreur loadComparisonData:", error);
    } finally {
      setLoadingComparison(false);
    }
  };

  /**
   * Déclenche la clôture automatique via Edge Function
   * Appelée quand un changement de jour est détecté et la veille n'est pas clôturée
   */
  const triggerAutoClosure = async (dateToClose) => {
    console.log(`🔄 Déclenchement clôture automatique pour ${dateToClose}`);
    setAutoClosureTriggered(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-closure`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            date: dateToClose,
            triggered_by: user?.id || "system",
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Clôture automatique réussie pour ${dateToClose}`);
      } else {
        console.warn(`⚠️ Clôture automatique échouée: ${result.error}`);
      }
    } catch (error) {
      console.error("Erreur triggerAutoClosure:", error);
    }
  };

  /**
   * Vérifie si la clôture peut être effectuée et si elle existe déjà
   */
  const checkClosureStatus = async () => {
    setLoading(true);
    try {
      // Vérifier si une clôture existe déjà
      const { success: closureSuccess, closure } = await dayClosureService.getClosure(today);

      if (closureSuccess && closure) {
        setExistingClosure(closure);
        setCanClose(false);
        setCheckReason("Clôture déjà effectuée");
      } else {
        // Vérifier si la clôture peut être effectuée
        const result = await dayClosureService.canClosureBePerformed(today);
        setCanClose(result.canClose);
        setCheckReason(result.reason);
        setCommandesCount(result.commandesCount);
      }
    } catch (error) {
      console.error("Erreur checkClosureStatus:", error);
      setCheckReason("Erreur lors de la vérification");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Prévisualise les métriques sans enregistrer
   */
  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const { success, metrics: previewMetrics, error } = await dayClosureService.previewMetrics(
        today
      );

      if (success) {
        setMetrics(previewMetrics);
      } else {
        alert(error || "Erreur lors de la prévisualisation");
      }
    } catch (error) {
      console.error("Erreur handlePreview:", error);
      alert("Erreur lors de la prévisualisation");
    } finally {
      setPreviewing(false);
    }
  };

  /**
   * Effectue la clôture journalière
   */
  const handleClosure = async () => {
    if (!user?.id) {
      alert("Utilisateur non connecté");
      return;
    }

    setSubmitting(true);
    try {
      const { success, closure, error } = await dayClosureService.performDayClosure(
        today,
        user.id,
        notes
      );

      if (success) {
        setExistingClosure(closure);
        setShowDialog(false);
        setMetrics(null);
        setNotes("");
        checkClosureStatus(); // Rafraîchir l'état
      } else {
        alert(error || "Erreur lors de la clôture");
      }
    } catch (error) {
      console.error("Erreur handleClosure:", error);
      alert("Erreur lors de la clôture");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Ouvre le dialog de clôture
   */
  const openClosureDialog = () => {
    setShowDialog(true);
    handlePreview(); // Prévisualiser automatiquement
  };

  // Rendu du contenu principal du widget
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
        </div>
      );
    }

    // Si clôture déjà effectuée
    if (existingClosure) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className={`${isMobile ? "text-sm" : "text-base"} font-medium`}>
              Journée clôturée
            </span>
          </div>

          {/* Métriques principales */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-background/50 rounded-lg border border-border">
              <div className="flex items-center gap-1 mb-1">
                <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Ventes</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                {existingClosure.nombre_ventes_total}
              </p>
            </div>

            <div className="p-3 bg-background/50 rounded-lg border border-border">
              <div className="flex items-center gap-1 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">CA</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                {(existingClosure.chiffre_affaires / 1000).toFixed(0)}K
              </p>
            </div>

            <div className="p-3 bg-background/50 rounded-lg border border-border">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Panier</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                {(existingClosure.panier_moyen / 1000).toFixed(1)}K
              </p>
            </div>
          </div>

          {/* Horaires */}
          <div className="text-xs text-muted-foreground text-center">
            {existingClosure.ouverture} - {existingClosure.fermeture}
          </div>
        </div>
      );
    }

    // Si peut clôturer
    if (canClose) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <span className={`${isMobile ? "text-sm" : "text-base"} text-muted-foreground`}>
                Prêt pour clôture
              </span>
            </div>
            <Badge variant="secondary">{commandesCount} commandes</Badge>
          </div>

          {/* Comparaison prévisions vs temps réel */}
          {showComparison && comparisonData ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Prévisions vs Temps Réel
                </span>
                {loadingComparison && (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <MetricsComparison comparison={comparisonData} />

              {/* Règles comptables et alertes */}
              {comptaPrevisions && (
                <div className="space-y-2 pt-2 border-t border-border">
                  {/* Objectif CA et dépenses */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-background/50 rounded border border-border">
                      <div className="flex items-center gap-1 mb-1">
                        <Target className="w-3 h-3 text-blue-600" />
                        <span className="text-[10px] text-muted-foreground">Obj. CA jour</span>
                      </div>
                      <p className="text-xs font-semibold">
                        {comptaPrevisions.previsions.ca_journalier.toLocaleString("fr-FR")} F
                      </p>
                    </div>
                    <div className="p-2 bg-background/50 rounded border border-border">
                      <div className="flex items-center gap-1 mb-1">
                        <Wallet className="w-3 h-3 text-purple-600" />
                        <span className="text-[10px] text-muted-foreground">Dépenses mois</span>
                      </div>
                      <p
                        className={`text-xs font-semibold ${
                          comptaPrevisions.progression.depenses > 90
                            ? "text-red-600"
                            : comptaPrevisions.progression.depenses > 75
                            ? "text-orange-600"
                            : "text-green-600"
                        }`}>
                        {comptaPrevisions.progression.depenses}% utilisé
                      </p>
                    </div>
                  </div>

                  {/* Alertes comptables */}
                  {comptaPrevisions.alertes && comptaPrevisions.alertes.length > 0 && (
                    <div className="space-y-1">
                      {comptaPrevisions.alertes.map((alerte, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-1.5 p-2 rounded ${
                            alerte.type === "danger"
                              ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
                              : "bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900"
                          }`}>
                          <AlertTriangle
                            className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                              alerte.type === "danger" ? "text-red-600" : "text-orange-600"
                            }`}
                          />
                          <span
                            className={`text-[10px] ${
                              alerte.type === "danger"
                                ? "text-red-700 dark:text-red-400"
                                : "text-orange-700 dark:text-orange-400"
                            }`}>
                            {alerte.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Info sur les règles */}
                  <p className="text-[9px] text-muted-foreground text-center">
                    Min: {REGLES_PREVISIONS.CA_MINIMUM_JOUR.toLocaleString("fr-FR")} F/jour • Max
                    dépenses: {REGLES_PREVISIONS.RATIO_DEPENSES_MAX * 100}% CA
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-background/50 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">{checkReason}</p>
            </div>
          )}

          <Button
            onClick={openClosureDialog}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white"
            size={isMobile ? "sm" : "default"}>
            <Lock className="w-4 h-4 mr-2" />
            Effectuer la clôture
          </Button>
        </div>
      );
    }

    // Sinon, afficher pourquoi on ne peut pas clôturer
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-5 h-5" />
          <span className={`${isMobile ? "text-sm" : "text-base"} font-medium`}>
            Clôture impossible
          </span>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
          <p className={`${isMobile ? "text-xs" : "text-sm"} text-amber-900 dark:text-amber-200`}>
            {checkReason}
          </p>
          {commandesCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {commandesCount} commande(s) trouvée(s)
            </p>
          )}
        </div>

        <Button
          onClick={checkClosureStatus}
          variant="outline"
          size={isMobile ? "sm" : "default"}
          className="w-full">
          Vérifier à nouveau
        </Button>
      </div>
    );
  };

  return (
    <>
      <Card className="border-rose-200 dark:border-rose-900 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30">
        <CardHeader className={isMobile ? "pb-2 px-4 pt-4" : "pb-3"}>
          <div className="flex items-center justify-between">
            <CardTitle
              className={`${isMobile ? "text-base" : "text-lg"} font-semibold text-foreground`}>
              Clôture
            </CardTitle>
            <div className="bg-rose-100 dark:bg-rose-900/50 p-2 rounded-lg">
              <ClipboardCheck
                className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} text-rose-600 dark:text-rose-400`}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className={isMobile ? "px-4 pb-4" : ""}>{renderContent()}</CardContent>
      </Card>

      {/* Dialog de clôture */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-rose-600" />
              Clôture de la journée
            </DialogTitle>
            <DialogDescription>
              {new Date(today).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Prévisualisation des métriques */}
            {previewing ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Calcul des métriques...
                </span>
              </div>
            ) : metrics ? (
              <div className="space-y-4">
                {/* Métriques principales */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1">Ventes totales</p>
                    <p className="text-2xl font-bold text-foreground">
                      {metrics.nombre_ventes_total}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1">Chiffre d'affaires</p>
                    <p className="text-2xl font-bold text-foreground">
                      {metrics.chiffre_affaires.toLocaleString("fr-FR")} F
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1">Panier moyen</p>
                    <p className="text-2xl font-bold text-foreground">
                      {metrics.panier_moyen.toLocaleString("fr-FR")} F
                    </p>
                  </div>
                </div>

                {/* Détails */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-background rounded-lg border">
                    <p className="text-muted-foreground mb-1">Horaires</p>
                    <p className="font-medium">
                      {metrics.ouverture} - {metrics.fermeture}
                    </p>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <p className="text-muted-foreground mb-1">Cadence</p>
                    <p className="font-medium">{metrics.cadence_vente.toFixed(1)} ventes/h</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <p className="text-muted-foreground mb-1">Meilleur produit</p>
                    <p className="font-medium truncate">
                      {metrics.meilleur_produit_nom || "N/A"} (×{metrics.meilleur_produit_quantite}
                      )
                    </p>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <p className="text-muted-foreground mb-1">Meilleur vendeur</p>
                    <p className="font-medium truncate">
                      {metrics.meilleur_vendeur_nom || "N/A"} ({metrics.meilleur_vendeur_ventes}{" "}
                      ventes)
                    </p>
                  </div>
                </div>

                {/* Paiements */}
                <div className="p-4 bg-background rounded-lg border">
                  <p className="text-sm font-medium mb-3">Répartition des paiements</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">MoMo</span>
                      <span className="font-medium">
                        {metrics.montant_percu_momo.toLocaleString("fr-FR")} F (×
                        {metrics.nombre_paiements_momo})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Cash</span>
                      <span className="font-medium">
                        {metrics.montant_percu_cash.toLocaleString("fr-FR")} F (×
                        {metrics.nombre_paiements_cash})
                      </span>
                    </div>
                    {metrics.montant_percu_autre > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Autre</span>
                        <span className="font-medium">
                          {metrics.montant_percu_autre.toLocaleString("fr-FR")} F (×
                          {metrics.nombre_paiements_autre})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Analyse par rapport aux objectifs comptables */}
                {comptaPrevisions && (
                  <div
                    className={`p-4 rounded-lg border ${
                      metrics.chiffre_affaires >= comptaPrevisions.previsions.ca_journalier
                        ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                        : "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900"
                    }`}>
                    <p className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Performance vs Objectifs
                    </p>
                    <div className="space-y-2">
                      {/* CA vs Objectif */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">CA du jour</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              metrics.chiffre_affaires >= comptaPrevisions.previsions.ca_journalier
                                ? "text-green-600"
                                : "text-orange-600"
                            }`}>
                            {metrics.chiffre_affaires.toLocaleString("fr-FR")} F
                          </span>
                          <span className="text-xs text-muted-foreground">
                            / {comptaPrevisions.previsions.ca_journalier.toLocaleString("fr-FR")} F
                          </span>
                        </div>
                      </div>

                      {/* Progression */}
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            metrics.chiffre_affaires >= comptaPrevisions.previsions.ca_journalier
                              ? "bg-green-600"
                              : metrics.chiffre_affaires >=
                                comptaPrevisions.previsions.ca_journalier * 0.7
                              ? "bg-orange-500"
                              : "bg-red-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              (metrics.chiffre_affaires /
                                comptaPrevisions.previsions.ca_journalier) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {metrics.chiffre_affaires >= comptaPrevisions.previsions.ca_journalier ? (
                          <span className="text-green-600">
                            Objectif atteint (+
                            {(
                              metrics.chiffre_affaires - comptaPrevisions.previsions.ca_journalier
                            ).toLocaleString("fr-FR")}{" "}
                            F)
                          </span>
                        ) : (
                          <span className="text-orange-600">
                            Il manque{" "}
                            {(
                              comptaPrevisions.previsions.ca_journalier - metrics.chiffre_affaires
                            ).toLocaleString("fr-FR")}{" "}
                            F pour atteindre l'objectif
                          </span>
                        )}
                      </p>

                      {/* Info minimum */}
                      <p className="text-[10px] text-muted-foreground pt-1 border-t">
                        Objectif basé sur l'historique des encaissements (min:{" "}
                        {REGLES_PREVISIONS.CA_MINIMUM_JOUR.toLocaleString("fr-FR")} F/jour)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Cliquez sur "Prévisualiser" pour voir les métriques</p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optionnel)</label>
              <Textarea
                placeholder="Ajoutez des observations sur cette journée..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
            {!metrics && (
              <Button onClick={handlePreview} disabled={previewing}>
                {previewing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                Prévisualiser
              </Button>
            )}
            <Button
              onClick={handleClosure}
              disabled={!metrics || submitting}
              className="bg-rose-600 hover:bg-rose-700">
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Clôturer la journée
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClotureWidget;
