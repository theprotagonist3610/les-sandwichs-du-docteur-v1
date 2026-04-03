/**
 * MobileInsights.jsx
 * Vue mobile — Insights en onglets Finance / Commandes / Production
 */

import { useState, useEffect } from "react";
import useBreakpoint from "@/hooks/useBreakpoint";
import { HORIZONS, HORIZON_LABELS } from "@/utils/insightsToolkit/engine/insightTypes";
import { TrendingUp, ShoppingCart, Factory, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import FinanceInsightsTab    from "./tabs/FinanceInsightsTab";
import CommandesInsightsTab  from "./tabs/CommandesInsightsTab";
import ProductionInsightsTab from "./tabs/ProductionInsightsTab";

// ─── Config onglets ───────────────────────────────────────────────────────────

const ONGLETS = [
  { id: "finance",    label: "Finance",    icon: TrendingUp  },
  { id: "commandes",  label: "Commandes",  icon: ShoppingCart },
  { id: "production", label: "Production", icon: Factory      },
];

// ─── Composant principal ──────────────────────────────────────────────────────

const MobileInsights = () => {
  const { isMobile } = useBreakpoint();
  const [visible,  setVisible]  = useState(false);
  const [onglet,   setOnglet]   = useState("finance");
  const [horizon,  setHorizon]  = useState(HORIZONS.H24);
  const [refresh,  setRefresh]  = useState(0);

  useEffect(() => { setVisible(isMobile); }, [isMobile]);

  const triggerRefresh = () => setRefresh((n) => n + 1);

  return (
    <div
      className="flex flex-col bg-background"
      style={{ display: visible ? "flex" : "none", minHeight: "100dvh" }}>

      {/* ── Header sticky ── */}
      <div className="sticky top-0 z-20 bg-background border-b shrink-0">

        {/* Titre + refresh */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h1 className="text-base font-semibold">Insights</h1>
          <button
            onClick={triggerRefresh}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Chips horizon */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-none">
          {Object.entries(HORIZONS).map(([, value]) => (
            <button
              key={value}
              onClick={() => setHorizon(value)}
              className={cn(
                "shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
                horizon === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
              {HORIZON_LABELS[value]}
            </button>
          ))}
        </div>

        {/* Chips onglets */}
        <div className="flex border-t">
          {ONGLETS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setOnglet(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors",
                onglet === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              )}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu scrollable ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {onglet === "finance"    && <FinanceInsightsTab    horizon={horizon} refreshKey={refresh} />}
        {onglet === "commandes"  && <CommandesInsightsTab  horizon={horizon} refreshKey={refresh} />}
        {onglet === "production" && <ProductionInsightsTab horizon={horizon} refreshKey={refresh} />}
      </div>
    </div>
  );
};

export default MobileInsights;
