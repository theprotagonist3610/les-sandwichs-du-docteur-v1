import useActiveUserStore from "@/features/auth/store/activeUserStore";

const PermissionGuard = ({ permissionCheck, children, fallback = null }) => {
  const { user } = useActiveUserStore();
  if (!user) return fallback;
  if (!permissionCheck(user.role, user.id)) return fallback;
  return <>{children}</>;
};

export default PermissionGuard;
