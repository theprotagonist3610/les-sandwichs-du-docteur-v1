import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Plus, Minus, Trash2, Package } from "lucide-react";

/**
 * Section des détails de commande (items)
 */
const CommandeDetailsSection = ({
  commande,
  canEdit,
  onAddItem,
  onRemoveItem,
  onUpdateQuantity,
  isFieldDirty,
}) => {
  if (!commande) return null;

  const details = commande.details_commandes || [];

  // Formater le prix
  const formatPrice = (price) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Détails de la commande
            <Badge variant="secondary" className="ml-2">
              {details.length} article{details.length > 1 ? "s" : ""}
            </Badge>
          </CardTitle>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onAddItem}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {details.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Aucun article dans cette commande</p>
            {canEdit && (
              <Button variant="link" onClick={onAddItem} className="mt-2">
                Ajouter un article
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {details.map((item, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border space-y-2 ${
                  isFieldDirty?.("details_commandes")
                    ? "border-amber-300 bg-amber-50/50"
                    : "bg-muted/30"
                }`}>
                {/* Ligne 1: Info article [item | prix unitaire] */}
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate flex-1">{item.item}</p>
                  <p className="text-sm text-muted-foreground ml-2">
                    {formatPrice(item.prix_unitaire)}
                  </p>
                </div>

                {/* Ligne 2: Contrôle quantité [- input +] */}
                <div className="flex items-center justify-center gap-2">
                  {canEdit ? (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onUpdateQuantity(index, item.quantite - 1)}
                        disabled={item.quantite <= 1}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantite}
                        onChange={(e) =>
                          onUpdateQuantity(index, parseInt(e.target.value) || 1)
                        }
                        className="w-20 text-center h-8"
                        min="1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onUpdateQuantity(index, item.quantite + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <Badge variant="secondary" className="text-base px-4 py-1">
                      x{item.quantite}
                    </Badge>
                  )}
                </div>

                {/* Ligne 3: Total [Total | icône supprimer] */}
                <div className="flex items-center justify-between pt-1 border-t border-dashed">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{formatPrice(item.total)}</p>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onRemoveItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CommandeDetailsSection;
