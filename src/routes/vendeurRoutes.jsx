import MainLayout from "@/layouts/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Commandes from "@/pages/Commandes";
import Profil from "@/pages/Profil";
import Connexion from "@/pages/Connexion";
import ForgotPassword from "@/pages/connexion/ForgotPassword";
import ResetPassword from "@/pages/connexion/ResetPassword";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PublicRoute from "@/components/auth/PublicRoute";
import Adresse from "@/pages/outils/Adresse";
import Outils from "@/pages/Outils";
import Livraisons from "@/pages/outils/Livraisons";
import Livreurs from "@/pages/outils/Livreurs";
import Messagerie from "@/pages/outils/Messagerie";
import PanneauDeVente from "@/pages/commandes/PanneauDeVente";
import CommandesEnAttente from "@/pages/commandes/CommandesEnAttente";
import Commande from "@/pages/commandes/Commande";
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
    { path: "commandes-en-attente", element: <CommandesEnAttente /> },
    { path: "commande", element: <Commande /> },
    { path: "panneau-de-vente", element: <PanneauDeVente /> },
    {
      path: "adresses-livraison",
      element: <Adresse />,
    },
    { path: "livraisons", element: <Livraisons /> },
    { path: "livreurs", element: <Livreurs /> },
    { path: "messagerie", element: <Messagerie /> },
  ],
};

export const publicRoutes = [
  {
    path: "connexion",
    element: (
      <PublicRoute>
        <Connexion />
      </PublicRoute>
    ),
  },
  {
    path: "mot-de-passe-oublie",
    element: (
      <PublicRoute>
        <ForgotPassword />
      </PublicRoute>
    ),
  },
  {
    path: "reset-password",
    element: (
      <PublicRoute>
        <ResetPassword />
      </PublicRoute>
    ),
  },
];

export default vendeurRoutes;
