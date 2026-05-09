import { useState } from "react";
import { MapPin, MapPinOff, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import useDistributionMap from "@/hooks/useDistributionMap";
import useBreakpoint from "@/hooks/useBreakpoint";

// ─── Constantes ───────────────────────────────────────────────────────────────

const PERIODES = [
  { id: "jour", label: "Aujourd'hui" },
  { id: "j7",   label: "7 jours"    },
  { id: "mois", label: "Ce mois"    },
];

const PALETTE = [
  { label: "0 vente",  color: "#3b82f6" },
  { label: "Faible",   color: "#eab308" },
  { label: "Moyen",    color: "#f97316" },
  { label: "Élevé",    color: "#22c55e" },
];

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " F";

const couleur = (ca, maxCa) => {
  if (maxCa === 0 || ca === 0) return PALETTE[0].color;
  const pct = ca / maxCa;
  if (pct <= 0.33) return PALETTE[1].color;
  if (pct <= 0.66) return PALETTE[2].color;
  return PALETTE[3].color;
};

// ─── Projection géo → pixels ──────────────────────────────────────────────────

const buildBounds = (base, zonesPositionnees) => {
  const pts = [
    ...(base ? [{ lat: +base.lat, lng: +base.lng }] : []),
    ...zonesPositionnees.map((z) => ({ lat: z.centre.lat, lng: z.centre.lng })),
  ];
  if (pts.length === 0) return null;

  const maxRayonKm = Math.max(...zonesPositionnees.map((z) => z.rayon ?? 1), 1);
  const pad = maxRayonKm / 95; // degrés de marge autour des zones

  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  return {
    minLat: Math.min(...lats) - pad,
    maxLat: Math.max(...lats) + pad,
    minLng: Math.min(...lngs) - pad,
    maxLng: Math.max(...lngs) + pad,
  };
};

const getPos = (lat, lng, bounds, dim) => {
  const { width, height, padding } = dim;
  const x = padding + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 0.01)) * (width - 2 * padding);
  const y = height - padding - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat || 0.01)) * (height - 2 * padding);
  return { x, y };
};

const getRadiusPx = (rayonKm, bounds, dim) => {
  const latRange = bounds.maxLat - bounds.minLat || 0.01;
  const distDeg  = rayonKm / 111;
  return (distDeg / latRange) * (dim.height - 2 * dim.padding);
};

// ─── Carte de détail zone sélectionnée ───────────────────────────────────────

