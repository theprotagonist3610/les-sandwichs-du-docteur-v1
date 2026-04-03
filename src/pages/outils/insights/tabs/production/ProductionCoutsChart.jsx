/**
 * ProductionCoutsChart.jsx
 * Tendance des coûts par schéma — linechart multi-séries interactif.
 *
 * Même principe que FinanceDepensesChart / CommandesMenusChart :
 *  - Une ligne colorée par schéma
 *  - Chips cliquables pour cocher / décocher les schémas
 *  - Resync quand l'horizon change
 */

import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

const PALETTE = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#84cc16", // lime
  "#6366f1", // indigo
];

const getColor = (i) => PALETTE[i % PALETTE.length];
const fmtK    = (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const entries = payload.filter((p) => (p.value ?? 0) > 0);
  if (!entries.length) return null;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs min-w-[190px] max-w-[240px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {entries
        .sort((a, b) => b.value - a.value)
        .map((p) => (
          <div key={p.name} className="flex justify-between gap-3 mb-0.5">
            <span className="flex items-center gap-1.5 text-muted-foreground truncate">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="truncate">{p.name}</span>
            </span>
            <span className="font-medium shrink-0">
              {Math.round(p.value).toLocaleString("fr-FR")} F
            </span>
          </div>
        ))}
    </div>
  );
};

const ProductionCoutsChart = ({ schemas = [], coutsChart = [], isMobile = false }) => {
  const [activeSchemas, setActiveSchemas] = useState(
    () => new Set(schemas.map((s) => s.nomSchema))
  );

  const schemasKey = schemas.map((s) => s.nomSchema).join("|");
  useEffect(() => {
    setActiveSchemas(new Set(schemas.map((s) => s.nomSchema)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemasKey]);

  if (!schemas.length || coutsChart.length < 2) return null;

  const h = isMobile ? 210 : 260;

  const toggle = (nom) => {
    setActiveSchemas((prev) => {
      const next = new Set(prev);
      if (next.has(nom)) {
        if (next.size > 1) next.delete(nom);
      } else {
        next.add(nom);
      }
      return next;
    });
  };

  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <p className="text-sm font-semibold mb-1">Tendance des coûts par schéma</p>
      <p className="text-xs text-muted-foreground mb-4">
        Cochez / décochez les schémas pour filtrer l'affichage
      </p>

      {/* Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {schemas.map((sc, i) => {
          const isActive = activeSchemas.has(sc.nomSchema);
          return (
            <button
              key={sc.nomSchema}
              onClick={() => toggle(sc.nomSchema)}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all",
                isActive
                  ? "border-transparent text-white"
                  : "border-border bg-muted/60 text-muted-foreground"
              )}
              style={isActive ? { backgroundColor: getColor(i) } : {}}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: isActive ? "#ffffff99" : getColor(i) }}
              />
              {sc.nomSchema}
            </button>
          );
        })}
      </div>

      {/* LineChart */}
      <ResponsiveContainer width="100%" height={h}>
        <LineChart data={coutsChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} tickFormatter={fmtK} />
          <Tooltip content={<CustomTooltip />} />
          {schemas.map((sc, i) =>
            activeSchemas.has(sc.nomSchema) ? (
              <Line
                key={sc.nomSchema}
                dataKey={sc.nomSchema}
                stroke={getColor(i)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                name={sc.nomSchema}
                isAnimationActive={false}
              />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProductionCoutsChart;
