import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Map } from "lucide-react";
import MobileEmplacementsData from "./MobileEmplacementsData";
import MobileEmplacementsMap from "./MobileEmplacementsMap";

const MobileEmplacements = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("data");

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <div className="p-4 pb-20">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Emplacements
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos points de vente et leurs informations
          </p>
        </div>

        {/* Onglets Vue Données / Vue Map */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span>Données</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              <span>Carte</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="mt-0">
            <MobileEmplacementsData />
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            <MobileEmplacementsMap />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MobileEmplacements;
