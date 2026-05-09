import { MapContainer, TileLayer, Marker, Circle, Tooltip, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, MapPinOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import useDistributionMap from "@/hooks/useDistributionMap";
import useBreakpoint from "@/hooks/useBreakpoint";

// Fix icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Constantes ───────────────────────────────────────────────────────────────

const DOUALA        = [4.0511, 9.7679];
const FILL_OPACITY  = 0.18;
const BORDER_WEIGHT = 2;

const PERIODES = [
  { id: "jour", label: "Aujourd'hui" },
  { id: "j7",   label: "7 jours"     },
  { id: "mois", label: "Ce mois"     },
];

const PALETTE = [
  { label: "Aucune vente",    color: "#3b82f6" },
  { label: "Faible  (<33 %)", color: "#eab308" },
  { label: "Moyen  (33–66 %)", color: "#f97316" },
  { label: "Élevé  (>66 %)",  color: "#22c55e" },
];

// ─── Utilitaires ──────────────────────────────────────────────────────────────

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

const couleurZone = (ca, maxCa) => {
  if (maxCa === 0 || ca === 0) return PALETTE[0].color;
  const pct = ca / maxCa;
  if (pct <= 0.33) return PALETTE[1].color;
  if (pct <= 0.66) return PALETTE[2].color;
  return PALETTE[3].color;
};

// ─── Marker bâtiment pour la base ────────────────────────────────────────────

const baseIcon = L.divIcon({
  html: `
    <div style="
      width:36px;height:36px;display:flex;align-items:center;justify-content:center;
      background:#a41624;border-radius:50%;border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);font-size:18px;line-height:1;
    ">🏢</div>`,
  className: "",
  iconSize:   [36, 36],
  iconAnchor: [18, 18],
  popupAnchor:[0, -20],
});

// ─── Légende overlay ──────────────────────────────────────────────────────────

const Legende = () => (
  <div
    className="absolute bottom-4 left-4 z-[1000] bg-background/90 backdrop-blur-sm
               border rounded-lg px-3 py-2.5 shadow-md"
    style={{ pointerEvents: "none" }}>
    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
      CA de la période
    </p>
    {PALETTE.map(({ label, color }) => (
      <div key={label} className="flex items-center gap-2 mb-1 last:mb-0">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-[11px] text-foreground">{label}</span>
      </div>
    ))}
    <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-border">
      <div style={{
        width:14, height:14, borderRadius:"50%", background:"#a41624",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:8, lineHeight:1,
        border:"2px solid white", boxShadow:"0 1px 3px rgba(0,0,0,0.3)",
      }}>🏢</div>
      <span className="text-[11px] text-foreground">Base (0.5 km)</span>
    </div>
  </div>
);

// ─── Popup contenu d'une zone ─────────────────────────────────────────────────

const PopupZone = ({ zone }) => {
  const s = zone.stats;
  return (
    <div style={{ minWidth: 180 }}>
      <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, borderBottom: "1px solid #e5e7eb", paddingBottom: 4 }}>
        {zone.nom}
      </p>
      {(zone.commune || zone.arrondissement) && (
        <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
          {[zone.commune, zone.arrondissement, zone.departement].filter(Boolean).join(" · ")}
        </p>
      )}
      <table style={{ fontSize: 12, width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ color: "#6b7280", paddingRight: 8, paddingBottom: 3 }}>CA période</td>
            <td style={{ fontWeight: 600, color: "#111827" }}>{fmt(s.ca)}</td>
          </tr>
          <tr>
            <td style={{ color: "#6b7280", paddingRight: 8, paddingBottom: 3 }}>Distributeurs</td>
            <td style={{ fontWeight: 600, color: "#111827" }}>{s.nb_distributeurs}</td>
          </tr>
          <tr>
            <td style={{ color: "#6b7280", paddingRight: 8, paddingBottom: 3 }}>Qté distribuée</td>
            <td style={{ fontWeight: 600, color: "#111827" }}>{s.qte_recue} u.</td>
          </tr>
          <tr>
            <td style={{ color: "#6b7280", paddingRight: 8 }}>Recouvrement</td>
            <td style={{ fontWeight: 600, color: s.taux_recouvrement >= 80 ? "#16a34a" : "#dc2626" }}>
              {s.taux_recouvrement} %
            </td>
          </tr>
        </tbody>
      </table>
      {zone.quartiers?.length > 0 && (
        <p style={{ fontSize: 11, color: "#6b7280", marginTop: 6, borderTop: "1px solid #e5e7eb", paddingTop: 4 }}>
          {zone.quartiers.join(", ")}
        </p>
      )}
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const DistributionLeafletMap = () => {
  const { isMobile } = useBreakpoint();
  const { base, zones, loading, periode, setPeriode, rafraichir } = useDistributionMap();

  const mapHeight = isMobile ? 340 : 520;

  const zonesPositionnees  = zones.filter((z) => z.centre?.lat != null && z.centre?.lng != null);
  const zonesSansPosition  = zones.filter((z) => !z.centre?.lat || !z.centre?.lng);

  const maxCa  = Math.max(...zonesPositionnees.map((z) => z.stats.ca), 0);
  const center = base ? [+base.lat, +base.lng] : DOUALA;

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

      {/* ── Carte ── */}
      {loading ? (
        <div
          className="rounded-xl bg-muted animate-pulse flex items-center justify-center text-xs text-muted-foreground"
          style={{ height: mapHeight }}>
          Chargement de la carte…
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border relative" style={{ height: mapHeight }}>
          <MapContainer
            center={center}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            zoomControl={!isMobile}
          >
            <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Marker base + cercle 0.5 km */}
            {base && (
              <>
                <Circle
                  center={center}
                  radius={500}
                  pathOptions={{
                    color: "#a41624",
                    fillColor: "#a41624",
                    fillOpacity: 0.07,
                    weight: 1.5,
                    dashArray: "6 4",
                  }}
                />
                <Marker position={center} icon={baseIcon}>
                  <Popup>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      🏢 {base.nom ?? "Base"}
                    </div>
                  </Popup>
                </Marker>
              </>
            )}

            {/* Cercles de zones */}
            {zonesPositionnees.map((zone) => {
              const pos    = [zone.centre.lat, zone.centre.lng];
              const radius = (zone.rayon ?? 1) * 1000; // km → m
              const color  = couleurZone(zone.stats.ca, maxCa);

              return (
                <Circle
                  key={zone.id}
                  center={pos}
                  radius={radius}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: FILL_OPACITY,
                    weight: BORDER_WEIGHT,
                  }}
                >
                  <Tooltip
                    permanent
                    direction="center"
                    className="distribution-zone-tooltip"
                    offset={[0, 0]}
                  >
                    <span style={{ fontWeight: 600, fontSize: 11 }}>{zone.nom}</span>
                    <br />
                    <span style={{ fontSize: 10, color: "#6b7280" }}>
                      {zone.stats.ca > 0 ? fmt(zone.stats.ca) : "Aucune vente"}
                    </span>
                  </Tooltip>
                  <Popup maxWidth={220}>
                    <PopupZone zone={zone} />
                  </Popup>
                </Circle>
              );
            })}
          </MapContainer>

          {/* Légende positionnée en overlay */}
          <Legende />
        </div>
      )}

      {/* ── Zones sans position géographique ── */}
      {zonesSansPosition.length > 0 && (
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <MapPinOff className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">
              {zonesSansPosition.length} zone{zonesSansPosition.length > 1 ? "s" : ""} sans position géographique
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {zonesSansPosition.map((z) => (
              <div
                key={z.id}
                className="flex items-center gap-1.5 text-xs bg-background border rounded-lg px-2.5 py-1.5">
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

export default DistributionLeafletMap;
