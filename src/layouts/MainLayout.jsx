import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import DesktopNavbar from "@/components/navbars/DesktopNavbar";
import MobileNavbar from "@/components/navbars/MobileNavbar";
const MobileMainLayout = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);
  return (
    <div
      className="h-screen overflow-hidden flex flex-col"
      style={{ display: visible ? "flex" : "none" }}>
      <MobileNavbar />
      {/* Main avec background fixe et scroll */}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden relative"
        style={{
          backgroundImage: "url(/background-mobile.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          backgroundRepeat: "no-repeat",
        }}>
        {/* Container pour garantir que l'overlay couvre tout le contenu */}
        <div className="relative min-h-full">
          {/* Overlay transparent */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm pointer-events-none"></div>

          {/* Contenu avec Outlet (non transparent) */}
          <div className="relative z-10">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
const DesktopMainLayout = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);
  return (
    <div
      className="h-screen overflow-hidden flex flex-col"
      style={{ display: visible ? "flex" : "none" }}>
      <DesktopNavbar />
      {/* Main avec background fixe et scroll */}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden relative"
        style={{
          backgroundImage: "url(/background-desktop.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          backgroundRepeat: "no-repeat",
        }}>
        {/* Container pour garantir que l'overlay couvre tout le contenu */}
        <div className="relative min-h-full">
          {/* Overlay transparent */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-xs pointer-events-none"></div>

          {/* Contenu avec Outlet (non transparent) */}
          <div className="relative z-10">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
const MainLayout = () => {
  return (
    <>
      <MobileMainLayout />
      <DesktopMainLayout />
    </>
  );
};

export default MainLayout;
