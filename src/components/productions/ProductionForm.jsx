/**
 * ProductionForm.jsx
 * Formulaire de création / modification d'une instance de production
 */

import { useState, useEffect } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  STATUTS_PRODUCTION,
  STATUTS_LABELS,
  UNITES,
  UNITES_LABELS,
  initProductionFromSchema,
  calculerCoutTotal,
} from "@/utils/productionToolkit";
import { Plus, Trash2, PackageCheck } from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split("T")[0];

const RESULTAT_VIDE = { nom: "", quantite: "" };

const buildFormVide = (schema) => {
  const snapshot = schema ? initProductionFromSchema(schema) : null;
  return {
    schema_id: schema?.id || "",
    nom: schema ? `${schema.nom} — ${today()}` : "",
    statut: STATUTS_PRODUCTION.TERMINEE,
    date_production: today(),
    production: snapshot || {
      ingredient_principal: { nom: "", unite: "", quantite: "", cout_unitaire: "", cout_total: "" },
      ingredients_secondaires: [],
    },
    rendement_reel: { quantite: "", unite: schema?.rendement_estime?.unite || "" },
    resultats: schema ? [{ nom: schema.nom, quantite: "" }] : [{ ...RESULTAT_VIDE }],
    duree_reelle_minutes: "",
    notes: "",
  };
};

const productionVersForm = (prod) => ({
  schema_id: prod.schema_id || "",
  nom: prod.nom || "",
  statut: prod.statut || STATUTS_PRODUCTION.TERMINEE,
  date_production: prod.date_production || today(),
  production: prod.production || {
    ingredient_principal: { nom: "", unite: "", quantite: "", cout_unitaire: "", cout_total: "" },
    ingredients_secondaires: [],
  },
  rendement_reel: {
    quantite: prod.rendement_reel?.quantite?.toString() || "",
    unite: prod.rendement_reel?.unite || "",
  },
  resultats: (prod.resultats || []).length > 0
    ? prod.resultats.map((r) => ({ nom: r.nom || "", quantite: r.quantite?.toString() || "" }))
    : [{ ...RESULTAT_VIDE }],
  duree_reelle_minutes: prod.duree_reelle_minutes?.toString() || "",
  notes: prod.notes || "",
});

// ── Champ coût ingrédient ──────────────────────────────────────────────────────

