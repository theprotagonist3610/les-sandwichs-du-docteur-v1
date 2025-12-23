import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Warehouse,
  Store,
  ShoppingCart,
  Building2,
  MapPin,
  User,
  Clock,
  Plus,
  MoreHorizontal,
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

const DesktopEmplacementsData = () => {
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

  const getTypeLabel = (type) => {
    const labels = {
      base: "Base",
      stand: "Stand",
      kiosque: "Kiosque",
      boutique: "Boutique",
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type) => {
    const icons = {
      base: Warehouse,
      stand: Store,
      kiosque: ShoppingCart,
      boutique: Building2,
    };
    return icons[type] || Store;
  };

  const getTypeColor = (type) => {
    const colors = {
      base: "text-blue-600 dark:text-blue-400",
      stand: "text-green-600 dark:text-green-400",
      kiosque: "text-amber-600 dark:text-amber-400",
      boutique: "text-purple-600 dark:text-purple-400",
    };
    return colors[type] || "text-gray-600";
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
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {emplacements.length} emplacement(s) trouvé(s)
          </p>
        </div>
        {canManage && (
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvel emplacement
          </Button>
        )}
      </div>

      {/* Table */}
      {emplacements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-card">
          <Warehouse className="w-16 h-16 mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Aucun emplacement trouvé</p>
          {canManage && (
            <Button variant="outline" onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Créer le premier emplacement
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Horaires</TableHead>
                <TableHead>Statut</TableHead>
                {canManage && <TableHead className="w-[70px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {emplacements.map((emplacement) => {
                const TypeIcon = getTypeIcon(emplacement.type);
                return (
                  <TableRow key={emplacement.id} className="hover:bg-accent/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-primary/10`}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <span>{emplacement.nom}</span>
                      </div>
                    </TableCell>
                  <TableCell>
                    <span className={`font-medium ${getTypeColor(emplacement.type)}`}>
                      {getTypeLabel(emplacement.type)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {emplacement.adresse && (
                      <div className="text-sm">
                        <div>
                          {emplacement.adresse.quartier}
                          {emplacement.adresse.quartier &&
                            emplacement.adresse.commune &&
                            ", "}
                          {emplacement.adresse.commune}
                        </div>
                        {emplacement.adresse.departement && (
                          <div className="text-muted-foreground">
                            {emplacement.adresse.departement}
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {emplacement.responsable ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm">
                          {emplacement.responsable.prenoms}{" "}
                          {emplacement.responsable.nom}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Non assigné
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {emplacement.horaires?.lundi ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>
                          {emplacement.horaires.lundi.ouverture} -{" "}
                          {emplacement.horaires.lundi.fermeture}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatutBadge(emplacement.statut)}</TableCell>
                  {canManage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
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
                    </TableCell>
                  )}
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
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

export default DesktopEmplacementsData;
