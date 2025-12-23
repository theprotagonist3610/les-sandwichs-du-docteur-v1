import { supabase } from "@/config/supabase";

/**
 * Toolkit de gestion des t�ches
 * G�re les t�ches avec permissions bas�es sur les r�les
 */

/**
 * R�cup�rer toutes les t�ches visibles par l'utilisateur actuel
 * - Vendeurs: Uniquement leurs propres t�ches
 * - Superviseurs: Toutes les t�ches sauf celles des admins
 * - Admins: Toutes les t�ches
 * @param {Object} filters - Filtres optionnels
 * @param {string} filters.status - Filtrer par statut
 * @param {string} filters.priority - Filtrer par priorit�
 * @param {string} filters.assignedTo - Filtrer par utilisateur assign�
 * @returns {Promise<{tasks, error}>}
 */
export const getAllTasks = async (filters = {}) => {
  try {
    let query = supabase
      .from("tasks")
      .select(`
        *,
        assigned_to_user:assigned_to(id, nom, prenoms, role, photo_url),
        assigned_by_user:assigned_by(id, nom, prenoms, role, photo_url)
      `)
      .eq("is_recurring", false)
      .order("created_at", { ascending: false });

    // Appliquer les filtres
    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.priority) {
      query = query.eq("priority", filters.priority);
    }

    if (filters.assignedTo) {
      query = query.eq("assigned_to", filters.assignedTo);
    }

    const { data, error } = await query;

    return { tasks: data || [], error };
  } catch (error) {
    console.error("Erreur lors de la r�cup�ration des t�ches:", error);
    return { tasks: [], error };
  }
};

/**
 * R�cup�rer les t�ches assign�es � un utilisateur sp�cifique
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} filters - Filtres optionnels
 * @returns {Promise<{tasks, error}>}
 */
export const getTasksByUser = async (userId, filters = {}) => {
  try {
    let query = supabase
      .from("tasks")
      .select(`
        *,
        assigned_to_user:assigned_to(id, nom, prenoms, role, photo_url),
        assigned_by_user:assigned_by(id, nom, prenoms, role, photo_url)
      `)
      .eq("assigned_to", userId)
      .eq("is_recurring", false)
      .order("created_at", { ascending: false});

    if (filters.status) {
      // Si c'est un tableau, utiliser .in(), sinon .eq()
      if (Array.isArray(filters.status)) {
        query = query.in("status", filters.status);
      } else {
        query = query.eq("status", filters.status);
      }
    }

    const { data, error } = await query;

    return { tasks: data || [], error };
  } catch (error) {
    console.error("Erreur lors de la r�cup�ration des t�ches:", error);
    return { tasks: [], error };
  }
};

/**
 * R�cup�rer une t�che par son ID
 * @param {string} taskId - ID de la t�che
 * @returns {Promise<{task, error}>}
 */
