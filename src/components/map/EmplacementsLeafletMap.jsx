import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Warehouse,
  Store,
  ShoppingCart,
  Building2,
  MapPin,
  User,
  MapPinOff,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import emplacementToolkit from "@/utils/emplacementToolkit";
import { toast } from "sonner";

// Fix pour les icônes Leaflet par défaut
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Composant pour centrer automatiquement la carte
const MapBounds = ({ emplacements }) => {
  const map = useMap();

  useEffect(() => {
    if (emplacements.length > 0) {
      const bounds = L.latLngBounds(
        emplacements.map((e) => [+e.lat, +e.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [emplacements, map]);

  return null;
};

const EmplacementsLeafletMap = ({ isMobile = false, onEdit }) => {
  const [emplacements, setEmplacements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("tout");
  const [showUserPosition, setShowUserPosition] = useState(false);
  const [userPosition, setUserPosition] = useState(null);
  const [showUnlocatedList, setShowUnlocatedList] = useState(false);
  const [showDistanceCircles, setShowDistanceCircles] = useState(true);

  useEffect(() => {
    loadEmplacements();
  }, []);

  // Géolocalisation de l'utilisateur
  useEffect(() => {
    if (showUserPosition && !userPosition) {
      if ("geolocation" in navigator) {
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            setUserPosition({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            console.error("Erreur de géolocalisation:", error);
            toast.error("Erreur", {
              description: "Impossible d'obtenir votre position",
            });
            setShowUserPosition(false);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
      } else {
        toast.error("Erreur", {
          description: "La géolocalisation n'est pas supportée",
        });
        setShowUserPosition(false);
      }
    }
  }, [showUserPosition, userPosition]);

  const loadEmplacements = async () => {
    console.group("🗺️ EmplacementsLeafletMap - loadEmplacements");
    setIsLoading(true);

    const { emplacements: data, error } =
      await emplacementToolkit.getEmplacementsForMap();

    console.log("📥 Résultat de getEmplacementsForMap:", {
      data,
      error,
      count: data?.length || 0,
    });

    if (error) {
      console.error("❌ Erreur lors du chargement:", error);
      toast.error("Erreur", {
        description: "Impossible de charger la carte",
      });
    } else {
      console.log("✅ Emplacements chargés:", data);
      setEmplacements(data || []);
    }

    setIsLoading(false);
    console.groupEnd();
  };

  // Calculer la distance en km entre deux coordonnées GPS (formule de Haversine)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getTypeIcon = (type) =>
    ({
      base: Warehouse,
      stand: Store,
      kiosque: ShoppingCart,
      boutique: Building2,
    }[type] || Store);

  const getTypeColor = (type, statut) => {
    if (statut === "ferme_temporairement") return "#d1d5db";

    return (
      {
        base: "#3b82f6",
        stand: "#22c55e",
        kiosque: "#eab308",
        boutique: "#a855f7",
      }[type] || "#d1d5db"
    );
  };

  const shouldShowMarker = (empType) => {
    return selectedTypeFilter === "tout" || selectedTypeFilter === empType;
  };

  // Créer des icônes personnalisées pour chaque type
  const createCustomIcon = (type, statut) => {
    const color = getTypeColor(type, statut);
    const svgIcon = `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="12" fill="${color}" opacity="0.7" stroke="white" stroke-width="2"/>
      </svg>
    `;

    return L.divIcon({
      html: svgIcon,
      className: "custom-marker-icon",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  };

  // Séparer les emplacements situés et non situés
  const locatedEmplacements = emplacements.filter((e) => e.lat && e.lng);
  const unlocatedEmplacements = emplacements.filter((e) => !e.lat || !e.lng);
  const base = emplacements.find((e) => e.type === "base");

  if (isLoading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Chargement de la carte...
      </div>
    );
  }

  const mapHeight = isMobile ? "400px" : "600px";

  return (
    <div className="space-y-6">
      {/* Légende interactive */}
      <Card>
        <CardContent className={isMobile ? "pt-4" : "pt-6"}>
          <div className={`flex flex-wrap ${isMobile ? "gap-2" : "gap-4"}`}>
            <button
              onClick={() => setSelectedTypeFilter("tout")}
              className={`flex items-center ${isMobile ? "gap-1.5 px-2.5 py-1.5 text-xs" : "gap-2 px-3 py-2"} rounded-lg transition-colors ${
                selectedTypeFilter === "tout"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <MapPin className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
              <span className="font-medium">Tout</span>
            </button>
            <button
              onClick={() => setSelectedTypeFilter("base")}
              className={`flex items-center ${isMobile ? "gap-1.5 px-2.5 py-1.5 text-xs" : "gap-2 px-3 py-2"} rounded-lg transition-colors ${
                selectedTypeFilter === "base"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <Warehouse className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
              <span className="font-medium">Base</span>
            </button>
            <button
              onClick={() => setSelectedTypeFilter("stand")}
              className={`flex items-center ${isMobile ? "gap-1.5 px-2.5 py-1.5 text-xs" : "gap-2 px-3 py-2"} rounded-lg transition-colors ${
                selectedTypeFilter === "stand"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <Store className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
              <span className="font-medium">Stand</span>
            </button>
            <button
              onClick={() => setSelectedTypeFilter("kiosque")}
              className={`flex items-center ${isMobile ? "gap-1.5 px-2.5 py-1.5 text-xs" : "gap-2 px-3 py-2"} rounded-lg transition-colors ${
                selectedTypeFilter === "kiosque"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <ShoppingCart className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
              <span className="font-medium">Kiosque</span>
            </button>
            <button
              onClick={() => setSelectedTypeFilter("boutique")}
              className={`flex items-center ${isMobile ? "gap-1.5 px-2.5 py-1.5 text-xs" : "gap-2 px-3 py-2"} rounded-lg transition-colors ${
                selectedTypeFilter === "boutique"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <Building2 className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
              <span className="font-medium">Boutique</span>
            </button>
          </div>

          {/* Options supplémentaires */}
          <div className={`flex flex-col ${isMobile ? "gap-2 mt-3" : "gap-3 mt-4"} border-t pt-3`}>
            {/* Votre position */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="user-position-leaflet"
                checked={showUserPosition}
                onCheckedChange={setShowUserPosition}
              />
              <Label
                htmlFor="user-position-leaflet"
                className={`flex items-center ${isMobile ? "gap-1.5 text-xs" : "gap-2"} cursor-pointer`}
              >
                <User className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                <span className="font-medium">Votre position</span>
              </Label>
            </div>

            {/* Cercles de distance */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="distance-circles-leaflet"
                checked={showDistanceCircles}
                onCheckedChange={setShowDistanceCircles}
              />
              <Label
                htmlFor="distance-circles-leaflet"
                className={`flex items-center ${isMobile ? "gap-1.5 text-xs" : "gap-2"} cursor-pointer`}
              >
                <MapPin className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                <span className="font-medium">Échelle de distance</span>
              </Label>
            </div>

            {/* Non situés */}
            {unlocatedEmplacements.length > 0 && (
              <div className={isMobile ? "text-xs" : ""}>
                <button
                  onClick={() => setShowUnlocatedList(!showUnlocatedList)}
                  className={`flex items-center ${isMobile ? "gap-1.5 px-2.5 py-1.5" : "gap-2 px-3 py-2"} w-full rounded-lg bg-secondary hover:bg-secondary/80 transition-colors`}
                >
                  <MapPinOff className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                  <span className="font-medium flex-1 text-left">
                    Non situés ({unlocatedEmplacements.length})
                  </span>
                  {showUnlocatedList ? (
                    <ChevronUp className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                  ) : (
                    <ChevronDown className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                  )}
                </button>

                {showUnlocatedList && (
                  <div className={`mt-2 ${isMobile ? "space-y-1" : "space-y-1.5"} bg-muted/50 rounded-lg ${isMobile ? "p-2" : "p-3"}`}>
                    {unlocatedEmplacements.map((emp) => {
                      const Icon = getTypeIcon(emp.type);
                      return (
                        <div
                          key={emp.id}
                          className={`flex items-center ${isMobile ? "gap-2 p-1.5" : "gap-2 p-2"} bg-background rounded border`}
                        >
                          <Icon className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                          <span className="flex-1 font-medium">{emp.nom}</span>
                          <span className={`${isMobile ? "text-[10px]" : "text-xs"} text-muted-foreground capitalize`}>
                            {emp.type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className={isMobile ? "p-4" : "p-6"}>
          {locatedEmplacements.length === 0 ? (
            <div className="py-16 text-center">
              <MapPin className="mx-auto h-14 w-14 text-muted-foreground" />
              <p className="mt-4 font-medium">Aucun emplacement géolocalisé</p>
            </div>
          ) : (
            <div style={{ height: mapHeight, width: "100%" }}>
              <MapContainer
                center={[+locatedEmplacements[0].lat, +locatedEmplacements[0].lng]}
                zoom={13}
                style={{ height: "100%", width: "100%", borderRadius: "8px" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapBounds emplacements={locatedEmplacements} />

                {/* Lignes rouges de la base vers les emplacements avec distances */}
                {base && base.lat && base.lng && locatedEmplacements.map((emp) => {
                  if (emp.id === base.id || !emp.lat || !emp.lng) return null;

                  const distance = calculateDistance(+base.lat, +base.lng, +emp.lat, +emp.lng);
                  const midLat = (+base.lat + +emp.lat) / 2;
                  const midLng = (+base.lng + +emp.lng) / 2;

                  return (
                    <div key={`line-${emp.id}`}>
                      {/* Ligne rouge */}
                      <Polyline
                        positions={[
                          [+base.lat, +base.lng],
                          [+emp.lat, +emp.lng],
                        ]}
                        pathOptions={{
                          color: "#ef4444",
                          weight: 2,
                          opacity: 0.7,
                          dashArray: "5, 5",
                        }}
                      />
                      {/* Marqueur invisible pour afficher la distance au milieu */}
                      <Marker
                        position={[midLat, midLng]}
                        icon={L.divIcon({
                          html: `
                            <div style="
                              background: white;
                              border: 2px solid #ef4444;
                              border-radius: 4px;
                              padding: 2px 6px;
                              font-size: 11px;
                              font-weight: bold;
                              color: #ef4444;
                              white-space: nowrap;
                              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            ">
                              ${distance.toFixed(1)} km
                            </div>
                          `,
                          className: "distance-label",
                          iconSize: [60, 20],
                          iconAnchor: [30, 10],
                        })}
                      />
                    </div>
                  );
                })}

                {/* Cercles de distance autour de la base */}
                {showDistanceCircles && base && base.lat && base.lng && (
                  <>
                    {[2000, 5000, 10000, 20000].map((radiusMeters) => (
                      <Circle
                        key={`circle-${radiusMeters}`}
                        center={[+base.lat, +base.lng]}
                        radius={radiusMeters}
                        pathOptions={{
                          color: "#9ca3af",
                          fillColor: "transparent",
                          weight: 1,
                          dashArray: "5, 5",
                          opacity: 0.5,
                        }}
                      />
                    ))}
                  </>
                )}

                {/* Markers des emplacements */}
                {locatedEmplacements.map((emp) => {
                  if (!shouldShowMarker(emp.type)) return null;

                  const Icon = getTypeIcon(emp.type);

                  return (
                    <Marker
                      key={emp.id}
                      position={[+emp.lat, +emp.lng]}
                      icon={createCustomIcon(emp.type, emp.statut)}
                    >
                      {/* Tooltip permanent avec statistiques */}
                      <Tooltip
                        permanent
                        direction="top"
                        offset={[0, -10]}
                        className="custom-tooltip"
                      >
                        <div style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          minWidth: '100px',
                        }}>
                          <div style={{ marginBottom: '4px', borderBottom: '1px solid #e5e7eb', paddingBottom: '2px' }}>
                            {emp.nom}
                          </div>
                          {emp.stats && (
                            <div style={{ fontSize: '10px', fontWeight: 'normal' }}>
                              <div>Ventes: {emp.stats.ventes ?? "-"}</div>
                              <div>Livraisons: {emp.stats.livraisons ?? "-"}</div>
                              <div style={{ color: '#16a34a', fontWeight: 'bold' }}>
                                CA: {emp.stats.ca ?? "-"}
                              </div>
                            </div>
                          )}
                        </div>
                      </Tooltip>

                      {/* Popup avec détails complets */}
                      <Popup>
                        <div className="p-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-5 h-5" />
                            <span className="font-bold">{emp.nom}</span>
                          </div>
                          <div className="text-sm text-muted-foreground capitalize">
                            Type: {emp.type}
                          </div>
                          <div className="text-sm text-muted-foreground capitalize">
                            Statut: {emp.statut?.replace("_", " ")}
                          </div>
                          {emp.stats && (() => {
                            const objectifJournalier = 500; // Donnée statique pour l'instant
                            const ca = parseFloat(emp.stats?.ca) || 0;
                            const progression = Math.min((ca / objectifJournalier) * 100, 100);
                            const progressColor = progression >= 100 ? 'hsl(var(--chart-2))' : progression >= 70 ? 'hsl(var(--accent))' : 'hsl(var(--destructive))';

                            return (
                              <div className="flex gap-2 pt-2 border-t">
                                {/* Barre de progression verticale à gauche */}
                                <div className="flex flex-col items-center gap-1" style={{ width: '20px' }}>
                                  <div className="flex-1 bg-muted rounded-full overflow-hidden relative" style={{ width: '10px', minHeight: '60px' }}>
                                    <div
                                      className="absolute bottom-0 w-full rounded-full transition-all duration-300"
                                      style={{
                                        height: `${progression}%`,
                                        backgroundColor: progressColor
                                      }}
                                    />
                                  </div>
                                  <span className="font-bold text-foreground text-[9px]">
                                    {progression.toFixed(0)}%
                                  </span>
                                </div>

                                {/* Statistiques */}
                                <div className="flex-1 text-sm space-y-1">
                                  <div>Ventes: {emp.stats.ventes ?? "-"}</div>
                                  <div>Livraisons: {emp.stats.livraisons ?? "-"}</div>
                                  <div className="font-semibold" style={{ color: 'hsl(var(--chart-2))' }}>
                                    CA: {emp.stats.ca ?? "-"}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          {onEdit && (
                            isMobile ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(emp);
                                }}
                                className="w-full bg-primary text-white hover:bg-primary/90 rounded py-1.5 mt-2 flex items-center justify-center transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(emp);
                                }}
                                className="w-full bg-primary text-white hover:bg-primary/90 rounded text-xs py-1.5 mt-2 font-semibold transition-colors"
                              >
                                Modifier
                              </button>
                            )
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Position de l'utilisateur */}
                {showUserPosition && userPosition && (
                  <Marker
                    position={[userPosition.lat, userPosition.lng]}
                    icon={L.divIcon({
                      html: `
                        <div style="
                          width: 32px;
                          height: 32px;
                          background: #3b82f6;
                          border: 3px solid white;
                          border-radius: 50%;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        ">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>
                      `,
                      className: "custom-user-marker",
                      iconSize: [32, 32],
                      iconAnchor: [16, 16],
                    })}
                  >
                    <Popup>
                      <div className="p-2">
                        <span className="font-bold text-blue-600">Votre position</span>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmplacementsLeafletMap;
