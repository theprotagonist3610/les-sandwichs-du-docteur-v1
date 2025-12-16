import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import useActiveUserStore from "@/store/activeUserStore";

/**
 * HOC (Higher Order Component) pour protéger les composants avec des permissions
 *
 * @param {React.Component} Component - Composant à protéger
 * @param {Function} permissionCheck - Fonction qui vérifie la permission
 *   - Reçoit (userRole, userId) comme paramètres
 *   - Doit retourner true si l'utilisateur a la permission, false sinon
 * @param {string} redirectTo - Route de redirection si la permission est refusée (par défaut: "/")
 *
 * @example
 * // Protéger une page accessible uniquement aux admins
 * export default WithPermission(
 *   UsersPage,
 *   (userRole) => canViewUsers(userRole),
 *   "/"
 * );
 *
 * @example
 * // Protéger une action spécifique dans un composant
 * const ProtectedButton = WithPermission(
 *   Button,
 *   (userRole) => isAdmin(userRole)
 * );
 */
const WithPermission = (Component, permissionCheck, redirectTo = "/") => {
  return function PermissionWrapper(props) {
    const { user } = useActiveUserStore();
    const navigate = useNavigate();

    useEffect(() => {
      // Si pas d'utilisateur connecté, rediriger vers la connexion
      if (!user) {
        navigate("/connexion");
        return;
      }

      // Vérifier la permission
      const hasPermission = permissionCheck(user.role, user.id);

      // Si pas la permission, rediriger
      if (!hasPermission && redirectTo) {
        navigate(redirectTo);
      }
    }, [user, navigate]);

    // Si pas d'utilisateur, ne rien afficher
    if (!user) {
      return null;
    }

    // Vérifier la permission
    const hasPermission = permissionCheck(user.role, user.id);

    // Si pas la permission, ne rien afficher
    if (!hasPermission) {
      return null;
    }

    // Sinon, afficher le composant
    return <Component {...props} />;
  };
};

export default WithPermission;
