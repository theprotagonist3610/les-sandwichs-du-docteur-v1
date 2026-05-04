/**
 * ProductionInsightsKpi.jsx
 * 4 cartes KPI : productions, coût, revenu estimé, marge
 */

import { TrendingUp, TrendingDown, Minus, Factory, Wallet, ShoppingBag, TrendingUp as Profit } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMontant, formatRendement } from "@/utils/productionToolkit";
import { HORIZON_LABELS } from "@/utils/insightsToolkit/engine/insightTypes";

const PERIODE = {
  h24:  "/ jour",
  j7:   "/ semaine",
  mois: "/ mois",
};

const TendanceBadge = ({ tendance }) => {
  if (tendance === "hausse")
    return <span className="flex items-center gap-0.5 text-xs text-green-600 font-medium"><TrendingUp className="w-3 h-3" /> Hausse</span>;
  if (tendance === "baisse")
    return <span className="flex items-center gap-0.5 text-xs text-destructive font-medium"><TrendingDown className="w-3 h-3" /> Baisse</span>;
  return <span className="flex items-center gap-0.5 text-xs text-muted-foreground font-medium"><Minus className="w-3 h-3" /> Stable</span>;
};

const KpiCard = ({ icon: Icon, label, value, sub, tendance, color }) => (
  <div className="rounded-xl border bg-card p-4 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg" style={{ background: color + "20" }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      {tendance && <TendanceBadge tendance={tendance} />}
    </div>
    <div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  </div>
);

const ProductionInsightsKpi = ({ analysis, horizon }) => {
  const { totaux, tendanceVolume, tendanceCout, tendanceMarge } = analysis;
  const periode = PERIODE[horizon] ?? "";
  const margePositive = totaux.margeTotal >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        icon={Factory}
        label="Productions"
        value={totaux.count}
        sub={`lots ${periode}`}
        tendance={tendanceVolume}
        color="#6366f1"
      />
      <KpiCard
        icon={Wallet}
        label="Coût matières"
        value={formatMontant(totaux.coutTotal)}
        sub={`${periode}`}
        tendance={tendanceCout}
        color="#f59e0b"
      />
      <KpiCard
        icon={ShoppingBag}
        label="Revenu estimé"
        value={formatMontant(totaux.prixVenteTotal)}
        sub={`${periode}`}
        color="#0ea5e9"
      />
      <KpiCard
        icon={Profit}
        label="Marge estimée"
        value={formatMontant(totaux.margeTotal)}
        sub={formatRendement(totaux.rendementMoyen) + " rendement moy."}
        tendance={tendanceMarge}
        color={margePositive ? "#16a34a" : "#dc2626"}
      />
    </div>
  );
};

export default ProductionInsightsKpi;
