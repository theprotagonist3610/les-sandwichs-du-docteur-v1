import { createBrowserRouter } from "react-router-dom";
import ErrorLayout from "@/layouts/ErrorLayout";
import NotFound from "@/pages/NotFound";
import useActiveUserStore from "@/features/auth/store/activeUserStore";
import vendeurRoutes, { publicRoutes } from "./vendeurRoutes";
import superviseurRoutes from "./superviseurRoutes";

export const createAppRouter = (role = null) => {
  const mainRoutes =
    role === "superviseur" || role === "admin" ? superviseurRoutes : vendeurRoutes;

  return createBrowserRouter([
    mainRoutes,
    ...publicRoutes,
    {
      path: "*",
      element: <ErrorLayout />,
      children: [{ index: true, element: <NotFound /> }],
    },
  ]);
};

export const useAppRouter = () => {
  const role = useActiveUserStore((s) => s.getUserRole());
  return createAppRouter(role);
};
