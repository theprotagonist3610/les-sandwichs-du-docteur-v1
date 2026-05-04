/**
 * ProductionInsightsAlerts.jsx
 * Alertes issues du moteur d'analyse : marge négative, rendement faible, dérive de coût
 */

import { AlertTriangle, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMontant, formatRendement } from "@/utils/productionToolkit";

const ICONS = {
  rendement_faible: TrendingDown,
  marge_negative:   AlertTriangle,
  derive_cout:      AlertTriangle,
};

const COLORS = {
  rendement_faible: "text-amber-600 bg-amber-50 border-amber-200",
  marge_negative:   "text-destructive bg-destructive/5 border-destructive/20",
  derive_cout:      "text-orange-600 bg-orange-50 border-orange-200",
};

const ProductionInsightsAlerts = ({ analysis }) => {
  const alertes = analysis?.alertes ?? [];
  if (!alertes.length) return null;

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Alertes de production</h3>
      <div className="flex flex-col gap-2">
        {alertes.map((alerte, i) => {
          const Icon      = ICONS[alerte.type] ?? Info;
          const colorClass = COLORS[alerte.type] ?? "text-muted-foreground bg-muted border-border";
          return (
            <div key={i} className={cn("flex items-start gap-3 rounded-lg border px-3 py-2.5 text-xs", colorClass)}>
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5">
                {alerte.recette !== "global" && (
                  <span className="font-semibold">{alerte.recette}</span>
                )}
                <span>{alerte.message}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductionInsightsAlerts;
