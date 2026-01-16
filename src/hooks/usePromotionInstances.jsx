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

  // Charger les statistiques
  const loadStats = useCallback(async () => {
    try {
      const {
        success,
        stats: data,
        error: err,
      } = await getPromotionInstancesStats();

      if (success) {
        setStats(data);
      } else {
        console.error("Erreur chargement stats:", err);
      }
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

    const fetchStats = async () => {
      try {
        const {
          success,
          stats: data,
          error: err,
        } = await getPromotionInstancesStats();

        if (success) {
          setStats(data);
        } else {
          console.error("Erreur chargement stats:", err);
        }
      } catch (err) {
        console.error("Erreur inattendue stats:", err);
      }
    };

    fetchData();
    fetchStats();
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
