import { useState, useRef } from "react";
import { Search, SlidersHorizontal, TrendingUp, TrendingDown, Package } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useGSAP } from "@/shared/hooks/useGSAP";
import { staggerFadeInUp } from "@/lib/animations";
import NumberTicker from "@/shared/components/animations/NumberTicker";
import BrutalKPI from "./BrutalKPI";
import useSummaryOfProducts from "@/features/insights/hooks/useSummaryOfProducts";

const ProductRow = ({ product, rank, maxCA, onClick }) => {
  const pct = maxCA > 0 ? (product.ca_total / maxCA) * 100 : 0;
  const fmt = (n) => n.toLocaleString("fr-FR");

  return (
    <div
      onClick={() => onClick(product.menu_id || product.nom)}
      className="flex items-center gap-3 p-3 lg:p-4 border-b-2 border-foreground hover:bg-accent/20 active:bg-accent/40 cursor-pointer transition-colors duration-100 product-row"
    >
      {/* Rang */}
      <div className="shrink-0 w-10 h-10 lg:w-12 lg:h-12 bg-primary text-primary-foreground border-2 border-foreground flex items-center justify-center font-extrabold text-sm lg:text-base">
        #{rank}
      </div>

      {/* Info produit */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm uppercase tracking-wide truncate">{product.nom}</p>
        {product.type && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{product.type}</span>
        )}
        {/* Barre CA */}
        <div className="mt-1.5 h-3 bg-muted border border-foreground">
          <div className="h-full bg-primary transition-all duration-100" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-bold">
          {Math.round(product.part_ca * 100)}% du CA
        </p>
      </div>

      {/* Stats */}
      <div className="shrink-0 text-right space-y-0.5">
        <p className="font-extrabold tabular-nums text-sm">{fmt(product.quantite_totale)} u</p>
        <p className="font-bold tabular-nums text-xs text-primary">{fmt(product.ca_total)} F</p>
        {product.tendance_quantite !== null && (
          <div className={`inline-flex items-center gap-0.5 px-1 py-0.5 border border-foreground text-[9px] font-bold ${product.tendance_quantite >= 0 ? "bg-emerald-300 text-emerald-950" : "bg-red-300 text-red-950"}`}>
            {product.tendance_quantite >= 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
            {product.tendance_quantite >= 0 ? "+" : ""}{product.tendance_quantite}%
          </div>
        )}
      </div>
    </div>
  );
};

const ProductsSummaryView = ({ dateFrom, dateTo, onSelectProduct }) => {
  const [type, setType] = useState(null);
  const [sortBy, setSortBy] = useState("quantite_totale");
  const [sortOrder] = useState("desc");
  const [search, setSearch] = useState("");
  const listRef = useRef(null);

  const { products, totaux, loading, error } = useSummaryOfProducts({
    dateFrom,
    dateTo,
    type,
    sortBy,
    sortOrder,
  });

  useGSAP(() => {
    if (products.length > 0) staggerFadeInUp(".product-row", { stagger: 0.03 });
  }, { scope: listRef, dependencies: [products.length, sortBy, type] });

  const filtered = search
    ? products.filter((p) => p.nom.toLowerCase().includes(search.toLowerCase()))
    : products;

  const maxCA = filtered.length > 0 ? Math.max(...filtered.map((p) => p.ca_total)) : 0;

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="pl-9 h-10"
          />
        </div>
        <Select value={type || "tous"} onValueChange={(v) => setType(v === "tous" ? null : v)}>
          <SelectTrigger className="w-[140px] h-10">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous types</SelectItem>
            <SelectItem value="sandwich">Sandwich</SelectItem>
            <SelectItem value="boisson">Boisson</SelectItem>
            <SelectItem value="salade">Salade</SelectItem>
            <SelectItem value="dessert">Dessert</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px] h-10">
            <SlidersHorizontal className="size-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quantite_totale">Volume</SelectItem>
            <SelectItem value="ca_total">Chiffre d'affaires</SelectItem>
            <SelectItem value="prix_moyen_vente">Prix moyen</SelectItem>
            <SelectItem value="nom">Nom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs résumé */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BrutalKPI value={totaux.ca_total} label="CA total" suffix="F" accent />
        <BrutalKPI value={totaux.quantite_totale} label="Unités vendues" />
        <BrutalKPI value={totaux.nb_commandes} label="Commandes" />
        <BrutalKPI value={totaux.nb_produits_distincts} label="Produits" />
      </div>

      {/* Liste */}
      {loading ? (
        <div className="border-3 border-foreground bg-card p-8 text-center">
          <div className="inline-block w-6 h-6 border-3 border-foreground border-t-primary animate-spin" />
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Chargement...</p>
        </div>
      ) : error ? (
        <div className="border-3 border-destructive bg-destructive/10 p-4 text-sm font-bold text-destructive">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="border-3 border-foreground bg-card p-8 text-center">
          <Package className="size-10 mx-auto text-muted-foreground mb-2" />
          <p className="font-bold uppercase text-sm">Aucun produit trouvé</p>
          <p className="text-xs text-muted-foreground mt-1">Modifiez les filtres ou la période</p>
        </div>
      ) : (
        <div ref={listRef} className="border-3 border-foreground bg-card shadow-[4px_4px_0px_var(--foreground)]">
          <div className="px-4 py-2 border-b-2 border-foreground bg-accent text-accent-foreground font-bold uppercase tracking-wider text-xs flex items-center justify-between">
            <span>{filtered.length} produits</span>
            <span className="tabular-nums">{totaux.ca_total.toLocaleString("fr-FR")} F</span>
          </div>
          {filtered.map((p, i) => (
            <ProductRow
              key={p.menu_id || p.nom}
              product={p}
              rank={i + 1}
              maxCA={maxCA}
              onClick={onSelectProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductsSummaryView;
