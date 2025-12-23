import { supabase } from "@/config/supabase";

/**
 * =====================================================
 * PROMOTION TOOLKIT - NOUVELLE ARCHITECTURE
 * =====================================================
 *
 * Architecture à deux tables:
 * 1. promotions: Templates/modèles réutilisables
 * 2. promotions_archive: Instances activées avec historique (REALTIME)
 *
 * Workflow:
 * - Créer un template dans 'promotions'
 * - Activer le template → crée une instance dans 'promotions_archive'
 * - Toutes les opérations en temps réel se font sur 'promotions_archive'
 *
 * Date: 2025-12-23
 * =====================================================
 */

// ==================== CONSTANTES ====================

export const PROMOTION_TYPES = {
  STANDARD: "standard",
  FLASH: "flash",
  HAPPY_HOUR: "happy_hour",
  RECURRENTE: "recurrente",
};

export const DUREE_UNITES = {
  MINUTES: "minutes",
  HOURS: "hours",
  DAYS: "days",
  WEEKS: "weeks",
  MONTHS: "months",
};

export const ELIGIBILITE_TYPES = {
  TOUS: "tous",
  PRODUITS: "produits",
  CATEGORIES: "categories",
  PANIER_MINIMUM: "panier_minimum",
};

export const INSTANCE_STATUS = {
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

// ==================== TEMPLATES (table: promotions) ====================

/**
 * Créer un nouveau template de promotion
 * @param {Object} templateData - Données du template
 * @returns {Promise<{success: boolean, template?: Object, error?: string}>}
 */
export const createPromotionTemplate = async (templateData) => {
  try {
    const insertData = {
      denomination: templateData.denomination,
      description: templateData.description || null,
      type_promotion: templateData.type_promotion || PROMOTION_TYPES.STANDARD,
      reduction_absolue: templateData.reduction_absolue || 0,
      reduction_relative: templateData.reduction_relative || 0,
      duree_valeur: templateData.duree_valeur,
      duree_unite: templateData.duree_unite || DUREE_UNITES.DAYS,
      eligibilite: templateData.eligibilite || { type: ELIGIBILITE_TYPES.TOUS },
      utilisation_max: templateData.utilisation_max || null,
      utilisation_max_par_client: templateData.utilisation_max_par_client || 1,
      is_template: true,
      is_recurrente:
        templateData.type_promotion === PROMOTION_TYPES.RECURRENTE ||
        templateData.is_recurrente ||
        false,
    };

    // Si un UUID est fourni (sync offline)
    if (templateData.id) {
      insertData.id = templateData.id;
    }

    const { data, error } = await supabase
      .from("promotions")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error("Erreur création template:", error);
      return { success: false, error: error.message };
    }

    return { success: true, template: data };
  } catch (error) {
    console.error("Erreur inattendue création template:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer tous les templates de promotions
 * @param {Object} options - Options de filtrage
 * @returns {Promise<{success: boolean, templates?: Array, error?: string}>}
 */
export const getAllPromotionTemplates = async (options = {}) => {
  try {
    const {
      orderBy = "created_at",
      ascending = false,
      type = null,
      isRecurrente = null,
    } = options;

    let query = supabase.from("promotions").select("*");

    // Filtrer par type
    if (type) {
      query = query.eq("type_promotion", type);
    }

    // Filtrer les récurrentes
    if (isRecurrente !== null) {
      query = query.eq("is_recurrente", isRecurrente);
    }

    // Tri
    query = query.order(orderBy, { ascending });

    const { data, error } = await query;

    if (error) {
      console.error("Erreur récupération templates:", error);
      return { success: false, error: error.message };
    }

    return { success: true, templates: data || [] };
  } catch (error) {
    console.error("Erreur inattendue récupération templates:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer un template par ID
 * @param {string} templateId - ID du template
 * @returns {Promise<{success: boolean, template?: Object, error?: string}>}
 */
export const getPromotionTemplateById = async (templateId) => {
  try {
    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .eq("id", templateId)
      .single();

    if (error) {
      console.error("Erreur récupération template:", error);
      return { success: false, error: error.message };
    }

    return { success: true, template: data };
  } catch (error) {
    console.error("Erreur inattendue récupération template:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Mettre à jour un template
 * @param {string} templateId - ID du template
 * @param {Object} updates - Données à mettre à jour
 * @returns {Promise<{success: boolean, template?: Object, error?: string}>}
 */
export const updatePromotionTemplate = async (templateId, updates) => {
  try {
    const { data, error } = await supabase
      .from("promotions")
      .update(updates)
      .eq("id", templateId)
      .select()
      .single();

    if (error) {
      console.error("Erreur mise à jour template:", error);
      return { success: false, error: error.message };
    }

    return { success: true, template: data };
  } catch (error) {
    console.error("Erreur inattendue mise à jour template:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Supprimer un template
 * @param {string} templateId - ID du template
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deletePromotionTemplate = async (templateId) => {
  try {
    // Vérifier s'il y a des instances actives
    const { data: instances } = await supabase
      .from("promotions_archive")
      .select("id")
      .eq("promotion_id", templateId)
      .eq("is_active", true);

    if (instances && instances.length > 0) {
      return {
        success: false,
        error: `Impossible de supprimer: ${instances.length} instance(s) active(s)`,
      };
    }

    const { error } = await supabase
      .from("promotions")
      .delete()
      .eq("id", templateId);

    if (error) {
      console.error("Erreur suppression template:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur inattendue suppression template:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Rechercher des templates
 * @param {string} searchTerm - Terme de recherche
 * @returns {Promise<{success: boolean, templates?: Array, error?: string}>}
 */
export const searchPromotionTemplates = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return getAllPromotionTemplates();
    }

    const term = searchTerm.trim().toLowerCase();

    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .or(`denomination.ilike.%${term}%,description.ilike.%${term}%`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur recherche templates:", error);
      return { success: false, error: error.message };
    }

    return { success: true, templates: data || [] };
  } catch (error) {
    console.error("Erreur inattendue recherche templates:", error);
    return { success: false, error: error.message };
  }
};

// ==================== INSTANCES (table: promotions_archive) ====================

/**
 * Activer un template de promotion (créer une instance)
 * @param {string} templateId - ID du template à activer
 * @param {Object} activationData - Données d'activation
 * @param {string} activationData.date_debut - Date de début ISO
 * @param {string} activationData.code_promo - Code promo pour cette instance (optionnel)
 * @param {string} activationData.activated_by - ID utilisateur qui active (optionnel)
 * @returns {Promise<{success: boolean, instance?: Object, error?: string}>}
 */
export const activatePromotionTemplate = async (templateId, activationData) => {
  try {
    // 1. Récupérer le template
    const { success, template, error } = await getPromotionTemplateById(
      templateId
    );

    if (!success || !template) {
      return { success: false, error: error || "Template introuvable" };
    }

    // 2. Calculer date_fin
    const dateDebut = new Date(activationData.date_debut);
    const dateFin = calculateDateFin(
      dateDebut,
      template.duree_valeur,
      template.duree_unite
    );

    // 3. Générer ou utiliser le code promo fourni
    const codePromo = activationData.code_promo
      ? activationData.code_promo.toUpperCase()
      : null;

    // 4. Créer l'instance dans promotions_archive
    const instance = {
      promotion_id: template.id,
      denomination: template.denomination,
      description: template.description,
      code_promo: codePromo,
      type_promotion: template.type_promotion,
      reduction_absolue: template.reduction_absolue,
      reduction_relative: template.reduction_relative,
      date_debut: activationData.date_debut,
      date_fin: dateFin.toISOString(),
      duree_valeur: template.duree_valeur,
      duree_unite: template.duree_unite,
      eligibilite: template.eligibilite,
      utilisation_max: template.utilisation_max,
      utilisation_max_par_client: template.utilisation_max_par_client,
      status: INSTANCE_STATUS.ACTIVE,
      is_active: true,
      activated_by: activationData.activated_by || null,
    };

    const { data, error: insertError } = await supabase
      .from("promotions_archive")
      .insert([instance])
      .select()
      .single();

    if (insertError) {
      console.error("Erreur activation template:", insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, instance: data };
  } catch (error) {
    console.error("Erreur inattendue activation template:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer toutes les instances (archive)
 * @param {Object} options - Options de filtrage
 * @returns {Promise<{success: boolean, instances?: Array, error?: string}>}
 */
export const getAllPromotionInstances = async (options = {}) => {
  try {
    const {
      orderBy = "date_debut",
      ascending = false,
      filter = "all",
      type = null,
      status = null,
      templateId = null,
    } = options;

    let query = supabase.from("promotions_archive").select("*");

    // Filtrer par template
    if (templateId) {
      query = query.eq("promotion_id", templateId);
    }

    // Filtrer par type
    if (type) {
      query = query.eq("type_promotion", type);
    }

    // Filtrer par statut
    if (status) {
      query = query.eq("status", status);
    }

    // Filtres temporels
    const now = new Date().toISOString();

    switch (filter) {
      case "active":
        // Instances actives en ce moment
        query = query
          .eq("is_active", true)
          .eq("status", INSTANCE_STATUS.ACTIVE)
          .lte("date_debut", now)
          .gte("date_fin", now);
        break;
      case "flash":
        // Flash actives uniquement
        query = query
          .eq("type_promotion", PROMOTION_TYPES.FLASH)
          .eq("is_active", true)
          .eq("status", INSTANCE_STATUS.ACTIVE)
          .lte("date_debut", now)
          .gte("date_fin", now);
        break;
      case "upcoming":
        // À venir
        query = query
          .eq("status", INSTANCE_STATUS.ACTIVE)
          .gt("date_debut", now);
        break;
      case "expired":
        // Expirées
        query = query.lt("date_fin", now);
        break;
      case "completed":
        // Complétées
        query = query.eq("status", INSTANCE_STATUS.COMPLETED);
        break;
      case "cancelled":
        // Annulées
        query = query.eq("status", INSTANCE_STATUS.CANCELLED);
        break;
      case "all":
      default:
        // Toutes
        break;
    }

    // Tri
    query = query.order(orderBy, { ascending });

    const { data, error } = await query;

    if (error) {
      console.error("Erreur récupération instances:", error);
      return { success: false, error: error.message };
    }

    return { success: true, instances: data || [] };
  } catch (error) {
    console.error("Erreur inattendue récupération instances:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer une instance par ID
 * @param {string} instanceId - ID de l'instance
 * @returns {Promise<{success: boolean, instance?: Object, error?: string}>}
 */
export const getPromotionInstanceById = async (instanceId) => {
  try {
    const { data, error } = await supabase
      .from("promotions_archive")
      .select("*")
      .eq("id", instanceId)
      .single();

    if (error) {
      console.error("Erreur récupération instance:", error);
      return { success: false, error: error.message };
    }

    return { success: true, instance: data };
  } catch (error) {
    console.error("Erreur inattendue récupération instance:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer une instance par code promo
 * @param {string} codePromo - Code promo
 * @returns {Promise<{success: boolean, instance?: Object, error?: string}>}
 */
export const getPromotionInstanceByCode = async (codePromo) => {
  try {
    const { data, error } = await supabase
      .from("promotions_archive")
      .select("*")
      .eq("code_promo", codePromo.toUpperCase())
      .single();

    if (error) {
      console.error("Erreur récupération instance par code:", error);
      return { success: false, error: error.message };
    }

    return { success: true, instance: data };
  } catch (error) {
    console.error("Erreur inattendue récupération instance par code:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer toutes les instances d'un template
 * @param {string} templateId - ID du template
 * @returns {Promise<{success: boolean, instances?: Array, error?: string}>}
 */
export const getInstancesByTemplateId = async (templateId) => {
  try {
    const { data, error } = await supabase
      .from("promotions_archive")
      .select("*")
      .eq("promotion_id", templateId)
      .order("date_debut", { ascending: false });

    if (error) {
      console.error("Erreur récupération instances du template:", error);
      return { success: false, error: error.message };
    }

    return { success: true, instances: data || [] };
  } catch (error) {
    console.error(
      "Erreur inattendue récupération instances du template:",
      error
    );
    return { success: false, error: error.message };
  }
};

/**
 * Mettre à jour une instance
 * @param {string} instanceId - ID de l'instance
 * @param {Object} updates - Données à mettre à jour
 * @returns {Promise<{success: boolean, instance?: Object, error?: string}>}
 */
export const updatePromotionInstance = async (instanceId, updates) => {
  try {
    const { data, error } = await supabase
      .from("promotions_archive")
      .update(updates)
      .eq("id", instanceId)
      .select()
      .single();

    if (error) {
      console.error("Erreur mise à jour instance:", error);
      return { success: false, error: error.message };
    }

    return { success: true, instance: data };
  } catch (error) {
    console.error("Erreur inattendue mise à jour instance:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Mettre en pause une instance
 * @param {string} instanceId - ID de l'instance
 * @returns {Promise<{success: boolean, instance?: Object, error?: string}>}
 */
export const pausePromotionInstance = async (instanceId) => {
  return updatePromotionInstance(instanceId, {
    status: INSTANCE_STATUS.PAUSED,
    is_active: false,
  });
};

/**
 * Reprendre une instance en pause
 * @param {string} instanceId - ID de l'instance
 * @returns {Promise<{success: boolean, instance?: Object, error?: string}>}
 */
export const resumePromotionInstance = async (instanceId) => {
  return updatePromotionInstance(instanceId, {
    status: INSTANCE_STATUS.ACTIVE,
    is_active: true,
  });
};

/**
 * Annuler une instance
 * @param {string} instanceId - ID de l'instance
 * @param {string} reason - Raison de l'annulation
 * @returns {Promise<{success: boolean, instance?: Object, error?: string}>}
 */
export const cancelPromotionInstance = async (instanceId, reason = null) => {
  return updatePromotionInstance(instanceId, {
    status: INSTANCE_STATUS.CANCELLED,
    is_active: false,
    cancelled_at: new Date().toISOString(),
    cancel_reason: reason,
  });
};

/**
 * Marquer une instance comme complétée
 * @param {string} instanceId - ID de l'instance
 * @returns {Promise<{success: boolean, instance?: Object, error?: string}>}
 */
export const completePromotionInstance = async (instanceId) => {
  return updatePromotionInstance(instanceId, {
    status: INSTANCE_STATUS.COMPLETED,
    is_active: false,
    completed_at: new Date().toISOString(),
  });
};

/**
 * Supprimer une instance (soft delete via status)
 * @param {string} instanceId - ID de l'instance
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deletePromotionInstance = async (instanceId) => {
  try {
    // On ne supprime pas, on annule
    return cancelPromotionInstance(instanceId, "Suppression par l'utilisateur");
  } catch (error) {
    console.error("Erreur suppression instance:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Rechercher des instances
 * @param {string} searchTerm - Terme de recherche
 * @param {string} filter - Filtre de date
 * @returns {Promise<{success: boolean, instances?: Array, error?: string}>}
 */
export const searchPromotionInstances = async (searchTerm, filter = "all") => {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return getAllPromotionInstances({ filter });
    }

    const term = searchTerm.trim().toLowerCase();
    const now = new Date().toISOString();

    let query = supabase
      .from("promotions_archive")
      .select("*")
      .or(
        `denomination.ilike.%${term}%,description.ilike.%${term}%,code_promo.ilike.%${term}%`
      );

    // Appliquer le filtre de date
    switch (filter) {
      case "active":
        query = query
          .eq("is_active", true)
          .eq("status", INSTANCE_STATUS.ACTIVE)
          .lte("date_debut", now)
          .gte("date_fin", now);
        break;
      case "flash":
        query = query
          .eq("type_promotion", PROMOTION_TYPES.FLASH)
          .eq("is_active", true)
          .eq("status", INSTANCE_STATUS.ACTIVE)
          .lte("date_debut", now)
          .gte("date_fin", now);
        break;
      case "upcoming":
        query = query.gt("date_debut", now);
        break;
      case "expired":
        query = query.lt("date_fin", now);
        break;
    }

    query = query.order("date_debut", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Erreur recherche instances:", error);
      return { success: false, error: error.message };
    }

    return { success: true, instances: data || [] };
  } catch (error) {
    console.error("Erreur inattendue recherche instances:", error);
    return { success: false, error: error.message };
  }
};

// ==================== VALIDATION CODE PROMO ====================

/**
 * Valider un code promo pour utilisation
 * @param {string} codePromo - Code promo à valider
 * @param {number} panierMontant - Montant du panier (optionnel)
 * @param {string} userId - ID de l'utilisateur (optionnel)
 * @returns {Promise<{valid: boolean, instance?: Object, message?: string, error?: string}>}
 */
export const validateCodePromo = async (
  codePromo,
  panierMontant = null,
  userId = null
) => {
  try {
    // Récupérer l'instance par code promo
    const { success, instance } = await getPromotionInstanceByCode(codePromo);

    if (!success || !instance) {
      return {
        valid: false,
        message: "Code promo invalide ou introuvable",
      };
    }

    const now = new Date();
    const dateDebut = new Date(instance.date_debut);
    const dateFin = new Date(instance.date_fin);

    // Vérifier si l'instance est active
    if (!instance.is_active || instance.status !== INSTANCE_STATUS.ACTIVE) {
      return {
        valid: false,
        instance,
        message: "Cette promotion est désactivée",
      };
    }

    // Vérifier les dates
    if (now < dateDebut) {
      return {
        valid: false,
        instance,
        message: "Cette promotion n'a pas encore commencé",
      };
    }

    if (now > dateFin) {
      return {
        valid: false,
        instance,
        message: "Cette promotion est expirée",
      };
    }

    // Vérifier la limite globale
    if (
      instance.utilisation_max &&
      instance.utilisation_count >= instance.utilisation_max
    ) {
      return {
        valid: false,
        instance,
        message: "Cette promotion a atteint sa limite d'utilisation",
      };
    }

    // Vérifier l'éligibilité panier minimum
    if (
      instance.eligibilite?.type === ELIGIBILITE_TYPES.PANIER_MINIMUM &&
      panierMontant !== null
    ) {
      const minimum = instance.eligibilite.panier_minimum || 0;
      if (panierMontant < minimum) {
        return {
          valid: false,
          instance,
          message: `Montant minimum non atteint: ${minimum} FCFA requis`,
        };
      }
    }

    // TODO: Vérifier la limite par client si userId fourni

    return {
      valid: true,
      instance,
      message: "Code promo valide",
    };
  } catch (error) {
    console.error("Erreur validation code promo:", error);
    return {
      valid: false,
      error: error.message,
      message: "Erreur lors de la validation du code promo",
    };
  }
};

/**
 * Incrémenter le compteur d'utilisation d'une instance
 * @param {string} instanceId - ID de l'instance
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const incrementInstanceUsage = async (instanceId) => {
  try {
    const { success, instance } = await getPromotionInstanceById(instanceId);

    if (!success || !instance) {
      return { success: false, error: "Instance introuvable" };
    }

    const { error } = await supabase
      .from("promotions_archive")
      .update({ utilisation_count: instance.utilisation_count + 1 })
      .eq("id", instanceId);

    if (error) {
      console.error("Erreur incrémentation utilisation:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur inattendue incrémentation:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Mettre à jour les métriques d'une instance
 * @param {string} instanceId - ID de l'instance
 * @param {Object} metrics - Métriques à mettre à jour
 * @returns {Promise<{success: boolean, instance?: Object, error?: string}>}
 */
export const updateInstanceMetrics = async (instanceId, metrics) => {
  try {
    const updates = {};

    if (metrics.revenu_genere !== undefined) {
      updates.revenu_genere = metrics.revenu_genere;
    }
    if (metrics.nombre_commandes !== undefined) {
      updates.nombre_commandes = metrics.nombre_commandes;
    }
    if (metrics.panier_moyen !== undefined) {
      updates.panier_moyen = metrics.panier_moyen;
    }

    return updatePromotionInstance(instanceId, updates);
  } catch (error) {
    console.error("Erreur mise à jour métriques:", error);
    return { success: false, error: error.message };
  }
};

// ==================== STATISTIQUES ====================

/**
 * Obtenir les statistiques des instances
 * @returns {Promise<{success: boolean, stats?: Object, error?: string}>}
 */
export const getPromotionInstancesStats = async () => {
  try {
    const { data, error } = await supabase
      .from("promotions_archive")
      .select("*");

    if (error) {
      console.error("Erreur récupération stats instances:", error);
      return { success: false, error: error.message };
    }

    const now = new Date();

    // Statistiques par type (totaux)
    const byType = {
      flash: data.filter(
        (inst) => inst.type_promotion === PROMOTION_TYPES.FLASH
      ).length,
      happy_hour: data.filter(
        (inst) => inst.type_promotion === PROMOTION_TYPES.HAPPY_HOUR
      ).length,
      standard: data.filter(
        (inst) => inst.type_promotion === PROMOTION_TYPES.STANDARD
      ).length,
      recurrente: data.filter(
        (inst) => inst.type_promotion === PROMOTION_TYPES.RECURRENTE
      ).length,
    };

    // Statistiques des actifs par type
    const activeByType = {
      flash: data.filter((inst) => {
        const dateDebut = new Date(inst.date_debut);
        const dateFin = new Date(inst.date_fin);
        return (
          inst.type_promotion === PROMOTION_TYPES.FLASH &&
          inst.is_active &&
          inst.status === INSTANCE_STATUS.ACTIVE &&
          dateDebut <= now &&
          dateFin >= now
        );
      }).length,
      happy_hour: data.filter((inst) => {
        const dateDebut = new Date(inst.date_debut);
        const dateFin = new Date(inst.date_fin);
        return (
          inst.type_promotion === PROMOTION_TYPES.HAPPY_HOUR &&
          inst.is_active &&
          inst.status === INSTANCE_STATUS.ACTIVE &&
          dateDebut <= now &&
          dateFin >= now
        );
      }).length,
      standard: data.filter((inst) => {
        const dateDebut = new Date(inst.date_debut);
        const dateFin = new Date(inst.date_fin);
        return (
          inst.type_promotion === PROMOTION_TYPES.STANDARD &&
          inst.is_active &&
          inst.status === INSTANCE_STATUS.ACTIVE &&
          dateDebut <= now &&
          dateFin >= now
        );
      }).length,
      recurrente: data.filter((inst) => {
        const dateDebut = new Date(inst.date_debut);
        const dateFin = new Date(inst.date_fin);
        return (
          inst.type_promotion === PROMOTION_TYPES.RECURRENTE &&
          inst.is_active &&
          inst.status === INSTANCE_STATUS.ACTIVE &&
          dateDebut <= now &&
          dateFin >= now
        );
      }).length,
    };

    // Statistiques d'éligibilité
    const eligibilityStats = {
      tous: data.filter(
        (inst) => inst.eligibilite?.type === ELIGIBILITE_TYPES.TOUS
      ).length,
      panier_minimum: data.filter(
        (inst) => inst.eligibilite?.type === ELIGIBILITE_TYPES.PANIER_MINIMUM
      ).length,
      produits: data.filter(
        (inst) => inst.eligibilite?.type === ELIGIBILITE_TYPES.PRODUITS
      ).length,
      categories: data.filter(
        (inst) => inst.eligibilite?.type === ELIGIBILITE_TYPES.CATEGORIES
      ).length,
    };

    // Statistiques par statut
    const byStatus = {
      active: data.filter((inst) => inst.status === INSTANCE_STATUS.ACTIVE)
        .length,
      paused: data.filter((inst) => inst.status === INSTANCE_STATUS.PAUSED)
        .length,
      completed: data.filter(
        (inst) => inst.status === INSTANCE_STATUS.COMPLETED
      ).length,
      cancelled: data.filter(
        (inst) => inst.status === INSTANCE_STATUS.CANCELLED
      ).length,
    };

    const stats = {
      total: data.length,
      active: data.filter((inst) => {
        const dateDebut = new Date(inst.date_debut);
        const dateFin = new Date(inst.date_fin);
        return (
          inst.is_active &&
          inst.status === INSTANCE_STATUS.ACTIVE &&
          dateDebut <= now &&
          dateFin >= now
        );
      }).length,
      by_type: byType,
      active_by_type: activeByType,
      by_eligibility: eligibilityStats,
      by_status: byStatus,
      utilisation_totale: data.reduce(
        (sum, inst) => sum + (inst.utilisation_count || 0),
        0
      ),
      revenu_total: data.reduce(
        (sum, inst) => sum + (inst.revenu_genere || 0),
        0
      ),
      commandes_totales: data.reduce(
        (sum, inst) => sum + (inst.nombre_commandes || 0),
        0
      ),
    };

    return { success: true, stats };
  } catch (error) {
    console.error("Erreur inattendue stats instances:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtenir les statistiques d'une instance spécifique
 * @param {string} instanceId - ID de l'instance
 * @returns {Promise<{success: boolean, stats?: Object, error?: string}>}
 */
export const getInstanceStats = async (instanceId) => {
  try {
    const { success, instance, error } = await getPromotionInstanceById(
      instanceId
    );

    if (!success || !instance) {
      return { success: false, error: error || "Instance introuvable" };
    }

    const stats = {
      utilisation_count: instance.utilisation_count || 0,
      utilisation_max: instance.utilisation_max || null,
      taux_utilisation:
        instance.utilisation_max > 0
          ? ((instance.utilisation_count / instance.utilisation_max) * 100).toFixed(2)
          : null,
      revenu_genere: instance.revenu_genere || 0,
      nombre_commandes: instance.nombre_commandes || 0,
      panier_moyen: instance.panier_moyen || 0,
      temps_restant: getTempsRestant(instance),
      is_active: instance.is_active,
      status: instance.status,
    };

    return { success: true, stats };
  } catch (error) {
    console.error("Erreur récupération stats instance:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtenir les statistiques de performance d'un template
 * @param {string} templateId - ID du template
 * @returns {Promise<{success: boolean, performance?: Object, error?: string}>}
 */
export const getTemplatePerformance = async (templateId) => {
  try {
    const { success, instances, error } = await getInstancesByTemplateId(
      templateId
    );

    if (!success) {
      return { success: false, error };
    }

    const totalInstances = instances.length;
    const activeInstances = instances.filter(
      (inst) => inst.status === INSTANCE_STATUS.ACTIVE
    ).length;
    const completedInstances = instances.filter(
      (inst) => inst.status === INSTANCE_STATUS.COMPLETED
    ).length;

    const totalRevenu = instances.reduce(
      (sum, inst) => sum + (inst.revenu_genere || 0),
      0
    );
    const totalCommandes = instances.reduce(
      (sum, inst) => sum + (inst.nombre_commandes || 0),
      0
    );
    const totalUtilisations = instances.reduce(
      (sum, inst) => sum + (inst.utilisation_count || 0),
      0
    );

    const performance = {
      total_instances: totalInstances,
      active_instances: activeInstances,
      completed_instances: completedInstances,
      total_revenu: totalRevenu,
      total_commandes: totalCommandes,
      total_utilisations: totalUtilisations,
      revenu_moyen_par_instance:
        totalInstances > 0 ? totalRevenu / totalInstances : 0,
      commandes_moyennes_par_instance:
        totalInstances > 0 ? totalCommandes / totalInstances : 0,
    };

    return { success: true, performance };
  } catch (error) {
    console.error("Erreur récupération performance template:", error);
    return { success: false, error: error.message };
  }
};

// ==================== VALIDATION ====================

/**
 * Valider les données d'un template
 * @param {Object} templateData - Données à valider
 * @returns {Object} - {valid: boolean, errors: Object}
 */
export const validatePromotionTemplateData = (templateData) => {
  const errors = {};

  // Validation de la dénomination
  if (
    !templateData.denomination ||
    templateData.denomination.trim().length === 0
  ) {
    errors.denomination = "La dénomination est requise";
  } else if (templateData.denomination.trim().length < 3) {
    errors.denomination =
      "La dénomination doit contenir au moins 3 caractères";
  } else if (templateData.denomination.trim().length > 100) {
    errors.denomination =
      "La dénomination ne peut pas dépasser 100 caractères";
  }

  // Validation du type
  if (templateData.type_promotion) {
    const validTypes = Object.values(PROMOTION_TYPES);
    if (!validTypes.includes(templateData.type_promotion)) {
      errors.type_promotion = `Type invalide. Valeurs acceptées: ${validTypes.join(", ")}`;
    }
  }

  // Validation des réductions
  if (
    (templateData.reduction_absolue == null ||
      templateData.reduction_absolue <= 0) &&
    (templateData.reduction_relative == null ||
      templateData.reduction_relative <= 0)
  ) {
    errors.reduction =
      "Au moins une réduction (absolue ou relative) est requise";
  }

  if (
    templateData.reduction_absolue != null &&
    templateData.reduction_absolue < 0
  ) {
    errors.reduction_absolue = "La réduction absolue ne peut pas être négative";
  }

  if (templateData.reduction_relative != null) {
    if (
      templateData.reduction_relative < 0 ||
      templateData.reduction_relative > 100
    ) {
      errors.reduction_relative =
        "La réduction relative doit être entre 0 et 100";
    }
  }

  // Validation de la durée
  if (!templateData.duree_valeur || templateData.duree_valeur <= 0) {
    errors.duree_valeur = "La durée doit être supérieure à 0";
  }

  if (templateData.duree_unite) {
    const validUnites = Object.values(DUREE_UNITES);
    if (!validUnites.includes(templateData.duree_unite)) {
      errors.duree_unite = `Unité invalide. Valeurs acceptées: ${validUnites.join(", ")}`;
    }
  }

  // Validation de l'éligibilité
  if (templateData.eligibilite) {
    if (typeof templateData.eligibilite !== "object") {
      errors.eligibilite = "L'éligibilité doit être un objet JSON";
    } else if (!templateData.eligibilite.type) {
      errors.eligibilite = "Le type d'éligibilité est requis";
    } else {
      const validEligibiliteTypes = Object.values(ELIGIBILITE_TYPES);
      if (!validEligibiliteTypes.includes(templateData.eligibilite.type)) {
        errors.eligibilite = `Type d'éligibilité invalide. Valeurs acceptées: ${validEligibiliteTypes.join(", ")}`;
      }
    }
  }

  // Validation des limites d'utilisation
  if (
    templateData.utilisation_max != null &&
    templateData.utilisation_max <= 0
  ) {
    errors.utilisation_max =
      "La limite d'utilisation doit être supérieure à 0";
  }

  if (
    templateData.utilisation_max_par_client != null &&
    templateData.utilisation_max_par_client <= 0
  ) {
    errors.utilisation_max_par_client =
      "La limite par client doit être supérieure à 0";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Vérifier si un template avec la même dénomination existe
 * @param {string} denomination - Dénomination à vérifier
 * @param {string} excludeId - ID du template à exclure (pour les mises à jour)
 * @returns {Promise<{exists: boolean, template?: Object}>}
 */
export const checkTemplateExists = async (denomination, excludeId = null) => {
  try {
    let query = supabase
      .from("promotions")
      .select("*")
      .ilike("denomination", denomination.trim());

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur vérification existence template:", error);
      return { exists: false };
    }

    return {
      exists: data && data.length > 0,
      template: data && data.length > 0 ? data[0] : null,
    };
  } catch (error) {
    console.error("Erreur inattendue vérification existence:", error);
    return { exists: false };
  }
};

/**
 * Vérifier si un code promo existe déjà dans les instances actives
 * @param {string} codePromo - Code promo à vérifier
 * @returns {Promise<{exists: boolean, instance?: Object}>}
 */
export const checkCodePromoExists = async (codePromo) => {
  try {
    if (!codePromo || codePromo.trim().length === 0) {
      return { exists: false };
    }

    const { data, error } = await supabase
      .from("promotions_archive")
      .select("*")
      .eq("code_promo", codePromo.toUpperCase().trim())
      .eq("is_active", true);

    if (error) {
      console.error("Erreur vérification existence code promo:", error);
      return { exists: false };
    }

    return {
      exists: data && data.length > 0,
      instance: data && data.length > 0 ? data[0] : null,
    };
  } catch (error) {
    console.error("Erreur inattendue vérification code promo:", error);
    return { exists: false };
  }
};

// ==================== HELPERS ====================

/**
 * Calculer la date de fin à partir de la date de début et de la durée
 * @param {Date} dateDebut - Date de début
 * @param {number} dureeValeur - Valeur de la durée
 * @param {string} dureeUnite - Unité de la durée
 * @returns {Date} Date de fin calculée
 */
export const calculateDateFin = (dateDebut, dureeValeur, dureeUnite) => {
  const dateFin = new Date(dateDebut);

  switch (dureeUnite) {
    case DUREE_UNITES.MINUTES:
      dateFin.setMinutes(dateFin.getMinutes() + dureeValeur);
      break;
    case DUREE_UNITES.HOURS:
      dateFin.setHours(dateFin.getHours() + dureeValeur);
      break;
    case DUREE_UNITES.DAYS:
      dateFin.setDate(dateFin.getDate() + dureeValeur);
      break;
    case DUREE_UNITES.WEEKS:
      dateFin.setDate(dateFin.getDate() + dureeValeur * 7);
      break;
    case DUREE_UNITES.MONTHS:
      dateFin.setMonth(dateFin.getMonth() + dureeValeur);
      break;
    default:
      break;
  }

  return dateFin;
};

/**
 * Calculer le temps restant d'une instance en secondes
 * @param {Object} instance - Objet instance
 * @returns {number} Temps restant en secondes (0 si expirée)
 */
export const getTempsRestant = (instance) => {
  if (!instance || !instance.date_fin) return 0;

  const now = new Date();
  const dateFin = new Date(instance.date_fin);
  const diffMs = dateFin - now;

  return Math.max(0, Math.floor(diffMs / 1000));
};

/**
 * Formater le temps restant en texte lisible
 * @param {number} secondes - Nombre de secondes
 * @returns {string} Texte formaté (ex: "2h 30m", "15m 30s")
 */
export const formatTempsRestant = (secondes) => {
  if (secondes <= 0) return "Expiré";

  const jours = Math.floor(secondes / 86400);
  const heures = Math.floor((secondes % 86400) / 3600);
  const minutes = Math.floor((secondes % 3600) / 60);
  const secs = secondes % 60;

  if (jours > 0) {
    return `${jours}j ${heures}h`;
  } else if (heures > 0) {
    return `${heures}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

/**
 * Calculer le montant de réduction
 * @param {Object} instance - Objet instance
 * @param {number} montantInitial - Montant avant réduction
 * @returns {number} Montant de la réduction
 */
export const calculateReduction = (instance, montantInitial) => {
  if (!instance) return 0;

  let reduction = 0;

  // Réduction absolue
  if (instance.reduction_absolue > 0) {
    reduction += instance.reduction_absolue;
  }

  // Réduction relative
  if (instance.reduction_relative > 0) {
    reduction += (montantInitial * instance.reduction_relative) / 100;
  }

  // Ne pas dépasser le montant initial
  return Math.min(reduction, montantInitial);
};

/**
 * Générer un code promo unique
 * @param {string} prefix - Préfixe du code
 * @param {Date} date - Date pour la génération
 * @returns {string} Code promo généré
 */
export const generateCodePromo = (prefix = "PROMO", date = new Date()) => {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}_${dateStr}_${random}`;
};

/**
 * Formater une date pour affichage
 * @param {string|Date} date - Date à formater
 * @returns {string} Date formatée
 */
export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
