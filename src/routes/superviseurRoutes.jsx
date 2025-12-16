import MainLayout from "@/layouts/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Commandes from "@/pages/Commandes";
import Stock from "@/pages/Stock";
import Statistiques from "@/pages/Statistiques";
import Comptabilite from "@/pages/Comptabilite";
import Parametres from "@/pages/Parametres";
import Utilisateurs from "@/pages/Utilisateurs";
import Outils from "@/pages/Outils";
import Profil from "@/pages/Profil";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

/**
 * Routes accessibles par les superviseurs et admins
 * Accès: Toutes les sections (Dashboard, Commandes, Stock, Statistiques, Comptabilite, Parametres, Utilisateurs)
 */
export const superviseurRoutes = {
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
      path: "stock",
      element: <Stock />,
    },
    {
      path: "statistiques",
      element: <Statistiques />,
    },
    {
      path: "comptabilite",
      element: <Comptabilite />,
    },
    {
      path: "outils",
      element: <Outils />,
    },
    {
      path: "parametres",
      element: <Parametres />,
    },
    {
      path: "utilisateurs",
      element: <Utilisateurs />,
    },
    {
      path: "profil",
      element: <Profil />,
    },
  ],
};

export default superviseurRoutes;
