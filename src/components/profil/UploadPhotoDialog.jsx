import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Camera, Upload } from "lucide-react";
import useActiveUserStore from "@/store/activeUserStore";

/**
 * Dialog pour uploader une photo de profil
 */
export const UploadPhotoDialog = ({ isOpen, onOpenChange }) => {
  const { user, uploadProfilePhoto, isLoading } = useActiveUserStore();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux", {
        description: "La taille maximale est de 5 MB",
      });
      return;
    }

    // Vérifier le format
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Format non supporté", {
        description: "Utilisez JPG, PNG ou WebP",
      });
      return;
    }

    setSelectedFile(file);

    // Créer l'aperçu
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Aucun fichier sélectionné", {
        description: "Veuillez choisir une photo",
      });
      return;
    }

    const result = await uploadProfilePhoto(selectedFile);

    if (result.success) {
      toast.success("Photo mise à jour", {
        description: "Votre photo de profil a été changée avec succès",
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      onOpenChange(false);
    } else {
      toast.error("Erreur d'upload", {
        description: result.error || "Impossible de télécharger la photo",
      });
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Changer la photo de profil</DialogTitle>
          <DialogDescription>
            Téléchargez une nouvelle photo de profil (max 5 MB)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Aperçu de la photo */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-32 h-32">
              <AvatarImage src={previewUrl || user?.photo_url} alt="Avatar" />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                {user?.prenoms?.charAt(0)}
                {user?.nom?.charAt(0)}
              </AvatarFallback>
            </Avatar>

            {selectedFile && (
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}
          </div>

          {/* Bouton de sélection */}
          <div className="flex justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Camera className="w-4 h-4 mr-2" />
              Choisir une photo
            </Button>
          </div>

          {/* Formats acceptés */}
          <div className="text-center text-xs text-muted-foreground">
            Formats acceptés : JPG, PNG, WebP (max 5 MB)
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={isLoading || !selectedFile}
          >
            {isLoading ? (
              "Upload en cours..."
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Télécharger
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
