/**
 * ProductionRendementChart.jsx
 * Barres horizontales : rendement moyen par recette
 */

import { RECETTE_COLORS, RECETTE_LABELS, RECETTE_ICONS, formatRendement } from "@/utils/productionToolkit";
import { cn } from "@/lib/utils";

const ProductionRendementChart = ({ analysis }) => {
  const recettes = analysis.charts?.rendements ?? [];
  const actives  = recettes.filter((r) => r.count > 0);

  if (!actives.length) return null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold mb-1">Rendement moyen par recette</h3>
      <p className="text-xs text-muted-foreground mb-4">% de la quantité d'ingrédient principal transformé</p>

      <div className="flex flex-col gap-4">
        {actives.map((r) => {
          const color  = RECETTE_COLORS[r.recette] ?? "#6b7280";
          const icon   = RECETTE_ICONS[r.recette] ?? "";
          const rend   = r.rendementMoyen;
          const pct    = Math.min(rend, 150); // cap à 150 % pour la barre
          const colorClass = rend >= 85 ? "text-green-600" : rend >= 70 ? "text-amber-600" : "text-destructive";

          return (
            <div key={r.recette} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <span>{icon}</span>
                  {RECETTE_LABELS[r.recette]}
                  <span className="text-muted-foreground font-normal">({r.count} lot{r.count > 1 ? "s" : ""})</span>
                </span>
                <span className={cn("font-bold", colorClass)}>{formatRendement(rend)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-4 flex gap-3">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600 inline-block" /> ≥ 85 % — Excellent</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 70-84 % — Correct</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive inline-block" /> &lt; 70 % — À améliorer</span>
      </p>
    </div>
  );
};

export default ProductionRendementChart;
