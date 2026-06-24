const BrutalBar = ({ label, value, max, suffix = "", color = "bg-primary", showValue = true }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const fmt = typeof value === "number" ? value.toLocaleString("fr-FR") : value;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold uppercase tracking-wide w-10 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-5 bg-muted border-2 border-foreground relative">
        <div className={`h-full ${color} transition-all duration-100`} style={{ width: `${pct}%` }} />
      </div>
      {showValue && (
        <span className="text-xs font-bold tabular-nums w-16 shrink-0">{fmt}{suffix}</span>
      )}
    </div>
  );
};

export default BrutalBar;
