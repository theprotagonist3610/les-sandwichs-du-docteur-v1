import { useState, useEffect } from "react";
import {
  getAllPaymentProviders,
  getActivePaymentProviders,
  getPaymentProviderByName,
  updatePaymentProvider,
  togglePaymentProvider,
  toggleSandboxMode,
  configureProviderKeys,
} from "@/utils/paymentToolkit";

/**
 * Hook pour gérer les providers de paiement
 */
export const usePaymentProviders = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger tous les providers
  const loadProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllPaymentProviders();
      setProviders(data);
    } catch (err) {
      setError(err.message);
      console.error("Erreur lors du chargement des providers:", err);
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage
  useEffect(() => {
    loadProviders();
  }, []);

  // Actualiser les providers
  const refresh = () => {
    loadProviders();
  };

  // Activer/désactiver un provider
  const toggleProvider = async (providerId, isActive) => {
    try {
      await togglePaymentProvider(providerId, isActive);
      await loadProviders();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Basculer le mode sandbox
  const toggleSandbox = async (providerId, isSandbox) => {
    try {
      await toggleSandboxMode(providerId, isSandbox);
      await loadProviders();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Configurer les clés API
  const configureKeys = async (providerId, apiKey, apiSecret = null, config = {}) => {
    try {
      await configureProviderKeys(providerId, apiKey, apiSecret, config);
      await loadProviders();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Mettre à jour un provider
  const updateProvider = async (providerId, updates) => {
    try {
      await updatePaymentProvider(providerId, updates);
      await loadProviders();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  return {
    providers,
    loading,
    error,
    refresh,
    toggleProvider,
    toggleSandbox,
    configureKeys,
    updateProvider,
  };
};

/**
 * Hook pour récupérer un provider spécifique
 */
export const usePaymentProvider = (providerName) => {
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProvider = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPaymentProviderByName(providerName);
        setProvider(data);
      } catch (err) {
        setError(err.message);
        console.error(`Erreur lors du chargement du provider ${providerName}:`, err);
      } finally {
        setLoading(false);
      }
    };

    if (providerName) {
      loadProvider();
    }
  }, [providerName]);

  return { provider, loading, error };
};

/**
 * Hook pour récupérer uniquement les providers actifs
 */
export const useActivePaymentProviders = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getActivePaymentProviders();
      setProviders(data);
    } catch (err) {
      setError(err.message);
      console.error("Erreur lors du chargement des providers actifs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const refresh = () => {
    loadProviders();
  };

  return { providers, loading, error, refresh };
};
