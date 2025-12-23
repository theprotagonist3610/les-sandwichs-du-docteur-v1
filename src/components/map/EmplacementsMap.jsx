import { useState, useEffect, useRef } from "react";
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

const EmplacementsMap = ({ viewBox = "0 0 1200 600", height = "600", isMobile = false, onEdit }) => {
  const canvasRef = useRef(null);
  const [emplacements, setEmplacements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("tout");
  const [showUserPosition, setShowUserPosition] = useState(false);
  const [userPosition, setUserPosition] = useState(null);
  const [showUnlocatedList, setShowUnlocatedList] = useState(false);
  const [showDistanceCircles, setShowDistanceCircles] = useState(true);

  // Dimensions adaptatives selon le mode
  const dimensions = isMobile
    ? { width: 340, height: 400, padding: 40 }
    : { width: 1200, height: 600, padding: 60 };

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
    setIsLoading(true);
    const { emplacements: data, error } =
      await emplacementToolkit.getEmplacementsForMap();

    if (error) {
      toast.error("Erreur", {
        description: "Impossible de charger la carte",
      });
    } else {
      setEmplacements(data || []);
    }
    setIsLoading(false);
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

  const getMapData = () => {
    if (!emplacements.length) return null;

    const lats = emplacements.map((e) => +e.lat).filter(Boolean);
    const lngs = emplacements.map((e) => +e.lng).filter(Boolean);

    if (!lats.length || !lngs.length) return null;

    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  };

  const getPosition = (lat, lng, width, height, padding, bounds) => ({
    x:
      padding +
      ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) *
        (width - 2 * padding),
    y:
      height -
      padding -
      ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1)) *
        (height - 2 * padding),
  });

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
        base: "#93c5fd",
        stand: "#86efac",
        kiosque: "#fcd34d",
        boutique: "#d8b4fe",
      }[type] || "#d1d5db"
    );
  };

  const shouldShowStats = (empType) => {
    return selectedTypeFilter === "tout" || selectedTypeFilter === empType;
  };

  // Calculer le rayon en pixels pour une distance en km
  const calculateRadiusInPixels = (distanceKm, bounds) => {
    if (!bounds) return 0;

    // Calculer la distance en degrés (approximation)
    const kmPerDegreeLat = 111; // Environ 111 km par degré de latitude
    const distanceDegrees = distanceKm / kmPerDegreeLat;

    // Convertir en pixels
    const latRange = bounds.maxLat - bounds.minLat || 1;
    const pixelHeight = dimensions.height - 2 * dimensions.padding;
    const radiusPixels = (distanceDegrees / latRange) * pixelHeight;

    return radiusPixels;
  };

  // Séparer les emplacements situés et non situés
  const locatedEmplacements = emplacements.filter((e) => e.lat && e.lng);
  const unlocatedEmplacements = emplacements.filter((e) => !e.lat || !e.lng);

  // Compter les emplacements par type
  const countByType = {
    tout: emplacements.length,
    base: emplacements.filter((e) => e.type === "base").length,
    stand: emplacements.filter((e) => e.type === "stand").length,
    kiosque: emplacements.filter((e) => e.type === "kiosque").length,
    boutique: emplacements.filter((e) => e.type === "boutique").length,
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Chargement de la carte...
      </div>
    );
  }

  const bounds = getMapData();
  const base = emplacements.find((e) => e.type === "base");

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
              <span className={`${isMobile ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"} rounded-full ${
                selectedTypeFilter === "tout"
                  ? "bg-primary-foreground/20"
                  : "bg-primary/20 text-primary"
              }`}>
                {countByType.tout}
              </span>
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
              <span className={`${isMobile ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"} rounded-full ${
                selectedTypeFilter === "base"
                  ? "bg-primary-foreground/20"
                  : "bg-primary/20 text-primary"
              }`}>
                {countByType.base}
              </span>
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
              <span className={`${isMobile ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"} rounded-full ${
                selectedTypeFilter === "stand"
                  ? "bg-primary-foreground/20"
                  : "bg-primary/20 text-primary"
              }`}>
                {countByType.stand}
              </span>
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
              <span className={`${isMobile ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"} rounded-full ${
                selectedTypeFilter === "kiosque"
                  ? "bg-primary-foreground/20"
                  : "bg-primary/20 text-primary"
              }`}>
                {countByType.kiosque}
              </span>
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
              <span className={`${isMobile ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"} rounded-full ${
                selectedTypeFilter === "boutique"
                  ? "bg-primary-foreground/20"
                  : "bg-primary/20 text-primary"
              }`}>
                {countByType.boutique}
              </span>
            </button>
          </div>

          {/* Options supplémentaires */}
          <div className={`flex flex-col ${isMobile ? "gap-2 mt-3" : "gap-3 mt-4"} border-t pt-3`}>
            {/* Votre position */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="user-position"
                checked={showUserPosition}
                onCheckedChange={setShowUserPosition}
              />
              <Label
                htmlFor="user-position"
                className={`flex items-center ${isMobile ? "gap-1.5 text-xs" : "gap-2"} cursor-pointer`}
              >
                <User className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                <span className="font-medium">Votre position</span>
              </Label>
            </div>

            {/* Cercles de distance */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="distance-circles"
                checked={showDistanceCircles}
                onCheckedChange={setShowDistanceCircles}
              />
              <Label
                htmlFor="distance-circles"
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
          {!bounds ? (
            <div className="py-16 text-center">
              <MapPin className="mx-auto h-14 w-14 text-muted-foreground" />
              <p className="mt-4 font-medium">Aucun emplacement géolocalisé</p>
            </div>
          ) : (
            <svg
              ref={canvasRef}
              width="100%"
              height={height}
              viewBox={viewBox}
              className="w-full border rounded-lg"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <pattern
                  id={`dots-${isMobile ? "mobile" : "desktop"}`}
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse">
                  <circle cx="10" cy="10" r="1.5" className="fill-muted-foreground" opacity="0.3" />
                </pattern>
                <style>
                  {`
                    @keyframes pulse {
                      0%,100%{opacity:.3}
                      50%{opacity:.7}
                    }
                    .pulse { animation:pulse 2s infinite }
                    @keyframes dash {
                      to { stroke-dashoffset:-20 }
                    }
                    .dash { animation:dash 1s linear infinite }
                  `}
                </style>
              </defs>

              <rect width={dimensions.width} height={dimensions.height} className="fill-card" />
              <rect width={dimensions.width} height={dimensions.height} fill={`url(#dots-${isMobile ? "mobile" : "desktop"})`} opacity="0.4" />

            {/* Cercles concentriques autour de la base */}
            {showDistanceCircles && base && base.lat && base.lng && (
              (() => {
                const basePos = getPosition(
                  +base.lat,
                  +base.lng,
                  dimensions.width,
                  dimensions.height,
                  dimensions.padding,
                  bounds
                );

                // Définir les distances des cercles (2km, 5km, 10km, 20km)
                const distances = [2, 5, 10, 20];

                return distances.map((distanceKm) => {
                  const radius = calculateRadiusInPixels(distanceKm, bounds);

                  return (
                    <g key={`circle-${distanceKm}`}>
                      {/* Cercle */}
                      <circle
                        cx={basePos.x}
                        cy={basePos.y}
                        r={radius}
                        fill="none"
                        strokeWidth="1.5"
                        strokeDasharray="5 5"
                        className="stroke-foreground"
                        opacity="0.3"
                      />
                      {/* Label de distance */}
                      <text
                        x={basePos.x}
                        y={basePos.y - radius + (isMobile ? 10 : 12)}
                        textAnchor="middle"
                        className={`font-semibold fill-accent stroke-card ${isMobile ? "text-[8px]" : "text-[9px]"}`}
                        style={{
                          paintOrder: "stroke",
                          strokeWidth: "3px",
                        }}
                      >
                        {distanceKm} km
                      </text>
                    </g>
                  );
                });
              })()
            )}

            {/* Lignes vers la base avec distances */}
            {base &&
              locatedEmplacements.map((emp) => {
                if (emp.id === base.id || !emp.lat || !emp.lng) return null;

                const p1 = getPosition(
                  +base.lat,
                  +base.lng,
                  dimensions.width,
                  dimensions.height,
                  dimensions.padding,
                  bounds
                );
                const p2 = getPosition(
                  +emp.lat,
                  +emp.lng,
                  dimensions.width,
                  dimensions.height,
                  dimensions.padding,
                  bounds
                );

                // Calculer la distance
                const distance = calculateDistance(+base.lat, +base.lng, +emp.lat, +emp.lng);
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;

                return (
                  <g key={`line-${emp.id}`}>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      className="dash stroke-foreground"
                      opacity="0.5"
                    />
                    {/* Étiquette de distance */}
                    <text
                      x={midX}
                      y={midY}
                      textAnchor="middle"
                      className={`font-bold fill-primary stroke-card ${isMobile ? "text-[8px]" : "text-[10px]"}`}
                      style={{ paintOrder: "stroke", strokeWidth: "3px" }}
                    >
                      {distance.toFixed(1)} km
                    </text>
                  </g>
                );
              })}

            {/* Lignes depuis la position de l'utilisateur vers les emplacements */}
            {showUserPosition && userPosition && bounds && (
              <>
                {locatedEmplacements.map((emp) => {
                  if (!emp.lat || !emp.lng) return null;

                  const pUser = getPosition(
                    userPosition.lat,
                    userPosition.lng,
                    dimensions.width,
                    dimensions.height,
                    dimensions.padding,
                    bounds
                  );
                  const pEmp = getPosition(
                    +emp.lat,
                    +emp.lng,
                    dimensions.width,
                    dimensions.height,
                    dimensions.padding,
                    bounds
                  );

                  // Calculer la distance
                  const distance = calculateDistance(
                    userPosition.lat,
                    userPosition.lng,
                    +emp.lat,
                    +emp.lng
                  );
                  const midX = (pUser.x + pEmp.x) / 2;
                  const midY = (pUser.y + pEmp.y) / 2;

                  return (
                    <g key={`user-line-${emp.id}`}>
                      <line
                        x1={pUser.x}
                        y1={pUser.y}
                        x2={pEmp.x}
                        y2={pEmp.y}
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        className="stroke-[#ffb564]"
                        opacity="0.6"
                      />
                      {/* Étiquette de distance */}
                      <text
                        x={midX}
                        y={midY}
                        textAnchor="middle"
                        className={`font-bold fill-[#ffb564] stroke-card ${isMobile ? "text-[8px]" : "text-[10px]"}`}
                        style={{
                          paintOrder: "stroke",
                          strokeWidth: "3px",
                        }}
                      >
                        {distance.toFixed(1)} km
                      </text>
                    </g>
                  );
                })}
              </>
            )}

            {/* Position de l'utilisateur */}
            {showUserPosition && userPosition && bounds && (
              (() => {
                const { x, y } = getPosition(
                  userPosition.lat,
                  userPosition.lng,
                  dimensions.width,
                  dimensions.height,
                  dimensions.padding,
                  bounds
                );
                const circleRadius = isMobile ? 14 : 16;
                const iconSize = isMobile ? 18 : 22;

                return (
                  <g>
                    {/* Cercle pulsant */}
                    <circle
                      cx={x}
                      cy={y}
                      r={circleRadius}
                      className="fill-[#ffb564] pulse"
                      opacity={0.5}
                    />
                    {/* Icône utilisateur */}
                    <foreignObject
                      x={x - circleRadius}
                      y={y - circleRadius}
                      width={circleRadius * 2}
                      height={circleRadius * 2}
                    >
                      <div className="flex items-center justify-center">
                        <User size={iconSize} className="text-card" />
                      </div>
                    </foreignObject>
                    {/* Label */}
                    <text
                      x={x}
                      y={y + (isMobile ? 24 : 30)}
                      textAnchor="middle"
                      className={`font-bold fill-[#ffb564] ${isMobile ? "text-[9px]" : "text-xs"}`}
                    >
                      Vous
                    </text>
                  </g>
                );
              })()
            )}

            {/* Emplacements */}
            {locatedEmplacements.map((emp) => {
              const lat = +emp.lat;
              const lng = +emp.lng;
              if (isNaN(lat) || isNaN(lng)) return null;

              const { x, y } = getPosition(lat, lng, dimensions.width, dimensions.height, dimensions.padding, bounds);
              const Icon = getTypeIcon(emp.type);
              const color = getTypeColor(emp.type, emp.statut);
              const showStats = shouldShowStats(emp.type);

              // Calculer la position du panneau pour éviter le débordement
              const panelWidth = isMobile ? 120 : 140;
              const panelHeight = isMobile ? 80 : 90;
              let panelX = x - panelWidth / 2;
              let panelY = y - (isMobile ? 100 : 120);

              // Ajuster si déborde à gauche
              if (panelX < 10) panelX = 10;
              // Ajuster si déborde à droite
              if (panelX + panelWidth > dimensions.width - 10) panelX = dimensions.width - panelWidth - 10;
              // Ajuster si déborde en haut
              if (panelY < 10) panelY = y + 20;

              const iconSize = isMobile ? 16 : 20;
              const circleRadius = isMobile ? 12 : 14;

              return (
                <g key={emp.id}>
                  {/* Cercle */}
                  <circle
                    cx={x}
                    cy={y}
                    r={circleRadius}
                    fill={color}
                    opacity={emp.statut === "ferme_temporairement" ? 0.15 : 0.5}
                    className={emp.statut === "actif" ? "pulse" : ""}
                  />

                  {/* Icône */}
                  <foreignObject x={x - circleRadius} y={y - circleRadius} width={circleRadius * 2} height={circleRadius * 2}>
                    <div className="flex items-center justify-center">
                      <Icon size={iconSize} className="text-gray-700" />
                    </div>
                  </foreignObject>

                  {/* Nom */}
                  <text
                    x={x}
                    y={y + (isMobile ? 22 : 28)}
                    textAnchor="middle"
                    className={`fill-gray-800 font-medium ${isMobile ? "text-[9px]" : "text-xs"}`}>
                    {emp.nom}
                  </text>

                  {/* Panneau statistiques */}
                  {showStats && (
                    <foreignObject
                      x={panelX}
                      y={panelY}
                      width={panelWidth}
                      height={panelHeight}>
                      {(() => {
                        const objectifJournalier = 500; // Donnée statique pour l'instant
                        const ca = parseFloat(emp.stats?.ca) || 0;
                        const progression = Math.min((ca / objectifJournalier) * 100, 100);
                        const progressColor = progression >= 100 ? 'hsl(var(--chart-2))' : progression >= 70 ? 'hsl(var(--accent))' : 'hsl(var(--destructive))';

                        return (
                          <div className={`bg-card border-2 border-border rounded-md shadow-lg flex gap-1.5 ${isMobile ? "p-1 text-[9px]" : "p-1.5 text-[10px]"}`}>
                            {/* Barre de progression verticale à gauche */}
                            <div className="flex flex-col items-center gap-0.5" style={{ width: isMobile ? '14px' : '16px' }}>
                              <div className="flex-1 bg-muted rounded-full overflow-hidden" style={{ width: isMobile ? '6px' : '8px', height: '100%', position: 'relative' }}>
                                <div
                                  className="absolute bottom-0 w-full rounded-full transition-all duration-300"
                                  style={{
                                    height: `${progression}%`,
                                    backgroundColor: progressColor
                                  }}
                                />
                              </div>
                              <span className={`font-bold text-foreground ${isMobile ? "text-[7px]" : "text-[8px]"}`}>
                                {progression.toFixed(0)}%
                              </span>
                            </div>

                            {/* Contenu statistiques */}
                            <div className="flex-1 space-y-0.5">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Ventes</span>
                                <span className="font-semibold text-foreground">
                                  {emp.stats?.ventes ?? "-"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Livraisons</span>
                                <span className="font-semibold text-foreground">
                                  {emp.stats?.livraisons ?? "-"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">CA</span>
                                <span className="font-semibold" style={{ color: 'hsl(var(--chart-2))' }}>
                                  {emp.stats?.ca ?? "-"}
                                </span>
                              </div>
                              {onEdit && (
                                isMobile ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEdit(emp);
                                    }}
                                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded py-0.5 mt-0.5 flex items-center justify-center transition-colors"
                                  >
                                    <Pencil className="w-2.5 h-2.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEdit(emp);
                                    }}
                                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded text-[9px] py-1 mt-0.5 font-semibold transition-colors"
                                  >
                                    Modifier
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </foreignObject>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </CardContent>
    </Card>
    </div>
  );
};

export default EmplacementsMap;
