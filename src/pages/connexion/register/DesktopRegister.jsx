import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState } from "react";
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

const DesktopRegister = ({ toggleForm }) => {
  const { isDesktop } = useBreakpoint();
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
      error.errors.forEach((err) => {
        fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      toast.error("Erreur de validation", {
        description: "Veuillez vérifier les champs du formulaire",
      });
      return;
    }

    // Tentative d'inscription
    const result = await register(formData);

    if (result.success) {
      toast.success("Compte créé avec succès !", {
        description: `Bienvenue ${formData.prenoms} ${formData.nom}`,
      });
      // Rediriger vers le dashboard
      navigate("/");
    } else {
      toast.error("Erreur lors de la création du compte", {
        description: result.error || "Une erreur est survenue",
      });
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-8"
      style={{ display: visible ? "flex" : "none" }}>
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="space-y-6 pb-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img src={logo} alt="Logo" className="h-24 w-auto object-contain" />
          </div>
          {/* Titre */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Créer un compte
            </h1>
            <p className="text-muted-foreground">
              Rejoignez-nous pour une expérience healthy
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Grille 2 colonnes pour les champs */}
            <div className="grid grid-cols-2 gap-6">
              {/* Nom */}
              <div className="space-y-2">
                <Label htmlFor="desktop-register-nom" className="text-base">
                  Nom <span className="text-destructive">*</span>
                </Label>
                <InputGroup>
                  <InputGroupAddon>
                    <User className="w-5 h-5 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="desktop-register-nom"
                    name="nom"
                    type="text"
                    placeholder="Votre nom"
                    value={formData.nom}
                    onChange={handleInputChange}
                    required
                    className="text-base py-6"
                  />
                </InputGroup>
              </div>

              {/* Prénoms */}
              <div className="space-y-2">
                <Label htmlFor="desktop-register-prenoms" className="text-base">
                  Prénoms <span className="text-destructive">*</span>
                </Label>
                <InputGroup>
                  <InputGroupAddon>
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="desktop-register-prenoms"
                    name="prenoms"
                    type="text"
                    placeholder="Vos prénoms"
                    value={formData.prenoms}
                    onChange={handleInputChange}
                    required
                    className="text-base py-6"
                  />
                </InputGroup>
              </div>

              {/* Sexe */}
              <div className="space-y-2">
                <Label htmlFor="desktop-register-sexe" className="text-base">
                  Sexe <span className="text-destructive">*</span>
                </Label>
                <InputGroup>
                  <InputGroupAddon>
                    <UserCircle className="w-5 h-5 text-muted-foreground" />
                  </InputGroupAddon>
                  <Select
                    value={formData.sexe}
                    onValueChange={handleSelectChange}
                    required>
                    <SelectTrigger
                      id="desktop-register-sexe"
                      className="text-base py-6 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0">
                      <SelectValue placeholder="Sélectionnez votre sexe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculin">Masculin</SelectItem>
                      <SelectItem value="feminin">Féminin</SelectItem>
                    </SelectContent>
                  </Select>
                </InputGroup>
              </div>

              {/* Date de naissance */}
              <div className="space-y-2">
                <Label
                  htmlFor="desktop-register-dateNaissance"
                  className="text-base">
                  Date de naissance <span className="text-destructive">*</span>
                </Label>
                <InputGroup>
                  <InputGroupAddon>
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="desktop-register-dateNaissance"
                    name="dateNaissance"
                    type="date"
                    value={formData.dateNaissance}
                    onChange={handleInputChange}
                    required
                    className="text-base py-6"
                  />
                </InputGroup>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="desktop-register-email" className="text-base">
                  Email <span className="text-destructive">*</span>
                </Label>
                <InputGroup>
                  <InputGroupAddon>
                    <Mail className="w-5 h-5 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="desktop-register-email"
                    name="email"
                    type="email"
                    placeholder="votre.email@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="text-base py-6"
                  />
                </InputGroup>
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <Label
                  htmlFor="desktop-register-telephone"
                  className="text-base">
                  Téléphone <span className="text-destructive">*</span>
                </Label>
                <PhoneTaker
                  setPhoneNumber={handlePhoneChange}
                  id="desktop-register-telephone"
                  placeholder="XX XX XX XX XX"
                  required
                />
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <Label
                  htmlFor="desktop-register-motDePasse"
                  className="text-base">
                  Mot de passe <span className="text-destructive">*</span>
                </Label>
                <InputGroup>
                  <InputGroupAddon>
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="desktop-register-motDePasse"
                    name="motDePasse"
                    type="password"
                    placeholder="••••••••"
                    value={formData.motDePasse}
                    onChange={handleInputChange}
                    required
                    className="text-base py-6"
                  />
                </InputGroup>
              </div>

              {/* Confirmer mot de passe */}
              <div className="space-y-2">
                <Label
                  htmlFor="desktop-register-confirmerMotDePasse"
                  className="text-base">
                  Confirmer mot de passe{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <InputGroup>
                  <InputGroupAddon>
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="desktop-register-confirmerMotDePasse"
                    name="confirmerMotDePasse"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmerMotDePasse}
                    onChange={handleInputChange}
                    required
                    className="text-base py-6"
                  />
                </InputGroup>
              </div>
            </div>

            {/* Affichage des erreurs globales */}
            {Object.keys(errors).length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                <p className="text-sm text-destructive font-medium">
                  Veuillez corriger les erreurs suivantes :
                </p>
                <ul className="mt-2 text-sm text-destructive list-disc list-inside">
                  {Object.entries(errors).map(([field, message]) => (
                    <li key={field}>{message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Bouton de soumission */}
            <Button
              type="submit"
              className="w-full py-6 text-base"
              size="lg"
              disabled={isLoading}>
              {isLoading ? "Création en cours..." : "Créer mon compte"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-6">
          <p className="text-sm text-muted-foreground">
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

export default DesktopRegister;
