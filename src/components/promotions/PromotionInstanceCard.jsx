import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pause,
  Play,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Tag,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  ShoppingCart,
} from "lucide-react";
import { format, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Composant Card pour afficher une instance de promotion active
 */
const PromotionInstanceCard = ({
  instance,
  onPause,
  onResume,
  onComplete,
  onCancel,
  onViewStats,
}) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Formatter le statut
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: "Active", variant: "default" },
      paused: { label: "En pause", variant: "secondary" },
      completed: { label: "Terminée", variant: "outline" },
      cancelled: { label: "Annulée", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Calculer le temps restant
  const getTimeRemaining = () => {
    const now = new Date();
    const end = new Date(instance.date_fin);

    if (now >= end) {
      return "Expirée";
    }

    const days = differenceInDays(end, now);
    const hours = differenceInHours(end, now) % 24;
    const minutes = differenceInMinutes(end, now) % 60;

    if (days > 0) {
      return `${days}j ${hours}h restantes`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}min restantes`;
    } else {
      return `${minutes}min restantes`;
    }
  };

  // Formatter la réduction
  const getReductionLabel = () => {
    if (instance.reduction_absolue > 0) {
      return `${instance.reduction_absolue.toLocaleString("fr-FR")} FCFA`;
    }
    if (instance.reduction_relative > 0) {
      return `${instance.reduction_relative}%`;
    }
    return "N/A";
  };

  // Calculer le taux d'utilisation
  const getUsagePercentage = () => {
    if (!instance.utilisation_max) return null;
    return ((instance.utilisation_count / instance.utilisation_max) * 100).toFixed(0);
  };

  const handleCancel = () => {
    onCancel(instance.id, instance.denomination, cancelReason || null);
    setShowCancelDialog(false);
    setCancelReason("");
  };

  const isActive = instance.status === "active";
  const isPaused = instance.status === "paused";

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg">{instance.denomination}</CardTitle>
                {getStatusBadge(instance.status)}
              </div>
              {instance.code_promo && (
                <div className="flex items-center gap-2 mt-2">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {instance.code_promo}
                  </code>
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isActive && (
                  <DropdownMenuItem
                    onClick={() => onPause(instance.id, instance.denomination)}>
                    <Pause className="mr-2 h-4 w-4" />
                    Mettre en pause
                  </DropdownMenuItem>
                )}
                {isPaused && (
                  <DropdownMenuItem
                    onClick={() => onResume(instance.id, instance.denomination)}>
                    <Play className="mr-2 h-4 w-4" />
                    Reprendre
                  </DropdownMenuItem>
                )}
                {(isActive || isPaused) && (
                  <DropdownMenuItem
                    onClick={() => onComplete(instance.id, instance.denomination)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Terminer
                  </DropdownMenuItem>
                )}
                {onViewStats && (
                  <DropdownMenuItem onClick={() => onViewStats(instance.id)}>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Statistiques
                  </DropdownMenuItem>
                )}
                {(isActive || isPaused) && <DropdownMenuSeparator />}
                {(isActive || isPaused) && (
                  <DropdownMenuItem
                    onClick={() => setShowCancelDialog(true)}
                    className="text-destructive">
                    <XCircle className="mr-2 h-4 w-4" />
                    Annuler
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Réduction */}
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Réduction:</span>
            <span className="text-sm text-primary font-bold">
              {getReductionLabel()}
            </span>
          </div>

          {/* Période */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Période:</span>
            </div>
            <div className="text-xs text-muted-foreground pl-6">
              Du {format(new Date(instance.date_debut), "dd MMM yyyy HH:mm", { locale: fr })}
              <br />
              Au {format(new Date(instance.date_fin), "dd MMM yyyy HH:mm", { locale: fr })}
            </div>
            {isActive && (
              <div className="text-sm font-medium text-orange-600 pl-6">
                {getTimeRemaining()}
              </div>
            )}
          </div>

          {/* Métriques */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="text-lg font-bold">{instance.utilisation_count}</div>
              <div className="text-xs text-muted-foreground">
                {instance.utilisation_max ? `/ ${instance.utilisation_max}` : "utilisations"}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ShoppingCart className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="text-lg font-bold">{instance.nombre_commandes}</div>
              <div className="text-xs text-muted-foreground">commandes</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="text-lg font-bold">
                {Math.round(instance.revenu_genere).toLocaleString("fr-FR")}
              </div>
              <div className="text-xs text-muted-foreground">FCFA</div>
            </div>
          </div>

          {/* Barre de progression */}
          {getUsagePercentage() !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Utilisation</span>
                <span>{getUsagePercentage()}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${getUsagePercentage()}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>

        {(isActive || isPaused) && (
          <CardFooter className="gap-2">
            {isActive && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onPause(instance.id, instance.denomination)}>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            )}
            {isPaused && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onResume(instance.id, instance.denomination)}>
                <Play className="mr-2 h-4 w-4" />
                Reprendre
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => onComplete(instance.id, instance.denomination)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Terminer
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la promotion?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir annuler la promotion &quot;{instance.denomination}
              &quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Raison (optionnel)</label>
            <textarea
              className="w-full mt-2 p-2 border rounded-md text-sm"
              rows={3}
              placeholder="Pourquoi annulez-vous cette promotion?"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive">
              Annuler la promotion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PromotionInstanceCard;
