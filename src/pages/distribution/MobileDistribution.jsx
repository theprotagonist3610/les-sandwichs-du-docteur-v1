import { useState, useEffect } from "react";
import { Users, Truck, CreditCard, BarChart2, Map, Globe } from "lucide-react";
import useBreakpoint from "@/hooks/useBreakpoint";
import { cn } from "@/lib/utils";
import OngletDistributeurs from "./tabs/OngletDistributeurs";
import OngletZones         from "./tabs/OngletZones";
import OngletTournees      from "./tabs/OngletTournees";
import OngletPaiements     from "./tabs/OngletPaiements";
import OngletRapports      from "./tabs/OngletRapports";
import OngletCarte         from "./tabs/OngletCarte";

const ONGLETS = [
  { id: "distributeurs", label: "Distributeurs", icon: Users      },
  { id: "zones",         label: "Zones",         icon: Map        },
  { id: "tournees",      label: "Tournées",      icon: Truck      },
  { id: "paiements",     label: "Paiements",     icon: CreditCard },
  { id: "carte",         label: "Carte",         icon: Globe      },
  { id: "rapports",      label: "Rapports",      icon: BarChart2  },
];

const CONTENU = {
  distributeurs: OngletDistributeurs,
  zones:         OngletZones,
  tournees:      OngletTournees,
  paiements:     OngletPaiements,
  carte:         OngletCarte,
  rapports:      OngletRapports,
};

const MobileDistribution = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const [onglet, setOnglet]   = useState("distributeurs");

  useEffect(() => { setVisible(isMobile); }, [isMobile]);

  const Contenu = CONTENU[onglet];

  return (
    <div
      className="flex flex-col bg-background"
      style={{ display: visible ? "flex" : "none", minHeight: "100dvh" }}>

      {/* ── Header sticky ── */}
      <div className="sticky top-0 z-20 bg-background border-b shrink-0">
        <div className="px-4 pt-3 pb-2">
          <h1 className="text-base font-semibold">Distribution</h1>
        </div>

        {/* Chips onglets */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          {ONGLETS.map(({ id, label, icon: Icon }) => {
            const actif = onglet === id;
            return (
              <button
                key={id}
                onClick={() => setOnglet(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                  actif
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Contenu scrollable ── */}
      <div className="flex-1 overflow-y-auto p-4">
        <Contenu />
      </div>
    </div>
  );
};

export default MobileDistribution;
