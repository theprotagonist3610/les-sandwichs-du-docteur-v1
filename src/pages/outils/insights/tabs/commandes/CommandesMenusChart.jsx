/**
 * CommandesMenusChart.jsx
 * Top/flop menus — ranking avec quantité + CA + ratio CA/total.
 *
 * Affichage custom (div+css) plutôt que recharts pour gérer
 * les deux dimensions (unités vs FCFA) proprement.
 *
 * Structure par menu (depuis useCommandeInsights) :
 *   { nom, quantite, ca, ratio }  — ratio = ca / caTotal
 */

import { cn } from "@/lib/utils";

// ─── Constantes d'affichage ───────────────────────────────────────────────────

const MAX_MENUS        = 10; // top 5 + flop 5 (ou top 10)
const COLOR_BAR_QTY   = "#0ea5e9"; // sky-500
const COLOR_BAR_CA    = "#22c55e"; // emerald-500

// ─── Ligne de menu ────────────────────────────────────────────────────────────

const MenuRow = ({ menu, maxQty, maxCA, rank }) => {
  const pctQty = maxQty > 0 ? (menu.quantite / maxQty) * 100 : 0;
  const pctCA  = maxCA  > 0 ? (menu.ca       / maxCA)  * 100 : 0;
  const ratioPct = Math.round(menu.ratio * 100 * 10) / 10; // 1 décimale

  return (
    <div className="flex flex-col gap-1.5 py-2.5 border-b border-border last:border-0">
      {/* Nom + rang + ratio */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn(
            "shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center",
            rank <= 3
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
              : "bg-muted text-muted-foreground"
          )}>
            {rank}
          </span>
          <span className="text-sm font-medium truncate">{menu.nom}</span>
        </div>
        <span className={cn(
          "shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full",
          ratioPct >= 20
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
            : ratioPct >= 10
            ? "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300"
            : "bg-muted text-muted-foreground"
        )}>
          {ratioPct} % du CA
        </span>
      </div>

      {/* Barre quantité */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-6 shrink-0">Qté</span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pctQty}%`, backgroundColor: COLOR_BAR_QTY }}
          />
        </div>
        <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 w-12 text-right shrink-0">
          {menu.quantite}
        </span>
      </div>

      {/* Barre CA */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-6 shrink-0">CA</span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pctCA}%`, backgroundColor: COLOR_BAR_CA }}
          />
        </div>
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 w-20 text-right shrink-0">
          {Math.round(menu.ca).toLocaleString("fr-FR")} F
        </span>
      </div>
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const CommandesMenusChart = ({ menus = [] }) => {
  if (!menus.length) return null;

  // Top MAX_MENUS menus par quantité
  const top    = menus.slice(0, MAX_MENUS);
  const maxQty = Math.max(...top.map((m) => m.quantite), 1);
  const maxCA  = top[0]?.ca ?? 1;

  return (
    <div className="bg-background rounded-xl border border-border p-4">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-sm font-semibold">Top menus — CA & quantité</p>
        <span className="text-xs text-muted-foreground">{menus.length} menus</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Classement par CA généré · ratio = part du CA total
      </p>

      <div>
        {top.map((menu, i) => (
          <MenuRow
            key={menu.nom}
            menu={menu}
            rank={i + 1}
            maxQty={maxQty}
            maxCA={maxCA}
          />
        ))}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: COLOR_BAR_QTY }} />
          Quantité vendue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: COLOR_BAR_CA }} />
          CA généré (F)
        </span>
      </div>
    </div>
  );
};

export default CommandesMenusChart;
