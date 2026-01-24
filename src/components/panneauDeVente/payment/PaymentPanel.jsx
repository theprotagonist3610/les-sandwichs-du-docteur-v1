import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Smartphone,
  Banknote,
  CreditCard,
  Check,
  X,
  Loader2,
  Calculator,
} from "lucide-react";

/**
 * Panneau de paiement avec sélection des méthodes
 */
const PaymentPanel = ({
  total,
  totalPaid,
  remainingAmount,
  onRecordPayment,
  onResetPayments,
  onPayRemainingInCash,
  onSubmit,
  onClose,
  isSubmitting,
  canSubmit,
  payments, // { momo: 0, cash: 0, autre: 0 }
  className,
}) => {
  const [activeMethod, setActiveMethod] = useState(null);
  const [amount, setAmount] = useState("");

  const methods = [
    {
      id: "momo",
      label: "Mobile Money",
      icon: Smartphone,
      color: "bg-yellow-500",
    },
    {
      id: "cash",
      label: "Espèces",
      icon: Banknote,
      color: "bg-green-500",
    },
    {
      id: "autre",
      label: "Autre",
      icon: CreditCard,
      color: "bg-purple-500",
    },
  ];

  const handleMethodClick = (methodId) => {
    setActiveMethod(methodId);
    setAmount(remainingAmount.toString());
  };

  const handleAmountChange = (value) => {
    // Accepter uniquement les nombres
    const numValue = value.replace(/[^0-9]/g, "");
    setAmount(numValue);
  };

  const handleRecordPayment = () => {
    if (!activeMethod || !amount) return;

    const numAmount = parseInt(amount, 10);
    if (numAmount <= 0) return;

    // Ajouter au montant existant
    const currentAmount = payments[activeMethod] || 0;
    onRecordPayment(activeMethod, currentAmount + numAmount);

    setAmount("");
    setActiveMethod(null);
  };

  const isFullyPaid = remainingAmount <= 0;

  // Raccourcis montants
  const quickAmounts = [500, 1000, 2000, 5000];

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <h3 className="font-semibold text-lg">Paiement</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Résumé */}
      <div className="py-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total à payer</span>
          <span className="font-semibold">{total.toLocaleString("fr-FR")} F</span>
        </div>

        {/* Paiements enregistrés */}
        {payments.momo > 0 && (
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-2 text-yellow-600">
              <Smartphone className="w-4 h-4" />
              Mobile Money
            </span>
            <span>{payments.momo.toLocaleString("fr-FR")} F</span>
          </div>
        )}
        {payments.cash > 0 && (
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-2 text-green-600">
              <Banknote className="w-4 h-4" />
              Espèces
            </span>
            <span>{payments.cash.toLocaleString("fr-FR")} F</span>
          </div>
        )}
        {payments.autre > 0 && (
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-2 text-purple-600">
              <CreditCard className="w-4 h-4" />
              Autre
            </span>
            <span>{payments.autre.toLocaleString("fr-FR")} F</span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between items-center">
          <span className="font-medium">Reste à payer</span>
          <span
            className={cn(
              "font-bold text-lg",
              isFullyPaid ? "text-green-600" : "text-primary"
            )}>
            {isFullyPaid ? (
              <span className="flex items-center gap-1">
                <Check className="w-5 h-5" />
                Payé
              </span>
            ) : (
              `${remainingAmount.toLocaleString("fr-FR")} F`
            )}
          </span>
        </div>

        {totalPaid > 0 && !isFullyPaid && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={onResetPayments}>
            Annuler les paiements
          </Button>
        )}
      </div>

      {/* Méthodes de paiement */}
      {!isFullyPaid && (
        <>
          <div className="space-y-3 py-4">
            <Label>Méthode de paiement</Label>
            <div className="grid grid-cols-3 gap-2">
              {methods.map((method) => {
                const Icon = method.icon;
                const isActive = activeMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => handleMethodClick(method.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}>
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white",
                        method.color
                      )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saisie montant */}
          {activeMethod && (
            <div className="space-y-3 py-4 border-t">
              <Label>Montant</Label>

              {/* Raccourcis */}
              <div className="flex gap-2 flex-wrap">
                {quickAmounts.map((qa) => (
                  <Button
                    key={qa}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(qa.toString())}>
                    {qa.toLocaleString("fr-FR")} F
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(remainingAmount.toString())}>
                  <Calculator className="w-3.5 h-3.5 mr-1" />
                  Reste ({remainingAmount.toLocaleString("fr-FR")} F)
                </Button>
              </div>

              {/* Champ montant */}
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="Montant"
                  className="flex-1 text-lg font-mono"
                />
                <Button onClick={handleRecordPayment} disabled={!amount}>
                  Enregistrer
                </Button>
              </div>
            </div>
          )}

          {/* Bouton payer tout en cash */}
          {remainingAmount > 0 && !activeMethod && (
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={onPayRemainingInCash}>
              <Banknote className="w-4 h-4 mr-2" />
              Payer le reste en espèces
            </Button>
          )}
        </>
      )}

      {/* Actions finales */}
      <div className="mt-auto pt-4 border-t space-y-2">
        <Button
          size="lg"
          className="w-full"
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Validation en cours...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              {isFullyPaid ? "Valider la commande" : "Valider (non payée)"}
            </>
          )}
        </Button>

        <Button variant="ghost" className="w-full" onClick={onClose}>
          Annuler
        </Button>
      </div>
    </div>
  );
};

export default PaymentPanel;
