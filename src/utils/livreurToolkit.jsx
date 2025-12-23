import { supabase } from "@/config/supabase";

/**
 * Toolkit pour la gestion des livreurs
 *
 * Schema d'un livreur:
 * {
 *   id: UUID auto-généré,
 *   denomination: string,
 *   contact: string,
 *   is_active: boolean,
 *   created_at: timestamp,
 *   updated_at: timestamp,
 * }
 *
 * Fonctionnalités:
 * - CRUD complet des livreurs (soft delete avec is_active)
 * - Accessible par tous les utilisateurs (admins, superviseurs, vendeurs)
 * - Recherche par dénomination ou contact
 * - Activation/Désactivation au lieu de suppression
 * - Gestion Supabase
 */

// ==================== CRUD OPERATIONS ====================

/**
 * Créer un nouveau livreur
 * @param {Object} livreurData - Données du livreur
 * @param {string} livreurData.id - UUID du livreur (optionnel, pour sync offline)
 * @param {string} livreurData.denomination - Nom du livreur
 * @param {string} livreurData.contact - Contact du livreur
 * @returns {Promise<{success: boolean, livreur?: Object, error?: string}>}
 */
export const createLivreur = async (livreurData) => {
  try {
    const insertData = {
      denomination: livreurData.denomination,
      contact: livreurData.contact,
      is_active: livreurData.is_active ?? true,
    };

    // Si un UUID est fourni (création offline), l'utiliser
    if (livreurData.id) {
      insertData.id = livreurData.id;
    }

    const { data, error } = await supabase
      .from("livreurs")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error("Erreur création livreur:", error);
      return { success: false, error: error.message };
    }

    return { success: true, livreur: data };
  } catch (error) {
    console.error("Erreur inattendue création livreur:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer tous les livreurs
 * @param {Object} options - Options de filtrage
 * @param {string} options.orderBy - Champ de tri (denomination, contact, created_at)
 * @param {boolean} options.ascending - Ordre croissant (true) ou décroissant (false)
 * @param {boolean} options.includeInactive - Inclure les livreurs inactifs (false par défaut)
 * @returns {Promise<{success: boolean, livreurs?: Array, error?: string}>}
 */
export const getAllLivreurs = async (options = {}) => {
  try {
    const {
      orderBy = "denomination",
      ascending = true,
      includeInactive = false,
    } = options;

    let query = supabase.from("livreurs").select("*");

    // Filtrer les inactifs si demandé
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    // Tri
    query = query.order(orderBy, { ascending });

    const { data, error } = await query;

    if (error) {
      console.error("Erreur récupération livreurs:", error);
      return { success: false, error: error.message };
    }

    return { success: true, livreurs: data || [] };
  } catch (error) {
    console.error("Erreur inattendue récupération livreurs:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer un livreur par son ID
 * @param {string} livreurId - ID du livreur
 * @returns {Promise<{success: boolean, livreur?: Object, error?: string}>}
 */
export const getLivreurById = async (livreurId) => {
  try {
    const { data, error } = await supabase
      .from("livreurs")
      .select("*")
      .eq("id", livreurId)
      .single();

    if (error) {
      console.error("Erreur récupération livreur:", error);
      return { success: false, error: error.message };
    }

    return { success: true, livreur: data };
  } catch (error) {
    console.error("Erreur inattendue récupération livreur:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Mettre à jour un livreur
 * @param {string} livreurId - ID du livreur
 * @param {Object} updates - Données à mettre à jour
 * @param {string} updates.denomination - Nom du livreur
 * @param {string} updates.contact - Contact du livreur
 * @returns {Promise<{success: boolean, livreur?: Object, error?: string}>}
 */
export const updateLivreur = async (livreurId, updates) => {
  try {
    // Le trigger SQL gère automatiquement updated_at, ne pas le définir manuellement
    const { data, error } = await supabase
      .from("livreurs")
      .update(updates)
      .eq("id", livreurId)
      .select()
      .single();

    if (error) {
      console.error("Erreur mise à jour livreur:", error);
      return { success: false, error: error.message };
    }

    return { success: true, livreur: data };
  } catch (error) {
    console.error("Erreur inattendue mise à jour livreur:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Désactiver un livreur (soft delete)
 * @param {string} livreurId - ID du livreur
 * @returns {Promise<{success: boolean, livreur?: Object, error?: string}>}
 */
export const deactivateLivreur = async (livreurId) => {
  try {
    const { data, error } = await supabase
      .from("livreurs")
      .update({ is_active: false })
      .eq("id", livreurId)
      .select()
      .single();

    if (error) {
      console.error("Erreur désactivation livreur:", error);
      return { success: false, error: error.message };
    }

    return { success: true, livreur: data };
  } catch (error) {
    console.error("Erreur inattendue désactivation livreur:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Activer un livreur
 * @param {string} livreurId - ID du livreur
 * @returns {Promise<{success: boolean, livreur?: Object, error?: string}>}
 */
export const activateLivreur = async (livreurId) => {
  try {
    const { data, error } = await supabase
      .from("livreurs")
      .update({ is_active: true })
      .eq("id", livreurId)
      .select()
      .single();

    if (error) {
      console.error("Erreur activation livreur:", error);
      return { success: false, error: error.message };
    }

    return { success: true, livreur: data };
  } catch (error) {
    console.error("Erreur inattendue activation livreur:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Supprimer définitivement un livreur (hard delete - à utiliser avec précaution)
 * @param {string} livreurId - ID du livreur
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteLivreur = async (livreurId) => {
  try {
    const { error } = await supabase
      .from("livreurs")
      .delete()
      .eq("id", livreurId);

    if (error) {
      console.error("Erreur suppression livreur:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur inattendue suppression livreur:", error);
    return { success: false, error: error.message };
  }
};

// ==================== RECHERCHE ====================

/**
 * Rechercher des livreurs par dénomination ou contact
 * @param {string} searchTerm - Terme de recherche
 * @param {boolean} includeInactive - Inclure les livreurs inactifs (false par défaut)
 * @returns {Promise<{success: boolean, livreurs?: Array, error?: string}>}
 */
export const searchLivreurs = async (searchTerm, includeInactive = false) => {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return getAllLivreurs({ includeInactive });
    }

    const term = searchTerm.trim().toLowerCase();

    let query = supabase
      .from("livreurs")
      .select("*")
      .or(`denomination.ilike.%${term}%,contact.ilike.%${term}%`);

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    query = query.order("denomination", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Erreur recherche livreurs:", error);
      return { success: false, error: error.message };
    }

    return { success: true, livreurs: data || [] };
  } catch (error) {
    console.error("Erreur inattendue recherche livreurs:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Rechercher des livreurs par dénomination uniquement
 * @param {string} denomination - Dénomination à rechercher
 * @param {boolean} includeInactive - Inclure les livreurs inactifs (false par défaut)
 * @returns {Promise<{success: boolean, livreurs?: Array, error?: string}>}
 */
export const searchLivreursByDenomination = async (
  denomination,
  includeInactive = false
) => {
  try {
    if (!denomination || denomination.trim().length === 0) {
      return { success: true, livreurs: [] };
    }

    const term = denomination.trim().toLowerCase();

    let query = supabase
      .from("livreurs")
      .select("*")
      .ilike("denomination", `%${term}%`);

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    query = query.order("denomination", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Erreur recherche livreurs par dénomination:", error);
      return { success: false, error: error.message };
    }

    return { success: true, livreurs: data || [] };
  } catch (error) {
    console.error("Erreur inattendue recherche par dénomination:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Rechercher des livreurs par contact uniquement
 * @param {string} contact - Contact à rechercher
 * @param {boolean} includeInactive - Inclure les livreurs inactifs (false par défaut)
 * @returns {Promise<{success: boolean, livreurs?: Array, error?: string}>}
 */
export const searchLivreursByContact = async (
  contact,
  includeInactive = false
) => {
  try {
    if (!contact || contact.trim().length === 0) {
      return { success: true, livreurs: [] };
    }

    const term = contact.trim().toLowerCase();

    let query = supabase
      .from("livreurs")
      .select("*")
      .ilike("contact", `%${term}%`);

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    query = query.order("denomination", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Erreur recherche livreurs par contact:", error);
      return { success: false, error: error.message };
    }

    return { success: true, livreurs: data || [] };
  } catch (error) {
    console.error("Erreur inattendue recherche par contact:", error);
    return { success: false, error: error.message };
  }
};

// ==================== STATISTIQUES ====================

/**
 * Obtenir les statistiques des livreurs
 * @returns {Promise<{success: boolean, stats?: Object, error?: string}>}
 */
export const getLivreursStats = async () => {
  try {
    const { data, error } = await supabase.from("livreurs").select("*");

    if (error) {
      console.error("Erreur récupération stats livreurs:", error);
      return { success: false, error: error.message };
    }

    const stats = {
      total: data.length,
      active: data.filter((livreur) => livreur.is_active).length,
      inactive: data.filter((livreur) => !livreur.is_active).length,
      recentlyAdded: data.filter((livreur) => {
        const createdAt = new Date(livreur.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdAt >= weekAgo;
      }).length,
      recentlyUpdated: data.filter((livreur) => {
        const updatedAt = new Date(livreur.updated_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return updatedAt >= weekAgo;
      }).length,
    };

    return { success: true, stats };
  } catch (error) {
    console.error("Erreur inattendue stats livreurs:", error);
    return { success: false, error: error.message };
  }
};

// ==================== VALIDATION ====================

/**
 * Valider les données d'un livreur
 * @param {Object} livreurData - Données à valider
 * @returns {Object} - {valid: boolean, errors: Object}
 */
export const validateLivreurData = (livreurData) => {
  const errors = {};

  // Validation de la dénomination
  if (
    !livreurData.denomination ||
    livreurData.denomination.trim().length === 0
  ) {
    errors.denomination = "La dénomination est requise";
  } else if (livreurData.denomination.trim().length < 2) {
    errors.denomination = "La dénomination doit contenir au moins 2 caractères";
  } else if (livreurData.denomination.trim().length > 100) {
    errors.denomination = "La dénomination ne peut pas dépasser 100 caractères";
  }

  // Validation du contact
  if (!livreurData.contact || livreurData.contact.trim().length === 0) {
    errors.contact = "Le contact est requis";
  } else if (livreurData.contact.trim().length < 8) {
    errors.contact = "Le contact doit contenir au moins 8 caractères";
  } else if (livreurData.contact.trim().length > 50) {
    errors.contact = "Le contact ne peut pas dépasser 50 caractères";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Vérifier si un livreur avec la même dénomination existe déjà
 * @param {string} denomination - Dénomination à vérifier
 * @param {string} excludeId - ID du livreur à exclure (pour les mises à jour)
 * @returns {Promise<{exists: boolean, livreur?: Object}>}
 */
export const checkLivreurExists = async (denomination, excludeId = null) => {
  try {
    let query = supabase
      .from("livreurs")
      .select("*")
      .ilike("denomination", denomination.trim())
      .eq("is_active", true);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur vérification existence livreur:", error);
      return { exists: false };
    }

    return {
      exists: data && data.length > 0,
      livreur: data && data.length > 0 ? data[0] : null,
    };
  } catch (error) {
    console.error("Erreur inattendue vérification existence:", error);
    return { exists: false };
  }
};
