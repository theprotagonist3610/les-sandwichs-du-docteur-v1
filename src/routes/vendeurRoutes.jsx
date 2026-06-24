import MainLayout from "@/layouts/MainLayout";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import PublicRoute from "@/features/auth/components/PublicRoute";

import Dashboard from "@/features/dashboard/pages/Dashboard";
import Commandes from "@/features/commandes/pages/Commandes";
import CommandesEnAttente from "@/features/commandes/pages/CommandesEnAttente";
import Commande from "@/features/commandes/pages/Commande";
import PanneauDeVente from "@/features/panneauDeVente/pages/PanneauDeVente";
import Profil from "@/features/profil/pages/Profil";
import Parametres from "@/features/parametres/pages/Parametres";
import Outils from "@/features/outils/pages/Outils";
import Adresse from "@/features/adresses/pages/Adresse";
import Livraisons from "@/features/outils/pages/Livraisons";
import Livreurs from "@/features/livreurs/pages/Livreurs";
import Messagerie from "@/features/outils/pages/Messagerie";

import Connexion from "@/features/auth/pages/Connexion";
import ForgotPassword from "@/features/auth/pages/ForgotPassword";
import ResetPassword from "@/features/auth/pages/ResetPassword";

export const vendeurRoutes = {
  path: "/",
  element: (
    <ProtectedRoute>
      <MainLayout />
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <Dashboard /> },
    { path: "commandes", element: <Commandes /> },
    { path: "commandes-en-attente", element: <CommandesEnAttente /> },
    { path: "commande/:id", element: <Commande /> },
    { path: "panneau-de-vente", element: <PanneauDeVente /> },
    { path: "adresses-livraison", element: <Adresse /> },
    { path: "livraisons", element: <Livraisons /> },
    { path: "livreurs", element: <Livreurs /> },
    { path: "messagerie", element: <Messagerie /> },
    { path: "outils", element: <Outils /> },
    { path: "parametres", element: <Parametres /> },
    { path: "profil", element: <Profil /> },
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
