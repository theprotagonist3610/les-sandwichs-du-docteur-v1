/**
 * ProductionVolumeChart.jsx
 * Évolution du volume de productions + coût total — dual axis.
 *
 * YAxis gauche  : count (productions) — sky
 * YAxis droite  : coutTotal (F)       — red
 * Bar           : count historique
 * Line dashed   : tendance count
 * Area band     : forecast count (min/max)
 * Line          : coutTotal historique
 * ReferenceLine : séparation historique / forecast
 */

import {
  ComposedChart, Bar, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

const fmtK = (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d          = payload[0]?.payload ?? {};
  const isForecast = d.isForecast;
  const isCurrent  = d.isCurrent;
  const getVal     = (name) => payload.find((p) => p.name === name)?.value;

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
            <span className="text-muted-foreground">Prod. min</span>
            <span className="font-medium">{Math.round(getVal("countMin") ?? 0)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Prod. central</span>
            <span className="font-medium">{Math.round(getVal("countMoy") ?? 0)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Prod. max</span>
            <span className="font-medium">{Math.round(getVal("countMax") ?? 0)}</span>
          </div>
          <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-border">
            <span className="text-muted-foreground">Coût estimé</span>
            <span className="font-medium">{Math.round(getVal("coutMoy") ?? 0).toLocaleString("fr-FR")} F</span>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Productions</span>
            <span className="font-medium">{Math.round(getVal("count") ?? 0)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Coût total</span>
            <span className="font-medium">{Math.round(getVal("coutTotal") ?? 0).toLocaleString("fr-FR")} F</span>
          </div>
        </>
      )}
    </div>
  );
};

const ProductionVolumeChart = ({ analysis, isMobile = false }) => {
  if (!analysis?.chartData?.length) return null;

  const { chartData, previousPeriodes } = analysis;
  const h = isMobile ? 180 : 220;

  const firstForecastIdx = chartData.findIndex((d) => d.isForecast);
  const refLabel = firstForecastIdx > 0 ? chartData[firstForecastIdx]?.label : null;

  // Fusionner données période précédente par position
  const mergedData = previousPeriodes
    ? chartData.map((point, i) => ({
        ...point,
        count_prev:     !point.isForecast ? (previousPeriodes[i]?.count     ?? null) : null,
        coutTotal_prev: !point.isForecast ? (previousPeriodes[i]?.coutTotal ?? null) : null,
      }))
    : chartData;

  const allCount = mergedData.flatMap((d) =>
    d.isForecast ? [d.countMin ?? 0, d.countMax ?? 0] : [d.count ?? 0, d.count_prev ?? 0]
  ).filter((v) => !isNaN(v));
  const yCountMax = allCount.length ? Math.ceil(Math.max(...allCount) * 1.3) : 10;

  const allCout = mergedData.flatMap((d) =>
    d.isForecast ? [d.coutMoy ?? 0] : [d.coutTotal ?? 0, d.coutTotal_prev ?? 0]
  ).filter((v) => !isNaN(v));
  const yCoutMax = allCout.length ? Math.ceil(Math.max(...allCout) * 1.25) : 1000;

  const COLOR_VOL  = "#0ea5e9"; // sky-500
  const COLOR_COUT = "#ef4444"; // red-500

  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <p className="text-sm font-semibold mb-4">Volume & Coût — historique & prévision</p>
      <ResponsiveContainer width="100%" height={h}>
        <ComposedChart data={mergedData} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="vol"  domain={[0, yCountMax]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} tickFormatter={(v) => Math.round(v)} />
          <YAxis yAxisId="cout" orientation="right" domain={[0, yCoutMax]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={42} tickFormatter={fmtK} />
          <Tooltip content={<CustomTooltip />} />

          {/* Zone forecast count */}
          <Area yAxisId="vol" dataKey="countMax" stroke="none" fill={COLOR_VOL} fillOpacity={0.15} name="countMax" legendType="none" />
          <Area yAxisId="vol" dataKey="countMin" stroke="none" fill="#ffffff" fillOpacity={1} name="countMin" legendType="none" />

          {/* Barres count */}
          <Bar yAxisId="vol" dataKey="count" fill={COLOR_VOL} opacity={0.8} radius={[3, 3, 0, 0]} maxBarSize={28} name="count" />

          {/* Tendance count */}
          <Line yAxisId="vol" dataKey="countPred" stroke={COLOR_VOL} strokeWidth={1.5} strokeDasharray="4 3" dot={false} activeDot={false} name="countPred" legendType="none" />

          {/* Forecast count central */}
          <Line yAxisId="vol" dataKey="countMoy" stroke={COLOR_VOL} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: COLOR_VOL, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 4 }} name="countMoy" legendType="none" />

          {/* Ligne coût total */}
          <Line yAxisId="cout" dataKey="coutTotal" stroke={COLOR_COUT} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="coutTotal" />

          {/* Forecast coût central */}
          <Line yAxisId="cout" dataKey="coutMoy" stroke={COLOR_COUT} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: COLOR_COUT, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 4 }} name="coutMoy" legendType="none" />

          {/* Lignes période précédente */}
          {previousPeriodes && (
            <>
              <Line yAxisId="vol" dataKey="count_prev" stroke={COLOR_VOL} strokeWidth={1.5} strokeDasharray="3 4" strokeOpacity={0.45} dot={false} activeDot={{ r: 3 }} name="Vol. préc." />
              <Line yAxisId="cout" dataKey="coutTotal_prev" stroke={COLOR_COUT} strokeWidth={1.5} strokeDasharray="3 4" strokeOpacity={0.45} dot={false} activeDot={{ r: 3 }} name="Coût préc." />
            </>
          )}

          {refLabel && (
            <ReferenceLine x={refLabel} yAxisId="vol" stroke="#94a3b8" strokeDasharray="3 3"
              label={{ value: "Prévision →", position: "insideTopRight", fontSize: 10, fill: "#94a3b8" }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: COLOR_VOL, opacity: 0.8 }} />
          Volume (prod.)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 inline-block border-t-2" style={{ borderColor: COLOR_COUT }} />
          Coût total (F)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: COLOR_VOL, opacity: 0.2 }} />
          Fourchette prévision
        </span>
        {previousPeriodes && (
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 inline-block border-t-2 border-dashed opacity-45" style={{ borderColor: COLOR_VOL }} />
            Période précédente
          </span>
        )}
      </div>
    </div>
  );
};

export default ProductionVolumeChart;
