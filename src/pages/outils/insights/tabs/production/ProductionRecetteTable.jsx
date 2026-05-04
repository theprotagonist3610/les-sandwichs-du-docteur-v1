/**
 * ProductionRecetteTable.jsx
 * Tableau récapitulatif par recette : lots, coût, revenu, marge, rendement
 */

import { cn } from "@/lib/utils";
import {
  RECETTE_LABELS, RECETTE_COLORS, RECETTE_ICONS,
  formatMontant, formatRendement,
} from "@/utils/productionToolkit";

const ProductionRecetteTable = ({ analysis }) => {
  const parRecette = analysis?.parRecette ?? {};
  const total      = analysis?.totaux ?? {};

  const recettes = ["viande", "poisson", "yaourt"]
    .map((id) => ({ id, ...parRecette[id] }))
    .filter((r) => r.count > 0);

  if (!recettes.length) return null;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="p-4 pb-2">
        <h3 className="text-sm font-semibold">Récapitulatif par recette</h3>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr className="text-muted-foreground">
            <th className="py-2 px-4 text-left font-medium">Recette</th>
            <th className="py-2 px-4 text-right font-medium">Lots</th>
            <th className="py-2 px-4 text-right font-medium">Coût matières</th>
            <th className="py-2 px-4 text-right font-medium">Revenu estimé</th>
            <th className="py-2 px-4 text-right font-medium">Marge</th>
            <th className="py-2 px-4 text-right font-medium">Rendement</th>
          </tr>
        </thead>
        <tbody>
          {recettes.map((r) => {
            const color         = RECETTE_COLORS[r.id];
            const margePositive = r.margeTotal >= 0;
            const rend          = r.rendementMoyen;
            const rendColor     = rend >= 85 ? "text-green-600" : rend >= 70 ? "text-amber-600" : "text-destructive";

            return (
              <tr key={r.id} className="border-t hover:bg-muted/20 transition-colors">
                <td className="py-3 px-4">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                    <span>{RECETTE_ICONS[r.id]}</span>
                    {RECETTE_LABELS[r.id]}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">{r.count}</td>
                <td className="py-3 px-4 text-right">{formatMontant(r.coutTotal)}</td>
                <td className="py-3 px-4 text-right">{formatMontant(r.prixVenteTotal)}</td>
                <td className={cn("py-3 px-4 text-right font-semibold", margePositive ? "text-green-600" : "text-destructive")}>
                  {margePositive ? "+" : ""}{formatMontant(r.margeTotal)}
                </td>
                <td className={cn("py-3 px-4 text-right font-medium", rendColor)}>
                  {r.rendementMoyen > 0 ? formatRendement(r.rendementMoyen) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
        {recettes.length > 1 && (
          <tfoot className="bg-muted/30 border-t-2 font-semibold text-xs">
            <tr>
              <td className="py-2.5 px-4">Total</td>
              <td className="py-2.5 px-4 text-right">{total.count}</td>
              <td className="py-2.5 px-4 text-right">{formatMontant(total.coutTotal)}</td>
              <td className="py-2.5 px-4 text-right">{formatMontant(total.prixVenteTotal)}</td>
              <td className={cn("py-2.5 px-4 text-right", total.margeTotal >= 0 ? "text-green-600" : "text-destructive")}>
                {total.margeTotal >= 0 ? "+" : ""}{formatMontant(total.margeTotal)}
              </td>
              <td className="py-2.5 px-4 text-right">{formatRendement(total.rendementMoyen)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default ProductionRecetteTable;
