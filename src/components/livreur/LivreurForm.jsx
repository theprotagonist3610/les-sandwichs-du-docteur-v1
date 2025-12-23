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
import { Loader2, User, Phone } from "lucide-react";
import { validateLivreurData } from "@/utils/livreurToolkit";

/**
 * Composant formulaire pour créer ou éditer un livreur
 * @param {Object} props
 * @param {boolean} props.isOpen - Dialog ouvert ou fermé
 * @param {Function} props.onClose - Callback pour fermer le dialog
 * @param {Function} props.onSubmit - Callback appelé à la soumission (livreurData)
 * @param {Object} props.livreur - Livreur à éditer (null pour création)
 * @param {boolean} props.isLoading - État de chargement
 * @param {boolean} props.isMobile - Mode mobile
 */
const LivreurForm = ({
  isOpen,
  onClose,
  onSubmit,
  livreur = null,
  isLoading = false,
  isMobile = false,
}) => {
  const isEditMode = !!livreur;

  // État du formulaire
  const [formData, setFormData] = useState({
    denomination: "",
    contact: "",
  });

  // Erreurs de validation
  const [errors, setErrors] = useState({});

  // Charger les données du livreur en mode édition
  useEffect(() => {
    if (isEditMode && livreur) {
      setFormData({
        denomination: livreur.denomination || "",
        contact: livreur.contact || "",
      });
    } else {
      setFormData({
        denomination: "",
        contact: "",
      });
    }
    setErrors({});
  }, [livreur, isEditMode, isOpen]);

  // Gérer les changements dans les champs
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Nettoyer l'erreur du champ modifié
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Valider et soumettre
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    const { valid, errors: validationErrors } = validateLivreurData(formData);

    if (!valid) {
      setErrors(validationErrors);
      return;
    }

    // Soumettre les données
    onSubmit(formData);
  };

  // Réinitialiser et fermer
  const handleClose = () => {
    setFormData({
      denomination: "",
      contact: "",
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={isMobile ? "w-[95vw] max-w-md" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className={isMobile ? "text-lg" : "text-xl"}>
            {isEditMode ? "Modifier le livreur" : "Nouveau livreur"}
          </DialogTitle>
          <DialogDescription className={isMobile ? "text-xs" : "text-sm"}>
            {isEditMode
              ? "Modifiez les informations du livreur."
              : "Ajoutez un nouveau livreur au système."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dénomination */}
          <div className="space-y-2">
            <Label
              htmlFor="denomination"
              className={`flex items-center gap-2 ${isMobile ? "text-xs" : "text-sm"}`}
            >
              <User className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
              Dénomination
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="denomination"
              type="text"
              placeholder="Nom ou raison sociale du livreur"
              value={formData.denomination}
              onChange={(e) => handleChange("denomination", e.target.value)}
              className={isMobile ? "h-9 text-sm" : ""}
              disabled={isLoading}
              autoFocus
            />
            {errors.denomination && (
              <p className="text-xs text-destructive">{errors.denomination}</p>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <Label
              htmlFor="contact"
              className={`flex items-center gap-2 ${isMobile ? "text-xs" : "text-sm"}`}
            >
              <Phone className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
              Contact
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact"
              type="text"
              placeholder="Numéro de téléphone ou email"
              value={formData.contact}
              onChange={(e) => handleChange("contact", e.target.value)}
              className={isMobile ? "h-9 text-sm" : ""}
              disabled={isLoading}
            />
            {errors.contact && (
              <p className="text-xs text-destructive">{errors.contact}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Minimum 8 caractères (téléphone, email, etc.)
            </p>
          </div>

          <DialogFooter className={isMobile ? "gap-2" : "gap-3"}>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              size={isMobile ? "sm" : "default"}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              size={isMobile ? "sm" : "default"}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "Modification..." : "Création..."}
                </>
              ) : (
                <>{isEditMode ? "Modifier" : "Créer"}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LivreurForm;
