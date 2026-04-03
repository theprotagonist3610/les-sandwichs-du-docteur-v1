/**
 * ProductionInsightsKpi.jsx
 * 3 cartes KPI : Productions / Coût total / Rendement moyen
 *
 * Système deux couches :
 *  - Identité fixe : sky (volume) / red (coût) / emerald (rendement)
 *  - Badge sémantique : vert/bleu/rouge selon tendance + sens
 */

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { TENDANCES, TENDANCE_LABELS } from "@/utils/insightsToolkit/production/ProductionInsightsEngine";
import { HORIZONS } from "@/utils/insightsToolkit/engine/insightTypes";
import { cn } from "@/lib/utils";

// ─── Identités ────────────────────────────────────────────────────────────────

const IDENTITY = {
  volume: {
    bg:         "bg-sky-50 dark:bg-sky-950",
    border:     "border-l-4 border-l-sky-500 border-t border-r border-b border-border",
    valueColor: "text-sky-700 dark:text-sky-300",
    label:      "Productions",
    unit:       "prod.",
  },
  cout: {
    bg:         "bg-red-50 dark:bg-red-950",
    border:     "border-l-4 border-l-red-500 border-t border-r border-b border-border",
    valueColor: "text-red-700 dark:text-red-300",
    label:      "Coût total",
    unit:       "F",
  },
  rendement: {
    bg:         "bg-emerald-50 dark:bg-emerald-950",
    border:     "border-l-4 border-l-emerald-500 border-t border-r border-b border-border",
    valueColor: "text-emerald-700 dark:text-emerald-300",
    label:      "Rendement moyen",
    unit:       "%",
  },
};

// ─── Badge sémantique ─────────────────────────────────────────────────────────

const getBadge = (tendance, hausseBonne) => {
  const signal = hausseBonne ? tendance : (
    tendance === TENDANCES.HAUSSIERE ? TENDANCES.BAISSIERE :
    tendance === TENDANCES.BAISSIERE ? TENDANCES.HAUSSIERE :
    TENDANCES.CONSTANTE
  );
  const MAP = {
    [TENDANCES.HAUSSIERE]: { icon: TrendingUp,   cls: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
    [TENDANCES.CONSTANTE]: { icon: Minus,         cls: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"    },
    [TENDANCES.BAISSIERE]: { icon: TrendingDown,  cls: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"        },
  };
  return MAP[signal] ?? MAP[TENDANCES.CONSTANTE];
};

const PERIODE_LABEL = {
  [HORIZONS.H24]:  "/ jour",
  [HORIZONS.J7]:   "/ semaine",
  [HORIZONS.MOIS]: "/ mois",
};

// ─── Carte ───────────────────────────────────────────────────────────────────

const KpiCard = ({ widgetKey, serie, horizon, hausseBonne, overrideValue, overrideLabel }) => {
  const identity = IDENTITY[widgetKey];
  const tendance = serie?.tendance ?? TENDANCES.CONSTANTE;
  const badge    = getBadge(tendance, hausseBonne);
  const Icon     = badge.icon;

  const valeur  = overrideValue != null
    ? Math.round(overrideValue)
    : Math.round(serie?.moyenne ?? 0);

  const varPct  = serie ? Math.round(Math.abs(serie.variation) * 100) : 0;
  const varSign = (serie?.variation ?? 0) >= 0 ? "+" : "−";
  const forecast = serie?.forecast?.[0];

  const isF    = identity.unit === "F";
  const valStr = isF ? valeur.toLocaleString("fr-FR") : valeur.toLocaleString("fr-FR");

  return (
    <div className={cn("rounded-xl p-4 flex flex-col gap-3", identity.bg, identity.border)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {identity.label}
        </span>
        <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", badge.cls)}>
          <Icon className="w-3 h-3" />
          {TENDANCE_LABELS[tendance]}
        </span>
      </div>

      <div>
        <p className={cn("text-2xl font-bold tracking-tight", identity.valueColor)}>
          {valStr}
          <span className="text-sm font-normal ml-1">{identity.unit}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {overrideLabel ?? `Moyenne ${PERIODE_LABEL[horizon]}`}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/5 dark:border-white/10">
        <div className="text-xs text-muted-foreground">
          <span className={cn("font-semibold", identity.valueColor)}>
            {varSign}{varPct} %
          </span>
          {" "}vs début de période
        </div>
        {forecast && (
          <div className="text-right text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              ~{Math.round(forecast.moy).toLocaleString("fr-FR")} {identity.unit}
            </span>
            <br />
            <span className="text-xs">{forecast.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const ProductionInsightsKpi = ({ analysis, horizon }) => {
  if (!analysis) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <KpiCard widgetKey="volume"    serie={analysis.volume} horizon={horizon} hausseBonne={true}  />
      <KpiCard widgetKey="cout"      serie={analysis.cout}   horizon={horizon} hausseBonne={false} />
      <KpiCard
        widgetKey="rendement"
        serie={analysis.volume} /* tendance basée sur le volume, rendement est une valeur globale */
        horizon={horizon}
        hausseBonne={true}
        overrideValue={analysis.rendementMoyen}
        overrideLabel="Rendement global période"
      />
    </div>
  );
};

export default ProductionInsightsKpi;
