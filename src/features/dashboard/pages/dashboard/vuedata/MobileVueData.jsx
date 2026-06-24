import useBreakpoint from "@/shared/hooks/useBreakpoint";
import { useEffect, useState, useMemo } from "react";
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
import DashboardCarousel from "@/features/dashboard/components/DashboardCarousel";

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
        <ComptaWidget key="compta" isMobile={true} />,
        <DistributionWidget key="distribution" isMobile={true} />,
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
