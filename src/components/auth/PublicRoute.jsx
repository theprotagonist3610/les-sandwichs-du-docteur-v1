import { Navigate } from "react-router-dom";
import useActiveUserStore from "@/store/activeUserStore";

/**
 * Composant pour les routes publiques (comme /connexion)
 * Redirige vers l'accueil si l'utilisateur est déjà authentifié
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useActiveUserStore();

  // Si l'utilisateur est déjà authentifié, rediriger vers l'accueil
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PublicRoute;