const LigneIngredient = ({ label, value, onChange, readOnly = false }) => {
  const coutTotal =
    (parseFloat(value.quantite) || 0) * (parseFloat(value.cout_unitaire) || 0);

  const handleCoutUnitaire = (v) => {
    const cu = parseFloat(v) || 0;
    const qt = parseFloat(value.quantite) || 0;
    onChange({ ...value, cout_unitaire: v, cout_total: (qt * cu).toFixed(2) });
  };

  return (
    <div className="flex flex-col gap-1 p-2.5 bg-muted/30 rounded-lg border border-border">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-foreground min-w-[120px]">
          <span className="font-medium">{value.nom || "—"}</span>
          <span className="text-muted-foreground">
            {value.quantite} {value.unite}
          </span>
        </div>
        {!readOnly && (
          <>
            <div className="flex flex-col gap-0.5 flex-1 min-w-[100px]">
              <Label className="text-xs text-muted-foreground">Coût unitaire (F)</Label>
              <Input
                type="number"
                placeholder="0"
                value={value.cout_unitaire}
                onChange={(e) => handleCoutUnitaire(e.target.value)}
                min="0"
                step="1"
                className="h-7 text-sm"
              />
            </div>
            <div className="flex flex-col gap-0.5 w-24">
              <Label className="text-xs text-muted-foreground">Coût total</Label>
              <div className="h-7 flex items-center px-2 bg-muted/50 rounded text-sm font-medium text-foreground border border-border">
                {coutTotal.toLocaleString("fr-FR")} F
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── ProductionForm ─────────────────────────────────────────────────────────────

const ProductionForm = ({
  schemas,
  schemaInitial,
  productionInitiale,
  onSubmit,
  submitting,
  onAnnuler,
}) => {
  const [form, setForm] = useState(() =>
    productionInitiale
      ? productionVersForm(productionInitiale)
      : buildFormVide(schemaInitial)
  );

  // Option intégration stock
  const [integrerStock, setIntegrerStock] = useState(true);

  // Confirmation avant intégration
  const [pendingPayload, setPendingPayload] = useState(null);

  const schemaActuel = schemas?.find((s) => s.id === form.schema_id) || schemaInitial;

  const isTerminee = form.statut === STATUTS_PRODUCTION.TERMINEE;

  useEffect(() => {
    if (productionInitiale) {
      setForm(productionVersForm(productionInitiale));
    } else if (schemaInitial) {
      setForm(buildFormVide(schemaInitial));
    }
  }, [productionInitiale, schemaInitial]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSchemaChange = (schemaId) => {
    const schema = schemas?.find((s) => s.id === schemaId);
    if (schema) {
      const snapshot = initProductionFromSchema(schema);
      setForm({
        ...form,
        schema_id: schemaId,
        nom: `${schema.nom} — ${today()}`,
        production: snapshot,
        rendement_reel: { quantite: "", unite: schema.rendement_estime?.unite || "" },
        resultats: [{ nom: schema.nom, quantite: "" }],
      });
    } else {
      set("schema_id", schemaId);
    }
  };

  const setIngPrincipal = (value) =>
    set("production", { ...form.production, ingredient_principal: value });

  const setIngSecondaire = (index, value) => {
    const arr = [...form.production.ingredients_secondaires];
    arr[index] = value;
    set("production", { ...form.production, ingredients_secondaires: arr });
  };

  // ── Résultats ──────────────────────────────────────────────────────────────

  const ajouterResultat = () =>
    set("resultats", [...form.resultats, { ...RESULTAT_VIDE }]);

  const modifierResultat = (i, field, val) => {
    const arr = [...form.resultats];
    arr[i] = { ...arr[i], [field]: val };
    set("resultats", arr);
  };

  const supprimerResultat = (i) =>
    set("resultats", form.resultats.filter((_, idx) => idx !== i));

  // ── Submit ─────────────────────────────────────────────────────────────────

  const coutTotalCalc = calculerCoutTotal(form.production);

  const buildPayload = () => {
    const ip = form.production.ingredient_principal;
    const ingPrincipal = {
      ...ip,
      quantite: parseFloat(ip.quantite) || 0,
      cout_unitaire: parseFloat(ip.cout_unitaire) || 0,
      cout_total: (parseFloat(ip.quantite) || 0) * (parseFloat(ip.cout_unitaire) || 0),
    };

    const ingsSecondaires = (form.production.ingredients_secondaires || []).map((ing) => ({
      ...ing,
      quantite: parseFloat(ing.quantite) || 0,
      cout_unitaire: parseFloat(ing.cout_unitaire) || 0,
      cout_total: (parseFloat(ing.quantite) || 0) * (parseFloat(ing.cout_unitaire) || 0),
    }));

    return {
      schema_id: form.schema_id,
      nom: form.nom,
      statut: form.statut,
      date_production: form.date_production,
      production: {
        ingredient_principal: ingPrincipal,
        ingredients_secondaires: ingsSecondaires,
      },
      rendement_reel:
        form.rendement_reel.quantite
          ? { quantite: parseFloat(form.rendement_reel.quantite), unite: form.rendement_reel.unite }
          : null,
      resultats: isTerminee
        ? form.resultats
            .filter((r) => r.nom.trim() && parseFloat(r.quantite) > 0)
            .map((r) => ({ nom: r.nom.trim(), quantite: parseFloat(r.quantite) }))
        : [],
      duree_reelle_minutes: form.duree_reelle_minutes ? parseInt(form.duree_reelle_minutes) : null,
      notes: form.notes || null,
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = buildPayload();

    // Si terminée avec checkbox intégration cochée → demander confirmation
    if (isTerminee && integrerStock && !productionInitiale) {
      setPendingPayload(payload);
      return;
    }

    onSubmit(payload);
  };

  const confirmerAvecIntegration = () => {
    onSubmit({ ...pendingPayload, integrer_au_stock: true });
    setPendingPayload(null);
  };

  const confirmerSansIntegration = () => {
    onSubmit(pendingPayload);
    setPendingPayload(null);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Schéma */}
        {!schemaInitial && !productionInitiale && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">
              Schéma de production <span className="text-destructive">*</span>
            </Label>
            <Select value={form.schema_id} onValueChange={handleSchemaChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un schéma" />
              </SelectTrigger>
              <SelectContent>
                {(schemas || []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Nom + Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prod-nom" className="text-sm">
              Nom de la production <span className="text-destructive">*</span>
            </Label>
            <Input
              id="prod-nom"
              value={form.nom}
              onChange={(e) => set("nom", e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prod-date" className="text-sm">
              Date de production <span className="text-destructive">*</span>
            </Label>
            <Input
              id="prod-date"
              type="date"
              value={form.date_production}
              onChange={(e) => set("date_production", e.target.value)}
              required
            />
          </div>
        </div>

        {/* Statut */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm">Statut</Label>
          <Select value={form.statut} onValueChange={(v) => set("statut", v)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUTS_PRODUCTION).map(([, val]) => (
                <SelectItem key={val} value={val}>
                  {STATUTS_LABELS[val]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Coûts des ingrédients */}
        {form.schema_id && (
          <div className="flex flex-col gap-2">
            <Label className="text-sm">Coûts des ingrédients</Label>
            <LigneIngredient
              label="Principal"
              value={form.production.ingredient_principal}
              onChange={setIngPrincipal}
            />
            {(form.production.ingredients_secondaires || []).map((ing, i) => (
              <LigneIngredient
                key={i}
                label={`Secondaire #${i + 1}`}
                value={ing}
                onChange={(v) => setIngSecondaire(i, v)}
              />
            ))}
            <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
              <span className="text-sm font-medium">Coût total calculé</span>
              <span className="text-sm font-bold text-primary">
                {coutTotalCalc.toLocaleString("fr-FR")} F
              </span>
            </div>
          </div>
        )}

        {/* Rendement réel */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm">Rendement réel</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Quantité obtenue"
              value={form.rendement_reel.quantite}
              onChange={(e) =>
                set("rendement_reel", { ...form.rendement_reel, quantite: e.target.value })
              }
              min="0"
              step="0.01"
              className="flex-1"
            />
            <Select
              value={form.rendement_reel.unite}
              onValueChange={(v) =>
                set("rendement_reel", { ...form.rendement_reel, unite: v })
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
          {schemaActuel?.rendement_estime && (
            <p className="text-xs text-muted-foreground">
              Rendement estimé : {schemaActuel.rendement_estime.quantite}{" "}
              {schemaActuel.rendement_estime.unite}
            </p>
          )}
        </div>

        {/* Résultats de production — visibles uniquement si terminée */}
        {isTerminee && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                Résultats produits
                <span className="text-destructive ml-1">*</span>
              </Label>
              <button
                type="button"
                onClick={ajouterResultat}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Ajouter
              </button>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Les items produits qui seront convertis en lots de stock.
            </p>
            {form.resultats.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Nom de l'item produit"
                  value={r.nom}
                  onChange={(e) => modifierResultat(i, "nom", e.target.value)}
                  className="flex-1 h-8 text-sm"
                />
                <Input
                  type="number"
                  placeholder="Qté"
                  value={r.quantite}
                  onChange={(e) => modifierResultat(i, "quantite", e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="w-24 h-8 text-sm"
                />
                {form.resultats.length > 1 && (
                  <button
                    type="button"
                    onClick={() => supprimerResultat(i)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Durée réelle */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prod-duree" className="text-sm">
            Durée réelle (minutes)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="prod-duree"
              type="number"
              placeholder="ex. 45"
              value={form.duree_reelle_minutes}
              onChange={(e) => set("duree_reelle_minutes", e.target.value)}
              min="1"
              className="max-w-[160px]"
            />
            {schemaActuel?.duree_preparation_minutes && (
              <span className="text-xs text-muted-foreground">
                Estimé : {schemaActuel.duree_preparation_minutes} min
              </span>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prod-notes" className="text-sm">Notes</Label>
          <Textarea
            id="prod-notes"
            placeholder="Observations, problèmes rencontrés..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>

        {/* Option intégration stock — uniquement si terminée et nouvelle production */}
        {isTerminee && !productionInitiale && (
          <label className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg cursor-pointer hover:bg-green-100/50 dark:hover:bg-green-950/50 transition-colors">
            <input
              type="checkbox"
              checked={integrerStock}
              onChange={(e) => setIntegrerStock(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-green-600 cursor-pointer shrink-0"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                <span className="text-sm font-medium text-green-800 dark:text-green-300">
                  Intégrer au stock
                </span>
              </div>
              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                Les résultats seront automatiquement convertis en lots de stock.
              </p>
            </div>
          </label>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <Button type="button" variant="ghost" onClick={onAnnuler}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting || !form.schema_id}>
            {submitting
              ? "Enregistrement..."
              : productionInitiale
                ? "Mettre à jour"
                : "Enregistrer la production"}
          </Button>
        </div>
      </form>

      {/* AlertDialog confirmation intégration */}
      <AlertDialog open={!!pendingPayload} onOpenChange={(o) => !o && setPendingPayload(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-green-600" />
              Intégrer au stock ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              La production sera enregistrée avec le statut{" "}
              <span className="font-medium text-foreground">Terminée</span>.
              {pendingPayload?.resultats?.length > 0 && (
                <>
                  {" "}Les {pendingPayload.resultats.length} résultat(s) saisi(s) seront
                  convertis en lots de stock.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={confirmerSansIntegration}
              disabled={submitting}>
              Enregistrer uniquement
            </Button>
            <AlertDialogAction
              onClick={confirmerAvecIntegration}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white">
              <PackageCheck className="w-4 h-4 mr-1.5" />
              Enregistrer et intégrer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProductionForm;
