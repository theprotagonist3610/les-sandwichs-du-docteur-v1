import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import useRapports from "@/hooks/useRapports";
import {
  getProduitIcon, getProduitLabel,
  STATUT_PAIEMENT_LABELS, STATUT_PAIEMENT_COLORS,
  formatMontant, formatDate, formatQte,
  calculerTournee,
} from "@/utils/distributionToolkit";

// ─── Constantes ───────────────────────────────────────────────────────────────

const PERIODES = [
  { id: "j7",  label: "7 jours"  },
  { id: "j30", label: "30 jours" },
  { id: "j90", label: "90 jours" },
  { id: "tout", label: "Tout"    },
];

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, sub, colorClass = "" }) => (
  <div className="rounded-xl border bg-card p-4 flex flex-col gap-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={cn("text-lg font-bold truncate", colorClass)}>{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
  </div>
);

// ─── Ligne historique ─────────────────────────────────────────────────────────

const LigneTournee = ({ tournee: t, prix }) => {
  const { vente_totale } = calculerTournee(
    t.lignes ?? [],
    t.distributeur?.taux_ristourne ?? 0,
  );
  const totalVendu = (t.lignes ?? []).reduce(
    (s, l) => s + Math.max(0, l.quantite_recue - l.quantite_recuperee),
    0,
  );

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5">
      {/* Date + distributeur */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate">{t.distributeur?.nom ?? "—"}</p>
          {t.distributeur?.zone && (
            <span className="text-[11px] text-muted-foreground">
              {t.distributeur.zone.nom}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(t.date_tournee)}</p>

        {/* Lignes produits */}
        {(t.lignes ?? []).length > 0 && (
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {t.lignes.map(l => {
              const vendu = l.quantite_recue - l.quantite_recuperee;
              return (
                <span key={l.type_produit} className="text-[11px] text-muted-foreground">
                  {getProduitIcon(l.type_produit)}&nbsp;
                  <span className="font-medium text-foreground">{vendu}</span>
                  /{l.quantite_recue}&nbsp;
                  <span className="text-[10px]">{getProduitLabel(l.type_produit, prix)}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Montants + statut */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <p className="text-sm font-semibold">{formatMontant(vente_totale)}</p>
        <Badge className={cn("text-[10px] border-0 px-1.5 py-0", STATUT_PAIEMENT_COLORS[t.statut_paiement])}>
          {STATUT_PAIEMENT_LABELS[t.statut_paiement] ?? t.statut_paiement}
        </Badge>
        {t.ristourne_due > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Rist.&nbsp;
            <span className="font-medium text-primary">{formatMontant(t.ristourne_due)}</span>
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Onglet ───────────────────────────────────────────────────────────────────

const OngletRapports = () => {
  const hook = useRapports();
  const { stats, prix, tournees, distributeurs, loading, periode, setPeriode,
          filtreIdDistributeur, setFiltreIdDistributeur, rafraichir } = hook;

  const produits = Object.keys(prix);

  return (
    <div className="flex flex-col gap-5">

      {/* ── Filtres ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {PERIODES.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriode(p.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0",
              periode === p.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}>
            {p.label}
          </button>
        ))}

        <Select
          value={filtreIdDistributeur ?? "tous"}
          onValueChange={v => setFiltreIdDistributeur(v === "tous" ? null : v)}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Tous" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les distributeurs</SelectItem>
            {distributeurs.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={rafraichir} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ── KPIs financiers ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              label="CA distribué"
              value={formatMontant(stats.ca_total)}
              sub={`${stats.nb_tournees} tournée${stats.nb_tournees > 1 ? "s" : ""}`}
            />
            <KpiCard
              label="Ristournes dues"
              value={formatMontant(stats.ristourne_due)}
              sub={`${stats.nb_distributeurs} distributeur${stats.nb_distributeurs > 1 ? "s" : ""}`}
              colorClass="text-orange-600 dark:text-orange-400"
            />
            <KpiCard
              label="Ristournes payées"
              value={formatMontant(stats.ristourne_payee)}
              colorClass="text-green-600 dark:text-green-400"
            />
            <KpiCard
              label="Solde restant"
              value={formatMontant(stats.solde)}
              colorClass={stats.solde > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}
            />
          </div>

          {/* ── Répartition par produit ── */}
          {produits.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Par produit</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {produits.map(p => {
                  const ag = stats.parProduit[p];
                  if (!ag) return null;
                  return (
                    <div key={p} className="rounded-xl border bg-card p-3 flex flex-col gap-2">
                      <p className="text-xs font-medium flex items-center gap-1.5">
                        {getProduitIcon(p)}
                        {getProduitLabel(p, prix)}
                      </p>
                      <div className="grid grid-cols-3 gap-1 text-center">
                        {[
                          { label: "Distribués", value: formatQte(ag.qte_recue) },
                          { label: "Vendus",     value: formatQte(ag.qte_vendue) },
                          { label: "CA",         value: formatMontant(ag.vente) },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-lg bg-muted/50 p-1.5">
                            <p className="text-[10px] text-muted-foreground">{label}</p>
                            <p className="text-xs font-semibold mt-0.5 truncate">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Historique des tournées ── */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">
              Historique
              <span className="text-xs font-normal text-muted-foreground ml-2">
                {tournees.length} tournée{tournees.length > 1 ? "s" : ""}
              </span>
            </h3>

            {tournees.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune tournée sur cette période
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {tournees.map(t => (
                  <LigneTournee key={t.id} tournee={t} prix={prix} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OngletRapports;
