import { supabase } from "@/config/supabase";

/**
 * Service de gestion des approbations d'utilisateurs
 */

/**
 * Récupérer tous les utilisateurs en attente d'approbation
 * @returns {Promise<{data, error}>}
 */
export const getPendingUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("pending_users")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des utilisateurs en attente:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Erreur getPendingUsers:", error);
    return { data: null, error };
  }
};

/**
 * Récupérer tous les utilisateurs approuvés
 * @returns {Promise<{data, error}>}
 */
export const getApprovedUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("approval_status", "approved")
      .order("approved_at", { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des utilisateurs approuvés:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Erreur getApprovedUsers:", error);
    return { data: null, error };
  }
};

/**
 * Récupérer tous les utilisateurs rejetés
 * @returns {Promise<{data, error}>}
 */
export const getRejectedUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("pending_users")
      .select("*")
      .eq("status", "rejected")
      .order("reviewed_at", { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des utilisateurs rejetés:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Erreur getRejectedUsers:", error);
    return { data: null, error };
  }
};

/**
 * Approuver un utilisateur
 * @param {string} userId - ID de l'utilisateur à approuver (ID de pending_users)
 * @param {string} adminId - ID de l'admin qui approuve
 * @returns {Promise<{data, error}>}
 */
export const approveUser = async (userId, adminId) => {
  try {
    console.log("🔄 Approbation de l'utilisateur:", userId);

    // Utiliser la nouvelle fonction SQL qui crée l'utilisateur dans users
    const { data, error } = await supabase.rpc("approve_pending_user", {
      pending_user_id: userId,
      admin_id: adminId,
    });

    if (error) {
      console.error("❌ Erreur lors de l'approbation:", error);
      return { data: null, error };
    }

    console.log("✅ Utilisateur approuvé avec succès:", data);
    return { data, error: null };
  } catch (error) {
    console.error("❌ Erreur approveUser:", error);
    return { data: null, error };
  }
};

/**
 * Rejeter un utilisateur
 * @param {string} userId - ID de l'utilisateur à rejeter (ID de pending_users)
 * @param {string} adminId - ID de l'admin qui rejette
 * @param {string} reason - Raison du rejet
 * @returns {Promise<{data, error}>}
 */
export const rejectUser = async (userId, adminId, reason) => {
  try {
    console.log("🔄 Rejet de l'utilisateur:", userId);

    // Utiliser la nouvelle fonction SQL pour rejeter
    const { data, error } = await supabase.rpc("reject_pending_user", {
      pending_user_id: userId,
      admin_id: adminId,
      reason: reason || "Non spécifié",
    });

    if (error) {
      console.error("❌ Erreur lors du rejet:", error);
      return { data: null, error };
    }

    console.log("✅ Utilisateur rejeté avec succès:", data);
    return { data, error: null };
  } catch (error) {
    console.error("❌ Erreur rejectUser:", error);
    return { data: null, error };
  }
};

/**
 * Compter les utilisateurs par statut
 * @returns {Promise<{pending, approved, rejected, error}>}
 */
export const getUsersCountByStatus = async () => {
  try {
    // Compter dans pending_users pour pending et rejected
    const { data: pendingData, error: pendingError } = await supabase
      .from("pending_users")
      .select("status");

    if (pendingError) {
      console.error("Erreur lors du comptage pending_users:", pendingError);
      return { pending: 0, approved: 0, rejected: 0, error: pendingError };
    }

    // Compter dans users pour approved
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("id")
      .eq("approval_status", "approved");

    if (usersError) {
      console.error("Erreur lors du comptage users:", usersError);
      return { pending: 0, approved: 0, rejected: 0, error: usersError };
    }

    const counts = {
      pending: pendingData.filter((u) => u.status === "pending").length,
      approved: usersData.length,
      rejected: pendingData.filter((u) => u.status === "rejected").length,
    };

    return { ...counts, error: null };
  } catch (error) {
    console.error("Erreur getUsersCountByStatus:", error);
    return { pending: 0, approved: 0, rejected: 0, error };
  }
};

/**
 * Écouter les changements sur les utilisateurs en attente (temps réel)
 * @param {Function} callback - Fonction appelée lors d'un changement
 * @returns {Function} Fonction de désabonnement
 */
export const subscribeToPendingUsers = (callback) => {
  const subscription = supabase
    .channel("pending_users_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "pending_users",
        filter: "status=eq.pending",
      },
      (payload) => {
        console.log("🔔 Changement détecté sur les utilisateurs en attente:", payload);
        callback(payload);
      }
    )
    .subscribe();

  // Retourner la fonction de désabonnement
  return () => {
    subscription.unsubscribe();
  };
};

export default {
  getPendingUsers,
  getApprovedUsers,
  getRejectedUsers,
  approveUser,
  rejectUser,
  getUsersCountByStatus,
  subscribeToPendingUsers,
};
