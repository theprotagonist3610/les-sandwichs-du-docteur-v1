import { useRef } from "react";
import { CalendarDays, BarChart3, ClipboardCheck, Map, Sun, ShoppingCart, ClipboardCheck as ClipCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/button";
import { useGSAP } from "@/shared/hooks/useGSAP";
import { staggerFadeInUp } from "@/lib/animations";
import useActiveUserStore from "@/features/auth/store/activeUserStore";

import TodayWidget from "@/features/dashboard/components/TodayWidget";
import VentesWidget from "@/features/dashboard/components/VentesWidget";
import ClotureWidget from "@/features/dashboard/components/ClotureWidget";
import TaskWidget from "@/features/dashboard/components/TaskWidget";
import ComptaWidget from "@/features/dashboard/components/ComptaWidget";
import DistributionWidget from "@/features/dashboard/components/DistributionWidget";
import StockWidget from "@/features/dashboard/components/StockWidget";
import UsersWidget from "@/features/dashboard/components/UsersWidget";

const BrutalCard = ({ children, className = "", accent = false, label }) => (
  <div
    className={`
      border-3 border-foreground bg-card
      shadow-[4px_4px_0px_var(--foreground)]
      hover:shadow-[6px_6px_0px_var(--foreground)]
      hover:translate-x-[-2px] hover:translate-y-[-2px]
      transition-all duration-100
      ${accent ? "border-primary shadow-[4px_4px_0px_var(--primary)]" : ""}
      ${className}
    `}
  >
    {label && (
      <div className={`px-4 py-2 border-b-2 border-foreground font-bold uppercase tracking-wider text-xs ${accent ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
        {label}
      </div>
    )}
    <div className="p-0">{children}</div>
  </div>
);

const DateHero = () => {
  const now = new Date();
  const jour = now.toLocaleDateString("fr-FR", { weekday: "long" });
  const date = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const heure = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="widget-card border-4 border-foreground bg-primary text-primary-foreground shadow-[6px_6px_0px_var(--foreground)] p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs lg:text-sm uppercase tracking-widest font-bold opacity-80">{jour}</p>
          <p className="text-2xl lg:text-4xl font-extrabold tracking-tight mt-1">{date}</p>
        </div>
        <div className="text-right">
          <Sun className="size-10 lg:size-14 opacity-90" strokeWidth={2.5} />
          <p className="text-lg lg:text-2xl font-bold tabular-nums mt-1">{heure}</p>
        </div>
      </div>
    </div>
  );
};

const TabAujourdhui = () => {
  const ref = useRef(null);
  useGSAP(() => { staggerFadeInUp(".widget-card", { stagger: 0.06 }); }, { scope: ref });
  return (
    <div ref={ref} className="space-y-4 lg:space-y-6">
      {/* Hero date — plein écran, rouge brand */}
      <DateHero />

      {/* Bento grid — 2 colonnes desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <BrutalCard className="widget-card" label="Ventes du jour" accent>
          <VentesWidget />
        </BrutalCard>

        <BrutalCard className="widget-card" label="Clôture">
          <ClotureWidget />
        </BrutalCard>
      </div>

      {/* Résumé complet — pleine largeur */}
      <BrutalCard className="widget-card" label="Résumé de la journée">
        <TodayWidget />
      </BrutalCard>
    </div>
  );
};

const TabActivite = () => {
  const ref = useRef(null);
  useGSAP(() => { staggerFadeInUp(".widget-card", { stagger: 0.06 }); }, { scope: ref });
  return (
    <div ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <BrutalCard className="widget-card" label="Comptabilité" accent>
        <ComptaWidget />
      </BrutalCard>
      <BrutalCard className="widget-card" label="Distribution">
        <DistributionWidget />
      </BrutalCard>
      <BrutalCard className="widget-card lg:col-span-2" label="Stock">
        <StockWidget />
      </BrutalCard>
    </div>
  );
};

const TabTaches = () => {
  const ref = useRef(null);
  useGSAP(() => { staggerFadeInUp(".widget-card", { stagger: 0.06 }); }, { scope: ref });
  return (
    <div ref={ref}>
      <BrutalCard className="widget-card" label="Tâches" accent>
        <TaskWidget />
      </BrutalCard>
    </div>
  );
};

const TabTachesSuperviseur = () => {
  const ref = useRef(null);
  useGSAP(() => { staggerFadeInUp(".widget-card", { stagger: 0.06 }); }, { scope: ref });
  return (
    <div ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <BrutalCard className="widget-card" label="Tâches" accent>
        <TaskWidget />
      </BrutalCard>
      <BrutalCard className="widget-card" label="Utilisateurs">
        <UsersWidget />
      </BrutalCard>
    </div>
  );
};

import VueMap from "./dashboard/VueMap";

const TabCarte = () => <VueMap />;

const Dashboard = () => {
  const { isSuperviseur } = useActiveUserStore();
  const isSupOrAdmin = isSuperviseur();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-8 pt-4 lg:pt-6">
        <h1 className="text-2xl lg:text-4xl font-bold">DASHBOARD</h1>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="aujourdhui" className="w-full px-4 lg:px-8 pt-4">
        <TabsList className="flex w-full overflow-x-auto scrollbar-none gap-0 p-0 bg-transparent h-auto mb-6">
          <TabsTrigger
            value="aujourdhui"
            className="flex items-center gap-2 px-4 lg:px-6 py-3 border-2 border-foreground border-r-0 first:border-r-0 font-bold uppercase text-xs lg:text-sm tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none shrink-0"
          >
            <CalendarDays className="size-4" />
            <span className="hidden sm:inline">Aujourd'hui</span>
            <span className="sm:hidden">Auj.</span>
          </TabsTrigger>

          {isSupOrAdmin && (
            <TabsTrigger
              value="activite"
              className="flex items-center gap-2 px-4 lg:px-6 py-3 border-2 border-foreground border-r-0 font-bold uppercase text-xs lg:text-sm tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none shrink-0"
            >
              <BarChart3 className="size-4" />
              <span className="hidden sm:inline">Activité</span>
              <span className="sm:hidden">Activ.</span>
            </TabsTrigger>
          )}

          <TabsTrigger
            value="taches"
            className="flex items-center gap-2 px-4 lg:px-6 py-3 border-2 border-foreground border-r-0 font-bold uppercase text-xs lg:text-sm tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none shrink-0"
          >
            <ClipboardCheck className="size-4" />
            <span className="hidden sm:inline">Tâches</span>
            <span className="sm:hidden">Tâch.</span>
          </TabsTrigger>

          {isSupOrAdmin && (
            <TabsTrigger
              value="carte"
              className="flex items-center gap-2 px-4 lg:px-6 py-3 border-2 border-foreground font-bold uppercase text-xs lg:text-sm tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none shrink-0"
            >
              <Map className="size-4" />
              Carte
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="aujourdhui" className="mt-0">
          <TabAujourdhui />
        </TabsContent>

        {isSupOrAdmin && (
          <TabsContent value="activite" className="mt-0">
            <TabActivite />
          </TabsContent>
        )}

        <TabsContent value="taches" className="mt-0">
          {isSupOrAdmin ? <TabTachesSuperviseur /> : <TabTaches />}
        </TabsContent>

        {isSupOrAdmin && (
          <TabsContent value="carte" className="mt-0">
            <TabCarte />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Dashboard;
