/**
 * ProductionInsightsTab.jsx
 * Onglet Production — KPI + graphiques + tableau + alertes
 *
 * Props :
 *  - horizon    {string}  — HORIZONS.*
 *  - refreshKey {number}  — incrémenté pour forcer un re-fetch
 */

import { AlertTriangle, Factory } from "lucide-react";
import useProductionInsights    from "@/hooks/useProductionInsights";
import useBreakpoint            from "@/hooks/useBreakpoint";
import ProductionInsightsKpi    from "./production/ProductionInsightsKpi";
import ProductionVolumeChart    from "./production/ProductionVolumeChart";
import ProductionMargeChart     from "./production/ProductionMargeChart";
import ProductionRendementChart from "./production/ProductionRendementChart";
import ProductionRecetteTable   from "./production/ProductionRecetteTable";
import ProductionInsightsAlerts from "./production/ProductionInsightsAlerts";
import { HORIZON_LABELS } from "@/utils/insightsToolkit/engine/insightTypes";

// ─── Squelettes ───────────────────────────────────────────────────────────────

const Skeleton = ({ h = "h-24" }) => (
  <div className={`${h} rounded-xl bg-muted animate-pulse`} />
);

const LoadingSkeleton = () => (
  <div className="flex flex-col gap-4">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Skeleton h="h-28" /><Skeleton h="h-28" /><Skeleton h="h-28" /><Skeleton h="h-28" />
    </div>
    <Skeleton h="h-52" />
    <Skeleton h="h-52" />
    <Skeleton h="h-40" />
    <Skeleton h="h-48" />
  </div>
);

// ─── État vide ────────────────────────────────────────────────────────────────

const EtatVide = ({ horizon }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-6">
    <Factory className="w-10 h-10 text-muted-foreground opacity-30" />
    <p className="text-sm text-muted-foreground">
      Aucune donnée de production disponible pour « {HORIZON_LABELS[horizon]} ».
    </p>
    <p className="text-xs text-muted-foreground max-w-xs">
      Enregistrez des lots de production pour générer une analyse.
    </p>
  </div>
);

// ─── Composant principal ──────────────────────────────────────────────────────

const ProductionInsightsTab = ({ horizon, refreshKey }) => {
  const { isMobile }             = useBreakpoint();
  const { analysis, loading, error } = useProductionInsights(horizon, refreshKey);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {error}
      </div>
    );
  }

  const hasData = analysis?.periodes?.length >= 1 && analysis?.totaux?.count > 0;
  if (!hasData) return <EtatVide horizon={horizon} />;

  return (
    <div className="flex flex-col gap-5">

      {/* KPI */}
      <ProductionInsightsKpi analysis={analysis} horizon={horizon} />

      {/* Volume par recette */}
      <ProductionVolumeChart analysis={analysis} isMobile={isMobile} />

      {/* Évolution des marges */}
      <ProductionMargeChart analysis={analysis} isMobile={isMobile} />

      {/* Rendement par recette */}
      <ProductionRendementChart analysis={analysis} />

      {/* Tableau récapitulatif */}
      <ProductionRecetteTable analysis={analysis} />

      {/* Alertes */}
      <ProductionInsightsAlerts analysis={analysis} />

    </div>
  );
};

export default ProductionInsightsTab;
