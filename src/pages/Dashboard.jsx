import VueData from "./dashboard/VueData";
import VueMap from "./dashboard/VueMap";
import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState } from "react";
import { Map, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Version Mobile de la page Paramètres
const MobileDashboard = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <div className="p-4 pb-20">
        {/* En-tête de la page - Mobile */}
        {/* <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Vue d&apos;ensemble de votre activité
          </p>
        </div> */}

        {/* Tabs pour basculer entre les vues */}
        <Tabs defaultValue="data" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="data" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>Données</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              <span>Carte</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="mt-0">
            <VueData />
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            <VueMap />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Version Desktop de la page Paramètres
const DesktopDashboard = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <div className="max-w-7xl mx-auto p-8">
        {/* En-tête de la page - Desktop */}
        {/* <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-base text-muted-foreground">
            Vue d&apos;ensemble de votre activité
          </p>
        </div> */}

        {/* Tabs pour basculer entre les vues */}
        <Tabs defaultValue="data" className="w-full">
          <TabsList className="inline-flex mb-8">
            <TabsTrigger value="data" className="flex items-center gap-2 px-6">
              <BarChart3 className="w-5 h-5" />
              <span>Données</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2 px-6">
              <Map className="w-5 h-5" />
              <span>Carte</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="mt-0">
            <VueData />
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            <VueMap />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Composant principal qui rend les deux versions
const Dashboard = () => {
  return (
    <>
      <MobileDashboard />
      <DesktopDashboard />
    </>
  );
};

export default Dashboard;
