import { useEffect } from "react";
import { useKKiaPay } from "kkiapay-react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { getKKiaPayConfig, handleKKiaPaySuccess, handleKKiaPayFailed } from "@/utils/paymentToolkit";

/**
 * Composant bouton de paiement KKiaPay
 */
const KKiaPayButton = ({
  provider,
  amount,
  customerInfo,
  onSuccess,
  onFailed,
  className = "",
  disabled = false,
  children,
}) => {
  const { openKkiapayWidget, addSuccessListener, addFailedListener } = useKKiaPay();

  // Configuration du provider
  const config = getKKiaPayConfig(provider);

  useEffect(() => {
    // Listener de succès
    addSuccessListener(async (response) => {
      console.log("=== KKIAPAY SUCCESS CALLBACK ===");
      console.log("Response complète:", response);
      console.log("Provider:", provider);
      console.log("Montant du paiement:", amount);

      try {
        // KKiaPay ne retourne que transactionId
        // On enrichit avec les données qu'on a côté client
        const enrichedResponse = {
          ...response,
          amount: amount, // Montant du paiement
          customer_phone: customerInfo?.phone || null, // Numéro saisi par l'utilisateur
          customer_email: customerInfo?.email || null, // Email saisi par l'utilisateur
          payment_method: "momo", // Par défaut Mobile Money
        };

        console.log("Tentative d'enregistrement dans Supabase...");
        const transaction = await handleKKiaPaySuccess(enrichedResponse, provider);
        console.log("✅ Transaction enregistrée avec succès:", transaction);

        // Callback externe si fourni
        if (onSuccess) {
          onSuccess(enrichedResponse, transaction);
        }
      } catch (error) {
        console.error("❌ ERREUR lors du traitement du succès:");
        console.error("Message:", error.message);
        console.error("Stack:", error.stack);
        console.error("Erreur complète:", error);
      }
    });

    // Listener d'échec
    addFailedListener(async (error) => {
      console.error("=== KKIAPAY FAILED CALLBACK ===");
      console.error("Error complète:", error);

      try {
        // Enrichir l'erreur avec le montant
        const enrichedError = {
          ...error,
          amount: amount,
        };

        // Enregistrer l'échec dans la base de données
        await handleKKiaPayFailed(enrichedError, provider);

        // Callback externe si fourni
        if (onFailed) {
          onFailed(enrichedError);
        }
      } catch (err) {
        console.error("❌ Erreur lors du traitement de l'échec:", err);
      }
    });
  }, [provider, onSuccess, onFailed, amount]);

  const handlePayment = () => {
    if (!config.key) {
      alert("Clé API KKiaPay non configurée");
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

    console.log("=== OUVERTURE WIDGET KKIAPAY ===");
    console.log("Config:", config);
    console.log("Amount:", amount);
    console.log("Customer Info:", customerInfo);

    openKkiapayWidget({
      amount: amount,
      key: config.key,
      sandbox: config.sandbox,
      position: config.position,
      theme: config.theme,
    });
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || !provider?.is_active}
      className={className}
      variant="default"
    >
      {disabled ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          {children || `Payer ${amount} XOF avec KKiaPay`}
        </>
      )}
    </Button>
  );
};

export default KKiaPayButton;
