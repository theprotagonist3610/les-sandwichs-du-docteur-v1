import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, Plus, Check, Building, Home } from "lucide-react";

/**
 * Sélecteur d'adresse de livraison
 */
const AdresseSelector = ({
  open,
  onClose,
  adresses = [],
  currentAdresseId,
  onSelect,
  onCreateNew,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState(currentAdresseId);

  // Filtrer les adresses
  const filteredAdresses = useMemo(() => {
    if (!searchTerm.trim()) return adresses;

    const term = searchTerm.toLowerCase();
    return adresses.filter(
      (adresse) =>
        adresse.adresse?.toLowerCase().includes(term) ||
        adresse.quartier?.toLowerCase().includes(term) ||
        adresse.commune?.toLowerCase().includes(term) ||
        adresse.ville?.toLowerCase().includes(term) ||
        adresse.denomination?.toLowerCase().includes(term)
    );
  }, [adresses, searchTerm]);

  // Grouper par commune
  const groupedAdresses = useMemo(() => {
    const groups = {};
    filteredAdresses.forEach((adresse) => {
      const key = adresse.commune || "Autre";
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(adresse);
    });
    return groups;
  }, [filteredAdresses]);

  const handleSelect = () => {
    const adresse = adresses.find((a) => a.id === selectedId);
    onSelect(adresse || null);
    onClose();
  };

  const handleClear = () => {
    onSelect(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Sélectionner une adresse
          </DialogTitle>
          <DialogDescription>
            Choisissez une adresse de livraison existante ou créez-en une
            nouvelle
          </DialogDescription>
        </DialogHeader>

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une adresse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Liste des adresses */}
        <ScrollArea className="h-[350px] pr-4">
          {Object.keys(groupedAdresses).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Aucune adresse trouvée</p>
              {searchTerm && (
                <Button
                  variant="link"
                  onClick={() => setSearchTerm("")}
                  className="mt-2">
                  Effacer la recherche
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedAdresses).map(([commune, adressesList]) => (
                <div key={commune}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Building className="h-3 w-3" />
                    {commune}
                    <Badge variant="secondary" className="text-xs">
                      {adressesList.length}
                    </Badge>
                  </h4>

                  <div className="space-y-2">
                    {adressesList.map((adresse) => (
                      <div
                        key={adresse.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedId === adresse.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedId(adresse.id)}>
                        <div className="flex items-start gap-3">
                          {/* Icône */}
                          <div
                            className={`p-2 rounded-full ${
                              selectedId === adresse.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}>
                            {adresse.type === "domicile" ? (
                              <Home className="h-4 w-4" />
                            ) : (
                              <MapPin className="h-4 w-4" />
                            )}
                          </div>

                          {/* Détails */}
                          <div className="flex-1 min-w-0">
                            {adresse.denomination && (
                              <p className="font-medium text-sm">
                                {adresse.denomination}
                              </p>
                            )}
                            <p className="text-sm truncate">
                              {adresse.adresse}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {adresse.quartier}, {adresse.commune}
                            </p>
                            {adresse.repere && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Repère: {adresse.repere}
                              </p>
                            )}
                          </div>

                          {/* Check */}
                          {selectedId === adresse.id && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle adresse
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClear}>
              Aucune adresse
            </Button>
            <Button onClick={handleSelect} disabled={!selectedId}>
              Sélectionner
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdresseSelector;
