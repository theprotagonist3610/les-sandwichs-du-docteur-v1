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
import { toast } from "sonner";
import { passwordChangeSchema } from "@/schemas/userSchema";
import useActiveUserStore from "@/store/activeUserStore";

/**
 * Dialog pour changer le mot de passe
 */
export const ChangePasswordDialog = ({ isOpen, onOpenChange }) => {
  const { changePassword, isLoading } = useActiveUserStore();
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validation avec Zod
    try {
      passwordChangeSchema.parse(formData);
    } catch (error) {
      const fieldErrors = {};
      error.errors.forEach((err) => {
        fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Changer le mot de passe
    const result = await changePassword(formData.newPassword);

    if (result.success) {
      toast.success("Mot de passe modifié", {
        description: "Votre mot de passe a été changé avec succès",
      });
      // Réinitialiser le formulaire
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      onOpenChange(false);
    } else {
      toast.error("Erreur de modification", {
        description: result.error || "Impossible de changer le mot de passe",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Changer le mot de passe</DialogTitle>
          <DialogDescription>
            Entrez votre mot de passe actuel puis choisissez un nouveau mot de
            passe sécurisé
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mot de passe actuel */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">
              Mot de passe actuel <span className="text-destructive">*</span>
            </Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={formData.currentPassword}
              onChange={handleInputChange}
              placeholder="••••••••"
            />
            {errors.currentPassword && (
              <p className="text-sm text-destructive">
                {errors.currentPassword}
              </p>
            )}
          </div>

          {/* Nouveau mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">
              Nouveau mot de passe <span className="text-destructive">*</span>
            </Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleInputChange}
              placeholder="••••••••"
            />
            <p className="text-xs text-muted-foreground">
              Min 8 caractères, au moins 1 lettre et 1 chiffre
            </p>
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword}</p>
            )}
          </div>

          {/* Confirmer nouveau mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">
              Confirmer le nouveau mot de passe{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirmNewPassword"
              name="confirmNewPassword"
              type="password"
              value={formData.confirmNewPassword}
              onChange={handleInputChange}
              placeholder="••••••••"
            />
            {errors.confirmNewPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmNewPassword}
              </p>
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
              {isLoading ? "Modification..." : "Changer le mot de passe"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
