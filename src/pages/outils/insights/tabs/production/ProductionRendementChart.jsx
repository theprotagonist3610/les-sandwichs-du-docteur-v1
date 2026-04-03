/**
 * ProductionRendementChart.jsx
 * Taux de rendement moyen par schéma — barres horizontales.
 *
 * Triés du meilleur au moins bon rendement.
 * Ligne de référence à 100 % (objectif).
 * Couleur : vert ≥ 95 %, amber 80–94 %, rouge < 80 %.
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from "recharts";

const getColor = (r) => {
  if (r >= 95) return "#10b981"; // emerald
  if (r >= 80) return "#f59e0b"; // amber
  return "#ef4444";              // red
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload ?? {};
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs min-w-[180px]">
      <p className="font-semibold text-foreground mb-2 truncate">{d.nomSchema}</p>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Rendement moyen</span>
        <span className="font-medium">{Math.round(d.rendementMoyen)} %</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Productions</span>
        <span className="font-medium">{d.count}</span>
      </div>
    </div>
  );
};

const ProductionRendementChart = ({ schemas = [], isMobile = false }) => {
  const data = schemas
    .filter((s) => s.rendementMoyen > 0)
    .map((s) => ({ ...s, rendementMoyen: Math.round(s.rendementMoyen * 10) / 10 }))
    .sort((a, b) => b.rendementMoyen - a.rendementMoyen);

  if (!data.length) return null;

  const h = Math.max(isMobile ? 140 : 180, data.length * 38 + 40);

  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <p className="text-sm font-semibold mb-1">Rendement par schéma</p>
      <p className="text-xs text-muted-foreground mb-4">
        Objectif : 100 % · vert ≥ 95 % · amber 80–94 % · rouge &lt; 80 %
      </p>
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, Math.max(110, Math.ceil(Math.max(...data.map((d) => d.rendementMoyen)) * 1.05))]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v} %`}
          />
          <YAxis
            type="category"
            dataKey="nomSchema"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            x={100}
            stroke="#94a3b8"
            strokeDasharray="4 3"
            label={{ value: "Objectif", position: "right", fontSize: 10, fill: "#94a3b8" }}
          />
          <Bar dataKey="rendementMoyen" radius={[0, 4, 4, 0]} maxBarSize={26} name="rendementMoyen">
            {data.map((entry) => (
              <Cell key={entry.nomSchema} fill={getColor(entry.rendementMoyen)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProductionRendementChart;
