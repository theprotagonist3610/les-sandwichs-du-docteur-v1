import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/config/supabase";
import {
  getAllPromotionInstances,
  updatePromotionInstance,
  pausePromotionInstance,
  resumePromotionInstance,
  cancelPromotionInstance,
  completePromotionInstance,
  deletePromotionInstance,
  searchPromotionInstances,
  getPromotionInstancesStats,
  getInstanceStats,
  incrementInstanceUsage,
  updateInstanceMetrics,
} from "@/utils/promotionToolkit";
import { toast } from "sonner";

/**
 * Hook pour gérer les instances de promotions (promotions_archive)
 * Avec support REALTIME pour synchronisation automatique
 * @param {Object} options - Options de filtrage
 * @returns {Object} État et fonctions de gestion des instances
 */
const usePromotionInstances = (options = {}) => {
  const [instances, setInstances] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Utiliser useRef pour stocker les options sans déclencher de re-renders
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Charger les instances
  const loadInstances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        success,
        instances: data,
        error: err,
      } = await getAllPromotionInstances(optionsRef.current);

      if (success) {
        setInstances(data);
      } else {
        setError(err);
        toast.error("Erreur de chargement", {
          description: err,
        });
      }
    } catch (err) {
      setError(err.message);
      toast.error("Erreur inattendue", {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, []); // Plus de dépendance sur options

  // Charger les statistiques avec calcul des performances depuis les commandes
  const loadStats = useCallback(async () => {
    try {
      // 1. Charger les stats des instances
      const {
        success,
        stats: instanceStats,
        error: err,
      } = await getPromotionInstancesStats();

      if (!success) {
        console.error("Erreur chargement stats:", err);
        return;
      }

      // 2. Charger les commandes avec promotions pour calculer les performances
      const { data: commandes, error: commandesError } = await supabase
        .from("commandes")
        .select("id, promotion, details_paiement, created_at")
        .not("promotion", "is", null);

      let performanceStats = {
        revenu_total: 0,
        total_commandes: 0,
        total_utilisations: instanceStats.utilisation_totale || 0,
        panier_moyen: 0,
      };

      if (!commandesError && commandes && commandes.length > 0) {
        // Filtrer les commandes qui ont une promotion valide
        const commandesAvecPromo = commandes.filter(
          (c) => c.promotion && (c.promotion.id || c.promotion.code)
        );

        performanceStats.total_commandes = commandesAvecPromo.length;
        performanceStats.revenu_total = commandesAvecPromo.reduce(
          (sum, c) => sum + (c.details_paiement?.total_apres_reduction || 0),
          0
        );
        performanceStats.panier_moyen =
          commandesAvecPromo.length > 0
            ? performanceStats.revenu_total / commandesAvecPromo.length
            : 0;
      }

      // 3. Transformer les stats dans le format attendu par PromotionStats
      const formattedStats = {
        // Stats de statut (ce que PromotionStats attend)
        actives: instanceStats.by_status?.active || 0,
        en_pause: instanceStats.by_status?.paused || 0,
        terminees: instanceStats.by_status?.completed || 0,
        annulees: instanceStats.by_status?.cancelled || 0,

        // Stats de performance (calculées depuis les commandes)
        revenu_total: performanceStats.revenu_total,
        total_commandes: performanceStats.total_commandes,
        total_utilisations: performanceStats.total_utilisations,
        panier_moyen: performanceStats.panier_moyen,

        // Stats par type
        par_type: {
          standard: instanceStats.by_type?.standard || 0,
          flash: instanceStats.by_type?.flash || 0,
          happy_hour: instanceStats.by_type?.happy_hour || 0,
          recurrente: instanceStats.by_type?.recurrente || 0,
        },

        // Stats brutes pour référence
        total: instanceStats.total || 0,
        active_now: instanceStats.active || 0,
      };

      setStats(formattedStats);
    } catch (err) {
      console.error("Erreur inattendue stats:", err);
    }
  }, []);

  // Charger au montage uniquement - useEffect ne dépend de RIEN
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          success,
          instances: data,
          error: err,
        } = await getAllPromotionInstances(optionsRef.current);

        if (success) {
          setInstances(data);
        } else {
          console.log(err);
          setError(err);
          toast.error("Erreur de chargement", {
            description: err,
          });
        }
      } catch (err) {
        setError(err.message);
        toast.error("Erreur inattendue", {
          description: err.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Vraiment vide - s'exécute UNE SEULE FOIS au montage

  // REALTIME: Écouter les changements sur la table promotions_archive
  useEffect(() => {
    const channel = supabase
      .channel("promotions_archive_changes")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "promotions_archive",
        },
        (payload) => {
          console.log("Realtime change:", payload);

          // Recharger les données et stats
          loadInstances();
          loadStats();

          // Notifications optionnelles
          if (payload.eventType === "INSERT") {
            const newInstance = payload.new;
            toast.info("Nouvelle promotion activée", {
              description: newInstance.denomination,
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedInstance = payload.new;
            // Notification uniquement si changement de statut
            if (payload.old.status !== updatedInstance.status) {
              toast.info("Promotion mise à jour", {
                description: `${updatedInstance.denomination} - ${updatedInstance.status}`,
              });
            }
          } else if (payload.eventType === "DELETE") {
            toast.info("Promotion supprimée");
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadInstances, loadStats]);

  // REALTIME: Écouter les nouvelles commandes pour mettre à jour les stats de performance
  useEffect(() => {
    const channel = supabase
      .channel("commandes_promo_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "commandes",
        },
        (payload) => {
          // Recharger les stats si la commande a une promotion
          if (payload.new?.promotion) {
            console.log("Nouvelle commande avec promotion:", payload.new.id);
            loadStats();
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadStats]);

  // Mettre à jour une instance
  const handleUpdate = useCallback(async (instanceId, updates) => {
    try {
      const {
        success,
        instance,
        error: err,
      } = await updatePromotionInstance(instanceId, updates);

      if (success) {
        toast.success("Instance modifiée", {
          description: `${instance.denomination} a été modifiée avec succès`,
        });

        return { success: true, instance };
      } else {
        toast.error("Erreur de modification", {
          description: err,
        });
        return { success: false, error: err };
      }
    } catch (err) {
      toast.error("Erreur inattendue", {
        description: err.message,
      });
      return { success: false, error: err.message };
    }
  }, []);

  // Mettre en pause
  const handlePause = useCallback(async (instanceId, denomination) => {
    try {
      const {
        success,
        instance,
        error: err,
      } = await pausePromotionInstance(instanceId);

      if (success) {
        toast.success("Promotion mise en pause", {
          description: denomination,
        });

        return { success: true, instance };
      } else {
        toast.error("Erreur", {
          description: err,
        });
        return { success: false, error: err };
      }
    } catch (err) {
      toast.error("Erreur inattendue", {
        description: err.message,
      });
      return { success: false, error: err.message };
    }
  }, []);

  // Reprendre
  const handleResume = useCallback(async (instanceId, denomination) => {
    try {
      const {
        success,
        instance,
        error: err,
      } = await resumePromotionInstance(instanceId);

      if (success) {
        toast.success("Promotion reprise", {
          description: denomination,
        });

        return { success: true, instance };
      } else {
        toast.error("Erreur", {
          description: err,
        });
        return { success: false, error: err };
      }
    } catch (err) {
      toast.error("Erreur inattendue", {
        description: err.message,
      });
      return { success: false, error: err.message };
    }
  }, []);

  // Annuler
  const handleCancel = useCallback(
    async (instanceId, denomination, reason = null) => {
      try {
        const {
          success,
          instance,
          error: err,
        } = await cancelPromotionInstance(instanceId, reason);

        if (success) {
          toast.success("Promotion annulée", {
            description: denomination,
          });

          return { success: true, instance };
        } else {
          toast.error("Erreur d'annulation", {
            description: err,
          });
          return { success: false, error: err };
        }
      } catch (err) {
        toast.error("Erreur inattendue", {
          description: err.message,
        });
        return { success: false, error: err.message };
      }
    },
    []
  );

  // Compléter
  const handleComplete = useCallback(async (instanceId, denomination) => {
    try {
      const {
        success,
        instance,
        error: err,
      } = await completePromotionInstance(instanceId);

      if (success) {
        toast.success("Promotion complétée", {
          description: denomination,
        });

        return { success: true, instance };
      } else {
        toast.error("Erreur", {
          description: err,
        });
        return { success: false, error: err };
      }
    } catch (err) {
      toast.error("Erreur inattendue", {
        description: err.message,
      });
      return { success: false, error: err.message };
    }
  }, []);

  // Supprimer (soft delete)
  const handleDelete = useCallback(async (instanceId, denomination) => {
    try {
      const { success, error: err } = await deletePromotionInstance(instanceId);

      if (success) {
        toast.success("Promotion supprimée", {
          description: denomination,
        });

        return { success: true };
      } else {
        toast.error("Erreur de suppression", {
          description: err,
        });
        return { success: false, error: err };
      }
    } catch (err) {
      toast.error("Erreur inattendue", {
        description: err.message,
      });
      return { success: false, error: err.message };
    }
  }, []);

  // Rechercher
  const handleSearch = useCallback(async (searchTerm, filter = "all") => {
    try {
      setLoading(true);
      setError(null);

      const {
        success,
        instances: data,
        error: err,
      } = await searchPromotionInstances(searchTerm, filter);

      if (success) {
        setInstances(data);
        return { success: true, instances: data };
      } else {
        setError(err);
        toast.error("Erreur de recherche", {
          description: err,
        });
        return { success: false, error: err };
      }
    } catch (err) {
      setError(err.message);
      toast.error("Erreur inattendue", {
        description: err.message,
      });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtenir les stats d'une instance
  const getStats = useCallback(async (instanceId) => {
    try {
      const {
        success,
        stats: data,
        error: err,
      } = await getInstanceStats(instanceId);

      if (success) {
        return { success: true, stats: data };
      } else {
        toast.error("Erreur de chargement", {
          description: err,
        });
        return { success: false, error: err };
      }
    } catch (err) {
      toast.error("Erreur inattendue", {
        description: err.message,
      });
      return { success: false, error: err.message };
    }
  }, []);

  // Incrémenter l'utilisation
  const incrementUsage = useCallback(async (instanceId) => {
    try {
      const { success, error: err } = await incrementInstanceUsage(instanceId);

      if (!success) {
        console.error("Erreur incrémentation:", err);
        return { success: false, error: err };
      }

      return { success: true };
    } catch (err) {
      console.error("Erreur inattendue incrémentation:", err);
      return { success: false, error: err.message };
    }
  }, []);

  // Mettre à jour les métriques
  const updateMetrics = useCallback(async (instanceId, metrics) => {
    try {
      const {
        success,
        instance,
        error: err,
      } = await updateInstanceMetrics(instanceId, metrics);

      if (success) {
        return { success: true, instance };
      } else {
        console.error("Erreur mise à jour métriques:", err);
        return { success: false, error: err };
      }
    } catch (err) {
      console.error("Erreur inattendue métriques:", err);
      return { success: false, error: err.message };
    }
  }, []);

  return {
    instances,
    stats,
    loading,
    error,
    reload: loadInstances,
    reloadStats: loadStats,
    handleUpdate,
    handlePause,
    handleResume,
    handleCancel,
    handleComplete,
    handleDelete,
    handleSearch,
    getStats,
    incrementUsage,
    updateMetrics,
  };
};

export default usePromotionInstances;
