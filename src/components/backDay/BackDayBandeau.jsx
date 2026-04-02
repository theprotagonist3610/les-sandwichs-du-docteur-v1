/**
 * BackDayBandeau.jsx
 * Bandeau fixe en haut de la page Back-Day
 * Navigation jour par jour + indicateur de statut
 */

import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATUTS_JOURNEE } from "@/utils/backDaysToolkit";

// ─── Pastille de statut ──────────────────────────────────────────────────────

const CONFIG_STATUT = {
  [STATUTS_JOURNEE.VIDE]: {
    label: "Vide",
    className: "bg-muted text-muted-foreground border border-border",
    dot: "bg-muted-foreground",
  },
  [STATUTS_JOURNEE.PARTIEL]: {
    label: "En cours",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  [STATUTS_JOURNEE.CLOTURE]: {
    label: "Clôturé",
    className: "bg-green-50 text-green-700 border border-green-200",
    dot: "bg-green-500",
  },
};

const StatutBadge = ({ etat }) => {
  const config = CONFIG_STATUT[etat] || CONFIG_STATUT[STATUTS_JOURNEE.VIDE];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        config.className
      )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
};

// ─── Composant principal ─────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {string}   props.selectedDate        - YYYY-MM-DD
 * @param {string}   props.dateLabel            - Libellé formaté de la date
 * @param {Function} props.onPrev               - Aller au jour précédent
 * @param {Function} props.onNext               - Aller au jour suivant
 * @param {boolean}  props.canGoNext            - Jour suivant autorisé ?
 * @param {Object}   props.statutJournee        - Statut de la journée
 * @param {boolean}  props.loading              - Chargement en cours
 * @param {string}   [props.className]
 */
const BackDayBandeau = ({
  selectedDate,
  dateLabel,
  onPrev,
  onNext,
  canGoNext,
  statutJournee,
  loading = false,
  className,
}) => {
  const etat = statutJournee?.etat || STATUTS_JOURNEE.VIDE;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-4 py-2.5",
        "bg-background border-b border-border",
        "sticky top-0 z-20",
        className
      )}>

      {/* Navigation gauche */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onPrev}>
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {/* Date + statut */}
      <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate capitalize">
            {loading ? "Chargement…" : dateLabel}
          </span>
        </div>
        <StatutBadge etat={etat} />
      </div>

      {/* Navigation droite */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onNext}
        disabled={!canGoNext}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export { StatutBadge, CONFIG_STATUT };
export default BackDayBandeau;