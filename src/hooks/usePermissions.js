import { useMemo } from "react";
import useActiveUserStore from "@/store/activeUserStore";
import {
  canViewUsers,
  canViewUser,
  canCreateUser,
  canEditUser,
  canEditUserRole,
  canDeactivateUser,
  canResetUserPassword,
  canViewConnectionHistory,
  canAccessAccounting,
  canAccessAdvancedStats,
  canManageStock,
  canAccessSettings,
  getUserPermissions,
  isAdmin,
  isSupervisorOrAdmin,
} from "@/utils/permissions";

/**
 * Hook personnalisé pour accéder aux permissions de l'utilisateur actuel
 *
 * @returns {object} Object contenant toutes les fonctions de vérification de permissions
 *
 * @example
 * const { canCreateUser, isAdmin, checkCanEditUser } = usePermissions();
 *
 * // Vérifier une permission simple
 * if (canCreateUser) {
 *   // Afficher le bouton de création
 * }
 *
 * // Vérifier une permission avec paramètres
 * if (checkCanEditUser(targetUserId, targetUserRole)) {
 *   // Afficher le bouton d'édition
 * }
 */
const usePermissions = () => {
  const { user } = useActiveUserStore();

  // Mémoriser les permissions pour éviter les recalculs inutiles
  const permissions = useMemo(() => {
    if (!user) {
      return {
        // Permissions simples (booléennes)
        canViewUsers: false,
        canCreateUser: false,
        canAccessAccounting: false,
        canAccessAdvancedStats: false,
        canManageStock: false,
        canAccessSettings: false,
        isAdmin: false,
        isSupervisorOrAdmin: false,

        // Fonctions de vérification avec paramètres
        checkCanViewUser: () => false,
        checkCanEditUser: () => false,
        checkCanEditUserRole: () => false,
        checkCanDeactivateUser: () => false,
        checkCanResetUserPassword: () => false,
        checkCanViewConnectionHistory: () => false,

        // Objet de permissions
        allPermissions: getUserPermissions(null),

        // Informations utilisateur
        userRole: null,
        userId: null,
      };
    }

    return {
      // Permissions simples (booléennes)
      canViewUsers: canViewUsers(user.role),
      canCreateUser: canCreateUser(user.role),
      canAccessAccounting: canAccessAccounting(user.role),
      canAccessAdvancedStats: canAccessAdvancedStats(user.role),
      canManageStock: canManageStock(user.role),
      canAccessSettings: canAccessSettings(user.role),
      isAdmin: isAdmin(user.role),
      isSupervisorOrAdmin: isSupervisorOrAdmin(user.role),

      // Fonctions de vérification avec paramètres
      checkCanViewUser: (targetUserId) =>
        canViewUser(user.role, user.id, targetUserId),
      checkCanEditUser: (targetUserId, targetUserRole = null) =>
        canEditUser(user.role, user.id, targetUserId, targetUserRole),
      checkCanEditUserRole: (targetUserId) =>
        canEditUserRole(user.role, user.id, targetUserId),
      checkCanDeactivateUser: (targetUserId) =>
        canDeactivateUser(user.role, user.id, targetUserId),
      checkCanResetUserPassword: (targetUserId, targetUserRole = null) =>
        canResetUserPassword(user.role, user.id, targetUserId, targetUserRole),
      checkCanViewConnectionHistory: (targetUserId) =>
        canViewConnectionHistory(user.role, user.id, targetUserId),

      // Objet de permissions
      allPermissions: getUserPermissions(user.role),

      // Informations utilisateur
      userRole: user.role,
      userId: user.id,
    };
  }, [user]);

  return permissions;
};

export default usePermissions;
