import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

const DesktopLogin = ({ toggleForm }) => {
  const { isDesktop } = useBreakpoint();
  const navigate = useNavigate();
  const { login, isLoading } = useActiveUserStore();
  const [visible, setVisible] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    motDePasse: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

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
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-8"
      style={{ display: visible ? "flex" : "none" }}>
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-6 pb-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img src={logo} alt="Logo" className="h-24 w-auto object-contain" />
          </div>
          {/* Titre */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Connexion</h1>
            <p className="text-muted-foreground">
              Connectez-vous à votre compte
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="desktop-login-email" className="text-base">
                Email <span className="text-destructive">*</span>
              </Label>
              <InputGroup>
                <InputGroupAddon>
                  <Mail className="w-5 h-5 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="desktop-login-email"
                  name="email"
                  type="email"
                  placeholder="votre.email@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="text-base py-6"
                />
              </InputGroup>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="desktop-login-motDePasse" className="text-base">
                  Mot de passe <span className="text-destructive">*</span>
                </Label>
                <Link
                  to="/mot-de-passe-oublie"
                  className="text-sm text-primary hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>
              <InputGroup>
                <InputGroupAddon>
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="desktop-login-motDePasse"
                  name="motDePasse"
                  type="password"
                  placeholder="••••••••"
                  value={formData.motDePasse}
                  onChange={handleInputChange}
                  required
                  className="text-base py-6"
                />
              </InputGroup>
              {errors.motDePasse && (
                <p className="text-sm text-destructive">{errors.motDePasse}</p>
              )}
            </div>

            {/* Bouton de soumission */}
            <Button
              type="submit"
              className="w-full py-6 text-base"
              size="lg"
              disabled={isLoading}>
              {isLoading ? "Connexion en cours..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-6">
          <p className="text-sm text-muted-foreground">
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

export default DesktopLogin;
