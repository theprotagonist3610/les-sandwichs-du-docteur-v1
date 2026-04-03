/**
 * CommandesVolumeChart.jsx
 * Graphique évolution volume + CA avec forecast.
 *
 * Dual-axis ComposedChart :
 *  - YAxis gauche  : volume (commandes)
 *  - YAxis droite  : CA (FCFA)
 *  - Bar           : volume historique
 *  - Line (dashed) : tendance volume
 *  - Line (solid)  : CA historique
 *  - Area band     : forecast volume (min/max)
 *  - ReferenceLine : séparation historique / forecast
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
} from "recharts";

// ─── Formateurs ───────────────────────────────────────────────────────────────

const fmtCA  = (v) => (v == null ? "—" : `${Math.round(v).toLocaleString("fr-FR")} F`);
const fmtVol = (v) => (v == null ? "—" : `${Math.round(v)} cmd`);
const fmtK   = (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));

// ─── Tooltip personnalisé ─────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const d           = payload[0]?.payload ?? {};
  const isForecast  = d.isForecast;
  const isCurrent   = d.isCurrent;

  const getVal = (name) => payload.find((p) => p.name === name)?.value;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs min-w-[170px]">
      <p className="font-semibold text-foreground mb-2">
        {label}
        {isCurrent  && <span className="ml-2 text-primary">(en cours)</span>}
        {isForecast && <span className="ml-2 text-muted-foreground">(prévision)</span>}
      </p>
      {isForecast ? (
        <>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Vol. min</span>
            <span className="font-medium">{fmtVol(getVal("volMin"))}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Vol. central</span>
            <span className="font-medium">{fmtVol(getVal("volMoy"))}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Vol. max</span>
            <span className="font-medium">{fmtVol(getVal("volMax"))}</span>
          </div>
          <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-border">
            <span className="text-muted-foreground">CA estimé</span>
            <span className="font-medium">{fmtCA(getVal("caMoy"))}</span>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Volume</span>
            <span className="font-medium">{fmtVol(getVal("volume"))}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">CA réalisé</span>
            <span className="font-medium">{fmtCA(getVal("ca"))}</span>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Composant ───────────────────────────────────────────────────────────────

const CommandesVolumeChart = ({ analysis, isMobile = false }) => {
  if (!analysis?.chartData?.length) return null;

  const { chartData } = analysis;
  const h = isMobile ? 180 : 220;

  const firstForecastIdx = chartData.findIndex((d) => d.isForecast);
  const refLabel = firstForecastIdx > 0 ? chartData[firstForecastIdx]?.label : null;

  // Domaine Y volume
  const allVol = chartData.flatMap((d) =>
    d.isForecast ? [d.volMin ?? 0, d.volMax ?? 0] : [d.volume ?? 0]
  ).filter((v) => !isNaN(v));
  const yVolMax = allVol.length ? Math.ceil(Math.max(...allVol) * 1.25) : 10;

  // Domaine Y CA
  const allCA = chartData.flatMap((d) =>
    d.isForecast ? [d.caMoy ?? 0] : [d.ca ?? 0]
  ).filter((v) => !isNaN(v));
  const yCAMax = allCA.length ? Math.ceil(Math.max(...allCA) * 1.25) : 1000;

  const COLOR_VOL = "#0ea5e9"; // sky-500
  const COLOR_CA  = "#22c55e"; // emerald-500

  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <p className="text-sm font-semibold mb-4">Volume & CA — historique & prévision</p>
      <ResponsiveContainer width="100%" height={h}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          {/* YAxis gauche : volume */}
          <YAxis
            yAxisId="vol"
            domain={[0, yVolMax]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={32}
            tickFormatter={(v) => Math.round(v)}
          />
          {/* YAxis droite : CA */}
          <YAxis
            yAxisId="ca"
            orientation="right"
            domain={[0, yCAMax]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={fmtK}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Zone forecast volume (min→max) */}
          <Area yAxisId="vol" dataKey="volMax" stroke="none" fill={COLOR_VOL} fillOpacity={0.15} name="volMax" legendType="none" />
          <Area yAxisId="vol" dataKey="volMin" stroke="none" fill="#ffffff" fillOpacity={1} name="volMin" legendType="none" />

          {/* Barres volume historiques */}
          <Bar
            yAxisId="vol"
            dataKey="volume"
            fill={COLOR_VOL}
            opacity={0.8}
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
            name="volume"
          />

          {/* Ligne tendance volume */}
          <Line
            yAxisId="vol"
            dataKey="volPred"
            stroke={COLOR_VOL}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            activeDot={false}
            name="volPred"
            legendType="none"
          />

          {/* Ligne centrale forecast volume */}
          <Line
            yAxisId="vol"
            dataKey="volMoy"
            stroke={COLOR_VOL}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 3, fill: COLOR_VOL, stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 4 }}
            name="volMoy"
            legendType="none"
          />

          {/* Ligne CA historique */}
          <Line
            yAxisId="ca"
            dataKey="ca"
            stroke={COLOR_CA}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            name="ca"
          />

          {/* Ligne forecast CA central */}
          <Line
            yAxisId="ca"
            dataKey="caMoy"
            stroke={COLOR_CA}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 3, fill: COLOR_CA, stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 4 }}
            name="caMoy"
            legendType="none"
          />

          {refLabel && (
            <ReferenceLine
              x={refLabel}
              yAxisId="vol"
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
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: COLOR_VOL, opacity: 0.8 }} />
          Volume (cmd)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 inline-block border-t-2" style={{ borderColor: COLOR_CA }} />
          CA (F)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: COLOR_VOL, opacity: 0.2 }} />
          Fourchette prévision vol.
        </span>
      </div>
    </div>
  );
};

export default CommandesVolumeChart;
