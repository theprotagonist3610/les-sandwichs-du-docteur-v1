/**
 * CommandesPdvChart.jsx
 * Ranking des points de vente par CA.
 *
 * Horizontal bar chart (layout="vertical") pour lire les noms.
 * Tooltip : volume + CA + ratio %.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Couleurs ─────────────────────────────────────────────────────────────────

const COLOR_DEFAULT = "#8b5cf6"; // violet-500
const COLOR_TOP     = "#7c3aed"; // violet-700

// ─── Formateurs ───────────────────────────────────────────────────────────────

const fmtK = (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));

// ─── Tooltip ─────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload ?? {};
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-foreground mb-2 truncate max-w-[180px]">{d.nom}</p>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Volume</span>
        <span className="font-medium">{d.volume} cmd</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">CA</span>
        <span className="font-medium">{Math.round(d.ca ?? 0).toLocaleString("fr-FR")} F</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Part du CA</span>
        <span className="font-medium">{Math.round((d.ratio ?? 0) * 100)} %</span>
      </div>
    </div>
  );
};

// ─── Composant ───────────────────────────────────────────────────────────────

const CommandesPdvChart = ({ pdv = [], isMobile = false }) => {
  if (!pdv.length) return null;

  // Max 8 PDV
  const data    = pdv.slice(0, 8);
  const maxCA   = data[0]?.ca ?? 1;
  const h       = Math.max(isMobile ? 150 : 180, data.length * 36 + 40);

  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <p className="text-sm font-semibold mb-1">Points de vente — CA généré</p>
      <p className="text-xs text-muted-foreground mb-4">
        Classement par chiffre d'affaires sur la période
      </p>
      <ResponsiveContainer width="100%" height={h}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, Math.ceil(maxCA * 1.15)]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmtK}
          />
          <YAxis
            type="category"
            dataKey="nom"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="ca" radius={[0, 4, 4, 0]} maxBarSize={28} name="ca">
            {data.map((entry, i) => (
              <Cell
                key={entry.nom}
                fill={i === 0 ? COLOR_TOP : COLOR_DEFAULT}
                opacity={i === 0 ? 1 : 0.7 - i * 0.05}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CommandesPdvChart;
