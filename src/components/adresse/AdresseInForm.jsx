import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, MapPin, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchAdresses } from "@/utils/adresseToolkit";
import useAdressesLocal from "@/hooks/useAdressesLocal";
import AdresseForm from "./AdresseForm";

/**
 * Composant de sélection d'adresse intégré dans un formulaire
 * Permet de rechercher, sélectionner et créer des adresses
 */
const AdresseInForm = ({
  value,
  onChange,
  onAdresseSelect,
  label = "Adresse de livraison",
  placeholder = "Rechercher une adresse...",
  required = false,
  disabled = false,
  isMobile = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAdresse, setSelectedAdresse] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const searchTimeoutRef = useRef(null);

  const local = useAdressesLocal();

  // Charger l'adresse sélectionnée au montage si value est fourni
  useEffect(() => {
    if (value && !selectedAdresse) {
      loadSelectedAdresse(value);
    }
  }, [value]);

  // Charger les détails de l'adresse sélectionnée
  const loadSelectedAdresse = async (adresseId) => {
    try {
      const adresse = local.adresses.find((a) => a.id === adresseId);
      if (adresse) {
        setSelectedAdresse(adresse);
        setSearchTerm(formatAdresseDisplay(adresse));
      }
    } catch (error) {
      console.error("Erreur chargement adresse:", error);
    }
  };

  // Formater l'affichage d'une adresse
  const formatAdresseDisplay = (adresse) => {
    return `${adresse.quartier}, ${adresse.arrondissement}, ${adresse.commune}`;
  };

  // Rechercher des adresses avec debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const { adresses } = await searchAdresses(searchTerm);
        // Filtrer uniquement les adresses actives
        const activeAdresses = adresses.filter((a) => a.is_active);
        setSearchResults(activeAdresses.slice(0, 10)); // Limiter à 10 résultats
      } catch (error) {
        console.error("Erreur recherche:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Sélectionner une adresse
  const handleSelectAdresse = (adresse) => {
    setSelectedAdresse(adresse);
    setSearchTerm(formatAdresseDisplay(adresse));
    setOpen(false);

    // Notifier le parent
    if (onChange) {
      onChange(adresse.id);
    }
    if (onAdresseSelect) {
      onAdresseSelect(adresse);
    }
  };

  // Créer une nouvelle adresse
  const handleCreateAdresse = async (adresseData) => {
    try {
      await local.createAdresse(adresseData);

      // Attendre un peu pour que l'adresse soit ajoutée à la liste
      setTimeout(() => {
        // Trouver l'adresse nouvellement créée
        const newAdresse = local.adresses.find(
          (a) =>
            a.quartier === adresseData.quartier &&
            a.arrondissement === adresseData.arrondissement &&
            a.commune === adresseData.commune
        );

        if (newAdresse) {
          handleSelectAdresse(newAdresse);
        }

        setShowCreateDialog(false);
      }, 300);
    } catch (error) {
      console.error("Erreur création adresse:", error);
    }
  };

  // Réinitialiser la sélection
  const handleClear = () => {
    setSelectedAdresse(null);
    setSearchTerm("");
    setSearchResults([]);

    if (onChange) {
      onChange(null);
    }
    if (onAdresseSelect) {
      onAdresseSelect(null);
    }
  };

  // Gérer le changement de l'input
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);

    // Si on modifie après avoir sélectionné, réinitialiser la sélection
    if (selectedAdresse && newValue !== formatAdresseDisplay(selectedAdresse)) {
      setSelectedAdresse(null);
      if (onChange) {
        onChange(null);
      }
      if (onAdresseSelect) {
        onAdresseSelect(null);
      }
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label className={isMobile ? "text-xs" : "text-sm"}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div className="flex gap-2">
        {/* Champ de recherche avec popover */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative flex-1">
              <Input
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={() => setOpen(true)}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  isMobile ? "h-9 text-sm" : "",
                  selectedAdresse && "border-green-500"
                )}
              />
              {selectedAdresse && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
              )}
            </div>
          </PopoverTrigger>

          <PopoverContent
            className={cn(
              "p-0",
              isMobile ? "w-[calc(100vw-2rem)]" : "w-[400px]"
            )}
            align="start"
          >
            {isSearching ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Recherche...
                </span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto">
                {searchResults.map((adresse) => (
                  <button
                    key={adresse.id}
                    onClick={() => handleSelectAdresse(adresse)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0",
                      selectedAdresse?.id === adresse.id && "bg-muted"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium text-foreground",
                          isMobile ? "text-xs" : "text-sm"
                        )}>
                          {adresse.quartier}
                        </p>
                        <p className={cn(
                          "text-muted-foreground",
                          isMobile ? "text-[10px]" : "text-xs"
                        )}>
                          {adresse.arrondissement}, {adresse.commune}
                        </p>
                        <p className={cn(
                          "text-muted-foreground",
                          isMobile ? "text-[10px]" : "text-xs"
                        )}>
                          {adresse.departement}
                        </p>
                      </div>
                      {selectedAdresse?.id === adresse.id && (
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : searchTerm.trim().length >= 2 ? (
              <div className="p-4 text-center">
                <p className={cn(
                  "text-muted-foreground",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  Aucune adresse trouvée
                </p>
                <p className={cn(
                  "text-muted-foreground mt-1",
                  isMobile ? "text-[10px]" : "text-xs"
                )}>
                  Essayez avec d'autres termes ou créez une nouvelle adresse
                </p>
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className={cn(
                  "text-muted-foreground",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  Tapez au moins 2 caractères pour rechercher
                </p>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Bouton pour créer une nouvelle adresse */}
        <Button
          type="button"
          variant="outline"
          size={isMobile ? "sm" : "default"}
          onClick={() => setShowCreateDialog(true)}
          disabled={disabled}
          className={cn("gap-2", isMobile ? "px-2" : "")}
        >
          <Plus className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
          {!isMobile && "Nouvelle"}
        </Button>
      </div>

      {/* Afficher l'adresse sélectionnée */}
      {selectedAdresse && (
        <div className={cn(
          "flex items-start gap-2 p-3 bg-muted/50 rounded-lg border",
          isMobile ? "text-xs" : "text-sm"
        )}>
          <MapPin className={cn(
            "text-primary mt-0.5 flex-shrink-0",
            isMobile ? "w-3.5 h-3.5" : "w-4 h-4"
          )} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">
              {selectedAdresse.quartier}
            </p>
            <p className="text-muted-foreground">
              {selectedAdresse.arrondissement}, {selectedAdresse.commune}
            </p>
            <p className="text-muted-foreground">{selectedAdresse.departement}</p>
            {selectedAdresse.localisation && (
              <p className={cn(
                "text-muted-foreground font-mono mt-1",
                isMobile ? "text-[10px]" : "text-xs"
              )}>
                GPS: {selectedAdresse.localisation.lat.toFixed(6)},{" "}
                {selectedAdresse.localisation.lng.toFixed(6)}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </div>
      )}

      {/* Dialog de création d'adresse */}
      <AdresseForm
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateAdresse}
        isMobile={isMobile}
      />
    </div>
  );
};

export default AdresseInForm;
