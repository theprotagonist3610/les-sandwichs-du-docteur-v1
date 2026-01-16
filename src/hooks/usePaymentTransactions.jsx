import { useState, useEffect } from "react";
import {
  getPaymentTransactions,
  getTransactionById,
  getTransactionStats,
  createPaymentTransaction,
  updateTransactionStatus,
} from "@/utils/paymentToolkit";

/**
 * Hook pour gérer les transactions de paiement
 */
export const usePaymentTransactions = (filters = {}) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPaymentTransactions(filters);
      setTransactions(data);
    } catch (err) {
      setError(err.message);
      console.error("Erreur lors du chargement des transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [JSON.stringify(filters)]); // Recharger si les filtres changent

  const refresh = () => {
    loadTransactions();
  };

  return {
    transactions,
    loading,
    error,
    refresh,
  };
};

/**
 * Hook pour récupérer une transaction spécifique
 */
export const usePaymentTransaction = (transactionId) => {
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTransaction = async () => {
      if (!transactionId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getTransactionById(transactionId);
        setTransaction(data);
      } catch (err) {
        setError(err.message);
        console.error("Erreur lors du chargement de la transaction:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTransaction();
  }, [transactionId]);

  return { transaction, loading, error };
};

/**
 * Hook pour les statistiques des transactions
 */
export const useTransactionStats = (providerId = null) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTransactionStats(providerId);
      setStats(data);
    } catch (err) {
      setError(err.message);
      console.error("Erreur lors du chargement des statistiques:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [providerId]);

  const refresh = () => {
    loadStats();
  };

  return {
    stats,
    loading,
    error,
    refresh,
  };
};
