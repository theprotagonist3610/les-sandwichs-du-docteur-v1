export const ROLES = {
  ADMIN: "admin",
  SUPERVISEUR: "superviseur",
  VENDEUR: "vendeur",
};

// Du plus élevé au plus bas — indexOf() sert à comparer les niveaux
const ROLE_HIERARCHY = [ROLES.ADMIN, ROLES.SUPERVISEUR, ROLES.VENDEUR];

export const hasRoleOrHigher = (userRole, requiredRole) =>
  ROLE_HIERARCHY.indexOf(userRole) <= ROLE_HIERARCHY.indexOf(requiredRole);

export const isAdmin = (userRole) => userRole === ROLES.ADMIN;

export const isSupervisorOrAdmin = (userRole) =>
  userRole === ROLES.SUPERVISEUR || userRole === ROLES.ADMIN;

export const canViewUsers = (userRole) => isSupervisorOrAdmin(userRole);

export const canViewUser = (userRole, currentUserId, targetUserId) =>
  isSupervisorOrAdmin(userRole) || currentUserId === targetUserId;

export const canCreateUser = (userRole) => isAdmin(userRole);

export const canEditUser = (userRole, currentUserId, targetUserId, targetUserRole = null) => {
  if (currentUserId === targetUserId) return true;
  if (isAdmin(userRole)) return true;
  return userRole === ROLES.SUPERVISEUR && targetUserRole === ROLES.VENDEUR;
};

// Personne ne peut modifier son propre rôle — seuls les admins modifient les rôles
export const canEditUserRole = (userRole, currentUserId, targetUserId) =>
  currentUserId !== targetUserId && isAdmin(userRole);

// Personne ne peut désactiver son propre compte
export const canDeactivateUser = (userRole, currentUserId, targetUserId) =>
  currentUserId !== targetUserId && isAdmin(userRole);

// Réinitialisation du mot de passe d'autrui via admin — ne concerne pas le changement de son propre mdp
export const canResetUserPassword = (userRole, currentUserId, targetUserId, targetUserRole = null) => {
  if (currentUserId === targetUserId) return false;
  if (isAdmin(userRole)) return true;
  return userRole === ROLES.SUPERVISEUR && targetUserRole === ROLES.VENDEUR;
};

export const canViewConnectionHistory = (userRole, currentUserId, targetUserId) =>
  currentUserId === targetUserId || isSupervisorOrAdmin(userRole);

export const canAccessAccounting = (userRole) => isSupervisorOrAdmin(userRole);

export const canAccessAdvancedStats = (userRole) => isSupervisorOrAdmin(userRole);

export const canManageStock = (userRole) => isSupervisorOrAdmin(userRole);

// Tous les rôles accèdent aux paramètres (style, notifications, sons, préférences)
export const canAccessSettings = () => true;

export const getUserPermissions = (userRole) => ({
  canViewUsers: canViewUsers(userRole),
  canCreateUser: canCreateUser(userRole),
  canAccessAccounting: canAccessAccounting(userRole),
  canAccessAdvancedStats: canAccessAdvancedStats(userRole),
  canManageStock: canManageStock(userRole),
  canAccessSettings: canAccessSettings(),
  isAdmin: isAdmin(userRole),
  isSupervisorOrAdmin: isSupervisorOrAdmin(userRole),
});
