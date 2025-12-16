import ProfilDetails from "./profil/ProfilDetails";
import ProfilActivite from "./profil/ProfilActivite";
import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState } from "react";

// Version Mobile de la page Profil
const MobileProfil = () => {
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
          <h1 className="text-2xl font-bold text-foreground mb-1">Mon Profil</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos informations personnelles et votre activité
          </p>
        </div>

        {/* Conteneur principal - Mobile avec espacement entre les sections */}
        <div className="space-y-6">
          <ProfilDetails />
          <ProfilActivite />
        </div>
      </div>
    </div>
  );
};

// Version Desktop de la page Profil
const DesktopProfil = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <div className="max-w-7xl mx-auto p-8">
        {/* En-tête de la page - Desktop */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-2">Mon Profil</h1>
          <p className="text-base text-muted-foreground">
            Gérez vos informations personnelles et votre activité
          </p>
        </div>

        {/* Conteneur principal - Desktop en grille avec layout 1/3 - 2/3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ProfilDetails - 1/3 de la largeur */}
          <div className="lg:col-span-1">
            <ProfilDetails />
          </div>
          {/* ProfilActivite - 2/3 de la largeur */}
          <div className="lg:col-span-2">
            <ProfilActivite />
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant principal qui rend les deux versions
const Profil = () => {
  return (
    <>
      <MobileProfil />
      <DesktopProfil />
    </>
  );
};

export default Profil;
