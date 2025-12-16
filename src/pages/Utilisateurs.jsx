import Actions from "./utilisateurs/Actions";
import Presence from "./utilisateurs/Presence";
import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState } from "react";
import WithPermission from "@/components/auth/WithPermission";
import { canViewUsers } from "@/utils/permissions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import userService from "@/services/userService";
import { toast } from "sonner";

const MobileUtilisateurs = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    nom: "",
    prenoms: "",
    email: "",
    telephone: "",
    sexe: "",
    dateNaissance: "",
    role: "vendeur",
  });

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  const handleAddUser = async () => {
    // Validation basique
    if (!newUserData.nom || !newUserData.prenoms || !newUserData.email) {
      toast.error("Erreur de validation", {
        description: "Veuillez remplir tous les champs obligatoires",
      });
      return;
    }

    try {
      const result = await userService.createPreUser(newUserData);

      if (result.preUser) {
        toast.success("Pré-utilisateur créé", {
          description: `${newUserData.prenoms} ${newUserData.nom} a été ajouté en attente d'inscription`,
        });
        setIsAddUserDialogOpen(false);
        // Réinitialiser le formulaire
        setNewUserData({
          nom: "",
          prenoms: "",
          email: "",
          telephone: "",
          sexe: "",
          dateNaissance: "",
          role: "vendeur",
        });
        // Recharger la page pour afficher le nouveau pré-utilisateur
        window.location.reload();
      } else {
        toast.error("Erreur", {
          description:
            result.error?.message || "Impossible de créer le pré-utilisateur",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la création du pré-utilisateur:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue",
      });
    }
  };

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <div className="p-4 pb-20">
        {/* En-tête de la page - Mobile */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-1">
                Utilisateurs
              </h1>
              <p className="text-sm text-muted-foreground">
                Gérez vos utilisateurs et suivez leur présence
              </p>
            </div>
            <Dialog
              open={isAddUserDialogOpen}
              onOpenChange={setIsAddUserDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 ml-2">
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Ajouter</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-base">
                    Ajouter un utilisateur
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Créez un nouveau compte utilisateur
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nom" className="text-xs">
                      Nom *
                    </Label>
                    <Input
                      id="nom"
                      value={newUserData.nom}
                      onChange={(e) =>
                        setNewUserData({ ...newUserData, nom: e.target.value })
                      }
                      placeholder="Nom de famille"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prenoms" className="text-xs">
                      Prénoms *
                    </Label>
                    <Input
                      id="prenoms"
                      value={newUserData.prenoms}
                      onChange={(e) =>
                        setNewUserData({
                          ...newUserData,
                          prenoms: e.target.value,
                        })
                      }
                      placeholder="Prénoms"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserData.email}
                      onChange={(e) =>
                        setNewUserData({ ...newUserData, email: e.target.value })
                      }
                      placeholder="email@exemple.com"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="telephone" className="text-xs">
                      Téléphone
                    </Label>
                    <Input
                      id="telephone"
                      type="tel"
                      value={newUserData.telephone}
                      onChange={(e) =>
                        setNewUserData({
                          ...newUserData,
                          telephone: e.target.value,
                        })
                      }
                      placeholder="+225 XX XX XX XX XX"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sexe" className="text-xs">
                      Sexe
                    </Label>
                    <Select
                      value={newUserData.sexe}
                      onValueChange={(value) =>
                        setNewUserData({ ...newUserData, sexe: value })
                      }>
                      <SelectTrigger id="sexe" className="text-sm">
                        <SelectValue placeholder="Sélectionnez" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M" className="text-sm">
                          Masculin
                        </SelectItem>
                        <SelectItem value="F" className="text-sm">
                          Féminin
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dateNaissance" className="text-xs">
                      Date de naissance
                    </Label>
                    <Input
                      id="dateNaissance"
                      type="date"
                      value={newUserData.dateNaissance}
                      onChange={(e) =>
                        setNewUserData({
                          ...newUserData,
                          dateNaissance: e.target.value,
                        })
                      }
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="role" className="text-xs">
                      Rôle *
                    </Label>
                    <Select
                      value={newUserData.role}
                      onValueChange={(value) =>
                        setNewUserData({ ...newUserData, role: value })
                      }>
                      <SelectTrigger id="role" className="text-sm">
                        <SelectValue placeholder="Sélectionnez un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vendeur" className="text-sm">
                          Vendeur
                        </SelectItem>
                        <SelectItem value="superviseur" className="text-sm">
                          Superviseur
                        </SelectItem>
                        <SelectItem value="admin" className="text-sm">
                          Administrateur
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddUserDialogOpen(false)}
                    className="text-xs">
                    Annuler
                  </Button>
                  <Button onClick={handleAddUser} className="text-xs">
                    Créer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Conteneur principal - Mobile avec espacement entre les sections */}
        <div className="space-y-6">
          <Presence />
          <Actions />
        </div>
      </div>
    </div>
  );
};
const DesktopUtilisateurs = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    nom: "",
    prenoms: "",
    email: "",
    telephone: "",
    sexe: "",
    dateNaissance: "",
    role: "vendeur",
  });

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  const handleAddUser = async () => {
    // Validation basique
    if (!newUserData.nom || !newUserData.prenoms || !newUserData.email) {
      toast.error("Erreur de validation", {
        description: "Veuillez remplir tous les champs obligatoires",
      });
      return;
    }

    try {
      const result = await userService.createPreUser(newUserData);

      if (result.preUser) {
        toast.success("Pré-utilisateur créé", {
          description: `${newUserData.prenoms} ${newUserData.nom} a été ajouté en attente d'inscription`,
        });
        setIsAddUserDialogOpen(false);
        // Réinitialiser le formulaire
        setNewUserData({
          nom: "",
          prenoms: "",
          email: "",
          telephone: "",
          sexe: "",
          dateNaissance: "",
          role: "vendeur",
        });
        // Recharger la page pour afficher le nouveau pré-utilisateur
        window.location.reload();
      } else {
        toast.error("Erreur", {
          description:
            result.error?.message || "Impossible de créer le pré-utilisateur",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la création du pré-utilisateur:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue",
      });
    }
  };

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <div className="max-w-7xl mx-auto p-8">
        {/* En-tête de la page - Desktop */}
        <div className="mb-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Utilisateurs
              </h1>
              <p className="text-base text-muted-foreground">
                Gérez vos utilisateurs et suivez leur présence
              </p>
            </div>
            <Dialog
              open={isAddUserDialogOpen}
              onOpenChange={setIsAddUserDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Ajouter un utilisateur</DialogTitle>
                  <DialogDescription>
                    Créez un nouveau compte utilisateur
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="desktop-nom">Nom *</Label>
                    <Input
                      id="desktop-nom"
                      value={newUserData.nom}
                      onChange={(e) =>
                        setNewUserData({ ...newUserData, nom: e.target.value })
                      }
                      placeholder="Nom de famille"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desktop-prenoms">Prénoms *</Label>
                    <Input
                      id="desktop-prenoms"
                      value={newUserData.prenoms}
                      onChange={(e) =>
                        setNewUserData({
                          ...newUserData,
                          prenoms: e.target.value,
                        })
                      }
                      placeholder="Prénoms"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desktop-email">Email *</Label>
                    <Input
                      id="desktop-email"
                      type="email"
                      value={newUserData.email}
                      onChange={(e) =>
                        setNewUserData({ ...newUserData, email: e.target.value })
                      }
                      placeholder="email@exemple.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desktop-telephone">Téléphone</Label>
                    <Input
                      id="desktop-telephone"
                      type="tel"
                      value={newUserData.telephone}
                      onChange={(e) =>
                        setNewUserData({
                          ...newUserData,
                          telephone: e.target.value,
                        })
                      }
                      placeholder="+225 XX XX XX XX XX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desktop-sexe">Sexe</Label>
                    <Select
                      value={newUserData.sexe}
                      onValueChange={(value) =>
                        setNewUserData({ ...newUserData, sexe: value })
                      }>
                      <SelectTrigger id="desktop-sexe">
                        <SelectValue placeholder="Sélectionnez" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculin</SelectItem>
                        <SelectItem value="F">Féminin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desktop-dateNaissance">
                      Date de naissance
                    </Label>
                    <Input
                      id="desktop-dateNaissance"
                      type="date"
                      value={newUserData.dateNaissance}
                      onChange={(e) =>
                        setNewUserData({
                          ...newUserData,
                          dateNaissance: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desktop-role">Rôle *</Label>
                    <Select
                      value={newUserData.role}
                      onValueChange={(value) =>
                        setNewUserData({ ...newUserData, role: value })
                      }>
                      <SelectTrigger id="desktop-role">
                        <SelectValue placeholder="Sélectionnez un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vendeur">Vendeur</SelectItem>
                        <SelectItem value="superviseur">Superviseur</SelectItem>
                        <SelectItem value="admin">Administrateur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddUserDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddUser}>Créer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Conteneur principal - Desktop en grille avec layout 1/3 - 2/3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Presence - 1/3 de la largeur */}
          <div className="lg:col-span-1">
            <Presence />
          </div>
          {/* Actions - 2/3 de la largeur */}
          <div className="lg:col-span-2">
            <Actions />
          </div>
        </div>
      </div>
    </div>
  );
};
const Utilisateurs = () => {
  return (
    <>
      <MobileUtilisateurs />
      <DesktopUtilisateurs />
    </>
  );
};

// Protéger la page - accessible uniquement aux admins et superviseurs
export default WithPermission(
  Utilisateurs,
  (userRole) => canViewUsers(userRole),
  "/"
);
