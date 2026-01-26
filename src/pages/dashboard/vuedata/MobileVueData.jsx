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

const MobileVueData = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const { user } = useActiveUserStore();

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  // Vérifier si l'utilisateur a un rôle superviseur ou admin
  const isSupervisorOrAdmin =
    user?.role === "superviseur" || user?.role === "admin";

  return (
    <div
      className="min-h-screen space-y-4"
      style={{ display: visible ? "block" : "none" }}>
      {/* Widgets accessibles à tous les rôles */}
      <TodayWidget isMobile={true} />
      <VentesWidget isMobile={true} />
      <ClotureWidget isMobile={true} />
      <TaskWidget isMobile={true} />

      {/* Widgets réservés aux superviseurs et admins */}
      {isSupervisorOrAdmin && (
        <>
          <StatsWidget isMobile={true} />
          <ComptaWidget isMobile={true} />
          <StockWidget isMobile={true} />
          <UsersWidget isMobile={true} />
        </>
      )}
    </div>
  );
};

export default MobileVueData;
