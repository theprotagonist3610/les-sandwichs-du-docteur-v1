import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Plus, Loader2 } from "lucide-react";
import * as menuToolkit from "@/utils/menuToolkit";

const MenuDialog = ({ open, onOpenChange, menu, onSave, mode = "create" }) => {
  const [formData, setFormData] = useState({
    nom: "",
    type: menuToolkit.MENU_TYPES.SANDWICH,
    description: "",
    ingredients: [],
    indice_calorique: { joule: 0, calorie: 0 },
    prix: 0,
    statut: menuToolkit.MENU_STATUTS.DISPONIBLE,
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ingredientInput, setIngredientInput] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Charger les données du menu si mode édition
  useEffect(() => {
    if (menu && mode === "edit") {
      setFormData({
        nom: menu.nom || "",
        type: menu.type || menuToolkit.MENU_TYPES.SANDWICH,
        description: menu.description || "",
        ingredients: menu.ingredients || [],
        indice_calorique: menu.indice_calorique || { joule: 0, calorie: 0 },
        prix: menu.prix || 0,
        statut: menu.statut || menuToolkit.MENU_STATUTS.DISPONIBLE,
      });
      setImagePreview(menu.image_url || null);
    } else {
      // Réinitialiser pour création
      setFormData({
        nom: "",
        type: menuToolkit.MENU_TYPES.SANDWICH,
        description: "",
        ingredients: [],
        indice_calorique: { joule: 0, calorie: 0 },
        prix: 0,
        statut: menuToolkit.MENU_STATUTS.DISPONIBLE,
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setErrors({});
  }, [menu, mode, open]);

  // Gérer le changement des champs
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Nettoyer l'erreur du champ
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Gérer le changement de l'indice calorique
  const handleCalorieChange = (type, value) => {
    const numValue = parseFloat(value) || 0;
    setFormData((prev) => ({
      ...prev,
      indice_calorique: {
        ...prev.indice_calorique,
        [type]: numValue,
      },
    }));
  };

  // Gérer l'upload d'image
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier le type
      if (!menuToolkit.ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          image: "Format d'image non supporté",
        }));
        return;
      }

      // Vérifier la taille
      if (file.size > menuToolkit.MAX_IMAGE_SIZE) {
        setErrors((prev) => ({
          ...prev,
          image: "L'image ne doit pas dépasser 5 MB",
        }));
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, image: null }));
    }
  };

  // Ajouter un ingrédient
  const addIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (trimmed && !formData.ingredients.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        ingredients: [...prev.ingredients, trimmed],
      }));
      setIngredientInput("");
    }
  };

  // Supprimer un ingrédient
  const removeIngredient = (index) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, idx) => idx !== index),
    }));
  };

  // Valider et sauvegarder
  const handleSubmit = async () => {
    // Valider
    const { isValid, errors: validationErrors } = menuToolkit.validateMenu(formData);

    if (!isValid) {
      setErrors(
        validationErrors.reduce((acc, err) => {
          acc.general = err;
          return acc;
        }, {})
      );
      return;
    }

    setSaving(true);

    try {
      await onSave(formData, imageFile, mode === "edit" ? menu.id : null);
      onOpenChange(false);
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Créer un nouveau menu" : "Modifier le menu"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Ajoutez un nouveau plat, boisson, dessert ou menu complet"
              : "Modifiez les informations du menu"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Erreur générale */}
          {errors.general && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {errors.general}
            </div>
          )}

          {/* Image */}
          <div className="space-y-2">
            <Label>Image</Label>
            <div className="flex gap-4">
              {imagePreview && (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                  <img
                    src={imagePreview}
                    alt="Aperçu"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 flex flex-col justify-center">
                <Button type="button" variant="outline" className="relative">
                  <Upload className="w-4 h-4 mr-2" />
                  {imagePreview ? "Changer l'image" : "Ajouter une image"}
                  <input
                    type="file"
                    accept={menuToolkit.ALLOWED_IMAGE_TYPES.join(",")}
                    onChange={handleImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Max 5 MB - JPEG, PNG, WebP, GIF
                </p>
                {errors.image && (
                  <p className="text-xs text-destructive mt-1">{errors.image}</p>
                )}
              </div>
            </div>
          </div>

          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="nom">
              Nom du menu <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => handleChange("nom", e.target.value)}
              placeholder="Ex: Sandwich Poulet Curry"
            />
          </div>

          {/* Type et Statut */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.type} onValueChange={(value) => handleChange("type", value)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(menuToolkit.MENU_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statut">Statut</Label>
              <Select value={formData.statut} onValueChange={(value) => handleChange("statut", value)}>
                <SelectTrigger id="statut">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(menuToolkit.MENU_STATUT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Décrivez le menu..."
              rows={3}
            />
          </div>

          {/* Prix et Calories */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prix">Prix (FCFA)</Label>
              <Input
                id="prix"
                type="number"
                min="0"
                value={formData.prix}
                onChange={(e) => handleChange("prix", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calories">Calories (cal)</Label>
              <Input
                id="calories"
                type="number"
                min="0"
                value={formData.indice_calorique.calorie}
                onChange={(e) => handleCalorieChange("calorie", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="joules">Joules (J)</Label>
              <Input
                id="joules"
                type="number"
                min="0"
                value={formData.indice_calorique.joule}
                onChange={(e) => handleCalorieChange("joule", e.target.value)}
              />
            </div>
          </div>

          {/* Ingrédients */}
          <div className="space-y-2">
            <Label>Ingrédients</Label>
            <div className="flex gap-2">
              <Input
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addIngredient())}
                placeholder="Ajouter un ingrédient"
              />
              <Button type="button" onClick={addIngredient} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <AnimatePresence>
                {formData.ingredients.map((ingredient, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}>
                    <Badge variant="secondary" className="gap-1">
                      {ingredient}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeIngredient(idx)}
                      />
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "create" ? "Créer" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MenuDialog;
