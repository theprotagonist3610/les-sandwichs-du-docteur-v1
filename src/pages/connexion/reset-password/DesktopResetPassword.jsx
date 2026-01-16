import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import useBreakpoint from "@/hooks/useBreakpoint";
import logo from "@/assets/logo-min.png";
import { changePassword } from "@/services/authService";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères")
      .regex(/[a-zA-Z]/, "Le mot de passe doit contenir au moins une lettre")
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
    confirmPassword: z.string().min(1, "Veuillez confirmer votre mot de passe"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

const DesktopResetPassword = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
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

    try {
      resetPasswordSchema.parse(formData);
    } catch (error) {
      const fieldErrors = {};
      if (error.issues) {
        error.issues.forEach((err) => {
          fieldErrors[err.path[0]] = err.message;
        });
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await changePassword(formData.password);

      if (error) {
        toast.error("Erreur", {
          description: error.message || "Impossible de réinitialiser le mot de passe",
        });
      } else {
        setResetSuccess(true);
        toast.success("Mot de passe réinitialisé", {
          description: "Votre mot de passe a été modifié avec succès",
          duration: 5000,
        });
        setTimeout(() => {
          navigate("/connexion");
        }, 3000);
      }
    } catch (error) {
      console.error("Erreur lors de la réinitialisation:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-8">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Mot de passe modifié</CardTitle>
            <CardDescription className="text-sm">
              Votre mot de passe a été réinitialisé avec succès
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Vous allez être redirigé vers la page de connexion...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center mb-2">
            <img src={logo} alt="Logo" className="w-16 h-16" />
          </div>
          <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
          <CardDescription>
            Choisissez un nouveau mot de passe pour votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="desktop-password">
                Nouveau mot de passe <span className="text-destructive">*</span>
              </Label>
              <InputGroup>
                <InputGroupAddon className="bg-muted/50">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  type="password"
                  id="desktop-password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </InputGroup>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="desktop-confirmPassword">
                Confirmer le mot de passe <span className="text-destructive">*</span>
              </Label>
              <InputGroup>
                <InputGroupAddon className="bg-muted/50">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  type="password"
                  id="desktop-confirmPassword"
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
              </InputGroup>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="bg-muted/50 p-4 rounded-md">
              <p className="text-sm text-muted-foreground font-medium mb-2">
                Le mot de passe doit contenir :
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Au moins 8 caractères</li>
                <li>Au moins une lettre</li>
                <li>Au moins un chiffre</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}>
              {isSubmitting ? "Modification en cours..." : "Réinitialiser le mot de passe"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DesktopResetPassword;
