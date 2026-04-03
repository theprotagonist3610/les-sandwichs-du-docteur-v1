/**
 * ProductionInsightsTab.jsx
 * Onglet Production — assemble KPI + graphiques + alertes
 *
 * Props :
 *  - horizon    {string}  — HORIZONS.*
 *  - refreshKey {number}  — incrémenté pour forcer un re-fetch
 */

import useProductionInsights    from "@/hooks/useProductionInsights";
import useBreakpoint            from "@/hooks/useBreakpoint";
import ProductionInsightsKpi    from "./production/ProductionInsightsKpi";
import ProductionVolumeChart    from "./production/ProductionVolumeChart";
import ProductionSchemasChart   from "./production/ProductionSchemasChart";
import ProductionRendementChart from "./production/ProductionRendementChart";
import ProductionCoutsChart     from "./production/ProductionCoutsChart";
import ProductionInsightsAlerts from "./production/ProductionInsightsAlerts";
import { AlertTriangle, Factory } from "lucide-react";
import { HORIZON_LABELS } from "@/utils/insightsToolkit/engine/insightTypes";

// ─── Squelettes ───────────────────────────────────────────────────────────────

const Skeleton = ({ h = "h-24" }) => (
  <div className={`${h} rounded-xl bg-muted animate-pulse`} />
);

const LoadingSkeleton = () => (
  <div className="flex flex-col gap-4">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Skeleton h="h-28" /><Skeleton h="h-28" /><Skeleton h="h-28" />
    </div>
    <Skeleton h="h-52" />
    <Skeleton h="h-64" />
    <Skeleton h="h-48" />
    <Skeleton h="h-64" />
    <Skeleton h="h-16" />
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
      Enregistrez des productions pour générer une analyse prévisionnelle.
    </p>
  </div>
);

// ─── Composant principal ──────────────────────────────────────────────────────

const ProductionInsightsTab = ({ horizon, refreshKey }) => {
  const { isMobile } = useBreakpoint();
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

  const hasData = analysis?.periodes?.length >= 2;
  if (!hasData) return <EtatVide horizon={horizon} />;

  return (
    <div className="flex flex-col gap-5">

      {/* KPI */}
      <ProductionInsightsKpi analysis={analysis} horizon={horizon} />

      {/* Graphique 1 : Volume & Coût */}
      <ProductionVolumeChart analysis={analysis} isMobile={isMobile} />

      {/* Graphique 2 : Ranking schémas */}
      <ProductionSchemasChart schemas={analysis.schemas} />

      {/* Graphique 3 : Rendement par schéma */}
      <ProductionRendementChart schemas={analysis.schemas} isMobile={isMobile} />

      {/* Graphique 4 : Tendance coûts par schéma */}
      <ProductionCoutsChart
        schemas={analysis.schemas}
        coutsChart={analysis.coutsChart}
        isMobile={isMobile}
      />

      {/* Alertes */}
      <ProductionInsightsAlerts analysis={analysis} />

    </div>
  );
};

export default ProductionInsightsTab;