export const getTaskById = async (taskId) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        assigned_to_user:assigned_to(id, nom, prenoms, role, photo_url),
        assigned_by_user:assigned_by(id, nom, prenoms, role, photo_url)
      `)
      .eq("id", taskId)
      .single();

    return { task: data, error };
  } catch (error) {
    console.error("Erreur lors de la r�cup�ration de la t�che:", error);
    return { task: null, error };
  }
};

/**
 * Cr�er une nouvelle t�che
 * Les permissions sont g�r�es au niveau RLS:
 * - Admins: Peuvent assigner � tout le monde
 * - Superviseurs: Peuvent assigner aux superviseurs et vendeurs
 * - Vendeurs: Peuvent s'assigner � eux-m�mes uniquement
 * @param {Object} taskData - Donn�es de la t�che
 * @param {string} taskData.title - Titre de la t�che
 * @param {string} taskData.description - Description
 * @param {string} taskData.assignedTo - ID de l'utilisateur assign�
 * @param {string} taskData.assignedBy - ID de l'utilisateur qui assigne
 * @param {string} taskData.status - Statut (pending, in_progress, completed, cancelled)
 * @param {string} taskData.priority - Priorit� (low, normal, high, urgent)
 * @param {string} taskData.dueDate - Date d'�ch�ance (ISO string)
 * @param {boolean} taskData.isRecurring - Si c'est une t�che r�currente
 * @param {string} taskData.recurrencePattern - Pattern de r�currence (daily, weekly, monthly)
 * @returns {Promise<{task, error}>}
 */
export const createTask = async (taskData) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          title: taskData.title,
          description: taskData.description,
          assigned_to: taskData.assignedTo,
          assigned_by: taskData.assignedBy,
          status: taskData.status || "pending",
          priority: taskData.priority || "normal",
          due_date: taskData.dueDate,
          is_recurring: taskData.isRecurring || false,
          recurrence_pattern: taskData.recurrencePattern || null,
        },
      ])
      .select(`
        *,
        assigned_to_user:assigned_to(id, nom, prenoms, role, photo_url),
        assigned_by_user:assigned_by(id, nom, prenoms, role, photo_url)
      `)
      .single();

    return { task: data, error };
  } catch (error) {
    console.error("Erreur lors de la cr�ation de la t�che:", error);
    return { task: null, error };
  }
};

/**
 * Mettre � jour une t�che
 * @param {string} taskId - ID de la t�che
 * @param {Object} updates - Mises � jour � appliquer
 * @returns {Promise<{task, error}>}
 */
export const updateTask = async (taskId, updates) => {
  try {
    // Retirer les champs qui ne doivent pas �tre mis � jour directement
    const { id, created_at, updated_at, assigned_to_user, assigned_by_user, ...safeUpdates } = updates;

    // Mapper les noms de champs du camelCase au snake_case
    const mappedUpdates = {};
    if (safeUpdates.title !== undefined) mappedUpdates.title = safeUpdates.title;
    if (safeUpdates.description !== undefined) mappedUpdates.description = safeUpdates.description;
    if (safeUpdates.status !== undefined) mappedUpdates.status = safeUpdates.status;
    if (safeUpdates.priority !== undefined) mappedUpdates.priority = safeUpdates.priority;
    if (safeUpdates.dueDate !== undefined) mappedUpdates.due_date = safeUpdates.dueDate;
    if (safeUpdates.assignedTo !== undefined) mappedUpdates.assigned_to = safeUpdates.assignedTo;
    if (safeUpdates.recurrencePattern !== undefined) mappedUpdates.recurrence_pattern = safeUpdates.recurrencePattern;

    const { data, error } = await supabase
      .from("tasks")
      .update(mappedUpdates)
      .eq("id", taskId)
      .select(`
        *,
        assigned_to_user:assigned_to(id, nom, prenoms, role, photo_url),
        assigned_by_user:assigned_by(id, nom, prenoms, role, photo_url)
      `)
      .single();

    return { task: data, error };
  } catch (error) {
    console.error("Erreur lors de la mise � jour de la t�che:", error);
    return { task: null, error };
  }
};

/**
 * Supprimer une t�che
 * Seul l'assigneur ou un admin peut supprimer
 * @param {string} taskId - ID de la t�che
 * @returns {Promise<{error}>}
 */
export const deleteTask = async (taskId) => {
  try {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    return { error };
  } catch (error) {
    console.error("Erreur lors de la suppression de la t�che:", error);
    return { error };
  }
};

/**
 * Marquer une t�che comme termin�e
 * @param {string} taskId - ID de la t�che
 * @returns {Promise<{task, error}>}
 */
export const completeTask = async (taskId) => {
  return updateTask(taskId, { status: "completed" });
};

/**
 * D�marrer une t�che
 * @param {string} taskId - ID de la t�che
 * @returns {Promise<{task, error}>}
 */
export const startTask = async (taskId) => {
  return updateTask(taskId, { status: "in_progress" });
};

/**
 * Annuler une t�che
 * @param {string} taskId - ID de la t�che
 * @returns {Promise<{task, error}>}
 */
export const cancelTask = async (taskId) => {
  return updateTask(taskId, { status: "cancelled" });
};

/**
 * R�cup�rer les t�ches r�currentes (templates)
 * @returns {Promise<{tasks, error}>}
 */
export const getRecurringTasks = async () => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        assigned_to_user:assigned_to(id, nom, prenoms, role, photo_url),
        assigned_by_user:assigned_by(id, nom, prenoms, role, photo_url)
      `)
      .eq("is_recurring", true)
      .is("parent_task_id", null)
      .order("created_at", { ascending: false });

    return { tasks: data || [], error };
  } catch (error) {
    console.error("Erreur lors de la r�cup�ration des t�ches r�currentes:", error);
    return { tasks: [], error };
  }
};

/**
 * Cr�er les t�ches quotidiennes � partir des templates
 * Appelle la fonction PostgreSQL create_daily_tasks
 * @returns {Promise<{error}>}
 */
export const createDailyTasks = async () => {
  try {
    const { error } = await supabase.rpc("create_daily_tasks");

    return { error };
  } catch (error) {
    console.error("Erreur lors de la cr�ation des t�ches quotidiennes:", error);
    return { error };
  }
};

/**
 * V�rifier si l'utilisateur peut assigner une t�che � un autre utilisateur
 * @param {string} assignerRole - R�le de l'utilisateur qui assigne
 * @param {string} assigneeRole - R�le de l'utilisateur � qui on assigne
 * @param {string} assignerId - ID de l'utilisateur qui assigne
 * @param {string} assigneeId - ID de l'utilisateur � qui on assigne
 * @returns {boolean}
 */
export const canAssignTask = (assignerRole, assigneeRole, assignerId, assigneeId) => {
  // Les admins peuvent assigner � tout le monde
  if (assignerRole === "admin") {
    return true;
  }

  // Les superviseurs peuvent assigner aux superviseurs et vendeurs
  if (assignerRole === "superviseur") {
    return assigneeRole === "superviseur" || assigneeRole === "vendeur";
  }

  // Les vendeurs peuvent s'assigner � eux-m�mes uniquement
  if (assignerRole === "vendeur") {
    return assignerId === assigneeId;
  }

  return false;
};

/**
 * R�cup�rer les statistiques des t�ches
 * @param {string} userId - ID de l'utilisateur (optionnel)
 * @returns {Promise<{stats, error}>}
 */
export const getTaskStats = async (userId = null) => {
  try {
    let query = supabase
      .from("tasks")
      .select("status, priority")
      .eq("is_recurring", false);

    if (userId) {
      query = query.eq("assigned_to", userId);
    }

    const { data, error } = await query;

    if (error) return { stats: null, error };

    // Calculer les statistiques
    const stats = {
      total: data.length,
      pending: data.filter((t) => t.status === "pending").length,
      in_progress: data.filter((t) => t.status === "in_progress").length,
      completed: data.filter((t) => t.status === "completed").length,
      cancelled: data.filter((t) => t.status === "cancelled").length,
      high_priority: data.filter((t) => t.priority === "high" || t.priority === "urgent").length,
    };

    return { stats, error: null };
  } catch (error) {
    console.error("Erreur lors du calcul des statistiques:", error);
    return { stats: null, error };
  }
};

export default {
  getAllTasks,
  getTasksByUser,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  startTask,
  cancelTask,
  getRecurringTasks,
  createDailyTasks,
  canAssignTask,
  getTaskStats,
};
