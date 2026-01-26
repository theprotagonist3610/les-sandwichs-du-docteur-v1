import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useBreakpoint from "@/hooks/useBreakpoint";
import useCommandeCache from "@/hooks/useCommandeCache";
import useCommandeNotifications from "@/hooks/useCommandeNotifications";
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
  RefreshCw,
  Loader2,
  X,
  Grid3x3,
  List,
  ChevronLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  MapPin,
  Check,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import CommandeCard from "@/components/commandes/CommandeCard";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as commandeToolkit from "@/utils/commandeToolkit";

const MobileGestionDesCommandes = () => {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const { syncAndLoadCommandes, removeCommandeFromCache } = useCommandeCache();
  const {
    subscribeToCommandeNotifications,
    requestNotificationPermission,
    sendNotification,
  } = useCommandeNotifications("current-user-id");

  // États locaux
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatutCommande, setFilterStatutCommande] = useState("all");
  const [filterStatutLivraison, setFilterStatutLivraison] = useState("all");
  const [filterStatutPaiement, setFilterStatutPaiement] = useState("all");
  // Filtres géographiques avancés (sélection multiple)
  const [filterCommunes, setFilterCommunes] = useState([]);
  const [filterQuartiers, setFilterQuartiers] = useState([]);
  const [filterArrondissements, setFilterArrondissements] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commandeToDelete, setCommandeToDelete] = useState(null);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  // Demander la permission pour les notifications
  useEffect(() => {
    const initNotifications = async () => {
      await requestNotificationPermission();
    };

    if (visible) {
      initNotifications();
    }
  }, [visible, requestNotificationPermission]);

  // S'abonner aux notifications en temps réel
  useEffect(() => {
    if (!visible) return;

    const unsubscribe = subscribeToCommandeNotifications((notification) => {
      if (notification.data?.commande_id) {
        loadCommandes();
        sendNotification({
          title: notification.title || "Nouvelle commande",
          message: notification.message || "Une nouvelle commande a été reçue",
          data: {
            commande_id: notification.data.commande_id,
            priority: notification.priority || "normal",
          },
        });
      }
    });

    return () => unsubscribe();
  }, [visible, subscribeToCommandeNotifications, sendNotification]);

  // Charger les commandes à l'initialisation
  useEffect(() => {
    if (visible) {
      loadCommandes();
    }
  }, [visible]);

  const loadCommandes = async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        commandes: data,
        error: err,
        fromCache,
      } = await syncAndLoadCommandes();

      if (err) {
        setError(err.message || "Erreur lors du chargement des commandes");
      } else {
        setCommandes(data || []);
        setIsCached(fromCache);
      }
    } catch (err) {
      setError("Une erreur est survenue lors du chargement des commandes");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Extraire les valeurs uniques pour les filtres géographiques
  const uniqueCommunes = [...new Set(
    commandes
      .filter(c => c.lieu_livraison?.commune)
      .map(c => c.lieu_livraison.commune)
  )].sort();

  const uniqueQuartiers = [...new Set(
    commandes
      .filter(c => c.lieu_livraison?.quartier)
      .map(c => c.lieu_livraison.quartier)
  )].sort();

  const uniqueArrondissements = [...new Set(
    commandes
      .filter(c => c.lieu_livraison?.arrondissement)
      .map(c => c.lieu_livraison.arrondissement)
  )].sort();

  // Filtrer les commandes
  const filteredCommandes = commandes.filter((commande) => {
    const matchSearch =
      !searchTerm ||
      commande.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commande.contact_client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commande.id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchType = filterType === "all" || commande.type === filterType;
    const matchStatutCommande =
      filterStatutCommande === "all" ||
      commande.statut_commande === filterStatutCommande;
    const matchStatutLivraison =
      filterStatutLivraison === "all" ||
      commande.statut_livraison === filterStatutLivraison;
    const matchStatutPaiement =
      filterStatutPaiement === "all" ||
      commande.statut_paiement === filterStatutPaiement;

    // Filtres géographiques (sélection multiple)
    const matchCommune =
      filterCommunes.length === 0 ||
      filterCommunes.includes(commande.lieu_livraison?.commune);
    const matchQuartier =
      filterQuartiers.length === 0 ||
      filterQuartiers.includes(commande.lieu_livraison?.quartier);
    const matchArrondissement =
      filterArrondissements.length === 0 ||
      filterArrondissements.includes(commande.lieu_livraison?.arrondissement);

    return (
      matchSearch &&
      matchType &&
      matchStatutCommande &&
      matchStatutLivraison &&
      matchStatutPaiement &&
      matchCommune &&
      matchQuartier &&
      matchArrondissement
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredCommandes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCommandes = filteredCommandes.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterStatutCommande, filterStatutLivraison, filterStatutPaiement, filterCommunes, filterQuartiers, filterArrondissements]);

  // Vérifier si des filtres géographiques sont actifs
  const hasGeoFilters = filterCommunes.length > 0 || filterQuartiers.length > 0 || filterArrondissements.length > 0;

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterStatutCommande("all");
    setFilterStatutLivraison("all");
    setFilterStatutPaiement("all");
    setFilterCommunes([]);
    setFilterQuartiers([]);
    setFilterArrondissements([]);
    setFiltersSheetOpen(false);
  };

  const handleDeleteClick = (commande) => {
    setCommandeToDelete(commande);
    setDeleteDialogOpen(true);
  };

  const handleEditCommande = (commande) => {
    navigate(`/commande/${commande.id}`);
  };

  const handleConfirmDelete = async () => {
    if (commandeToDelete) {
      try {
        const { error: err } = await commandeToolkit.deleteCommande(
          commandeToDelete.id
        );
        if (err) {
          setError(err.message || "Erreur lors de la suppression");
        } else {
          await removeCommandeFromCache(commandeToDelete.id);
          setCommandes(commandes.filter((c) => c.id !== commandeToDelete.id));
          setDeleteDialogOpen(false);
          setCommandeToDelete(null);
        }
      } catch (err) {
        setError("Une erreur est survenue lors de la suppression");
        console.error(err);
      }
    }
  };

  const hasActiveFilters =
    filterType !== "all" ||
    filterStatutCommande !== "all" ||
    filterStatutLivraison !== "all" ||
    filterStatutPaiement !== "all" ||
    filterCommunes.length > 0 ||
    filterQuartiers.length > 0 ||
    filterArrondissements.length > 0;

  const activeFiltersCount = [
    filterType !== "all",
    filterStatutCommande !== "all",
    filterStatutLivraison !== "all",
    filterStatutPaiement !== "all",
    filterCommunes.length > 0,
    filterQuartiers.length > 0,
    filterArrondissements.length > 0,
  ].filter(Boolean).length;

  return (
    <div
      className="min-h-screen pb-20"
      style={{ display: visible ? "block" : "none" }}>
      {/* Header fixe */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Commandes</h1>
            <p className="text-xs text-muted-foreground">
              {filteredCommandes.length} commande{filteredCommandes.length > 1 ? "s" : ""}
              {isCached && " (cache)"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={loadCommandes}
              disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="icon" onClick={() => navigate("/commandes/new")}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="pl-9 h-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearchTerm("")}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Bouton Filtres */}
          <Sheet open={filtersSheetOpen} onOpenChange={setFiltersSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <SlidersHorizontal className="w-4 h-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[75vh] px-0">
              <div className="px-6">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filtres
                  </SheetTitle>
                </SheetHeader>
              </div>
              <ScrollArea className="h-[calc(75vh-80px)] mt-4">
                <div className="space-y-4 px-6 pb-6">
                {/* Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value={commandeToolkit.TYPES_COMMANDE.LIVRAISON}>
                        Livraison
                      </SelectItem>
                      <SelectItem value={commandeToolkit.TYPES_COMMANDE.SUR_PLACE}>
                        Sur-place
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Statut Commande */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Statut Commande</label>
                  <Select
                    value={filterStatutCommande}
                    onValueChange={setFilterStatutCommande}>
                    <SelectTrigger>
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value={commandeToolkit.STATUTS_COMMANDE.EN_COURS}>
                        En cours
                      </SelectItem>
                      <SelectItem value={commandeToolkit.STATUTS_COMMANDE.TERMINEE}>
                        Terminée
                      </SelectItem>
                      <SelectItem value={commandeToolkit.STATUTS_COMMANDE.ANNULEE}>
                        Annulée
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Statut Livraison */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Statut Livraison</label>
                  <Select
                    value={filterStatutLivraison}
                    onValueChange={setFilterStatutLivraison}>
                    <SelectTrigger>
                      <SelectValue placeholder="Livraison" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value={commandeToolkit.STATUTS_LIVRAISON.EN_ATTENTE}>
                        En attente
                      </SelectItem>
                      <SelectItem value={commandeToolkit.STATUTS_LIVRAISON.EN_COURS}>
                        En cours
                      </SelectItem>
                      <SelectItem value={commandeToolkit.STATUTS_LIVRAISON.LIVREE}>
                        Livrée
                      </SelectItem>
                      <SelectItem value={commandeToolkit.STATUTS_LIVRAISON.ANNULEE}>
                        Annulée
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Statut Paiement */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Statut Paiement</label>
                  <Select
                    value={filterStatutPaiement}
                    onValueChange={setFilterStatutPaiement}>
                    <SelectTrigger>
                      <SelectValue placeholder="Paiement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value={commandeToolkit.STATUTS_PAIEMENT.NON_PAYEE}>
                        Non payée
                      </SelectItem>
                      <SelectItem value={commandeToolkit.STATUTS_PAIEMENT.PARTIELLEMENT_PAYEE}>
                        Partiellement payée
                      </SelectItem>
                      <SelectItem value={commandeToolkit.STATUTS_PAIEMENT.PAYEE}>
                        Payée
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtres géographiques (sélection multiple) */}
                {(filterType === "all" || filterType === commandeToolkit.TYPES_COMMANDE.LIVRAISON) && (
                  <>
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>Filtres géographiques</span>
                        {hasGeoFilters && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs ml-auto"
                            onClick={() => {
                              setFilterCommunes([]);
                              setFilterQuartiers([]);
                              setFilterArrondissements([]);
                            }}>
                            <X className="w-3 h-3 mr-1" />
                            Effacer
                          </Button>
                        )}
                      </div>

                      {/* Communes (multi-select) */}
                      <div className="space-y-2 mb-3">
                        <div className="text-sm font-medium flex items-center justify-between">
                          Communes
                          {filterCommunes.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {filterCommunes.length}
                            </Badge>
                          )}
                        </div>
                        <div className="max-h-[120px] overflow-y-auto border rounded-md p-2 space-y-1">
                          {uniqueCommunes.length > 0 ? (
                            uniqueCommunes.map((commune) => (
                              <label
                                key={commune}
                                className="flex items-center space-x-2 p-1.5 hover:bg-accent rounded cursor-pointer">
                                <Checkbox
                                  checked={filterCommunes.includes(commune)}
                                  onCheckedChange={(checked) => {
                                    setFilterCommunes((prev) =>
                                      checked
                                        ? [...prev, commune]
                                        : prev.filter((c) => c !== commune)
                                    );
                                  }}
                                />
                                <span className="text-sm">{commune}</span>
                              </label>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              Aucune commune disponible
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quartiers (multi-select) */}
                      <div className="space-y-2 mb-3">
                        <div className="text-sm font-medium flex items-center justify-between">
                          Quartiers
                          {filterQuartiers.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {filterQuartiers.length}
                            </Badge>
                          )}
                        </div>
                        <div className="max-h-[120px] overflow-y-auto border rounded-md p-2 space-y-1">
                          {uniqueQuartiers.length > 0 ? (
                            uniqueQuartiers.map((quartier) => (
                              <label
                                key={quartier}
                                className="flex items-center space-x-2 p-1.5 hover:bg-accent rounded cursor-pointer">
                                <Checkbox
                                  checked={filterQuartiers.includes(quartier)}
                                  onCheckedChange={(checked) => {
                                    setFilterQuartiers((prev) =>
                                      checked
                                        ? [...prev, quartier]
                                        : prev.filter((q) => q !== quartier)
                                    );
                                  }}
                                />
                                <span className="text-sm">{quartier}</span>
                              </label>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              Aucun quartier disponible
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Arrondissements (multi-select) */}
                      <div className="space-y-2">
                        <div className="text-sm font-medium flex items-center justify-between">
                          Arrondissements
                          {filterArrondissements.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {filterArrondissements.length}
                            </Badge>
                          )}
                        </div>
                        <div className="max-h-[120px] overflow-y-auto border rounded-md p-2 space-y-1">
                          {uniqueArrondissements.length > 0 ? (
                            uniqueArrondissements.map((arrond) => (
                              <label
                                key={arrond}
                                className="flex items-center space-x-2 p-1.5 hover:bg-accent rounded cursor-pointer">
                                <Checkbox
                                  checked={filterArrondissements.includes(arrond)}
                                  onCheckedChange={(checked) => {
                                    setFilterArrondissements((prev) =>
                                      checked
                                        ? [...prev, arrond]
                                        : prev.filter((a) => a !== arrond)
                                    );
                                  }}
                                />
                                <span className="text-sm">{arrond}</span>
                              </label>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              Aucun arrondissement disponible
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleResetFilters}>
                    Réinitialiser
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setFiltersSheetOpen(false)}>
                    Appliquer
                  </Button>
                </div>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Toggle Vue */}
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              className="rounded-r-none h-10 w-10"
              onClick={() => setViewMode("grid")}>
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="rounded-l-none h-10 w-10"
              onClick={() => setViewMode("list")}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filtres actifs */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            {filterType !== "all" && (
              <Badge variant="secondary" className="text-xs">
                {filterType}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterType("all")}
                />
              </Badge>
            )}
            {filterStatutCommande !== "all" && (
              <Badge variant="secondary" className="text-xs">
                {filterStatutCommande}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterStatutCommande("all")}
                />
              </Badge>
            )}
            {filterStatutLivraison !== "all" && (
              <Badge variant="secondary" className="text-xs">
                {filterStatutLivraison}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterStatutLivraison("all")}
                />
              </Badge>
            )}
            {filterStatutPaiement !== "all" && (
              <Badge variant="secondary" className="text-xs">
                {filterStatutPaiement}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterStatutPaiement("all")}
                />
              </Badge>
            )}
            {filterCommunes.length > 0 && filterCommunes.map((commune) => (
              <Badge key={commune} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                <MapPin className="w-2.5 h-2.5 mr-0.5" />
                {commune}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterCommunes((prev) => prev.filter((c) => c !== commune))}
                />
              </Badge>
            ))}
            {filterQuartiers.length > 0 && filterQuartiers.map((quartier) => (
              <Badge key={quartier} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                <MapPin className="w-2.5 h-2.5 mr-0.5" />
                {quartier}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterQuartiers((prev) => prev.filter((q) => q !== quartier))}
                />
              </Badge>
            ))}
            {filterArrondissements.length > 0 && filterArrondissements.map((arrond) => (
              <Badge key={arrond} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                <MapPin className="w-2.5 h-2.5 mr-0.5" />
                {arrond}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterArrondissements((prev) => prev.filter((a) => a !== arrond))}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-4 mt-4 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
          {error}
        </motion.div>
      )}

      {/* Liste des commandes */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredCommandes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="text-base font-medium">Aucune commande</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {hasActiveFilters || searchTerm
                ? "Modifiez vos filtres"
                : "Créez votre première commande"}
            </p>
          </motion.div>
        ) : (
          <>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-4"
                  : "space-y-3"
              }>
              <AnimatePresence>
                {paginatedCommandes.map((commande) => (
                  <CommandeCard
                    key={commande.id}
                    commande={commande}
                    onEdit={handleEditCommande}
                    onDelete={handleDeleteClick}
                    viewMode={viewMode}
                    isMobile={true}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <span className="text-xs text-muted-foreground">
                  {startIndex + 1}-{Math.min(endIndex, filteredCommandes.length)} / {filteredCommandes.length}
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm px-3">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog Suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la commande de "
              {commandeToDelete?.client}" ?
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

export default MobileGestionDesCommandes;
