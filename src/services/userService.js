import { supabase } from "@/config/supabase";

/**
 * Service de gestion des utilisateurs
 */

/**
 * Récupérer tous les utilisateurs (superviseur/admin uniquement)
 * @param {Object} options - Options de filtrage
 * @param {string} options.role - Filtrer par rôle
 * @param {boolean} options.isActive - Filtrer par statut actif
 * @param {string} options.searchTerm - Terme de recherche (nom, prenoms, email)
 * @returns {Promise<{users, error}>}
 */
export const getAllUsers = async (options = {}) => {
  try {
    let query = supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    // Filtrer par rôle si spécifié
    if (options.role) {
      query = query.eq("role", options.role);
    }

    // Filtrer par statut actif si spécifié
    if (typeof options.isActive === "boolean") {
      query = query.eq("is_active", options.isActive);
    }

    // Recherche par terme
    if (options.searchTerm) {
      query = query.or(
        `nom.ilike.%${options.searchTerm}%,prenoms.ilike.%${options.searchTerm}%,email.ilike.%${options.searchTerm}%`
      );
    }

    const { data, error } = await query;

    return { users: data || [], error };
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    return { users: [], error };
  }
};

/**
 * Récupérer un utilisateur par ID
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{user, error}>}
 */
export const getUserById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    return { user: data, error };
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return { user: null, error };
  }
};

/**
 * Récupérer un utilisateur par email
 * @param {string} email - Email de l'utilisateur
 * @returns {Promise<{user, error}>}
 */
export const getUserByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    return { user: data, error };
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return { user: null, error };
  }
};

/**
 * Créer un pré-utilisateur dans la table preusers
 * @param {Object} preUserData - Données du pré-utilisateur
 * @returns {Promise<{preUser, error}>}
 */
export const createPreUser = async (preUserData) => {
  try {
    const { data, error } = await supabase
      .from("preusers")
      .insert([
        {
          nom: preUserData.nom,
          prenoms: preUserData.prenoms,
          email: preUserData.email,
          telephone: preUserData.telephone,
          sexe: preUserData.sexe,
          date_naissance: preUserData.dateNaissance,
          role: preUserData.role || "vendeur",
        },
      ])
      .select()
      .single();

    return { preUser: data, error };
  } catch (error) {
    console.error("Erreur lors de la création du pré-utilisateur:", error);
    return { preUser: null, error };
  }
};

/**
 * Récupérer tous les pré-utilisateurs
 * @returns {Promise<{preUsers, error}>}
 */
export const getPreUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("preusers")
      .select("*")
      .order("created_at", { ascending: false });

    return { preUsers: data || [], error };
  } catch (error) {
    console.error("Erreur lors de la récupération des pré-utilisateurs:", error);
    return { preUsers: [], error };
  }
};

/**
 * Supprimer un pré-utilisateur
 * @param {string} email - Email du pré-utilisateur
 * @returns {Promise<{error}>}
 */
export const deletePreUser = async (email) => {
  try {
    const { error } = await supabase
      .from("preusers")
      .delete()
      .eq("email", email);

    return { error };
  } catch (error) {
    console.error("Erreur lors de la suppression du pré-utilisateur:", error);
    return { error };
  }
};

/**
 * Créer un nouvel utilisateur (admin uniquement)
 * Note: Vérifie d'abord que l'email existe dans preusers, puis crée l'utilisateur
 * et supprime l'entrée de preusers
 * @param {Object} userData - Données de l'utilisateur
 * @returns {Promise<{user, error}>}
 */
export const createUser = async (userData) => {
  try {
    // Vérifier que l'email existe dans preusers
    const { data: preUser, error: preUserError } = await supabase
      .from("preusers")
      .select("*")
      .eq("email", userData.email)
      .single();

    if (preUserError || !preUser) {
      return {
        user: null,
        error: {
          message:
            "Cet email n'est pas autorisé. Veuillez d'abord créer un pré-utilisateur.",
        },
      };
    }

    // Créer l'utilisateur
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          nom: userData.nom,
          prenoms: userData.prenoms,
          email: userData.email,
          telephone: userData.telephone,
          sexe: userData.sexe,
          date_naissance: userData.dateNaissance,
          role: userData.role || "vendeur",
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      return { user: null, error };
    }

    // Supprimer le pré-utilisateur après création réussie
    await deletePreUser(userData.email);

    return { user: data, error: null };
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error);
    return { user: null, error };
  }
};

/**
 * Mettre à jour un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} updates - Données à mettre à jour
 * @returns {Promise<{user, error}>}
 */
