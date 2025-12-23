import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Map } from "lucide-react";
import DesktopEmplacementsData from "./DesktopEmplacementsData";
import DesktopEmplacementsMap from "./DesktopEmplacementsMap";

const DesktopEmplacements = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("data");

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <div className="max-w-7xl mx-auto p-8">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Emplacements
          </h1>
          <p className="text-muted-foreground">
            Gérez vos points de vente et leurs informations
          </p>
        </div>

        {/* Onglets Vue Données / Vue Map */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span>Vue Données</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              <span>Vue Carte</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="mt-0">
            <DesktopEmplacementsData />
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            <DesktopEmplacementsMap />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DesktopEmplacements;
