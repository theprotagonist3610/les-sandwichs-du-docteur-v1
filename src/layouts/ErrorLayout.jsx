import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";

const MobileErrorLayout = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      style={{ display: visible ? "flex" : "none" }}>
      <div className="w-full max-w-md flex flex-col items-center justify-center gap-6">
        {/* Logo */}
        <div className="flex justify-center">
          <img
            src="./logo-min.png"
            alt="Les Sandwichs du Docteur"
            className="h-20 w-auto"
          />
        </div>

        {/* Message d'erreur dynamique via Outlet */}
        <div className="w-full">
          <Outlet />
        </div>

        {/* Boutons d'action */}
        <div className="w-full flex flex-col gap-3">
          <button className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
            Retour
          </button>
          <button className="w-full px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors">
            Accueil
          </button>
        </div>

        {/* Copyright */}
        <div className="text-center text-sm text-muted-foreground mt-4">
          <p>&copy; {new Date().getFullYear()} Les Sandwichs du Docteur</p>
          <p className="text-xs mt-1">Tous droits réservés</p>
        </div>
      </div>
    </div>
  );
};

const DesktopErrorLayout = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-8"
      style={{ display: visible ? "flex" : "none" }}>
      <div className="w-full max-w-2xl flex flex-col items-center justify-center gap-12">
        {/* Logo */}
        <div className="flex justify-center">
          <img
            src="./logo-min.png"
            alt="Les Sandwichs du Docteur"
            className="h-32 w-auto"
          />
        </div>

        {/* Message d'erreur dynamique via Outlet */}
        <div className="w-full">
          <Outlet />
        </div>

        {/* Boutons d'action */}
        <div className="w-full flex gap-6 justify-center">
          <button className="px-10 py-4 bg-primary text-primary-foreground rounded-lg font-medium text-lg hover:bg-primary/90 transition-colors shadow-lg">
            Retour
          </button>
          <button className="px-10 py-4 bg-secondary text-secondary-foreground rounded-lg font-medium text-lg hover:bg-secondary/80 transition-colors shadow-lg">
            Accueil
          </button>
        </div>

        {/* Copyright */}
        <div className="text-center text-muted-foreground mt-8">
          <p className="text-base">
            &copy; {new Date().getFullYear()} Les Sandwichs du Docteur
          </p>
          <p className="text-sm mt-2">Tous droits réservés</p>
        </div>
      </div>
    </div>
  );
};

const ErrorLayout = () => {
  return (
    <>
      <MobileErrorLayout />
      <DesktopErrorLayout />
    </>
  );
};

export default ErrorLayout;
