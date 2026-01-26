import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  Minus,
  ShoppingBag,
  UtensilsCrossed,
  Coffee,
  Sandwich,
  Salad,
  CakeSlice,
} from "lucide-react";

/**
 * Modal pour ajouter un article à la commande
 */
const AddItemModal = ({ open, onClose, menus = [], onAddItem }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeCategory, setActiveCategory] = useState("tous");

  // Catégories disponibles
  const categories = useMemo(() => {
    const cats = new Set(menus.map((m) => m.type).filter(Boolean));
    return ["tous", ...Array.from(cats)];
  }, [menus]);

  // Filtrer les menus
  const filteredMenus = useMemo(() => {
    return menus.filter((menu) => {
      const matchCategory =
        activeCategory === "tous" || menu.type === activeCategory;
      const matchSearch =
        !searchTerm.trim() ||
        menu.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        menu.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [menus, activeCategory, searchTerm]);

  // Icône par type
  const getCategoryIcon = (type) => {
    const icons = {
      sandwich: <Sandwich className="h-4 w-4" />,
      boisson: <Coffee className="h-4 w-4" />,
      salade: <Salad className="h-4 w-4" />,
      dessert: <CakeSlice className="h-4 w-4" />,
      tous: <UtensilsCrossed className="h-4 w-4" />,
    };
    return icons[type] || <UtensilsCrossed className="h-4 w-4" />;
  };

  // Formater le prix
  const formatPrice = (price) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  const handleAdd = () => {
    if (selectedMenu && quantity > 0) {
      onAddItem(selectedMenu, quantity);
      setSelectedMenu(null);
      setQuantity(1);
      onClose();
    }
  };

  const handleSelectMenu = (menu) => {
    setSelectedMenu(menu);
    setQuantity(1);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Ajouter un article
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un article du menu à ajouter à la commande
          </DialogDescription>
        </DialogHeader>

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Catégories */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="flex items-center gap-1">
                {getCategoryIcon(cat)}
                <span className="capitalize">{cat}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Liste des menus */}
          <TabsContent value={activeCategory} className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {filteredMenus.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UtensilsCrossed className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Aucun article trouvé</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredMenus.map((menu) => (
                    <div
                      key={menu.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedMenu?.id === menu.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => handleSelectMenu(menu)}>
                      <div className="flex gap-3">
                        {/* Image ou placeholder */}
                        {menu.image_url ? (
                          <img
                            src={menu.image_url}
                            alt={menu.nom}
                            className="w-16 h-16 rounded-md object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                            {getCategoryIcon(menu.type)}
                          </div>
                        )}

                        {/* Détails */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{menu.nom}</p>
                          {menu.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {menu.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {menu.type}
                            </Badge>
                            <span className="font-semibold text-sm">
                              {formatPrice(menu.prix)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Sélection de quantité (si un menu est sélectionné) */}
        {selectedMenu && (
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedMenu.nom}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(selectedMenu.prix)} / unité
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-16 text-center"
                  min="1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-bold">
                {formatPrice(selectedMenu.prix * quantity)}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleAdd} disabled={!selectedMenu}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter à la commande
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemModal;
