/**
 * RecetteConfig.jsx
 * Formulaire de configuration d'une recette (ingrédients, prix de vente, rendement estimé).
 */

import { useState } from "react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { RECETTE_COLORS } from "@/utils/productionToolkit";

const UNITES = ["kg", "g", "L", "cl", "ml", "unité", "sachet", "boîte"];

const SelectUnite = ({ value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
  >
    {UNITES.map((u) => <option key={u} value={u}>{u}</option>)}
  </select>
);

const RecetteConfig = ({ recette, onSave, onCancel, loading }) => {
  const color = RECETTE_COLORS[recette?.id] ?? "#6b7280";

  const [ingPrincipal, setIngP] = useState({
    nom:   recette?.ingredient_principal?.nom   ?? "",
    unite: recette?.ingredient_principal?.unite ?? "kg",
  });

  const [ingsSecondaires, setIngsS] = useState(
    (recette?.ingredients_secondaires ?? []).map((i) => ({ ...i })),
  );

  const [prixVente,    setPrixVente]    = useState(recette?.prix_vente_par_unite_produite ?? 0);
  const [rendEstime,   setRendEstime]   = useState(recette?.rendement_estime_pct         ?? 85);

  const ajouterIngredient = () =>
    setIngsS((prev) => [...prev, { nom: "", unite: "kg", qte_par_kg_principal: "", cout_estime_unitaire: "" }]);

  const supprimerIngredient = (i) =>
    setIngsS((prev) => prev.filter((_, idx) => idx !== i));

  const updateIng = (i, field, value) =>
    setIngsS((prev) => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));

  const handleSave = (e) => {
    e.preventDefault();
    onSave(recette.id, {
      ingredient_principal:         ingPrincipal,
      ingredients_secondaires:      ingsSecondaires.map((i) => ({
        ...i,
        qte_par_kg_principal:   Number(i.qte_par_kg_principal   || 0),
        cout_estime_unitaire:   Number(i.cout_estime_unitaire   || 0),
      })),
      prix_vente_par_unite_produite: Number(prixVente),
      rendement_estime_pct:          Number(rendEstime),
    });
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">

      {/* Ingrédient principal */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Ingrédient principal
        </p>
        <div className="rounded-lg border-2 p-3 flex gap-2" style={{ borderColor: color + "50" }}>
          <div className="flex-1 flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Nom</Label>
            <Input
              value={ingPrincipal.nom}
              onChange={(e) => setIngP({ ...ingPrincipal, nom: e.target.value })}
              placeholder="ex: Viande hachée"
              className="h-9 text-sm"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Unité</Label>
            <SelectUnite value={ingPrincipal.unite} onChange={(v) => setIngP({ ...ingPrincipal, unite: v })} />
          </div>
        </div>
      </div>

      {/* Ingrédients secondaires */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ingrédients secondaires
          </p>
          <Button type="button" variant="outline" size="sm" onClick={ajouterIngredient} className="h-7 px-2 text-xs gap-1">
            <Plus className="w-3 h-3" /> Ajouter
          </Button>
        </div>

        {ingsSecondaires.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-2">Aucun ingrédient secondaire configuré.</p>
        )}

        <div className="flex flex-col gap-2">
          {ingsSecondaires.map((ing, i) => (
            <div key={i} className="rounded-lg border bg-muted/30 p-3">
              <div className="grid grid-cols-[1fr_80px_100px_110px_32px] gap-2 items-end">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Nom</Label>
                  <Input
                    value={ing.nom}
                    onChange={(e) => updateIng(i, "nom", e.target.value)}
                    placeholder="ex: Oignons"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Unité</Label>
                  <SelectUnite value={ing.unite} onChange={(v) => updateIng(i, "unite", v)} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Qté / kg principal</Label>
                  <Input
                    type="number" min={0} step="any"
                    value={ing.qte_par_kg_principal}
                    onChange={(e) => updateIng(i, "qte_par_kg_principal", e.target.value)}
                    placeholder="0.2"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Coût estimé (FCFA)</Label>
                  <Input
                    type="number" min={0}
                    value={ing.cout_estime_unitaire}
                    onChange={(e) => updateIng(i, "cout_estime_unitaire", e.target.value)}
                    placeholder="500"
                    className="h-8 text-sm"
                  />
                </div>
                <Button
                  type="button" variant="ghost" size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => supprimerIngredient(i)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prix de vente + rendement estimé */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Paramètres de production
        </p>
        <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">
              Prix de vente par {ingPrincipal.unite} produit (FCFA)
            </Label>
            <Input
              type="number" min={0}
              value={prixVente}
              onChange={(e) => setPrixVente(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Rendement estimé (%)</Label>
            <Input
              type="number" min={1} max={200}
              value={rendEstime}
              onChange={(e) => setRendEstime(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={loading} style={{ background: color }} className="text-white">
          {loading ? "Sauvegarde…" : "Sauvegarder"}
        </Button>
      </div>
    </form>
  );
};

export default RecetteConfig;
