import { useMemo } from "react";
import useActiveUserStore from "@/features/auth/store/activeUserStore";
import { useRef } from "react";
import { useGSAP } from "@/shared/hooks/useGSAP";
import { staggerFadeInUp } from "@/lib/animations";

import TodayWidget from "../components/TodayWidget";
import VentesWidget from "../components/VentesWidget";
import ClotureWidget from "../components/ClotureWidget";
import TaskWidget from "../components/TaskWidget";
import ComptaWidget from "../components/ComptaWidget";
import StockWidget from "../components/StockWidget";
import UsersWidget from "../components/UsersWidget";
import DistributionWidget from "../components/DistributionWidget";
import DashboardCarousel from "../components/DashboardCarousel";

const VueData = () => {
  const { user } = useActiveUserStore();
  const containerRef = useRef(null);

  const isSupervisorOrAdmin = user?.role === "superviseur" || user?.role === "admin";

  useGSAP(() => {
    staggerFadeInUp(".widget-card", { stagger: 0.05 });
  }, { scope: containerRef });

  const mobileWidgets = useMemo(() => {
    const base = [
      <TodayWidget key="today" isMobile={true} />,
      <VentesWidget key="ventes" isMobile={true} />,
      <ClotureWidget key="cloture" isMobile={true} />,
      <TaskWidget key="task" isMobile={true} />,
    ];
    if (isSupervisorOrAdmin) {
      base.push(
        <ComptaWidget key="compta" isMobile={true} />,
        <DistributionWidget key="distribution" isMobile={true} />,
        <UsersWidget key="users" isMobile={true} />,
      );
    }
    return base;
  }, [isSupervisorOrAdmin]);

  return (
    <div ref={containerRef}>
      {/* Mobile : carousel */}
      <div className="block md:hidden pb-20">
        <DashboardCarousel>{mobileWidgets}</DashboardCarousel>
      </div>

      {/* Desktop : grille */}
      <div className="hidden md:block space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <TodayWidget isMobile={false} />
          <VentesWidget isMobile={false} />
          <ClotureWidget isMobile={false} />
        </div>

        <TaskWidget isMobile={false} />

        {isSupervisorOrAdmin && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <ComptaWidget isMobile={false} />
              <DistributionWidget isMobile={false} />
            </div>
            <UsersWidget isMobile={false} />
          </>
        )}
      </div>
    </div>
  );
};

export default VueData;
