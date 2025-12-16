import useActiveUserStore from "@/store/activeUserStore";

/**
 * Composant de garde de permission pour le rendu conditionnel d'éléments UI
 *
 * @param {Function} permissionCheck - Fonction qui vérifie la permission
 *   - Reçoit (userRole, userId) comme paramètres
 *   - Doit retourner true si l'utilisateur a la permission, false sinon
 * @param {React.ReactNode} children - Contenu à afficher si la permission est accordée
 * @param {React.ReactNode} fallback - Contenu à afficher si la permission est refusée (optionnel)
 *
 * @example
 * // Afficher un bouton uniquement pour les admins
 * <PermissionGuard permissionCheck={(userRole) => isAdmin(userRole)}>
 *   <Button>Créer un utilisateur</Button>
 * </PermissionGuard>
 *
 * @example
 * // Avec un fallback
 * <PermissionGuard
 *   permissionCheck={(userRole) => canEditUser(userRole, userId, targetId)}
 *   fallback={<p>Vous n'avez pas la permission de modifier cet utilisateur</p>}
 * >
 *   <EditUserForm />
 * </PermissionGuard>
 */
const PermissionGuard = ({ permissionCheck, children, fallback = null }) => {
  const { user } = useActiveUserStore();

  // Si pas d'utilisateur connecté, ne rien afficher
  if (!user) {
    return fallback;
  }

  // Vérifier la permission
  const hasPermission = permissionCheck(user.role, user.id);

  // Si pas la permission, afficher le fallback
  if (!hasPermission) {
    return fallback;
  }

  // Sinon, afficher le contenu
  return <>{children}</>;
};

export default PermissionGuard;
