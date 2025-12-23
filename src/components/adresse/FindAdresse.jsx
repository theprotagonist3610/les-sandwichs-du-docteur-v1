import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  X,
  MapPin,
  Filter,
  Loader2,
} from "lucide-react";
import {
  getUniqueDepartements,
  getCommunesByDepartement,
  getArrondissementsByCommune,
  getQuartiersByArrondissement,
} from "@/utils/adresseToolkit";

/**
 * Composant de recherche d'adresses avec filtres multiples
 */
const FindAdresse = ({ onSearch, isMobile = false }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    departement: "all",
    commune: "all",
    arrondissement: "all",
    quartier: "all",
  });
  const [proximity, setProximity] = useState({
    enabled: false,
    lat: "",
    lng: "",
    radius: "5",
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Listes pour les selects
  const [departements, setDepartements] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [arrondissements, setArrondissements] = useState([]);
  const [quartiers, setQuartiers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Charger les départements au montage
  useEffect(() => {
    loadDepartements();
  }, []);

  const loadDepartements = async () => {
    const { departements: data } = await getUniqueDepartements();
    setDepartements(data || []);
  };

  // Charger les communes quand le département change
  useEffect(() => {
    if (filters.departement && filters.departement !== "all") {
      loadCommunes(filters.departement);
    } else {
      setCommunes([]);
      setArrondissements([]);
      setQuartiers([]);
    }
  }, [filters.departement]);

  const loadCommunes = async (departement) => {
    const { communes: data } = await getCommunesByDepartement(departement);
    setCommunes(data || []);
  };

  // Charger les arrondissements quand la commune change
  useEffect(() => {
    if (filters.commune && filters.commune !== "all") {
      loadArrondissements(filters.commune);
    } else {
      setArrondissements([]);
      setQuartiers([]);
    }
  }, [filters.commune]);

  const loadArrondissements = async (commune) => {
    const { arrondissements: data } = await getArrondissementsByCommune(commune);
    setArrondissements(data || []);
  };

  // Charger les quartiers quand l'arrondissement change
  useEffect(() => {
    if (filters.arrondissement && filters.arrondissement !== "all") {
      loadQuartiers(filters.arrondissement);
    } else {
      setQuartiers([]);
    }
  }, [filters.arrondissement]);

  const loadQuartiers = async (arrondissement) => {
    const { quartiers: data } = await getQuartiersByArrondissement(arrondissement);
    setQuartiers(data || []);
  };

  // Effectuer la recherche
  const handleSearch = () => {
    setIsLoading(true);

    const searchParams = {
      searchTerm: searchTerm.trim(),
      filters: {
        ...filters,
      },
      proximity: proximity.enabled ? {
        lat: parseFloat(proximity.lat),
        lng: parseFloat(proximity.lng),
        radius: parseFloat(proximity.radius),
      } : null,
    };

    onSearch(searchParams);
    setIsLoading(false);
  };

  // Réinitialiser les filtres
  const handleClear = () => {
    setSearchTerm("");
    setFilters({
      departement: "all",
      commune: "all",
      arrondissement: "all",
      quartier: "all",
    });
    setProximity({
      enabled: false,
      lat: "",
      lng: "",
      radius: "5",
    });
    setShowAdvanced(false);
    onSearch({ searchTerm: "", filters: {}, proximity: null });
  };

  // Obtenir la position actuelle
  const handleGetCurrentPosition = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setProximity({
            ...proximity,
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6),
            enabled: true,
          });
        },
        (error) => {
          console.error("Erreur de géolocalisation:", error);
        }
      );
    }
  };

  // Déclencher la recherche à chaque changement (debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm || Object.values(filters).some(v => v && v !== "all") || proximity.enabled) {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, filters, proximity]);

  return (
    <Card>
      <CardHeader className={isMobile ? "px-4 py-3" : ""}>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${isMobile ? "text-sm" : "text-base"}`}>
            <Search className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
            Rechercher une adresse
          </CardTitle>
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "default"}
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="gap-2"
          >
            <Filter className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
            {showAdvanced ? "Masquer" : "Filtres avancés"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className={isMobile ? "px-4 pb-4" : ""}>
        <div className="space-y-4">
          {/* Recherche textuelle */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${isMobile ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
            <Input
              placeholder="Rechercher par département, commune, arrondissement ou quartier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 ${isMobile ? "text-sm h-9" : ""}`}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchTerm("")}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {/* Filtres avancés */}
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              {/* Filtres par hiérarchie */}
              <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"}`}>
                {/* Département */}
                <div className="space-y-2">
                  <Label className={isMobile ? "text-xs" : "text-sm"}>Département</Label>
                  <Select
                    value={filters.departement}
                    onValueChange={(value) => setFilters({ ...filters, departement: value, commune: "all", arrondissement: "all", quartier: "all" })}
                  >
                    <SelectTrigger className={isMobile ? "h-9 text-sm" : ""}>
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {departements.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Commune */}
                <div className="space-y-2">
                  <Label className={isMobile ? "text-xs" : "text-sm"}>Commune</Label>
                  <Select
                    value={filters.commune}
                    onValueChange={(value) => setFilters({ ...filters, commune: value, arrondissement: "all", quartier: "all" })}
                    disabled={!filters.departement || filters.departement === "all"}
                  >
                    <SelectTrigger className={isMobile ? "h-9 text-sm" : ""}>
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {communes.map((commune) => (
                        <SelectItem key={commune} value={commune}>
                          {commune}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Arrondissement */}
                <div className="space-y-2">
                  <Label className={isMobile ? "text-xs" : "text-sm"}>Arrondissement</Label>
                  <Select
                    value={filters.arrondissement}
                    onValueChange={(value) => setFilters({ ...filters, arrondissement: value, quartier: "all" })}
                    disabled={!filters.commune || filters.commune === "all"}
                  >
                    <SelectTrigger className={isMobile ? "h-9 text-sm" : ""}>
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {arrondissements.map((arr) => (
                        <SelectItem key={arr} value={arr}>
                          {arr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quartier */}
                <div className="space-y-2">
                  <Label className={isMobile ? "text-xs" : "text-sm"}>Quartier</Label>
                  <Select
                    value={filters.quartier}
                    onValueChange={(value) => setFilters({ ...filters, quartier: value })}
                    disabled={!filters.arrondissement || filters.arrondissement === "all"}
                  >
                    <SelectTrigger className={isMobile ? "h-9 text-sm" : ""}>
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {quartiers.map((quartier) => (
                        <SelectItem key={quartier} value={quartier}>
                          {quartier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Recherche par proximité */}
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <Label className={`flex items-center gap-2 ${isMobile ? "text-xs" : "text-sm"}`}>
                    <MapPin className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                    Recherche par proximité
                  </Label>
                  <Button
                    variant="outline"
                    size={isMobile ? "sm" : "default"}
                    onClick={handleGetCurrentPosition}
                    className="gap-2"
                  >
                    <MapPin className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                    Ma position
                  </Button>
                </div>

                <div className={`grid gap-3 ${isMobile ? "grid-cols-3" : "grid-cols-4"}`}>
                  <div className="space-y-2">
                    <Label className={isMobile ? "text-xs" : "text-sm"}>Latitude</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      placeholder="6.3654"
                      value={proximity.lat}
                      onChange={(e) => setProximity({ ...proximity, lat: e.target.value, enabled: !!e.target.value && !!proximity.lng })}
                      className={isMobile ? "h-9 text-sm" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={isMobile ? "text-xs" : "text-sm"}>Longitude</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      placeholder="2.4183"
                      value={proximity.lng}
                      onChange={(e) => setProximity({ ...proximity, lng: e.target.value, enabled: !!proximity.lat && !!e.target.value })}
                      className={isMobile ? "h-9 text-sm" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={isMobile ? "text-xs" : "text-sm"}>Rayon (km)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="5"
                      value={proximity.radius}
                      onChange={(e) => setProximity({ ...proximity, radius: e.target.value })}
                      className={isMobile ? "h-9 text-sm" : ""}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="flex-1 gap-2"
              size={isMobile ? "sm" : "default"}
            >
              {isLoading ? (
                <>
                  <Loader2 className={`animate-spin ${isMobile ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
                  Recherche...
                </>
              ) : (
                <>
                  <Search className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                  Rechercher
                </>
              )}
            </Button>

            {(searchTerm || Object.values(filters).some(v => v && v !== "all") || proximity.enabled) && (
              <Button
                variant="outline"
                onClick={handleClear}
                className="gap-2"
                size={isMobile ? "sm" : "default"}
              >
                <X className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                Effacer
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FindAdresse;
