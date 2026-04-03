/**
 * FinanceDepensesChart.jsx
 * Analyse des dépenses par motif — deux vues :
 *
 * Section 1 — Ranking horizontal : postes du plus gourmand au moins gourmand.
 * Section 2 — Linechart multi-séries : tendance par motif avec checkboxes.
 *
 * Props :
 *  motifData : { ranking: [{categorie, total, ratio}], chartData: [{label, …}] }
 *  isMobile  : boolean
 */

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Palette fixe ─────────────────────────────────────────────────────────────

const PALETTE = [
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#84cc16", // lime
  "#6366f1", // indigo
];

const getColor = (i) => PALETTE[i % PALETTE.length];

// ─── Section 1 : Ranking ─────────────────────────────────────────────────────

const RankingRow = ({ item, rank, maxTotal, color }) => {
  const pct      = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
  const ratioPct = Math.round(item.ratio * 100 * 10) / 10;

  return (
    <div className="flex flex-col gap-1 py-2.5 border-b border-border last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn(
            "shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center",
            rank <= 3
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
              : "bg-muted text-muted-foreground"
          )}>
            {rank}
          </span>
          <span className="text-sm font-medium truncate">{item.categorie}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 whitespace-nowrap">
            {Math.round(item.total).toLocaleString("fr-FR")} F
          </span>
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
            ratioPct >= 25
              ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
              : ratioPct >= 10
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
              : "bg-muted text-muted-foreground"
          )}>
            {ratioPct} %
          </span>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

// ─── Tooltip linechart ───────────────────────────────────────────────────────

const fmtK = (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));

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

// ─── Composant principal ─────────────────────────────────────────────────────

const FinanceDepensesChart = ({ motifData, isMobile = false }) => {
  const { ranking = [], chartData = [] } = motifData ?? {};

  // Activer tous les motifs par défaut ; resync quand l'horizon change
  const [activeMotifs, setActiveMotifs] = useState(() => new Set(ranking.map((r) => r.categorie)));

  const rankingKey = ranking.map((r) => r.categorie).join("|");
  useEffect(() => {
    setActiveMotifs(new Set(ranking.map((r) => r.categorie)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankingKey]);

  if (!ranking.length) return null;

  const maxTotal = ranking[0]?.total ?? 1;
  const h        = isMobile ? 210 : 260;

  const toggleMotif = (cat) => {
    setActiveMotifs((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat); // toujours au moins 1 visible
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">

      {/* ── Section 1 : Ranking ── */}
      <div className="bg-background rounded-xl border border-border p-4">
        <p className="text-sm font-semibold mb-1">Postes de dépenses</p>
        <p className="text-xs text-muted-foreground mb-4">
          Classement par montant total sur la période · ratio = part du total dépenses
        </p>
        {ranking.map((item, i) => (
          <RankingRow
            key={item.categorie}
            item={item}
            rank={i + 1}
            maxTotal={maxTotal}
            color={getColor(i)}
          />
        ))}
      </div>

      {/* ── Section 2 : Tendance ── */}
      {chartData.length >= 2 && (
        <div className="bg-background rounded-xl border border-border p-4">
          <p className="text-sm font-semibold mb-1">Tendance des dépenses par motif</p>
          <p className="text-xs text-muted-foreground mb-4">
            Cochez / décochez les motifs pour filtrer l'affichage
          </p>

          {/* Chips / checkboxes */}
          <div className="flex flex-wrap gap-2 mb-4">
            {ranking.map((item, i) => {
              const isActive = activeMotifs.has(item.categorie);
              return (
                <button
                  key={item.categorie}
                  onClick={() => toggleMotif(item.categorie)}
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
                  {item.categorie}
                </button>
              );
            })}
          </div>

          {/* Line chart */}
          <ResponsiveContainer width="100%" height={h}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={fmtK}
              />
              <Tooltip content={<CustomTooltip />} />
              {ranking.map((item, i) =>
                activeMotifs.has(item.categorie) ? (
                  <Line
                    key={item.categorie}
                    dataKey={item.categorie}
                    stroke={getColor(i)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name={item.categorie}
                    isAnimationActive={false}
                  />
                ) : null
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default FinanceDepensesChart;
