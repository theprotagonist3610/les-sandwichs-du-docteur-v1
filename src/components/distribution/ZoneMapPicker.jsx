import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Fix icônes Leaflet (même pattern que EmplacementsLeafletMap)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DOUALA_CENTER = [4.0511, 9.7679];

const MapClickHandler = ({ onClick }) => {
  useMapEvents({ click: (e) => onClick([e.latlng.lat, e.latlng.lng]) });
  return null;
};

const MapFlyTo = ({ target }) => {
  const map = useMap();
  useEffect(() => { if (target) map.flyTo(target, 15); }, [target, map]);
  return null;
};

const ZoneMapPicker = ({ open, onClose, onConfirm, initialCentre, rayon = 0 }) => {
  const [marker,   setMarker]   = useState(null);
  const [flyTo,    setFlyTo]    = useState(null);
  const [query,    setQuery]    = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    const init = initialCentre ? [initialCentre.lat, initialCentre.lng] : null;
    setMarker(init);
    setFlyTo(init);
    setQuery("");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { "Accept-Language": "fr", "User-Agent": "LSD-App/1.0" } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setMarker(coords);
        setFlyTo(coords);
      }
    } finally {
      setSearching(false);
    }
  };

  const radiusM = Number(rayon) * 1000;

  const handleConfirm = () => {
    if (!marker) return;
    onConfirm({ lat: marker[0], lng: marker[1] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden [&>button]:z-[1001]">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle>Choisir le centre de la zone</DialogTitle>
        </DialogHeader>

        {/* Barre de recherche */}
        <div className="px-4 pb-3 flex gap-2">
          <Input
            placeholder="Quartier, rue, adresse…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="outline" size="icon" onClick={handleSearch} disabled={searching}>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Carte */}
        <div style={{ height: 400 }}>
          <MapContainer
            center={DOUALA_CENTER}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onClick={(coords) => { setMarker(coords); setFlyTo(coords); }} />
            <MapFlyTo target={flyTo} />
            {marker && (
              <>
                <Marker position={marker} />
                {radiusM > 0 && (
                  <Circle
                    center={marker}
                    radius={radiusM}
                    pathOptions={{ color: "#a41624", fillColor: "#a41624", fillOpacity: 0.12 }}
                  />
                )}
              </>
            )}
          </MapContainer>
        </div>

        {/* Coordonnées */}
        <div className="px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground border-t bg-muted/30">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          {marker
            ? `Lat : ${marker[0].toFixed(5)}, Lng : ${marker[1].toFixed(5)}`
            : "Cliquez sur la carte pour poser le centre de la zone."}
        </div>

        <DialogFooter className="px-4 pb-4 pt-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleConfirm} disabled={!marker}>
            Confirmer ce centre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ZoneMapPicker;
