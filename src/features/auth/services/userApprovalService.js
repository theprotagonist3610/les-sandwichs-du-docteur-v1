import { supabase } from "@/lib/supabase";

export const getPendingUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("pending_users")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getApprovedUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("approval_status", "approved")
      .order("approved_at", { ascending: false });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getRejectedUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("pending_users")
      .select("*")
      .eq("status", "rejected")
      .order("reviewed_at", { ascending: false });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const approveUser = async (userId, adminId) => {
  try {
    const { data, error } = await supabase.rpc("approve_pending_user", {
      pending_user_id: userId,
      admin_id: adminId,
    });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const rejectUser = async (userId, adminId, reason) => {
  try {
    const { data, error } = await supabase.rpc("reject_pending_user", {
      pending_user_id: userId,
      admin_id: adminId,
      reason: reason || "Non spécifié",
    });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getUsersCountByStatus = async () => {
  try {
    const { data: pendingData, error: pendingError } = await supabase
      .from("pending_users")
      .select("status");
    if (pendingError) throw pendingError;

    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("id")
      .eq("approval_status", "approved");
    if (usersError) throw usersError;

    return {
      pending: pendingData.filter((u) => u.status === "pending").length,
      approved: usersData.length,
      rejected: pendingData.filter((u) => u.status === "rejected").length,
      error: null,
    };
  } catch (error) {
    return { pending: 0, approved: 0, rejected: 0, error };
  }
};

export const subscribeToPendingUsers = (callback) => {
  const subscription = supabase
    .channel(`pending_users_changes-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pending_users", filter: "status=eq.pending" },
      callback
    )
    .subscribe();
  return () => subscription.unsubscribe();
};
