/**
 * ProductionVolumeChart.jsx
 * Barres empilées : nombre de lots par recette par période
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { RECETTE_COLORS, RECETTE_LABELS } from "@/utils/productionToolkit";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded-xl border bg-card shadow-lg p-3 text-xs flex flex-col gap-1.5">
      <p className="font-semibold">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-medium">{p.value} lot{p.value > 1 ? "s" : ""}</span>
        </div>
      ))}
      <div className="border-t pt-1 flex justify-between font-semibold">
        <span>Total</span><span>{total}</span>
      </div>
    </div>
  );
};

const ProductionVolumeChart = ({ analysis, isMobile }) => {
  const data = analysis.charts?.volumes ?? [];
  if (!data.length) return null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold mb-1">Volume de production</h3>
      <p className="text-xs text-muted-foreground mb-4">Nombre de lots par recette</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barSize={isMobile ? 12 : 16}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="viande_count"  name={RECETTE_LABELS.viande}  stackId="a" fill={RECETTE_COLORS.viande}  radius={[0, 0, 0, 0]} />
          <Bar dataKey="poisson_count" name={RECETTE_LABELS.poisson} stackId="a" fill={RECETTE_COLORS.poisson} radius={[0, 0, 0, 0]} />
          <Bar dataKey="yaourt_count"  name={RECETTE_LABELS.yaourt}  stackId="a" fill={RECETTE_COLORS.yaourt}  radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProductionVolumeChart;
