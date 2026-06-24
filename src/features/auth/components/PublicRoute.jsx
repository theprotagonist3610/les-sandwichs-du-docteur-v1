import { Navigate } from "react-router-dom";
import useActiveUserStore from "@/features/auth/store/activeUserStore";

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useActiveUserStore();
  if (isAuthenticated()) return <Navigate to="/" replace />;
  return children;
};

export default PublicRoute;
