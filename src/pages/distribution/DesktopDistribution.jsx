import { useState, useEffect } from "react";
import { Users, Truck, CreditCard, BarChart2, Map, Globe } from "lucide-react";
import useBreakpoint from "@/hooks/useBreakpoint";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OngletDistributeurs from "./tabs/OngletDistributeurs";
import OngletZones         from "./tabs/OngletZones";
import OngletTournees      from "./tabs/OngletTournees";
import OngletPaiements     from "./tabs/OngletPaiements";
import OngletRapports      from "./tabs/OngletRapports";
import OngletCarte         from "./tabs/OngletCarte";

const ONGLETS = [
  { id: "distributeurs", label: "Distributeurs", icon: Users,      component: OngletDistributeurs },
  { id: "zones",         label: "Zones",         icon: Map,        component: OngletZones         },
  { id: "tournees",      label: "Tournées",      icon: Truck,      component: OngletTournees      },
  { id: "paiements",     label: "Paiements",     icon: CreditCard, component: OngletPaiements     },
  { id: "carte",         label: "Carte",         icon: Globe,      component: OngletCarte         },
  { id: "rapports",      label: "Rapports",      icon: BarChart2,  component: OngletRapports      },
];

const DesktopDistribution = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => { setVisible(isDesktop); }, [isDesktop]);

  return (
    <div
      className="min-h-screen flex flex-col bg-muted/30"
      style={{ display: visible ? "flex" : "none" }}>

      {/* ── Header ── */}
      <div className="bg-background border-b px-6 py-4 shrink-0">
        <div className="max-w-450 mx-auto">
          <h1 className="text-xl font-semibold">Distribution</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestion des distributeurs, tournées et paiements de ristourne
          </p>
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="flex-1 max-w-450 mx-auto w-full px-6 py-5">
        <Tabs defaultValue="distributeurs">
          <TabsList className="mb-5">
            {ONGLETS.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id} className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {ONGLETS.map(({ id, component: Comp }) => (
            <TabsContent key={id} value={id} className="mt-0">
              <Comp />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default DesktopDistribution;
