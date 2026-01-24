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
  Check,
  ChevronsUpDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as commandeToolkit from "@/utils/commandeToolkit";
import * as commandeToolkit2 from "@/utils/commandeToolkit2";

const DesktopGestionDesCommandes = () => {
  const navigate = useNavigate();
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const { syncAndLoadCommandes, removeCommandeFromCache } = useCommandeCache();
  const {
    subscribeToCommandeNotifications,
    requestNotificationPermission,
    sendNotification,
  } = useCommandeNotifications("current-user-id"); // TODO: Obtenir l'ID utilisateur réel

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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  // Demander la permission pour les notifications au chargement
  useEffect(() => {
    const initNotifications = async () => {
      const { granted } = await requestNotificationPermission();
      if (granted) {
        // Notifications activées
      }
    };

    if (visible) {
      initNotifications();
    }
  }, [visible, requestNotificationPermission]);

  // S'abonner aux notifications en temps réel
  useEffect(() => {
    if (!visible) {
      return;
    }

    const unsubscribe = subscribeToCommandeNotifications((notification) => {
      // Ajouter la nouvelle commande à la liste
      if (notification.data?.commande_id) {
        // Recharger les commandes pour obtenir les dernières données
        loadCommandes();

        // Envoyer une notification locale
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

  // Charger les commandes à l'initialisation avec cache
  useEffect(() => {
    if (visible) {
      loadCommandes();
    }
  }, [visible]);

  // Charger les commandes depuis le cache et Supabase
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

  // Filtrer les commandes
  const filteredCommandes = commandes.filter((commande) => {
    const matchSearch =
      !searchTerm ||
      commande.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commande.contact_client
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
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
  }, [
    searchTerm,
    filterType,
    filterStatutCommande,
    filterStatutLivraison,
    filterStatutPaiement,
    filterCommunes,
    filterQuartiers,
    filterArrondissements,
  ]);

  // Réinitialiser les filtres
  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterStatutCommande("all");
    setFilterStatutLivraison("all");
    setFilterStatutPaiement("all");
    setFilterCommunes([]);
    setFilterQuartiers([]);
    setFilterArrondissements([]);
  };

  // Vérifier si des filtres géographiques sont actifs
  const hasGeoFilters =
    filterCommunes.length > 0 ||
    filterQuartiers.length > 0 ||
    filterArrondissements.length > 0;

  // Ouvrir le dialog de suppression
  const handleDeleteClick = (commande) => {
    setCommandeToDelete(commande);
    setDeleteDialogOpen(true);
  };

  // Naviguer vers la commande pour édition
  const handleEditCommande = (commande) => {
    navigate(`/commande?id=${commande.id}`);
  };

  // Confirmer la suppression
  const handleConfirmDelete = async () => {
    if (commandeToDelete) {
      try {
        const { error: err } = await commandeToolkit.deleteCommande(
          commandeToDelete.id,
        );
        if (err) {
          setError(err.message || "Erreur lors de la suppression");
        } else {
          // Supprimer du cache
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

  // Filtres actifs
  const hasActiveFilters =
    searchTerm ||
    filterType !== "all" ||
    filterStatutCommande !== "all" ||
    filterStatutLivraison !== "all" ||
    filterStatutPaiement !== "all" ||
    filterCommunes.length > 0 ||
    filterQuartiers.length > 0 ||
    filterArrondissements.length > 0;

  return (
    <div
      className="min-h-screen space-y-6 p-8"
      style={{ display: visible ? "block" : "none" }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            Gestion des Commandes
          </h1>
          <p className="text-muted-foreground text-lg mt-1">
            Gérez vos commandes de livraison et sur-place
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Export */}
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

          {/* Rafraîchir */}
          <Button
            variant="outline"
            size="lg"
            onClick={loadCommandes}
            disabled={loading}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Actualiser
          </Button>

          {/* Créer */}
          <Button size="lg" onClick={() => navigate("/commandes/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Commande
          </Button>
        </div>
      </motion.div>

      {/* Barre de recherche et filtres */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-4">
          {/* Recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par client, contact ou ID de commande..."
              className="pl-10 h-12"
            />
          </div>

          {/* Filtre Type */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] h-12">
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

          {/* Filtre Statut Commande */}
          <Select
            value={filterStatutCommande}
            onValueChange={setFilterStatutCommande}>
            <SelectTrigger className="w-[200px] h-12">
              <SelectValue placeholder="Statut Commande" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
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

          {/* Mode d'affichage */}
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

        {/* Filtres additionnels */}
        <div className="flex items-center gap-4">
          {/* Filtre Statut Livraison */}
          <Select
            value={filterStatutLivraison}
            onValueChange={setFilterStatutLivraison}>
            <SelectTrigger className="w-[180px] h-12">
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

          {/* Filtre Statut Paiement */}
          <Select
            value={filterStatutPaiement}
            onValueChange={setFilterStatutPaiement}>
            <SelectTrigger className="w-[200px] h-12">
              <SelectValue placeholder="Paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value={commandeToolkit.STATUTS_PAIEMENT.NON_PAYEE}>
                Non payée
              </SelectItem>
              <SelectItem
                value={commandeToolkit.STATUTS_PAIEMENT.PARTIELLEMENT_PAYEE}>
                Partiellement payée
              </SelectItem>
              <SelectItem value={commandeToolkit.STATUTS_PAIEMENT.PAYEE}>
                Payée
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Bouton Réinitialiser */}
          {hasActiveFilters && (
            <Button variant="outline" size="lg" onClick={handleResetFilters}>
              <X className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          )}
        </div>

        {/* Filtres géographiques avancés (sélection multiple) */}
        {(filterType === "all" ||
          filterType === commandeToolkit.TYPES_COMMANDE.LIVRAISON) && (
          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Filtres géographiques:</span>
            </div>

            {/* Filtre Communes (multi-select) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] h-10 justify-between",
                    filterCommunes.length > 0 && "border-blue-500",
                  )}>
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
                            checked
                              ? [...prev, commune]
                              : prev.filter((c) => c !== commune),
                          );
                        }}
                      />
                      <span className="text-sm">{commune}</span>
                    </label>
                  ))}
                  {uniqueCommunes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Aucune commune
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Filtre Quartiers (multi-select) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] h-10 justify-between",
                    filterQuartiers.length > 0 && "border-blue-500",
                  )}>
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
                            checked
                              ? [...prev, quartier]
                              : prev.filter((q) => q !== quartier),
                          );
                        }}
                      />
                      <span className="text-sm">{quartier}</span>
                    </label>
                  ))}
                  {uniqueQuartiers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Aucun quartier
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Filtre Arrondissements (multi-select) */}
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
                            checked
                              ? [...prev, arrond]
                              : prev.filter((a) => a !== arrond),
                          );
                        }}
                      />
                      <span className="text-sm">{arrond}</span>
                    </label>
                  ))}
                  {uniqueArrondissements.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Aucun arrondissement
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Reset filtres géo */}
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

        {/* Filtres actifs */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              Filtres actifs:
            </span>
            {searchTerm && (
              <Badge variant="secondary">
                Recherche: "{searchTerm}"
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setSearchTerm("")}
                />
              </Badge>
            )}
            {filterType !== "all" && (
              <Badge variant="secondary">
                Type: {filterType}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterType("all")}
                />
              </Badge>
            )}
            {filterStatutCommande !== "all" && (
              <Badge variant="secondary">
                Commande: {filterStatutCommande}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterStatutCommande("all")}
                />
              </Badge>
            )}
            {filterStatutLivraison !== "all" && (
              <Badge variant="secondary">
                Livraison: {filterStatutLivraison}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterStatutLivraison("all")}
                />
              </Badge>
            )}
            {filterStatutPaiement !== "all" && (
              <Badge variant="secondary">
                Paiement: {filterStatutPaiement}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterStatutPaiement("all")}
                />
              </Badge>
            )}
            {filterCommunes.length > 0 &&
              filterCommunes.map((commune) => (
                <Badge
                  key={commune}
                  variant="secondary"
                  className="bg-blue-100 text-blue-800">
                  <MapPin className="w-3 h-3 mr-1" />
                  {commune}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() =>
                      setFilterCommunes((prev) =>
                        prev.filter((c) => c !== commune),
                      )
                    }
                  />
                </Badge>
              ))}
            {filterQuartiers.length > 0 &&
              filterQuartiers.map((quartier) => (
                <Badge
                  key={quartier}
                  variant="secondary"
                  className="bg-blue-100 text-blue-800">
                  <MapPin className="w-3 h-3 mr-1" />
                  {quartier}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() =>
                      setFilterQuartiers((prev) =>
                        prev.filter((q) => q !== quartier),
                      )
                    }
                  />
                </Badge>
              ))}
            {filterArrondissements.length > 0 &&
              filterArrondissements.map((arrond) => (
                <Badge
                  key={arrond}
                  variant="secondary"
                  className="bg-blue-100 text-blue-800">
                  <MapPin className="w-3 h-3 mr-1" />
                  {arrond}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() =>
                      setFilterArrondissements((prev) =>
                        prev.filter((a) => a !== arrond),
                      )
                    }
                  />
                </Badge>
              ))}
          </div>
        )}
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
          {error}
        </motion.div>
      )}

      {/* Liste des commandes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">
            {filteredCommandes.length} commande
            {filteredCommandes.length > 1 ? "s" : ""}
            {isCached && (
              <Badge variant="secondary" className="ml-3 text-xs">
                Données en cache
              </Badge>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredCommandes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Aucune commande trouvée</h3>
            <p className="text-muted-foreground mt-2">
              {hasActiveFilters
                ? "Essayez de modifier vos filtres"
                : "Commencez par créer votre première commande"}
            </p>
          </motion.div>
        ) : (
          <>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }>
              <AnimatePresence>
                {paginatedCommandes.map((commande) => (
                  <CommandeCard
                    key={commande.id}
                    commande={commande}
                    onEdit={handleEditCommande}
                    onDelete={handleDeleteClick}
                    viewMode={viewMode}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between mt-6 pt-6 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Affichage {startIndex + 1}-
                    {Math.min(endIndex, filteredCommandes.length)} sur{" "}
                    {filteredCommandes.length}
                  </span>
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
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}>
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center gap-1 mx-2">
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
                          variant={
                            currentPage === pageNum ? "default" : "outline"
                          }
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => setCurrentPage(pageNum)}>
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}>
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
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
              {commandeToDelete?.client}" ? Cette action est irréversible.
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

      {/* Dialog Création/Édition - Supprimé, navigue vers /commandes?id=... */}
    </div>
  );
};

export default DesktopGestionDesCommandes;
