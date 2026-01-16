import { supabase } from "@/config/supabase";

/**
 * Toolkit pour la gestion des agrégateurs de paiement
 */

// ==================== PAYMENT PROVIDERS ====================

/**
 * Récupère tous les providers de paiement
 */
export const getAllPaymentProviders = async () => {
  const { data, error } = await supabase
    .from("payment_providers")
    .select("*")
    .order("display_name");

  if (error) throw error;
  return data;
};

/**
 * Récupère un provider spécifique par son nom
 */
export const getPaymentProviderByName = async (providerName) => {
  const { data, error } = await supabase
    .from("payment_providers")
    .select("*")
    .eq("provider_name", providerName)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Récupère les providers actifs uniquement
 */
export const getActivePaymentProviders = async () => {
  const { data, error } = await supabase
    .from("payment_providers")
    .select("*")
    .eq("is_active", true)
    .order("display_name");

  if (error) throw error;
  return data;
};

/**
 * Met à jour la configuration d'un provider
 */
export const updatePaymentProvider = async (providerId, updates) => {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("payment_providers")
    .update({
      ...updates,
      updated_by: userData?.user?.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", providerId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Active ou désactive un provider
 */
export const togglePaymentProvider = async (providerId, isActive) => {
  return updatePaymentProvider(providerId, { is_active: isActive });
};

/**
 * Bascule entre mode sandbox et production
 */
export const toggleSandboxMode = async (providerId, isSandbox) => {
  return updatePaymentProvider(providerId, { is_sandbox: isSandbox });
};

/**
 * Configure les clés API d'un provider
 */
export const configureProviderKeys = async (
  providerId,
  apiKey,
  apiSecret = null,
  additionalConfig = {}
) => {
  return updatePaymentProvider(providerId, {
    api_key: apiKey,
    api_secret: apiSecret,
    config: additionalConfig,
  });
};

// ==================== PAYMENT TRANSACTIONS ====================

/**
 * Enregistre une nouvelle transaction
 */
export const createPaymentTransaction = async (transactionData) => {
  console.log("📝 createPaymentTransaction - Données à insérer:", transactionData);

  const { data, error } = await supabase
    .from("payment_transactions")
    .insert([transactionData])
    .select()
    .single();

  if (error) {
    console.error("❌ Erreur Supabase lors de l'insertion:", error);
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    console.error("Details:", error.details);
    console.error("Hint:", error.hint);
    throw error;
  }

  console.log("✅ Transaction enregistrée dans Supabase:", data);
  return data;
};

/**
 * Met à jour le statut d'une transaction
 */
export const updateTransactionStatus = async (
  transactionId,
  status,
  metadata = {}
) => {
  const { data, error } = await supabase
    .from("payment_transactions")
    .update({
      status,
      metadata: metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("transaction_id", transactionId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Récupère toutes les transactions avec filtres optionnels
 */
export const getPaymentTransactions = async (filters = {}) => {
  let query = supabase.from("payment_transactions").select(`
      *,
      payment_providers (
        display_name,
        provider_name
      )
    `);

  // Filtres optionnels
  if (filters.providerId) {
    query = query.eq("provider_id", filters.providerId);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.isSandbox !== undefined) {
    query = query.eq("is_sandbox", filters.isSandbox);
  }
  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  // Limite et ordre
  query = query.order("created_at", { ascending: false });
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
};

/**
 * Récupère une transaction par son ID
 */
export const getTransactionById = async (transactionId) => {
  const { data, error } = await supabase
    .from("payment_transactions")
    .select(
      `
      *,
      payment_providers (
        display_name,
        provider_name
      )
    `
    )
    .eq("transaction_id", transactionId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Récupère les statistiques des transactions
 */
export const getTransactionStats = async (providerId = null) => {
  let query = supabase.from("payment_transactions").select("status, amount");

  if (providerId) {
    query = query.eq("provider_id", providerId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Calcul des statistiques
  const stats = {
    total: data.length,
    success: data.filter((t) => t.status === "success").length,
    pending: data.filter((t) => t.status === "pending").length,
    failed: data.filter((t) => t.status === "failed").length,
    cancelled: data.filter((t) => t.status === "cancelled").length,
    totalAmount: data
      .filter((t) => t.status === "success")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0),
  };

  return stats;
};

// ==================== KKIAPAY HELPERS ====================

/**
 * Prépare la configuration pour KKiaPay
 */
export const getKKiaPayConfig = (provider) => {
  const envKey = import.meta.env.VITE_KKIAPAY_PUBLIC_KEY;
  const apiKey = provider?.api_key || envKey;

  return {
    key: apiKey,
    sandbox: provider?.is_sandbox ?? true,
    position: "center",
    theme: "#a41624", // Couleur theme de l'app
  };
};

/**
 * Callback de succès KKiaPay
 */
export const handleKKiaPaySuccess = async (response, provider) => {
  try {
    const transaction = {
      provider_id: provider.id,
      provider_name: "kkiapay",
      transaction_id: response.transactionId,
      amount: parseFloat(response.amount),
      currency: "XOF",
      status: "success",
      payment_method: response.payment_method || response.paymentMethod || "momo",
      customer_phone: response.customer_phone || response.phone || null,
      customer_email: response.customer_email || response.email || null,
      metadata: response,
      is_sandbox: provider.is_sandbox,
    };

    return await createPaymentTransaction(transaction);
  } catch (error) {
    console.error(
      "Erreur lors de l'enregistrement de la transaction KKiaPay:",
      error
    );
    throw error;
  }
};

/**
 * Callback d'échec KKiaPay
 */
export const handleKKiaPayFailed = async (error, provider) => {
  console.error("Échec du paiement KKiaPay:", error);

  try {
    if (error.transactionId) {
      const transaction = {
        provider_id: provider.id,
        provider_name: "kkiapay",
        transaction_id: error.transactionId,
        amount: error.amount || 0,
        currency: "XOF",
        status: "failed",
        metadata: error,
        is_sandbox: provider.is_sandbox,
      };

      await createPaymentTransaction(transaction);
    }
  } catch (err) {
    console.error("Erreur lors de l'enregistrement de l'échec:", err);
  }
};

// ==================== FEEXPAY HELPERS ====================

/**
 * Prépare la configuration pour FeeXpay
 */
export const getFeeXPayConfig = (provider) => {
  const envKey = import.meta.env.VITE_FEEXPAY_API_KEY;
  const apiKey = provider?.api_key || envKey;

  return {
    apiKey: apiKey,
    mode: provider?.is_sandbox ? "SANDBOX" : "LIVE",
    shopName: "Les Sandwichs du Docteur",
    shopDescription: "Sandwicherie healthy",
  };
};

/**
 * Initie un paiement FeeXpay
 */
export const initiateFeeXPayPayment = async (
  provider,
  amount,
  customerInfo = {}
) => {
  const config = getFeeXPayConfig(provider);
  const apiUrl = provider.is_sandbox
    ? "https://sandbox.feexpay.me/api"
    : "https://api.feexpay.me/api";

  try {
    const response = await fetch(`${apiUrl}/payments/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        amount,
        currency: "XOF",
        description: `Paiement ${config.shopName}`,
        customer: customerInfo,
      }),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de l'initialisation du paiement FeeXpay");
    }

    const data = await response.json();

    // Enregistrer la transaction en pending
    const transaction = {
      provider_id: provider.id,
      provider_name: "feexpay",
      transaction_id: data.transaction_id,
      amount,
      currency: "XOF",
      status: "pending",
      customer_phone: customerInfo.phone,
      customer_email: customerInfo.email,
      metadata: data,
      is_sandbox: provider.is_sandbox,
    };

    await createPaymentTransaction(transaction);

    return data;
  } catch (error) {
    console.error("Erreur FeeXpay:", error);
    throw error;
  }
};

/**
 * Vérifie le statut d'un paiement FeeXpay
 */
export const verifyFeeXPayPayment = async (provider, transactionId) => {
  const config = getFeeXPayConfig(provider);
  const apiUrl = provider.is_sandbox
    ? "https://sandbox.feexpay.me/api"
    : "https://api.feexpay.me/api";

  try {
    const response = await fetch(`${apiUrl}/payments/${transactionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la vérification du paiement");
    }

    const data = await response.json();

    // Mettre à jour le statut de la transaction
    await updateTransactionStatus(transactionId, data.status, data);

    return data;
  } catch (error) {
    console.error("Erreur lors de la vérification FeeXpay:", error);
    throw error;
  }
};

// ==================== FEDAPAY HELPERS ====================

/**
 * Prépare la configuration pour FedaPay
 * Note: Le widget React FedaPay gère l'initialisation du paiement côté client
 * Cette config est utilisée uniquement pour les vérifications serveur
 */
export const getFedaPayConfig = (provider) => {
  const envPublicKey = import.meta.env.VITE_FEDAPAY_PUBLIC_KEY;
  const envSecretKey = import.meta.env.VITE_FEDAPAY_SECRET_KEY;

  const publicKey = provider?.api_key || envPublicKey;
  const secretKey = provider?.api_secret || envSecretKey;

  return {
    publicKey: publicKey,
    secretKey: secretKey,
    baseUrl: provider?.is_sandbox
      ? "https://sandbox-api.fedapay.com/v1"
      : "https://api.fedapay.com/v1",
    mode: provider?.is_sandbox ? "SANDBOX" : "LIVE",
  };
};

/**
 * Note: FedaPay utilise le widget React qui gère l'initialisation automatiquement
 * Cette fonction n'est plus nécessaire car le widget FedaCheckoutButton
 * crée la transaction directement via leur SDK
 */

/**
 * Vérifie le statut d'un paiement FedaPay (utilise la clé secrète)
 */
export const verifyFedaPayPayment = async (provider, transactionId) => {
  const config = getFedaPayConfig(provider);

  try {
    const response = await fetch(`${config.baseUrl}/transactions/${transactionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.secretKey}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la vérification du paiement");
    }

    const data = await response.json();
    const transaction = data.v1;

    // Mapper les statuts FedaPay vers nos statuts
    const statusMap = {
      approved: "success",
      declined: "failed",
      canceled: "cancelled",
      pending: "pending",
      refunded: "refunded",
      transferred: "success",
      expired: "failed",
    };

    const mappedStatus = statusMap[transaction.status] || transaction.status;

    // Mettre à jour le statut de la transaction
    await updateTransactionStatus(String(transactionId), mappedStatus, data);

    return {
      status: mappedStatus,
      transaction,
    };
  } catch (error) {
    console.error("Erreur lors de la vérification FedaPay:", error);
    throw error;
  }
};

/**
 * Callback de succès FedaPay
 * Enregistre la transaction retournée par le widget
 */
export const handleFedaPaySuccess = async (response, transaction, provider) => {
  try {
    console.log("=== FEDAPAY SUCCESS HANDLER - DÉBUT ===");
    console.log("1. Provider reçu:", provider);
    console.log("2. Response complète:", JSON.stringify(response, null, 2));
    console.log("3. Transaction complète:", JSON.stringify(transaction, null, 2));
    console.log("4. Structure de transaction:", {
      id: transaction?.id,
      amount: transaction?.amount,
      currency: transaction?.currency,
      customer: transaction?.customer,
      status: transaction?.status,
    });

    const transactionRecord = {
      provider_id: provider.id,
      provider_name: "fedapay",
      transaction_id: String(transaction.id),
      amount: parseFloat(transaction.amount),
      currency: transaction.currency?.iso || "XOF",
      status: "success",
      payment_method: "momo",
      customer_phone: transaction.customer?.phone_number?.number || null,
      customer_email: transaction.customer?.email || null,
      metadata: { response, transaction },
      is_sandbox: provider.is_sandbox,
    };

    console.log("5. Transaction record à insérer:", JSON.stringify(transactionRecord, null, 2));

    const result = await createPaymentTransaction(transactionRecord);

    console.log("6. ✅ Transaction enregistrée avec succès:", result);
    console.log("=== FEDAPAY SUCCESS HANDLER - FIN ===");

    return result;
  } catch (error) {
    console.error("=== FEDAPAY SUCCESS HANDLER - ERREUR ===");
    console.error("Type d'erreur:", error.constructor.name);
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("Erreur complète:", error);
    console.error("=== FIN ERREUR ===");
    throw error;
  }
};

/**
 * Callback d'échec FedaPay
 */
export const handleFedaPayFailed = async (error, provider) => {
  console.error("Échec du paiement FedaPay:", error);

  try {
    if (error.transaction_id) {
      const transaction = {
        provider_id: provider.id,
        provider_name: "fedapay",
        transaction_id: String(error.transaction_id),
        amount: error.amount || 0,
        currency: "XOF",
        status: "failed",
        metadata: error,
        is_sandbox: provider.is_sandbox,
      };

      await createPaymentTransaction(transaction);
    }
  } catch (err) {
    console.error("Erreur lors de l'enregistrement de l'échec:", err);
  }
};

export default {
  // Providers
  getAllPaymentProviders,
  getPaymentProviderByName,
  getActivePaymentProviders,
  updatePaymentProvider,
  togglePaymentProvider,
  toggleSandboxMode,
  configureProviderKeys,
  // Transactions
  createPaymentTransaction,
  updateTransactionStatus,
  getPaymentTransactions,
  getTransactionById,
  getTransactionStats,
  // KKiaPay
  getKKiaPayConfig,
  handleKKiaPaySuccess,
  handleKKiaPayFailed,
  // FeeXpay
  getFeeXPayConfig,
  initiateFeeXPayPayment,
  verifyFeeXPayPayment,
};
