import MainLayout from "@/layouts/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Commandes from "@/pages/Commandes";
import Profil from "@/pages/Profil";
import Connexion from "@/pages/Connexion";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PublicRoute from "@/components/auth/PublicRoute";
import Adresse from "@/pages/outils/Adresse";
import Outils from "@/pages/Outils";
import Livraisons from "@/pages/outils/Livraisons";
import Livreurs from "@/pages/outils/Livreurs";
import Messagerie from "@/pages/outils/Messagerie";
import path from "path";
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
    {
      path: "outils",
      element: <Outils />,
    },
    {
      path: "adresses-livraison",
      element: <Adresse />,
    },
    { path: "livraisons", element: <Livraisons /> },
    { path: "livreurs", element: <Livreurs /> },
    { path: "messagerie", element: <Messagerie /> },
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
