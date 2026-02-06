import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Lock } from "lucide-react";
import RapportsView from "@/components/rapports/RapportsView";
import CloturesView from "@/components/rapports/CloturesView";

/**
 * Page Rapports Desktop
 * Affiche les rapports journaliers et les clôtures avec onglets
 */
const DesktopRapports = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("rapports");

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div
      className="min-h-screen p-6 space-y-6"
      style={{ display: visible ? "block" : "none" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Rapports & Clôtures</h1>
        <p className="text-muted-foreground">
          Consultez les rapports journaliers et l'historique des clôtures
        </p>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="rapports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Rapports
          </TabsTrigger>
          <TabsTrigger value="clotures" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Clôtures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rapports" className="mt-6">
          <RapportsView isMobile={false} />
        </TabsContent>

        <TabsContent value="clotures" className="mt-6">
          <CloturesView isMobile={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DesktopRapports;
