/**
 * ProductionMargeChart.jsx
 * Multi-lignes : évolution des marges estimées par recette
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatMontant, RECETTE_COLORS, RECETTE_LABELS } from "@/utils/productionToolkit";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-card shadow-lg p-3 text-xs flex flex-col gap-1.5">
      <p className="font-semibold">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className={`font-medium ${p.value < 0 ? "text-destructive" : "text-green-600"}`}>
            {p.value >= 0 ? "+" : ""}{formatMontant(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const ProductionMargeChart = ({ analysis, isMobile }) => {
  const data = analysis.charts?.marges ?? [];
  if (!data.length) return null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold mb-1">Évolution des marges</h3>
      <p className="text-xs text-muted-foreground mb-4">Marge estimée par recette (FCFA)</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v > 0 ? "+" : ""}${Math.round(v / 1000)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 2" strokeOpacity={0.6} />
          <Line type="monotone" dataKey="viande"  name={RECETTE_LABELS.viande}  stroke={RECETTE_COLORS.viande}  strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="poisson" name={RECETTE_LABELS.poisson} stroke={RECETTE_COLORS.poisson} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="yaourt"  name={RECETTE_LABELS.yaourt}  stroke={RECETTE_COLORS.yaourt}  strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProductionMargeChart;
