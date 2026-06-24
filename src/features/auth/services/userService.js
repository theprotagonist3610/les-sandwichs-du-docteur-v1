import { supabase } from "@/lib/supabase";

export const getAllUsers = async (options = {}) => {
  try {
    let query = supabase.from("users").select("*").order("created_at", { ascending: false });
    if (options.role) query = query.eq("role", options.role);
    if (typeof options.isActive === "boolean") query = query.eq("is_active", options.isActive);
    if (options.searchTerm) {
      query = query.or(
        `nom.ilike.%${options.searchTerm}%,prenoms.ilike.%${options.searchTerm}%,email.ilike.%${options.searchTerm}%`
      );
    }
    const { data, error } = await query;
    return { users: data || [], error };
  } catch (error) {
    return { users: [], error };
  }
};

export const getUserById = async (userId) => {
  try {
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
    return { user: data, error };
  } catch (error) {
    return { user: null, error };
  }
};

export const getUserByEmail = async (email) => {
  try {
    const { data, error } = await supabase.from("users").select("*").eq("email", email).single();
    return { user: data, error };
  } catch (error) {
    return { user: null, error };
  }
};

export const createPreUser = async (preUserData) => {
  try {
    const { data, error } = await supabase
      .from("preusers")
      .insert([{
        nom: preUserData.nom,
        prenoms: preUserData.prenoms,
        email: preUserData.email,
        telephone: preUserData.telephone,
        sexe: preUserData.sexe,
        date_naissance: preUserData.dateNaissance,
        role: preUserData.role || "vendeur",
      }])
      .select()
      .single();
    return { preUser: data, error };
  } catch (error) {
    return { preUser: null, error };
  }
};

export const getPreUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("preusers")
      .select("*")
      .order("created_at", { ascending: false });
    return { preUsers: data || [], error };
  } catch (error) {
    return { preUsers: [], error };
  }
};

export const deletePreUser = async (email) => {
  try {
    const { error } = await supabase.from("preusers").delete().eq("email", email);
    return { error };
  } catch (error) {
    return { error };
  }
};

export const createUser = async (userData) => {
  try {
    const { data: preUser, error: preUserError } = await supabase
      .from("preusers")
      .select("*")
      .eq("email", userData.email)
      .single();

    if (preUserError || !preUser) {
      return {
        user: null,
        error: { message: "Cet email n'est pas autorisé. Veuillez d'abord créer un pré-utilisateur." },
      };
    }

    const { data, error } = await supabase
      .from("users")
      .insert([{
        nom: userData.nom,
        prenoms: userData.prenoms,
        email: userData.email,
        telephone: userData.telephone,
        sexe: userData.sexe,
        date_naissance: userData.dateNaissance,
        role: userData.role || "vendeur",
        is_active: true,
      }])
      .select()
      .single();

    if (error) return { user: null, error };

    await deletePreUser(userData.email);
    return { user: data, error: null };
  } catch (error) {
    return { user: null, error };
  }
};

export const updateUser = async (userId, updates) => {
  try {
    // Exclure les champs immuables avant envoi à Supabase
    const { id, created_at, updated_at, ...safeUpdates } = updates;
    const { data, error } = await supabase
      .from("users")
      .update(safeUpdates)
      .eq("id", userId)
      .select()
      .single();
    return { user: data, error };
  } catch (error) {
    return { user: null, error };
  }
};

export const deactivateUser = async (userId) => {
  try {
    const { error } = await supabase.from("users").update({ is_active: false }).eq("id", userId);
    return { error };
  } catch (error) {
    return { error };
  }
};

export const activateUser = async (userId) => {
  try {
    const { error } = await supabase.from("users").update({ is_active: true }).eq("id", userId);
    return { error };
  } catch (error) {
    return { error };
  }
};

export const uploadProfilePhoto = async (userId, file) => {
  try {
    const fileExt = file.name.split(".").pop();
    const filePath = `profile-photos/${userId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { cacheControl: "3600", upsert: true });

    if (uploadError) return { url: null, error: uploadError };

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("users")
      .update({ photo_url: publicUrl })
      .eq("id", userId);

    if (updateError) return { url: null, error: updateError };
    return { url: publicUrl, error: null };
  } catch (error) {
    return { url: null, error };
  }
};

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
    return { history: [], error };
  }
};

export const checkInactiveUsers = async () => {
  try {
    const { data, error } = await supabase.rpc("check_and_deactivate_inactive_users");
    return { deactivatedUsers: data || [], error };
  } catch (error) {
    return { deactivatedUsers: [], error };
  }
};

export const getUserStats = async () => {
  try {
    const { data, error } = await supabase.rpc("count_users_by_role");
    return { stats: data || [], error };
  } catch (error) {
    return { stats: [], error };
  }
};

export const checkEmailExists = async (email) => {
  try {
    const { data, error } = await supabase.rpc("check_email_exists", { user_email: email });
    return { exists: data, error };
  } catch (error) {
    return { exists: false, error };
  }
};

export const updateLastSeen = async (userId) => {
  try {
    const { error } = await supabase
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", userId);
    return { error };
  } catch (error) {
    return { error };
  }
};

export const isUserOnline = (lastLoginAt) => {
  if (!lastLoginAt) return false;
  return new Date(lastLoginAt) > new Date(Date.now() - 5 * 60 * 1000);
};
