import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useSoundSettings } from "@/store/soundSettingsStore";
import { useNotificationSettings } from "@/store/notificationSettingsStore";
import { useAudioPlayer } from "@/shared/hooks/useAudioPlayer";
import { useVibration } from "@/shared/hooks/useVibration";
import { useConfetti } from "@/shared/hooks/useConfetti";

export const NotificationTypes = {
  SUCCESS: "success",
  ERROR: "error",
  INFO: "info",
  WARNING: "warning",
};

// Son et vibration par type — pas d'icon (jamais transmis aux toasts)
const NOTIFICATION_CONFIG = {
  success: { sound: "notificationSound", volume: "notificationVolume", vibrationPattern: "short"  },
  error:   { sound: "errorSound",        volume: "errorVolume",        vibrationPattern: "long"   },
  info:    { sound: "notificationSound", volume: "notificationVolume", vibrationPattern: "medium" },
  warning: { sound: "errorSound",        volume: "errorVolume",        vibrationPattern: "double" },
};

export const useNotificationToolkit = () => {
  const navigate = useNavigate();
  const { settings: soundSettings } = useSoundSettings();
  const { settings: notifSettings } = useNotificationSettings();
  const { play } = useAudioPlayer();
  const { vibrate } = useVibration();
  const { successConfetti } = useConfetti();

  const playFeedback = (type) => {
    const config = NOTIFICATION_CONFIG[type];
    if (!config) return;
    if (soundSettings.soundEnabled) {
      const url = soundSettings[config.sound];
      if (url) play(url, soundSettings[config.volume]);
    }
    if (soundSettings.vibrationEnabled) vibrate(config.vibrationPattern);
  };

  const showNotification = ({
    title,
    description,
    type = NotificationTypes.INFO,
    actions = [],
    duration = 4000,
    confetti = undefined,
  }) => {
    playFeedback(type);

    const shouldConfetti = confetti !== undefined
      ? confetti
      : type === NotificationTypes.SUCCESS && notifSettings.confettiEnabled;
    if (shouldConfetti) successConfetti();

    const actionButtons = actions.length > 0 && (
      <div className="flex gap-2 mt-2">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => {
              if (action.route) navigate(action.route);
              if (action.onClick) action.onClick();
              toast.dismiss();
            }}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            {action.name}
          </button>
        ))}
      </div>
    );

    const toastFn = toast[type] ?? toast.info;
    toastFn(title, {
      description: (
        <div>
          <div>{description}</div>
          {actionButtons}
        </div>
      ),
      duration,
    });
  };

  const success = (title, description, actions = [], duration, confetti) =>
    showNotification({ title, description, type: NotificationTypes.SUCCESS, actions, duration, confetti });

  const error = (title, description, actions = [], duration) =>
    showNotification({ title, description, type: NotificationTypes.ERROR, actions, duration, confetti: false });

  const info = (title, description, actions = [], duration) =>
    showNotification({ title, description, type: NotificationTypes.INFO, actions, duration, confetti: false });

  const warning = (title, description, actions = [], duration) =>
    showNotification({ title, description, type: NotificationTypes.WARNING, actions, duration, confetti: false });

  return { showNotification, success, error, info, warning, NotificationTypes };
};

// Notifications légères sans hook — pour les appels hors composants
export const notify = {
  success: (title, description) => toast.success(title, { description }),
  error:   (title, description) => toast.error(title,   { description }),
  info:    (title, description) => toast.info(title,    { description }),
  warning: (title, description) => toast.warning(title, { description }),
};
