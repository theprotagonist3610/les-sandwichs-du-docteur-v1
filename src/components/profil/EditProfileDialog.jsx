import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { userUpdateSchema } from "@/schemas/userSchema";
import useActiveUserStore from "@/store/activeUserStore";

/**
 * Dialog pour modifier les informations du profil
 */
export const EditProfileDialog = ({ isOpen, onOpenChange }) => {
  const { user, updateProfile, isLoading } = useActiveUserStore();
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    nom: user?.nom || "",
    prenoms: user?.prenoms || "",
    email: user?.email || "",
    telephone: user?.telephone || "",
    sexe: user?.sexe || "",
    dateNaissance: user?.date_naissance || "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validation avec Zod
    try {
      userUpdateSchema.parse(formData);
    } catch (error) {
      const fieldErrors = {};
      error.errors.forEach((err) => {
        fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Mettre à jour le profil
    const result = await updateProfile({
      nom: formData.nom,
      prenoms: formData.prenoms,
      email: formData.email,
      telephone: formData.telephone,
      sexe: formData.sexe,
      date_naissance: formData.dateNaissance,
    });

    if (result.success) {
      toast.success("Profil mis à jour", {
        description: "Vos informations ont été modifiées avec succès",
      });
      onOpenChange(false);
    } else {
      toast.error("Erreur de mise à jour", {
        description: result.error || "Impossible de mettre à jour le profil",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogDescription>
            Modifiez vos informations personnelles
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="nom">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nom"
              name="nom"
              value={formData.nom}
              onChange={handleInputChange}
              placeholder="Votre nom"
            />
            {errors.nom && (
              <p className="text-sm text-destructive">{errors.nom}</p>
            )}
          </div>

          {/* Prénoms */}
          <div className="space-y-2">
            <Label htmlFor="prenoms">
              Prénoms <span className="text-destructive">*</span>
            </Label>
            <Input
              id="prenoms"
              name="prenoms"
              value={formData.prenoms}
              onChange={handleInputChange}
              placeholder="Vos prénoms"
            />
            {errors.prenoms && (
              <p className="text-sm text-destructive">{errors.prenoms}</p>
            )}
          </div>

          {/* Email (lecture seule) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              L'email ne peut pas être modifié
            </p>
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <Label htmlFor="telephone">
              Téléphone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="telephone"
              name="telephone"
              value={formData.telephone}
              onChange={handleInputChange}
              placeholder="+2250000000000"
            />
            {errors.telephone && (
              <p className="text-sm text-destructive">{errors.telephone}</p>
            )}
          </div>

          {/* Sexe */}
          <div className="space-y-2">
            <Label htmlFor="sexe">
              Sexe <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.sexe}
              onValueChange={(value) => handleSelectChange("sexe", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez votre sexe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Homme">Homme</SelectItem>
                <SelectItem value="Femme">Femme</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
            {errors.sexe && (
              <p className="text-sm text-destructive">{errors.sexe}</p>
            )}
          </div>

          {/* Date de naissance */}
          <div className="space-y-2">
            <Label htmlFor="dateNaissance">
              Date de naissance <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dateNaissance"
              name="dateNaissance"
              type="date"
              value={formData.dateNaissance}
              onChange={handleInputChange}
            />
            {errors.dateNaissance && (
              <p className="text-sm text-destructive">{errors.dateNaissance}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
