import { Navigate } from "react-router-dom";
import useActiveUserStore from "@/features/auth/store/activeUserStore";

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isAuthenticated } = useActiveUserStore();

  if (!isAuthenticated()) {
    return <Navigate to="/connexion" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
