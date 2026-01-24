import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TestTube2, AlertCircle, CheckCircle } from "lucide-react";
import KKiaPayButton from "./KKiaPayButton";
import FeeXpayButton from "./FeeXpayButton";

/**
 * Interface de test des paiements
 */
const PaymentTestInterface = ({ provider }) => {
  const [amount, setAmount] = useState(100);
  const [customerInfo, setCustomerInfo] = useState({
    phone: "97000000",
    email: "[email protected]",
  });
  const [lastResult, setLastResult] = useState(null);

  const handleSuccess = (response, transaction) => {
    setLastResult({
      type: "success",
      message: "Paiement test réussi !",
      data: { response, transaction },
    });
  };

  const handleFailed = (error) => {
    setLastResult({
      type: "error",
      message: "Paiement test échoué",
      data: error,
    });
  };

  if (!provider?.is_sandbox) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Les tests ne sont disponibles qu'en mode Sandbox. Veuillez activer le mode Sandbox pour
          tester les paiements.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TestTube2 className="h-5 w-5 text-primary" />
          <CardTitle>Interface de test - {provider.display_name}</CardTitle>
        </div>
        <CardDescription>
          Testez les paiements en mode sandbox sans utiliser de vraies transactions
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Formulaire de test */}
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="test_amount">Montant (XOF)</Label>
            <Input
              id="test_amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              min="1"
              placeholder="100"
            />
          </div>

          {/* Champs téléphone et email pour tous les providers */}
          <div className="space-y-2">
            <Label htmlFor="test_phone">
              Téléphone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="test_phone"
              type="tel"
              value={customerInfo.phone}
              onChange={(e) =>
                setCustomerInfo({ ...customerInfo, phone: e.target.value })
              }
              placeholder="97000000"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test_email">Email (optionnel)</Label>
            <Input
              id="test_email"
              type="email"
              value={customerInfo.email}
              onChange={(e) =>
                setCustomerInfo({ ...customerInfo, email: e.target.value })
              }
              placeholder="[email protected]"
            />
          </div>
        </div>

        {/* Bouton de paiement */}
        <div className="pt-2">
          {provider.provider_name === "kkiapay" ? (
            <KKiaPayButton
              provider={provider}
              amount={amount}
              customerInfo={customerInfo}
              onSuccess={handleSuccess}
              onFailed={handleFailed}
              className="w-full"
            >
              Tester le paiement KKiaPay
            </KKiaPayButton>
          ) : provider.provider_name === "feexpay" ? (
            <FeeXpayButton
              provider={provider}
              amount={amount}
              customerInfo={customerInfo}
              onSuccess={handleSuccess}
              onFailed={handleFailed}
              className="w-full"
            >
              Tester le paiement FeeXpay
            </FeeXpayButton>
          ) : null}
        </div>

        {/* Résultat du dernier test */}
        {lastResult && (
          <Alert variant={lastResult.type === "success" ? "default" : "destructive"}>
            {lastResult.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <div className="font-medium">{lastResult.message}</div>
              {lastResult.data && (
                <pre className="mt-2 text-xs overflow-auto max-h-32">
                  {JSON.stringify(lastResult.data, null, 2)}
                </pre>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions de test */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Mode test activé :</strong> Utilisez les numéros de test fournis par{" "}
            {provider.display_name} pour simuler des transactions. Aucun argent réel ne sera
            débité.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default PaymentTestInterface;
