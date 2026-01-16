import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, addMinutes, addHours, addDays, addWeeks, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, Tag } from "lucide-react";

/**
 * Dialog pour activer un template de promotion
 */
const ActivationDialog = ({ template, open, onOpenChange, onActivate }) => {
  const [dateDebut, setDateDebut] = useState(new Date());
  const [timeDebut, setTimeDebut] = useState(format(new Date(), "HH:mm"));
  const [codePromo, setCodePromo] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

  // Calculer date_fin basée sur le template
  const calculateDateFin = () => {
    if (!dateDebut || !template) return null;

    const debut = new Date(`${format(dateDebut, "yyyy-MM-dd")}T${timeDebut}:00`);
    const { duree_valeur, duree_unite } = template;

    switch (duree_unite) {
      case "minutes":
        return addMinutes(debut, duree_valeur);
      case "hours":
        return addHours(debut, duree_valeur);
      case "days":
        return addDays(debut, duree_valeur);
      case "weeks":
        return addWeeks(debut, duree_valeur);
      case "months":
        return addMonths(debut, duree_valeur);
      default:
        return debut;
    }
  };

  const dateFin = calculateDateFin();

  // Générer un code promo aléatoire
  const generateCodePromo = () => {
    const prefix = template.type_promotion === "flash" ? "FLASH" : "PROMO";
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${random}`;
  };

  // Reset quand le dialog s'ouvre
  useEffect(() => {
    if (open) {
      setDateDebut(new Date());
      setTimeDebut(format(new Date(), "HH:mm"));
      setCodePromo(generateCodePromo());
    }
  }, [open, template]);

  const handleActivate = () => {
    const debut = new Date(`${format(dateDebut, "yyyy-MM-dd")}T${timeDebut}:00`);

    const activationData = {
      date_debut: debut.toISOString(),
      code_promo: codePromo.trim() || null,
    };

    onActivate(template.id, activationData);
  };

  const getDureeLabel = () => {
    if (!template) return "";
    const { duree_valeur, duree_unite } = template;
    const unites = {
      minutes: "minute(s)",
      hours: "heure(s)",
      days: "jour(s)",
      weeks: "semaine(s)",
      months: "mois",
    };
    return `${duree_valeur} ${unites[duree_unite] || duree_unite}`;
  };

  const getReductionLabel = () => {
    if (!template) return "";
    if (template.reduction_absolue > 0) {
      return `${template.reduction_absolue.toLocaleString("fr-FR")} FCFA`;
    }
    if (template.reduction_relative > 0) {
      return `${template.reduction_relative}%`;
    }
    return "";
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Activer la promotion</DialogTitle>
          <DialogDescription>
            Configurer l&apos;activation du template &quot;{template.denomination}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Résumé du template */}
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Réduction:</span>
              <Badge variant="default" className="text-base">
                {getReductionLabel()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Durée:</span>
              <span className="text-sm">{getDureeLabel()}</span>
            </div>
            {template.utilisation_max && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Utilisations max:</span>
                <span className="text-sm">{template.utilisation_max}</span>
              </div>
            )}
          </div>

          {/* Date de début */}
          <div className="space-y-2">
            <Label htmlFor="date-debut">Date et heure de début</Label>
            <div className="flex gap-2">
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !dateDebut && "text-muted-foreground"
                    )}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateDebut ? (
                      format(dateDebut, "dd MMM yyyy", { locale: fr })
                    ) : (
                      <span>Choisir une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateDebut}
                    onSelect={(date) => {
                      setDateDebut(date);
                      setShowCalendar(false);
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-2 w-32">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={timeDebut}
                  onChange={(e) => setTimeDebut(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Date de fin calculée */}
          {dateFin && (
            <div className="space-y-2">
              <Label>Date de fin (calculée automatiquement)</Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                <CalendarIcon className="inline h-4 w-4 mr-2" />
                {format(dateFin, "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
              </div>
            </div>
          )}

          {/* Code promo */}
          <div className="space-y-2">
            <Label htmlFor="code-promo">Code promo (optionnel)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="code-promo"
                  value={codePromo}
                  onChange={(e) => setCodePromo(e.target.value.toUpperCase())}
                  placeholder="PROMO2024"
                  className="pl-9 font-mono"
                  maxLength={20}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCodePromo(generateCodePromo())}>
                Générer
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Laissez vide si aucun code n&apos;est nécessaire
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleActivate}>Activer maintenant</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ActivationDialog;
