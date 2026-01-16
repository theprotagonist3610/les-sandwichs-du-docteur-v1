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
  Play,
  Edit,
  Trash2,
  MoreVertical,
  Tag,
  Clock,
  Repeat,
  TrendingUp,
} from "lucide-react";

/**
 * Composant Card pour afficher un template de promotion
 */
const PromotionTemplateCard = ({
  template,
  onActivate,
  onEdit,
  onDelete,
  onViewPerformance,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Formatter le type de promotion
  const getTypeLabel = (type) => {
    const types = {
      standard: "Standard",
      flash: "Flash",
      happy_hour: "Happy Hour",
      recurrente: "Récurrente",
    };
    return types[type] || type;
  };

  // Formatter la durée
  const getDureeLabel = (valeur, unite) => {
    const unites = {
      minutes: "min",
      hours: "h",
      days: "j",
      weeks: "sem",
      months: "mois",
    };
    return `${valeur} ${unites[unite] || unite}`;
  };

  // Formatter la réduction
  const getReductionLabel = () => {
    if (template.reduction_absolue > 0) {
      return `${template.reduction_absolue.toLocaleString("fr-FR")} FCFA`;
    }
    if (template.reduction_relative > 0) {
      return `${template.reduction_relative}%`;
    }
    return "N/A";
  };

  // Déterminer la couleur du badge selon le type
  const getTypeBadgeVariant = (type) => {
    switch (type) {
      case "flash":
        return "destructive";
      case "happy_hour":
        return "default";
      case "recurrente":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleDelete = () => {
    onDelete(template.id, template.denomination);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{template.denomination}</CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {template.description || "Aucune description"}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onActivate(template)}>
                  <Play className="mr-2 h-4 w-4" />
                  Activer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(template)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
                {onViewPerformance && (
                  <DropdownMenuItem onClick={() => onViewPerformance(template.id)}>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Performance
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={getTypeBadgeVariant(template.type_promotion)}>
              {getTypeLabel(template.type_promotion)}
            </Badge>
            {template.is_recurrente && (
              <Badge variant="outline" className="gap-1">
                <Repeat className="h-3 w-3" />
                Récurrent
              </Badge>
            )}
          </div>

          {/* Réduction */}
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Réduction:</span>
            <span className="text-sm text-primary font-bold">
              {getReductionLabel()}
            </span>
          </div>

          {/* Durée */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Durée:</span>
            <span className="text-sm">
              {getDureeLabel(template.duree_valeur, template.duree_unite)}
            </span>
          </div>

          {/* Utilisation max */}
          {template.utilisation_max && (
            <div className="text-sm text-muted-foreground">
              Max: {template.utilisation_max} utilisations
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Button onClick={() => onActivate(template)} className="w-full" size="sm">
            <Play className="mr-2 h-4 w-4" />
            Activer cette promotion
          </Button>
        </CardFooter>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le template?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le template &quot;
              {template.denomination}&quot;? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PromotionTemplateCard;
