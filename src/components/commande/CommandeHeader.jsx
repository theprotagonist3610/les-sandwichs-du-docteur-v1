import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Undo2,
  Redo2,
  Truck,
  CheckCheck,
  History,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Header de la page d'édition de commande
 * Affiche le titre, les badges de statut et les actions principales
 */
const CommandeHeader = ({
  commande,
  isDirty,
  isSaving,
  canEdit,
  canDeliver,
  canClose,
  canUndo,
  canRedo,
  onSave,
  onCancel,
  onGoBack,
  onUndo,
  onRedo,
  onDeliver,
  onClose,
  onDeliverAndClose,
  onShowHistory,
  isMobile = false,
}) => {
  if (!commande) return null;

  // ============================================================================
  // BADGES DE STATUT
  // ============================================================================

  const getStatutCommandeBadge = () => {
    const variants = {
      en_cours: { variant: "default", label: "En cours" },
      terminee: { variant: "success", label: "Terminée" },
      annulee: { variant: "destructive", label: "Annulée" },
    };
    const config = variants[commande.statut_commande] || {
      variant: "secondary",
      label: commande.statut_commande,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatutLivraisonBadge = () => {
    if (!commande.statut_livraison) return null;

    const classes = {
      en_attente: "bg-amber-500",
      en_cours: "bg-blue-500",
      livree: "bg-emerald-500",
      annulee: "bg-red-500",
    };
    const labels = {
      en_attente: "En attente",
      en_cours: "En cours",
      livree: "Livrée",
      annulee: "Annulée",
    };

    return (
      <Badge className={classes[commande.statut_livraison]}>
        {labels[commande.statut_livraison] || commande.statut_livraison}
      </Badge>
    );
  };

  const getStatutPaiementBadge = () => {
    const classes = {
      non_payee: "bg-red-500",
      partiellement_payee: "bg-amber-500",
      payee: "bg-emerald-500",
    };
    const labels = {
      non_payee: "Non payée",
      partiellement_payee: "Partielle",
      payee: "Payée",
    };

    return (
      <Badge className={classes[commande.statut_paiement]}>
        {labels[commande.statut_paiement] || commande.statut_paiement}
      </Badge>
    );
  };

  // ============================================================================
  // RENDU MOBILE
  // ============================================================================

  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background border-b px-4 py-3">
        {/* Ligne 1: Navigation et titre */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onGoBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-sm">
                Commande #{commande.id?.slice(-6).toUpperCase()}
              </h1>
              <p className="text-xs text-muted-foreground">{commande.client}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canUndo && (
                <DropdownMenuItem onClick={onUndo}>
                  <Undo2 className="h-4 w-4 mr-2" />
                  Annuler
                </DropdownMenuItem>
              )}
              {canRedo && (
                <DropdownMenuItem onClick={onRedo}>
                  <Redo2 className="h-4 w-4 mr-2" />
                  Rétablir
                </DropdownMenuItem>
              )}
              {(canUndo || canRedo) && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={onShowHistory}>
                <History className="h-4 w-4 mr-2" />
                Historique
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Ligne 2: Badges */}
        <div className="flex items-center gap-2 mb-3">
          {getStatutCommandeBadge()}
          {getStatutLivraisonBadge()}
          {getStatutPaiementBadge()}
          {isDirty && (
            <Badge variant="outline" className="text-amber-600 border-amber-400">
              Modifié
            </Badge>
          )}
        </div>

        {/* Ligne 3: Boutons Livrer/Clôturer */}
        {(canDeliver || canClose) && (
          <div className="flex gap-2 mb-3">
            {canDeliver && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDeliver}
                className="flex-1">
                <Truck className="h-4 w-4 mr-1" />
                Livrer
              </Button>
            )}
            {canClose && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="flex-1">
                <CheckCheck className="h-4 w-4 mr-1" />
                Clôturer
              </Button>
            )}
            {canDeliver && canClose && (
              <Button
                variant="default"
                size="sm"
                onClick={onDeliverAndClose}
                className="flex-1">
                <CheckCheck className="h-4 w-4 mr-1" />
                Livrer & Clôturer
              </Button>
            )}
          </div>
        )}

        {/* Ligne 4: Actions Sauvegarder/Annuler */}
        {canEdit && isDirty && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="flex-1">
              <RotateCcw className="h-4 w-4 mr-1" />
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="flex-1">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Sauvegarder
            </Button>
          </div>
        )}
      </motion.div>
    );
  }

  // ============================================================================
  // RENDU DESKTOP
  // ============================================================================

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background border-b px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Gauche: Navigation et titre */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onGoBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">
                Commande #{commande.id?.slice(-6).toUpperCase()}
              </h1>
              {getStatutCommandeBadge()}
              {getStatutLivraisonBadge()}
              {getStatutPaiementBadge()}
              {isDirty && (
                <Badge
                  variant="outline"
                  className="text-amber-600 border-amber-400">
                  Modifications non sauvegardées
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Client: {commande.client} • Créée le{" "}
              {new Date(commande.created_at).toLocaleDateString("fr-FR")} à{" "}
              {new Date(commande.created_at).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {/* Droite: Actions */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
              className="rounded-r-none">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
              className="rounded-l-none border-l">
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Historique */}
          <Button variant="outline" size="sm" onClick={onShowHistory}>
            <History className="h-4 w-4 mr-2" />
            Historique
          </Button>

          {/* Actions de livraison */}
          {canDeliver && (
            <Button variant="outline" size="sm" onClick={onDeliver}>
              <Truck className="h-4 w-4 mr-2" />
              Marquer livrée
            </Button>
          )}

          {canClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Clôturer
            </Button>
          )}

          {(canDeliver || canClose) && (
            <Button variant="default" size="sm" onClick={onDeliverAndClose}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Livrer et clôturer
            </Button>
          )}

          {/* Annuler / Sauvegarder */}
          {canEdit && isDirty && (
            <>
              <Button variant="outline" size="sm" onClick={onCancel}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button size="sm" onClick={onSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Sauvegarder
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CommandeHeader;
