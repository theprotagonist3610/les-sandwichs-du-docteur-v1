import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGSAP } from "@/shared/hooks/useGSAP";
import { fadeInDown, fadeInUp, fadeIn, staggerFadeInUp } from "@/lib/animations";
import useCommandeRefresh from "@/features/commandes/hooks/useCommandeRefresh";
import { supabase } from "@/lib/supabase";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Search,
  RefreshCw,
  Loader2,
  X,
  Grid3x3,
  List,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MapPin,
  Clock,
  Package,
  ChevronsUpDown,
  CheckCircle,
  Filter,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import CommandeCard from "@/features/commandes/components/CommandeCard";
import * as commandeToolkit from "@/features/commandes/utils/commandeToolkit";
import { toast } from "sonner";

const CommandesEnAttente = () => {
  const navigate = useNavigate();

  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatutPaiement, setFilterStatutPaiement] = useState("all");
  const [filterCommunes, setFilterCommunes] = useState([]);
  const [filterQuartiers, setFilterQuartiers] = useState([]);
  const [filterArrondissements, setFilterArrondissements] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const headerRef = useRef(null);
  const statsRef = useRef(null);
  const filtersRef = useRef(null);
  const errorRef = useRef(null);
  const emptyRef = useRef(null);
  const paginationRef = useRef(null);

  useGSAP(() => {
    if (headerRef.current) fadeInDown(headerRef.current);
  }, []);

  useGSAP(() => {
    if (statsRef.current) fadeInUp(statsRef.current);
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

  const loadCommandes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { commandes: data, error: err } = await commandeToolkit.getAllCommandes({
        type: commandeToolkit.TYPES_COMMANDE.LIVRAISON,
        statut_livraison: commandeToolkit.STATUTS_LIVRAISON.EN_ATTENTE,
        statut_commande: commandeToolkit.STATUTS_COMMANDE.EN_COURS,
      });
      if (err) {
        setError(err.message || "Erreur lors du chargement des commandes");
      } else {
        setCommandes(data || []);
      }
    } catch (err) {
      setError("Une erreur est survenue lors du chargement des commandes");
    } finally {
      setLoading(false);
    }
  }, []);

  useCommandeRefresh(loadCommandes, false, "CommandesEnAttente");

  useEffect(() => {
    loadCommandes();
  }, [loadCommandes]);

  useEffect(() => {
    const channel = supabase
      .channel("commandes_en_attente_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "commandes" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newCommande = payload.new;
            if (
              newCommande.type === commandeToolkit.TYPES_COMMANDE.LIVRAISON &&
              newCommande.statut_livraison === commandeToolkit.STATUTS_LIVRAISON.EN_ATTENTE &&
              newCommande.statut_commande === commandeToolkit.STATUTS_COMMANDE.EN_COURS
            ) {
              setCommandes((prev) => [newCommande, ...prev]);
              toast.info("Nouvelle commande en attente", {
                description: `Client: ${newCommande.client}`,
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedCommande = payload.new;
            if (
              updatedCommande.statut_livraison !== commandeToolkit.STATUTS_LIVRAISON.EN_ATTENTE ||
              updatedCommande.statut_commande !== commandeToolkit.STATUTS_COMMANDE.EN_COURS
            ) {
              setCommandes((prev) => prev.filter((c) => c.id !== updatedCommande.id));
            } else {
              setCommandes((prev) =>
                prev.map((c) => (c.id === updatedCommande.id ? updatedCommande : c)),
              );
            }
          } else if (payload.eventType === "DELETE") {
            setCommandes((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const uniqueCommunes = [
    ...new Set(
      commandes.filter((c) => c.lieu_livraison?.commune).map((c) => c.lieu_livraison.commune),
    ),
  ].sort();

  const uniqueQuartiers = [
    ...new Set(
      commandes.filter((c) => c.lieu_livraison?.quartier).map((c) => c.lieu_livraison.quartier),
    ),
  ].sort();

  const uniqueArrondissements = [
    ...new Set(
      commandes
        .filter((c) => c.lieu_livraison?.arrondissement)
        .map((c) => c.lieu_livraison.arrondissement),
    ),
  ].sort();

  const filteredCommandes = commandes
    .filter((commande) => {
      const matchSearch =
        !searchTerm ||
        commande.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        commande.contact_client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        commande.id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatutPaiement =
        filterStatutPaiement === "all" || commande.statut_paiement === filterStatutPaiement;
      const matchCommune =
        filterCommunes.length === 0 || filterCommunes.includes(commande.lieu_livraison?.commune);
      const matchQuartier =
        filterQuartiers.length === 0 || filterQuartiers.includes(commande.lieu_livraison?.quartier);
      const matchArrondissement =
        filterArrondissements.length === 0 ||
        filterArrondissements.includes(commande.lieu_livraison?.arrondissement);
      return matchSearch && matchStatutPaiement && matchCommune && matchQuartier && matchArrondissement;
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const totalPages = Math.ceil(filteredCommandes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCommandes = filteredCommandes.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatutPaiement, filterCommunes, filterQuartiers, filterArrondissements]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterStatutPaiement("all");
    setFilterCommunes([]);
    setFilterQuartiers([]);
    setFilterArrondissements([]);
    setFilterSheetOpen(false);
  };

  const hasActiveFilters =
    searchTerm ||
    filterStatutPaiement !== "all" ||
    filterCommunes.length > 0 ||
    filterQuartiers.length > 0 ||
    filterArrondissements.length > 0;

  const hasGeoFilters =
    filterCommunes.length > 0 || filterQuartiers.length > 0 || filterArrondissements.length > 0;

  const handleEditCommande = (commande) => {
    navigate(`/commande/${commande.id}`);
  };

  const handleMarkAsDelivered = async (commande) => {
    try {
      const { error: err } = await commandeToolkit.updateStatutLivraison(
        commande.id,
        commandeToolkit.STATUTS_LIVRAISON.LIVREE,
        commande.version,
      );
      if (err) {
        toast.error("Erreur", { description: err.message });
      } else {
        setCommandes((prev) => prev.filter((c) => c.id !== commande.id));
        toast.success("Livraison confirmée", {
          description: `Commande de ${commande.client} livrée avec succès`,
        });
      }
    } catch (err) {
      toast.error("Erreur", { description: err.message });
    }
  };

  const handleDeliverAndClose = async (commande) => {
    try {
      const { error } = await commandeToolkit.deliverAndCloseCommande(commande.id, commande.version);
      if (error) {
        toast.error("Erreur", { description: error.message });
      } else {
        setCommandes((prev) => prev.filter((c) => c.id !== commande.id));
        toast.success("Commande livrée et clôturée", {
          description: `Commande de ${commande.client} terminée avec succès`,
        });
      }
    } catch (err) {
      toast.error("Erreur", { description: err.message });
    }
  };

  const statsNonPayees = commandes.filter(
    (c) => c.statut_paiement === commandeToolkit.STATUTS_PAIEMENT.NON_PAYEE,
  ).length;
  const statsPartPayees = commandes.filter(
    (c) => c.statut_paiement === commandeToolkit.STATUTS_PAIEMENT.PARTIELLEMENT_PAYEE,
  ).length;
  const statsPayees = commandes.filter(
    (c) => c.statut_paiement === commandeToolkit.STATUTS_PAIEMENT.PAYEE,
  ).length;

  return (
    <div className="min-h-screen">
      {/* ===== DESKTOP HEADER ===== */}
      <div ref={headerRef} className="hidden lg:flex items-center justify-between p-8 pb-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/commandes")} className="h-10 w-10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              <Clock className="w-10 h-10 text-orange-500" />
              Commandes en Attente
            </h1>
            <p className="text-muted-foreground text-lg mt-1">
              Commandes de livraison en attente d'être expédiées
            </p>
          </div>
        </div>
        <Button variant="outline" size="lg" onClick={loadCommandes} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* ===== MOBILE HEADER (sticky) ===== */}
      <div className="lg:hidden sticky top-0 z-20 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/commandes")}
              className="h-8 w-8 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Clock className="w-6 h-6 text-orange-500" />
            <h1 className="text-lg font-semibold">En Attente</h1>
            <Badge variant="secondary">{commandes.length}</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={loadCommandes} disabled={loading}>
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="pl-9 h-10"
            />
          </div>
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Filter className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[50vh]">
              <SheetHeader>
                <SheetTitle>Filtres</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Statut de paiement</label>
                  <Select
                    value={filterStatutPaiement}
                    onValueChange={(value) => {
                      setFilterStatutPaiement(value);
                      setFilterSheetOpen(false);
                    }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les paiements</SelectItem>
                      <SelectItem value={commandeToolkit.STATUTS_PAIEMENT.NON_PAYEE}>
                        Non payée
                      </SelectItem>
                      <SelectItem value={commandeToolkit.STATUTS_PAIEMENT.PARTIELLEMENT_PAYEE}>
                        Partiellement payée
                      </SelectItem>
                      <SelectItem value={commandeToolkit.STATUTS_PAIEMENT.PAYEE}>Payée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" className="w-full" onClick={handleResetFilters}>
                  Réinitialiser les filtres
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div ref={statsRef} className="grid grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-4 p-4 lg:px-8 lg:pt-6">
        <div className="bg-card border rounded-lg p-3 lg:p-4 text-center lg:text-left">
          <div className="lg:flex lg:items-center lg:gap-3">
            <div className="hidden lg:block p-2 rounded-full bg-orange-100">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <Clock className="lg:hidden w-5 h-5 mx-auto text-orange-500 mb-1" />
            <div>
              <p className="text-xs lg:text-sm text-muted-foreground lg:mb-0">En attente</p>
              <p className="text-xl lg:text-2xl font-bold">{commandes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-3 lg:p-4 text-center lg:text-left">
          <div className="lg:flex lg:items-center lg:gap-3">
            <div className="hidden lg:block p-2 rounded-full bg-red-100">
              <Package className="w-5 h-5 text-red-600" />
            </div>
            <Package className="lg:hidden w-5 h-5 mx-auto text-red-500 mb-1" />
            <div>
              <p className="text-xs lg:text-sm text-muted-foreground">Non payées</p>
              <p className="text-xl lg:text-2xl font-bold">{statsNonPayees}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-3 lg:p-4 text-center lg:text-left lg:block hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-yellow-100">
              <Package className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Partiellement payées</p>
              <p className="text-2xl font-bold">{statsPartPayees}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-3 lg:p-4 text-center lg:text-left">
          <div className="lg:flex lg:items-center lg:gap-3">
            <div className="hidden lg:block p-2 rounded-full bg-green-100">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <CheckCircle className="lg:hidden w-5 h-5 mx-auto text-green-500 mb-1" />
            <div>
              <p className="text-xs lg:text-sm text-muted-foreground">Payées</p>
              <p className="text-xl lg:text-2xl font-bold">{statsPayees}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== DESKTOP FILTERS ===== */}
      <div ref={filtersRef} className="hidden lg:block mx-8 bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par client, contact ou ID..."
              className="pl-10 h-12"
            />
          </div>

          <Select value={filterStatutPaiement} onValueChange={setFilterStatutPaiement}>
            <SelectTrigger className="w-[200px] h-12">
              <SelectValue placeholder="Paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les paiements</SelectItem>
              <SelectItem value={commandeToolkit.STATUTS_PAIEMENT.NON_PAYEE}>Non payée</SelectItem>
              <SelectItem value={commandeToolkit.STATUTS_PAIEMENT.PARTIELLEMENT_PAYEE}>
                Partiellement payée
              </SelectItem>
              <SelectItem value={commandeToolkit.STATUTS_PAIEMENT.PAYEE}>Payée</SelectItem>
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

          {hasActiveFilters && (
            <Button variant="outline" size="lg" onClick={handleResetFilters}>
              <X className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          )}
        </div>

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

        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Filtres actifs:</span>
            {searchTerm && (
              <Badge variant="secondary">
                Recherche: "{searchTerm}"
                <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setSearchTerm("")} />
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
      <div className="px-4 lg:px-8 lg:mt-6 space-y-4">
        <div className="hidden lg:flex items-center justify-between mt-4">
          <h2 className="text-2xl font-semibold">
            {filteredCommandes.length} commande{filteredCommandes.length > 1 ? "s" : ""} en attente
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredCommandes.length === 0 ? (
          <div ref={emptyRef} className="text-center py-12">
            <Clock className="w-12 h-12 lg:w-16 lg:h-16 mx-auto text-muted-foreground/50 mb-3 lg:mb-4" />
            <h3 className="text-base lg:text-lg font-medium">Aucune commande en attente</h3>
            <p className="text-sm lg:text-base text-muted-foreground mt-1 lg:mt-2">
              {hasActiveFilters ? "Essayez de modifier vos filtres" : "Toutes les commandes ont été traitées"}
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
                    onDeliver={handleMarkAsDelivered}
                    onDeliverAndClose={handleDeliverAndClose}
                    showDeliverButton={true}
                    viewMode={viewMode}
                  />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div
                ref={paginationRef}
                className="flex items-center justify-between mt-4 lg:mt-6 pt-4 lg:pt-6 border-t">
                <div className="flex items-center gap-2 text-xs lg:text-sm text-muted-foreground">
                  <span>
                    {startIndex + 1}-{Math.min(endIndex, filteredCommandes.length)} /{" "}
                    {filteredCommandes.length}
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
    </div>
  );
};

export default CommandesEnAttente;
