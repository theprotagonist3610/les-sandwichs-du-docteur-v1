import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import emplacementToolkit from "@/utils/emplacementToolkit";
import {
  Warehouse,
  Store,
  ShoppingCart,
  Building2,
  MapPin,
  Clock,
  User,
} from "lucide-react";
import { supabase } from "@/config/supabase";

const EmplacementDialog = ({
  open,
  onOpenChange,
  onSuccess,
  emplacement = null,
}) => {
  const isEditing = !!emplacement;

  // Form state
  const [formData, setFormData] = useState({
    nom: "",
    type: "stand",
    statut: "actif",
    responsableId: "",
    adresse: {
      departement: "",
      commune: "",
      arrondissement: "",
      quartier: "",
      localisation: { lat: "", lng: "" },
    },
    horaires: emplacementToolkit.DEFAULT_HORAIRES,
  });

  const [responsables, setResponsables] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingResponsables, setIsLoadingResponsables] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);

  // Load responsables (superviseurs et admins)
  useEffect(() => {
    if (open) {
      loadResponsables();
    }
  }, [open]);

  // Populate form when editing
  useEffect(() => {
    if (isEditing && emplacement) {
      setFormData({
        nom: emplacement.nom || "",
        type: emplacement.type || "stand",
        statut: emplacement.statut || "actif",
        responsableId: emplacement.responsable_id || "",
        adresse: {
          departement: emplacement.adresse?.departement || "",
          commune: emplacement.adresse?.commune || "",
          arrondissement: emplacement.adresse?.arrondissement || "",
          quartier: emplacement.adresse?.quartier || "",
          localisation: {
            lat: emplacement.adresse?.localisation?.lat || "",
            lng: emplacement.adresse?.localisation?.lng || "",
          },
        },
        horaires: emplacement.horaires || emplacementToolkit.DEFAULT_HORAIRES,
      });
    } else {
      // Reset form when creating new
      setFormData({
        nom: "",
        type: "stand",
        statut: "actif",
        responsableId: "",
        adresse: {
          departement: "",
          commune: "",
          arrondissement: "",
          quartier: "",
          localisation: { lat: "", lng: "" },
        },
        horaires: emplacementToolkit.DEFAULT_HORAIRES,
      });
    }
  }, [isEditing, emplacement, open]);

  const loadResponsables = async () => {
    setIsLoadingResponsables(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, nom, prenoms, role")
        .order("nom");

      if (error) throw error;
      setResponsables(data || []);
    } catch (error) {
      console.error("Erreur lors du chargement des responsables:", error);
      toast.error("Erreur", {
        description: "Impossible de charger la liste des responsables",
      });
    } finally {
      setIsLoadingResponsables(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdresseChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      adresse: { ...prev.adresse, [field]: value },
    }));
  };

  const handleLocalisationChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      adresse: {
        ...prev.adresse,
        localisation: { ...prev.adresse.localisation, [field]: value },
      },
    }));
  };

  const handleHorairesChange = (jour, field, value) => {
    setFormData((prev) => ({
      ...prev,
      horaires: {
        ...prev.horaires,
        [jour]: { ...prev.horaires[jour], [field]: value },
      },
    }));
  };

  const handleGeolocate = async () => {
    const { departement, commune, quartier } = formData.adresse;

    if (!commune && !quartier) {
      toast.error("Erreur", {
        description: "Veuillez renseigner au moins la commune ou le quartier",
      });
      return;
    }

    const adresseComplete = [quartier, commune, departement]
      .filter(Boolean)
      .join(", ");

    setIsGeolocating(true);
    try {
      const { lat, lng, error } =
        await emplacementToolkit.getCoordinatesFromAddress(adresseComplete);

      if (error || !lat || !lng) {
        toast.error("Erreur", {
          description: "Impossible de géolocaliser cette adresse",
        });
        return;
      }

      setFormData((prev) => ({
        ...prev,
        adresse: {
          ...prev.adresse,
          localisation: { lat: lat.toString(), lng: lng.toString() },
        },
      }));

      toast.success("Succès", {
        description: "Coordonnées GPS récupérées avec succès",
      });
    } catch (error) {
      console.error("Erreur de géolocalisation:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue lors de la géolocalisation",
      });
    } finally {
      setIsGeolocating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.nom.trim()) {
      toast.error("Erreur", {
        description: "Le nom de l'emplacement est requis",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Préparer les données
      const emplacementData = {
        nom: formData.nom.trim(),
        type: formData.type,
        statut: formData.statut,
        responsableId: formData.responsableId || null,
        adresse: {
          ...formData.adresse,
          localisation: {
            lat: formData.adresse.localisation.lat
              ? parseFloat(formData.adresse.localisation.lat)
              : null,
            lng: formData.adresse.localisation.lng
              ? parseFloat(formData.adresse.localisation.lng)
              : null,
          },
        },
        horaires: formData.horaires,
      };

      let result;
      if (isEditing) {
        result = await emplacementToolkit.updateEmplacement(
          emplacement.id,
          emplacementData,
        );
      } else {
        result = await emplacementToolkit.createEmplacement(emplacementData);
      }

      if (result.error) {
        throw result.error;
      }

      if (!result.emplacement) {
        throw new Error("Aucun emplacement retourné");
      }

      toast.success("Succès", {
        description: isEditing
          ? "L'emplacement a été modifié avec succès"
          : "L'emplacement a été créé avec succès",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      toast.error("Erreur", {
        description: isEditing
          ? "Impossible de modifier l'emplacement"
          : "Impossible de créer l'emplacement",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      base: Warehouse,
      stand: Store,
      kiosque: ShoppingCart,
      boutique: Building2,
    };
    const Icon = icons[type] || Store;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier l'emplacement" : "Nouvel emplacement"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations de l'emplacement"
              : "Créez un nouveau point de vente"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="adresse">Adresse</TabsTrigger>
              <TabsTrigger value="horaires">Horaires</TabsTrigger>
            </TabsList>

            {/* Onglet Général */}
            <TabsContent value="general" className="space-y-4 pt-4">
              {/* Nom */}
              <div className="space-y-2">
                <Label htmlFor="nom">
                  Nom de l'emplacement{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => handleInputChange("nom", e.target.value)}
                  placeholder="Ex: Stand Marché Central"
                  required
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange("type", value)}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">
                      <div className="flex items-center gap-2">
                        {getTypeIcon("base")}
                        <span>Base</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="stand">
                      <div className="flex items-center gap-2">
                        {getTypeIcon("stand")}
                        <span>Stand</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="kiosque">
                      <div className="flex items-center gap-2">
                        {getTypeIcon("kiosque")}
                        <span>Kiosque</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="boutique">
                      <div className="flex items-center gap-2">
                        {getTypeIcon("boutique")}
                        <span>Boutique</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Statut */}
              <div className="space-y-2">
                <Label htmlFor="statut">
                  Statut <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.statut}
                  onValueChange={(value) => handleInputChange("statut", value)}>
                  <SelectTrigger id="statut">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="inactif">Inactif</SelectItem>
                    <SelectItem value="ferme_temporairement">
                      Fermé temporairement
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Responsable */}
              <div className="space-y-2">
                <Label htmlFor="responsable">
                  <User className="w-4 h-4 inline mr-1" />
                  Responsable
                </Label>
                <Select
                  value={formData.responsableId}
                  onValueChange={(value) =>
                    handleInputChange("responsableId", value)
                  }
                  disabled={isLoadingResponsables}>
                  <SelectTrigger id="responsable">
                    <SelectValue placeholder="Sélectionner un responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aucun">Aucun responsable</SelectItem>
                    {responsables.map((resp) => (
                      <SelectItem key={resp.id} value={resp.id}>
                        {resp.prenoms} {resp.nom} ({resp.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Onglet Adresse */}
            <TabsContent value="adresse" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Département */}
                <div className="space-y-2">
                  <Label htmlFor="departement">Département</Label>
                  <Input
                    id="departement"
                    value={formData.adresse.departement}
                    onChange={(e) =>
                      handleAdresseChange("departement", e.target.value)
                    }
                    placeholder="Ex: Atlantique"
                  />
                </div>

                {/* Commune */}
                <div className="space-y-2">
                  <Label htmlFor="commune">Commune</Label>
                  <Input
                    id="commune"
                    value={formData.adresse.commune}
                    onChange={(e) =>
                      handleAdresseChange("commune", e.target.value)
                    }
                    placeholder="Ex: Cotonou"
                  />
                </div>

                {/* Arrondissement */}
                <div className="space-y-2">
                  <Label htmlFor="arrondissement">Arrondissement</Label>
                  <Input
                    id="arrondissement"
                    value={formData.adresse.arrondissement}
                    onChange={(e) =>
                      handleAdresseChange("arrondissement", e.target.value)
                    }
                    placeholder="Ex: 1er arrondissement"
                  />
                </div>

                {/* Quartier */}
                <div className="space-y-2">
                  <Label htmlFor="quartier">Quartier</Label>
                  <Input
                    id="quartier"
                    value={formData.adresse.quartier}
                    onChange={(e) =>
                      handleAdresseChange("quartier", e.target.value)
                    }
                    placeholder="Ex: Ganhi"
                  />
                </div>
              </div>

              {/* Coordonnées GPS */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Coordonnées GPS
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGeolocate}
                    disabled={isGeolocating}>
                    {isGeolocating
                      ? "Géolocalisation..."
                      : "Géolocaliser l'adresse"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lat">Latitude</Label>
                    <Input
                      id="lat"
                      type="number"
                      step="any"
                      value={formData.adresse.localisation.lat}
                      onChange={(e) =>
                        handleLocalisationChange("lat", e.target.value)
                      }
                      placeholder="Ex: 6.3654"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lng">Longitude</Label>
                    <Input
                      id="lng"
                      type="number"
                      step="any"
                      value={formData.adresse.localisation.lng}
                      onChange={(e) =>
                        handleLocalisationChange("lng", e.target.value)
                      }
                      placeholder="Ex: 2.4183"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Onglet Horaires */}
            <TabsContent value="horaires" className="space-y-4 pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm text-muted-foreground">
                  Configurez les horaires d'ouverture pour chaque jour
                </Label>
              </div>

              <div className="space-y-3">
                {Object.keys(formData.horaires).map((jour) => (
                  <div
                    key={jour}
                    className="grid grid-cols-3 gap-4 items-center">
                    <Label className="capitalize font-medium">{jour}</Label>
                    <div className="space-y-1">
                      <Label
                        htmlFor={`${jour}-ouverture`}
                        className="text-xs text-muted-foreground">
                        Ouverture
                      </Label>
                      <Input
                        id={`${jour}-ouverture`}
                        type="time"
                        value={formData.horaires[jour]?.ouverture || ""}
                        onChange={(e) =>
                          handleHorairesChange(
                            jour,
                            "ouverture",
                            e.target.value || null,
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor={`${jour}-fermeture`}
                        className="text-xs text-muted-foreground">
                        Fermeture
                      </Label>
                      <Input
                        id={`${jour}-fermeture`}
                        type="time"
                        value={formData.horaires[jour]?.fermeture || ""}
                        onChange={(e) =>
                          handleHorairesChange(
                            jour,
                            "fermeture",
                            e.target.value || null,
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Enregistrement..."
                : isEditing
                  ? "Modifier"
                  : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmplacementDialog;
