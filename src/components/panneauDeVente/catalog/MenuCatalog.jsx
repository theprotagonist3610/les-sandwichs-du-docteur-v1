import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import CategoryTabs from "./CategoryTabs";
import MenuCard from "./MenuCard";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Catalogue complet des menus avec recherche et filtres
 * @param {boolean} compact - Mode compact sans images (pour mobile)
 */
const MenuCatalog = ({
  menus,
  loading,
  error,
  activeCategory,
  onCategoryChange,
  searchTerm,
  onSearchChange,
  onAddToCart,
  cartItems,
  categories,
  compact = false,
  className,
}) => {
  // Vérifier si un menu est dans le panier et obtenir sa quantité
  const getCartQuantity = (menuId) => {
    const cartItem = cartItems.find((item) => item.menu.id === menuId);
    return cartItem ? cartItem.quantite : 0;
  };

  // Mode compact (mobile) - Layout fixed indépendant
  if (compact) {
    return (
      <div className="fixed inset-0 top-[57px] bottom-0 bg-background flex flex-col">
        {/* Header fixe: recherche + catégories */}
        <div className="flex-shrink-0 px-4 pt-4 pb-2 bg-background">
          {/* Barre de recherche */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher un article..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          {/* Onglets catégories */}
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={onCategoryChange}
            categories={categories}
          />
        </div>

        {/* Zone scrollable - prend tout l'espace restant */}
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          {/* État de chargement */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="text-center py-12 text-destructive">
              <p>Erreur lors du chargement des menus</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          )}

          {/* Aucun résultat */}
          {!loading && !error && menus.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucun article trouvé</p>
              {searchTerm && (
                <p className="text-sm mt-1">Essayez une autre recherche</p>
              )}
            </div>
          )}

          {/* Grille des menus */}
          {!loading && !error && menus.length > 0 && (
            <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              <AnimatePresence mode="popLayout">
                {menus.map((menu) => (
                  <MenuCard
                    key={menu.id}
                    menu={menu}
                    onAdd={onAddToCart}
                    isInCart={getCartQuantity(menu.id) > 0}
                    quantityInCart={getCartQuantity(menu.id)}
                    compact={true}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // Mode desktop - Layout standard
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Barre de recherche */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher un article..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Onglets catégories */}
      <CategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={onCategoryChange}
        categories={categories}
        className="mb-3"
      />

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* État de chargement */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="text-center py-12 text-destructive">
            <p>Erreur lors du chargement des menus</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        )}

        {/* Aucun résultat */}
        {!loading && !error && menus.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun article trouvé</p>
            {searchTerm && (
              <p className="text-sm mt-1">Essayez une autre recherche</p>
            )}
          </div>
        )}

        {/* Grille des menus */}
        {!loading && !error && menus.length > 0 && (
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <AnimatePresence mode="popLayout">
              {menus.map((menu) => (
                <MenuCard
                  key={menu.id}
                  menu={menu}
                  onAdd={onAddToCart}
                  isInCart={getCartQuantity(menu.id) > 0}
                  quantityInCart={getCartQuantity(menu.id)}
                  compact={false}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MenuCatalog;
