import {
  MapPin,
  Repeat,
  Gift,
  CreditCard,
  Users,
  Factory,
  ClipboardCheck,
  Package,
  Bike,
  MessageSquare,
  Store,
  PartyPopper,
  Gamepad2,
} from "lucide-react";

/**
 * Liste complète de tous les outils disponibles dans l'application
 * Chaque outil définit les rôles qui peuvent y accéder
 */
export const TOUS_LES_OUTILS = [
  {
    name: "taches-recurrentes",
    label: "Tâches récurrentes",
    path: "/taches-recurrentes",
    description:
      "Automatisez la gestion des tâches répétitives et planifiez efficacement.",
    icon: Repeat,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    roles: ["admin"], // Réservé aux admins
  },
  {
    name: "promotions",
    label: "Promotions",
    path: "/promotions",
    description:
      "Créez et gérez vos campagnes promotionnelles et offres spéciales.",
    icon: Gift,
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950",
    roles: ["admin"], // Réservé aux admins
  },
  // {
  //   name: "evenements",
  //   label: "Evènements",
  //   path: "/evenements",
  //   description: "Créez et gérez des événements.",
  //   icon: PartyPopper,
  //   color: "text-rose-600 dark:text-rose-400",
  //   bgColor: "bg-rose-50 dark:bg-rose-950",
  //   roles: ["admin"], // Réservé aux admins
  // },
  {
    name: "emplacements",
    label: "Emplacements",
    path: "/emplacements",
    description:
      "Gérez les emplacements de stockage et optimisez votre organisation.",
    icon: Store,
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-50 dark:bg-teal-950",
    roles: ["admin"], // Réservé aux admins
  },
  {
    name: "moyens-de-paiement",
    label: "Moyens de paiement",
    path: "/moyens-de-paiement",
    description:
      "Configurez et suivez les différents modes de paiement acceptés.",
    icon: CreditCard,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950",
    roles: ["admin"], // Réservé aux admins
  },
  {
    name: "fournisseurs",
    label: "Fournisseurs",
    path: "/fournisseurs",
    description:
      "Gérez vos contacts fournisseurs et l'historique de vos commandes.",
    icon: Users,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    roles: ["superviseur", "admin"], // Superviseurs et admins
  },
  {
    name: "productions",
    label: "Productions",
    path: "/productions",
    description:
      "Planifiez et optimisez votre production quotidienne pour réduire le gaspillage.",
    icon: Factory,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950",
    roles: ["superviseur", "admin"], // Superviseurs et admins
  },
  {
    name: "rapports",
    label: "Rapports",
    path: "/rapports",
    description:
      "Consultez les rapports d'activité et les analyses de performance.",
    icon: ClipboardCheck,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-950",
    roles: ["superviseur", "admin"], // Superviseurs et admins
  },
  {
    name: "adresses-livraison",
    label: "Adresses de livraison",
    path: "/adresses-livraison",
    description:
      "Gérez les adresses de livraison fréquentes et optimisez vos tournées.",
    icon: MapPin,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    roles: ["vendeur", "superviseur", "admin"], // Tous
  },
  {
    name: "livraisons",
    label: "Livraisons",
    path: "/livraisons",
    description: "Suivez et organisez vos livraisons en temps réel.",
    icon: Package,
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-50 dark:bg-teal-950",
    roles: ["vendeur", "superviseur", "admin"], // Tous
  },
  {
    name: "livreurs",
    label: "Livreurs",
    path: "/livreurs",
    description: "Gérez votre équipe de livreurs et leurs disponibilités.",
    icon: Bike,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950",
    roles: ["vendeur", "superviseur", "admin"], // Tous
  },
  {
    name: "messagerie",
    label: "Messagerie",
    path: "/messagerie",
    description:
      "Communiquez avec votre équipe et gérez les notifications internes.",
    icon: MessageSquare,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-950",
    roles: ["vendeur", "superviseur", "admin"], // Tous
  },
];

/**
 * Filtre les outils selon le rôle de l'utilisateur
 * @param {string} userRole - Le rôle de l'utilisateur (vendeur, superviseur, admin)
 * @returns {Array} Liste des outils accessibles pour ce rôle
 */
export const getOutilsParRole = (userRole) => {
  if (!userRole) return [];
  return TOUS_LES_OUTILS.filter((outil) => outil.roles.includes(userRole));
};
