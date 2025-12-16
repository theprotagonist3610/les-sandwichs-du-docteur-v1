import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Phone, Camera, Lock as LockIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBorderBeam } from "@/hooks/useBorderBeam";
import { Mail, Calendar, Briefcase, UserCircle } from "lucide-react";
import useActiveUserStore from "@/store/activeUserStore";
import { EditProfileDialog } from "@/components/profil/EditProfileDialog";
import { ChangePasswordDialog } from "@/components/profil/ChangePasswordDialog";
import { UploadPhotoDialog } from "@/components/profil/UploadPhotoDialog";

const DesktopProfilDetails = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);

  // Récupérer les données de l'utilisateur depuis le store
  const { user } = useActiveUserStore();

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  // Border beam hook
  const { BeamComponent } = useBorderBeam({
    duration: 15,
    borderWidth: 2,
  });

  // Formatter la date de naissance
  const formatDate = (dateString) => {
    if (!dateString) return "Non renseignée";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Formatter le rôle
  const formatRole = (role) => {
    const roles = {
      admin: "Administrateur",
      superviseur: "Superviseur",
      vendeur: "Vendeur",
    };
    return roles[role] || role;
  };

  // Si l'utilisateur n'est pas connecté
  if (!user) {
    return null;
  }

  return (
    <>
      <div style={{ display: visible ? "block" : "none" }}>
        <Card className="relative overflow-hidden h-full">
          {BeamComponent}
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Informations personnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Avatar et nom */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={user.photo_url} alt="Avatar" />
                  <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                    {user.prenoms?.charAt(0)}
                    {user.nom?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {/* Bouton pour changer la photo */}
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full w-10 h-10"
                  onClick={() => setIsPhotoDialogOpen(true)}
                >
                  <Camera className="w-5 h-5" />
                </Button>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-foreground">
                  {user.prenoms} {user.nom}
                </h3>
                <p className="text-base text-muted-foreground mt-2">
                  {formatRole(user.role)}
                </p>
              </div>
            </div>

            {/* Informations détaillées */}
            <div className="space-y-5 pt-6 border-t border-border">
              {/* Sexe */}
              <div className="flex items-start gap-4">
                <UserCircle className="w-6 h-6 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1.5">Sexe</p>
                  <p className="text-base font-medium text-foreground">
                    {user.sexe}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <Mail className="w-6 h-6 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1.5">Email</p>
                  <p className="text-base font-medium text-foreground break-all">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Téléphone */}
              <div className="flex items-start gap-4">
                <Phone className="w-6 h-6 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1.5">Téléphone</p>
                  <p className="text-base font-medium text-foreground">
                    {user.telephone}
                  </p>
                </div>
              </div>

              {/* Date de naissance */}
              <div className="flex items-start gap-4">
                <Calendar className="w-6 h-6 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1.5">
                    Date de naissance
                  </p>
                  <p className="text-base font-medium text-foreground">
                    {formatDate(user.date_naissance)}
                  </p>
                </div>
              </div>

              {/* Rôle */}
              <div className="flex items-start gap-4">
                <Briefcase className="w-6 h-6 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1.5">Rôle</p>
                  <p className="text-base font-medium text-foreground">
                    {formatRole(user.role)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border pt-6 flex gap-3">
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => setIsPasswordDialogOpen(true)}
            >
              <LockIcon className="w-4 h-4 mr-2" />
              Mot de passe
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Dialogues */}
      <EditProfileDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
      <ChangePasswordDialog
        isOpen={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      />
      <UploadPhotoDialog
        isOpen={isPhotoDialogOpen}
        onOpenChange={setIsPhotoDialogOpen}
      />
    </>
  );
};

export default DesktopProfilDetails;
