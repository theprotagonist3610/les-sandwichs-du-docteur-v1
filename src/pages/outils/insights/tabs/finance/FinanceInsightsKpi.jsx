/**
 * FinanceInsightsKpi.jsx
 * 3 cartes KPI : Encaissements / Dépenses / Revenus nets
 *
 * Système de couleurs en deux couches :
 *  - Couleur identité fixe par widget (emerald / amber / violet)
 *  - Badge sémantique de tendance (vert/bleu/rouge selon si hausse est bonne ou mauvaise)
 */

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { TENDANCES, TENDANCE_LABELS } from "@/utils/insightsToolkit/finance/FinanceInsightsEngine";
import { HORIZONS } from "@/utils/insightsToolkit/engine/insightTypes";
import { cn } from "@/lib/utils";

// ─── Couleurs identité (fixes, par widget) ────────────────────────────────────

const IDENTITY = {
  encaissements: {
    bg:          "bg-emerald-50 dark:bg-emerald-950",
    border:      "border-l-4 border-l-emerald-500 border-t border-r border-b border-border",
    valueColor:  "text-emerald-700 dark:text-emerald-300",
    label:       "Encaissements",
  },
  depenses: {
    bg:          "bg-amber-50 dark:bg-amber-950",
    border:      "border-l-4 border-l-amber-500 border-t border-r border-b border-border",
    valueColor:  "text-amber-700 dark:text-amber-300",
    label:       "Dépenses",
  },
  revenus: {
    bg:          "bg-violet-50 dark:bg-violet-950",
    border:      "border-l-4 border-l-violet-500 border-t border-r border-b border-border",
    valueColor:  "text-violet-700 dark:text-violet-300",
    label:       "Revenus nets",
  },
};

// ─── Badges sémantiques de tendance ──────────────────────────────────────────
// hausseBonne : true  → hausse=vert, baisse=rouge (encaissements, revenus)
// hausseBonne : false → hausse=rouge, baisse=vert (dépenses)

const getBadgeConfig = (tendance, hausseBonne) => {
  const signal = hausseBonne ? tendance : (
    tendance === TENDANCES.HAUSSIERE ? TENDANCES.BAISSIERE :
    tendance === TENDANCES.BAISSIERE ? TENDANCES.HAUSSIERE :
    TENDANCES.CONSTANTE
  );

  const BADGE = {
    [TENDANCES.HAUSSIERE]: {
      icon:  TrendingUp,
      badge: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    },
    [TENDANCES.CONSTANTE]: {
      icon:  Minus,
      badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    },
    [TENDANCES.BAISSIERE]: {
      icon:  TrendingDown,
      badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    },
  };

  return BADGE[signal] ?? BADGE[TENDANCES.CONSTANTE];
};

// ─── Labels période ───────────────────────────────────────────────────────────

const PERIODE_LABEL = {
  [HORIZONS.H24]:  "/ jour",
  [HORIZONS.J7]:   "/ semaine",
  [HORIZONS.MOIS]: "/ mois",
};

// ─── Carte individuelle ───────────────────────────────────────────────────────

const KpiCard = ({ widgetKey, serie, horizon, hausseBonne }) => {
  const identity = IDENTITY[widgetKey];
  const tendance = serie?.tendance ?? TENDANCES.CONSTANTE;
  const badge    = getBadgeConfig(tendance, hausseBonne);
  const Icon     = badge.icon;

  const moy      = serie ? Math.round(serie.moyenne) : 0;
  const varPct   = serie ? Math.round(Math.abs(serie.variation) * 100) : 0;
  const varSign  = (serie?.variation ?? 0) >= 0 ? "+" : "−";
  const forecast = serie?.forecast?.[0];

  return (
    <div className={cn("rounded-xl p-4 flex flex-col gap-3", identity.bg, identity.border)}>

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {identity.label}
        </span>
        <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", badge.badge)}>
          <Icon className="w-3 h-3" />
          {TENDANCE_LABELS[tendance]}
        </span>
      </div>

      {/* Valeur principale */}
      <div>
        <p className={cn("text-2xl font-bold tracking-tight", identity.valueColor)}>
          {moy.toLocaleString("fr-FR")}
          <span className="text-sm font-normal ml-1">F</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Moyenne {PERIODE_LABEL[horizon]}
        </p>
      </div>

      {/* Variation & Forecast */}
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
              ~{Math.round(forecast.moy).toLocaleString("fr-FR")} F
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

const FinanceInsightsKpi = ({ analysis, horizon }) => {
  if (!analysis) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <KpiCard widgetKey="encaissements" serie={analysis.encaissements} horizon={horizon} hausseBonne={true}  />
      <KpiCard widgetKey="depenses"      serie={analysis.depenses}      horizon={horizon} hausseBonne={false} />
      <KpiCard widgetKey="revenus"       serie={analysis.revenus}       horizon={horizon} hausseBonne={true}  />
    </div>
  );
};

export default FinanceInsightsKpi;
