/**
 * CommandesJoursChart.jsx
 * Répartition des commandes par jour de semaine (lun → dim).
 *
 * BarChart vertical simple : volume par jour.
 * Tooltip : volume + CA.
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

const COLOR_DEFAULT = "#0ea5e9"; // sky-500
const COLOR_TOP     = "#f59e0b"; // amber-500 (jour fort)

// ─── Tooltip ─────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload ?? {};
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-foreground mb-2">{d.label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Commandes</span>
        <span className="font-medium">{d.volume}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">CA total</span>
        <span className="font-medium">{Math.round(d.ca ?? 0).toLocaleString("fr-FR")} F</span>
      </div>
    </div>
  );
};

// ─── Composant ───────────────────────────────────────────────────────────────

const CommandesJoursChart = ({ jours = [], isMobile = false }) => {
  if (!jours.length) return null;

  const maxVol = Math.max(...jours.map((j) => j.volume), 1);
  const yMax   = Math.ceil(maxVol * 1.25);
  const h      = isMobile ? 160 : 200;

  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <p className="text-sm font-semibold mb-1">Jours forts — volume par jour de semaine</p>
      <p className="text-xs text-muted-foreground mb-4">
        Agrégé sur toute la période sélectionnée
      </p>
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={jours} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, yMax]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={28}
            tickFormatter={(v) => Math.round(v)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="volume" radius={[4, 4, 0, 0]} maxBarSize={40} name="volume">
            {jours.map((entry) => (
              <Cell
                key={entry.label}
                fill={entry.volume === maxVol ? COLOR_TOP : COLOR_DEFAULT}
                opacity={entry.volume === maxVol ? 1 : 0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CommandesJoursChart;
