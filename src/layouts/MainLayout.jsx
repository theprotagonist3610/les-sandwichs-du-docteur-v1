import { Outlet } from "react-router-dom";
import DesktopNavbar from "@/shared/components/navbars/DesktopNavbar";
import MobileNavbar from "@/shared/components/navbars/MobileNavbar";

/**
 * Layout unique responsive — élimine le dual-render de la v1.
 * Les navbars se masquent via Tailwind (lg:hidden / hidden lg:flex).
 * Un seul <Outlet /> est rendu.
 */
const MainLayout = () => (
  <div className="min-h-dvh flex flex-col bg-background">
    <DesktopNavbar className="hidden lg:flex sticky top-0 z-[var(--z-navbar)]" />

    <main
      className="
        flex-1 overflow-y-auto overflow-x-hidden relative
        bg-[url('/background-mobile.jpg')] lg:bg-[url('/background-desktop.jpg')]
        bg-cover bg-center bg-fixed
        pb-[var(--mobile-nav-height)] lg:pb-0
      "
    >
      {/* Overlay — plus opaque sur mobile pour lisibilité sur fond sombre */}
      <div className="absolute inset-0 bg-background/80 lg:bg-background/60 backdrop-blur-sm lg:backdrop-blur-xs pointer-events-none" />

      {/* Contenu — au-dessus de l'overlay */}
      <div className="relative z-[var(--z-base)]">
        <Outlet />
      </div>
    </main>

    <MobileNavbar className="lg:hidden fixed bottom-0 inset-x-0 z-[var(--z-navbar)] pb-[env(safe-area-inset-bottom)]" />
  </div>
);

export default MainLayout;
