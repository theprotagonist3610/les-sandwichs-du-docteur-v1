import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Banknote,
  Smartphone,
  Tag,
  Percent,
  Calculator,
} from "lucide-react";

/**
 * Section paiement (détails, promotion, statut)
 */
const CommandePaiementSection = ({
  commande,
  canEdit,
  onUpdatePaiement,
  isFieldDirty,
}) => {
  if (!commande) return null;

  const paiement = commande.details_paiement || {};

  // Calculs
  const total = paiement.total || commande.montant_total || 0;
  const fraisLivraison = commande.frais_livraison || 0;
  const totalAvecFrais = total + fraisLivraison;

  // Réduction
  let reduction = 0;
  if (commande.promotion) {
    if (commande.promotion.type === "pourcentage") {
      reduction = (totalAvecFrais * commande.promotion.valeur) / 100;
    } else {
      reduction = commande.promotion.valeur || 0;
    }
  }

  const totalApresReduction = paiement.total_apres_reduction || totalAvecFrais - reduction;
  const momo = paiement.momo || 0;
  const cash = paiement.cash || 0;
  const autre = paiement.autre || 0;
  const totalPaye = momo + cash + autre;
  const resteAPayer = Math.max(0, totalApresReduction - totalPaye);

  // Formater le prix
  const formatPrice = (price) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  // Mettre à jour un champ de paiement
  const handlePaiementChange = (field, value) => {
    if (canEdit || field === "momo" || field === "cash" || field === "autre") {
      onUpdatePaiement({ [field]: parseInt(value) || 0 });
    }
  };

  // Badge statut paiement
  const getStatutPaiementBadge = () => {
    const classes = {
      "non-payee": "bg-red-500",
      "partiellement-payee": "bg-amber-500",
      payee: "bg-emerald-500",
    };
    const labels = {
      "non-payee": "Non payée",
      "partiellement-payee": "Partielle",
      payee: "Payée",
    };

    return (
      <Badge className={classes[commande.statut_paiement]}>
        {labels[commande.statut_paiement] || commande.statut_paiement}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Paiement
          {getStatutPaiementBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Récapitulatif */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sous-total articles</span>
            <span>{formatPrice(commande.montant_total || 0)}</span>
          </div>

          {fraisLivraison > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frais de livraison</span>
              <span>{formatPrice(fraisLivraison)}</span>
            </div>
          )}

          {commande.promotion && (
            <div className="flex justify-between text-green-600">
              <span className="flex items-center gap-1">
                {commande.promotion.type === "pourcentage" ? (
                  <Percent className="h-3 w-3" />
                ) : (
                  <Tag className="h-3 w-3" />
                )}
                Promotion
                {commande.promotion.code && ` (${commande.promotion.code})`}
              </span>
              <span>-{formatPrice(reduction)}</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between font-semibold text-base">
            <span>Total à payer</span>
            <span>{formatPrice(totalApresReduction)}</span>
          </div>
        </div>

        <Separator />

        {/* Méthodes de paiement */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Paiements reçus
          </Label>

          {/* Mobile Money */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 min-w-[100px]">
              <Smartphone className="h-4 w-4 text-orange-500" />
              <span className="text-sm">Mobile</span>
            </div>
            <Input
              type="number"
              value={momo}
              onChange={(e) => handlePaiementChange("momo", e.target.value)}
              min="0"
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-12">FCFA</span>
          </div>

          {/* Cash */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 min-w-[100px]">
              <Banknote className="h-4 w-4 text-green-500" />
              <span className="text-sm">Espèces</span>
            </div>
            <Input
              type="number"
              value={cash}
              onChange={(e) => handlePaiementChange("cash", e.target.value)}
              min="0"
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-12">FCFA</span>
          </div>

          {/* Autre */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 min-w-[100px]">
              <CreditCard className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Autre</span>
            </div>
            <Input
              type="number"
              value={autre}
              onChange={(e) => handlePaiementChange("autre", e.target.value)}
              min="0"
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-12">FCFA</span>
          </div>
        </div>

        <Separator />

        {/* Résumé paiements */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total payé</span>
            <span className="text-green-600 font-medium">
              {formatPrice(totalPaye)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Reste à payer</span>
            <span
              className={`font-medium ${
                resteAPayer > 0 ? "text-red-600" : "text-green-600"
              }`}>
              {formatPrice(resteAPayer)}
            </span>
          </div>
        </div>

        {/* Indicateur visuel */}
        {totalApresReduction > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                totalPaye >= totalApresReduction
                  ? "bg-green-500"
                  : totalPaye > 0
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  (totalPaye / totalApresReduction) * 100
                )}%`,
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CommandePaiementSection;
