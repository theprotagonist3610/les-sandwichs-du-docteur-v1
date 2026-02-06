import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState, useMemo } from "react";
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
import DashboardCarousel from "@/components/dashboard/DashboardCarousel";

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

  // Construire la liste des widgets à afficher dans le carousel
  const widgets = useMemo(() => {
    const baseWidgets = [
      <TodayWidget key="today" isMobile={true} />,
      <VentesWidget key="ventes" isMobile={true} />,
      <ClotureWidget key="cloture" isMobile={true} />,
      <TaskWidget key="task" isMobile={true} />,
    ];

    // Ajouter les widgets réservés aux superviseurs et admins
    if (isSupervisorOrAdmin) {
      baseWidgets.push(
        // <StatsWidget key="stats" isMobile={true} />,
        // <ComptaWidget key="compta" isMobile={true} />,
        // <StockWidget key="stock" isMobile={true} />,
        <UsersWidget key="users" isMobile={true} />,
      );
    }

    return baseWidgets;
  }, [isSupervisorOrAdmin]);

  return (
    <div
      className="min-h-screen pb-20"
      style={{ display: visible ? "block" : "none" }}>
      <DashboardCarousel>{widgets}</DashboardCarousel>
    </div>
  );
};

export default MobileVueData;
