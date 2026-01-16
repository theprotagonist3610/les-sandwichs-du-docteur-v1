import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { initiateFeeXPayPayment } from "@/utils/paymentToolkit";

/**
 * Composant bouton de paiement FeeXpay
 */
const FeeXpayButton = ({
  provider,
  amount,
  customerInfo = {},
  onSuccess,
  onFailed,
  className = "",
  disabled = false,
  children,
}) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!provider?.api_key) {
      alert("Clé API FeeXpay non configurée");
      return;
    }

    if (!amount || amount <= 0) {
      alert("Montant invalide");
      return;
    }

    if (!customerInfo?.phone || customerInfo.phone.trim() === "") {
      alert("Le numéro de téléphone est obligatoire");
      return;
    }

    try {
      setLoading(true);

      // Initialiser le paiement
      const response = await initiateFeeXPayPayment(provider, amount, customerInfo);

      // Rediriger vers la page de paiement FeeXpay
      if (response.payment_url) {
        window.location.href = response.payment_url;
      } else {
        // Si pas de redirection, traiter comme succès
        if (onSuccess) {
          onSuccess(response);
        }
      }
    } catch (error) {
      console.error("Erreur lors du paiement FeeXpay:", error);
      alert("Erreur lors de l'initialisation du paiement");

      if (onFailed) {
        onFailed(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || !provider?.is_active || loading}
      className={className}
      variant="default"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          {children || `Payer ${amount} XOF avec FeeXpay`}
        </>
      )}
    </Button>
  );
};

export default FeeXpayButton;
