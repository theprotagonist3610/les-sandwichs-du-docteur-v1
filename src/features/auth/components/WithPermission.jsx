import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import useActiveUserStore from "@/features/auth/store/activeUserStore";

const WithPermission = (Component, permissionCheck, redirectTo = "/") => {
  return function PermissionWrapper(props) {
    const { user } = useActiveUserStore();
    const navigate = useNavigate();

    useEffect(() => {
      if (!user) { navigate("/connexion"); return; }
      if (!permissionCheck(user.role, user.id)) navigate(redirectTo);
    }, [user, navigate]);

    if (!user) return null;
    if (!permissionCheck(user.role, user.id)) return null;
    return <Component {...props} />;
  };
};

export default WithPermission;
