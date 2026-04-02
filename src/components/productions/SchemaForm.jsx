/**
 * SchemaForm.jsx
 * Formulaire de création / modification d'un schéma de production
 */

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  CATEGORIES_PRODUCTION,
  CATEGORIES_LABELS,
  UNITES,
  UNITES_LABELS,
} from "@/utils/productionToolkit";

// ── Valeurs initiales ──────────────────────────────────────────────────────────

const INGREDIENT_VIDE = { nom: "", unite: "", quantite: "" };

const FORM_VIDE = {
  nom: "",
  categorie: "",
  ingredient_principal: { ...INGREDIENT_VIDE },
  ingredients_secondaires: [],
  rendement_estime: { quantite: "", unite: "" },
  duree_preparation_minutes: "",
  duree_conservation_jours: "",
  notes: "",
};

const schemaVersForm = (schema) => ({
  nom: schema.nom || "",
  categorie: schema.categorie || "",
  ingredient_principal: {
    nom: schema.ingredient_principal?.nom || "",
    unite: schema.ingredient_principal?.unite || "",
    quantite: schema.ingredient_principal?.quantite?.toString() || "",
  },
  ingredients_secondaires: (schema.ingredients_secondaires || []).map((ing) => ({
    nom: ing.nom || "",
    unite: ing.unite || "",
    quantite: ing.quantite?.toString() || "",
  })),
  rendement_estime: {
    quantite: schema.rendement_estime?.quantite?.toString() || "",
    unite: schema.rendement_estime?.unite || "",
  },
  duree_preparation_minutes: schema.duree_preparation_minutes?.toString() || "",
  duree_conservation_jours: schema.duree_conservation_jours?.toString() || "",
  notes: schema.notes || "",
});

// ── Composant champ ingrédient ─────────────────────────────────────────────────

