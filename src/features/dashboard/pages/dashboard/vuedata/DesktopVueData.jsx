import useBreakpoint from "@/shared/hooks/useBreakpoint";
import { useEffect, useState } from "react";
import useActiveUserStore from "@/features/auth/store/activeUserStore";

// Widgets
import TodayWidget from "@/features/dashboard/components/TodayWidget";
import VentesWidget from "@/features/dashboard/components/VentesWidget";
import ClotureWidget from "@/features/dashboard/components/ClotureWidget";
import TaskWidget from "@/features/dashboard/components/TaskWidget";
import StatsWidget from "@/features/dashboard/components/StatsWidget";
import ComptaWidget from "@/features/dashboard/components/ComptaWidget";
import StockWidget from "@/features/dashboard/components/StockWidget";
import UsersWidget from "@/features/dashboard/components/UsersWidget";
import DistributionWidget from "@/features/dashboard/components/DistributionWidget";

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
            {/* <StatsWidget isMobile={false} /> */}
            <ComptaWidget isMobile={false} />
            <DistributionWidget isMobile={false} />
            {/* <StockWidget isMobile={false} /> */}
          </div>

          {/* UsersWidget - superviseur/admin uniquement */}
          <UsersWidget isMobile={false} />
        </>
      )}
    </div>
  );
};

export default DesktopVueData;
