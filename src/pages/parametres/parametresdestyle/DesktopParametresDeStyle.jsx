import { useStyleSettings } from "@/store/styleSettingsStore";
import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import SettingGroup from "@/components/settings/SettingGroup";
import RadioGroupSetting from "@/components/settings/RadioGroup";
import Toggle from "@/components/settings/Toggle";
import Separator from "@/components/settings/Separator";

const DesktopParametresDeStyle = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  const { settings, updateSetting } = useStyleSettings();

  // Options pour le thème
  const themeOptions = [
    {
      value: "light",
      label: "Clair",
      description: "Thème clair pour une utilisation de jour",
    },
    {
      value: "dark",
      label: "Sombre",
      description: "Thème sombre pour réduire la fatigue oculaire",
    },
    {
      value: "auto",
      label: "Automatique",
      description: "Suit les préférences système",
    },
  ];

  // Options pour la police
  const fontFamilyOptions = [
    {
      value: "system",
      label: "Police système",
      description: "Police par défaut de votre appareil",
    },
    {
      value: "inter",
      label: "Inter",
      description: "Police moderne et lisible",
    },
    {
      value: "roboto",
      label: "Roboto",
      description: "Police Google populaire",
    },
    {
      value: "opensans",
      label: "Open Sans",
      description: "Police claire et professionnelle",
    },
    {
      value: "poppins",
      label: "Poppins",
      description: "Police arrondie et conviviale",
    },
    {
      value: "nunito",
      label: "Nunito",
      description: "Police ronde et chaleureuse",
    },
  ];

  // Options pour la taille de police
  const fontSizeOptions = [
    { value: "small", label: "Petit", description: "90% de la taille normale" },
    {
      value: "medium",
      label: "Moyen",
      description: "100% - Taille par défaut",
    },
    {
      value: "large",
      label: "Grand",
      description: "110% de la taille normale",
    },
    {
      value: "xlarge",
      label: "Très grand",
      description: "120% de la taille normale",
    },
  ];

  // Options pour la graisse de police
  const fontWeightOptions = [
    { value: "normal", label: "Normal", description: "Poids standard (400)" },
    {
      value: "medium",
      label: "Medium",
      description: "Légèrement plus épais (500)",
    },
    {
      value: "semibold",
      label: "Semi-gras",
      description: "Texte plus épais (600)",
    },
  ];

  // Options pour la densité
  const densityOptions = [
    {
      value: "compact",
      label: "Compact",
      description: "Espacement réduit, plus d'informations visibles",
    },
    {
      value: "comfortable",
      label: "Confortable",
      description: "Espacement équilibré - Recommandé",
    },
    {
      value: "spacious",
      label: "Spacieux",
      description: "Espacement large, interface aérée",
    },
  ];

  // Options pour le contraste
  const contrastOptions = [
    {
      value: "standard",
      label: "Standard",
      description: "Contraste normal",
    },
    {
      value: "high",
      label: "Élevé",
      description: "Contraste augmenté pour une meilleure lisibilité",
    },
    {
      value: "maximum",
      label: "Maximum",
      description: "Contraste maximal (WCAG AAA)",
    },
  ];

  return (
    <div
      className="min-h-screen space-y-6"
      style={{ display: visible ? "block" : "none" }}
    >
      {/* Thème */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Thème de l'application"
        description="Choisissez l'apparence de l'interface"
      >
        <RadioGroupSetting
          name="theme"
          options={themeOptions}
          value={settings.theme}
          onChange={(value) => updateSetting("theme", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Police de caractères */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Police de caractères"
        description="Sélectionnez la police d'affichage"
      >
        <RadioGroupSetting
          name="fontFamily"
          options={fontFamilyOptions}
          value={settings.fontFamily}
          onChange={(value) => updateSetting("fontFamily", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Taille de police */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Taille du texte"
        description="Ajustez la taille pour une meilleure lisibilité"
      >
        <RadioGroupSetting
          name="fontSize"
          options={fontSizeOptions}
          value={settings.fontSize}
          onChange={(value) => updateSetting("fontSize", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Graisse de police */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Épaisseur du texte"
        description="Choisissez l'épaisseur des caractères"
      >
        <RadioGroupSetting
          name="fontWeight"
          options={fontWeightOptions}
          value={settings.fontWeight}
          onChange={(value) => updateSetting("fontWeight", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Style italic */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Style de texte"
        description="Appliquer l'italique aux descriptions"
      >
        <Toggle
          label="Activer l'italique"
          description="Les descriptions secondaires seront affichées en italique"
          checked={settings.italic}
          onChange={(value) => updateSetting("italic", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Densité */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Densité de l'interface"
        description="Espacement entre les éléments"
      >
        <RadioGroupSetting
          name="density"
          options={densityOptions}
          value={settings.density}
          onChange={(value) => updateSetting("density", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Contraste */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Niveau de contraste"
        description="Contraste des couleurs pour l'accessibilité"
      >
        <RadioGroupSetting
          name="contrast"
          options={contrastOptions}
          value={settings.contrast}
          onChange={(value) => updateSetting("contrast", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Effets visuels */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Effets visuels"
        description="Animations et effets de bordure"
      >
        <Toggle
          label="Bordures animées"
          description="Afficher des bordures animées sur certains éléments de l'interface"
          checked={settings.borderBeamEnabled}
          onChange={(value) => updateSetting("borderBeamEnabled", value)}
        />
      </SettingGroup>
    </div>
  );
};

export default DesktopParametresDeStyle;
