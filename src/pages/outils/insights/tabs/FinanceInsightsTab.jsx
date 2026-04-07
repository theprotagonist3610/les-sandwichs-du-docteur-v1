/**
 * FinanceInsightsTab.jsx
 * Onglet Finance — assemble KPI + graphiques + alertes
 *
 * Props :
 *  - horizon    {string}  — HORIZONS.*
 *  - refreshKey {number}  — incrémenté pour forcer un re-fetch
 */

import { useState } from "react";
import useFinanceInsights from "@/hooks/useFinanceInsights";
import useBreakpoint from "@/hooks/useBreakpoint";
import FinanceInsightsKpi    from "./finance/FinanceInsightsKpi";
import FinanceInsightsChart  from "./finance/FinanceInsightsChart";
import FinanceDepensesChart  from "./finance/FinanceDepensesChart";
import FinanceInsightsAlerts from "./finance/FinanceInsightsAlerts";
import { Loader2, AlertTriangle, TrendingUp, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HORIZON_LABELS } from "@/utils/insightsToolkit/engine/insightTypes";

// ─── Squelettes de chargement ─────────────────────────────────────────────────

const Skeleton = ({ h = "h-24" }) => (
  <div className={`${h} rounded-xl bg-muted animate-pulse`} />
);

const LoadingSkeleton = () => (
  <div className="flex flex-col gap-4">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Skeleton h="h-28" />
      <Skeleton h="h-28" />
      <Skeleton h="h-28" />
    </div>
    <Skeleton h="h-52" />
    <Skeleton h="h-52" />
    <Skeleton h="h-48" />
    <Skeleton h="h-64" />
    <Skeleton h="h-16" />
  </div>
);

// ─── État vide ────────────────────────────────────────────────────────────────

const EtatVide = ({ horizon }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-6">
    <TrendingUp className="w-10 h-10 text-muted-foreground opacity-30" />
    <p className="text-sm text-muted-foreground">
      Aucune donnée financière disponible pour « {HORIZON_LABELS[horizon]} ».
    </p>
    <p className="text-xs text-muted-foreground max-w-xs">
      Enregistrez des encaissements et dépenses pour générer une analyse prévisionnelle.
    </p>
  </div>
);

// ─── Composant principal ──────────────────────────────────────────────────────

const FinanceInsightsTab = ({ horizon, refreshKey }) => {
  const { isMobile } = useBreakpoint();
  const [compareWithPrev, setCompareWithPrev] = useState(false);
  const { analysis, loading, error } = useFinanceInsights(horizon, refreshKey, compareWithPrev);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {error}
      </div>
    );
  }

  const hasData = analysis?.periodes?.length >= 3;
  if (!hasData) return <EtatVide horizon={horizon} />;

  return (
    <div className="flex flex-col gap-5">

      {/* Toggle comparaison */}
      <div className="flex justify-end">
        <Button
          variant={compareWithPrev ? "default" : "outline"}
          size="sm"
          onClick={() => setCompareWithPrev((v) => !v)}
          className="gap-2">
          <GitCompare className="w-4 h-4" />
          Comparer période précédente
        </Button>
      </div>

      {/* KPI Cards */}
      <FinanceInsightsKpi analysis={analysis} horizon={horizon} />

      {/* Graphiques enc/dep historique + forecast */}
      <FinanceInsightsChart analysis={analysis} isMobile={isMobile} />

      {/* Graphique motifs de dépenses */}
      <FinanceDepensesChart motifData={analysis.motifData} isMobile={isMobile} />

      {/* Alertes textuelles */}
      <FinanceInsightsAlerts analysis={analysis} />

    </div>
  );
};

export default FinanceInsightsTab;
