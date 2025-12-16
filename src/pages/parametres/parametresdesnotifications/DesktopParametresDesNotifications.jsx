import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import { useNotificationSettings } from "@/store/notificationSettingsStore";
import { useNotificationToolkit } from "@/utils/notificationToolkit";
import SettingGroup from "@/components/settings/SettingGroup";
import Toggle from "@/components/settings/Toggle";
import Separator from "@/components/settings/Separator";
import RadioGroupSetting from "@/components/settings/RadioGroup";
import VolumeSlider from "@/components/settings/VolumeSlider";
import { Bell } from "lucide-react";

const DesktopParametresDesNotifications = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  const { settings, updateSetting, requestSystemNotificationPermission } =
    useNotificationSettings();
  const { success, info, error, warning } = useNotificationToolkit();

  // Options de position
  const positionOptions = [
    {
      value: "top-left",
      label: "Haut gauche",
      description: "Afficher dans le coin supérieur gauche",
    },
    {
      value: "top-right",
      label: "Haut droite",
      description: "Afficher dans le coin supérieur droit",
    },
    {
      value: "bottom-left",
      label: "Bas gauche",
      description: "Afficher dans le coin inférieur gauche",
    },
    {
      value: "bottom-right",
      label: "Bas droite",
      description: "Afficher dans le coin inférieur droit (recommandé)",
    },
    {
      value: "top-center",
      label: "Haut centre",
      description: "Afficher en haut au centre",
    },
    {
      value: "bottom-center",
      label: "Bas centre",
      description: "Afficher en bas au centre",
    },
  ];

  // Gérer la demande de permission système
  const handleRequestSystemPermission = async () => {
    const permission = await requestSystemNotificationPermission();
    if (permission === "granted") {
      success("Permission accordée", "Les notifications système sont maintenant activées");
    } else {
      error("Permission refusée", "Impossible d'activer les notifications système");
    }
  };

  // Tester les différents types de notifications
  const handleTestNotification = (type) => {
    const actions = [
      { name: "Voir les paramètres", route: "/parametres" },
      { name: "Fermer", onClick: () => {} },
    ];

    switch (type) {
      case "success":
        success("Notification de succès", "Opération réussie avec succès !", actions);
        break;
      case "error":
        error("Notification d'erreur", "Une erreur s'est produite", actions);
        break;
      case "info":
        info("Notification d'information", "Voici une information importante", actions);
        break;
      case "warning":
        warning("Notification d'avertissement", "Attention à cette action", actions);
        break;
      default:
        info("Notification de test", "Ceci est un exemple de notification");
    }
  };

  return (
    <div
      className="min-h-screen space-y-6"
      style={{ display: visible ? "block" : "none" }}
    >
      {/* Activation globale */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Activer les notifications"
        description="Activer ou désactiver toutes les notifications de l'application"
      >
        <Toggle
          label="Notifications activées"
          description="Afficher les notifications toast dans l'application"
          checked={settings.notificationsEnabled}
          onChange={(value) => updateSetting("notificationsEnabled", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Position */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Position des notifications"
        description="Choisissez où afficher les notifications à l'écran"
      >
        <RadioGroupSetting
          name="position"
          options={positionOptions}
          value={settings.position}
          onChange={(value) => updateSetting("position", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Durée */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Durée d'affichage"
        description="Temps pendant lequel les notifications restent visibles"
      >
        <VolumeSlider
          label={`Durée: ${settings.duration}ms`}
          description="Durée en millisecondes (1000ms = 1 seconde)"
          value={settings.duration / 100}
          onChange={(value) => updateSetting("duration", value * 100)}
        />
      </SettingGroup>

      <Separator />

      {/* Types de notifications */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Types de notifications à afficher"
        description="Choisissez quels types de notifications vous souhaitez voir"
      >
        <div className="space-y-3">
          <Toggle
            label="Notifications de succès"
            description="Afficher les confirmations de réussite d'opérations"
            checked={settings.showSuccessNotifications}
            onChange={(value) => updateSetting("showSuccessNotifications", value)}
          />
          <Toggle
            label="Notifications d'erreur"
            description="Afficher les messages d'erreur et d'échec"
            checked={settings.showErrorNotifications}
            onChange={(value) => updateSetting("showErrorNotifications", value)}
          />
          <Toggle
            label="Notifications d'information"
            description="Afficher les messages informatifs généraux"
            checked={settings.showInfoNotifications}
            onChange={(value) => updateSetting("showInfoNotifications", value)}
          />
          <Toggle
            label="Notifications d'avertissement"
            description="Afficher les messages d'avertissement et de précaution"
            checked={settings.showWarningNotifications}
            onChange={(value) => updateSetting("showWarningNotifications", value)}
          />
        </div>
      </SettingGroup>

      <Separator />

      {/* Comportement */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Comportement des notifications"
        description="Personnalisez l'apparence et le comportement"
      >
        <div className="space-y-3">
          <Toggle
            label="Bouton de fermeture"
            description="Afficher un bouton X pour fermer manuellement"
            checked={settings.closeButton}
            onChange={(value) => updateSetting("closeButton", value)}
          />
          <Toggle
            label="Couleurs vives"
            description="Utiliser des couleurs plus saturées et vibrantes"
            checked={settings.richColors}
            onChange={(value) => updateSetting("richColors", value)}
          />
          <Toggle
            label="Confetti"
            description="Afficher des confetti lors des notifications de succès"
            checked={settings.confettiEnabled}
            onChange={(value) => updateSetting("confettiEnabled", value)}
          />
        </div>
      </SettingGroup>

      <Separator />

      {/* Notifications système (PWA) */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Notifications système"
        description="Utiliser les notifications natives du navigateur (PWA)"
      >
        <div className="space-y-3">
          <Toggle
            label="Activer les notifications système"
            description="Recevoir des notifications même quand l'application est fermée"
            checked={settings.systemNotificationsEnabled}
            onChange={(value) => {
              if (value && settings.systemNotificationPermission !== "granted") {
                handleRequestSystemPermission();
              } else {
                updateSetting("systemNotificationsEnabled", value);
              }
            }}
          />
          {settings.systemNotificationPermission === "default" && (
            <div className="p-3 bg-accent/20 text-accent-foreground text-sm rounded-lg">
              Cliquez sur le toggle pour demander la permission
            </div>
          )}
          {settings.systemNotificationPermission === "denied" && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
              Permission refusée. Veuillez modifier les paramètres de votre navigateur
              pour autoriser les notifications.
            </div>
          )}
          {settings.systemNotificationPermission === "granted" && (
            <div className="p-3 bg-primary/10 text-primary text-sm rounded-lg">
              ✓ Permission accordée. Les notifications système sont disponibles.
            </div>
          )}
        </div>
      </SettingGroup>

      <Separator />

      {/* Tests */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Tester les notifications"
        description="Testez chaque type de notification pour voir le rendu"
      >
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleTestNotification("success")}
            className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <Bell className="w-4 h-4" />
            <span>Succès</span>
          </button>
          <button
            onClick={() => handleTestNotification("error")}
            className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <Bell className="w-4 h-4" />
            <span>Erreur</span>
          </button>
          <button
            onClick={() => handleTestNotification("info")}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Bell className="w-4 h-4" />
            <span>Info</span>
          </button>
          <button
            onClick={() => handleTestNotification("warning")}
            className="p-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
          >
            <Bell className="w-4 h-4" />
            <span>Avertissement</span>
          </button>
        </div>
      </SettingGroup>
    </div>
  );
};

export default DesktopParametresDesNotifications;
