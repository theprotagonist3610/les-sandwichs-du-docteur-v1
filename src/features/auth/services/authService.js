import { supabase } from "@/lib/supabase";

export const signUp = async (email, password, userData) => {
  try {
    // emailRedirectTo requis pour éviter l'erreur "email not confirmed" côté Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/connexion` },
    });

    if (authError) {
      if (authError.message?.includes("already registered")) {
        return { user: null, error: { message: "Un compte existe déjà avec cet email." } };
      }
      return { user: null, error: authError };
    }

    if (!authData.user) {
      return { user: null, error: { message: "Erreur lors de la création du compte" } };
    }

    const { error: insertError } = await supabase.from("pending_users").insert([
      {
        id: authData.user.id,
        email,
        nom: userData.nom,
        prenoms: userData.prenoms,
        telephone: userData.telephone || null,
        sexe: userData.sexe || null,
        date_naissance: userData.dateNaissance || null,
        requested_role: "vendeur",
        status: "pending",
      },
    ]);

    if (insertError) {
      return {
        user: null,
        error: {
          message:
            "Erreur lors de l'enregistrement de votre inscription. Veuillez contacter le support avec ce code: " +
            authData.user.id.substring(0, 8),
        },
      };
    }

    // Déconnecter immédiatement — le compte doit être approuvé avant connexion
    await supabase.auth.signOut();

    return {
      user: authData.user,
      error: null,
      message:
        "Votre inscription a été enregistrée et est en attente d'approbation par un administrateur.",
    };
  } catch (error) {
    return { user: null, error };
  }
};

export const signIn = async (email, password) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
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

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !userProfile) {
      return {
        user: authData.user,
        session: authData.session,
        profile: null,
        error: { message: "Profil utilisateur introuvable" },
      };
    }

    if (!userProfile.is_active) {
      await supabase.auth.signOut();

      let message = "Votre compte a été désactivé. Contactez un administrateur.";
      if (userProfile.approval_status === "pending") {
        message =
          "Votre compte est en attente d'approbation par un administrateur. Vous recevrez une notification une fois votre compte approuvé.";
      } else if (userProfile.approval_status === "rejected") {
        message = `Votre demande d'inscription a été rejetée. Raison: ${userProfile.rejection_reason || "Non spécifiée"}. Contactez un administrateur.`;
      }

      return { user: null, session: null, profile: null, error: { message } };
    }

    await supabase
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", authData.user.id);

    return { user: authData.user, session: authData.session, profile: userProfile, error: null };
  } catch (error) {
    return { user: null, session: null, profile: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    return { error };
  }
};

export const getSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  } catch (error) {
    return { session: null, error };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { user: null, profile: null, error: userError };

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) return { user, profile: null, error: profileError };
    return { user, profile, error: null };
  } catch (error) {
    return { user: null, profile: null, error };
  }
};

export const changePassword = async (newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  } catch (error) {
    return { error };
  }
};

export const requestPasswordReset = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error ?? null };
  } catch (error) {
    return { error };
  }
};

export const adminResetPassword = async (userId) => {
  try {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    if (userError || !user) return { error: { message: "Utilisateur introuvable" } };

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  } catch (error) {
    return { error };
  }
};

export const onAuthStateChange = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
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
  return () => subscription.unsubscribe();
};
