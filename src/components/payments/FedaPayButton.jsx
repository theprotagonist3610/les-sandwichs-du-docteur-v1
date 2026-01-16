import { FedaCheckoutButton } from "fedapay-reactjs";
import { handleFedaPaySuccess, handleFedaPayFailed } from "@/utils/paymentToolkit";

/**
 * Composant bouton de paiement FedaPay
 * Utilise le widget React officiel de FedaPay
 */
const FedaPayButton = ({
  provider,
  amount,
  customerInfo = {},
  onSuccess,
  onFailed,
  className = "",
  disabled = false,
  children,
}) => {
  // Configuration du checkout
  const PUBLIC_KEY = provider?.api_key || import.meta.env.VITE_FEDAPAY_PUBLIC_KEY;

  const checkoutOptions = {
    public_key: PUBLIC_KEY,
    transaction: {
      amount: amount,
      description: `Paiement Les Sandwichs du Docteur - ${amount} XOF`,
    },
    currency: {
      iso: "XOF",
    },
    customer: {
      firstname: customerInfo.firstname || "Client",
      lastname: customerInfo.lastname || "LSD",
      email: customerInfo.email || "[email protected]",
      phone_number: {
        number: customerInfo.phone,
        country: "bj",
      },
    },
    button: {
      class: className || "w-full",
      text: children || `Payer ${amount} XOF avec FedaPay`,
    },
    onComplete: async (resp) => {
      const FedaPay = window["FedaPay"];

      console.log("=== FEDAPAY CALLBACK - DÉBUT ===");
      console.log("1. Response brute:", resp);
      console.log("2. Reason:", resp.reason);
      console.log("3. Transaction:", resp.transaction);
      console.log("4. Provider:", provider);
      console.log("5. Amount:", amount);
      console.log("6. Customer Info:", customerInfo);
      console.log("7. FedaPay constant DIALOG_DISMISSED:", FedaPay?.DIALOG_DISMISSED);

      if (resp.reason === FedaPay.DIALOG_DISMISSED) {
        // L'utilisateur a fermé le dialogue
        console.log("❌ Dialog fermé par l'utilisateur");

        try {
          await handleFedaPayFailed(
            {
              reason: "dismissed",
              message: "Paiement annulé par l'utilisateur",
            },
            provider
          );
        } catch (error) {
          console.error("Erreur lors de l'enregistrement de l'annulation:", error);
        }

        if (onFailed) {
          onFailed({
            reason: "dismissed",
            message: "Paiement annulé par l'utilisateur",
          });
        }
      } else {
        // Transaction complétée
        console.log("✅ Transaction complétée - Début enregistrement");
        console.log("Transaction object:", resp.transaction);

        try {
          console.log("Appel de handleFedaPaySuccess...");
          const savedTransaction = await handleFedaPaySuccess(
            resp,
            resp.transaction,
            provider
          );
          console.log("✅ Transaction enregistrée avec succès:", savedTransaction);

          if (onSuccess) {
            console.log("Appel du callback onSuccess...");
            onSuccess(resp, savedTransaction);
          }
        } catch (error) {
          console.error("❌ ERREUR lors de l'enregistrement de la transaction:");
          console.error("Type:", error.constructor.name);
          console.error("Message:", error.message);
          console.error("Stack:", error.stack);
          console.error("Détails complets:", error);

          if (onFailed) {
            onFailed(error);
          }
        }
      }
      console.log("=== FEDAPAY CALLBACK - FIN ===");
    },
  };

  // Validation
  if (!PUBLIC_KEY) {
    return (
      <div className="p-4 border border-red-500 rounded text-red-500 text-sm">
        Clé API publique FedaPay non configurée
      </div>
    );
  }

  if (!amount || amount <= 0) {
    return (
      <div className="p-4 border border-red-500 rounded text-red-500 text-sm">
        Montant invalide
      </div>
    );
  }

  if (!customerInfo?.phone || customerInfo.phone.trim() === "") {
    return (
      <div className="p-4 border border-red-500 rounded text-red-500 text-sm">
        Le numéro de téléphone est obligatoire
      </div>
    );
  }

  if (disabled || !provider?.is_active) {
    return (
      <button disabled className={`${className} opacity-50 cursor-not-allowed`}>
        {children || `Payer ${amount} XOF avec FedaPay`}
      </button>
    );
  }

  return <FedaCheckoutButton options={checkoutOptions} />;
};

export default FedaPayButton;
