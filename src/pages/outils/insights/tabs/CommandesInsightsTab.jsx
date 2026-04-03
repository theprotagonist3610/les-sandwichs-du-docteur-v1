/**
 * CommandesInsightsTab.jsx
 * Onglet Commandes — assemble KPI + graphiques + alertes
 *
 * Props :
 *  - horizon    {string}  — HORIZONS.*
 *  - refreshKey {number}  — incrémenté pour forcer un re-fetch
 */

import useCommandeInsights from "@/hooks/useCommandeInsights";
import useBreakpoint from "@/hooks/useBreakpoint";
import CommandesInsightsKpi    from "./commandes/CommandesInsightsKpi";
import CommandesVolumeChart    from "./commandes/CommandesVolumeChart";
import CommandesMenusChart     from "./commandes/CommandesMenusChart";
import CommandesJoursChart     from "./commandes/CommandesJoursChart";
import CommandesPdvChart       from "./commandes/CommandesPdvChart";
import CommandesInsightsAlerts from "./commandes/CommandesInsightsAlerts";
import { AlertTriangle, ShoppingCart } from "lucide-react";
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
    <Skeleton h="h-72" />
    <Skeleton h="h-44" />
    <Skeleton h="h-44" />
    <Skeleton h="h-16" />
  </div>
);

// ─── État vide ────────────────────────────────────────────────────────────────

const EtatVide = ({ horizon }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-6">
    <ShoppingCart className="w-10 h-10 text-muted-foreground opacity-30" />
    <p className="text-sm text-muted-foreground">
      Aucune donnée de commandes disponible pour « {HORIZON_LABELS[horizon]} ».
    </p>
    <p className="text-xs text-muted-foreground max-w-xs">
      Enregistrez des commandes pour générer une analyse prévisionnelle.
    </p>
  </div>
);

// ─── Composant principal ──────────────────────────────────────────────────────

const CommandesInsightsTab = ({ horizon, refreshKey }) => {
  const { isMobile } = useBreakpoint();
  const { analysis, loading, error } = useCommandeInsights(horizon, refreshKey);

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

      {/* KPI Cards */}
      <CommandesInsightsKpi analysis={analysis} horizon={horizon} />

      {/* Graphique 1 : Évolution volume & CA */}
      <CommandesVolumeChart analysis={analysis} isMobile={isMobile} />

      {/* Graphique 2 : Top menus — quantité + CA + ratio */}
      <CommandesMenusChart menus={analysis.menus} />

      {/* Graphique 3 : Jours forts */}
      <CommandesJoursChart jours={analysis.jours} isMobile={isMobile} />

      {/* Graphique 4 : Points de vente */}
      <CommandesPdvChart pdv={analysis.pdv} isMobile={isMobile} />

      {/* Alertes */}
      <CommandesInsightsAlerts analysis={analysis} />

    </div>
  );
};

export default CommandesInsightsTab;
