import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/shared/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { captureFlip, animateFlip } from "@/lib/animations";
import { CategoryTabs } from "./CategoryTabs";
import { MenuCard } from "./MenuCard";
import { SandwichPersonnaliseDialog } from "./SandwichPersonnaliseDialog";

const NOM_SANDWICH_PERSONNALISE = "Sandwich personnalisé";

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
  inline = false,
  className,
}) => {
  const [sandwichDialogOpen, setSandwichDialogOpen] = useState(false);
  const [sandwichMenuSelectionne, setSandwichMenuSelectionne] = useState(null);
  const flipStateRef = useRef(null);

  const getCartQuantity = (menuId) => {
    const cartItem = cartItems.find((item) => item.menu.id === menuId);
    return cartItem ? cartItem.quantite : 0;
  };

  const handleMenuClick = (menu) => {
    if (menu.nom === NOM_SANDWICH_PERSONNALISE) {
      setSandwichMenuSelectionne(menu);
      setSandwichDialogOpen(true);
    } else {
      onAddToCart(menu);
    }
  };

  const handleSandwichConfirm = (fakeMenu, quantite) => {
    onAddToCart(fakeMenu, quantite);
  };

  const beforeFilter = () => {
    flipStateRef.current = captureFlip(".menu-card-flip");
  };

  useEffect(() => {
    if (flipStateRef.current) {
      animateFlip(flipStateRef.current);
      flipStateRef.current = null;
    }
  }, [menus]);

  const handleCategoryChange = (category) => {
    beforeFilter();
    onCategoryChange(category);
  };

  const handleSearchChange = (value) => {
    beforeFilter();
    onSearchChange(value);
  };

  if (compact && inline) {
    return (
      <>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher un article..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
            categories={categories}
          />
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {!loading && !error && menus.length === 0 && (
            <p className="text-center py-6 text-sm text-muted-foreground">
              {searchTerm ? "Aucun résultat" : "Aucun article disponible"}
            </p>
          )}
          {!loading && !error && menus.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {menus.map((menu) => (
                <div key={menu.id} className="menu-card-flip">
                  <MenuCard
                    menu={menu}
                    onAdd={handleMenuClick}
                    isInCart={getCartQuantity(menu.id) > 0}
                    quantityInCart={getCartQuantity(menu.id)}
                    compact={true}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        {sandwichMenuSelectionne && (
          <SandwichPersonnaliseDialog
            open={sandwichDialogOpen}
            onOpenChange={setSandwichDialogOpen}
            menu={sandwichMenuSelectionne}
            onConfirm={handleSandwichConfirm}
          />
        )}
      </>
    );
  }

  if (compact) {
    return (
      <>
        <div className="fixed inset-0 top-[73px] bottom-0 bg-background flex flex-col">
          <div className="flex-shrink-0 px-4 pt-4 pb-2 bg-background">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher un article..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            <CategoryTabs
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
              categories={categories}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-24">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="text-center py-12 text-destructive">
                <p>Erreur lors du chargement des menus</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            )}

            {!loading && !error && menus.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Aucun article trouvé</p>
                {searchTerm && (
                  <p className="text-sm mt-1">Essayez une autre recherche</p>
                )}
              </div>
            )}

            {!loading && !error && menus.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {menus.map((menu) => (
                  <div key={menu.id} className="menu-card-flip">
                    <MenuCard
                      menu={menu}
                      onAdd={handleMenuClick}
                      isInCart={getCartQuantity(menu.id) > 0}
                      quantityInCart={getCartQuantity(menu.id)}
                      compact={true}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {sandwichMenuSelectionne && (
          <SandwichPersonnaliseDialog
            open={sandwichDialogOpen}
            onOpenChange={setSandwichDialogOpen}
            menu={sandwichMenuSelectionne}
            onConfirm={handleSandwichConfirm}
          />
        )}
      </>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher un article..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      <CategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        categories={categories}
        className="mb-3"
      />

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-destructive">
            <p>Erreur lors du chargement des menus</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && menus.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun article trouvé</p>
            {searchTerm && (
              <p className="text-sm mt-1">Essayez une autre recherche</p>
            )}
          </div>
        )}

        {!loading && !error && menus.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {menus.map((menu) => (
              <div key={menu.id} className="menu-card-flip">
                <MenuCard
                  menu={menu}
                  onAdd={handleMenuClick}
                  isInCart={getCartQuantity(menu.id) > 0}
                  quantityInCart={getCartQuantity(menu.id)}
                  hideImage={true}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {sandwichMenuSelectionne && (
        <SandwichPersonnaliseDialog
          open={sandwichDialogOpen}
          onOpenChange={setSandwichDialogOpen}
          menu={sandwichMenuSelectionne}
          onConfirm={handleSandwichConfirm}
        />
      )}
    </div>
  );
};

export { MenuCatalog };
