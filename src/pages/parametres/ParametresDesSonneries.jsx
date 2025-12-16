import MobileParametresDesSonneries from "./parametresdessonneries/MobileParametresDesSonneries";
import DesktopParametresDesSonneries from "./parametresdessonneries/DesktopParametresDesSonneries";

// Options de sonneries pour notifications
export const notificationSoundsOptions = [
  {
    label: "Notification 1",
    description: "Son doux",
    url: "/notification-1.mp3",
  },
  {
    label: "Notification 2",
    description: "Son cristallin",
    url: "/notification-2.mp3",
  },
  {
    label: "Notification 3",
    description: "Son moderne",
    url: "/notification-3.mp3",
  },
  {
    label: "Notification 4",
    description: "Son classique",
    url: "/notification-4.mp3",
  },
  {
    label: "Notification 5",
    description: "Son élégant",
    url: "/notification-5.mp3",
  },
  {
    label: "Notification 6",
    description: "Son discret",
    url: "/notification-6.mp3",
  },
  {
    label: "Notification 7",
    description: "Son joyeux",
    url: "/notification-7.mp3",
  },
  {
    label: "Notification 8",
    description: "Son rapide",
    url: "/notification-8.mp3",
  },
];

// Options de sonneries pour erreurs
export const errorSoundsOptions = [
  {
    label: "Erreur 1",
    description: "Alerte douce",
    url: "/error-1.mp3",
  },
  {
    label: "Erreur 2",
    description: "Alerte urgente",
    url: "/error-2.mp3",
  },
];

// Options de sonneries pour livreur
export const livreurSoundsOptions = [
  {
    label: "Livreur 1",
    description: "Alerte livreur",
    url: "/livreur-1.mp3",
  },
];

// Options de patterns de vibration
export const vibrationPatternsOptions = [
  {
    value: "short",
    label: "Court",
    description: "Une courte vibration (100ms)",
  },
  {
    value: "medium",
    label: "Moyen",
    description: "Vibration moyenne (200ms)",
  },
  {
    value: "long",
    label: "Long",
    description: "Vibration longue (400ms)",
  },
  {
    value: "double",
    label: "Double",
    description: "Deux vibrations courtes",
  },
  {
    value: "triple",
    label: "Triple",
    description: "Trois vibrations courtes",
  },
  {
    value: "pulse",
    label: "Pulsé",
    description: "Pattern vibrant pulsé",
  },
];

const ParametresDesSonneries = () => {
  return (
    <>
      <MobileParametresDesSonneries />
      <DesktopParametresDesSonneries />
    </>
  );
};

export default ParametresDesSonneries;
