import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Warehouse,
  Store,
  ShoppingCart,
  Building2,
  MapPin,
  User,
  Clock,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import emplacementToolkit from "@/utils/emplacementToolkit";
import useActiveUserStore from "@/store/activeUserStore";
import { toast } from "sonner";
import EmplacementDialog from "./EmplacementDialog";

const MobileEmplacementsData = () => {
  const { user } = useActiveUserStore();
  const [emplacements, setEmplacements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmplacement, setSelectedEmplacement] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [emplacementToDelete, setEmplacementToDelete] = useState(null);
  const canManage = emplacementToolkit.canManageEmplacements(user?.role);

  useEffect(() => {
    loadEmplacements();
  }, []);

  const loadEmplacements = async () => {
    setIsLoading(true);
    const { emplacements: data, error } =
      await emplacementToolkit.getAllEmplacements();

    if (error) {
      toast.error("Erreur", {
        description: "Impossible de charger les emplacements",
      });
    } else {
      setEmplacements(data || []);
    }
    setIsLoading(false);
  };

  const handleCreate = () => {
    setSelectedEmplacement(null);
    setDialogOpen(true);
  };

  const handleEdit = (emplacement) => {
    setSelectedEmplacement(emplacement);
    setDialogOpen(true);
  };

  const handleDeleteClick = (emplacement) => {
    setEmplacementToDelete(emplacement);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!emplacementToDelete) return;

    try {
      const { error } = await emplacementToolkit.deleteEmplacement(emplacementToDelete.id);

      if (error) throw error;

      toast.success("Succès", {
        description: "L'emplacement a été supprimé avec succès",
      });

      loadEmplacements();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur", {
        description: "Impossible de supprimer l'emplacement",
      });
    } finally {
      setDeleteDialogOpen(false);
      setEmplacementToDelete(null);
    }
  };

  const getStatutBadge = (statut) => {
    const variants = {
      actif: "default",
      inactif: "secondary",
      ferme_temporairement: "destructive",
    };

    const labels = {
      actif: "Actif",
      inactif: "Inactif",
      ferme_temporairement: "Fermé temporairement",
    };

    return (
      <Badge variant={variants[statut] || "default"}>
        {labels[statut] || statut}
      </Badge>
    );
  };

  const getTypeIcon = (type) => {
    const icons = {
      base: Warehouse,
      stand: Store,
      kiosque: ShoppingCart,
      boutique: Building2,
    };
    const Icon = icons[type] || Store;
    return <Icon className="w-5 h-5" />;
  };

  const getTypeLabel = (type) => {
    const labels = {
      base: "Base",
      stand: "Stand",
      kiosque: "Kiosque",
      boutique: "Boutique",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bouton d'ajout */}
      {canManage && (
        <Button className="w-full" size="lg" onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvel emplacement
        </Button>
      )}

      {/* Liste des emplacements */}
      {emplacements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Warehouse className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun emplacement trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {emplacements.map((emplacement) => (
            <Card key={emplacement.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {getTypeIcon(emplacement.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {emplacement.nom}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {getTypeLabel(emplacement.type)}
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(emplacement)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteClick(emplacement)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Statut */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Statut</span>
                  {getStatutBadge(emplacement.statut)}
                </div>

                {/* Adresse */}
                {emplacement.adresse && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="text-foreground">
                        {emplacement.adresse.quartier}
                        {emplacement.adresse.quartier &&
                          emplacement.adresse.commune &&
                          ", "}
                        {emplacement.adresse.commune}
                      </p>
                      {emplacement.adresse.departement && (
                        <p className="text-muted-foreground">
                          {emplacement.adresse.departement}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Responsable */}
                {emplacement.responsable && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">
                      {emplacement.responsable.prenoms}{" "}
                      {emplacement.responsable.nom}
                    </span>
                  </div>
                )}

                {/* Horaires indicatifs */}
                {emplacement.horaires?.lundi && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      {emplacement.horaires.lundi.ouverture} -{" "}
                      {emplacement.horaires.lundi.fermeture}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <EmplacementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        emplacement={selectedEmplacement}
        onSuccess={loadEmplacements}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'emplacement "{emplacementToDelete?.nom}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MobileEmplacementsData;
