import { useState, useEffect, useCallback } from "react";
import {
  getAllPromotionTemplates,
  createPromotionTemplate,
  updatePromotionTemplate,
  deletePromotionTemplate,
  searchPromotionTemplates,
  activatePromotionTemplate,
  getTemplatePerformance,
} from "@/utils/promotionToolkit";
import { toast } from "sonner";

/**
 * Hook pour gérer les templates de promotions
 * @param {Object} options - Options de filtrage
 * @returns {Object} État et fonctions de gestion des templates
 */
const usePromotionTemplates = (options = {}) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les templates
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { success, templates: data, error: err } = await getAllPromotionTemplates(options);

      if (success) {
        setTemplates(data);
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
  }, [options]);

  // Charger au montage et quand les options changent
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Créer un template
  const handleCreate = useCallback(
    async (templateData) => {
      try {
        const { success, template, error: err } = await createPromotionTemplate(templateData);

        if (success) {
          toast.success("Template créé", {
            description: `${template.denomination} a été créé avec succès`,
          });

          // Recharger la liste
          await loadTemplates();

          return { success: true, template };
        } else {
          toast.error("Erreur de création", {
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
    [loadTemplates]
  );

  // Mettre à jour un template
  const handleUpdate = useCallback(
    async (templateId, updates) => {
      try {
        const { success, template, error: err } = await updatePromotionTemplate(templateId, updates);

        if (success) {
          toast.success("Template modifié", {
            description: `${template.denomination} a été modifié avec succès`,
          });

          // Recharger la liste
          await loadTemplates();

          return { success: true, template };
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
    },
    [loadTemplates]
  );

  // Supprimer un template
  const handleDelete = useCallback(
    async (templateId, denomination) => {
      try {
        const { success, error: err } = await deletePromotionTemplate(templateId);

        if (success) {
          toast.success("Template supprimé", {
            description: `${denomination} a été supprimé avec succès`,
          });

          // Recharger la liste
          await loadTemplates();

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
    },
    [loadTemplates]
  );

  // Activer un template (créer une instance)
  const handleActivate = useCallback(
    async (templateId, activationData) => {
      try {
        const { success, instance, error: err } = await activatePromotionTemplate(
          templateId,
          activationData
        );

        if (success) {
          toast.success("Promotion activée", {
            description: `${instance.denomination} a été activée avec succès`,
          });

          return { success: true, instance };
        } else {
          toast.error("Erreur d'activation", {
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

  // Rechercher des templates
  const handleSearch = useCallback(async (searchTerm) => {
    try {
      setLoading(true);
      setError(null);

      const { success, templates: data, error: err } = await searchPromotionTemplates(searchTerm);

      if (success) {
        setTemplates(data);
        return { success: true, templates: data };
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

  // Obtenir la performance d'un template
  const getPerformance = useCallback(async (templateId) => {
    try {
      const { success, performance, error: err } = await getTemplatePerformance(templateId);

      if (success) {
        return { success: true, performance };
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

  return {
    templates,
    loading,
    error,
    reload: loadTemplates,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleActivate,
    handleSearch,
    getPerformance,
  };
};

export default usePromotionTemplates;
