/**
 * Système de permissions basé sur les rôles
 *
 * Hiérarchie des rôles :
 * - admin : Accès complet à toutes les fonctionnalités
 * - superviseur : Peut gérer les utilisateurs (lecture/modification) mais pas créer/supprimer
 * - vendeur : Accès limité à son propre profil uniquement
 */

/**
 * Définition des rôles et de leur hiérarchie
 */
export const ROLES = {
  ADMIN: "admin",
  SUPERVISEUR: "superviseur",
  VENDEUR: "vendeur",
};

/**
 * Hiérarchie des rôles (du plus élevé au plus bas)
 */
const ROLE_HIERARCHY = [ROLES.ADMIN, ROLES.SUPERVISEUR, ROLES.VENDEUR];

/**
 * Vérifie si un rôle est supérieur ou égal à un autre
 * @param {string} userRole - Rôle de l'utilisateur
 * @param {string} requiredRole - Rôle requis
 * @returns {boolean}
 */
export const hasRoleOrHigher = (userRole, requiredRole) => {
  const userRoleIndex = ROLE_HIERARCHY.indexOf(userRole);
  const requiredRoleIndex = ROLE_HIERARCHY.indexOf(requiredRole);
  return userRoleIndex <= requiredRoleIndex;
};

/**
 * Vérifie si l'utilisateur est admin
 * @param {string} userRole - Rôle de l'utilisateur
 * @returns {boolean}
 */
export const isAdmin = (userRole) => {
  return userRole === ROLES.ADMIN;
};

/**
 * Vérifie si l'utilisateur est superviseur ou admin
 * @param {string} userRole - Rôle de l'utilisateur
 * @returns {boolean}
 */
export const isSupervisorOrAdmin = (userRole) => {
  return userRole === ROLES.SUPERVISEUR || userRole === ROLES.ADMIN;
};

/**
 * Vérifie si l'utilisateur peut voir la liste des utilisateurs
 * @param {string} userRole - Rôle de l'utilisateur
 * @returns {boolean}
 */
export const canViewUsers = (userRole) => {
  return isSupervisorOrAdmin(userRole);
};

/**
 * Vérifie si l'utilisateur peut voir un profil utilisateur spécifique
 * @param {string} userRole - Rôle de l'utilisateur actuel
 * @param {string} currentUserId - ID de l'utilisateur actuel
 * @param {string} targetUserId - ID de l'utilisateur cible
 * @returns {boolean}
 */
export const canViewUser = (userRole, currentUserId, targetUserId) => {
  // Admin et superviseur peuvent voir tous les profils
  if (isSupervisorOrAdmin(userRole)) {
    return true;
  }
  // Un utilisateur peut toujours voir son propre profil
  return currentUserId === targetUserId;
};

/**
 * Vérifie si l'utilisateur peut créer un nouvel utilisateur
 * @param {string} userRole - Rôle de l'utilisateur
 * @returns {boolean}
 */
export const canCreateUser = (userRole) => {
  return isAdmin(userRole);
};

/**
 * Vérifie si l'utilisateur peut modifier un profil utilisateur
 * @param {string} userRole - Rôle de l'utilisateur actuel
 * @param {string} currentUserId - ID de l'utilisateur actuel
 * @param {string} targetUserId - ID de l'utilisateur cible
 * @param {string} targetUserRole - Rôle de l'utilisateur cible (optionnel)
 * @returns {boolean}
 */
export const canEditUser = (
  userRole,
  currentUserId,
  targetUserId,
  targetUserRole = null
) => {
  // Un utilisateur peut toujours modifier son propre profil
  if (currentUserId === targetUserId) {
    return true;
  }

  // Les admins peuvent modifier tous les profils
  if (isAdmin(userRole)) {
    return true;
  }

  // Les superviseurs peuvent modifier les profils des vendeurs uniquement
  if (userRole === ROLES.SUPERVISEUR && targetUserRole === ROLES.VENDEUR) {
    return true;
  }

  return false;
};

/**
 * Vérifie si l'utilisateur peut modifier le rôle d'un autre utilisateur
 * @param {string} userRole - Rôle de l'utilisateur actuel
 * @param {string} currentUserId - ID de l'utilisateur actuel
 * @param {string} targetUserId - ID de l'utilisateur cible
 * @returns {boolean}
 */
