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
import TachesRecurrentes from "@/pages/outils/TachesRecurrentes";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Adresse from "@/pages/outils/Adresse";
import Fournisseurs from "@/pages/outils/Fournisseurs";
import Livraisons from "@/pages/outils/Livraisons";
import Livreurs from "@/pages/outils/Livreurs";
import Messagerie from "@/pages/outils/Messagerie";
import MoyensDePaiement from "@/pages/outils/MoyensDePaiement";
import Productions from "@/pages/outils/Productions";
import Promotions from "@/pages/outils/Promotions";
import Rapports from "@/pages/outils/Rapports";
import Emplacements from "@/pages/outils/Emplacements";
import Menu from "@/pages/outils/Menu";
import GestionDesCommandes from "@/pages/commandes/GestionDesCommandes";
import CommandesEnAttente from "@/pages/commandes/CommandesEnAttente";
import Commande from "@/pages/commandes/Commande";
import PanneauDeVente from "@/pages/commandes/PanneauDeVente";
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
      path: "taches-recurrentes",
      element: <TachesRecurrentes />,
    },
    {
      path: "adresses-livraison",
      element: <Adresse />,
    },
    {
      path: "fournisseurs",
      element: <Fournisseurs />,
    },
    {
      path: "gestion-des-commandes",
      element: <GestionDesCommandes />,
    },
    { path: "commandes-en-attente", element: <CommandesEnAttente /> },
    { path: "commande", element: <Commande /> },
    { path: "panneau-de-vente", element: <PanneauDeVente /> },
    { path: "livraisons", element: <Livraisons /> },
    { path: "livreurs", element: <Livreurs /> },
    { path: "messagerie", element: <Messagerie /> },
    { path: "moyens-de-paiement", element: <MoyensDePaiement /> },
    { path: "productions", element: <Productions /> },
    { path: "promotions", element: <Promotions /> },
    { path: "rapports", element: <Rapports /> },
    { path: "emplacements", element: <Emplacements /> },
    { path: "menu", element: <Menu /> },
    {
      path: "profil",
      element: <Profil />,
    },
  ],
};

export default superviseurRoutes;
