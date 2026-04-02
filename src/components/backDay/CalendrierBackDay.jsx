/**
 * CalendrierBackDay.jsx
 * Calendrier desktop — navigation rapide par jour avec indicateurs de statut
 * Affiche les 30 derniers jours avec légende ○ Vide / ◑ Partiel / ● Clôturé
 */

import { cn } from "@/lib/utils";
import { STATUTS_JOURNEE, formatDateFr } from "@/utils/backDaysToolkit";

// ─── Indicateur de statut ─────────────────────────────────────────────────────

const IndicateurStatut = ({ etat, size = "sm" }) => {
  const config = {
    [STATUTS_JOURNEE.VIDE]: { symbol: "○", className: "text-muted-foreground" },
    [STATUTS_JOURNEE.PARTIEL]: { symbol: "◑", className: "text-amber-500" },
    [STATUTS_JOURNEE.CLOTURE]: { symbol: "●", className: "text-green-500" },
  };
  const c = config[etat] || config[STATUTS_JOURNEE.VIDE];
  return (
    <span className={cn("font-bold leading-none", size === "sm" ? "text-xs" : "text-sm", c.className)}>
      {c.symbol}
    </span>
  );
};

// ─── Jour du calendrier ───────────────────────────────────────────────────────

const JourCalendrier = ({ jour, isSelected, onClick }) => {
  const date = new Date(jour.date + "T12:00:00");
  const jourSemaine = date.toLocaleDateString("fr-FR", { weekday: "short" });
  const jourMois = date.getDate();
  const mois = date.toLocaleDateString("fr-FR", { month: "short" });

  return (
    <button
      onClick={() => onClick(jour.date)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-colors",
        "hover:bg-accent",
        isSelected && "bg-accent border border-border"
      )}>
      {/* Indicateur statut */}
      <IndicateurStatut etat={jour.etat} />

      {/* Date */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-semibold text-foreground capitalize">
            {jourSemaine} {jourMois}
          </span>
          <span className="text-xs text-muted-foreground capitalize">{mois}</span>
        </div>
        {/* Mini stat */}
        {jour.etat !== STATUTS_JOURNEE.VIDE && (
          <p className="text-xs text-muted-foreground truncate">
            {jour.nb_commandes > 0 && `${jour.nb_commandes} cmd`}
            {jour.chiffre_affaires > 0 && ` · ${jour.chiffre_affaires.toLocaleString("fr-FR")} F`}
          </p>
        )}
      </div>
    </button>
  );
};

// ─── Légende ──────────────────────────────────────────────────────────────────

const Legende = () => (
  <div className="flex flex-col gap-1.5 px-5 py-4 border-t border-border">
    <p className="text-xs font-semibold text-muted-foreground mb-1">Légende</p>
    {[
      { etat: STATUTS_JOURNEE.VIDE, label: "Vide" },
      { etat: STATUTS_JOURNEE.PARTIEL, label: "En cours" },
      { etat: STATUTS_JOURNEE.CLOTURE, label: "Clôturé" },
    ].map(({ etat, label }) => (
      <div key={etat} className="flex items-center gap-2">
        <IndicateurStatut etat={etat} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    ))}
  </div>
);

// ─── Composant principal ─────────────────────────────────────────────────────

/**
 * @param {Object}   props
 * @param {Array}    props.jours          - [{ date, etat, nb_commandes, has_closure, chiffre_affaires }]
 * @param {string}   props.selectedDate   - YYYY-MM-DD
 * @param {Function} props.onSelectDate   - (dateStr) => void
 * @param {string}   [props.className]
 */
const CalendrierBackDay = ({ jours = [], selectedDate, onSelectDate, className }) => {
  // Grouper par mois pour l'affichage
  const parMois = {};
  jours.forEach((jour) => {
    const mois = jour.date.slice(0, 7); // YYYY-MM
    if (!parMois[mois]) parMois[mois] = [];
    parMois[mois].push(jour);
  });

  const moisOrdonnes = Object.keys(parMois).sort().reverse();

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      {/* Titre */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold">Jours passés</p>
        <p className="text-xs text-muted-foreground">30 derniers jours</p>
      </div>

      {/* Liste scrollable */}
      <div className="flex-1 overflow-y-auto py-2">
        {jours.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Aucune donnée</p>
        ) : (
          moisOrdonnes.map((mois) => {
            const date = new Date(mois + "-01T12:00:00");
            const labelMois = date.toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            });
            return (
              <div key={mois}>
                <p className="text-xs font-semibold text-muted-foreground px-4 pt-3 pb-1.5 capitalize">
                  {labelMois}
                </p>
                {parMois[mois].map((jour) => (
                  <JourCalendrier
                    key={jour.date}
                    jour={jour}
                    isSelected={jour.date === selectedDate}
                    onClick={onSelectDate}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Légende */}
      <Legende />
    </div>
  );
};

export default CalendrierBackDay;
