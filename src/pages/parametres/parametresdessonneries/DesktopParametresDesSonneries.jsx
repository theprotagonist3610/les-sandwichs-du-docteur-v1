import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import { useSoundSettings } from "@/store/soundSettingsStore";
import SettingGroup from "@/components/settings/SettingGroup";
import Toggle from "@/components/settings/Toggle";
import Separator from "@/components/settings/Separator";
import VolumeSlider from "@/components/settings/VolumeSlider";
import SoundPicker from "@/components/settings/SoundPicker";
import VibrationPatternPicker from "@/components/settings/VibrationPatternPicker";
import {
  notificationSoundsOptions,
  errorSoundsOptions,
  livreurSoundsOptions,
  vibrationPatternsOptions,
} from "../ParametresDesSonneries";

const DesktopParametresDesSonneries = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  const { settings, updateSetting } = useSoundSettings();

  return (
    <div
      className="min-h-screen space-y-6"
      style={{ display: visible ? "block" : "none" }}
    >
      {/* Activer les sons */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Activer les sons"
        description="Activer ou désactiver tous les sons de l'application"
      >
        <Toggle
          label="Activer les sons"
          description="Sons pour les notifications, alertes et erreurs"
          checked={settings.soundEnabled}
          onChange={(value) => updateSetting("soundEnabled", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Activer les vibrations */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Activer les vibrations"
        description="Activer ou désactiver les vibrations pour les notifications"
      >
        <Toggle
          label="Activer les vibrations"
          description="Vibrations lors des notifications (si supporté par l'appareil)"
          checked={settings.vibrationEnabled}
          onChange={(value) => updateSetting("vibrationEnabled", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Volume notifications */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Volume des notifications"
        description="Ajustez le volume des sons de notification"
      >
        <VolumeSlider
          label="Volume des notifications"
          description="Niveau sonore pour les notifications générales"
          value={settings.notificationVolume}
          onChange={(value) => updateSetting("notificationVolume", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Volume erreurs */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Volume des erreurs"
        description="Ajustez le volume des sons d'erreur"
      >
        <VolumeSlider
          label="Volume des erreurs"
          description="Niveau sonore pour les alertes d'erreur"
          value={settings.errorVolume}
          onChange={(value) => updateSetting("errorVolume", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Volume livreur */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Volume des alertes livreur"
        description="Ajustez le volume des notifications livreur"
      >
        <VolumeSlider
          label="Volume des alertes livreur"
          description="Niveau sonore pour les alertes de présence livreur"
          value={settings.livreurVolume}
          onChange={(value) => updateSetting("livreurVolume", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Sonnerie notifications */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Sonnerie des notifications"
        description="Choisissez le son pour les notifications"
      >
        <SoundPicker
          name="notificationSound"
          options={notificationSoundsOptions}
          value={settings.notificationSound}
          onChange={(value) => updateSetting("notificationSound", value)}
          volume={settings.notificationVolume}
        />
      </SettingGroup>

      <Separator />

      {/* Sonnerie erreurs */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Sonnerie des erreurs"
        description="Choisissez le son pour les alertes d'erreur"
      >
        <SoundPicker
          name="errorSound"
          options={errorSoundsOptions}
          value={settings.errorSound}
          onChange={(value) => updateSetting("errorSound", value)}
          volume={settings.errorVolume}
        />
      </SettingGroup>

      <Separator />

      {/* Sonnerie livreur */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Sonnerie des alertes livreur"
        description="Choisissez le son pour les alertes de présence livreur"
      >
        <SoundPicker
          name="livreurSound"
          options={livreurSoundsOptions}
          value={settings.livreurSound}
          onChange={(value) => updateSetting("livreurSound", value)}
          volume={settings.livreurVolume}
        />
      </SettingGroup>

      <Separator />

      {/* Pattern de vibration */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Pattern de vibration"
        description="Sélectionnez le type de vibration pour les notifications"
      >
        <VibrationPatternPicker
          name="vibrationPattern"
          options={vibrationPatternsOptions}
          value={settings.vibrationPattern}
          onChange={(value) => updateSetting("vibrationPattern", value)}
        />
      </SettingGroup>
    </div>
  );
};

export default DesktopParametresDesSonneries;
