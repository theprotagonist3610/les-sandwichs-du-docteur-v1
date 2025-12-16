import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import { usePreferencesSettings } from "@/store/preferencesSettingsStore";
import { useNotificationToolkit } from "@/utils/notificationToolkit";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useConnectivity } from "@/store/connectivityStore";
import SettingGroup from "@/components/settings/SettingGroup";
import Toggle from "@/components/settings/Toggle";
import Separator from "@/components/settings/Separator";
import RadioGroupSetting from "@/components/settings/RadioGroup";
import { MapPin, Download, Trash2, HardDrive, Cookie, Info, Smartphone, Check, X, Wifi, WifiOff, Signal } from "lucide-react";

const MobileParametresDesPreferences = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const [cacheSize, setCacheSize] = useState(null);

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  const {
    settings,
    updateSetting,
    clearCache,
    getCacheSize,
    clearAllCookies,
    toggleFullScreen,
    requestLocationPermission,
  } = usePreferencesSettings();

  const { success, error, info, warning } = useNotificationToolkit();

  const {
    isInstallable,
    isInstalled,
    isStandalone,
    installSupported,
    platform,
    promptInstall,
    getInstallInstructions,
    canInstall,
  } = usePWAInstall();

  const {
    isOnline,
    effectiveType,
    downlink,
    rtt,
    getConnectionSpeed,
    getConnectionColor,
  } = useConnectivity();

  // Charger la taille du cache au montage
  useEffect(() => {
    const loadCacheSize = async () => {
      const size = await getCacheSize();
      setCacheSize(size);
    };
    loadCacheSize();
  }, [getCacheSize]);

  // Options de format de date
  const dateFormatOptions = [
    { value: "DD/MM/YYYY", label: "JJ/MM/AAAA", description: "31/12/2024" },
    { value: "MM/DD/YYYY", label: "MM/JJ/AAAA", description: "12/31/2024" },
    { value: "YYYY-MM-DD", label: "AAAA-MM-JJ", description: "2024-12-31" },
  ];

  // Options de format d'heure
  const timeFormatOptions = [
    { value: "24h", label: "24 heures", description: "14:30" },
    { value: "12h", label: "12 heures", description: "2:30 PM" },
  ];

  // Options de devise
  const currencyOptions = [
    { value: "EUR", label: "Euro (€)", description: "EUR" },
    { value: "USD", label: "Dollar ($)", description: "USD" },
    { value: "XOF", label: "Franc CFA (CFA)", description: "XOF" },
  ];

  // Gérer le nettoyage du cache
  const handleClearCache = async () => {
    const result = await clearCache();
    if (result) {
      const newSize = await getCacheSize();
      setCacheSize(newSize);
      success("Cache vidé", "Le cache de l'application a été nettoyé");
    } else {
      error("Erreur", "Impossible de vider le cache");
    }
  };

  // Gérer le nettoyage des cookies
  const handleClearCookies = () => {
    warning(
      "Confirmer la suppression",
      "Êtes-vous sûr de vouloir supprimer tous les cookies ?",
      [
        {
          name: "Supprimer",
          onClick: () => {
            const result = clearAllCookies();
            if (result) {
              success("Cookies supprimés", "Tous les cookies ont été effacés");
            } else {
              error("Erreur", "Impossible de supprimer les cookies");
            }
          },
        },
        { name: "Annuler", onClick: () => {} },
      ]
    );
  };

  // Gérer le plein écran
  const handleFullScreen = async () => {
    const result = await toggleFullScreen();
    if (result) {
      if (document.fullscreenElement) {
        info("Mode plein écran", "L'application est en plein écran");
      } else {
        info("Mode normal", "L'application est revenue en mode normal");
      }
    } else {
      error("Erreur", "Impossible de basculer en mode plein écran");
    }
  };

  // Gérer la demande de localisation
  const handleRequestLocation = async () => {
    const result = await requestLocationPermission();
    if (result.success) {
      success(
        "Localisation activée",
        `Position: ${result.location.latitude.toFixed(4)}, ${result.location.longitude.toFixed(4)}`
      );
    } else {
      error("Localisation refusée", "Impossible d'obtenir votre position");
    }
  };

  // Gérer l'installation PWA
  const handleInstallPWA = async () => {
    if (!canInstall()) {
      if (isInstalled || isStandalone) {
        info("Déjà installée", "L'application est déjà installée sur cet appareil");
      } else if (!installSupported) {
        info(
          "Installation non supportée",
          getInstallInstructions()
        );
      } else {
        info(
          "Installation non disponible",
          "Le prompt d'installation n'est pas encore disponible"
        );
      }
      return;
    }

    const result = await promptInstall();

    if (result.success && result.outcome === "accepted") {
      success(
        "Installation réussie",
        "L'application a été installée avec succès sur votre appareil"
      );
    } else if (result.outcome === "dismissed") {
      info(
        "Installation annulée",
        "Vous pourrez installer l'application plus tard depuis les paramètres"
      );
    } else if (result.error) {
      error(
        "Erreur d'installation",
        `Impossible d'installer l'application: ${result.error}`
      );
    }
  };

  return (
    <div
      className="min-h-screen space-y-4"
      style={{ display: visible ? "block" : "none" }}
    >
      {/* Formats */}
      <SettingGroup
        collapsible={true}
        defaultOpen={true}
        title="Formats"
        description="Affichage des dates et heures"
      >
        <div className="space-y-4">
          <RadioGroupSetting
            name="dateFormat"
            label="Format de date"
            options={dateFormatOptions}
            value={settings.dateFormat}
            onChange={(value) => updateSetting("dateFormat", value)}
          />
          <RadioGroupSetting
            name="timeFormat"
            label="Format d'heure"
            options={timeFormatOptions}
            value={settings.timeFormat}
            onChange={(value) => updateSetting("timeFormat", value)}
          />
        </div>
      </SettingGroup>

      <Separator />

      {/* Devise */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Devise" description="Monnaie d'affichage">
        <RadioGroupSetting
          name="currency"
          options={currencyOptions}
          value={settings.currency}
          onChange={(value) => updateSetting("currency", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Cache */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Cache" description="Gestion du cache de l'application">
        <div className="space-y-3">
          {cacheSize && (
            <div className="p-3 bg-accent/10 text-accent-foreground text-sm rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <HardDrive className="w-4 h-4" />
                <span className="font-medium">Espace utilisé</span>
              </div>
              <div className="text-xs">
                {cacheSize.usageMB} MB / {cacheSize.quotaMB} MB
              </div>
            </div>
          )}
          <button
            onClick={handleClearCache}
            className="w-full p-3 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Vider le cache</span>
          </button>
        </div>
      </SettingGroup>

      <Separator />

      {/* Cookies */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Cookies" description="Gestion des cookies">
        <button
          onClick={handleClearCookies}
          className="w-full p-3 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
        >
          <Cookie className="w-4 h-4" />
          <span>Supprimer tous les cookies</span>
        </button>
      </SettingGroup>

      <Separator />

      {/* Affichage */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Affichage" description="Options d'affichage">
        <div className="space-y-2">
          <Toggle
            label="Mode plein écran"
            description="Afficher l'application en plein écran"
            checked={settings.fullScreenMode}
            onChange={handleFullScreen}
          />
          <Toggle
            label="Mode haute performance"
            description="Désactiver certains effets visuels"
            checked={settings.highPerformanceMode}
            onChange={(value) => updateSetting("highPerformanceMode", value)}
          />
          <Toggle
            label="Animations réduites"
            description="Réduire les animations (accessibilité)"
            checked={settings.reducedAnimations}
            onChange={(value) => updateSetting("reducedAnimations", value)}
          />
        </div>
      </SettingGroup>

      <Separator />

      {/* Localisation */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Localisation" description="Géolocalisation">
        <div className="space-y-2">
          <Toggle
            label="Activer la localisation"
            description="Permettre à l'application d'accéder à votre position"
            checked={settings.locationEnabled}
            onChange={(value) => {
              if (value) {
                handleRequestLocation();
              } else {
                updateSetting("locationEnabled", false);
              }
            }}
          />
          {settings.locationPermission === "denied" && (
            <div className="p-2 bg-destructive/10 text-destructive text-xs rounded">
              Permission refusée. Changez les paramètres du navigateur.
            </div>
          )}
          {settings.savedLocation && (
            <div className="p-2 bg-primary/10 text-primary text-xs rounded">
              <div className="flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3" />
                <span className="font-medium">Position sauvegardée</span>
              </div>
              <div>
                Lat: {settings.savedLocation.latitude.toFixed(4)}, Long:{" "}
                {settings.savedLocation.longitude.toFixed(4)}
              </div>
            </div>
          )}
        </div>
      </SettingGroup>

      <Separator />

      {/* PWA */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Application" description="Installer l'application">
        <div className="space-y-3">
          {/* Statut d'installation */}
          {isInstalled || isStandalone ? (
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Check className="w-4 h-4" />
                <span className="font-medium text-sm">Application installée</span>
              </div>
              <p className="text-xs opacity-80">
                L'application est déjà installée sur cet appareil
              </p>
            </div>
          ) : installSupported && canInstall() ? (
            <>
              <div className="p-3 bg-accent/10 text-accent-foreground rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Smartphone className="w-4 h-4" />
                  <span className="font-medium text-sm">Installation disponible</span>
                </div>
                <p className="text-xs opacity-80">
                  Installez l'application pour un accès rapide
                </p>
              </div>
              <button
                onClick={handleInstallPWA}
                className="w-full p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Download className="w-4 h-4" />
                <span>Installer l'application</span>
              </button>
            </>
          ) : !installSupported ? (
            <div className="p-3 bg-accent/10 text-accent-foreground rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" />
                <span className="font-medium text-sm">Installation manuelle</span>
              </div>
              <p className="text-xs opacity-80 leading-relaxed">
                {getInstallInstructions()}
              </p>
              {platform === "ios" && (
                <div className="mt-2 text-xs opacity-70">
                  Plateforme détectée: iOS
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-muted/50 text-muted-foreground rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <X className="w-4 h-4" />
                <span className="font-medium text-sm">Non disponible</span>
              </div>
              <p className="text-xs opacity-80">
                L'installation n'est pas disponible pour le moment
              </p>
            </div>
          )}
        </div>
      </SettingGroup>

      <Separator />

      {/* Connectivité */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Connectivité" description="État de la connexion">
        <div className="space-y-3">
          {/* Statut online/offline */}
          <div className={`p-3 rounded-lg border ${isOnline ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'}`}>
            <div className="flex items-center gap-2 mb-1">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
              )}
              <span className={`font-medium text-sm ${isOnline ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {isOnline ? "En ligne" : "Hors ligne"}
              </span>
            </div>
            <p className={`text-xs ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isOnline ? "Connexion active" : "Pas de connexion"}
            </p>
          </div>

          {/* Informations de vitesse */}
          {isOnline && (
            <div className="p-3 bg-accent/10 text-accent-foreground rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Signal className="w-4 h-4" />
                <span className="font-medium text-sm">Qualité</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="opacity-80">Vitesse:</span>
                  <span className={`font-medium ${getConnectionColor()}`}>
                    {getConnectionSpeed()}
                  </span>
                </div>
                {downlink && (
                  <div className="flex justify-between">
                    <span className="opacity-80">Débit:</span>
                    <span className="font-medium">{downlink} Mbps</span>
                  </div>
                )}
                {rtt && (
                  <div className="flex justify-between">
                    <span className="opacity-80">Latence:</span>
                    <span className="font-medium">{rtt} ms</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="opacity-80">Type:</span>
                  <span className="font-medium">{effectiveType?.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </SettingGroup>

      <Separator />

      {/* À propos */}
      <SettingGroup collapsible={true} defaultOpen={false} title="Informations" description="Version et mentions légales">
        <div className="space-y-2">
          <div className="p-3 bg-accent/10 text-accent-foreground text-sm rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span>Version {settings.appVersion}</span>
            </div>
          </div>
          <button
            onClick={() =>
              info("À propos", "Les Sandwichs du Docteur - PWA v1.0.0")
            }
            className="w-full p-3 bg-accent/10 text-accent-foreground rounded-lg hover:bg-accent/20 transition-colors"
          >
            À propos et mentions légales
          </button>
        </div>
      </SettingGroup>
    </div>
  );
};

export default MobileParametresDesPreferences;