const ZoneDetail = ({ zone, onClose }) => {
  const s = zone.stats;
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{zone.nom}</p>
          {(zone.commune || zone.arrondissement) && (
            <p className="text-xs text-muted-foreground">
              {[zone.commune, zone.arrondissement, zone.departement].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "CA période",     value: fmt(s.ca)                           },
          { label: "Distributeurs",  value: `${s.nb_distributeurs}`             },
          { label: "Qté distribuée", value: `${s.qte_recue} u.`                },
          { label: "Recouvrement",   value: `${s.taux_recouvrement} %`,
            color: s.taux_recouvrement >= 80 ? "text-green-600" : "text-red-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={cn("text-sm font-semibold", color)}>{value}</p>
          </div>
        ))}
      </div>
      {zone.quartiers?.length > 0 && (
        <p className="text-xs text-muted-foreground border-t pt-2">
          {zone.quartiers.join(", ")}
        </p>
      )}
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const DistributionMapSVG = () => {
  const { isMobile } = useBreakpoint();
  const { base, zones, loading, periode, setPeriode, rafraichir } = useDistributionMap();
  const [selectedZone, setSelectedZone] = useState(null);

  const DIM = isMobile
    ? { width: 360, height: 370, padding: 28 }
    : { width: 900, height: 500, padding: 55 };

  const zonesPositionnees = zones.filter((z) => z.centre?.lat != null && z.centre?.lng != null);
  const zonesSansPosition = zones.filter((z) => !z.centre?.lat || !z.centre?.lng);
  const maxCa  = Math.max(...zonesPositionnees.map((z) => z.stats.ca), 0);
  const bounds = buildBounds(base, zonesPositionnees);

  const patternId = `dist-dots-${isMobile ? "m" : "d"}`;

  const LEGEND_X = DIM.width - (isMobile ? 80 : 105);
  const LEGEND_Y = 10;
  const LEGEND_ROW = isMobile ? 14 : 17;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Sélecteur de période ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {PERIODES.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriode(p.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0",
              periode === p.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}>
            {p.label}
          </button>
        ))}
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={rafraichir} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      {/* ── SVG ── */}
      {loading ? (
        <div
          className="rounded-xl bg-muted animate-pulse flex items-center justify-center text-xs text-muted-foreground"
          style={{ height: DIM.height }}>
          Chargement…
        </div>
      ) : !bounds ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-xl border bg-muted/30">
          <MapPin className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucune zone géolocalisée</p>
          <p className="text-xs text-muted-foreground">
            Ajoutez un centre géographique aux zones dans l'onglet Zones.
          </p>
        </div>
      ) : (
        <svg
          width="100%"
          height={DIM.height}
          viewBox={`0 0 ${DIM.width} ${DIM.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="border rounded-xl w-full">
          <defs>
            <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1.5" fill="currentColor" opacity="0.15" />
            </pattern>
            <style>{`
              @keyframes dist-pulse { 0%,100%{opacity:.2} 50%{opacity:.5} }
              .dist-pulse { animation: dist-pulse 2s infinite }
            `}</style>
          </defs>

          {/* Fond */}
          <rect width={DIM.width} height={DIM.height} rx="12" fill="var(--color-card, #fff)" />
          <rect width={DIM.width} height={DIM.height} rx="12" fill={`url(#${patternId})`} />

          {/* ── Cercles de zones ── */}
          {zonesPositionnees.map((zone) => {
            const { x, y } = getPos(zone.centre.lat, zone.centre.lng, bounds, DIM);
            const r        = Math.max(getRadiusPx(zone.rayon ?? 1, bounds, DIM), isMobile ? 18 : 22);
            const color    = couleur(zone.stats.ca, maxCa);
            const selected = selectedZone?.id === zone.id;
            const labelIn  = r > (isMobile ? 28 : 34);

            return (
              <g
                key={zone.id}
                onClick={() => setSelectedZone(selected ? null : zone)}
                style={{ cursor: "pointer" }}>

                {/* Cercle pulsant si sélectionné */}
                {selected && (
                  <circle
                    cx={x} cy={y} r={r + (isMobile ? 5 : 8)}
                    fill={color} opacity={0.12}
                    className="dist-pulse"
                  />
                )}

                {/* Cercle principal */}
                <circle
                  cx={x} cy={y} r={r}
                  fill={color}
                  fillOpacity={selected ? 0.30 : 0.18}
                  stroke={color}
                  strokeWidth={selected ? 3 : 2}
                />

                {/* Label nom */}
                <text
                  x={x}
                  y={labelIn ? y - (isMobile ? 6 : 7) : y - r - (isMobile ? 5 : 6)}
                  textAnchor="middle"
                  dominantBaseline={labelIn ? "auto" : "auto"}
                  fontSize={isMobile ? 9 : 11}
                  fontWeight="700"
                  fill={color}
                  style={{ paintOrder: "stroke", strokeWidth: "3px" }}
                  className="stroke-card">
                  {zone.nom}
                </text>

                {/* CA */}
                <text
                  x={x}
                  y={labelIn ? y + (isMobile ? 8 : 10) : y - r + (isMobile ? 6 : 8)}
                  textAnchor="middle"
                  fontSize={isMobile ? 8 : 9}
                  fill="#6b7280"
                  style={{ paintOrder: "stroke", strokeWidth: "3px" }}
                  className="stroke-card">
                  {zone.stats.ca > 0 ? fmt(zone.stats.ca) : "–"}
                </text>
              </g>
            );
          })}

          {/* ── Marker base ── */}
          {base && (() => {
            const { x, y } = getPos(+base.lat, +base.lng, bounds, DIM);
            const r = isMobile ? 10 : 13;
            return (
              <g>
                <circle cx={x} cy={y} r={r} fill="#a41624" />
                <text
                  x={x} y={y + 1.5}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize={isMobile ? 12 : 15}>
                  ★
                </text>
                <text
                  x={x} y={y + r + (isMobile ? 9 : 11)}
                  textAnchor="middle"
                  fontSize={isMobile ? 8 : 10}
                  fontWeight="700"
                  fill="#a41624"
                  style={{ paintOrder: "stroke", strokeWidth: "3px" }}
                  className="stroke-card">
                  Base
                </text>
              </g>
            );
          })()}

          {/* ── Légende (coin supérieur droit) ── */}
          <g transform={`translate(${LEGEND_X}, ${LEGEND_Y})`}>
            <rect
              x={-6} y={-4}
              width={isMobile ? 84 : 108}
              height={LEGEND_ROW * (PALETTE.length + 1) + 10}
              rx={6}
              fill="var(--color-card, #fff)"
              fillOpacity={0.85}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            {PALETTE.map(({ label, color }, i) => (
              <g key={label} transform={`translate(4, ${4 + i * LEGEND_ROW})`}>
                <circle cx={5} cy={5} r={5} fill={color} />
                <text x={14} y={9} fontSize={isMobile ? 8 : 9} fill="#6b7280">{label}</text>
              </g>
            ))}
            <g transform={`translate(4, ${4 + PALETTE.length * LEGEND_ROW + 2})`}>
              <rect x={0} y={0} width={isMobile ? 72 : 94} height={1} fill="#e5e7eb" />
              <circle cx={5} cy={10} r={5} fill="#a41624" />
              <text x={14} y={14} fontSize={isMobile ? 8 : 9} fill="#6b7280">Base</text>
            </g>
          </g>
        </svg>
      )}

      {/* ── Détail zone sélectionnée ── */}
      {selectedZone && (
        <ZoneDetail zone={selectedZone} onClose={() => setSelectedZone(null)} />
      )}

      {/* ── Zones sans position ── */}
      {zonesSansPosition.length > 0 && (
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <MapPinOff className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">
              {zonesSansPosition.length} zone{zonesSansPosition.length > 1 ? "s" : ""} sans position
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {zonesSansPosition.map((z) => (
              <div key={z.id} className="flex items-center gap-1.5 text-xs bg-background border rounded-lg px-2.5 py-1.5">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">{z.nom}</span>
                {z.stats.ca > 0 && (
                  <span className="text-muted-foreground">· {fmt(z.stats.ca)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DistributionMapSVG;
