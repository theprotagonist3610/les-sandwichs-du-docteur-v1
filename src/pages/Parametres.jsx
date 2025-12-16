import { Bell, Palette, Settings2, Volume2 } from "lucide-react";
import { useState, useEffect } from "react";
import useBreakpoint from "@/hooks/useBreakpoint";
import ParametresDeStyle from "./parametres/ParametresDeStyle";
import ParametresDesSonneries from "./parametres/ParametresDesSonneries";
import ParametresDesNotifications from "./parametres/ParametresDesNotifications";
import ParametresDesPreferences from "./parametres/ParametresDesPreferences";
import WithPermission from "@/components/auth/WithPermission";
import { canAccessSettings } from "@/utils/permissions";
// Composant en-tête de section - Version Desktop
const SectionHeaderDesktop = ({ icon: Icon, title, description }) => {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className="mt-1">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
};

// Composant en-tête de section - Version Mobile
const SectionHeaderMobile = ({ icon: Icon, title, description }) => {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="mt-0.5">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
};

// Version Mobile de la page Paramètres
const MobileParametres = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <div className="p-4 pb-20">
        {/* En-tête de la page - Mobile */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Paramètres
          </h1>
          <p className="text-sm text-muted-foreground">
            Configurez l&apos;application
          </p>
        </div>

        {/* Conteneur principal - Mobile avec espacement entre les groupes */}
        <div className="space-y-4">
          {/* Paramètres de style */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <SectionHeaderMobile
              icon={Palette}
              title="Apparence"
              description="Thème et affichage"
            />
            <div className="space-y-3">
              <ParametresDeStyle />
            </div>
          </div>

          {/* Paramètres des notifications */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <SectionHeaderMobile
              icon={Bell}
              title="Notifications"
              description="Alertes et notifications push"
            />
            <div className="space-y-3">
              <ParametresDesNotifications />
            </div>
          </div>

          {/* Paramètres des sonneries */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <SectionHeaderMobile
              icon={Volume2}
              title="Sons et sonneries"
              description="Sons de notification"
            />
            <div className="space-y-3">
              <ParametresDesSonneries />
            </div>
          </div>

          {/* Paramètres des préférences */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <SectionHeaderMobile
              icon={Settings2}
              title="Préférences"
              description="Options générales"
            />
            <div className="space-y-3">
              <ParametresDesPreferences />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Version Desktop de la page Paramètres
const DesktopParametres = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <div className="max-w-5xl mx-auto p-8">
        {/* En-tête de la page - Desktop */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Paramètres
          </h1>
          <p className="text-base text-muted-foreground">
            Personnalisez votre expérience et configurez l&apos;application
          </p>
        </div>

        {/* Conteneur principal - Desktop avec espacement entre les groupes */}
        <div className="space-y-6">
          {/* Paramètres de style */}
          <div className="bg-card rounded-xl border border-border p-8 shadow-md">
            <SectionHeaderDesktop
              icon={Palette}
              title="Apparence"
              description="Personnalisez le thème et l'affichage de l'application"
            />
            <div className="space-y-5">
              <ParametresDeStyle />
            </div>
          </div>

          {/* Paramètres des notifications */}
          <div className="bg-card rounded-xl border border-border p-8 shadow-md">
            <SectionHeaderDesktop
              icon={Bell}
              title="Notifications"
              description="Gérez les alertes et notifications push"
            />
            <div className="space-y-5">
              <ParametresDesNotifications />
            </div>
          </div>

          {/* Paramètres des sonneries */}
          <div className="bg-card rounded-xl border border-border p-8 shadow-md">
            <SectionHeaderDesktop
              icon={Volume2}
              title="Sons et sonneries"
              description="Configurez les sons de notification"
            />
            <div className="space-y-5">
              <ParametresDesSonneries />
            </div>
          </div>

          {/* Paramètres des préférences */}
          <div className="bg-card rounded-xl border border-border p-8 shadow-md">
            <SectionHeaderDesktop
              icon={Settings2}
              title="Préférences"
              description="Options générales de l'application"
            />
            <div className="space-y-5">
              <ParametresDesPreferences />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant principal qui rend les deux versions
const Parametres = () => {
  return (
    <>
      <MobileParametres />
      <DesktopParametres />
    </>
  );
};

// Protéger la page - accessible uniquement aux admins
export default WithPermission(
  Parametres,
  (userRole) => canAccessSettings(userRole),
  "/"
);
