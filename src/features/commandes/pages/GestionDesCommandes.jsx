import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGSAP } from "@/shared/hooks/useGSAP";
import { fadeInDown, fadeInUp, fadeIn, staggerFadeInUp } from "@/lib/animations";
import useCommandeCache from "@/features/commandes/hooks/useCommandeCache";
import useCommandeNotifications from "@/features/commandes/hooks/useCommandeNotifications";
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MapPin,
  ChevronsUpDown,
  CalendarRange,
  History,
  Filter,
  SlidersHorizontal,
  Clock,
  Store,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Package } from "lucide-react";
import CommandeCard from "@/features/commandes/components/CommandeCard";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import * as commandeToolkit from "@/features/commandes/utils/commandeToolkit";

const GestionDesCommandes = () => {
  const navigate = useNavigate();
  const { syncAndLoadCommandes, removeCommandeFromCache } = useCommandeCache();
  const {
    subscribeToCommandeNotifications,
    requestNotificationPermission,
    sendNotification,
  } = useCommandeNotifications("current-user-id");

  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatutCommande, setFilterStatutCommande] = useState("all");
  const [filterStatutLivraison, setFilterStatutLivraison] = useState("all");
  const [filterStatutPaiement, setFilterStatutPaiement] = useState("all");
  const [filterCommunes, setFilterCommunes] = useState([]);
  const [filterQuartiers, setFilterQuartiers] = useState([]);
  const [filterArrondissements, setFilterArrondissements] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commandeToDelete, setCommandeToDelete] = useState(null);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const headerRef = useRef(null);
  const filtersRef = useRef(null);
  const errorRef = useRef(null);
  const emptyRef = useRef(null);
  const paginationRef = useRef(null);

  useGSAP(() => {
    if (headerRef.current) fadeInDown(headerRef.current);
  }, []);

  useGSAP(() => {
    if (filtersRef.current) fadeInUp(filtersRef.current);
  }, []);

  useGSAP(() => {
    if (errorRef.current) fadeIn(errorRef.current);
  }, [error]);

  useGSAP(() => {
    if (emptyRef.current) fadeIn(emptyRef.current);
  }, []);

  useGSAP(() => {
    if (paginationRef.current) fadeIn(paginationRef.current);
  }, []);

  useGSAP(() => {
    staggerFadeInUp(".commande-card-item");
  }, [commandes, currentPage]);

  useEffect(() => {
    const initNotifications = async () => {
      await requestNotificationPermission();
    };
    initNotifications();
  }, [requestNotificationPermission]);

  useEffect(() => {
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
  }, [subscribeToCommandeNotifications, sendNotification]);

  useEffect(() => {
    loadCommandes();
  }, []);

  useEffect(() => {
    loadCommandes(dateFrom, dateTo);
  }, [dateFrom, dateTo]);

  const loadCommandes = async (fromDate = dateFrom, toDate = dateTo) => {
    setLoading(true);
    setError(null);
    try {
      if (fromDate || toDate) {
        const { commandes: data, error: err } = await commandeToolkit.getAllCommandes({
          dateFrom: fromDate || undefined,
          dateTo: toDate || undefined,
        });
        if (err) {
          setError(err.message || "Erreur lors du chargement des commandes");
        } else {
          setCommandes(data || []);
          setIsCached(false);
        }
      } else {
        const { commandes: data, error: err, fromCache } = await syncAndLoadCommandes();
        if (err) {
          setError(err.message || "Erreur lors du chargement des commandes");
        } else {
          setCommandes(data || []);
          setIsCached(fromCache);
        }
      }
    } catch (err) {
      setError("Une erreur est survenue lors du chargement des commandes");
    } finally {
      setLoading(false);
    }
  };

  const uniqueCommunes = [
    ...new Set(
      commandes
        .filter((c) => c.lieu_livraison?.commune)
        .map((c) => c.lieu_livraison.commune),
    ),
  ].sort();

  const uniqueQuartiers = [
    ...new Set(
      commandes
        .filter((c) => c.lieu_livraison?.quartier)
        .map((c) => c.lieu_livraison.quartier),
    ),
  ].sort();

  const uniqueArrondissements = [
    ...new Set(
      commandes
        .filter((c) => c.lieu_livraison?.arrondissement)
        .map((c) => c.lieu_livraison.arrondissement),
    ),
  ].sort();

  const filteredCommandes = commandes.filter((commande) => {
    const matchSearch =
      !searchTerm ||
      commande.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commande.contact_client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commande.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === "all" || commande.type === filterType;
    const matchStatutCommande =
      filterStatutCommande === "all" || commande.statut_commande === filterStatutCommande;
    const matchStatutLivraison =
      filterStatutLivraison === "all" || commande.statut_livraison === filterStatutLivraison;
    const matchStatutPaiement =
      filterStatutPaiement === "all" || commande.statut_paiement === filterStatutPaiement;
    const matchCommune =
      filterCommunes.length === 0 || filterCommunes.includes(commande.lieu_livraison?.commune);
    const matchQuartier =
      filterQuartiers.length === 0 || filterQuartiers.includes(commande.lieu_livraison?.quartier);
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

  const totalPages = Math.ceil(filteredCommandes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCommandes = filteredCommandes.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    filterType,
    filterStatutCommande,
    filterStatutLivraison,
    filterStatutPaiement,
    filterCommunes,
    filterQuartiers,
    filterArrondissements,
    dateFrom,
    dateTo,
  ]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterStatutCommande("all");
    setFilterStatutLivraison("all");
    setFilterStatutPaiement("all");
    setFilterCommunes([]);
    setFilterQuartiers([]);
    setFilterArrondissements([]);
    setDateFrom("");
    setDateTo("");
    setFiltersSheetOpen(false);
  };

  const hasGeoFilters =
    filterCommunes.length > 0 || filterQuartiers.length > 0 || filterArrondissements.length > 0;

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
        const { error: err } = await commandeToolkit.deleteCommande(commandeToDelete.id);
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
      }
    }
  };

  const hasDateFilter = !!(dateFrom || dateTo);
  const hasActiveFilters =
    searchTerm ||
    filterType !== "all" ||
    filterStatutCommande !== "all" ||
    filterStatutLivraison !== "all" ||
    filterStatutPaiement !== "all" ||
    filterCommunes.length > 0 ||
    filterQuartiers.length > 0 ||
    filterArrondissements.length > 0 ||
    hasDateFilter;

  const activeFiltersCount = [
    filterType !== "all",
    filterStatutCommande !== "all",
    filterStatutLivraison !== "all",
    filterStatutPaiement !== "all",
    filterCommunes.length > 0,
    filterQuartiers.length > 0,
    filterArrondissements.length > 0,
    hasDateFilter,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen">
      {/* ===== NAVIGATION RAPIDE — visible desktop + mobile ===== */}
      <div className="flex items-center gap-2 px-4 lg:px-8 pt-4 lg:pt-6 pb-2 overflow-x-auto scrollbar-none">
        <Button
          variant="default"
          className="shrink-0"
          onClick={() => navigate("/commandes")}
        >
          <List className="size-4 mr-2" />
          Commandes
        </Button>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() => navigate("/commandes-en-attente")}
        >
          <Clock className="size-4 mr-2" />
          En attente
        </Button>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() => navigate("/panneau-de-vente")}
        >
          <Store className="size-4 mr-2" />
          Panneau de vente
        </Button>
      </div>

      {/* ===== DESKTOP HEADER ===== */}
      <div ref={headerRef} className="hidden lg:flex items-center justify-between px-8 pt-4 pb-0">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Gestion des Commandes</h1>
          <p className="text-muted-foreground text-lg mt-1">
            Gérez vos commandes de livraison et sur-place
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => alert("CSV en développement")}>
                Exporter en CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert("JSON en développement")}>
                Exporter en JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="lg" onClick={loadCommandes} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button size="lg" onClick={() => navigate("/panneau-de-vente")}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Commande
          </Button>
        </div>
      </div>

      {/* ===== MOBILE HEADER (sticky) ===== */}
      <div className="lg:hidden sticky top-0 z-10 bg-background border-b px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Commandes</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {filteredCommandes.length} commande{filteredCommandes.length > 1 ? "s" : ""}
              {hasDateFilter ? (
                <span className="inline-flex items-center gap-0.5 text-amber-700 font-medium">
                  <History className="w-3 h-3" />
                  historique
                </span>
              ) : isCached && " (cache)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={loadCommandes} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="icon" onClick={() => navigate("/panneau-de-vente")}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

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
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <CalendarRange className="w-4 h-4" />
                      Période
                    </label>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-muted-foreground">Du</span>
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="h-10 mt-1"
                        />
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Au</span>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="h-10 mt-1"
                        />
                      </div>
                    </div>
                  </div>

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

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Statut Commande</label>
                    <Select value={filterStatutCommande} onValueChange={setFilterStatutCommande}>
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

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Statut Livraison</label>
                    <Select value={filterStatutLivraison} onValueChange={setFilterStatutLivraison}>
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

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Statut Paiement</label>
                    <Select value={filterStatutPaiement} onValueChange={setFilterStatutPaiement}>
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

                  {(filterType === "all" || filterType === commandeToolkit.TYPES_COMMANDE.LIVRAISON) && (
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
                                      checked ? [...prev, commune] : prev.filter((c) => c !== commune),
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
                                      checked ? [...prev, quartier] : prev.filter((q) => q !== quartier),
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
                                      checked ? [...prev, arrond] : prev.filter((a) => a !== arrond),
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
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1" onClick={handleResetFilters}>
                      Réinitialiser
                    </Button>
                    <Button className="flex-1" onClick={() => setFiltersSheetOpen(false)}>
                      Appliquer
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

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

        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            {dateFrom && (
              <Badge variant="secondary" className="text-xs">
                <CalendarRange className="w-2.5 h-2.5 mr-0.5" />
                {dateFrom}
                <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setDateFrom("")} />
              </Badge>
            )}
            {dateTo && (
              <Badge variant="secondary" className="text-xs">
                →{dateTo}
                <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setDateTo("")} />
              </Badge>
            )}
            {filterType !== "all" && (
              <Badge variant="secondary" className="text-xs">
                {filterType}
                <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setFilterType("all")} />
              </Badge>
            )}
            {filterStatutCommande !== "all" && (
              <Badge variant="secondary" className="text-xs">
                {filterStatutCommande}
                <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setFilterStatutCommande("all")} />
              </Badge>
            )}
            {filterStatutLivraison !== "all" && (
              <Badge variant="secondary" className="text-xs">
                {filterStatutLivraison}
                <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setFilterStatutLivraison("all")} />
              </Badge>
            )}
            {filterStatutPaiement !== "all" && (
              <Badge variant="secondary" className="text-xs">
                {filterStatutPaiement}
                <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setFilterStatutPaiement("all")} />
              </Badge>
            )}
            {filterCommunes.map((commune) => (
              <Badge key={commune} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                <MapPin className="w-2.5 h-2.5 mr-0.5" />
                {commune}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterCommunes((prev) => prev.filter((c) => c !== commune))}
                />
              </Badge>
            ))}
            {filterQuartiers.map((quartier) => (
              <Badge key={quartier} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                <MapPin className="w-2.5 h-2.5 mr-0.5" />
                {quartier}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterQuartiers((prev) => prev.filter((q) => q !== quartier))}
                />
              </Badge>
            ))}
            {filterArrondissements.map((arrond) => (
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

      {/* ===== DESKTOP FILTERS ===== */}
      <div ref={filtersRef} className="hidden lg:block mx-8 mt-6 bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par client, contact ou ID de commande..."
              className="pl-10 h-12"
            />
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] h-12">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value={commandeToolkit.TYPES_COMMANDE.LIVRAISON}>Livraison</SelectItem>
              <SelectItem value={commandeToolkit.TYPES_COMMANDE.SUR_PLACE}>Sur-place</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatutCommande} onValueChange={setFilterStatutCommande}>
            <SelectTrigger className="w-[200px] h-12">
              <SelectValue placeholder="Statut Commande" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value={commandeToolkit.STATUTS_COMMANDE.EN_COURS}>En cours</SelectItem>
              <SelectItem value={commandeToolkit.STATUTS_COMMANDE.TERMINEE}>Terminée</SelectItem>
              <SelectItem value={commandeToolkit.STATUTS_COMMANDE.ANNULEE}>Annulée</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode("grid")}>
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="rounded-l-none"
              onClick={() => setViewMode("list")}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarRange className="w-4 h-4" />
            <span>Période:</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 w-[160px]"
            />
            <span className="text-muted-foreground text-sm">→</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 w-[160px]"
            />
            {hasDateFilter && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                <X className="w-3 h-3 mr-1" />
                Effacer
              </Button>
            )}
          </div>
          {hasDateFilter && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300">
              <History className="w-3 h-3 mr-1" />
              Vue historique
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Select value={filterStatutLivraison} onValueChange={setFilterStatutLivraison}>
            <SelectTrigger className="w-[180px] h-12">
              <SelectValue placeholder="Livraison" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value={commandeToolkit.STATUTS_LIVRAISON.EN_ATTENTE}>En attente</SelectItem>
              <SelectItem value={commandeToolkit.STATUTS_LIVRAISON.EN_COURS}>En cours</SelectItem>
              <SelectItem value={commandeToolkit.STATUTS_LIVRAISON.LIVREE}>Livrée</SelectItem>
              <SelectItem value={commandeToolkit.STATUTS_LIVRAISON.ANNULEE}>Annulée</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatutPaiement} onValueChange={setFilterStatutPaiement}>
            <SelectTrigger className="w-[200px] h-12">
              <SelectValue placeholder="Paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value={commandeToolkit.STATUTS_PAIEMENT.NON_PAYEE}>Non payée</SelectItem>
              <SelectItem value={commandeToolkit.STATUTS_PAIEMENT.PARTIELLEMENT_PAYEE}>
                Partiellement payée
              </SelectItem>
              <SelectItem value={commandeToolkit.STATUTS_PAIEMENT.PAYEE}>Payée</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="outline" size="lg" onClick={handleResetFilters}>
              <X className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          )}
        </div>

        {(filterType === "all" || filterType === commandeToolkit.TYPES_COMMANDE.LIVRAISON) && (
          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Filtres géographiques:</span>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-[180px] h-10 justify-between", filterCommunes.length > 0 && "border-blue-500")}>
                  {filterCommunes.length === 0
                    ? "Communes"
                    : `${filterCommunes.length} commune${filterCommunes.length > 1 ? "s" : ""}`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-2 max-h-[300px] overflow-y-auto" align="start">
                <div className="space-y-1">
                  {uniqueCommunes.map((commune) => (
                    <label
                      key={commune}
                      className="flex items-center space-x-2 p-2 hover:bg-accent rounded cursor-pointer">
                      <Checkbox
                        checked={filterCommunes.includes(commune)}
                        onCheckedChange={(checked) => {
                          setFilterCommunes((prev) =>
                            checked ? [...prev, commune] : prev.filter((c) => c !== commune),
                          );
                        }}
                      />
                      <span className="text-sm">{commune}</span>
                    </label>
                  ))}
                  {uniqueCommunes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">Aucune commune</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-[180px] h-10 justify-between", filterQuartiers.length > 0 && "border-blue-500")}>
                  {filterQuartiers.length === 0
                    ? "Quartiers"
                    : `${filterQuartiers.length} quartier${filterQuartiers.length > 1 ? "s" : ""}`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-2 max-h-[300px] overflow-y-auto" align="start">
                <div className="space-y-1">
                  {uniqueQuartiers.map((quartier) => (
                    <label
                      key={quartier}
                      className="flex items-center space-x-2 p-2 hover:bg-accent rounded cursor-pointer">
                      <Checkbox
                        checked={filterQuartiers.includes(quartier)}
                        onCheckedChange={(checked) => {
                          setFilterQuartiers((prev) =>
                            checked ? [...prev, quartier] : prev.filter((q) => q !== quartier),
                          );
                        }}
                      />
                      <span className="text-sm">{quartier}</span>
                    </label>
                  ))}
                  {uniqueQuartiers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">Aucun quartier</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] h-10 justify-between",
                    filterArrondissements.length > 0 && "border-blue-500",
                  )}>
                  {filterArrondissements.length === 0
                    ? "Arrondissements"
                    : `${filterArrondissements.length} arrond.`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-2 max-h-[300px] overflow-y-auto" align="start">
                <div className="space-y-1">
                  {uniqueArrondissements.map((arrond) => (
                    <label
                      key={arrond}
                      className="flex items-center space-x-2 p-2 hover:bg-accent rounded cursor-pointer">
                      <Checkbox
                        checked={filterArrondissements.includes(arrond)}
                        onCheckedChange={(checked) => {
                          setFilterArrondissements((prev) =>
                            checked ? [...prev, arrond] : prev.filter((a) => a !== arrond),
                          );
                        }}
                      />
                      <span className="text-sm">{arrond}</span>
                    </label>
                  ))}
                  {uniqueArrondissements.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">Aucun arrondissement</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {hasGeoFilters && (
              <Button
                variant="ghost"
                size="sm"
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
        )}

        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Filtres actifs:</span>
            {dateFrom && (
              <Badge variant="secondary">
                Depuis: {dateFrom}
                <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setDateFrom("")} />
              </Badge>
            )}
            {dateTo && (
              <Badge variant="secondary">
                Jusqu'au: {dateTo}
                <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setDateTo("")} />
              </Badge>
            )}
            {searchTerm && (
              <Badge variant="secondary">
                Recherche: "{searchTerm}"
                <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setSearchTerm("")} />
              </Badge>
            )}
            {filterType !== "all" && (
              <Badge variant="secondary">
                Type: {filterType}
                <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setFilterType("all")} />
              </Badge>
            )}
            {filterStatutCommande !== "all" && (
              <Badge variant="secondary">
                Commande: {filterStatutCommande}
                <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setFilterStatutCommande("all")} />
              </Badge>
            )}
            {filterStatutLivraison !== "all" && (
              <Badge variant="secondary">
                Livraison: {filterStatutLivraison}
                <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setFilterStatutLivraison("all")} />
              </Badge>
            )}
            {filterStatutPaiement !== "all" && (
              <Badge variant="secondary">
                Paiement: {filterStatutPaiement}
                <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setFilterStatutPaiement("all")} />
              </Badge>
            )}
            {filterCommunes.map((commune) => (
              <Badge key={commune} variant="secondary" className="bg-blue-100 text-blue-800">
                <MapPin className="w-3 h-3 mr-1" />
                {commune}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterCommunes((prev) => prev.filter((c) => c !== commune))}
                />
              </Badge>
            ))}
            {filterQuartiers.map((quartier) => (
              <Badge key={quartier} variant="secondary" className="bg-blue-100 text-blue-800">
                <MapPin className="w-3 h-3 mr-1" />
                {quartier}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterQuartiers((prev) => prev.filter((q) => q !== quartier))}
                />
              </Badge>
            ))}
            {filterArrondissements.map((arrond) => (
              <Badge key={arrond} variant="secondary" className="bg-blue-100 text-blue-800">
                <MapPin className="w-3 h-3 mr-1" />
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

      {/* ===== ERROR ===== */}
      {error && (
        <div
          ref={errorRef}
          className="mx-4 lg:mx-8 mt-4 p-3 lg:p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
          {error}
        </div>
      )}

      {/* ===== CONTENT ===== */}
      <div className="p-4 lg:px-8 lg:py-0 lg:mt-6 space-y-4">
        <div className="hidden lg:flex items-center justify-between">
          <h2 className="text-2xl font-semibold">
            {filteredCommandes.length} commande{filteredCommandes.length > 1 ? "s" : ""}
            {hasDateFilter ? (
              <Badge className="ml-3 text-xs bg-amber-100 text-amber-800 border-amber-300">
                <History className="w-3 h-3 mr-1" />
                Vue historique
              </Badge>
            ) : isCached ? (
              <Badge variant="secondary" className="ml-3 text-xs">
                Données en cache
              </Badge>
            ) : null}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredCommandes.length === 0 ? (
          <div ref={emptyRef} className="text-center py-12">
            <Package className="w-12 h-12 lg:w-16 lg:h-16 mx-auto text-muted-foreground/50 mb-3 lg:mb-4" />
            <h3 className="text-base lg:text-lg font-medium">Aucune commande trouvée</h3>
            <p className="text-sm lg:text-base text-muted-foreground mt-1 lg:mt-2">
              {hasActiveFilters || searchTerm
                ? "Essayez de modifier vos filtres"
                : "Commencez par créer votre première commande"}
            </p>
          </div>
        ) : (
          <>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6"
                  : "space-y-3 lg:space-y-4"
              }>
              {paginatedCommandes.map((commande) => (
                <div key={commande.id} className="commande-card-item">
                  <CommandeCard
                    commande={commande}
                    onEdit={handleEditCommande}
                    onDelete={handleDeleteClick}
                    viewMode={viewMode}
                  />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div ref={paginationRef} className="flex items-center justify-between mt-4 lg:mt-6 pt-4 lg:pt-6 border-t">
                <div className="flex items-center gap-2 text-xs lg:text-sm text-muted-foreground">
                  <span>
                    {startIndex + 1}-{Math.min(endIndex, filteredCommandes.length)} / {filteredCommandes.length}
                  </span>
                  <span className="hidden lg:inline">
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}>
                      <SelectTrigger className="w-[100px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 / page</SelectItem>
                        <SelectItem value="12">12 / page</SelectItem>
                        <SelectItem value="24">24 / page</SelectItem>
                        <SelectItem value="48">48 / page</SelectItem>
                      </SelectContent>
                    </Select>
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="hidden lg:flex h-9 w-9"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}>
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 lg:h-9 w-8 lg:w-9"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="hidden lg:flex items-center gap-1 mx-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => setCurrentPage(pageNum)}>
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <span className="lg:hidden text-sm px-3">
                    {currentPage} / {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 lg:h-9 w-8 lg:w-9"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="hidden lg:flex h-9 w-9"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}>
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la commande de "{commandeToDelete?.client}" ? Cette
              action est irréversible.
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

export default GestionDesCommandes;
