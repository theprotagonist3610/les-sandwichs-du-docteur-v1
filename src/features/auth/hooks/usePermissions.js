import { useMemo } from "react";
import useActiveUserStore from "@/features/auth/store/activeUserStore";
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
} from "@/shared/utils/permissions";

const usePermissions = () => {
  const { user } = useActiveUserStore();

  return useMemo(() => {
    if (!user) {
      return {
        canViewUsers: false,
        canCreateUser: false,
        canAccessAccounting: false,
        canAccessAdvancedStats: false,
        canManageStock: false,
        canAccessSettings: false,
        isAdmin: false,
        isSupervisorOrAdmin: false,
        checkCanViewUser: () => false,
        checkCanEditUser: () => false,
        checkCanEditUserRole: () => false,
        checkCanDeactivateUser: () => false,
        checkCanResetUserPassword: () => false,
        checkCanViewConnectionHistory: () => false,
        allPermissions: getUserPermissions(null),
        userRole: null,
        userId: null,
      };
    }

    return {
      canViewUsers: canViewUsers(user.role),
      canCreateUser: canCreateUser(user.role),
      canAccessAccounting: canAccessAccounting(user.role),
      canAccessAdvancedStats: canAccessAdvancedStats(user.role),
      canManageStock: canManageStock(user.role),
      canAccessSettings: canAccessSettings(user.role),
      isAdmin: isAdmin(user.role),
      isSupervisorOrAdmin: isSupervisorOrAdmin(user.role),
      checkCanViewUser: (targetUserId) => canViewUser(user.role, user.id, targetUserId),
      checkCanEditUser: (targetUserId, targetUserRole = null) =>
        canEditUser(user.role, user.id, targetUserId, targetUserRole),
      checkCanEditUserRole: (targetUserId) => canEditUserRole(user.role, user.id, targetUserId),
      checkCanDeactivateUser: (targetUserId) => canDeactivateUser(user.role, user.id, targetUserId),
      checkCanResetUserPassword: (targetUserId, targetUserRole = null) =>
        canResetUserPassword(user.role, user.id, targetUserId, targetUserRole),
      checkCanViewConnectionHistory: (targetUserId) =>
        canViewConnectionHistory(user.role, user.id, targetUserId),
      allPermissions: getUserPermissions(user.role),
      userRole: user.role,
      userId: user.id,
    };
  }, [user]);
};

export default usePermissions;