const ChampIngredient = ({ label, value, onChange, onSupprimer }) => (
  <div className="flex flex-col gap-1.5 p-3 bg-muted/40 rounded-lg border border-border">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {onSupprimer && (
        <button
          type="button"
          onClick={onSupprimer}
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div className="col-span-3 sm:col-span-1">
        <Input
          placeholder="Nom"
          value={value.nom}
          onChange={(e) => onChange({ ...value, nom: e.target.value })}
          className="h-8 text-sm"
        />
      </div>
      <div>
        <Select
          value={value.unite}
          onValueChange={(v) => onChange({ ...value, unite: v })}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Unité" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(UNITES).map(([, val]) => (
              <SelectItem key={val} value={val}>
                {UNITES_LABELS[val]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Input
          type="number"
          placeholder="Qté"
          value={value.quantite}
          onChange={(e) => onChange({ ...value, quantite: e.target.value })}
          className="h-8 text-sm"
          min="0"
          step="0.01"
        />
      </div>
    </div>
  </div>
);

// ── SchemaForm ─────────────────────────────────────────────────────────────────

const SchemaForm = ({ schemaInitial, onSubmit, submitting, onAnnuler }) => {
  const [form, setForm] = useState(() =>
    schemaInitial ? schemaVersForm(schemaInitial) : FORM_VIDE
  );

  useEffect(() => {
    if (schemaInitial) {
      setForm(schemaVersForm(schemaInitial));
    } else {
      setForm(FORM_VIDE);
    }
  }, [schemaInitial]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const ajouterIngredientSecondaire = () => {
    set("ingredients_secondaires", [
      ...form.ingredients_secondaires,
      { ...INGREDIENT_VIDE },
    ]);
  };

  const modifierIngredientSecondaire = (index, value) => {
    const arr = [...form.ingredients_secondaires];
    arr[index] = value;
    set("ingredients_secondaires", arr);
  };

  const supprimerIngredientSecondaire = (index) => {
    set(
      "ingredients_secondaires",
      form.ingredients_secondaires.filter((_, i) => i !== index)
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      nom: form.nom,
      categorie: form.categorie,
      ingredient_principal: {
        nom: form.ingredient_principal.nom,
        unite: form.ingredient_principal.unite,
        quantite: parseFloat(form.ingredient_principal.quantite) || 0,
      },
      ingredients_secondaires: form.ingredients_secondaires
        .filter((ing) => ing.nom.trim())
        .map((ing) => ({
          nom: ing.nom,
          unite: ing.unite,
          quantite: parseFloat(ing.quantite) || 0,
        })),
      rendement_estime:
        form.rendement_estime.quantite && form.rendement_estime.unite
          ? {
              quantite: parseFloat(form.rendement_estime.quantite),
              unite: form.rendement_estime.unite,
            }
          : null,
      duree_preparation_minutes: form.duree_preparation_minutes
        ? parseInt(form.duree_preparation_minutes)
        : null,
      duree_conservation_jours: form.duree_conservation_jours
        ? parseInt(form.duree_conservation_jours)
        : null,
      notes: form.notes || null,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Nom + Catégorie */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schema-nom" className="text-sm">
            Nom du schéma <span className="text-destructive">*</span>
          </Label>
          <Input
            id="schema-nom"
            placeholder="ex. Sauce mayo maison"
            value={form.nom}
            onChange={(e) => set("nom", e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm">
            Catégorie <span className="text-destructive">*</span>
          </Label>
          <Select value={form.categorie} onValueChange={(v) => set("categorie", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORIES_PRODUCTION).map(([, val]) => (
                <SelectItem key={val} value={val}>
                  {CATEGORIES_LABELS[val]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ingrédient principal */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm">
          Ingrédient principal <span className="text-destructive">*</span>
        </Label>
        <ChampIngredient
          label="Principal"
          value={form.ingredient_principal}
          onChange={(v) => set("ingredient_principal", v)}
        />
      </div>

      {/* Ingrédients secondaires */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Ingrédients secondaires</Label>
          <button
            type="button"
            onClick={ajouterIngredientSecondaire}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Ajouter
          </button>
        </div>
        {form.ingredients_secondaires.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            Aucun ingrédient secondaire
          </p>
        ) : (
          form.ingredients_secondaires.map((ing, i) => (
            <ChampIngredient
              key={i}
              label={`Secondaire #${i + 1}`}
              value={ing}
              onChange={(v) => modifierIngredientSecondaire(i, v)}
              onSupprimer={() => supprimerIngredientSecondaire(i)}
            />
          ))
        )}
      </div>

      {/* Rendement estimé */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm">Rendement estimé</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Quantité"
            value={form.rendement_estime.quantite}
            onChange={(e) =>
              set("rendement_estime", {
                ...form.rendement_estime,
                quantite: e.target.value,
              })
            }
            min="0"
            step="0.01"
            className="flex-1"
          />
          <Select
            value={form.rendement_estime.unite}
            onValueChange={(v) =>
              set("rendement_estime", { ...form.rendement_estime, unite: v })
            }>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Unité" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(UNITES).map(([, val]) => (
                <SelectItem key={val} value={val}>
                  {UNITES_LABELS[val]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Durées */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schema-duree" className="text-sm">
            Durée de préparation estimée (minutes)
          </Label>
          <Input
            id="schema-duree"
            type="number"
            placeholder="ex. 30"
            value={form.duree_preparation_minutes}
            onChange={(e) => set("duree_preparation_minutes", e.target.value)}
            min="1"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schema-conservation" className="text-sm">
            Durée de conservation (jours)
          </Label>
          <Input
            id="schema-conservation"
            type="number"
            placeholder="ex. 3"
            value={form.duree_conservation_jours}
            onChange={(e) => set("duree_conservation_jours", e.target.value)}
            min="1"
          />
          <p className="text-xs text-muted-foreground">
            Utilisée pour calculer la date de péremption du stock.
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="schema-notes" className="text-sm">
          Notes
        </Label>
        <Textarea
          id="schema-notes"
          placeholder="Instructions, remarques, conseils..."
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button type="button" variant="ghost" onClick={onAnnuler}>
          Annuler
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting
            ? "Enregistrement..."
            : schemaInitial
              ? "Mettre à jour"
              : "Créer le schéma"}
        </Button>
      </div>
    </form>
  );
};

export default SchemaForm;
