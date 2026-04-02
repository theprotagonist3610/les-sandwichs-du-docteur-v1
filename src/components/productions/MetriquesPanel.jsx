/**
 * MetriquesPanel.jsx
 * Panneau d'affichage des métriques rétroanalytiques d'un schéma
 */

import { TrendingUp, TrendingDown, Minus, Package, Clock, DollarSign, BarChart2 } from "lucide-react";
import { CATEGORIES_LABELS } from "@/utils/productionToolkit";

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n, digits = 1) =>
  typeof n === "number" ? n.toFixed(digits) : "—";

const TendanceIcon = ({ valeur }) => {
  if (!valeur || valeur === 0) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  if (valeur > 0) return <TrendingUp className="w-3.5 h-3.5 text-green-500" />;
  return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
};

const StatItem = ({ label, value, sub, trend }) => (
  <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
    <div className="flex items-center justify-between gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {trend !== undefined && <TendanceIcon valeur={trend} />}
    </div>
    <span className="text-sm font-semibold text-foreground">{value}</span>
    {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
  </div>
);

// ── RendementBarre ──────────────────────────────────────────────────────────────

const RendementBarre = ({ taux }) => {
  const pct = Math.min(Math.max(taux || 0, 0), 150);
  const couleur =
    pct >= 95
      ? "bg-green-500"
      : pct >= 80
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${couleur} rounded-full transition-all`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs font-medium w-12 text-right">
        {fmt(taux)}%
      </span>
    </div>
  );
};

// ── MetriquesPanel ─────────────────────────────────────────────────────────────

const MetriquesPanel = ({ schema, metriques, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground animate-pulse">
          Chargement des métriques...
        </p>
      </div>
    );
  }

  if (!metriques) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <BarChart2 className="w-8 h-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground text-center">
          Aucune production terminée pour ce schéma.
          <br />
          Les métriques apparaîtront après la première production.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Résumé global */}
      <div className="grid grid-cols-2 gap-2">
        <StatItem
          label="Productions"
          value={metriques.nb_productions}
        />
        <StatItem
          label="Volume total"
          value={`${metriques.volume_total_produit} ${schema?.rendement_estime?.unite || ""}`}
        />
        <StatItem
          label="Fréquence"
          value={
            metriques.frequence_production > 0
              ? `${fmt(metriques.frequence_production, 2)}/j`
              : "—"
          }
          sub="productions par jour"
        />
        <StatItem
          label="Durée moy."
          value={
            metriques.duree_moyenne_minutes
              ? `${metriques.duree_moyenne_minutes} min`
              : "—"
          }
          sub={
            metriques.ecart_duree_moyen
              ? `Écart : ${metriques.ecart_duree_moyen > 0 ? "+" : ""}${metriques.ecart_duree_moyen} min`
              : undefined
          }
        />
      </div>

      {/* Rendement */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Rendement
          </span>
          {metriques.tendance_rendement !== 0 && (
            <span
              className={`text-xs font-medium ml-auto ${
                metriques.tendance_rendement > 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}>
              {metriques.tendance_rendement > 0 ? "+" : ""}
              {fmt(metriques.tendance_rendement)}%
            </span>
          )}
        </div>
        <RendementBarre taux={metriques.taux_rendement_moyen} />
        <div className="grid grid-cols-3 gap-2">
          <StatItem label="Moyen" value={`${fmt(metriques.taux_rendement_moyen)}%`} />
          <StatItem label="Min" value={`${fmt(metriques.taux_rendement_min)}%`} />
          <StatItem label="Max" value={`${fmt(metriques.taux_rendement_max)}%`} />
        </div>
      </div>

      {/* Coûts */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Coûts
          </span>
          {metriques.evolution_cout !== 0 && (
            <span
              className={`text-xs font-medium ml-auto ${
                metriques.evolution_cout > 0
                  ? "text-red-600"
                  : "text-green-600"
              }`}>
              {metriques.evolution_cout > 0 ? "+" : ""}
              {fmt(metriques.evolution_cout)}%
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatItem
            label="Coût unitaire moy."
            value={`${metriques.cout_unitaire_moyen?.toLocaleString("fr-FR")} F`}
            sub={`Min: ${metriques.cout_unitaire_min?.toLocaleString("fr-FR")} — Max: ${metriques.cout_unitaire_max?.toLocaleString("fr-FR")}`}
            trend={metriques.evolution_cout}
          />
          <StatItem
            label="Coût total moy."
            value={`${metriques.cout_total_moyen?.toLocaleString("fr-FR")} F`}
            sub={
              metriques.ecart_cout_moyen
                ? `Écart moy. : ${metriques.ecart_cout_moyen > 0 ? "+" : ""}${metriques.ecart_cout_moyen?.toLocaleString("fr-FR")} F`
                : undefined
            }
          />
        </div>
      </div>

      {/* Opérateurs */}
      {metriques.productions_par_operateur?.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Par opérateur
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {metriques.productions_par_operateur.map((op) => (
              <div
                key={op.operateur_id}
                className="flex items-center justify-between px-2.5 py-1.5 bg-muted/30 rounded-md">
                <span className="text-xs font-medium">{op.nom}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{op.nb_productions} prod.</span>
                  {op.taux_rendement_moyen > 0 && (
                    <span>{fmt(op.taux_rendement_moyen)}% rdt</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MetriquesPanel;
