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
import { MapPin, Download, Trash2, HardDrive, Cookie, Info, Maximize2, Smartphone, Check, X, AlertCircle, Wifi, WifiOff, Signal } from "lucide-react";

const DesktopParametresDesPreferences = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const [cacheSize, setCacheSize] = useState(null);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

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
    {
      value: "DD/MM/YYYY",
      label: "Jour/Mois/Année",
      description: "Format européen (31/12/2024)",
    },
    {
      value: "MM/DD/YYYY",
      label: "Mois/Jour/Année",
      description: "Format américain (12/31/2024)",
    },
    {
      value: "YYYY-MM-DD",
      label: "Année-Mois-Jour",
      description: "Format ISO 8601 (2024-12-31)",
    },
  ];

  // Options de format d'heure
  const timeFormatOptions = [
    {
      value: "24h",
      label: "Format 24 heures",
      description: "Affichage sur 24 heures (14:30)",
    },
    {
      value: "12h",
      label: "Format 12 heures",
      description: "Affichage AM/PM (2:30 PM)",
    },
  ];

  // Options de devise
  const currencyOptions = [
    {
      value: "EUR",
      label: "Euro (€)",
      description: "Monnaie européenne - EUR",
    },
    {
      value: "USD",
      label: "Dollar américain ($)",
      description: "Monnaie américaine - USD",
    },
    {
      value: "XOF",
      label: "Franc CFA (CFA)",
      description: "Monnaie ouest-africaine - XOF",
    },
  ];

  // Gérer le nettoyage du cache
  const handleClearCache = async () => {
    const result = await clearCache();
    if (result) {
      const newSize = await getCacheSize();
      setCacheSize(newSize);
      success(
        "Cache vidé avec succès",
        "Le cache de l'application a été entièrement nettoyé"
      );
    } else {
      error(
        "Erreur de nettoyage",
        "Impossible de vider le cache de l'application"
      );
    }
  };

  // Gérer le nettoyage des cookies
  const handleClearCookies = () => {
    warning(
      "Confirmer la suppression des cookies",
      "Cette action supprimera tous les cookies sauf celui du consentement. Êtes-vous sûr ?",
      [
        {
          name: "Supprimer les cookies",
          onClick: () => {
            const result = clearAllCookies();
            if (result) {
              success(
                "Cookies supprimés",
                "Tous les cookies ont été effacés avec succès"
              );
            } else {
              error(
                "Erreur de suppression",
                "Impossible de supprimer les cookies"
              );
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
        info(
          "Mode plein écran activé",
          "L'application est maintenant en plein écran. Appuyez sur Échap pour quitter."
        );
      } else {
        info(
          "Mode normal restauré",
          "L'application est revenue en mode fenêtré normal"
        );
      }
    } else {
      error(
        "Erreur de plein écran",
        "Impossible de basculer en mode plein écran"
      );
    }
  };

  // Gérer la demande de localisation
  const handleRequestLocation = async () => {
    const result = await requestLocationPermission();
    if (result.success) {
      success(
        "Localisation activée avec succès",
        `Votre position a été enregistrée: ${result.location.latitude.toFixed(6)}, ${result.location.longitude.toFixed(6)} (précision: ${Math.round(result.location.accuracy)}m)`
      );
    } else {
      error(
        "Localisation refusée",
        "Impossible d'obtenir votre position. Vérifiez les paramètres de votre navigateur."
      );
    }
  };

  // Gérer l'installation PWA
  const handleInstallPWA = async () => {
    if (!canInstall()) {
      if (isInstalled || isStandalone) {
        info(
          "Application déjà installée",
          "L'application est déjà installée sur cet appareil. Vous pouvez y accéder depuis votre menu d'applications."
        );
      } else if (!installSupported) {
        info(
          "Installation non supportée par le navigateur",
          getInstallInstructions()
        );
      } else {
        info(
          "Installation non disponible actuellement",
          "Le prompt d'installation n'est pas encore disponible. Veuillez réessayer plus tard ou utilisez le menu de votre navigateur."
        );
      }
      return;
    }

    const result = await promptInstall();

    if (result.success && result.outcome === "accepted") {
      success(
        "Installation réussie",
        "L'application a été installée avec succès sur votre appareil. Vous pouvez maintenant y accéder depuis votre bureau ou menu d'applications."
      );
    } else if (result.outcome === "dismissed") {
      info(
        "Installation annulée",
        "Vous avez annulé l'installation. Vous pourrez installer l'application plus tard depuis cette page de paramètres."
      );
    } else if (result.error) {
      error(
        "Erreur lors de l'installation",
        `Une erreur s'est produite pendant l'installation: ${result.error}`
      );
    }
  };

  return (
    <div
      className="min-h-screen space-y-6"
      style={{ display: visible ? "block" : "none" }}
    >
      {/* Formats de date et heure */}
      <SettingGroup
        collapsible={true}
        defaultOpen={true}
        title="Formats d'affichage"
        description="Personnalisez le format d'affichage des dates et des heures dans l'application"
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Format de date</h4>
            <RadioGroupSetting
              name="dateFormat"
              options={dateFormatOptions}
              value={settings.dateFormat}
              onChange={(value) => updateSetting("dateFormat", value)}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-3">Format d'heure</h4>
            <RadioGroupSetting
              name="timeFormat"
              options={timeFormatOptions}
              value={settings.timeFormat}
              onChange={(value) => updateSetting("timeFormat", value)}
            />
          </div>
        </div>
      </SettingGroup>

      <Separator />

      {/* Devise */}
      <SettingGroup
        collapsible={true}
        defaultOpen={false}
        title="Devise de l'application"
        description="Choisissez la monnaie utilisée pour l'affichage des prix et montants"
      >
        <RadioGroupSetting
          name="currency"
          options={currencyOptions}
          value={settings.currency}
          onChange={(value) => updateSetting("currency", value)}
        />
      </SettingGroup>

      <Separator />

      {/* Cache de l'application */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Cache de l'application"
        description="Gérez le cache local pour améliorer les performances ou libérer de l'espace"
      >
        <div className="space-y-4">
          {cacheSize && (
            <div className="p-4 bg-accent/10 text-accent-foreground rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  <span className="font-medium">Espace de stockage utilisé</span>
                </div>
                <span className="text-sm font-mono">
                  {cacheSize.usageMB} MB / {cacheSize.quotaMB} MB
                </span>
              </div>
              <div className="w-full bg-accent/20 rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${(parseFloat(cacheSize.usageMB) / parseFloat(cacheSize.quotaMB)) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
          <button
            onClick={handleClearCache}
            className="w-full p-4 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors flex items-center justify-center gap-3 font-medium"
          >
            <Trash2 className="w-5 h-5" />
            <span>Vider le cache de l'application</span>
          </button>
        </div>
      </SettingGroup>

      <Separator />

      {/* Cookies */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Gestion des cookies"
        description="Supprimez tous les cookies stockés par l'application (sauf le consentement)"
      >
        <button
          onClick={handleClearCookies}
          className="w-full p-4 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors flex items-center justify-center gap-3 font-medium"
        >
          <Cookie className="w-5 h-5" />
          <span>Supprimer tous les cookies</span>
        </button>
      </SettingGroup>

      <Separator />

      {/* Options d'affichage et performance */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Affichage et performance"
        description="Personnalisez l'apparence et optimisez les performances de l'application"
      >
        <div className="space-y-3">
          <Toggle
            label="Mode plein écran"
            description="Afficher l'application en mode plein écran pour une expérience immersive (Échap pour quitter)"
            checked={settings.fullScreenMode}
            onChange={handleFullScreen}
            icon={<Maximize2 className="w-4 h-4" />}
          />
          <Toggle
            label="Mode haute performance"
            description="Désactiver certains effets visuels et animations pour améliorer les performances sur les appareils moins puissants"
            checked={settings.highPerformanceMode}
            onChange={(value) => updateSetting("highPerformanceMode", value)}
          />
          <Toggle
            label="Animations réduites"
            description="Réduire ou désactiver toutes les animations pour une meilleure accessibilité et confort visuel"
            checked={settings.reducedAnimations}
            onChange={(value) => updateSetting("reducedAnimations", value)}
          />
        </div>
      </SettingGroup>

      <Separator />

      {/* Localisation */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Géolocalisation"
        description="Autorisez l'application à accéder à votre position pour des fonctionnalités basées sur la localisation"
      >
        <div className="space-y-3">
          <Toggle
            label="Activer la localisation"
            description="Permettre à l'application d'accéder à votre position géographique actuelle"
            checked={settings.locationEnabled}
            onChange={(value) => {
              if (value) {
                handleRequestLocation();
              } else {
                updateSetting("locationEnabled", false);
                updateSetting("savedLocation", null);
              }
            }}
            icon={<MapPin className="w-4 h-4" />}
          />
          {settings.locationPermission === "default" && (
            <div className="p-3 bg-accent/20 text-accent-foreground text-sm rounded-lg">
              Activez le toggle ci-dessus pour demander l'autorisation d'accès à votre localisation.
            </div>
          )}
          {settings.locationPermission === "denied" && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
              Permission refusée. Veuillez modifier les paramètres de votre navigateur pour autoriser l'accès à la localisation.
            </div>
          )}
          {settings.savedLocation && (
            <div className="p-4 bg-primary/10 text-primary rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">Position sauvegardée</span>
              </div>
              <div className="text-sm font-mono space-y-1">
                <div>Latitude: {settings.savedLocation.latitude.toFixed(6)}</div>
                <div>Longitude: {settings.savedLocation.longitude.toFixed(6)}</div>
                {settings.savedLocation.accuracy && (
                  <div className="text-xs opacity-80">
                    Précision: ~{Math.round(settings.savedLocation.accuracy)} mètres
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SettingGroup>

      <Separator />

      {/* Installation PWA */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Installation de l'application"
        description="Installez l'application sur votre appareil pour un accès rapide et une expérience optimale hors ligne"
      >
        <div className="space-y-4">
          {/* Statut d'installation */}
          {isInstalled || isStandalone ? (
            <div className="p-4 bg-primary/10 text-primary rounded-lg border border-primary/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/20 rounded-full">
                  <Check className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-base">Application installée</h4>
                  <p className="text-sm opacity-90 mt-0.5">
                    L'application est déjà installée sur cet appareil
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-primary/10 rounded-md text-sm">
                <p className="opacity-80">
                  Vous pouvez accéder à l'application depuis votre menu d'applications ou votre bureau.
                </p>
              </div>
            </div>
          ) : installSupported && canInstall() ? (
            <>
              <div className="p-4 bg-accent/10 text-accent-foreground rounded-lg border border-accent/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-accent/20 rounded-full">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-base">Installation disponible</h4>
                    <p className="text-sm opacity-90 mt-0.5">
                      Installez l'application pour un accès rapide et des fonctionnalités hors ligne
                    </p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-accent/5 rounded-md">
                  <h5 className="font-medium text-sm mb-2">Avantages de l'installation :</h5>
                  <ul className="text-sm space-y-1 opacity-80">
                    <li>• Accès rapide depuis votre bureau ou menu d'applications</li>
                    <li>• Fonctionne hors ligne</li>
                    <li>• Notifications push en temps réel</li>
                    <li>• Expérience utilisateur optimisée</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={handleInstallPWA}
                className="w-full p-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all hover:shadow-lg flex items-center justify-center gap-3 font-semibold text-base"
              >
                <Download className="w-5 h-5" />
                <span>Installer l'application maintenant</span>
              </button>
            </>
          ) : !installSupported ? (
            <div className="p-4 bg-accent/10 text-accent-foreground rounded-lg border border-accent/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-accent/20 rounded-full">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-base">Installation manuelle requise</h4>
                  <p className="text-sm opacity-90 mt-0.5">
                    Votre navigateur nécessite une installation manuelle
                  </p>
                </div>
              </div>
              <div className="p-3 bg-accent/5 rounded-md">
                <p className="text-sm opacity-80 leading-relaxed mb-3">
                  {getInstallInstructions()}
                </p>
                <div className="flex items-center gap-2 text-xs opacity-70">
                  <Info className="w-3 h-3" />
                  <span>
                    Plateforme détectée: {platform === "ios" ? "iOS" : platform === "android" ? "Android" : platform === "windows" ? "Windows" : platform === "macos" ? "macOS" : "Autre"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-muted/50 text-muted-foreground rounded-lg border border-muted">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-muted rounded-full">
                  <X className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-base">Installation non disponible</h4>
                  <p className="text-sm opacity-80 mt-0.5">
                    Le prompt d'installation n'est pas encore disponible
                  </p>
                </div>
              </div>
              <p className="text-sm opacity-70 mt-3">
                Veuillez réessayer plus tard ou utilisez le menu de votre navigateur pour installer l'application.
              </p>
            </div>
          )}
        </div>
      </SettingGroup>

      <Separator />

      {/* Connectivité */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="Connectivité réseau"
        description="Informations sur l'état de votre connexion Internet"
      >
        <div className="space-y-4">
          {/* Statut online/offline */}
          <div className={`p-4 rounded-lg border ${isOnline ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'}`}>
            <div className="flex items-center gap-3 mb-2">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
              <div className="flex-1">
                <h4 className={`font-semibold text-base ${isOnline ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {isOnline ? "En ligne" : "Hors ligne"}
                </h4>
                <p className={`text-sm ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isOnline ? "Connexion Internet active" : "Aucune connexion Internet détectée"}
                </p>
              </div>
            </div>
          </div>

          {/* Informations de vitesse */}
          {isOnline && (
            <div className="p-4 bg-accent/10 text-accent-foreground rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Signal className="w-5 h-5" />
                <span className="font-medium">Qualité de connexion</span>
              </div>
              <div className="space-y-2 pl-8">
                <div className="flex items-center justify-between text-sm">
                  <span className="opacity-80">Vitesse:</span>
                  <span className={`font-medium ${getConnectionColor()}`}>
                    {getConnectionSpeed()}
                  </span>
                </div>
                {downlink && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="opacity-80">Débit descendant:</span>
                    <span className="font-medium">{downlink} Mbps</span>
                  </div>
                )}
                {rtt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="opacity-80">Latence (RTT):</span>
                    <span className="font-medium">{rtt} ms</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="opacity-80">Type de connexion:</span>
                  <span className="font-medium">{effectiveType?.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </SettingGroup>

      <Separator />

      {/* Informations et mentions légales */}
      <SettingGroup collapsible={true} defaultOpen={false}
        title="À propos de l'application"
        description="Informations sur la version, mentions légales et crédits"
      >
        <div className="space-y-3">
          <div className="p-4 bg-accent/10 text-accent-foreground rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-5 h-5" />
              <span className="font-medium">Version de l'application</span>
            </div>
            <div className="text-sm opacity-80 pl-8">
              Version {settings.appVersion}
            </div>
          </div>
          <button
            onClick={() =>
              info(
                "À propos - Les Sandwichs du Docteur",
                "Application PWA de gestion de sandwicherie. Version 1.0.0 - Développée avec React et Vite."
              )
            }
            className="w-full p-4 bg-accent/10 text-accent-foreground rounded-lg hover:bg-accent/20 transition-colors flex items-center justify-center gap-3"
          >
            <Info className="w-4 h-4" />
            <span>À propos et mentions légales</span>
          </button>
        </div>
      </SettingGroup>
    </div>
  );
};

export default DesktopParametresDesPreferences;
