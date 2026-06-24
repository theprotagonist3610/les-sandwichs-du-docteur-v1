import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const BrutalTimeline = ({ data, dataKey = "ca", label = "CA" }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground font-bold uppercase">
        Pas de données
      </div>
    );
  }

  const formatDate = (d) => {
    if (!d) return "";
    const parts = d.split("-");
    return `${parts[2]}/${parts[1]}`;
  };

  const formatValue = (v) => {
    if (v >= 1000) return `${Math.round(v / 1000)}k`;
    return v;
  };

  return (
    <div className="h-48 lg:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <defs>
            <pattern id="brutal-pattern" patternUnits="userSpaceOnUse" width="4" height="4">
              <path d="M 0 4 L 4 0" stroke="var(--foreground)" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}
            axisLine={{ stroke: "var(--foreground)", strokeWidth: 2 }}
            tickLine={{ stroke: "var(--foreground)", strokeWidth: 2 }}
          />
          <YAxis
            tickFormatter={formatValue}
            tick={{ fontSize: 10, fontWeight: 700 }}
            axisLine={{ stroke: "var(--foreground)", strokeWidth: 2 }}
            tickLine={{ stroke: "var(--foreground)", strokeWidth: 2 }}
            width={40}
          />
          <Tooltip
            contentStyle={{
              border: "3px solid var(--foreground)",
              borderRadius: "0px",
              boxShadow: "3px 3px 0px var(--foreground)",
              fontWeight: 700,
              fontSize: "12px",
              textTransform: "uppercase",
            }}
            formatter={(v) => [`${v.toLocaleString("fr-FR")} F`, label]}
            labelFormatter={formatDate}
          />
          <Area
            type="stepAfter"
            dataKey={dataKey}
            stroke="var(--primary)"
            strokeWidth={3}
            fill="url(#brutal-pattern)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BrutalTimeline;
