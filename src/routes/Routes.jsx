import { createBrowserRouter } from "react-router-dom";
import ErrorLayout from "@/layouts/ErrorLayout";
import NotFound from "@/pages/NotFound";
import vendeurRoutes, { publicRoutes } from "./vendeurRoutes";
import superviseurRoutes from "./superviseurRoutes";
import useActiveUserStore from "@/store/activeUserStore";

/**
 * Crée le router en fonction du rôle de l'utilisateur
 * @param {string} role - Le rôle de l'utilisateur ("vendeur", "superviseur", ou "admin")
 * @returns Le router configuré selon le rôle
 */
export const createAppRouter = (role = null) => {
  // Sélection des routes selon le rôle
  let mainRoutes;

  if (role === "vendeur") {
    mainRoutes = vendeurRoutes;
  } else if (role === "superviseur" || role === "admin") {
    mainRoutes = superviseurRoutes;
  } else {
    // Par défaut, si pas de rôle, on utilise les routes vendeur
    mainRoutes = vendeurRoutes;
  }

  return createBrowserRouter([
    mainRoutes,
    ...publicRoutes,
    {
      path: "*",
      element: <ErrorLayout />,
      children: [
        {
          index: true,
          element: <NotFound />,
        },
      ],
    },
  ]);
};

/**
 * Hook pour obtenir le router basé sur l'utilisateur actuel
 */
export const useAppRouter = () => {
  const { getUserRole } = useActiveUserStore();
  const role = getUserRole();
  return createAppRouter(role);
};

// Router par défaut pour le développement
// En production, utiliser useAppRouter() pour obtenir le router basé sur l'utilisateur
export const router = createAppRouter();

export default router;
