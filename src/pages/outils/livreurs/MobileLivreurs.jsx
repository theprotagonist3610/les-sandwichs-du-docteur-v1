import { useState, useEffect } from "react";
import useBreakpoint from "@/hooks/useBreakpoint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import useLivreursLocal from "@/hooks/useLivreursLocal";
import useLivreursSync from "@/hooks/useLivreursSync";
import LivreurForm from "@/components/livreur/LivreurForm";
import LivreurList from "@/components/livreur/LivreurList";
import LivreurStats from "@/components/livreur/LivreurStats";
import {
  Plus,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

const MobileLivreurs = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  // Hooks locaux et sync
  const {
    livreurs,
    stats,
    refresh,
    createLivreur,
    updateLivreur,
    deleteLivreur,
  } = useLivreursLocal();

  const {
    online,
    isSyncing,
    syncFull,
    addToQueue,
  } = useLivreursSync({
    autoStart: true,
    enableAutoSync: true,
    syncInterval: 60000, // 1 minute
  });

  // États locaux
  const [showForm, setShowForm] = useState(false);
  const [currentLivreur, setCurrentLivreur] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  // Créer un nouveau livreur
  const handleCreate = async (livreurData) => {
    setFormLoading(true);
    try {
      const { success, livreur, error } = await createLivreur(livreurData);

      if (success) {
        // Ajouter à la queue de sync
        if (online) {
          await addToQueue({
            type: "create",
            entity_id: livreur.id,
            data: livreur,
          });
        }

        toast.success("Livreur créé", {
          description: `${livreur.denomination} a été ajouté avec succès.`,
        });

        setShowForm(false);
        await refresh();
      } else {
        throw new Error(error || "Erreur lors de la création");
      }
    } catch (err) {
      toast.error("Erreur", {
        description: err.message,
      });
    } finally {
      setFormLoading(false);
    }
  };

  // Modifier un livreur
  const handleUpdate = async (livreurData) => {
    setFormLoading(true);
    try {
      const { success, livreur, error } = await updateLivreur(
        currentLivreur.id,
        livreurData
      );

      if (success) {
        // Ajouter à la queue de sync
        if (online) {
          await addToQueue({
            type: "update",
            entity_id: livreur.id,
            data: livreurData,
          });
        }

        toast.success("Livreur modifié", {
          description: `${livreur.denomination} a été mis à jour.`,
        });

        setShowForm(false);
        setCurrentLivreur(null);
        await refresh();
      } else {
        throw new Error(error || "Erreur lors de la modification");
      }
    } catch (err) {
      toast.error("Erreur", {
        description: err.message,
      });
    } finally {
      setFormLoading(false);
    }
  };

  // Supprimer un livreur
  const handleDelete = async (livreurId) => {
    try {
      const { success, error } = await deleteLivreur(livreurId);

      if (success) {
        // Ajouter à la queue de sync
        if (online) {
          await addToQueue({
            type: "delete",
            entity_id: livreurId,
            data: null,
          });
        }

        toast.success("Livreur supprimé", {
          description: "Le livreur a été supprimé définitivement.",
        });

        await refresh();
      } else {
        throw new Error(error || "Erreur lors de la suppression");
      }
    } catch (err) {
      toast.error("Erreur", {
        description: err.message,
      });
    }
  };

  // Activer/Désactiver un livreur
  const handleToggleActive = async (livreurId, newStatus) => {
    try {
      const { success, error } = await updateLivreur(livreurId, {
        is_active: newStatus,
      });

      if (success) {
        // Ajouter à la queue de sync
        if (online) {
          await addToQueue({
            type: "update",
            entity_id: livreurId,
            data: { is_active: newStatus },
          });
        }

        toast.success(newStatus ? "Livreur activé" : "Livreur désactivé", {
          description: "Le statut a été modifié avec succès.",
        });

        await refresh();
      } else {
        throw new Error(error || "Erreur lors de la modification");
      }
    } catch (err) {
      toast.error("Erreur", {
        description: err.message,
      });
    }
  };

  // Ouvrir le formulaire d'édition
  const handleEdit = (livreur) => {
    setCurrentLivreur(livreur);
    setShowForm(true);
  };

  // Synchronisation manuelle
  const handleSync = async () => {
    const result = await syncFull();
    if (result.success) {
      toast.success("Synchronisation réussie", {
        description: `${result.pullCount || 0} livreur(s) synchronisé(s).`,
      });
      await refresh();
    } else {
      toast.error("Erreur de synchronisation", {
        description: result.error,
      });
    }
  };

  return (
    <div
      className="min-h-screen space-y-4"
      style={{ display: visible ? "block" : "none" }}
    >
      <div className="space-y-4 p-4 pb-20">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Livreurs</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gérez vos livreurs
              </p>
            </div>

            <Badge variant={online ? "default" : "secondary"} className="gap-1.5">
              {online ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span className="text-xs">En ligne</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span className="text-xs">Hors ligne</span>
                </>
              )}
            </Badge>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={!online || isSyncing}
              className="flex-1 gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`}
              />
              <span className="text-xs">
                {isSyncing ? "Sync..." : "Synchroniser"}
              </span>
            </Button>

            <Button onClick={() => setShowForm(true)} size="sm" className="flex-1 gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span className="text-xs">Nouveau</span>
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <LivreurStats stats={stats} isMobile />

        {/* Recherche */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Recherche</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Liste des livreurs */}
        <LivreurList
          livreurs={livreurs}
          searchTerm={searchTerm}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          itemsPerPage={10}
          isMobile
        />

        {/* Formulaire */}
        <LivreurForm
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setCurrentLivreur(null);
          }}
          onSubmit={currentLivreur ? handleUpdate : handleCreate}
          livreur={currentLivreur}
          isLoading={formLoading}
          isMobile
        />
      </div>
    </div>
  );
};

export default MobileLivreurs;
