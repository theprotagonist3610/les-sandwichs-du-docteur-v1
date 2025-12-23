import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Save,
  X,
  MapPin,
  Loader2,
  Navigation,
} from "lucide-react";
import { geocodeAdresse } from "@/utils/adresseToolkit";
import { toast } from "sonner";

/**
 * Formulaire pour ajouter ou modifier une adresse
 */
const AdresseForm = ({
  open,
  onClose,
  onSubmit,
  adresse = null,
  isMobile = false,
}) => {
  const isEdit = !!adresse;

  const [formData, setFormData] = useState({
    departement: "",
    commune: "",
    arrondissement: "",
    quartier: "",
    localisation: {
      lat: "",
      lng: "",
    },
  });

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Remplir le formulaire si mode édition
  useEffect(() => {
    if (adresse) {
      setFormData({
        departement: adresse.departement || "",
        commune: adresse.commune || "",
        arrondissement: adresse.arrondissement || "",
        quartier: adresse.quartier || "",
        localisation: {
          lat: adresse.localisation?.lat || "",
          lng: adresse.localisation?.lng || "",
        },
      });
    } else {
      // Réinitialiser le formulaire
      setFormData({
        departement: "",
        commune: "",
        arrondissement: "",
        quartier: "",
        localisation: {
          lat: "",
          lng: "",
        },
      });
    }
    setErrors({});
  }, [adresse, open]);

  // Validation du formulaire
  const validateForm = () => {
    const newErrors = {};

    if (!formData.departement.trim()) {
      newErrors.departement = "Le département est requis";
    }
    if (!formData.commune.trim()) {
      newErrors.commune = "La commune est requise";
    }
    if (!formData.arrondissement.trim()) {
      newErrors.arrondissement = "L'arrondissement est requis";
    }
    if (!formData.quartier.trim()) {
      newErrors.quartier = "Le quartier est requis";
    }

    // Validation GPS (optionnel mais si renseigné doit être valide)
    if (formData.localisation.lat && (isNaN(formData.localisation.lat) || formData.localisation.lat < -90 || formData.localisation.lat > 90)) {
      newErrors.lat = "Latitude invalide (-90 à 90)";
    }
    if (formData.localisation.lng && (isNaN(formData.localisation.lng) || formData.localisation.lng < -180 || formData.localisation.lng > 180)) {
      newErrors.lng = "Longitude invalide (-180 à 180)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Géocoder l'adresse
  const handleGeocode = async () => {
    setIsGeocoding(true);

    try {
      const { lat, lng, error } = await geocodeAdresse({
        departement: formData.departement,
        commune: formData.commune,
        arrondissement: formData.arrondissement,
        quartier: formData.quartier,
      });

      if (error) {
        toast.error("Géocodage échoué", {
          description: "Impossible de trouver les coordonnées pour cette adresse",
        });
      } else {
        setFormData({
          ...formData,
          localisation: {
            lat: lat.toString(),
            lng: lng.toString(),
          },
        });
        toast.success("Géocodage réussi", {
          description: `Coordonnées trouvées: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        });
      }
    } catch (error) {
      console.error("Erreur géocodage:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue lors du géocodage",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  // Obtenir la position actuelle
  const handleGetCurrentPosition = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            localisation: {
              lat: position.coords.latitude.toFixed(6),
              lng: position.coords.longitude.toFixed(6),
            },
          });
          toast.success("Position obtenue", {
            description: "Coordonnées GPS renseignées",
          });
        },
        (error) => {
          console.error("Erreur de géolocalisation:", error);
          toast.error("Erreur", {
            description: "Impossible d'obtenir votre position",
          });
        }
      );
    } else {
      toast.error("Non supporté", {
        description: "La géolocalisation n'est pas supportée par votre navigateur",
      });
    }
  };

  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Formulaire invalide", {
        description: "Veuillez corriger les erreurs",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Préparer les données
      const data = {
        departement: formData.departement.trim(),
        commune: formData.commune.trim(),
        arrondissement: formData.arrondissement.trim(),
        quartier: formData.quartier.trim(),
        localisation: (formData.localisation.lat && formData.localisation.lng) ? {
          lat: parseFloat(formData.localisation.lat),
          lng: parseFloat(formData.localisation.lng),
        } : null,
      };

      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error("Erreur soumission:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue lors de l'enregistrement",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={isMobile ? "max-w-[95vw]" : "max-w-2xl"}>
        <DialogHeader>
          <DialogTitle className={isMobile ? "text-base" : "text-lg"}>
            {isEdit ? "Modifier l'adresse" : "Nouvelle adresse"}
          </DialogTitle>
          <DialogDescription className={isMobile ? "text-xs" : "text-sm"}>
            {isEdit
              ? "Modifier les informations de l'adresse"
              : "Ajouter une nouvelle adresse à la base de données"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Champs principaux */}
          <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            {/* Département */}
            <div className="space-y-2">
              <Label htmlFor="departement" className={isMobile ? "text-xs" : ""}>
                Département <span className="text-red-500">*</span>
              </Label>
              <Input
                id="departement"
                value={formData.departement}
                onChange={(e) => setFormData({ ...formData, departement: e.target.value })}
                placeholder="Ex: Atlantique"
                className={isMobile ? "h-9 text-sm" : ""}
              />
              {errors.departement && (
                <p className="text-xs text-red-500">{errors.departement}</p>
              )}
            </div>

            {/* Commune */}
            <div className="space-y-2">
              <Label htmlFor="commune" className={isMobile ? "text-xs" : ""}>
                Commune <span className="text-red-500">*</span>
              </Label>
              <Input
                id="commune"
                value={formData.commune}
                onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                placeholder="Ex: Cotonou"
                className={isMobile ? "h-9 text-sm" : ""}
              />
              {errors.commune && (
                <p className="text-xs text-red-500">{errors.commune}</p>
              )}
            </div>

            {/* Arrondissement */}
            <div className="space-y-2">
              <Label htmlFor="arrondissement" className={isMobile ? "text-xs" : ""}>
                Arrondissement <span className="text-red-500">*</span>
              </Label>
              <Input
                id="arrondissement"
                value={formData.arrondissement}
                onChange={(e) => setFormData({ ...formData, arrondissement: e.target.value })}
                placeholder="Ex: 1er arrondissement"
                className={isMobile ? "h-9 text-sm" : ""}
              />
              {errors.arrondissement && (
                <p className="text-xs text-red-500">{errors.arrondissement}</p>
              )}
            </div>

            {/* Quartier */}
            <div className="space-y-2">
              <Label htmlFor="quartier" className={isMobile ? "text-xs" : ""}>
                Quartier <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quartier"
                value={formData.quartier}
                onChange={(e) => setFormData({ ...formData, quartier: e.target.value })}
                placeholder="Ex: Dantokpa"
                className={isMobile ? "h-9 text-sm" : ""}
              />
              {errors.quartier && (
                <p className="text-xs text-red-500">{errors.quartier}</p>
              )}
            </div>
          </div>

          {/* Localisation GPS */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <Label className={`flex items-center gap-2 ${isMobile ? "text-xs" : "text-sm"}`}>
                <MapPin className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                Coordonnées GPS (optionnel)
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={handleGetCurrentPosition}
                  className="gap-2"
                >
                  <Navigation className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                  {!isMobile && "Ma position"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={handleGeocode}
                  disabled={isGeocoding || !formData.departement || !formData.commune}
                  className="gap-2"
                >
                  {isGeocoding ? (
                    <>
                      <Loader2 className={`animate-spin ${isMobile ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
                      {!isMobile && "Recherche..."}
                    </>
                  ) : (
                    <>
                      <MapPin className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                      {!isMobile && "Géocoder"}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="lat" className={isMobile ? "text-xs" : "text-sm"}>
                  Latitude
                </Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.000001"
                  value={formData.localisation.lat}
                  onChange={(e) => setFormData({
                    ...formData,
                    localisation: { ...formData.localisation, lat: e.target.value }
                  })}
                  placeholder="6.3654"
                  className={isMobile ? "h-9 text-sm" : ""}
                />
                {errors.lat && (
                  <p className="text-xs text-red-500">{errors.lat}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lng" className={isMobile ? "text-xs" : "text-sm"}>
                  Longitude
                </Label>
                <Input
                  id="lng"
                  type="number"
                  step="0.000001"
                  value={formData.localisation.lng}
                  onChange={(e) => setFormData({
                    ...formData,
                    localisation: { ...formData.localisation, lng: e.target.value }
                  })}
                  placeholder="2.4183"
                  className={isMobile ? "h-9 text-sm" : ""}
                />
                {errors.lng && (
                  <p className="text-xs text-red-500">{errors.lng}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className={isMobile ? "flex-col gap-2" : ""}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className={isMobile ? "w-full" : ""}
            >
              <X className={isMobile ? "w-3.5 h-3.5 mr-2" : "w-4 h-4 mr-2"} />
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className={isMobile ? "w-full" : ""}
            >
              {isSaving ? (
                <>
                  <Loader2 className={`animate-spin ${isMobile ? "w-3.5 h-3.5 mr-2" : "w-4 h-4 mr-2"}`} />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className={isMobile ? "w-3.5 h-3.5 mr-2" : "w-4 h-4 mr-2"} />
                  {isEdit ? "Modifier" : "Ajouter"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdresseForm;
