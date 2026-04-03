/**
 * ProductionCyclesPanel.jsx
 * Tableau de bord temps réel des schémas par_conservation et cyclique.
 *
 * Affiche pour chaque schéma :
 *  - Mode (conservation / cyclique)
 *  - Quantité disponible dans le lot actif
 *  - Jours avant péremption (coloré)
 *  - Prochain cycle estimé (cyclique uniquement)
 *  - Badge statut : "Relance requise" ou "En stock"
 *  - Raison si relance
 */

import { RefreshCw, PackageX, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getPeremptionCls = (jours) => {
  if (jours == null) return "text-muted-foreground";
  if (jours <= 1)    return "text-red-600 dark:text-red-400 font-semibold";
  if (jours <= 3)    return "text-amber-600 dark:text-amber-400 font-semibold";
  return "text-emerald-600 dark:text-emerald-400";
};

const getPeremptionLabel = (jours) => {
  if (jours == null) return "Pas de date";
  if (jours <= 0)    return "Périmé";
  if (jours === 1)   return "Demain";
  return `Dans ${jours}j`;
};

const MODE_CONFIG = {
  par_conservation: {
    label:  "Conservation",
    bg:     "bg-amber-50 dark:bg-amber-950",
    border: "border-amber-200 dark:border-amber-800",
    iconCn: "text-amber-500",
    pill:   "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  cyclique: {
    label:  "Cyclique",
    bg:     "bg-violet-50 dark:bg-violet-950",
    border: "border-violet-200 dark:border-violet-800",
    iconCn: "text-violet-500",
    pill:   "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  },
};

// ─── Carte d'un schéma ────────────────────────────────────────────────────────

const CycleCard = ({ schema, etat }) => {
  const mode    = schema.mode_production;
  const cfg     = MODE_CONFIG[mode] ?? MODE_CONFIG.par_conservation;
  const Icon    = mode === "cyclique" ? RefreshCw : PackageX;
  const besoin  = etat.besoinRelance;
  const qteDispo = etat.quantite_disponible ?? 0;
  const jours    = etat.jours_avant_peremption;
  const lot      = etat.lot;

  // Prochain cycle estimé (cyclique uniquement)
  let prochainCycle = null;
  if (mode === "cyclique" && schema.cycle_jours > 0 && lot?.date_production) {
    const derniere   = new Date(lot.date_production);
    const maintenant = new Date();
    const ecoules    = Math.floor((maintenant - derniere) / (1000 * 60 * 60 * 24));
    const restants   = schema.cycle_jours - ecoules;
    prochainCycle    = restants <= 0 ? "Maintenant" : `Dans ${restants}j`;
  }

  return (
    <div className={cn("rounded-xl border p-4 flex flex-col gap-3", cfg.bg, cfg.border)}>
      {/* En-tête */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", cfg.iconCn)} />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{schema.nom}</p>
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", cfg.pill)}>
              {cfg.label}
            </span>
          </div>
        </div>

        {/* Badge statut */}
        {besoin ? (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 shrink-0 whitespace-nowrap">
            <AlertTriangle className="w-3 h-3" />
            Relance requise
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 shrink-0 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3" />
            En stock
          </span>
        )}
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-2 gap-2">
        {/* Quantité disponible */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Stock dispo</span>
          {lot ? (
            <span className="text-sm font-bold">
              {qteDispo.toLocaleString("fr-FR")}
              <span className="text-xs font-normal ml-1 text-muted-foreground">
                {lot.unite ?? ""}
              </span>
            </span>
          ) : (
            <span className="text-sm font-bold text-red-600 dark:text-red-400">Aucun lot</span>
          )}
        </div>

        {/* Péremption */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Péremption</span>
          <span className={cn("text-sm", getPeremptionCls(jours))}>
            {getPeremptionLabel(jours)}
          </span>
        </div>

        {/* Prochain cycle (cyclique uniquement) */}
        {mode === "cyclique" && (
          <div className="flex flex-col gap-0.5 col-span-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              <Clock className="w-3 h-3 inline mr-0.5" />
              Prochain cycle ({schema.cycle_jours}j)
            </span>
            <span className="text-sm font-medium">
              {prochainCycle ?? "—"}
            </span>
          </div>
        )}

        {/* Seuil de relance (cyclique avec seuil) */}
        {mode === "cyclique" && schema.seuil_relance?.quantite > 0 && (
          <div className="flex flex-col gap-0.5 col-span-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Seuil de relance</span>
            <span className="text-sm text-muted-foreground">
              {schema.seuil_relance.quantite} {schema.seuil_relance.unite}
            </span>
          </div>
        )}
      </div>

      {/* Raison si relance requise */}
      {besoin && etat.raison && (
        <p className="text-xs text-red-700 dark:text-red-300 border-t border-red-200 dark:border-red-800 pt-2">
          {etat.raison}
        </p>
      )}
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const ProductionCyclesPanel = ({ cyclesDashboard = [] }) => {
  if (!cyclesDashboard.length) return null;

  const aRelancer  = cyclesDashboard.filter((c) => c.etat.besoinRelance);
  const enStock    = cyclesDashboard.filter((c) => !c.etat.besoinRelance);

  // Trier : relance requise en premier, puis en stock
  const sorted = [...aRelancer, ...enStock];

  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-sm font-semibold">Suivi des cycles & conservations</p>
        <span className="text-xs text-muted-foreground">
          {sorted.length} schéma{sorted.length > 1 ? "s" : ""}
          {aRelancer.length > 0 && (
            <span className="ml-1 text-red-600 dark:text-red-400 font-semibold">
              · {aRelancer.length} à relancer
            </span>
          )}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        État temps réel des lots actifs en stock
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((item) => (
          <CycleCard key={item.schema.id} schema={item.schema} etat={item.etat} />
        ))}
      </div>
    </div>
  );
};

export default ProductionCyclesPanel;
