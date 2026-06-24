import { TrendingUp, TrendingDown } from "lucide-react";
import NumberTicker from "@/shared/components/animations/NumberTicker";

const BrutalKPI = ({ value, label, suffix = "", prefix = "", tendance = null, accent = false }) => (
  <div className={`border-3 border-foreground p-3 lg:p-4 ${accent ? "bg-primary text-primary-foreground" : "bg-card"} shadow-[3px_3px_0px_var(--foreground)]`}>
    <p className="text-2xl lg:text-3xl font-extrabold tabular-nums leading-none">
      {prefix}
      <NumberTicker value={value} className="inline" />
      {suffix && <span className="text-base lg:text-lg ml-1 font-bold">{suffix}</span>}
    </p>
    <p className={`text-[10px] lg:text-xs font-bold uppercase tracking-wider mt-1.5 ${accent ? "opacity-80" : "text-muted-foreground"}`}>
      {label}
    </p>
    {tendance !== null && tendance !== undefined && (
      <div className={`inline-flex items-center gap-1 mt-2 px-1.5 py-0.5 border-2 border-foreground text-[10px] font-bold ${tendance >= 0 ? "bg-emerald-400 text-emerald-950" : "bg-red-400 text-red-950"}`}>
        {tendance >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
        {tendance >= 0 ? "+" : ""}{tendance}%
      </div>
    )}
  </div>
);

export default BrutalKPI;
