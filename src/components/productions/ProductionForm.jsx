/**
 * ProductionForm.jsx
 * Formulaire de saisie d'un lot de production.
 * Calcule en temps réel : coût total, rendement, prix de vente, marge.
 */

import { useState, useEffect, useMemo } from "react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge }    from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  calculerCoutTotal, calculerRendement, calculerPrixVente, calculerMarge,
  formatMontant, formatRendement, RECETTE_LABELS, RECETTE_COLORS, RECETTES_IDS,
  initIngredientsPrincipaux, initIngredientsSecondaires,
} from "@/utils/productionToolkit";

// ─── Champ numérique ──────────────────────────────────────────────────────────

const NumInput = ({ label, value, onChange, unite, placeholder = "0", className }) => (
  <div className={cn("flex flex-col gap-1", className)}>
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <div className="relative">
      <Input
        type="number"
        min={0}
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10 text-sm h-9"
      />
      {unite && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          {unite}
        </span>
      )}
    </div>
  </div>
);

// ─── Ligne ingrédient ─────────────────────────────────────────────────────────

const LigneIngredient = ({ label, ing, onChange }) => {
  const coutTotal = useMemo(
    () => Math.round(Number(ing.qte_utilisee || 0) * Number(ing.cout_unitaire_reel || 0) * 100) / 100,
    [ing.qte_utilisee, ing.cout_unitaire_reel],
  );

  useEffect(() => {
    if (coutTotal !== ing.cout_total) onChange({ ...ing, cout_total: coutTotal });
  }, [coutTotal]); // eslint-disable-line

  return (
    <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
      <span className="text-xs font-medium">{label} <span className="text-muted-foreground">({ing.unite})</span></span>
      <div className="grid grid-cols-3 gap-2">
        <NumInput
          label="Quantité utilisée"
          value={ing.qte_utilisee}
          unite={ing.unite}
          onChange={(v) => onChange({ ...ing, qte_utilisee: v })}
        />
        <NumInput
          label="Coût unitaire réel"
          value={ing.cout_unitaire_reel}
          unite="FCFA"
          onChange={(v) => onChange({ ...ing, cout_unitaire_reel: v })}
        />
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Coût total</Label>
          <div className="h-9 flex items-center px-3 rounded-md bg-background border text-sm font-medium">
            {formatMontant(coutTotal)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const ProductionForm = ({ recettes, recetteIdInitiale, productionInitiale, onSubmit, onCancel, loading }) => {
  const isEdit = !!productionInitiale;

  const [recetteId, setRecetteId]   = useState(recetteIdInitiale ?? productionInitiale?.recette_id ?? "viande");
  const [date, setDate]             = useState(productionInitiale?.date_production ?? new Date().toISOString().slice(0, 10));
  const [ingPrincipal, setIngP]     = useState(() =>
    isEdit
      ? (productionInitiale.ingredient_principal ?? {})
      : initIngredientsPrincipaux(recettes?.find((r) => r.id === (recetteIdInitiale ?? "viande"))),
  );
  const [ingsSecondaires, setIngsS] = useState(() => {
    const recette = recettes?.find((r) => r.id === (recetteIdInitiale ?? productionInitiale?.recette_id ?? "viande"));
    return isEdit
      ? (productionInitiale.ingredients_secondaires ?? [])
      : initIngredientsSecondaires(recette);
  });
  const [qteProduite, setQteProduite] = useState(productionInitiale?.qte_produite_reelle ?? "");
  const [notes, setNotes]             = useState(productionInitiale?.notes ?? "");

  const recette = recettes?.find((r) => r.id === recetteId);

  // Recalcul automatique des ingrédients secondaires quand on change de recette
  useEffect(() => {
    if (!isEdit) {
      setIngP(initIngredientsPrincipaux(recette));
      setIngsS(initIngredientsSecondaires(recette));
    }
  }, [recetteId]); // eslint-disable-line

  // ── Calculs dérivés ────────────────────────────────────────────────────────
  const coutTotal      = useMemo(() => calculerCoutTotal(ingPrincipal, ingsSecondaires), [ingPrincipal, ingsSecondaires]);
  const rendement      = useMemo(() => calculerRendement(qteProduite, ingPrincipal?.qte_utilisee), [qteProduite, ingPrincipal?.qte_utilisee]);
  const prixVente      = useMemo(() => calculerPrixVente(qteProduite, recette?.prix_vente_par_unite_produite ?? 0), [qteProduite, recette]);
  const marge          = useMemo(() => calculerMarge(prixVente, coutTotal), [prixVente, coutTotal]);
  const margePositive  = marge >= 0;

  // ── Mise à jour ingrédient principal ──────────────────────────────────────
  const updateIngP = (field, value) => {
    const updated = { ...ingPrincipal, [field]: value };
    updated.cout_total = Math.round(Number(updated.qte_utilisee || 0) * Number(updated.cout_unitaire_reel || 0) * 100) / 100;
    setIngP(updated);
  };

  const updateIngS = (i, updated) => {
    setIngsS((prev) => prev.map((ing, idx) => idx === i ? updated : ing));
  };

  // ── Soumission ─────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!recetteId || !date || !qteProduite) return;
    onSubmit({
      recette_id:              recetteId,
      date_production:         date,
      ingredient_principal:    ingPrincipal,
      ingredients_secondaires: ingsSecondaires,
      qte_produite_reelle:     Number(qteProduite),
      notes,
    });
  };

  const color = RECETTE_COLORS[recetteId] ?? "#6b7280";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Recette + Date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Recette</Label>
          <Select value={recetteId} onValueChange={setRecetteId} disabled={isEdit}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECETTES_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: RECETTE_COLORS[id] }} />
                    {RECETTE_LABELS[id]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Date de production</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 text-sm"
            required
          />
        </div>
      </div>

      {/* Ingrédient principal */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Ingrédient principal — {recette?.ingredient_principal?.nom ?? ""}
        </p>
        <div className="rounded-lg border-2 p-3 flex flex-col gap-2" style={{ borderColor: color + "40" }}>
          <div className="grid grid-cols-3 gap-2">
            <NumInput
              label={`Quantité (${recette?.ingredient_principal?.unite ?? "kg"})`}
              value={ingPrincipal.qte_utilisee}
              unite={recette?.ingredient_principal?.unite}
              onChange={(v) => updateIngP("qte_utilisee", v)}
            />
            <NumInput
              label="Coût unitaire réel (FCFA)"
              value={ingPrincipal.cout_unitaire_reel}
              unite="FCFA"
              onChange={(v) => updateIngP("cout_unitaire_reel", v)}
            />
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Coût total</Label>
              <div className="h-9 flex items-center px-3 rounded-md bg-background border text-sm font-semibold" style={{ color }}>
                {formatMontant(ingPrincipal.cout_total)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ingrédients secondaires */}
      {ingsSecondaires.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Ingrédients secondaires
          </p>
          <div className="flex flex-col gap-2">
            {ingsSecondaires.map((ing, i) => (
              <LigneIngredient
                key={i}
                label={ing.nom}
                ing={ing}
                onChange={(updated) => updateIngS(i, updated)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quantité produite */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Résultat de production
        </p>
        <div className="rounded-lg border p-3">
          <NumInput
            label={`Quantité produite réelle (${recette?.ingredient_principal?.unite ?? "kg"})`}
            value={qteProduite}
            unite={recette?.ingredient_principal?.unite}
            onChange={setQteProduite}
            className="max-w-xs"
          />
        </div>
      </div>

      {/* Récapitulatif calculé */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border bg-muted/30 p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Coût total matières</span>
          <span className="text-sm font-semibold">{formatMontant(coutTotal)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Rendement</span>
          <span className={cn("text-sm font-semibold", rendement < 70 ? "text-destructive" : rendement < 85 ? "text-amber-600" : "text-green-600")}>
            {formatRendement(rendement)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Prix vente estimé</span>
          <span className="text-sm font-semibold">{formatMontant(prixVente)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Marge estimée</span>
          <span className={cn("text-sm font-bold", margePositive ? "text-green-600" : "text-destructive")}>
            {margePositive ? "+" : ""}{formatMontant(marge)}
          </span>
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Notes (optionnel)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observations sur ce lot…"
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>
        <Button
          type="submit"
          disabled={loading || !recetteId || !date || !qteProduite}
          style={{ background: color }}
          className="text-white"
        >
          {loading ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Enregistrer le lot"}
        </Button>
      </div>
    </form>
  );
};

export default ProductionForm;
