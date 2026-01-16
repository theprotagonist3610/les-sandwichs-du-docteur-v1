import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import useBreakpoint from "@/hooks/useBreakpoint";
import logo from "@/assets/logo-min.png";
import { requestPasswordReset } from "@/services/authService";

const emailSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Veuillez entrer une adresse email valide")
    .toLowerCase()
    .trim(),
});

const MobileForgotPassword = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    try {
      emailSchema.parse({ email });
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
      const { error } = await requestPasswordReset(email);

      if (error) {
        toast.error("Erreur", {
          description: error.message || "Impossible d'envoyer l'email de réinitialisation",
        });
      } else {
        setEmailSent(true);
        toast.success("Email envoyé", {
          description: "Veuillez consulter votre boîte mail pour réinitialiser votre mot de passe",
          duration: 6000,
        });
      }
    } catch (error) {
      console.error("Erreur lors de la demande de réinitialisation:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4 pb-20">
        <Card className="w-full max-w-[90vw] shadow-lg">
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center">
              <CheckCircle className="w-14 h-14 text-green-500" />
            </div>
            <CardTitle className="text-xl">Email envoyé</CardTitle>
            <CardDescription className="text-xs">
              Un email de réinitialisation a été envoyé à <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Veuillez vérifier votre boîte mail et suivre les instructions pour réinitialiser votre mot de passe.</p>
              <p>Si vous ne recevez pas l'email dans quelques minutes, vérifiez votre dossier spam.</p>
            </div>
            <Button
              onClick={() => navigate("/connexion")}
              variant="outline"
              className="w-full text-xs">
              <ArrowLeft className="w-3 h-3 mr-1" />
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4 pb-20">
      <Card className="w-full max-w-[90vw] shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center mb-2">
            <img src={logo} alt="Logo" className="w-12 h-12" />
          </div>
          <CardTitle className="text-xl">Mot de passe oublié ?</CardTitle>
          <CardDescription className="text-xs">
            Entrez votre adresse email pour recevoir un lien de réinitialisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <InputGroup>
                <InputGroupAddon className="bg-muted/50">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  type="email"
                  name="email"
                  placeholder="email@exemple.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      setErrors({ ...errors, email: null });
                    }
                  }}
                  disabled={isSubmitting}
                  className="text-sm"
                />
              </InputGroup>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full text-xs"
              disabled={isSubmitting}>
              {isSubmitting ? "Envoi en cours..." : "Envoyer le lien"}
            </Button>

            <div className="text-center">
              <Link
                to="/connexion"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                Retour à la connexion
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileForgotPassword;
