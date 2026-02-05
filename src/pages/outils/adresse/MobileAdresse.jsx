import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useBreakpoint from "@/hooks/useBreakpoint";
import useAdressesLocal from "@/hooks/useAdressesLocal";
import useAdressesSync from "@/hooks/useAdressesSync";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  RefreshCw,
  Download,
  Upload,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import FindAdresse from "@/components/adresse/FindAdresse";
import InitializeAdresses from "@/components/adresse/InitializeAdresses";
import AdresseForm from "@/components/adresse/AdresseForm";
import AdresseList from "@/components/adresse/AdresseList";
import AdresseStats from "@/components/adresse/AdresseStats";
import { searchAdresses, getAdressesByProximity } from "@/utils/adresseToolkit";
import { toast } from "sonner";

const MobileAdresse = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Hooks de gestion locale et synchronisation
  const local = useAdressesLocal();
  const sync = useAdressesSync({ autoStart: true, enableAutoSync: true });

  // États UI
  const [showForm, setShowForm] = useState(false);
  const [editingAdresse, setEditingAdresse] = useState(null);
  const [filteredAdresses, setFilteredAdresses] = useState([]);

  // État pour le retour vers la commande
  const returnStateRef = useRef(location.state);

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  // Ouvrir automatiquement le dialog de création si demandé via navigation
  useEffect(() => {
    if (location.state?.openCreateDialog) {
      setShowForm(true);
      // Nettoyer le state pour éviter de rouvrir le dialog lors d'un refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.openCreateDialog]);

  // Initialiser les adresses filtrées
  useEffect(() => {
    setFilteredAdresses(local.adresses);
  }, [local.adresses]);

  // Vérifier si la table est vide pour afficher l'initialisation
  const shouldShowInitialize = !local.isLoading && local.adresses.length === 0;

  // Gérer la recherche
  const handleSearch = async (searchParams) => {
    try {
      let results = [];

      // Recherche par proximité
      if (searchParams.proximity) {
        const { adresses } = await getAdressesByProximity(
          searchParams.proximity.lat,
          searchParams.proximity.lng,
          searchParams.proximity.radius
        );
        results = adresses;
      }
      // Recherche textuelle
      else if (searchParams.searchTerm) {
        const { adresses } = await searchAdresses(searchParams.searchTerm);
        results = adresses;
      }
      // Filtres uniquement
      else if (Object.values(searchParams.filters).some(v => v && v !== "all")) {
        const { adresses } = await local.loadAdresses();
        results = adresses.filter(adresse => {
          const matchDept = !searchParams.filters.departement || searchParams.filters.departement === "all" ||
            adresse.departement?.toLowerCase().includes(searchParams.filters.departement.toLowerCase());
          const matchCommune = !searchParams.filters.commune || searchParams.filters.commune === "all" ||
            adresse.commune?.toLowerCase().includes(searchParams.filters.commune.toLowerCase());
          const matchArr = !searchParams.filters.arrondissement || searchParams.filters.arrondissement === "all" ||
            adresse.arrondissement?.toLowerCase().includes(searchParams.filters.arrondissement.toLowerCase());
          const matchQuartier = !searchParams.filters.quartier || searchParams.filters.quartier === "all" ||
            adresse.quartier?.toLowerCase().includes(searchParams.filters.quartier.toLowerCase());

          return matchDept && matchCommune && matchArr && matchQuartier;
        });
      }
      // Pas de filtres = tout afficher
      else {
        results = local.adresses;
      }

      setFilteredAdresses(results);
    } catch (error) {
      console.error("Erreur recherche:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue lors de la recherche",
      });
    }
  };

  // Ajouter une adresse
  const handleAdd = () => {
    setEditingAdresse(null);
    setShowForm(true);
  };

  // Modifier une adresse
  const handleEdit = (adresse) => {
    setEditingAdresse(adresse);
    setShowForm(true);
  };

  // Soumettre le formulaire
  const handleSubmit = async (data) => {
    try {
      let newAdresseId = null;

      if (editingAdresse) {
        await local.updateAdresse(editingAdresse.id, data);
        toast.success("Modifiée", {
          description: "L'adresse a été modifiée avec succès",
        });
      } else {
        const result = await local.createAdresse(data);
        if (result.success && result.id) {
          newAdresseId = result.id;
        }
        toast.success("Ajoutée", {
          description: "L'adresse a été ajoutée avec succès",
        });
      }

      // Synchroniser si en ligne et attendre la fin complète
      if (sync.online && newAdresseId) {
        toast.info("Synchronisation", {
          description: "Synchronisation avec le serveur en cours...",
        });

        // Attendre la synchronisation complète
        await sync.syncPush();

        // Attendre un peu pour que la sync soit complète côté serveur
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Si on vient d'une commande, retourner avec l'ID de la nouvelle adresse
      if (returnStateRef.current?.returnTo && newAdresseId) {
        navigate(returnStateRef.current.returnTo, {
          state: {
            newAdresseId: newAdresseId,
            commandeId: returnStateRef.current.commandeId,
          },
        });
      }
    } catch (error) {
      console.error("Erreur soumission:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue lors de l'enregistrement",
      });
    }
  };

  // Supprimer une adresse
  const handleDelete = async (adresse) => {
    try {
      await local.deleteAdresse(adresse.id);
      toast.success("Supprimée", {
        description: "L'adresse a été supprimée définitivement",
      });

      // Synchroniser si en ligne
      if (sync.online) {
        await sync.syncPush();
      }
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast.error("Erreur", {
        description: "Impossible de supprimer l'adresse",
      });
    }
  };

  // Activer/Désactiver une adresse
  const handleToggleActive = async (adresse) => {
    try {
      if (adresse.is_active) {
        await local.deactivateAdresse(adresse.id);
        toast.success("Désactivée", {
          description: "L'adresse a été désactivée",
        });
      } else {
        await local.activateAdresse(adresse.id);
        toast.success("Activée", {
          description: "L'adresse a été activée",
        });
      }

      // Synchroniser si en ligne
      if (sync.online) {
        await sync.syncPush();
      }
    } catch (error) {
      console.error("Erreur toggle:", error);
      toast.error("Erreur", {
        description: "Impossible de modifier le statut",
      });
    }
  };

  // Rafraîchir
  const handleRefresh = async () => {
    await local.refresh();
    await sync.syncFull();
    toast.success("Actualisé", {
      description: "Les données ont été actualisées",
    });
  };

  // Synchronisation complète
  const handleFullSync = async () => {
    if (!sync.online) {
      toast.error("Hors ligne", {
        description: "Vous devez être en ligne pour synchroniser",
      });
      return;
    }

    const result = await sync.syncFull();
    if (result.success) {
      toast.success("Synchronisé", {
        description: `${result.pullCount} téléchargées, ${result.pushProcessed} envoyées`,
      });
    }
  };

  if (!visible) return null;

  return (
    <div className="min-h-screen space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="px-4 py-4">
          <div className="space-y-3">
            <div>
              <h1 className="text-lg font-bold text-foreground">
                Gestion des Adresses
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Gérez la base de données des adresses
              </p>
            </div>

            {/* Statuts */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={sync.online ? "default" : "secondary"}
                className="gap-1.5 text-xs"
              >
                {sync.online ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    En ligne
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    Hors ligne
                  </>
                )}
              </Badge>

              {sync.queueStats && sync.queueStats.pending > 0 && (
                <Badge variant="outline" className="gap-1.5 text-xs text-orange-600">
                  <Upload className="w-3 h-3" />
                  {sync.queueStats.pending} en attente
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={local.isLoading || sync.isSyncing}
                className="flex-1 gap-2"
              >
                {local.isLoading || sync.isSyncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Actualiser
              </Button>

              {sync.online && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFullSync}
                  disabled={sync.isSyncing}
                  className="flex-1 gap-2"
                >
                  {sync.isSyncing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Sync
                </Button>
              )}

              <Button onClick={handleAdd} size="sm" className="flex-1 gap-2">
                <Plus className="w-3.5 h-3.5" />
                Ajouter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Initialisation (si table vide) */}
      {shouldShowInitialize && (
        <InitializeAdresses
          onComplete={() => {
            local.refresh();
            sync.syncPull();
          }}
          isMobile={true}
        />
      )}

      {/* Statistiques */}
      {!shouldShowInitialize && (
        <AdresseStats stats={local.stats} isMobile={true} />
      )}

      {/* Recherche */}
      {!shouldShowInitialize && (
        <FindAdresse onSearch={handleSearch} isMobile={true} />
      )}

      {/* Liste des adresses */}
      {!shouldShowInitialize && (
        <AdresseList
          adresses={filteredAdresses}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          isMobile={true}
        />
      )}

      {/* Formulaire */}
      <AdresseForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingAdresse(null);
        }}
        onSubmit={handleSubmit}
        adresse={editingAdresse}
        isMobile={true}
      />
    </div>
  );
};

export default MobileAdresse;