export const updateUser = async (userId, updates) => {
  try {
    // Retirer les champs qui ne doivent pas être mis à jour directement
    const { id, created_at, updated_at, ...safeUpdates } = updates;

    const { data, error } = await supabase
      .from("users")
      .update(safeUpdates)
      .eq("id", userId)
      .select()
      .single();

    return { user: data, error };
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
    return { user: null, error };
  }
};

/**
 * Désactiver un utilisateur (soft delete)
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{error}>}
 */
export const deactivateUser = async (userId) => {
  try {
    const { error } = await supabase
      .from("users")
      .update({ is_active: false })
      .eq("id", userId);

    return { error };
  } catch (error) {
    console.error("Erreur lors de la désactivation de l'utilisateur:", error);
    return { error };
  }
};

/**
 * Réactiver un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{error}>}
 */
export const activateUser = async (userId) => {
  try {
    const { error } = await supabase
      .from("users")
      .update({ is_active: true })
      .eq("id", userId);

    return { error };
  } catch (error) {
    console.error("Erreur lors de la réactivation de l'utilisateur:", error);
    return { error };
  }
};

/**
 * Upload une photo de profil
 * @param {string} userId - ID de l'utilisateur
 * @param {File} file - Fichier image
 * @returns {Promise<{url, error}>}
 */
export const uploadProfilePhoto = async (userId, file) => {
  try {
    // Générer un nom de fichier unique
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `profile-photos/${fileName}`;

    // Upload le fichier vers Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return { url: null, error: uploadError };
    }

    // Récupérer l'URL publique
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    // Mettre à jour le profil avec l'URL de la photo
    const { error: updateError } = await supabase
      .from("users")
      .update({ photo_url: publicUrl })
      .eq("id", userId);

    if (updateError) {
      return { url: null, error: updateError };
    }

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error("Erreur lors de l'upload de la photo de profil:", error);
    return { url: null, error };
  }
};

/**
 * Récupérer l'historique de connexion d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {number} limit - Nombre maximum d'entrées à récupérer
 * @returns {Promise<{history, error}>}
 */
export const getConnectionHistory = async (userId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from("user_connection_history")
      .select("*")
      .eq("user_id", userId)
      .order("connection_date", { ascending: false })
      .limit(limit);

    return { history: data || [], error };
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de l'historique de connexion:",
      error
    );
    return { history: [], error };
  }
};

/**
 * Vérifier et désactiver les utilisateurs inactifs (6+ mois)
 * @returns {Promise<{deactivatedUsers, error}>}
 */
export const checkInactiveUsers = async () => {
  try {
    // Appeler la fonction PostgreSQL
    const { data, error } = await supabase.rpc(
      "check_and_deactivate_inactive_users"
    );

    return { deactivatedUsers: data || [], error };
  } catch (error) {
    console.error(
      "Erreur lors de la vérification des utilisateurs inactifs:",
      error
    );
    return { deactivatedUsers: [], error };
  }
};

/**
 * Récupérer les statistiques des utilisateurs par rôle
 * @returns {Promise<{stats, error}>}
 */
export const getUserStats = async () => {
  try {
    const { data, error } = await supabase.rpc("count_users_by_role");

    return { stats: data || [], error };
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des statistiques utilisateurs:",
      error
    );
    return { stats: [], error };
  }
};

/**
 * Vérifier si un email existe déjà
 * @param {string} email - Email à vérifier
 * @returns {Promise<{exists, error}>}
 */
export const checkEmailExists = async (email) => {
  try {
    const { data, error } = await supabase.rpc("check_email_exists", {
      user_email: email,
    });

    return { exists: data, error };
  } catch (error) {
    console.error("Erreur lors de la vérification de l'email:", error);
    return { exists: false, error };
  }
};

/**
 * Mettre à jour le last_seen de l'utilisateur connecté
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{error}>}
 */
export const updateLastSeen = async (userId) => {
  try {
    const { error } = await supabase
      .from("users")
      .update({ last_seen: new Date().toISOString() })
      .eq("id", userId);

    return { error };
  } catch (error) {
    console.error("Erreur lors de la mise à jour de last_seen:", error);
    return { error };
  }
};

/**
 * Vérifier si un utilisateur est en ligne (last_seen < 5 minutes)
 * @param {string} lastSeen - Date du dernier seen
 * @returns {boolean}
 */
export const isUserOnline = (lastSeen) => {
  if (!lastSeen) return false;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return new Date(lastSeen) > fiveMinutesAgo;
};

export default {
  getAllUsers,
  getUserById,
  getUserByEmail,
  createPreUser,
  getPreUsers,
  deletePreUser,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  uploadProfilePhoto,
  getConnectionHistory,
  checkInactiveUsers,
  getUserStats,
  checkEmailExists,
  updateLastSeen,
  isUserOnline,
};
