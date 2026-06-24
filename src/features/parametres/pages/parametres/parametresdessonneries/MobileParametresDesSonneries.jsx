import useBreakpoint from "@/shared/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import { useSoundSettings } from "@/store/soundSettingsStore";
import SettingGroup from "@/features/parametres/components/SettingGroup";
import Toggle from "@/features/parametres/components/Toggle";
import Separator from "@/features/parametres/components/Separator";
import VolumeSlider from "@/features/parametres/components/VolumeSlider";
import SoundPicker from "@/features/parametres/components/SoundPicker";
import VibrationPatternPicker from "@/features/parametres/components/VibrationPatternPicker";
import {
  notificationSoundsOptions,
  errorSoundsOptions,
  livreurSoundsOptions,
  vibrationPatternsOptions,
} from "../ParametresDesSonneries";

const MobileParametresDesSonneries = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  const { settings, updateSetting } = useSoundSettings();

  return (
    <div
      className="min-h-screen space-y-4"
      style={{ display: visible ? "block" : "none" }}
    >
      {/* Activer les sons */}
      <SettingGroup collapsible={true} defaultOpen={true} title="Sons" description="Activer les sons">
        <Toggle
          label="Activer les sons"
          description="Sons pour notifications et alertes"
          checked={settings.soundEnabled}
          onChange={(value) => updateSetting("soundEnabled", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Activer les vibrations */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Vibrations" description="Activer les vibrations">
        <Toggle
          label="Activer les vibrations"
          description="Vibrations pour notifications"
          checked={settings.vibrationEnabled}
          onChange={(value) => updateSetting("vibrationEnabled", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Volume notifications */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Volume" description="Volume des notifications">
        <VolumeSlider
          label="Notifications"
          description="Volume des sons de notification"
          value={settings.notificationVolume}
          onChange={(value) => updateSetting("notificationVolume", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Volume erreurs */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Volume" description="Volume des erreurs">
        <VolumeSlider
          label="Erreurs"
          description="Volume des sons d'erreur"
          value={settings.errorVolume}
          onChange={(value) => updateSetting("errorVolume", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Volume livreur */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Volume" description="Volume livreur">
        <VolumeSlider
          label="Livreur"
          description="Volume des alertes livreur"
          value={settings.livreurVolume}
          onChange={(value) => updateSetting("livreurVolume", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Sonnerie notifications */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Sonnerie" description="Son des notifications">
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
      <SettingGroup collapsible={true} defaultOpen={false} title="Sonnerie" description="Son des erreurs">
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
      <SettingGroup collapsible={true} defaultOpen={false} title="Sonnerie" description="Son alerte livreur">
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
      <SettingGroup collapsible={true} defaultOpen={false} title="Pattern" description="Type de vibration">
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

export default MobileParametresDesSonneries;
