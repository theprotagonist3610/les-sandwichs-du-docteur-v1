import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const OPTIONS_DEFAUT = [
  { id: "jambon", label: "Jambon" },
  { id: "saucisson", label: "Saucisson" },
  { id: "omelette", label: "Omelette" },
  { id: "supp_viande", label: "Suppl. viande" },
  { id: "supp_poisson", label: "Suppl. poisson" },
  { id: "supp_fromage", label: "Suppl. fromage" },
];

const ETAT_INITIAL_OPTIONS = OPTIONS_DEFAUT.map((opt) => ({
  ...opt,
  selected: false,
  prix: "",
}));

/**
 * Dialogue de personnalisation du sandwich
 * @param {boolean} open - État d'ouverture du dialogue
 * @param {Function} onOpenChange - Callback de changement d'état
 * @param {Object} menu - Le menu "Sandwich personnalisé" original
 * @param {Function} onConfirm - Callback lors de la confirmation (fakeMenu, quantite)
 */
const SandwichPersonnaliseDialog = ({ open, onOpenChange, menu, onConfirm }) => {
  const [options, setOptions] = useState(ETAT_INITIAL_OPTIONS);
  const [quantite, setQuantite] = useState(1);
  const [prixSandwich, setPrixSandwich] = useState("");

  const toggleOption = (id) => {
    setOptions((prev) =>
      prev.map((opt) => (opt.id === id ? { ...opt, selected: !opt.selected } : opt))
    );
  };

  const setOptionPrix = (id, value) => {
    setOptions((prev) =>
      prev.map((opt) => (opt.id === id ? { ...opt, prix: value } : opt))
    );
  };

  const resetEtat = () => {
    setOptions(ETAT_INITIAL_OPTIONS);
    setQuantite(1);
    setPrixSandwich("");
  };

  const handleOpenChange = (val) => {
    if (!val) resetEtat();
    onOpenChange(val);
  };

  const selectedOptions = options.filter((opt) => opt.selected);
  const prixBase = parseFloat(prixSandwich) || 0;
  const prixAjouts = selectedOptions.reduce((sum, opt) => sum + (parseFloat(opt.prix) || 0), 0);
  const prixUnitaire = prixBase + prixAjouts;
  const canConfirm = prixBase > 0 && quantite >= 1;

  const handleConfirm = () => {
    const optionsJson = selectedOptions.map((opt) => ({
      item: opt.label,
      prix: parseFloat(opt.prix) || 0,
    }));

    const formattedNom = `Sandwich personnalisé ${JSON.stringify(optionsJson)}`;

    const fakeMenu = {
      ...menu,
      id: `${menu.id}-custom-${Date.now()}`,
      nom: formattedNom,
      nom_court: "Sandwich personnalisé",
      prix: prixUnitaire,
    };

    onConfirm(fakeMenu, quantite);
    resetEtat();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sandwich personnalisé</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Prix du sandwich */}
          <div className="flex items-center gap-3">
            <Label className="w-24 font-semibold">Prix (F)</Label>
            <Input
              type="number"
              placeholder="Prix du sandwich"
              value={prixSandwich}
              onChange={(e) => setPrixSandwich(e.target.value)}
              className="flex-1 h-9"
              min="0"
              autoFocus
            />
          </div>

          {/* Séparateur */}
          <div className="border-t pt-2">
            <p className="text-sm text-muted-foreground mb-3">Garnitures</p>

            {/* Options */}
            <div className="space-y-3">
              {options.map((opt) => (
                <div key={opt.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`sp-${opt.id}`}
                    checked={opt.selected}
                    onCheckedChange={() => toggleOption(opt.id)}
                  />
                  <Label htmlFor={`sp-${opt.id}`} className="w-24 cursor-pointer">
                    {opt.label}
                  </Label>
                  <Input
                    type="number"
                    placeholder="Prix (F)"
                    value={opt.prix}
                    onChange={(e) => setOptionPrix(opt.id, e.target.value)}
                    disabled={!opt.selected}
                    className="flex-1 h-9"
                    min="0"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quantité */}
          <div className="flex items-center gap-3 pt-1">
            <Label className="w-24">Quantité</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQuantite((q) => Math.max(1, q - 1))}>
                −
              </Button>
              <span className="w-8 text-center font-semibold text-base">
                {quantite}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQuantite((q) => q + 1)}>
                +
              </Button>
            </div>
          </div>

          {/* Récapitulatif */}
          {prixBase > 0 && (
            <div className="space-y-1 pt-2 border-t">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Sandwich</span>
                <span>{prixBase.toLocaleString("fr-FR")} F</span>
              </div>
              {prixAjouts > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Ajouts</span>
                  <span>+ {prixAjouts.toLocaleString("fr-FR")} F</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t">
                <span className="text-sm text-muted-foreground">
                  {quantite > 1 ? `${quantite} × ${prixUnitaire.toLocaleString("fr-FR")} F` : "Total"}
                </span>
                <span className="font-bold text-primary text-base">
                  {(prixUnitaire * quantite).toLocaleString("fr-FR")} F
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            Ajouter au panier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SandwichPersonnaliseDialog;
