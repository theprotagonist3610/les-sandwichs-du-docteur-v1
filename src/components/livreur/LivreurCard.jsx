import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { User, Phone, Calendar, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { usePreferencesSettingsStore } from "@/store/preferencesSettingsStore";

/**
 * Composant carte pour afficher un livreur
 * @param {Object} props
 * @param {Object} props.livreur - Objet livreur
 * @param {Function} props.onEdit - Callback pour éditer
 * @param {Function} props.onDelete - Callback pour supprimer
 * @param {Function} props.onToggleActive - Callback pour activer/désactiver
 * @param {boolean} props.isMobile - Mode mobile
 */
const LivreurCard = ({
  livreur,
  onEdit,
  onDelete,
  onToggleActive,
  isMobile = false,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showToggleDialog, setShowToggleDialog] = useState(false);
  const formatDateOnly = usePreferencesSettingsStore((state) => state.formatDateOnly);

  // Gérer la suppression
  const handleDelete = () => {
    onDelete(livreur.id);
    setShowDeleteDialog(false);
  };

  // Gérer le changement d'état actif
  const handleToggleActive = () => {
    onToggleActive(livreur.id, !livreur.is_active);
    setShowToggleDialog(false);
  };

  return (
    <>
      <Card
        className={`${
          !livreur.is_active ? "opacity-60 bg-muted/50" : ""
        } hover:shadow-md transition-shadow`}
      >
        <CardHeader className={isMobile ? "p-4 pb-2" : "p-6 pb-4"}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3
                  className={`font-semibold truncate ${
                    isMobile ? "text-base" : "text-lg"
                  }`}
                >
                  {livreur.denomination}
                </h3>
                <Badge
                  variant={livreur.is_active ? "default" : "secondary"}
                  className={isMobile ? "text-xs px-2 py-0.5" : ""}
                >
                  {livreur.is_active ? "Actif" : "Inactif"}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className={isMobile ? "p-4 pt-0" : "px-6 pb-4"}>
          <div className="space-y-2">
            {/* Contact */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
              <span className={isMobile ? "text-xs" : "text-sm"}>
                {livreur.contact}
              </span>
            </div>

            {/* Dates */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
              <span className={isMobile ? "text-xs" : "text-sm"}>
                Créé le {formatDateOnly(livreur.created_at)}
              </span>
            </div>

            {livreur.updated_at !== livreur.created_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                <span className={isMobile ? "text-xs" : "text-sm"}>
                  Modifié le {formatDateOnly(livreur.updated_at)}
                </span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter
          className={`${
            isMobile ? "p-4 pt-2 gap-2" : "px-6 pb-4 gap-3"
          } flex-wrap`}
        >
          {/* Bouton Modifier */}
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={() => onEdit(livreur)}
            className="flex-1 gap-2"
          >
            <Edit className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
            Modifier
          </Button>

          {/* Bouton Activer/Désactiver */}
          <Button
            variant={livreur.is_active ? "secondary" : "default"}
            size={isMobile ? "sm" : "default"}
            onClick={() => setShowToggleDialog(true)}
            className="flex-1 gap-2"
          >
            {livreur.is_active ? (
              <>
                <ToggleLeft className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                Désactiver
              </>
            ) : (
              <>
                <ToggleRight className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                Activer
              </>
            )}
          </Button>

          {/* Bouton Supprimer */}
          <Button
            variant="destructive"
            size={isMobile ? "sm" : "default"}
            onClick={() => setShowDeleteDialog(true)}
            className="gap-2"
          >
            <Trash2 className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
            {!isMobile && "Supprimer"}
          </Button>
        </CardFooter>
      </Card>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className={isMobile ? "w-[95vw] max-w-md" : ""}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isMobile ? "text-base" : ""}>
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription className={isMobile ? "text-xs" : ""}>
              Êtes-vous sûr de vouloir supprimer définitivement le livreur{" "}
              <strong>{livreur.denomination}</strong> ? Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isMobile ? "gap-2" : ""}>
            <AlertDialogCancel size={isMobile ? "sm" : "default"}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              size={isMobile ? "sm" : "default"}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmation de changement d'état */}
      <AlertDialog open={showToggleDialog} onOpenChange={setShowToggleDialog}>
        <AlertDialogContent className={isMobile ? "w-[95vw] max-w-md" : ""}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isMobile ? "text-base" : ""}>
              {livreur.is_active ? "Désactiver" : "Activer"} le livreur
            </AlertDialogTitle>
            <AlertDialogDescription className={isMobile ? "text-xs" : ""}>
              {livreur.is_active ? (
                <>
                  Le livreur <strong>{livreur.denomination}</strong> sera
                  désactivé et ne sera plus visible par défaut dans les listes.
                </>
              ) : (
                <>
                  Le livreur <strong>{livreur.denomination}</strong> sera activé
                  et redeviendra visible dans les listes.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isMobile ? "gap-2" : ""}>
            <AlertDialogCancel size={isMobile ? "sm" : "default"}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              size={isMobile ? "sm" : "default"}
            >
              {livreur.is_active ? "Désactiver" : "Activer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LivreurCard;
