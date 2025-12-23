import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Map, Globe, Plus } from "lucide-react";
import EmplacementsMap from "./EmplacementsMap";
import EmplacementsLeafletMap from "./EmplacementsLeafletMap";
import EmplacementDialog from "@/pages/outils/emplacements/EmplacementDialog";

const EmplacementsMapWrapper = ({ viewBox = "0 0 1200 600", height = "600", isMobile = false }) => {
  const [mapType, setMapType] = useState("simple"); // "simple" ou "relief"
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmplacement, setSelectedEmplacement] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenDialog = (emplacement = null) => {
    setSelectedEmplacement(emplacement);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setSelectedEmplacement(null);
    // Force le rafraîchissement des cartes
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      {/* Toggle entre les deux types de cartes + Bouton Nouvel emplacement */}
      <Card>
        <CardContent className={isMobile ? "pt-4" : "pt-6"}>
          <div className={`flex ${isMobile ? "flex-col gap-3" : "items-center justify-between"}`}>
            <div className={`flex ${isMobile ? "justify-center" : ""} gap-2`}>
              <Button
                variant={mapType === "simple" ? "default" : "outline"}
                size={isMobile ? "sm" : "default"}
                onClick={() => setMapType("simple")}
                className={isMobile ? "text-xs flex-1" : ""}
              >
                <Map className={isMobile ? "w-3.5 h-3.5 mr-1.5" : "w-4 h-4 mr-2"} />
                Carte simple
              </Button>
              <Button
                variant={mapType === "relief" ? "default" : "outline"}
                size={isMobile ? "sm" : "default"}
                onClick={() => setMapType("relief")}
                className={isMobile ? "text-xs flex-1" : ""}
              >
                <Globe className={isMobile ? "w-3.5 h-3.5 mr-1.5" : "w-4 h-4 mr-2"} />
                Carte relief
              </Button>
            </div>
            <Button
              variant="default"
              size={isMobile ? "sm" : "default"}
              onClick={() => handleOpenDialog(null)}
              className={isMobile ? "text-xs w-full" : ""}
            >
              <Plus className={isMobile ? "w-3.5 h-3.5 mr-1.5" : "w-4 h-4 mr-2"} />
              Nouvel emplacement
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Affichage conditionnel */}
      {mapType === "simple" ? (
        <EmplacementsMap
          key={refreshKey}
          viewBox={viewBox}
          height={height}
          isMobile={isMobile}
          onEdit={handleOpenDialog}
        />
      ) : (
        <EmplacementsLeafletMap
          key={refreshKey}
          isMobile={isMobile}
          onEdit={handleOpenDialog}
        />
      )}

      {/* Dialog de création/modification */}
      <EmplacementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
        emplacement={selectedEmplacement}
      />
    </div>
  );
};

export default EmplacementsMapWrapper;
