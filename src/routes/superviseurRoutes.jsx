import MainLayout from "@/layouts/MainLayout";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";

import Dashboard from "@/features/dashboard/pages/Dashboard";
import Commandes from "@/features/commandes/pages/Commandes";
import GestionDesCommandes from "@/features/commandes/pages/GestionDesCommandes";
import CommandesEnAttente from "@/features/commandes/pages/CommandesEnAttente";
import Commande from "@/features/commandes/pages/Commande";
import PanneauDeVente from "@/features/panneauDeVente/pages/PanneauDeVente";

import Stock from "@/features/stock/pages/Stock";
import Statistiques from "@/features/insights/pages/Statistiques";
import Distribution from "@/features/distribution/pages/Distribution";
import BackDay from "@/features/backDay/pages/BackDay";

import Comptabilite from "@/features/comptabilite/pages/Comptabilite";
import Depense from "@/features/comptabilite/pages/Depense";
import Encaissement from "@/features/comptabilite/pages/Encaissement";
import Budget from "@/features/comptabilite/pages/Budget";
import Prevision from "@/features/comptabilite/pages/Prevision";
import Caisse from "@/features/comptabilite/pages/Caisse";
import Revenu from "@/features/comptabilite/pages/Revenu";
import Cloture from "@/features/comptabilite/pages/Cloture";

import Utilisateurs from "@/features/utilisateurs/pages/Utilisateurs";
import Profil from "@/features/profil/pages/Profil";
import Parametres from "@/features/parametres/pages/Parametres";

import Outils from "@/features/outils/pages/Outils";
import TachesRecurrentes from "@/features/outils/pages/TachesRecurrentes";
import Fournisseurs from "@/features/outils/pages/Fournisseurs";
import Livraisons from "@/features/outils/pages/Livraisons";
import Messagerie from "@/features/outils/pages/Messagerie";
import MoyensDePaiement from "@/features/outils/pages/MoyensDePaiement";
import Productions from "@/features/outils/pages/Productions";
import Emplacements from "@/features/outils/pages/Emplacements";

import Adresse from "@/features/adresses/pages/Adresse";
import Livreurs from "@/features/livreurs/pages/Livreurs";
import Promotions from "@/features/promotions/pages/Promotions";
import Menu from "@/features/menus/pages/Menu";
import Rapports from "@/features/comptabilite/pages/Rapports";
import Insights from "@/features/insights/pages/Insights";

export const superviseurRoutes = {
  path: "/",
  element: (
    <ProtectedRoute>
      <MainLayout />
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <Dashboard /> },

    // Commandes
    { path: "commandes", element: <Commandes /> },
    { path: "gestion-des-commandes", element: <GestionDesCommandes /> },
    { path: "commandes-en-attente", element: <CommandesEnAttente /> },
    { path: "commande/:id", element: <Commande /> },
    { path: "panneau-de-vente", element: <PanneauDeVente /> },

    // Opérations
    { path: "stock", element: <Stock /> },
    { path: "statistiques", element: <Statistiques /> },
    { path: "distribution", element: <Distribution /> },
    { path: "back-day", element: <BackDay /> },

    // Comptabilité
    { path: "comptabilite", element: <Comptabilite /> },
    { path: "depense", element: <Depense /> },
    { path: "encaissement", element: <Encaissement /> },
    { path: "budget", element: <Budget /> },
    { path: "prevision", element: <Prevision /> },
    { path: "caisse", element: <Caisse /> },
    { path: "revenu", element: <Revenu /> },
    { path: "cloture", element: <Cloture /> },
    { path: "rapports", element: <Rapports /> },
    { path: "stats", element: <Statistiques /> },

    // Gestion
    { path: "utilisateurs", element: <Utilisateurs /> },
    { path: "profil", element: <Profil /> },
    { path: "parametres", element: <Parametres /> },

    // Outils
    { path: "outils", element: <Outils /> },
    { path: "taches-recurrentes", element: <TachesRecurrentes /> },
    { path: "fournisseurs", element: <Fournisseurs /> },
    { path: "livraisons", element: <Livraisons /> },
    { path: "messagerie", element: <Messagerie /> },
    { path: "moyens-de-paiement", element: <MoyensDePaiement /> },
    { path: "productions", element: <Productions /> },
    { path: "emplacements", element: <Emplacements /> },

    // Features spécialisées
    { path: "adresses-livraison", element: <Adresse /> },
    { path: "livreurs", element: <Livreurs /> },
    { path: "promotions", element: <Promotions /> },
    { path: "menu", element: <Menu /> },
    { path: "insights", element: <Insights /> },
  ],
};

export default superviseurRoutes;
