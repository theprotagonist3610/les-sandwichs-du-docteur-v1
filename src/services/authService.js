import { supabase } from "@/config/supabase";

/**
 * Service d'authentification avec Supabase
 */

/**
 * Inscription d'un nouvel utilisateur
 * IMPORTANT: L'email doit déjà exister dans la table users (créé par un admin)
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe
 * @param {Object} userData - Données supplémentaires (nom, prenoms, etc.)
 * @returns {Promise<{user, error}>}
 */
export const signUp = async (email, password, userData) => {
  try {
    // 1. Vérifier d'abord si l'email existe dans la table users
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .single();

    if (checkError || !existingUser) {
      return {
        user: null,
        error: {
          message:
            "Cet email n'est pas autorisé à créer un compte. Contactez un administrateur.",
        },
      };
    }

    // 2. Créer le compte auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return { user: null, error: authError };
    }

    // 3. Mettre à jour le profil utilisateur avec les données complètes
    if (authData.user) {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          nom: userData.nom,
          prenoms: userData.prenoms,
          telephone: userData.telephone,
          sexe: userData.sexe,
          date_naissance: userData.dateNaissance,
          updated_at: new Date().toISOString(),
        })
        .eq("email", email);

      if (updateError) {
        console.error("Erreur lors de la mise à jour du profil:", updateError);
      }
    }

    return { user: authData.user, error: null };
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    return { user: null, error };
  }
};

/**
 * Connexion d'un utilisateur
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe
 * @returns {Promise<{user, session, profile, error}>}
 */
// export const signIn = async (email, password) => {
//   try {
//     // 1. Vérifier si l'utilisateur est actif
//     const { data: userProfile, error: profileError } = await supabase
//       .from("users")
//       .select("*");
//     // .eq("email", email)
//     // .single();
//     console.log(userProfile);
//     if (profileError || !userProfile) {
//       console.log(`${email},${password}`);
//       console.log(profileError, userProfile);
//       return {
//         user: null,
//         session: null,
//         profile: null,
//         error: { message: "Utilisateur introuvable" },
//       };
//     }

//     if (!userProfile.is_active) {
//       return {
//         user: null,
//         session: null,
//         profile: null,
//         error: {
//           message: "Votre compte a été désactivé. Contactez un administrateur.",
//         },
//       };
//     }

//     // 2. Se connecter avec Supabase Auth
//     const { data, error: authError } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     if (authError) {
//       // Enregistrer l'échec de connexion
//       await supabase.from("user_connection_history").insert({
//         user_id: userProfile.id,
//         success: false,
//         failure_reason: authError.message,
//       });

//       return { user: null, session: null, profile: null, error: authError };
//     }

//     // 3. Mettre à jour la date de dernière connexion
//     await supabase
//       .from("users")
//       .update({ last_login_at: new Date().toISOString() })
//       .eq("id", data.user.id);

//     // 4. Récupérer le profil complet mis à jour
//     const { data: updatedProfile } = await supabase
//       .from("users")
//       .select("*")
//       .eq("id", data.user.id)
//       .single();

//     return {
//       user: data.user,
//       session: data.session,
//       profile: updatedProfile,
//       error: null,
//     };
//   } catch (error) {
//     console.error("Erreur lors de la connexion:", error);
//     return { user: null, session: null, profile: null, error };
//   }
// };

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

      return {
        user: null,
        session: null,
        profile: null,
        error: {
          message: "Votre compte a été désactivé. Contactez un administrateur.",
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
  adminResetPassword,
  onAuthStateChange,
};
