/**
 * FinanceInsightsChart.jsx
 * Graphique historique + zone de forecast pour une série (enc ou dep).
 *
 * Structure chartData (depuis FinanceInsightsEngine.buildChartData) :
 *  Historique : { label, enc, dep, encPred, depPred, isForecast: false, isCurrent }
 *  Forecast   : { label, encMin, encMoy, encMax, depMin, depMoy, depMax, isForecast: true }
 *
 * On produit 2 graphiques distincts : un pour enc, un pour dep.
 */

import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ─── Formateur de valeur ──────────────────────────────────────────────────────

const fmt = (v) => (v == null ? "—" : `${Math.round(v).toLocaleString("fr-FR")} F`);

// ─── Tooltip personnalisé ─────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label, type }) => {
  if (!active || !payload?.length) return null;

  const isForecast = payload[0]?.payload?.isForecast;
  const isCurrent  = payload[0]?.payload?.isCurrent;

  const getVal = (name) => payload.find((p) => p.name === name)?.value;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-foreground mb-2">
        {label}
        {isCurrent  && <span className="ml-2 text-primary">(en cours)</span>}
        {isForecast && <span className="ml-2 text-muted-foreground">(prévision)</span>}
      </p>
      {isForecast ? (
        <>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Min</span>
            <span className="font-medium">{fmt(getVal(type === "enc" ? "encMin" : "depMin"))}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Central</span>
            <span className="font-medium">{fmt(getVal(type === "enc" ? "encMoy" : "depMoy"))}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Max</span>
            <span className="font-medium">{fmt(getVal(type === "enc" ? "encMax" : "depMax"))}</span>
          </div>
        </>
      ) : (
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Réalisé</span>
          <span className="font-medium">{fmt(getVal(type === "enc" ? "enc" : "dep"))}</span>
        </div>
      )}
    </div>
  );
};

// ─── Graphique unique (enc ou dep) ────────────────────────────────────────────

/**
 * @param {{ chartData, type: "enc"|"dep", title, color, height }}
 */
const SingleChart = ({ chartData, type, title, color, height = 220 }) => {
  // Trouver l'index du premier point forecast pour la ReferenceLine
  const firstForecastIdx = chartData.findIndex((d) => d.isForecast);
  const refLabel = firstForecastIdx > 0 ? chartData[firstForecastIdx]?.label : null;

  const barKey  = type;                                          // "enc" ou "dep"
  const minKey  = type === "enc" ? "encMin"  : "depMin";
  const moyKey  = type === "enc" ? "encMoy"  : "depMoy";
  const maxKey  = type === "enc" ? "encMax"  : "depMax";
  const predKey = type === "enc" ? "encPred" : "depPred";

  // Calcul du domaine Y pour éviter les barres écrasées
  const allVals = chartData.flatMap((d) =>
    d.isForecast
      ? [d[minKey] ?? 0, d[maxKey] ?? 0]
      : [d[barKey] ?? 0]
  ).filter((v) => v != null && !isNaN(v));
  const yMax = allVals.length ? Math.ceil(Math.max(...allVals) * 1.15) : 100;

  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <p className="text-sm font-semibold mb-4">{title}</p>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            width={40}
          />
          <Tooltip content={<CustomTooltip type={type} />} />

          {/* Barres historiques réelles */}
          <Bar
            dataKey={barKey}
            fill={color}
            opacity={0.85}
            radius={[3, 3, 0, 0]}
            maxBarSize={32}
            name={barKey}
          />

          {/* Ligne tendance (régression) */}
          <Line
            dataKey={predKey}
            stroke={color}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            activeDot={false}
            name="tendance"
          />

          {/* Zone forecast min → max */}
          <Area
            dataKey={maxKey}
            stroke="none"
            fill={color}
            fillOpacity={0.15}
            name={maxKey}
            legendType="none"
          />
          <Area
            dataKey={minKey}
            stroke="none"
            fill="#ffffff"
            fillOpacity={1}
            name={minKey}
            legendType="none"
          />

          {/* Ligne centrale prévision */}
          <Line
            dataKey={moyKey}
            stroke={color}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 4, fill: color, stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 5 }}
            name={moyKey}
            legendType="none"
          />

          {/* Ligne de séparation historique / forecast */}
          {refLabel && (
            <ReferenceLine
              x={refLabel}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              label={{ value: "Prévision →", position: "insideTopRight", fontSize: 10, fill: "#94a3b8" }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Légende manuelle */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color, opacity: 0.85 }} />
          Réalisé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 inline-block border-t-2 border-dashed" style={{ borderColor: color }} />
          Tendance
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color, opacity: 0.2 }} />
          Fourchette prévision
        </span>
      </div>
    </div>
  );
};

// ─── Composant principal (2 graphiques) ──────────────────────────────────────

const FinanceInsightsChart = ({ analysis, isMobile = false }) => {
  if (!analysis?.chartData?.length) return null;

  const { chartData } = analysis;
  const h = isMobile ? 180 : 220;

  return (
    <div className="flex flex-col gap-4">
      <SingleChart
        chartData={chartData}
        type="enc"
        title="Encaissements — historique & prévision"
        color="#22c55e"
        height={h}
      />
      <SingleChart
        chartData={chartData}
        type="dep"
        title="Dépenses — historique & prévision"
        color="#ef4444"
        height={h}
      />
    </div>
  );
};

export default FinanceInsightsChart;
