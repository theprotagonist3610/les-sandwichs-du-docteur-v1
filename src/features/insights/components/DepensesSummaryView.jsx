import { useState, useRef } from "react";
import { Search, SlidersHorizontal, TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useGSAP } from "@/shared/hooks/useGSAP";
import { staggerFadeInUp } from "@/lib/animations";
import BrutalKPI from "./BrutalKPI";
import useSummaryOfDepenses from "@/features/insights/hooks/useSummaryOfDepenses";

const CategorieRow = ({ cat, rank, maxMontant, onClick }) => {
  const pct = maxMontant > 0 ? (cat.montant_total / maxMontant) * 100 : 0;
  const fmt = (n) => (n ?? 0).toLocaleString("fr-FR");

  return (
    <div
      onClick={() => onClick(cat.categorie)}
      className="flex items-center gap-3 p-3 lg:p-4 border-b-2 border-foreground hover:bg-destructive/10 active:bg-destructive/20 cursor-pointer transition-colors duration-100 cat-row"
    >
      <div className="shrink-0 w-10 h-10 lg:w-12 lg:h-12 bg-destructive text-destructive-foreground border-2 border-foreground flex items-center justify-center font-extrabold text-sm lg:text-base">
        #{rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm uppercase tracking-wide truncate">{cat.categorie}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
          <span>{cat.nb_operations} ops</span>
          {cat.unite_principale && <span>· {fmt(cat.quantite_totale)} {cat.unite_principale}</span>}
          <span>· moy {fmt(cat.montant_moyen)} F</span>
        </div>
        <div className="mt-1.5 h-3 bg-muted border border-foreground">
          <div className="h-full bg-destructive transition-all duration-100" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-bold">
          {Math.round(cat.part_budget * 100)}% du budget
        </p>
      </div>
      <div className="shrink-0 text-right space-y-0.5">
        <p className="font-extrabold tabular-nums text-sm text-destructive">{fmt(cat.montant_total)} F</p>
        {cat.prix_unitaire_moyen > 0 && (
          <p className="text-[10px] tabular-nums text-muted-foreground font-bold">{fmt(cat.prix_unitaire_moyen)} F/{cat.unite_principale}</p>
        )}
        {cat.tendance_montant !== null && (
          <div className={`inline-flex items-center gap-0.5 px-1 py-0.5 border border-foreground text-[9px] font-bold ${cat.tendance_montant <= 0 ? "bg-emerald-300 text-emerald-950" : "bg-red-300 text-red-950"}`}>
            {cat.tendance_montant > 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
            {cat.tendance_montant > 0 ? "+" : ""}{cat.tendance_montant}%
          </div>
        )}
      </div>
    </div>
  );
};

const DepensesSummaryView = ({ dateFrom, dateTo, onSelectCategorie }) => {
  const [sortBy, setSortBy] = useState("montant_total");
  const [search, setSearch] = useState("");
  const listRef = useRef(null);

  const { categories, totaux, top_operations, loading, error } = useSummaryOfDepenses({
    dateFrom, dateTo, sortBy, sortOrder: "desc",
  });

  useGSAP(() => {
    if (categories.length > 0) staggerFadeInUp(".cat-row", { stagger: 0.03 });
  }, { scope: listRef, dependencies: [categories.length, sortBy] });

  const filtered = search
    ? categories.filter((c) => c.categorie.toLowerCase().includes(search.toLowerCase()))
    : categories;

  const maxMontant = filtered.length > 0 ? Math.max(...filtered.map((c) => c.montant_total)) : 0;
  const fmt = (n) => (n ?? 0).toLocaleString("fr-FR");

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une catégorie..." className="pl-9 h-10" />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px] h-10">
            <SlidersHorizontal className="size-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="montant_total">Montant total</SelectItem>
            <SelectItem value="nb_operations">Nb opérations</SelectItem>
            <SelectItem value="montant_moyen">Montant moyen</SelectItem>
            <SelectItem value="categorie">Catégorie</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs résumé */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BrutalKPI value={totaux.montant_total} label="Total dépenses" suffix="F" accent />
        <BrutalKPI value={totaux.nb_operations} label="Opérations" />
        <BrutalKPI value={totaux.nb_categories} label="Catégories" />
        <BrutalKPI value={totaux.montant_moyen_par_jour} label="Moy / jour" suffix="F" />
      </div>

      {/* Top 3 opérations les plus chères */}
      {top_operations.length > 0 && (
        <div className="border-3 border-destructive bg-destructive/5 shadow-[3px_3px_0px_var(--destructive)]">
          <div className="px-4 py-2 border-b-2 border-destructive bg-destructive text-destructive-foreground font-bold uppercase tracking-wider text-xs flex items-center gap-2">
            <AlertTriangle className="size-3.5" /> Top dépenses individuelles
          </div>
          <div className="divide-y divide-destructive/30">
            {top_operations.map((op, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-extrabold text-destructive text-sm">#{i + 1}</span>
                  <span className="text-xs font-bold truncate">{op.motif}</span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-extrabold tabular-nums text-sm">{fmt(op.montant)} F</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{op.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste catégories */}
      {loading ? (
        <div className="border-3 border-foreground bg-card p-8 text-center">
          <div className="inline-block w-6 h-6 border-3 border-foreground border-t-destructive animate-spin" />
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Chargement...</p>
        </div>
      ) : error ? (
        <div className="border-3 border-destructive bg-destructive/10 p-4 text-sm font-bold text-destructive">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="border-3 border-foreground bg-card p-8 text-center">
          <Wallet className="size-10 mx-auto text-muted-foreground mb-2" />
          <p className="font-bold uppercase text-sm">Aucune dépense trouvée</p>
        </div>
      ) : (
        <div ref={listRef} className="border-3 border-foreground bg-card shadow-[4px_4px_0px_var(--foreground)]">
          <div className="px-4 py-2 border-b-2 border-foreground bg-accent text-accent-foreground font-bold uppercase tracking-wider text-xs flex items-center justify-between">
            <span>{filtered.length} catégories</span>
            <span className="tabular-nums">{fmt(totaux.montant_total)} F</span>
          </div>
          {filtered.map((c, i) => (
            <CategorieRow key={c.categorie} cat={c} rank={i + 1} maxMontant={maxMontant} onClick={onSelectCategorie} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DepensesSummaryView;
