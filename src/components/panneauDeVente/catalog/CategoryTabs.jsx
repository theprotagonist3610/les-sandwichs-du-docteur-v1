import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Coffee,
  Sandwich,
  Cookie,
  UtensilsCrossed,
  LayoutGrid,
} from "lucide-react";

/**
 * Onglets de catégories pour filtrer le catalogue
 */
const CategoryTabs = ({
  activeCategory,
  onCategoryChange,
  categories,
  className,
}) => {
  // Icônes par type de catégorie
  const getCategoryIcon = (type) => {
    switch (type) {
      case "tous":
        return <LayoutGrid className="w-4 h-4" />;
      case "sandwich":
        return <Sandwich className="w-4 h-4" />;
      case "boisson":
        return <Coffee className="w-4 h-4" />;
      case "dessert":
        return <Cookie className="w-4 h-4" />;
      case "menu complet":
        return <UtensilsCrossed className="w-4 h-4" />;
      default:
        return <LayoutGrid className="w-4 h-4" />;
    }
  };

  // Labels affichés
  const getCategoryLabel = (type) => {
    switch (type) {
      case "tous":
        return "Tous";
      case "sandwich":
        return "Sandwichs";
      case "boisson":
        return "Boissons";
      case "dessert":
        return "Desserts";
      case "menu complet":
        return "Menus";
      default:
        return type;
    }
  };

  // Liste complète des catégories
  const allCategories = ["tous", ...categories];

  return (
    <ScrollArea className={cn("w-full", className)}>
      <div className="flex gap-2 pb-2">
        {allCategories.map((category) => (
          <Button
            key={category}
            variant={activeCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange(category)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap transition-all",
              activeCategory === category
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent"
            )}>
            {getCategoryIcon(category)}
            <span>{getCategoryLabel(category)}</span>
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export default CategoryTabs;
