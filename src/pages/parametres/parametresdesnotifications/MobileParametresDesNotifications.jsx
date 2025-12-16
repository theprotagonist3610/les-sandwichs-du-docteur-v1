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

const MobileParametresDesNotifications = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  const { settings, updateSetting, requestSystemNotificationPermission } =
    useNotificationSettings();
  const { success } = useNotificationToolkit();

  // Options de position
  const positionOptions = [
    { value: "top-left", label: "Haut gauche", description: "Coin supérieur gauche" },
    { value: "top-right", label: "Haut droite", description: "Coin supérieur droit" },
    { value: "bottom-left", label: "Bas gauche", description: "Coin inférieur gauche" },
    { value: "bottom-right", label: "Bas droite", description: "Coin inférieur droit" },
    { value: "top-center", label: "Haut centre", description: "Centre haut" },
    { value: "bottom-center", label: "Bas centre", description: "Centre bas" },
  ];

  // Gérer la demande de permission système
  const handleRequestSystemPermission = async () => {
    const permission = await requestSystemNotificationPermission();
    if (permission === "granted") {
      success("Permission accordée", "Les notifications système sont activées");
    } else {
      success("Permission refusée", "Les notifications système ne sont pas disponibles");
    }
  };

  // Tester une notification
  const handleTestNotification = () => {
    success(
      "Notification de test",
      "Ceci est un exemple de notification",
      [{ name: "Voir", route: "/parametres" }]
    );
  };

  return (
    <div
      className="min-h-screen space-y-4"
      style={{ display: visible ? "block" : "none" }}
    >
      {/* Activation globale */}
      <SettingGroup collapsible={true} defaultOpen={true} title="Notifications" description="Activer les notifications">
        <Toggle
          label="Activer les notifications"
          description="Activer ou désactiver toutes les notifications"
          checked={settings.notificationsEnabled}
          onChange={(value) => updateSetting("notificationsEnabled", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Position */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Position" description="Emplacement à l'écran">
        <RadioGroupSetting
          name="position"
          options={positionOptions}
          value={settings.position}
          onChange={(value) => updateSetting("position", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Durée */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Durée" description="Temps d'affichage">
        <VolumeSlider
          label="Durée (ms)"
          description="Temps d'affichage des notifications"
          value={settings.duration / 100}
          onChange={(value) => updateSetting("duration", value * 100)}
        />
      </SettingGroup>

      <Separator />

      {/* Types de notifications */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Types" description="Notifications par type">
        <div className="space-y-2">
          <Toggle
            label="Notifications de succès"
            description="Afficher les notifications de succès"
            checked={settings.showSuccessNotifications}
            onChange={(value) => updateSetting("showSuccessNotifications", value)}
          />
          <Toggle
            label="Notifications d'erreur"
            description="Afficher les notifications d'erreur"
            checked={settings.showErrorNotifications}
            onChange={(value) => updateSetting("showErrorNotifications", value)}
          />
          <Toggle
            label="Notifications d'info"
            description="Afficher les notifications informatives"
            checked={settings.showInfoNotifications}
            onChange={(value) => updateSetting("showInfoNotifications", value)}
          />
          <Toggle
            label="Notifications d'avertissement"
            description="Afficher les avertissements"
            checked={settings.showWarningNotifications}
            onChange={(value) => updateSetting("showWarningNotifications", value)}
          />
        </div>
      </SettingGroup>

      <Separator />

      {/* Comportement */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Comportement" description="Options d'affichage">
        <div className="space-y-2">
          <Toggle
            label="Bouton de fermeture"
            description="Afficher un bouton X"
            checked={settings.closeButton}
            onChange={(value) => updateSetting("closeButton", value)}
          />
          <Toggle
            label="Couleurs vives"
            description="Utiliser des couleurs saturées"
            checked={settings.richColors}
            onChange={(value) => updateSetting("richColors", value)}
          />
          <Toggle
            label="Confetti"
            description="Afficher des confetti sur les succès"
            checked={settings.confettiEnabled}
            onChange={(value) => updateSetting("confettiEnabled", value)}
          />
        </div>
      </SettingGroup>

      <Separator />

      {/* Notifications système */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Système" description="Notifications natives">
        <div className="space-y-2">
          <Toggle
            label="Notifications système"
            description="Utiliser les notifications natives du navigateur"
            checked={settings.systemNotificationsEnabled}
            onChange={(value) => {
              if (value && settings.systemNotificationPermission !== "granted") {
                handleRequestSystemPermission();
              } else {
                updateSetting("systemNotificationsEnabled", value);
              }
            }}
          />
          {settings.systemNotificationPermission === "denied" && (
            <div className="p-2 bg-destructive/10 text-destructive text-xs rounded">
              Permission refusée. Changez les paramètres du navigateur.
            </div>
          )}
        </div>
      </SettingGroup>

      <Separator />

      {/* Test */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Test" description="Tester une notification">
        <button
          onClick={handleTestNotification}
          className="w-full p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Bell className="w-4 h-4" />
          <span>Tester une notification</span>
        </button>
      </SettingGroup>
    </div>
  );
};

export default MobileParametresDesNotifications;
