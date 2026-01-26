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
  const montantTotal = commande.montant_total || 0;

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
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  isFieldDirty?.("details_commandes")
                    ? "border-amber-300 bg-amber-50/50"
                    : "bg-muted/30"
                }`}>
                {/* Info article */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.item}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(item.prix_unitaire)} / unité
                  </p>
                </div>

                {/* Contrôle quantité */}
                <div className="flex items-center gap-2">
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
                        className="w-16 text-center h-8"
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
                    <Badge variant="secondary">x{item.quantite}</Badge>
                  )}
                </div>

                {/* Total ligne */}
                <div className="text-right min-w-[100px]">
                  <p className="font-semibold">{formatPrice(item.total)}</p>
                </div>

                {/* Supprimer */}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onRemoveItem(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {/* Total */}
            <div className="flex items-center justify-between pt-3 border-t mt-4">
              <span className="font-semibold">Total articles</span>
              <span className="text-lg font-bold">{formatPrice(montantTotal)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CommandeDetailsSection;
