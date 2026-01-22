import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useBreakpoint from "@/hooks/useBreakpoint";
import useMenus from "@/hooks/useMenus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import MenuCard from "@/components/menus/MenuCard";
import MenuDialog from "@/components/menus/MenuDialog";
import MenuStats from "@/components/menus/MenuStats";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MobileMenu = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  // Hook de gestion des menus
  const {
    menus,
    loading,
    error,
    stats,
    filters,
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

  // États locaux
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // grid ou list
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState(null);

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  // Filtrage dynamique - s'exécute automatiquement quand les filtres changent
  useEffect(() => {
    applyFilters({
      searchTerm,
      type: filterType === "all" ? null : filterType,
      statut: filterStatut === "all" ? null : filterStatut,
    });
  }, [searchTerm, filterType, filterStatut, applyFilters]);

  // Réinitialiser les filtres
  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterStatut("all");
    resetFilters();
  };

  // Ouvrir le dialog de création
  const handleCreate = () => {
    setSelectedMenu(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  // Ouvrir le dialog d'édition
  const handleEdit = (menu) => {
    setSelectedMenu(menu);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  // Ouvrir le dialog de suppression
  const handleDeleteClick = (menu) => {
    setMenuToDelete(menu);
    setDeleteDialogOpen(true);
  };

  // Confirmer la suppression
  const handleConfirmDelete = async () => {
    if (menuToDelete) {
      await deleteMenu(menuToDelete.id);
      setDeleteDialogOpen(false);
      setMenuToDelete(null);
    }
  };

  // Sauvegarder le menu (création ou édition)
  const handleSave = async (menuData, imageFile, menuId) => {
    if (dialogMode === "create") {
      await createMenu(menuData, imageFile);
    } else {
      await updateMenu(menuId, menuData, imageFile);
    }
  };

  // Changer le statut
  const handleToggleStatut = async (menuId, currentStatut) => {
    await toggleStatut(menuId, currentStatut);
  };

  // Filtres actifs
  const hasActiveFilters =
    searchTerm || filterType !== "all" || filterStatut !== "all";

  return (
    <div
      className="min-h-screen space-y-4 p-4"
      style={{ display: visible ? "block" : "none" }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Gestion des Menus</h1>
        <p className="text-muted-foreground text-sm">
          Gérez vos sandwichs, boissons, desserts et menus complets
        </p>
      </motion.div>

      {/* Boutons d'action rapide */}
      <div className="flex gap-2">
        {/* Créer */}
        {canCreate && (
          <Button size="sm" className="flex-1" onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Nouveau
          </Button>
        )}

        {/* Rafraîchir */}
        <Button
          size="sm"
          variant="outline"
          onClick={loadMenus}
          disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <Download className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={exportToCSV}>CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={exportToJSON}>JSON</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats */}
      <MenuStats
        stats={stats}
        MENU_TYPE_LABELS={MENU_TYPE_LABELS}
        MENU_TYPES={MENU_TYPES}
      />

      {/* Barre de recherche et filtres */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border rounded-lg p-3 space-y-3">
        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher..."
            className="pl-10 h-10 text-sm"
          />
        </div>

        {/* Filtres */}
        <div className="space-y-2">
          {/* Filtre Type */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Type" />
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

          {/* Filtre Statut */}
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Statut" />
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
        </div>

        {/* Bouton Réinitialiser */}
        {hasActiveFilters && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleResetFilters}>
            <X className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
        )}

        {/* Filtres actifs */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-muted-foreground">Actifs:</span>
            {searchTerm && (
              <Badge variant="secondary" className="text-xs">
                "{searchTerm}"
                <X
                  className="w-2 h-2 ml-1 cursor-pointer"
                  onClick={() => setSearchTerm("")}
                />
              </Badge>
            )}
            {filterType !== "all" && (
              <Badge variant="secondary" className="text-xs">
                {MENU_TYPE_LABELS[filterType]}
                <X
                  className="w-2 h-2 ml-1 cursor-pointer"
                  onClick={() => setFilterType("all")}
                />
              </Badge>
            )}
            {filterStatut !== "all" && (
              <Badge variant="secondary" className="text-xs">
                {MENU_STATUT_LABELS[filterStatut]}
                <X
                  className="w-2 h-2 ml-1 cursor-pointer"
                  onClick={() => setFilterStatut("all")}
                />
              </Badge>
            )}
          </div>
        )}

        {/* Mode d'affichage */}
        <div className="flex border rounded-lg gap-0">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            className="flex-1 rounded-r-none text-xs"
            onClick={() => setViewMode("grid")}>
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="flex-1 rounded-l-none text-xs"
            onClick={() => setViewMode("list")}>
            <List className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Erreur */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 text-xs text-destructive bg-destructive/10 rounded-lg">
          {error}
        </motion.div>
      )}

      {/* Liste des menus */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {menus.length} menu{menus.length > 1 ? "s" : ""}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : menus.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="text-sm font-medium">Aucun menu trouvé</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {hasActiveFilters
                ? "Essayez de modifier vos filtres"
                : "Commencez par créer votre premier menu"}
            </p>
            {canCreate && !hasActiveFilters && (
              <Button size="sm" className="mt-3" onClick={handleCreate}>
                <Plus className="w-3 h-3 mr-1" />
                Créer un menu
              </Button>
            )}
          </motion.div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
                : "space-y-3"
            }>
            <AnimatePresence>
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
                  isMobile={true}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Dialog Création/Édition */}
      <MenuDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        menu={selectedMenu}
        onSave={handleSave}
        mode={dialogMode}
      />

      {/* Dialog Suppression */}
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

export default MobileMenu;
