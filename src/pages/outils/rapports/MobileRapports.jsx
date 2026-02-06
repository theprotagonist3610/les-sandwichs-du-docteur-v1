import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Lock } from "lucide-react";
import RapportsView from "@/components/rapports/RapportsView";
import CloturesView from "@/components/rapports/CloturesView";

/**
 * Page Rapports Mobile
 * Affiche les rapports journaliers et les clôtures avec onglets
 */
const MobileRapports = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("rapports");

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div
      className="min-h-screen p-4 space-y-4"
      style={{ display: visible ? "block" : "none" }}>
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Rapports & Clôtures</h1>
        <p className="text-sm text-muted-foreground">
          Rapports journaliers et historique
        </p>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rapports" className="flex items-center gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" />
            Rapports
          </TabsTrigger>
          <TabsTrigger value="clotures" className="flex items-center gap-1.5 text-xs">
            <Lock className="w-3.5 h-3.5" />
            Clôtures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rapports" className="mt-4">
          <RapportsView isMobile={true} />
        </TabsContent>

        <TabsContent value="clotures" className="mt-4">
          <CloturesView isMobile={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MobileRapports;
