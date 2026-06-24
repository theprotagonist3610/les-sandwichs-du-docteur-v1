import { useState, useEffect } from "react";
import useMenus from "@/features/menus/hooks/useMenus";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Plus,
  Search,
  Download,
  RefreshCw,
  Loader2,
  X,
  Grid3x3,
  List,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Package } from "lucide-react";
import { createMenuPromo } from "@/features/menus/utils/menuToolkit";
import { MenuCard } from "@/features/menus/components/MenuCard";
import { MenuDialog } from "@/features/menus/components/MenuDialog";
import { MenuStats } from "@/features/menus/components/MenuStats";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

const Menu = () => {
  const {
    menus,
    loading,
    error,
    stats,
    createMenu,
    updateMenu,
    deleteMenu,
    toggleStatut,
    applyFilters,
    resetFilters,
    loadMenus,
    exportToCSV,
    exportToJSON,
    canCreate,
    canUpdate,
    canDelete,
    MENU_TYPES,
    MENU_STATUTS,
    MENU_TYPE_LABELS,
    MENU_STATUT_LABELS,
  } = useMenus();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState(null);

  useEffect(() => {
    applyFilters({
      searchTerm,
      type: filterType === "all" ? null : filterType,
      statut: filterStatut === "all" ? null : filterStatut,
    });
  }, [searchTerm, filterType, filterStatut, applyFilters]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterStatut("all");
    resetFilters();
  };

  const handleCreate = () => {
    setSelectedMenu(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEdit = (menu) => {
    setSelectedMenu(menu);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleDeleteClick = (menu) => {
    setMenuToDelete(menu);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (menuToDelete) {
      await deleteMenu(menuToDelete.id);
      setDeleteDialogOpen(false);
      setMenuToDelete(null);
    }
  };

  const handleSave = async (menuData, imageFile, menuId, promoData = null) => {
    if (dialogMode === "create") {
      if (promoData) {
        await createMenuPromo(menuData, promoData, imageFile);
      } else {
        await createMenu(menuData, imageFile);
      }
    } else {
      await updateMenu(menuId, menuData, imageFile);
    }
  };

  const handleToggleStatut = async (menuId, currentStatut) => {
    await toggleStatut(menuId, currentStatut);
  };

  const hasActiveFilters =
    searchTerm || filterType !== "all" || filterStatut !== "all";

  return (
    <div className="min-h-screen space-y-4 p-4 lg:space-y-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-4xl">
            Gestion des Menus
          </h1>
          <p className="text-muted-foreground text-sm mt-1 lg:text-lg">
            Gérez vos sandwichs, boissons, desserts et menus complets
          </p>
        </div>

        <div className="flex gap-2 lg:gap-3">
          {canCreate && (
            <Button size="sm" className="flex-1 lg:flex-none lg:size-lg" onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-1 lg:mr-2" />
              <span className="lg:hidden">Nouveau</span>
              <span className="hidden lg:inline">Nouveau Menu</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={loadMenus}
            disabled={loading}>
            <RefreshCw className={`w-4 h-4 lg:mr-2 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden lg:inline">Actualiser</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Download className="w-4 h-4 lg:mr-2" />
                <span className="hidden lg:inline">Exporter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportToCSV}>
                <span className="lg:hidden">CSV</span>
                <span className="hidden lg:inline">Exporter en CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToJSON}>
                <span className="lg:hidden">JSON</span>
                <span className="hidden lg:inline">Exporter en JSON</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <MenuStats
        stats={stats}
        MENU_TYPE_LABELS={MENU_TYPE_LABELS}
        MENU_TYPES={MENU_TYPES}
      />

      {/* Barre de recherche et filtres */}
      <div className="bg-card border rounded-lg p-3 space-y-3 lg:p-6 lg:space-y-4">
        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher..."
            className="pl-10 h-10 text-sm lg:h-12 lg:text-base"
          />
        </div>

        {/* Filtres */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-10 text-sm lg:w-[200px] lg:h-12">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(MENU_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="h-10 text-sm lg:w-[200px] lg:h-12">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(MENU_STATUT_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              size="sm"
              variant="outline"
              className="w-full lg:w-auto lg:size-lg"
              onClick={handleResetFilters}>
              <X className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          )}

          <div className="flex border rounded-lg gap-0 ml-auto">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="flex-1 lg:flex-none rounded-r-none"
              onClick={() => setViewMode("grid")}>
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="flex-1 lg:flex-none rounded-l-none"
              onClick={() => setViewMode("list")}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filtres actifs */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap text-xs lg:text-sm">
            <span className="text-muted-foreground">
              <span className="lg:hidden">Actifs:</span>
              <span className="hidden lg:inline">Filtres actifs:</span>
            </span>
            {searchTerm && (
              <Badge variant="secondary" className="text-xs">
                <span className="hidden lg:inline">Recherche: </span>
                "{searchTerm}"
                <X
                  className="w-2 h-2 lg:w-3 lg:h-3 ml-1 cursor-pointer"
                  onClick={() => setSearchTerm("")}
                />
              </Badge>
            )}
            {filterType !== "all" && (
              <Badge variant="secondary" className="text-xs">
                {MENU_TYPE_LABELS[filterType]}
                <X
                  className="w-2 h-2 lg:w-3 lg:h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterType("all")}
                />
              </Badge>
            )}
            {filterStatut !== "all" && (
              <Badge variant="secondary" className="text-xs">
                {MENU_STATUT_LABELS[filterStatut]}
                <X
                  className="w-2 h-2 lg:w-3 lg:h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterStatut("all")}
                />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div className="p-3 lg:p-4 text-xs lg:text-sm text-destructive bg-destructive/10 rounded-lg">
          {error}
        </div>
      )}

      {/* Liste des menus */}
      <div className="space-y-3 lg:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold lg:text-2xl">
            {menus.length} menu{menus.length > 1 ? "s" : ""}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 lg:w-8 lg:h-8 animate-spin text-primary" />
          </div>
        ) : menus.length === 0 ? (
          <div className="text-center py-8 lg:py-12">
            <Package className="w-12 h-12 lg:w-16 lg:h-16 mx-auto text-muted-foreground/50 mb-3 lg:mb-4" />
            <h3 className="text-sm lg:text-lg font-medium">Aucun menu trouvé</h3>
            <p className="text-xs lg:text-sm text-muted-foreground mt-1 lg:mt-2">
              {hasActiveFilters
                ? "Essayez de modifier vos filtres"
                : "Commencez par créer votre premier menu"}
            </p>
            {canCreate && !hasActiveFilters && (
              <Button size="sm" className="mt-3 lg:mt-4 lg:size-md" onClick={handleCreate}>
                <Plus className="w-3 h-3 mr-1 lg:w-4 lg:h-4 lg:mr-2" />
                Créer un menu
              </Button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6"
                : "space-y-3 lg:space-y-4"
            }>
            {menus.map((menu) => (
              <MenuCard
                key={menu.id}
                menu={menu}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onToggleStatut={handleToggleStatut}
                canUpdate={canUpdate}
                canDelete={canDelete}
                MENU_TYPE_LABELS={MENU_TYPE_LABELS}
                MENU_STATUT_LABELS={MENU_STATUT_LABELS}
                MENU_STATUTS={MENU_STATUTS}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>

      <MenuDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        menu={selectedMenu}
        onSave={handleSave}
        mode={dialogMode}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le menu "{menuToDelete?.nom}" ?
              Cette action est irréversible et supprimera également l'image
              associée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Menu;
