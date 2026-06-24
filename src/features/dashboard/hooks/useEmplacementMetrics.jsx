import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getCommandesDuJour, saveToCache } from "@/features/commandes/utils/commandeToolkit";

/**
 * Hook pour récupérer les métriques en temps réel par emplacement
 * S'inspire de VentesWidget pour la gestion Realtime
 *
 * @returns {Object} { metricsMap, isLoading, refresh }
 * - metricsMap: Map<emplacementId, { ventes, livraisons, ca }>
 * - isLoading: boolean
 * - refresh: Function pour forcer un rechargement
 */
const useEmplacementMetrics = () => {
  const [metricsMap, setMetricsMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Refs pour éviter les closures stale dans les callbacks Realtime
  const metricsMapRef = useRef(new Map());
  const loadDataRef = useRef(null);

  /**
   * Calcule les métriques par emplacement à partir des commandes
   * @param {Array} commandes - Liste des commandes du jour
   * @returns {Map} Map des métriques par emplacement
   */
  const calculateMetricsByEmplacement = useCallback((commandes) => {
    const metrics = new Map();

    commandes.forEach((commande) => {
      const emplacementId = commande.point_de_vente;

      // Ignorer les commandes sans point de vente
      if (!emplacementId) return;

      // Initialiser les métriques pour cet emplacement si nécessaire
      if (!metrics.has(emplacementId)) {
        metrics.set(emplacementId, {
          ventes: 0,
          livraisons: 0,
          ca: 0,
        });
      }

      const empMetrics = metrics.get(emplacementId);

      // Compter les ventes (toutes les commandes sauf annulées)
      if (commande.statut_commande !== "annulee") {
        empMetrics.ventes += 1;

        // Calculer le CA
        const paiements = commande.details_paiement || {};
        const ca = (paiements.momo || 0) + (paiements.cash || 0) + (paiements.autre || 0);
        empMetrics.ca += ca;

        // Compter les livraisons (type_commande = "livraison")
        if (commande.type_commande === "livraison") {
          empMetrics.livraisons += 1;
        }
      }
    });

    return metrics;
  }, []);

  /**
   * Charge les données depuis Supabase
   */
  const loadData = useCallback(async () => {
    setIsLoading(true);

    try {
      const result = await getCommandesDuJour(true);

      if (result.commandes) {
        const newMetrics = calculateMetricsByEmplacement(result.commandes);
        setMetricsMap(newMetrics);
        metricsMapRef.current = newMetrics;
      } else {
        setMetricsMap(new Map());
        metricsMapRef.current = new Map();
      }
    } catch (error) {
      console.error("Erreur lors du chargement des métriques:", error);
      setMetricsMap(new Map());
      metricsMapRef.current = new Map();
    } finally {
      setIsLoading(false);
    }
  }, [calculateMetricsByEmplacement]);

  // Stocker loadData dans une ref pour le Realtime
  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  /**
   * Met à jour les métriques après un événement Realtime
   */
  const updateMetricsFromRealtime = useCallback(
    async (newCommande) => {
      // Recharger toutes les données pour garantir la cohérence
      if (loadDataRef.current) {
        await loadDataRef.current();
      }
    },
    []
  );

  // Setup Realtime et chargement initial
  useEffect(() => {
    let channel = null;

    const setupRealtime = async () => {
      // Vérifier l'authentification
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("❌ [useEmplacementMetrics] Pas d'utilisateur connecté !");
        return;
      }

      // Charger les données initiales
      loadData();

      // Souscrire aux changements en temps réel
      channel = supabase
        .channel("commandes-emplacement-metrics", {
          config: {
            broadcast: { ack: true },
            presence: { key: `emplacement-metrics-${user.id}` },
          },
        })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "commandes",
          },
          async (payload) => {
            // Sauvegarder dans le cache
            if (payload.new) {
              try {
                await saveToCache(payload.new);
              } catch (err) {
                console.warn("⚠️ Cache save failed:", err);
              }
            }

            // Mettre à jour les métriques
            await updateMetricsFromRealtime(payload.new);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "commandes",
          },
          async (payload) => {
            // Sauvegarder dans le cache
            if (payload.new) {
              try {
                await saveToCache(payload.new);
              } catch (err) {
                console.warn("⚠️ Cache save failed:", err);
              }
            }

            // Mettre à jour les métriques
            await updateMetricsFromRealtime(payload.new);
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("✅ [useEmplacementMetrics] Connecté au Realtime");
          }
          if (status === "CHANNEL_ERROR") {
            console.error("❌ [useEmplacementMetrics] Erreur de connexion Realtime");
          }
        });
    };

    setupRealtime();

    // Cleanup
    return () => {
      if (channel) {
        channel.unsubscribe();
        console.log("🔌 [useEmplacementMetrics] Déconnexion du Realtime");
      }
    };
  }, [loadData, updateMetricsFromRealtime]);

  // Rafraîchissement automatique toutes les 30 secondes (fallback)
  useEffect(() => {
    const interval = setInterval(() => {
      if (loadDataRef.current) {
        loadDataRef.current();
      }
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, []);

  return {
    metricsMap,
    isLoading,
    refresh: loadData,
  };
};

export default useEmplacementMetrics;
