import { useRef } from "react";
import { ArrowLeft, Package, Users, Clock, MapPin, CreditCard, Truck, Store } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useGSAP } from "@/shared/hooks/useGSAP";
import { staggerFadeInUp } from "@/lib/animations";
import BrutalKPI from "./BrutalKPI";
import BrutalBar from "./BrutalBar";
import BrutalTimeline from "./BrutalTimeline";
import useProduct from "@/features/insights/hooks/useProduct";

const Section = ({ label, icon: Icon, children, className = "" }) => (
  <div className={`border-3 border-foreground bg-card shadow-[3px_3px_0px_var(--foreground)] detail-section ${className}`}>
    <div className="px-4 py-2 border-b-2 border-foreground bg-muted font-bold uppercase tracking-wider text-xs flex items-center gap-2">
      {Icon && <Icon className="size-3.5" />}
      {label}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const ProductDetailView = ({ menuId, dateFrom, dateTo, onBack }) => {
  const { product, loading, error } = useProduct({ menuId, dateFrom, dateTo });
  const ref = useRef(null);

  useGSAP(() => {
    if (product) staggerFadeInUp(".detail-section", { stagger: 0.06 });
  }, { scope: ref, dependencies: [product?.menu_id] });

  if (loading) {
    return (
      <div className="border-3 border-foreground bg-card p-8 text-center">
        <div className="inline-block w-6 h-6 border-3 border-foreground border-t-primary animate-spin" />
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

  if (!product) return null;

  const fmt = (n) => (n ?? 0).toLocaleString("fr-FR");
  const maxJour = Math.max(...(product.par_jour_semaine?.map((j) => j.quantite) || [1]));
  const maxHeure = Math.max(...(product.par_heure?.map((h) => h.quantite) || [1]));
  const maxPdv = Math.max(...(product.par_pdv?.map((p) => p.ca) || [1]));

  return (
    <div ref={ref} className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 detail-section border-3 border-foreground bg-primary text-primary-foreground shadow-[4px_4px_0px_var(--foreground)] p-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 text-primary-foreground hover:bg-primary-foreground/20">
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-lg lg:text-2xl uppercase tracking-tight truncate">{product.nom}</p>
          {product.type && <p className="text-xs uppercase tracking-widest opacity-80">{product.type}</p>}
        </div>
        {product.rang && (
          <div className="shrink-0 border-2 border-primary-foreground px-3 py-1.5">
            <p className="font-extrabold text-lg tabular-nums">#{product.rang.par_quantite}</p>
            <p className="text-[9px] uppercase tracking-wider opacity-80">/ {product.rang.total_produits}</p>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BrutalKPI
          value={product.quantite_totale}
          label="Unités"
          accent
          tendance={product.tendance?.quantite?.variation}
        />
        <BrutalKPI
          value={product.ca_total}
          label="CA"
          suffix="F"
          tendance={product.tendance?.ca?.variation}
        />
        <BrutalKPI
          value={product.prix_moyen_vente}
          label="Prix moyen"
          suffix="F"
          tendance={product.tendance?.prix_moyen?.variation}
        />
        <BrutalKPI
          value={product.nb_commandes}
          label="Commandes"
        />
      </div>

      {/* Timeline */}
      {product.timeline?.length > 1 && (
        <Section label="Évolution" icon={Clock}>
          <BrutalTimeline data={product.timeline} dataKey="ca" label="CA" />
        </Section>
      )}

      {/* Répartitions — grille 1 col mobile, 3 col desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Par jour de semaine */}
        <Section label="Par jour" icon={Clock}>
          <div className="space-y-2">
            {product.par_jour_semaine?.map((j) => (
              <BrutalBar key={j.jour} label={j.jour} value={j.quantite} max={maxJour} suffix=" u" />
            ))}
          </div>
        </Section>

        {/* Par type + paiement */}
        <div className="space-y-4">
          <Section label="Par type" icon={Truck}>
            <div className="space-y-2">
              {Object.entries(product.par_type || {}).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between p-2 border-2 border-foreground">
                  <div className="flex items-center gap-2">
                    {type === "livraison" ? <Truck className="size-4" /> : <Store className="size-4" />}
                    <span className="text-xs font-bold uppercase">{type}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold tabular-nums">{fmt(data.quantite)} u</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{fmt(data.ca)} F</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section label="Par paiement" icon={CreditCard}>
            <div className="space-y-2">
              {Object.entries(product.par_paiement || {}).filter(([, v]) => v > 0).map(([mode, montant]) => {
                const total = Object.values(product.par_paiement).reduce((s, v) => s + v, 0);
                const pct = total > 0 ? Math.round((montant / total) * 100) : 0;
                return (
                  <div key={mode} className="flex items-center justify-between p-2 border-2 border-foreground">
                    <span className="text-xs font-bold uppercase">{mode}</span>
                    <div>
                      <span className="text-xs font-bold tabular-nums">{pct}%</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{fmt(montant)} F</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        {/* Par PDV */}
        <Section label="Par point de vente" icon={MapPin}>
          <div className="space-y-2">
            {product.par_pdv?.map((pdv) => (
              <BrutalBar key={pdv.pdv_id} label={pdv.pdv_nom?.slice(0, 6)} value={pdv.ca} max={maxPdv} suffix=" F" color="bg-accent" />
            ))}
            {(!product.par_pdv || product.par_pdv.length === 0) && (
              <p className="text-xs text-muted-foreground font-bold text-center py-4">Aucune donnée PDV</p>
            )}
          </div>
        </Section>
      </div>

      {/* Heures de pointe */}
      {product.par_heure?.length > 0 && (
        <Section label="Heures de pointe" icon={Clock}>
          <div className="space-y-1.5">
            {product.par_heure.map((h) => {
              const isPeak = h.quantite === maxHeure;
              return (
                <BrutalBar
                  key={h.heure}
                  label={`${h.heure}h`}
                  value={h.quantite}
                  max={maxHeure}
                  suffix=" u"
                  color={isPeak ? "bg-destructive" : "bg-primary"}
                />
              );
            })}
          </div>
        </Section>
      )}

      {/* Top clients */}
      {product.top_clients?.length > 0 && (
        <Section label="Top clients" icon={Users}>
          <div className="divide-y-2 divide-foreground">
            {product.top_clients.slice(0, 8).map((cl, i) => (
              <div key={cl.client} className="flex items-center gap-3 py-2">
                <span className="w-7 h-7 bg-accent border-2 border-foreground flex items-center justify-center text-xs font-extrabold shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-bold truncate">{cl.client}</span>
                <span className="text-xs font-bold tabular-nums text-muted-foreground">{cl.nb_commandes} cmd</span>
                <span className="text-xs font-bold tabular-nums">{cl.quantite} u</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

export default ProductDetailView;
