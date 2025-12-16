import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useSoundSettings } from "@/store/soundSettingsStore";
import { useNotificationSettings } from "@/store/notificationSettingsStore";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useVibration } from "@/hooks/useVibration";
import { useConfetti } from "@/hooks/useConfetti";

/**
 * Types de notifications supportés
 */
export const NotificationTypes = {
  SUCCESS: "success",
  ERROR: "error",
  INFO: "info",
  WARNING: "warning",
};

/**
 * Configuration des icônes et sons par type de notification
 */
const notificationConfig = {
  [NotificationTypes.SUCCESS]: {
    icon: "✓",
    sound: "notificationSound",
    volume: "notificationVolume",
    vibrationPattern: "short",
  },
  [NotificationTypes.ERROR]: {
    icon: "✕",
    sound: "errorSound",
    volume: "errorVolume",
    vibrationPattern: "long",
  },
  [NotificationTypes.INFO]: {
    icon: "ℹ",
    sound: "notificationSound",
    volume: "notificationVolume",
    vibrationPattern: "medium",
  },
  [NotificationTypes.WARNING]: {
    icon: "⚠",
    sound: "errorSound",
    volume: "errorVolume",
    vibrationPattern: "double",
  },
};

/**
 * Hook pour créer des notifications avec sons et vibrations
 * @returns {Object} Fonctions pour créer différents types de notifications
 */
export const useNotificationToolkit = () => {
  const navigate = useNavigate();
  const soundSettings = useSoundSettings().settings;
  const notificationSettings = useNotificationSettings().settings;
  const { play } = useAudioPlayer();
  const { vibrate } = useVibration();
  const { successConfetti } = useConfetti();

  /**
   * Joue le son et la vibration selon le type de notification
   * @param {string} type - Type de notification
   */
  const playNotificationFeedback = (type) => {
    const config = notificationConfig[type];
    if (!config) return;

    // Jouer le son si activé
    if (soundSettings.soundEnabled) {
      const soundUrl = soundSettings[config.sound];
      const volume = soundSettings[config.volume];
      if (soundUrl) {
        play(soundUrl, volume);
      }
    }

    // Vibrer si activé
    if (soundSettings.vibrationEnabled) {
      vibrate(config.vibrationPattern);
    }
  };

  /**
   * Crée une notification générique
   * @param {Object} options - Options de la notification
   * @param {string} options.title - Titre de la notification
   * @param {string} options.description - Description de la notification
   * @param {string} options.type - Type de notification (success, error, info, warning)
   * @param {Array} options.actions - Actions disponibles [{name: string, route: string}]
   * @param {number} options.duration - Durée d'affichage en ms (par défaut 4000)
   * @param {boolean} options.confetti - Afficher les confetti (par défaut true pour success)
   */
  const showNotification = ({
    title,
    description,
    type = NotificationTypes.INFO,
    actions = [],
    duration = 4000,
    confetti = undefined,
  }) => {
    // Jouer le son et la vibration
    playNotificationFeedback(type);

    // Lancer les confetti si activé
    const shouldShowConfetti = confetti !== undefined
      ? confetti
      : (type === NotificationTypes.SUCCESS && notificationSettings.confettiEnabled);

    if (shouldShowConfetti) {
      successConfetti();
    }

    // Créer les boutons d'action
    const actionButtons = actions.length > 0 ? (
      <div className="flex gap-2 mt-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              if (action.route) {
                navigate(action.route);
              }
              if (action.onClick) {
                action.onClick();
              }
              toast.dismiss();
            }}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            {action.name}
          </button>
        ))}
      </div>
    ) : null;

    // Afficher le toast selon le type
    const toastOptions = {
      description: (
        <div>
          <div>{description}</div>
          {actionButtons}
        </div>
      ),
      duration,
    };

    switch (type) {
      case NotificationTypes.SUCCESS:
        toast.success(title, toastOptions);
        break;
      case NotificationTypes.ERROR:
        toast.error(title, toastOptions);
        break;
      case NotificationTypes.WARNING:
        toast.warning(title, toastOptions);
        break;
      case NotificationTypes.INFO:
      default:
        toast.info(title, toastOptions);
        break;
    }
  };

  /**
   * Raccourcis pour chaque type de notification
   */
  const success = (title, description, actions = [], duration, confetti = undefined) =>
    showNotification({
      title,
      description,
      type: NotificationTypes.SUCCESS,
      actions,
      duration,
      confetti,
    });

  const error = (title, description, actions = [], duration, confetti = false) =>
    showNotification({
      title,
      description,
      type: NotificationTypes.ERROR,
      actions,
      duration,
      confetti,
    });

  const info = (title, description, actions = [], duration, confetti = false) =>
    showNotification({
      title,
      description,
      type: NotificationTypes.INFO,
      actions,
      duration,
      confetti,
    });

  const warning = (title, description, actions = [], duration, confetti = false) =>
    showNotification({
      title,
      description,
      type: NotificationTypes.WARNING,
      actions,
      duration,
      confetti,
    });

  return {
    showNotification,
    success,
    error,
    info,
    warning,
    NotificationTypes,
  };
};

/**
 * Fonction standalone pour créer des notifications sans hook
 * (à utiliser en dehors des composants React)
 */
export const notify = {
  success: (title, description) => toast.success(title, { description }),
  error: (title, description) => toast.error(title, { description }),
  info: (title, description) => toast.info(title, { description }),
  warning: (title, description) => toast.warning(title, { description }),
};
