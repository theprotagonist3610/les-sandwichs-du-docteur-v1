/**
 * ProductionSchemasChart.jsx
 * Ranking des schémas de production par coût total.
 *
 * Pour chaque schéma :
 *  - Barre progression (coût total relatif) — red
 *  - Montant total + badge % du total
 *  - Badge coût unitaire moyen
 *  - Badge rendement moyen coloré (vert/amber/rouge)
 *  - Nombre de fois produit
 */

import { cn } from "@/lib/utils";

const CATEGORIE_LABELS = {
  pain:       "Pain",
  sauce:      "Sauce",
  garniture:  "Garniture",
  boisson:    "Boisson",
  autre:      "Autre",
};

const getRendementCls = (r) => {
  if (r <= 0) return "bg-muted text-muted-foreground";
  if (r >= 95) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300";
  if (r >= 80) return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
};

const SchemaRow = ({ schema, rank, maxCout, totalCout }) => {
  const pct      = maxCout > 0 ? (schema.coutTotal / maxCout) * 100 : 0;
  const ratioPct = totalCout > 0 ? Math.round((schema.coutTotal / totalCout) * 100 * 10) / 10 : 0;
  const rendt    = Math.round(schema.rendementMoyen);
  const coutU    = Math.round(schema.coutUnitaireMoyen);

  return (
    <div className="flex flex-col gap-1.5 py-2.5 border-b border-border last:border-0">
      {/* Ligne 1 : rang + nom + badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn(
            "shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center",
            rank <= 3
              ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
              : "bg-muted text-muted-foreground"
          )}>
            {rank}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{schema.nomSchema}</p>
            <p className="text-[10px] text-muted-foreground">{CATEGORIE_LABELS[schema.categorie] ?? schema.categorie} · {schema.count} prod.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 justify-end shrink-0">
          <span className="text-xs font-semibold text-red-700 dark:text-red-300 whitespace-nowrap">
            {Math.round(schema.coutTotal).toLocaleString("fr-FR")} F
          </span>
          <span className={cn(
            "text-xs font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap",
            ratioPct >= 30 ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
              : ratioPct >= 15 ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
              : "bg-muted text-muted-foreground"
          )}>
            {ratioPct} %
          </span>
        </div>
      </div>

      {/* Barre progression */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all bg-red-400 dark:bg-red-600" style={{ width: `${pct}%` }} />
      </div>

      {/* Ligne 2 : métriques secondaires */}
      <div className="flex flex-wrap gap-1.5">
        {coutU > 0 && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap">
            {coutU.toLocaleString("fr-FR")} F/u
          </span>
        )}
        {rendt > 0 && (
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap", getRendementCls(rendt))}>
            Rendt {rendt} %
          </span>
        )}
        {schema.ecartCoutTotal > 0 && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 whitespace-nowrap">
            +{Math.round(schema.ecartCoutTotal).toLocaleString("fr-FR")} F dépassement
          </span>
        )}
      </div>
    </div>
  );
};

const ProductionSchemasChart = ({ schemas = [] }) => {
  if (!schemas.length) return null;

  const maxCout   = schemas[0]?.coutTotal ?? 1;
  const totalCout = schemas.reduce((s, sc) => s + sc.coutTotal, 0);

  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-sm font-semibold">Ranking des schémas — coût total</p>
        <span className="text-xs text-muted-foreground">{schemas.length} schéma{schemas.length > 1 ? "s" : ""}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Du plus coûteux au moins coûteux · ratio = part du coût global production
      </p>
      {schemas.map((sc, i) => (
        <SchemaRow key={sc.nomSchema} schema={sc} rank={i + 1} maxCout={maxCout} totalCout={totalCout} />
      ))}
    </div>
  );
};

export default ProductionSchemasChart;
