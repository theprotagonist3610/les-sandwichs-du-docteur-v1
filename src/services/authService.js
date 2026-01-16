import { supabase } from "@/config/supabase";

/**
 * Service d'authentification avec Supabase
 */

/**
 * Inscription d'un nouvel utilisateur (INSCRIPTION LIBRE)
 * Le compte est créé avec le statut "pending" et nécessite l'approbation d'un admin
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe
 * @param {Object} userData - Données supplémentaires (nom, prenoms, etc.)
 * @returns {Promise<{user, error}>}
 */
export const signUp = async (email, password, userData) => {
  try {
    console.log("🚀 Début de l'inscription pour:", email);

    // 1. Créer le compte dans auth.users
    // On laisse Supabase gérer la vérification des doublons d'email
    // IMPORTANT: emailRedirectTo est nécessaire pour éviter l'erreur "email not confirmed"
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/connexion`,
        // Si la confirmation d'email est activée dans Supabase, l'utilisateur recevra un email
        // Mais avec le système pending_users, on ne vérifie pas si l'email est confirmé
      },
    });

    if (authError) {
      console.error("❌ Erreur auth.signUp:", authError);
      // Traduire l'erreur de doublon d'email si nécessaire
      if (authError.message?.includes("already registered")) {
        return {
          user: null,
          error: { message: "Un compte existe déjà avec cet email." },
        };
      }
      return { user: null, error: authError };
    }

    if (!authData.user) {
      return {
        user: null,
        error: { message: "Erreur lors de la création du compte" },
      };
    }

    console.log("✅ Compte auth créé:", authData.user.id);

    // 2. Créer l'inscription en attente dans pending_users
    // IMPORTANT: On n'insère PAS dans users ici - ce sera fait lors de l'approbation
    const { error: insertError } = await supabase.from("pending_users").insert([
      {
        id: authData.user.id,
        email: email,
        nom: userData.nom,
        prenoms: userData.prenoms,
        telephone: userData.telephone || null,
        sexe: userData.sexe || null,
        date_naissance: userData.dateNaissance || null,
        requested_role: "vendeur", // Rôle demandé (toujours vendeur à l'inscription)
        status: "pending", // En attente d'approbation
      },
    ]);

    if (insertError) {
      console.error("❌ Erreur lors de la création de l'inscription:", insertError);
      console.error("⚠️ ATTENTION: Compte auth créé:", authData.user.id);
      console.error("⚠️ L'inscription n'a pas pu être enregistrée dans pending_users");

      return {
        user: null,
        error: {
          message: "Erreur lors de l'enregistrement de votre inscription. Veuillez contacter le support avec ce code: " + authData.user.id.substring(0, 8),
        },
      };
    }

    console.log("✅ Inscription enregistrée avec succès dans pending_users - En attente d'approbation");

    // 3. Déconnecter l'utilisateur (il ne peut pas se connecter tant qu'il n'est pas approuvé)
    await supabase.auth.signOut();

    return {
      user: authData.user,
      error: null,
      message: "Votre inscription a été enregistrée et est en attente d'approbation par un administrateur.",
    };
  } catch (error) {
    console.error("❌ Erreur lors de l'inscription:", error);
    return { user: null, error };
  }
};

/**
 * Connexion d'un utilisateur
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe
 * @returns {Promise<{user, session, profile, error}>}
 */
export const signIn = async (email, password) => {
  try {
    // 1. Authentification
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      return {
        user: null,
        session: null,
        profile: null,
        error: authError || { message: "Connexion impossible" },
      };
    }

    const userId = authData.user.id;

    // 2. Récupération du profil utilisateur (APRÈS auth)
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !userProfile) {
      return {
        user: authData.user,
        session: authData.session,
        profile: null,
        error: { message: "Profil utilisateur introuvable" },
      };
    }

    // 3. Vérification métier
    if (!userProfile.is_active) {
      // Déconnexion immédiate
      await supabase.auth.signOut();

      // Message personnalisé selon le statut d'approbation
      let errorMessage = "Votre compte a été désactivé. Contactez un administrateur.";

      if (userProfile.approval_status === "pending") {
        errorMessage = "Votre compte est en attente d'approbation par un administrateur. Vous recevrez une notification une fois votre compte approuvé.";
      } else if (userProfile.approval_status === "rejected") {
        errorMessage = `Votre demande d'inscription a été rejetée. Raison: ${userProfile.rejection_reason || "Non spécifiée"}. Contactez un administrateur pour plus d'informations.`;
      }

      return {
        user: null,
        session: null,
        profile: null,
        error: {
          message: errorMessage,
        },
      };
    }

    // 4. Mise à jour de la dernière connexion
    await supabase
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", userId);

    return {
      user: authData.user,
      session: authData.session,
      profile: userProfile,
      error: null,
    };
  } catch (error) {
    console.error("Erreur lors de la connexion :", error);
    return { user: null, session: null, profile: null, error };
  }
};

/**
 * Déconnexion de l'utilisateur
 * @returns {Promise<{error}>}
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    return { error };
  }
};

/**
 * Récupérer la session actuelle
 * @returns {Promise<{session, error}>}
 */
export const getSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  } catch (error) {
    console.error("Erreur lors de la récupération de la session:", error);
    return { session: null, error };
  }
};

/**
 * Récupérer l'utilisateur actuel avec son profil complet
 * @returns {Promise<{user, profile, error}>}
 */
export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { user: null, profile: null, error: userError };
    }

    // Récupérer le profil complet
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return { user, profile: null, error: profileError };
    }

    return { user, profile, error: null };
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return { user: null, profile: null, error };
  }
};

/**
 * Changer le mot de passe de l'utilisateur actuel
 * @param {string} newPassword - Nouveau mot de passe
 * @returns {Promise<{error}>}
 */
export const changePassword = async (newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { error };
  } catch (error) {
    console.error("Erreur lors du changement de mot de passe:", error);
    return { error };
  }
};

/**
 * Envoyer un email de réinitialisation de mot de passe
 * @param {string} email - Email de l'utilisateur
 * @returns {Promise<{error}>}
 */
export const resetPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { error };
  } catch (error) {
    console.error(
      "Erreur lors de l'envoi de l'email de réinitialisation:",
      error
    );
    return { error };
  }
};

/**
 * Demander un lien de réinitialisation de mot de passe (alias de resetPassword)
 * Envoie un email avec un lien magique pour réinitialiser le mot de passe
 * @param {string} email - Email de l'utilisateur
 * @returns {Promise<{error}>}
 */
export const requestPasswordReset = async (email) => {
  try {
    console.log("📧 Envoi d'un email de réinitialisation pour:", email);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error("❌ Erreur lors de l'envoi de l'email:", error);
      return { error };
    }

    console.log("✅ Email de réinitialisation envoyé avec succès");
    return { error: null };
  } catch (error) {
    console.error("❌ Erreur lors de la demande de réinitialisation:", error);
    return { error };
  }
};

/**
 * Réinitialiser le mot de passe d'un utilisateur (admin uniquement)
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{error}>}
 */
export const adminResetPassword = async (userId) => {
  try {
    // Récupérer l'email de l'utilisateur
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return { error: { message: "Utilisateur introuvable" } };
    }

    // Envoyer l'email de réinitialisation
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { error };
  } catch (error) {
    console.error(
      "Erreur lors de la réinitialisation admin du mot de passe:",
      error
    );
    return { error };
  }
};

/**
 * Écouter les changements d'état d'authentification
 * @param {Function} callback - Fonction appelée lors d'un changement d'état
 * @returns {Function} Fonction pour se désabonner
 */
export const onAuthStateChange = (callback) => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      // Récupérer le profil complet
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      callback(event, session, profile);
    } else {
      callback(event, session, null);
    }
  });

  // Retourner la fonction de désabonnement
  return () => subscription.unsubscribe();
};

export default {
  signUp,
  signIn,
  signOut,
  getSession,
  getCurrentUser,
  changePassword,
  resetPassword,
  requestPasswordReset,
  adminResetPassword,
  onAuthStateChange,
};
