import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState } from "react";
import useActiveUserStore from "@/store/activeUserStore";

// Widgets
import TodayWidget from "@/components/dashboard/TodayWidget";
import VentesWidget from "@/components/dashboard/VentesWidget";
import ClotureWidget from "@/components/dashboard/ClotureWidget";
import TaskWidget from "@/components/dashboard/TaskWidget";
import StatsWidget from "@/components/dashboard/StatsWidget";
import ComptaWidget from "@/components/dashboard/ComptaWidget";
import StockWidget from "@/components/dashboard/StockWidget";
import UsersWidget from "@/components/dashboard/UsersWidget";

const DesktopVueData = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const { user } = useActiveUserStore();

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  // Vérifier si l'utilisateur a un rôle superviseur ou admin
  const isSupervisorOrAdmin =
    user?.role === "superviseur" || user?.role === "admin";

  return (
    <div
      className="min-h-screen space-y-6"
      style={{ display: visible ? "block" : "none" }}>
      {/* Widgets accessibles à tous les rôles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <TodayWidget isMobile={false} />
        <VentesWidget isMobile={false} />
        <ClotureWidget isMobile={false} />
      </div>

      {/* TaskWidget - accessible à tous */}
      <TaskWidget isMobile={false} />

      {/* Widgets réservés aux superviseurs et admins */}
      {isSupervisorOrAdmin && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <StatsWidget isMobile={false} />
            <ComptaWidget isMobile={false} />
            <StockWidget isMobile={false} />
          </div>

          {/* UsersWidget - superviseur/admin uniquement */}
          <UsersWidget isMobile={false} />
        </>
      )}
    </div>
  );
};

export default DesktopVueData;
