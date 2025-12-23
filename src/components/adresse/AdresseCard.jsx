import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Carte pour afficher une adresse individuelle
 */
const AdresseCard = ({
  adresse,
  onEdit,
  onDelete,
  onToggleActive,
  isMobile = false,
}) => {
  const getSyncStatusIcon = (status) => {
    switch (status) {
      case "synced":
        return <CheckCircle2 className="w-3 h-3 text-green-600" />;
      case "pending":
        return <Clock className="w-3 h-3 text-orange-600" />;
      case "error":
        return <AlertCircle className="w-3 h-3 text-red-600" />;
      default:
        return <Loader2 className="w-3 h-3 animate-spin text-blue-600" />;
    }
  };

  const getSyncStatusText = (status) => {
    switch (status) {
      case "synced":
        return "Synchronisée";
      case "pending":
        return "En attente";
      case "error":
        return "Erreur sync";
      default:
        return "Inconnue";
    }
  };

  const getSyncStatusColor = (status) => {
    switch (status) {
      case "synced":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  return (
    <Card className={`transition-all hover:shadow-md ${!adresse.is_active ? "opacity-60" : ""}`}>
      <CardContent className={isMobile ? "p-3" : "p-4"}>
        <div className="space-y-3">
          {/* En-tête avec badges */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-foreground truncate ${isMobile ? "text-sm" : "text-base"}`}>
                {adresse.quartier}
              </h3>
              <p className={`text-muted-foreground ${isMobile ? "text-xs" : "text-sm"}`}>
                {adresse.arrondissement}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              {/* Statut actif/inactif */}
              <Badge
                variant={adresse.is_active ? "default" : "secondary"}
                className={isMobile ? "text-[10px] px-1.5 py-0.5" : "text-xs"}
              >
                {adresse.is_active ? "Actif" : "Inactif"}
              </Badge>

              {/* Statut de synchronisation */}
              {adresse.sync_status && (
                <Badge
                  variant="outline"
                  className={`${getSyncStatusColor(adresse.sync_status)} ${isMobile ? "text-[10px] px-1.5 py-0.5" : "text-xs"}`}
                >
                  <span className="flex items-center gap-1">
                    {getSyncStatusIcon(adresse.sync_status)}
                    {!isMobile && getSyncStatusText(adresse.sync_status)}
                  </span>
                </Badge>
              )}
            </div>
          </div>

          {/* Informations géographiques */}
          <div className={`space-y-1 ${isMobile ? "text-xs" : "text-sm"}`}>
            <div className="flex items-center text-muted-foreground">
              <span className="font-medium min-w-[90px]">Commune:</span>
              <span>{adresse.commune}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <span className="font-medium min-w-[90px]">Département:</span>
              <span>{adresse.departement}</span>
            </div>
          </div>

          {/* Coordonnées GPS */}
          {adresse.localisation && (
            <div className={`flex items-center gap-2 p-2 bg-muted/50 rounded ${isMobile ? "text-xs" : "text-sm"}`}>
              <MapPin className={`text-primary ${isMobile ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
              <span className="font-mono text-muted-foreground">
                {adresse.localisation.lat.toFixed(6)}, {adresse.localisation.lng.toFixed(6)}
              </span>
            </div>
          )}

          {/* Distance (si disponible) */}
          {adresse.distance !== undefined && (
            <div className={`flex items-center gap-2 text-blue-600 dark:text-blue-400 ${isMobile ? "text-xs" : "text-sm"}`}>
              <MapPin className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
              <span className="font-medium">
                À {adresse.distance.toFixed(2)} km
              </span>
            </div>
          )}

          {/* Actions */}
          <div className={`flex items-center gap-2 pt-2 border-t ${isMobile ? "" : ""}`}>
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              onClick={() => onEdit(adresse)}
              className="flex-1 gap-2"
            >
              <Edit className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
              {!isMobile && "Modifier"}
            </Button>

            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              onClick={() => onToggleActive(adresse)}
              className={`flex-1 gap-2 ${adresse.is_active ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}`}
            >
              {adresse.is_active ? (
                <>
                  <ToggleLeft className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                  {!isMobile && "Désactiver"}
                </>
              ) : (
                <>
                  <ToggleRight className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                  {!isMobile && "Activer"}
                </>
              )}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  className={`gap-2 text-red-600 hover:text-red-700 ${isMobile ? "px-2" : ""}`}
                >
                  <Trash2 className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                  {!isMobile && "Supprimer"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className={isMobile ? "max-w-[90vw]" : ""}>
                <AlertDialogHeader>
                  <AlertDialogTitle className={isMobile ? "text-base" : ""}>
                    Confirmer la suppression
                  </AlertDialogTitle>
                  <AlertDialogDescription className={isMobile ? "text-xs" : "text-sm"}>
                    Êtes-vous sûr de vouloir supprimer définitivement cette adresse ?
                    <br />
                    <br />
                    <strong>{adresse.quartier}, {adresse.arrondissement}</strong>
                    <br />
                    {adresse.commune}, {adresse.departement}
                    <br />
                    <br />
                    Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className={isMobile ? "flex-col gap-2" : ""}>
                  <AlertDialogCancel className={isMobile ? "w-full" : ""}>
                    Annuler
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(adresse)}
                    className={`bg-red-600 hover:bg-red-700 ${isMobile ? "w-full" : ""}`}
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdresseCard;
