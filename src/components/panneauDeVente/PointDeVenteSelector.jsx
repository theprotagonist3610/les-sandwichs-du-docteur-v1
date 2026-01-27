import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Store, MapPin } from "lucide-react";
import { getEmplacementsAccessibles } from "@/utils/emplacementToolkit";
import useActiveUserStore from "@/store/activeUserStore";
import usePointDeVenteStore from "@/store/pointDeVenteStore";
import { toast } from "sonner";

/**
 * Composant de sélection du point de vente
 * Dialog bloquant qui s'affiche si aucun point de vente n'est sélectionné
 * Peut aussi être contrôlé manuellement via les props open/onOpenChange
 */
const PointDeVenteSelector = ({ open: controlledOpen, onOpenChange: controlledOnOpenChange } = {}) => {
  const { user } = useActiveUserStore();
  const { selectedPointDeVente, setPointDeVente, isSelected } =
    usePointDeVenteStore();

  const [emplacements, setEmplacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  // Dialog TOUJOURS ouvert si aucun point de vente n'est sélectionné (prioritaire)
  // Ou contrôlé manuellement via les props si un point de vente est déjà sélectionné
  const hasValidSelection = isSelected && selectedPointDeVente !== null;
  const isOpen = !hasValidSelection || controlledOpen;

  // Charger les emplacements accessibles
  useEffect(() => {
    const loadEmplacements = async () => {
      if (!user?.id || !user?.role) {
        toast.error("Utilisateur non connecté");
        setLoading(false);
        return;
      }

      setLoading(true);
      const { emplacements: data, error } = await getEmplacementsAccessibles(
        user.id,
        user.role
      );

      if (error) {
        console.error("Erreur chargement emplacements:", error);
        toast.error("Erreur lors du chargement des emplacements");
        setEmplacements([]);
      } else {
        setEmplacements(data);

        // Si un seul emplacement disponible, le présélectionner
        if (data.length === 1) {
          setSelectedId(data[0].id);
        }
      }

      setLoading(false);
    };

    loadEmplacements();
  }, [user]);

  // Pré-sélectionner le point de vente actuel quand le dialog s'ouvre
  useEffect(() => {
    if (isOpen && selectedPointDeVente) {
      setSelectedId(selectedPointDeVente.id);
    }
  }, [isOpen, selectedPointDeVente]);

  // Confirmer la sélection
  const handleConfirm = () => {
    const emplacement = emplacements.find((e) => e.id === selectedId);

    if (!emplacement) {
      toast.error("Veuillez sélectionner un point de vente");
      return;
    }

    setPointDeVente(emplacement);
    toast.success(`Point de vente sélectionné : ${emplacement.nom}`);

    // Fermer le dialog si contrôlé manuellement
    if (controlledOnOpenChange) {
      controlledOnOpenChange(false);
    }
  };

  // Obtenir l'icône selon le type
  const getTypeIcon = (type) => {
    switch (type) {
      case "base":
        return "🏢";
      case "stand":
        return "🏪";
      case "kiosque":
        return "🛒";
      case "boutique":
        return "🏬";
      default:
        return "📍";
    }
  };

  // Formater l'adresse
  const formatAdresse = (adresse) => {
    if (!adresse) return "Adresse non spécifiée";

    const parts = [
      adresse.quartier,
      adresse.arrondissement,
      adresse.commune,
      adresse.departement,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "Adresse non spécifiée";
  };

  const handleOpenChange = (open) => {
    // Ne JAMAIS permettre de fermer si aucun point de vente n'est sélectionné
    if (!open && !hasValidSelection) {
      return;
    }

    // Si contrôlé manuellement, utiliser le callback fourni
    if (controlledOnOpenChange) {
      controlledOnOpenChange(open);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-auto"
        hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Store className="w-6 h-6 text-primary" />
            Sélection du point de vente
          </DialogTitle>
          <DialogDescription>
            Veuillez sélectionner le point de vente depuis lequel vous effectuez
            vos transactions. Cette sélection sera mémorisée pendant votre
            session.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            // État de chargement
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Chargement des points de vente...
              </p>
            </div>
          ) : emplacements.length === 0 ? (
            // Aucun emplacement disponible
            <div className="text-center py-12">
              <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-medium text-foreground mb-2">
                Aucun point de vente disponible
              </p>
              <p className="text-sm text-muted-foreground">
                {user?.role === "vendeur"
                  ? "Vous n'êtes responsable d'aucun point de vente actif. Veuillez contacter votre administrateur."
                  : "Aucun point de vente actif n'est configuré dans le système."}
              </p>
            </div>
          ) : (
            // Liste des emplacements
            <>
              <div className="grid gap-3 mb-4">
                {emplacements.map((emplacement) => (
                  <Card
                    key={emplacement.id}
                    className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${
                      selectedId === emplacement.id
                        ? "border-primary border-2 bg-primary/5"
                        : "border-border"
                    }`}
                    onClick={() => setSelectedId(emplacement.id)}>
                    <div className="flex items-start gap-3">
                      {/* Icône selon le type */}
                      <div className="text-3xl flex-shrink-0">
                        {getTypeIcon(emplacement.type)}
                      </div>

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-base">
                            {emplacement.nom}
                          </h3>
                          <Badge
                            variant="secondary"
                            className="capitalize flex-shrink-0">
                            {emplacement.type}
                          </Badge>
                        </div>

                        <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">
                            {formatAdresse(emplacement.adresse)}
                          </span>
                        </div>
                      </div>

                      {/* Indicateur de sélection */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${
                          selectedId === emplacement.id
                            ? "border-primary bg-primary"
                            : "border-muted"
                        }`}>
                        {selectedId === emplacement.id && (
                          <svg
                            className="w-full h-full text-primary-foreground"
                            viewBox="0 0 20 20"
                            fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Bouton de confirmation */}
              <Button
                size="lg"
                className="w-full"
                onClick={handleConfirm}
                disabled={!selectedId}>
                Confirmer la sélection
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PointDeVenteSelector;
