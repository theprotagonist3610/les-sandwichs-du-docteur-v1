import { useState, useEffect, useRef } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { X, Upload, Plus, Loader2, Zap } from "lucide-react";
import * as menuToolkit from "@/features/menus/utils/menuToolkit";
import {
  PROMOTION_TYPES,
  DUREE_UNITES,
} from "@/features/promotions/utils/promotionToolkit";
import { useGSAP } from "@/shared/hooks/useGSAP";
import { scaleInSmall, exitScaleOut } from "@/lib/animations";

const MenuDialog = ({ open, onOpenChange, menu, onSave, mode = "create" }) => {
  const dialogRef = useRef(null);

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

  const [isPromo, setIsPromo] = useState(false);
  const [promoData, setPromoData] = useState({
    type_promotion: PROMOTION_TYPES.STANDARD,
    reduction_absolue: 0,
    reduction_relative: 0,
    duree_valeur: 1,
    duree_unite: DUREE_UNITES.DAYS,
    code_promo: "",
  });

  const { contextSafe } = useGSAP({ scope: dialogRef });

  const animateBadgeIn = (el) => {
    if (el) scaleInSmall(el);
  };

  const removeBadgeAnimated = contextSafe((el, onDone) => {
    exitScaleOut(el, onDone);
  });

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
    setIsPromo(false);
    setPromoData({
      type_promotion: PROMOTION_TYPES.STANDARD,
      reduction_absolue: 0,
      reduction_relative: 0,
      duree_valeur: 1,
      duree_unite: DUREE_UNITES.DAYS,
      code_promo: "",
    });
  }, [menu, mode, open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

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

  const handlePromoChange = (field, value) => {
    setPromoData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!menuToolkit.ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          image: "Format d'image non supporté",
        }));
        return;
      }

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

  const removeIngredient = (index) => {
    const badgeEls = dialogRef.current?.querySelectorAll(".ingredient-badge");
    const el = badgeEls?.[index];
    if (el) {
      removeBadgeAnimated(el, () => {
        setFormData((prev) => ({
          ...prev,
          ingredients: prev.ingredients.filter((_, idx) => idx !== index),
        }));
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        ingredients: prev.ingredients.filter((_, idx) => idx !== index),
      }));
    }
  };

  const handleSubmit = async () => {
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
      const promoPayload = isPromo
        ? {
            ...promoData,
            denomination: `Promo - ${formData.nom}`,
            description: formData.description,
          }
        : null;

      await onSave(formData, imageFile, mode === "edit" ? menu.id : null, promoPayload);
      onOpenChange(false);
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" ref={dialogRef}>
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
          {errors.general && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {errors.general}
            </div>
          )}

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

          {mode === "create" && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <div>
                  <Label htmlFor="is-promo" className="text-sm font-medium cursor-pointer">
                    Menu Promo
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Crée automatiquement une promotion associée
                  </p>
                </div>
              </div>
              <Switch
                id="is-promo"
                checked={isPromo}
                onCheckedChange={setIsPromo}
              />
            </div>
          )}

          {isPromo && mode === "create" && (
            <div className="space-y-4 p-4 rounded-lg border-2 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Configuration de la promotion
              </h3>

              <div className="space-y-2">
                <Label htmlFor="type_promotion">Type de promotion</Label>
                <Select
                  value={promoData.type_promotion}
                  onValueChange={(value) => handlePromoChange("type_promotion", value)}>
                  <SelectTrigger id="type_promotion">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROMOTION_TYPES.STANDARD}>Standard</SelectItem>
                    <SelectItem value={PROMOTION_TYPES.FLASH}>Flash</SelectItem>
                    <SelectItem value={PROMOTION_TYPES.HAPPY_HOUR}>Happy Hour</SelectItem>
                    <SelectItem value={PROMOTION_TYPES.RECURRENTE}>Récurrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reduction_absolue">Réduction (FCFA)</Label>
                  <Input
                    id="reduction_absolue"
                    type="number"
                    min="0"
                    value={promoData.reduction_absolue}
                    onChange={(e) =>
                      handlePromoChange("reduction_absolue", parseFloat(e.target.value) || 0)
                    }
                    placeholder="Ex: 500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reduction_relative">Réduction (%)</Label>
                  <Input
                    id="reduction_relative"
                    type="number"
                    min="0"
                    max="100"
                    value={promoData.reduction_relative}
                    onChange={(e) =>
                      handlePromoChange("reduction_relative", parseFloat(e.target.value) || 0)
                    }
                    placeholder="Ex: 20"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Renseignez au moins une réduction (absolue ou relative)
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duree_valeur">Durée</Label>
                  <Input
                    id="duree_valeur"
                    type="number"
                    min="1"
                    value={promoData.duree_valeur}
                    onChange={(e) =>
                      handlePromoChange("duree_valeur", parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duree_unite">Unité</Label>
                  <Select
                    value={promoData.duree_unite}
                    onValueChange={(value) => handlePromoChange("duree_unite", value)}>
                    <SelectTrigger id="duree_unite">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DUREE_UNITES.MINUTES}>Minutes</SelectItem>
                      <SelectItem value={DUREE_UNITES.HOURS}>Heures</SelectItem>
                      <SelectItem value={DUREE_UNITES.DAYS}>Jours</SelectItem>
                      <SelectItem value={DUREE_UNITES.WEEKS}>Semaines</SelectItem>
                      <SelectItem value={DUREE_UNITES.MONTHS}>Mois</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code_promo">Code promo (optionnel)</Label>
                <Input
                  id="code_promo"
                  value={promoData.code_promo}
                  onChange={(e) => handlePromoChange("code_promo", e.target.value)}
                  placeholder="Auto-généré si vide"
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  Laissez vide pour générer automatiquement
                </p>
              </div>
            </div>
          )}

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
              {formData.ingredients.map((ingredient, idx) => (
                <div
                  key={idx}
                  className="ingredient-badge"
                  ref={(el) => el && animateBadgeIn(el)}>
                  <Badge variant="secondary" className="gap-1">
                    {ingredient}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                      onClick={() => removeIngredient(idx)}
                    />
                  </Badge>
                </div>
              ))}
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

export { MenuDialog };
