import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag, X, Loader2, Check } from "lucide-react";

/**
 * Champ de saisie du code promo
 */
const PromoInput = ({
  promotion,
  onApply,
  onRemove,
  disabled = false,
  className,
}) => {
  const [code, setCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    if (!code.trim()) return;

    setIsApplying(true);
    try {
      const result = await onApply(code.trim());
      if (result.success) {
        setCode("");
      }
    } finally {
      setIsApplying(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  // Si une promo est déjà appliquée
  if (promotion) {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-2.5 bg-green-50 border border-green-200 rounded-lg",
          className
        )}>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700">Code promo appliqué</span>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            {promotion.code}
            {promotion.type === "pourcentage"
              ? ` -${promotion.valeur}%`
              : ` -${promotion.valeur.toLocaleString("fr-FR")}F`}
          </Badge>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
          onClick={onRemove}
          disabled={disabled}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Champ de saisie
  return (
    <div className={cn("flex gap-2", className)}>
      <div className="relative flex-1">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Code promo"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          disabled={disabled || isApplying}
          className="pl-9 h-9 uppercase"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleApply}
        disabled={disabled || isApplying || !code.trim()}
        className="h-9 px-4">
        {isApplying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Appliquer"
        )}
      </Button>
    </div>
  );
};

export default PromoInput;
