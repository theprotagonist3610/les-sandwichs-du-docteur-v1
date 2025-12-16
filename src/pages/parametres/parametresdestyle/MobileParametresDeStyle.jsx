import { useStyleSettings } from "@/store/styleSettingsStore";
import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import SettingGroup from "@/components/settings/SettingGroup";
import RadioGroupSetting from "@/components/settings/RadioGroup";
import Toggle from "@/components/settings/Toggle";
import Separator from "@/components/settings/Separator";

const MobileParametresDeStyle = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  const { settings, updateSetting } = useStyleSettings();

  // Options (identiques à Desktop mais peut être adapté si besoin)
  const themeOptions = [
    { value: "light", label: "Clair", description: "Thème jour" },
    { value: "dark", label: "Sombre", description: "Réduit la fatigue" },
    { value: "auto", label: "Auto", description: "Suit le système" },
  ];

  const fontFamilyOptions = [
    { value: "system", label: "Système", description: "Police par défaut" },
    { value: "inter", label: "Inter", description: "Moderne" },
    { value: "roboto", label: "Roboto", description: "Google" },
    { value: "opensans", label: "Open Sans", description: "Professionnelle" },
    { value: "poppins", label: "Poppins", description: "Conviviale" },
    { value: "nunito", label: "Nunito", description: "Chaleureuse" },
  ];

  const fontSizeOptions = [
    { value: "small", label: "Petit", description: "90%" },
    { value: "medium", label: "Moyen", description: "100%" },
    { value: "large", label: "Grand", description: "110%" },
    { value: "xlarge", label: "Très grand", description: "120%" },
  ];

  const fontWeightOptions = [
    { value: "normal", label: "Normal", description: "400" },
    { value: "medium", label: "Medium", description: "500" },
    { value: "semibold", label: "Semi-gras", description: "600" },
  ];

  const densityOptions = [
    { value: "compact", label: "Compact", description: "Réduit" },
    { value: "comfortable", label: "Confortable", description: "Équilibré" },
    { value: "spacious", label: "Spacieux", description: "Large" },
  ];

  const contrastOptions = [
    { value: "standard", label: "Standard", description: "Normal" },
    { value: "high", label: "Élevé", description: "Augmenté" },
    { value: "maximum", label: "Maximum", description: "WCAG AAA" },
  ];

  return (
    <div
      className="min-h-screen space-y-4"
      style={{ display: visible ? "block" : "none" }}
    >
      {/* Thème */}
      <SettingGroup collapsible={true} defaultOpen={true} title="Thème" description="Apparence">
        <RadioGroupSetting
          name="theme"
          options={themeOptions}
          value={settings.theme}
          onChange={(value) => updateSetting("theme", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Police */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Police" description="Type de caractères">
        <RadioGroupSetting
          name="fontFamily"
          options={fontFamilyOptions}
          value={settings.fontFamily}
          onChange={(value) => updateSetting("fontFamily", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Taille */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Taille" description="Taille du texte">
        <RadioGroupSetting
          name="fontSize"
          options={fontSizeOptions}
          value={settings.fontSize}
          onChange={(value) => updateSetting("fontSize", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Graisse */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Épaisseur" description="Poids du texte">
        <RadioGroupSetting
          name="fontWeight"
          options={fontWeightOptions}
          value={settings.fontWeight}
          onChange={(value) => updateSetting("fontWeight", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Italic */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Style" description="Italique">
        <Toggle
          label="Activer l'italique"
          description="Pour les descriptions"
          checked={settings.italic}
          onChange={(value) => updateSetting("italic", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Densité */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Densité" description="Espacement">
        <RadioGroupSetting
          name="density"
          options={densityOptions}
          value={settings.density}
          onChange={(value) => updateSetting("density", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Contraste */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Contraste" description="Accessibilité">
        <RadioGroupSetting
          name="contrast"
          options={contrastOptions}
          value={settings.contrast}
          onChange={(value) => updateSetting("contrast", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Effets visuels */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Effets" description="Animations">
        <Toggle
          label="Bordures animées"
          description="Bordures animées sur l'interface"
          checked={settings.borderBeamEnabled}
          onChange={(value) => updateSetting("borderBeamEnabled", value)}
        />
      </SettingGroup>
    </div>
  );
};

export default MobileParametresDeStyle;
