import { Navigate } from "react-router-dom";
import useActiveUserStore from "@/store/activeUserStore";

/**
 * Composant de protection des routes
 * Redirige vers /connexion si l'utilisateur n'est pas authentifié
 * Redirige vers les routes appropriées selon le rôle
 */
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isAuthenticated } = useActiveUserStore();

  // Si l'utilisateur n'est pas authentifié, rediriger vers /connexion
  if (!isAuthenticated()) {
    return <Navigate to="/connexion" replace />;
  }

  // Si un rôle spécifique est requis et que l'utilisateur ne l'a pas
  if (requiredRole && user?.role !== requiredRole) {
    // Si l'utilisateur n'a pas de rôle défini, rediriger vers les routes vendeur par défaut
    if (!user?.role) {
      return <Navigate to="/" replace />;
    }

    // Sinon, rediriger vers la page d'accueil appropriée selon son rôle
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
