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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Users, Calendar, Mail, Lock, UserCircle } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo-min.png";
import PhoneTaker from "@/components/form/PhoneTaker";
import useActiveUserStore from "@/store/activeUserStore";
import { registerSchema } from "@/schemas/userSchema";

const MobileRegister = ({ toggleForm }) => {
  const { isMobile } = useBreakpoint();
  const navigate = useNavigate();
  const { register, isLoading } = useActiveUserStore();
  const [visible, setVisible] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    prenoms: "",
    sexe: "",
    dateNaissance: "",
    email: "",
    telephone: "",
    motDePasse: "",
    confirmerMotDePasse: "",
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

  const handleSelectChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      sexe: value,
    }));
    // Effacer l'erreur du champ sexe
    if (errors.sexe) {
      setErrors((prev) => ({ ...prev, sexe: null }));
    }
  };

  const handlePhoneChange = (phone) => {
    setFormData((prev) => ({
      ...prev,
      telephone: phone,
    }));
    // Effacer l'erreur du champ telephone
    if (errors.telephone) {
      setErrors((prev) => ({ ...prev, telephone: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validation avec Zod
    try {
      registerSchema.parse(formData);
    } catch (error) {
      const fieldErrors = {};
      // Zod utilise error.issues et non error.errors
      if (error.issues) {
        error.issues.forEach((err) => {
          fieldErrors[err.path[0]] = err.message;
        });
      }
      setErrors(fieldErrors);
      toast.error("Erreur de validation", {
        description: "Veuillez vérifier les champs du formulaire",
      });
      return;
    }

    // Tentative d'inscription
    const result = await register(formData);

    if (result.success) {
      // Compte créé en attente d'approbation admin
      toast.success("Inscription réussie !", {
        description:
          result.message ||
          "Votre compte a été créé et est en attente d'approbation.",
        duration: 10000,
      });

      // Revenir à la vue login après 2 secondes
      setTimeout(() => {
        toggleForm();
      }, 2000);
    } else {
      toast.error("Erreur lors de l'inscription", {
        description: result.error || "Une erreur est survenue",
        duration: 6000,
      });
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4 pb-20"
      style={{ display: visible ? "block" : "none" }}>
      <Card className="w-full shadow-lg">
        <CardHeader className="space-y-4 pb-6">
          {/* Logo */}
          <div className="flex justify-center">
            <img src={logo} alt="Logo" className="h-20 w-auto object-contain" />
          </div>
          {/* Titre */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-foreground">
              Créer un compte
            </h1>
            <p className="text-sm text-muted-foreground">
              Rejoignez-nous pour une expérience healthy
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="mobile-register-nom" className="text-sm">
                Nom <span className="text-destructive">*</span>
              </Label>
              <InputGroup>
                <InputGroupAddon>
                  <User className="w-4 h-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="mobile-register-nom"
                  name="nom"
                  type="text"
                  placeholder="Votre nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  required
                />
              </InputGroup>
            </div>

            {/* Prénoms */}
            <div className="space-y-2">
              <Label htmlFor="mobile-register-prenoms" className="text-sm">
                Prénoms <span className="text-destructive">*</span>
              </Label>
              <InputGroup>
                <InputGroupAddon>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="mobile-register-prenoms"
                  name="prenoms"
                  type="text"
                  placeholder="Vos prénoms"
                  value={formData.prenoms}
                  onChange={handleInputChange}
                  required
                />
              </InputGroup>
            </div>

            {/* Sexe */}
            <div className="space-y-2">
              <Label htmlFor="mobile-register-sexe" className="text-sm">
                Sexe <span className="text-destructive">*</span>
              </Label>
              <InputGroup>
                <InputGroupAddon>
                  <UserCircle className="w-4 h-4 text-muted-foreground" />
                </InputGroupAddon>
                <Select
                  value={formData.sexe}
                  onValueChange={handleSelectChange}
                  required>
                  <SelectTrigger
                    id="mobile-register-sexe"
                    className="flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0">
                    <SelectValue placeholder="Sélectionnez votre sexe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Homme">Homme</SelectItem>
                    <SelectItem value="Femme">Femme</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </InputGroup>
            </div>

            {/* Date de naissance */}
            <div className="space-y-2">
              <Label
                htmlFor="mobile-register-dateNaissance"
                className="text-sm">
                Date de naissance <span className="text-destructive">*</span>
              </Label>
              <InputGroup>
                <InputGroupAddon>
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="mobile-register-dateNaissance"
                  name="dateNaissance"
                  type="date"
                  value={formData.dateNaissance}
                  onChange={handleInputChange}
                  required
                />
              </InputGroup>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="mobile-register-email" className="text-sm">
                Email <span className="text-destructive">*</span>
              </Label>
              <InputGroup>
                <InputGroupAddon>
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="mobile-register-email"
                  name="email"
                  type="email"
                  placeholder="votre.email@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </InputGroup>
            </div>

            {/* Téléphone */}
            <div className="space-y-2">
              <Label htmlFor="mobile-register-telephone" className="text-sm">
                Téléphone <span className="text-destructive">*</span>
              </Label>
              <PhoneTaker
                setPhoneNumber={handlePhoneChange}
                id="mobile-register-telephone"
                placeholder="XX XX XX XX XX"
                required
              />
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="mobile-register-motDePasse" className="text-sm">
                Mot de passe <span className="text-destructive">*</span>
              </Label>
              <InputGroup>
                <InputGroupAddon>
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="mobile-register-motDePasse"
                  name="motDePasse"
                  type="password"
                  placeholder="••••••••"
                  value={formData.motDePasse}
                  onChange={handleInputChange}
                  required
                />
              </InputGroup>
            </div>

            {/* Confirmer mot de passe */}
            <div className="space-y-2">
              <Label
                htmlFor="mobile-register-confirmerMotDePasse"
                className="text-sm">
                Confirmer mot de passe{" "}
                <span className="text-destructive">*</span>
              </Label>
              <InputGroup>
                <InputGroupAddon>
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="mobile-register-confirmerMotDePasse"
                  name="confirmerMotDePasse"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmerMotDePasse}
                  onChange={handleInputChange}
                  required
                />
              </InputGroup>
            </div>

            {/* Affichage des erreurs globales */}
            {Object.keys(errors).length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <p className="text-xs text-destructive font-medium">
                  Veuillez corriger les erreurs suivantes :
                </p>
                <ul className="mt-2 text-xs text-destructive list-disc list-inside">
                  {Object.entries(errors).map(([field, message]) => (
                    <li key={field}>{message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Bouton de soumission */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}>
              {isLoading ? "Création en cours..." : "Créer mon compte"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Vous avez déjà un compte ?{" "}
            <button
              onClick={toggleForm}
              className="text-primary font-semibold hover:underline">
              Se connecter
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default MobileRegister;
