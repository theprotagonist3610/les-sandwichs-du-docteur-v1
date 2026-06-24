import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, Wallet, Infinity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import ProductsSummaryView from "@/features/insights/components/ProductsSummaryView";
import ProductDetailView from "@/features/insights/components/ProductDetailView";
import DepensesSummaryView from "@/features/insights/components/DepensesSummaryView";
import DepenseDetailView from "@/features/insights/components/DepenseDetailView";

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

const PRESETS = [
  { label: "7J", from: () => daysAgo(7), to: today },
  { label: "30J", from: () => daysAgo(30), to: today },
  { label: "90J", from: () => daysAgo(90), to: today },
  { label: "ALL TIME", from: () => null, to: () => null },
];

const TabProduits = ({ dateFrom, dateTo }) => {
  const [selectedProductId, setSelectedProductId] = useState(null);

  if (selectedProductId) {
    return (
      <ProductDetailView
        menuId={selectedProductId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onBack={() => setSelectedProductId(null)}
      />
    );
  }

  return (
    <ProductsSummaryView
      dateFrom={dateFrom}
      dateTo={dateTo}
      onSelectProduct={(id) => setSelectedProductId(id)}
    />
  );
};

const TabFinances = ({ dateFrom, dateTo }) => {
  const [selectedCategorie, setSelectedCategorie] = useState(null);

  if (selectedCategorie) {
    return (
      <DepenseDetailView
        categorie={selectedCategorie}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onBack={() => setSelectedCategorie(null)}
      />
    );
  }

  return (
    <DepensesSummaryView
      dateFrom={dateFrom}
      dateTo={dateTo}
      onSelectCategorie={(cat) => setSelectedCategorie(cat)}
    />
  );
};

const Statistiques = () => {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState(() => daysAgo(30));
  const [dateTo, setDateTo] = useState(today);
  const [activePreset, setActivePreset] = useState("30J");

  const handlePreset = (preset) => {
    setActivePreset(preset.label);
    setDateFrom(preset.from());
    setDateTo(preset.to());
  };

  const handleCustomDate = (setter, value) => {
    setActivePreset(null);
    setter(value);
  };

  const isAllTime = dateFrom === null && dateTo === null;

  return (
    <div className="min-h-screen px-4 lg:px-8 py-4 lg:py-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/comptabilite")} className="shrink-0">
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-2xl lg:text-4xl font-bold flex-1">STATISTIQUES</h1>
        </div>

        {/* Période : presets + custom */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {/* Presets brutaux */}
          <div className="flex gap-0">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p)}
                className={`px-3 lg:px-4 py-2 border-2 border-foreground text-xs font-bold uppercase tracking-wider transition-all duration-100 first:border-r-0 [&:nth-child(2)]:border-r-0 [&:nth-child(3)]:border-r-0 ${
                  activePreset === p.label
                    ? "bg-primary text-primary-foreground shadow-none"
                    : "bg-card hover:bg-accent/30 active:translate-x-[1px] active:translate-y-[1px]"
                }`}
              >
                {p.label === "ALL TIME" ? (
                  <span className="flex items-center gap-1">
                    <Infinity className="size-3.5" />
                    <span className="hidden sm:inline">All time</span>
                  </span>
                ) : p.label}
              </button>
            ))}
          </div>

          {/* Custom dates */}
          {!isAllTime && (
            <div className="flex items-center gap-2 ml-2">
              <Input
                type="date"
                value={dateFrom || ""}
                onChange={(e) => handleCustomDate(setDateFrom, e.target.value)}
                className="h-9 w-[130px] text-xs"
              />
              <span className="text-xs font-bold">→</span>
              <Input
                type="date"
                value={dateTo || ""}
                onChange={(e) => handleCustomDate(setDateTo, e.target.value)}
                className="h-9 w-[130px] text-xs"
              />
            </div>
          )}

          {isAllTime && (
            <span className="ml-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Toutes les données
            </span>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="produits" className="w-full">
          <TabsList className="flex w-full sm:w-auto gap-0 p-0 bg-transparent h-auto mb-6">
            <TabsTrigger
              value="produits"
              className="flex items-center gap-2 px-5 lg:px-8 py-3 border-2 border-foreground border-r-0 font-bold uppercase text-xs lg:text-sm tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none shrink-0"
            >
              <ShoppingBag className="size-4" />
              Produits
            </TabsTrigger>
            <TabsTrigger
              value="finances"
              className="flex items-center gap-2 px-5 lg:px-8 py-3 border-2 border-foreground font-bold uppercase text-xs lg:text-sm tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none shrink-0"
            >
              <Wallet className="size-4" />
              Finances
            </TabsTrigger>
          </TabsList>

          <TabsContent value="produits" className="mt-0">
            <TabProduits dateFrom={dateFrom} dateTo={dateTo} />
          </TabsContent>

          <TabsContent value="finances" className="mt-0">
            <TabFinances dateFrom={dateFrom} dateTo={dateTo} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Statistiques;
