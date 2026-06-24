import { useRef } from "react";
import { ArrowLeft, Wallet, Clock, MapPin, CreditCard, Users, Receipt } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useGSAP } from "@/shared/hooks/useGSAP";
import { staggerFadeInUp } from "@/lib/animations";
import BrutalKPI from "./BrutalKPI";
import BrutalBar from "./BrutalBar";
import BrutalTimeline from "./BrutalTimeline";
import useDepense from "@/features/insights/hooks/useDepense";

const Section = ({ label, icon: Icon, children, className = "" }) => (
  <div className={`border-3 border-foreground bg-card shadow-[3px_3px_0px_var(--foreground)] detail-section ${className}`}>
    <div className="px-4 py-2 border-b-2 border-foreground bg-muted font-bold uppercase tracking-wider text-xs flex items-center gap-2">
      {Icon && <Icon className="size-3.5" />}
      {label}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const DepenseDetailView = ({ categorie, dateFrom, dateTo, onBack }) => {
  const { depense, loading, error } = useDepense({ categorie, dateFrom, dateTo });
  const ref = useRef(null);

  useGSAP(() => {
    if (depense) staggerFadeInUp(".detail-section", { stagger: 0.06 });
  }, { scope: ref, dependencies: [depense?.categorie] });

  if (loading) {
    return (
      <div className="border-3 border-foreground bg-card p-8 text-center">
        <div className="inline-block w-6 h-6 border-3 border-foreground border-t-destructive animate-spin" />
        <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Button variant="outline" onClick={onBack} className="mb-4"><ArrowLeft className="size-4 mr-2" />Retour</Button>
        <div className="border-3 border-destructive bg-destructive/10 p-4 text-sm font-bold text-destructive">{error}</div>
      </div>
    );
  }

  if (!depense) return null;

  const fmt = (n) => (n ?? 0).toLocaleString("fr-FR");
  const maxJour = Math.max(...(depense.par_jour_semaine?.map((j) => j.montant) || [1]));
  const maxEmpl = Math.max(...(depense.par_emplacement?.map((e) => e.montant) || [1]));
  const maxCompte = Math.max(...(depense.par_compte?.map((c) => c.montant) || [1]));

  return (
    <div ref={ref} className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 detail-section border-3 border-foreground bg-destructive text-destructive-foreground shadow-[4px_4px_0px_var(--foreground)] p-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 text-destructive-foreground hover:bg-destructive-foreground/20">
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-lg lg:text-2xl uppercase tracking-tight truncate">{depense.categorie}</p>
          <p className="text-xs uppercase tracking-widest opacity-80">
            {depense.nb_operations} opérations · {Math.round(depense.part_budget * 100)}% du budget
          </p>
        </div>
        {depense.rang && (
          <div className="shrink-0 border-2 border-destructive-foreground px-3 py-1.5">
            <p className="font-extrabold text-lg tabular-nums">#{depense.rang.par_montant}</p>
            <p className="text-[9px] uppercase tracking-wider opacity-80">/ {depense.rang.total_categories}</p>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BrutalKPI value={depense.montant_total} label="Total" suffix="F" accent tendance={depense.tendance?.montant?.variation} />
        <BrutalKPI value={depense.nb_operations} label="Opérations" tendance={depense.tendance?.nb_operations?.variation} />
        <BrutalKPI value={depense.montant_moyen} label="Moy / opération" suffix="F" />
        {depense.prix_unitaire_moyen > 0 ? (
          <BrutalKPI value={depense.prix_unitaire_moyen} label={`Prix / ${depense.unite_principale || "u"}`} suffix="F" tendance={depense.tendance?.prix_unitaire?.variation} />
        ) : (
          <BrutalKPI value={depense.quantite_totale} label="Quantité totale" suffix={depense.unite_principale || ""} tendance={depense.tendance?.quantite?.variation} />
        )}
      </div>

      {/* Timeline */}
      {depense.timeline?.length > 1 && (
        <Section label="Évolution" icon={Clock}>
          <BrutalTimeline data={depense.timeline} dataKey="montant" label="Montant" />
        </Section>
      )}

      {/* Répartitions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Par jour */}
        <Section label="Par jour" icon={Clock}>
          <div className="space-y-2">
            {depense.par_jour_semaine?.map((j) => (
              <BrutalBar key={j.jour} label={j.jour} value={j.montant} max={maxJour} suffix=" F" color="bg-destructive" />
            ))}
          </div>
        </Section>

        {/* Par emplacement */}
        <Section label="Par emplacement" icon={MapPin}>
          <div className="space-y-2">
            {depense.par_emplacement?.map((e) => (
              <BrutalBar key={e.emplacement} label={e.emplacement.slice(0, 6)} value={e.montant} max={maxEmpl} suffix=" F" color="bg-accent" />
            ))}
            {(!depense.par_emplacement || depense.par_emplacement.length === 0) && (
              <p className="text-xs text-muted-foreground font-bold text-center py-4">Aucune donnée</p>
            )}
          </div>
        </Section>

        {/* Par compte */}
        <Section label="Par compte" icon={CreditCard}>
          <div className="space-y-2">
            {depense.par_compte?.map((c) => (
              <BrutalBar key={c.compte} label={c.label.slice(0, 6)} value={c.montant} max={maxCompte} suffix=" F" color="bg-primary" />
            ))}
          </div>
        </Section>
      </div>

      {/* Par utilisateur */}
      {depense.par_utilisateur?.length > 0 && (
        <Section label="Par utilisateur" icon={Users}>
          <div className="divide-y-2 divide-foreground">
            {depense.par_utilisateur.map((u, i) => (
              <div key={u.user_id} className="flex items-center gap-3 py-2">
                <span className="w-7 h-7 bg-destructive text-destructive-foreground border-2 border-foreground flex items-center justify-center text-xs font-extrabold shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-bold truncate">{u.nom}</span>
                <span className="text-xs font-bold tabular-nums text-muted-foreground">{u.nb} ops</span>
                <span className="text-xs font-bold tabular-nums">{fmt(u.montant)} F</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Opérations récentes */}
      {depense.operations_recentes?.length > 0 && (
        <Section label="Opérations récentes" icon={Receipt}>
          <div className="divide-y divide-foreground/30 max-h-[400px] overflow-y-auto">
            {depense.operations_recentes.map((op) => (
              <div key={op.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{op.motif}</p>
                  <p className="text-[10px] text-muted-foreground font-bold">
                    {op.date} · {op.user_nom}
                    {op.quantite > 0 && ` · ${op.quantite} ${op.unite}`}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-extrabold tabular-nums text-destructive">{fmt(op.montant)} F</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

export default DepenseDetailView;
