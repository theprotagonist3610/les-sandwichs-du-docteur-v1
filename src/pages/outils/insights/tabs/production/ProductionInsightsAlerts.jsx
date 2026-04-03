/**
 * ProductionInsightsAlerts.jsx
 * Alertes textuelles dérivées de l'analyse production.
 */

import { AlertTriangle, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const NIVEAU_CONFIG = {
  critique: {
    icon:   AlertTriangle,
    bg:     "bg-red-50 dark:bg-red-950",
    border: "border-red-200 dark:border-red-800",
    text:   "text-red-700 dark:text-red-300",
    iconCn: "text-red-500",
  },
  haute: {
    icon:   TrendingDown,
    bg:     "bg-orange-50 dark:bg-orange-950",
    border: "border-orange-200 dark:border-orange-800",
    text:   "text-orange-700 dark:text-orange-300",
    iconCn: "text-orange-500",
  },
  info: {
    icon:   Info,
    bg:     "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-200 dark:border-blue-800",
    text:   "text-blue-700 dark:text-blue-300",
    iconCn: "text-blue-400",
  },
};

const AlerteCard = ({ alerte }) => {
  const config = NIVEAU_CONFIG[alerte.niveau] ?? NIVEAU_CONFIG.info;
  const Icon   = config.icon;
  return (
    <div className={cn("rounded-xl border px-4 py-3 flex gap-3 items-start", config.bg, config.border)}>
      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", config.iconCn)} />
      <p className={cn("text-sm leading-relaxed", config.text)}>{alerte.message}</p>
    </div>
  );
};

const ProductionInsightsAlerts = ({ analysis }) => {
  const alertes = analysis?.alertes ?? [];
  if (!alertes.length) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Recommandations
      </p>
      {alertes.map((a) => (
        <AlerteCard key={a.id} alerte={a} />
      ))}
    </div>
  );
};

export default ProductionInsightsAlerts;
