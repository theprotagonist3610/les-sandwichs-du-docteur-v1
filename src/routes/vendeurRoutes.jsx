import MainLayout from "@/layouts/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Commandes from "@/pages/Commandes";
import Profil from "@/pages/Profil";
import Connexion from "@/pages/Connexion";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PublicRoute from "@/components/auth/PublicRoute";

/**
 * Routes accessibles par les vendeurs
 * Accès: Dashboard et Commandes uniquement
 */
export const vendeurRoutes = {
  path: "/",
  element: (
    <ProtectedRoute>
      <MainLayout />
    </ProtectedRoute>
  ),
  children: [
    {
      index: true,
      element: <Dashboard />,
    },
    {
      path: "commandes",
      element: <Commandes />,
    },
    {
      path: "profil",
      element: <Profil />,
    },
  ],
};

export const publicRoutes = {
  path: "connexion",
  element: (
    <PublicRoute>
      <Connexion />
    </PublicRoute>
  ),
};

export default vendeurRoutes;
