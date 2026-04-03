/**
 * DesktopInsights.jsx
 * Vue desktop — Insights en onglets Finance / Commandes / Production
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

// ─── Sélecteur d'horizon ─────────────────────────────────────────────────────

const HorizonTabs = ({ horizon, onChange }) => (
  <div className="flex gap-1 bg-muted rounded-lg p-1">
    {Object.entries(HORIZONS).map(([, value]) => (
      <button
        key={value}
        onClick={() => onChange(value)}
        className={cn(
          "text-xs font-medium px-3 py-1.5 rounded-md transition-colors whitespace-nowrap",
          horizon === value
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}>
        {HORIZON_LABELS[value]}
      </button>
    ))}
  </div>
);

// ─── Composant principal ──────────────────────────────────────────────────────

const DesktopInsights = () => {
  const { isDesktop } = useBreakpoint();
  const [visible,  setVisible]  = useState(false);
  const [onglet,   setOnglet]   = useState("finance");
  const [horizon,  setHorizon]  = useState(HORIZONS.H24);
  const [refresh,  setRefresh]  = useState(0);

  useEffect(() => { setVisible(isDesktop); }, [isDesktop]);

  const triggerRefresh = () => setRefresh((n) => n + 1);

  return (
    <div
      className="min-h-screen flex flex-col bg-muted/30"
      style={{ display: visible ? "flex" : "none" }}>

      {/* ── Header ── */}
      <div className="bg-background border-b px-6 py-4 shrink-0">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Insights</h1>
            <p className="text-xs text-muted-foreground">
              Analyses prévisionnelles et recommandations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <HorizonTabs horizon={horizon} onChange={setHorizon} />
            <button
              onClick={triggerRefresh}
              className="p-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div className="bg-background border-b shrink-0">
        <div className="max-w-[1800px] mx-auto px-6">
          <div className="flex gap-0">
            {ONGLETS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setOnglet(id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors",
                  onglet === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}>
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1800px] mx-auto w-full p-6">
          {onglet === "finance"    && <FinanceInsightsTab    horizon={horizon} refreshKey={refresh} />}
          {onglet === "commandes"  && <CommandesInsightsTab  horizon={horizon} refreshKey={refresh} />}
          {onglet === "production" && <ProductionInsightsTab horizon={horizon} refreshKey={refresh} />}
        </div>
      </div>
    </div>
  );
};

export default DesktopInsights;
