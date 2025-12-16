import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo-min.png";
import useActiveUserStore from "@/store/activeUserStore";
import { loginSchema } from "@/schemas/userSchema";

const MobileLogin = ({ toggleForm }) => {
  const { isMobile } = useBreakpoint();
  const navigate = useNavigate();
  const { login, isLoading } = useActiveUserStore();
  const [visible, setVisible] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    motDePasse: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

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
      loginSchema.parse(formData);
    } catch (error) {
      const fieldErrors = {};
      error.errors.forEach((err) => {
        fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Tentative de connexion
    const result = await login(formData.email, formData.motDePasse);

    if (result.success) {
      toast.success("Connexion réussie !", {
        description: `Bienvenue ${result.user.prenoms} ${result.user.nom}`,
      });

      // Petit délai pour s'assurer que le store persist a fini d'écrire
      setTimeout(() => {
        navigate("/");
      }, 100);
    } else {
      toast.error("Erreur de connexion", {
        description: result.error || "Email ou mot de passe incorrect",
      });
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4 flex items-center"
      style={{ display: visible ? "block" : "none" }}>
      <Card className="w-full shadow-lg">
        <CardHeader className="space-y-4 pb-6">
          {/* Logo */}
          <div className="flex justify-center">
            <img src={logo} alt="Logo" className="h-20 w-auto object-contain" />
          </div>
          {/* Titre */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Connexion</h1>
            <p className="text-sm text-muted-foreground">
              Connectez-vous à votre compte
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="mobile-login-email" className="text-sm">
                Email <span className="text-destructive">*</span>
              </Label>
              <InputGroup>
                <InputGroupAddon>
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="mobile-login-email"
                  name="email"
                  type="email"
                  placeholder="votre.email@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </InputGroup>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="mobile-login-motDePasse" className="text-sm">
                  Mot de passe <span className="text-destructive">*</span>
                </Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline">
                  Mot de passe oublié ?
                </button>
              </div>
              <InputGroup>
                <InputGroupAddon>
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="mobile-login-motDePasse"
                  name="motDePasse"
                  type="password"
                  placeholder="••••••••"
                  value={formData.motDePasse}
                  onChange={handleInputChange}
                  required
                />
              </InputGroup>
              {errors.motDePasse && (
                <p className="text-sm text-destructive">{errors.motDePasse}</p>
              )}
            </div>

            {/* Bouton de soumission */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}>
              {isLoading ? "Connexion en cours..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Vous n&apos;avez pas de compte ?{" "}
            <button
              onClick={toggleForm}
              className="text-primary font-semibold hover:underline">
              Créer un compte
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default MobileLogin;