export const canEditUserRole = (userRole, currentUserId, targetUserId) => {
  // Personne ne peut modifier son propre rôle
  if (currentUserId === targetUserId) {
    return false;
  }

  // Seuls les admins peuvent modifier les rôles
  return isAdmin(userRole);
};

/**
 * Vérifie si l'utilisateur peut désactiver un compte utilisateur
 * @param {string} userRole - Rôle de l'utilisateur actuel
 * @param {string} currentUserId - ID de l'utilisateur actuel
 * @param {string} targetUserId - ID de l'utilisateur cible
 * @returns {boolean}
 */
export const canDeactivateUser = (userRole, currentUserId, targetUserId) => {
  // Personne ne peut désactiver son propre compte
  if (currentUserId === targetUserId) {
    return false;
  }

  // Seuls les admins peuvent désactiver des comptes
  return isAdmin(userRole);
};

/**
 * Vérifie si l'utilisateur peut réinitialiser le mot de passe d'un autre utilisateur
 * @param {string} userRole - Rôle de l'utilisateur actuel
 * @param {string} currentUserId - ID de l'utilisateur actuel
 * @param {string} targetUserId - ID de l'utilisateur cible
 * @param {string} targetUserRole - Rôle de l'utilisateur cible (optionnel)
 * @returns {boolean}
 */
export const canResetUserPassword = (
  userRole,
  currentUserId,
  targetUserId,
  targetUserRole = null
) => {
  // Personne ne peut réinitialiser son propre mot de passe via cette fonction
  // (ils utilisent la fonction de changement de mot de passe normale)
  if (currentUserId === targetUserId) {
    return false;
  }

  // Les admins peuvent réinitialiser tous les mots de passe
  if (isAdmin(userRole)) {
    return true;
  }

  // Les superviseurs peuvent réinitialiser les mots de passe des vendeurs uniquement
  if (userRole === ROLES.SUPERVISEUR && targetUserRole === ROLES.VENDEUR) {
    return true;
  }

  return false;
};

/**
 * Vérifie si l'utilisateur peut voir l'historique de connexion
 * @param {string} userRole - Rôle de l'utilisateur actuel
 * @param {string} currentUserId - ID de l'utilisateur actuel
 * @param {string} targetUserId - ID de l'utilisateur cible
 * @returns {boolean}
 */
export const canViewConnectionHistory = (
  userRole,
  currentUserId,
  targetUserId
) => {
  // Un utilisateur peut voir son propre historique
  if (currentUserId === targetUserId) {
    return true;
  }

  // Admin et superviseur peuvent voir tous les historiques
  return isSupervisorOrAdmin(userRole);
};

/**
 * Vérifie si l'utilisateur peut accéder à la section comptabilité
 * @param {string} userRole - Rôle de l'utilisateur
 * @returns {boolean}
 */
export const canAccessAccounting = (userRole) => {
  return isSupervisorOrAdmin(userRole);
};

/**
 * Vérifie si l'utilisateur peut accéder aux statistiques avancées
 * @param {string} userRole - Rôle de l'utilisateur
 * @returns {boolean}
 */
export const canAccessAdvancedStats = (userRole) => {
  return isSupervisorOrAdmin(userRole);
};

/**
 * Vérifie si l'utilisateur peut gérer le stock
 * @param {string} userRole - Rôle de l'utilisateur
 * @returns {boolean}
 */
export const canManageStock = (userRole) => {
  return isSupervisorOrAdmin(userRole);
};

/**
 * Vérifie si l'utilisateur peut accéder aux paramètres système
 * @param {string} userRole - Rôle de l'utilisateur
 * @returns {boolean}
 */
export const canAccessSettings = (userRole) => {
  return isAdmin(userRole);
};

/**
 * Retourne la liste des permissions pour un rôle donné
 * @param {string} userRole - Rôle de l'utilisateur
 * @returns {object} Object avec toutes les permissions booléennes
 */
export const getUserPermissions = (userRole) => {
  return {
    // Permissions utilisateurs
    canViewUsers: canViewUsers(userRole),
    canCreateUser: canCreateUser(userRole),

    // Permissions modules
    canAccessAccounting: canAccessAccounting(userRole),
    canAccessAdvancedStats: canAccessAdvancedStats(userRole),
    canManageStock: canManageStock(userRole),
    canAccessSettings: canAccessSettings(userRole),

    // Rôle
    isAdmin: isAdmin(userRole),
    isSupervisorOrAdmin: isSupervisorOrAdmin(userRole),
  };
};
