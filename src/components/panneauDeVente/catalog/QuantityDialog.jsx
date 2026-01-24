import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Delete, Check, X } from "lucide-react";

/**
 * Dialog calculatrice pour saisir la quantité d'un article
 */
const QuantityDialog = ({
  open,
  onOpenChange,
  menu,
  currentQuantity = 0,
  onConfirm,
}) => {
  const [quantity, setQuantity] = useState("0");

  // Réinitialiser la quantité quand le dialog s'ouvre
  useEffect(() => {
    if (open) {
      setQuantity(currentQuantity > 0 ? currentQuantity.toString() : "");
    }
  }, [open, currentQuantity]);

  // Gérer l'appui sur un chiffre
  const handleDigit = (digit) => {
    setQuantity((prev) => {
      // Si c'est "0" ou vide, remplacer par le nouveau chiffre
      if (prev === "0" || prev === "") {
        return digit;
      }
      // Limiter à 3 chiffres (max 999)
      if (prev.length >= 3) {
        return prev;
      }
      return prev + digit;
    });
  };

  // Effacer le dernier chiffre
  const handleBackspace = () => {
    setQuantity((prev) => {
      if (prev.length <= 1) {
        return "";
      }
      return prev.slice(0, -1);
    });
  };

  // Effacer tout
  const handleClear = () => {
    setQuantity("");
  };

  // Confirmer
  const handleConfirm = () => {
    const qty = parseInt(quantity, 10) || 0;
    onConfirm(menu, qty);
    onOpenChange(false);
  };

  // Calculer le total
  const total = (parseInt(quantity, 10) || 0) * (menu?.prix || 0);

  // Touches du clavier
  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];

  if (!menu) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[320px] p-0 gap-0">
        {/* Header avec info article */}
        <DialogHeader className="p-4 pb-3 border-b">
          <DialogTitle className="text-base font-medium text-left">
            {menu.nom}
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-left">
            {menu.prix?.toLocaleString("fr-FR")} F / unité
          </p>
        </DialogHeader>

        {/* Affichage quantité et total */}
        <div className="p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Quantité</span>
            <span className="text-3xl font-bold font-mono text-primary">
              {quantity || "0"}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">Total</span>
            <span className="text-xl font-bold text-primary">
              {total.toLocaleString("fr-FR")} F
            </span>
          </div>
        </div>

        {/* Clavier numérique */}
        <div className="grid grid-cols-3 gap-1 p-3">
          {digits.map((digit) => (
            <Button
              key={digit}
              variant={digit === "C" ? "destructive" : "outline"}
              className={cn(
                "h-14 text-xl font-semibold",
                digit === "⌫" && "text-orange-600"
              )}
              onClick={() => {
                if (digit === "C") {
                  handleClear();
                } else if (digit === "⌫") {
                  handleBackspace();
                } else {
                  handleDigit(digit);
                }
              }}>
              {digit === "⌫" ? <Delete className="w-5 h-5" /> : digit}
            </Button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-3 pt-0">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Annuler
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            disabled={!quantity || quantity === "0"}>
            <Check className="w-4 h-4 mr-2" />
            Confirmer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuantityDialog;
