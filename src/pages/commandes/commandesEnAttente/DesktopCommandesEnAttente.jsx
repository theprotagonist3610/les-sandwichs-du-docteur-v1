import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useBreakpoint from "@/hooks/useBreakpoint";
import { supabase } from "@/config/supabase";
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
  Search,
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
  Clock,
  Package,
  ChevronsUpDown,
  Truck,
  CheckCircle,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import CommandeCard from "@/components/commandes/CommandeCard";
import * as commandeToolkit from "@/utils/commandeToolkit";
import { toast } from "sonner";

/**
 * Vue Desktop des commandes en attente de livraison
 * Affiche les commandes avec statut_livraison = "en_attente"
 */
const DesktopCommandesEnAttente = () => {
  const navigate = useNavigate();
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  // États locaux
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatutPaiement, setFilterStatutPaiement] = useState("all");
  // Filtres géographiques
  const [filterCommunes, setFilterCommunes] = useState([]);
  const [filterQuartiers, setFilterQuartiers] = useState([]);
  const [filterArrondissements, setFilterArrondissements] = useState([]);
  const [viewMode, setViewMode] = useState("grid");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  // Charger les commandes en attente
  const loadCommandes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Récupérer les commandes de type livraison avec statut_livraison = en_attente
      const { commandes: data, error: err } =
        await commandeToolkit.getAllCommandes({
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger au montage
  useEffect(() => {
    if (visible) {
      loadCommandes();
    }
  }, [visible, loadCommandes]);

  // Realtime: écouter les changements sur la table commandes
  useEffect(() => {
    if (!visible) return;

    const channel = supabase
      .channel("commandes_en_attente_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "commandes",
        },
        (payload) => {
          console.log("Realtime commande change:", payload);

          if (payload.eventType === "INSERT") {
            // Ajouter si c'est une commande en attente
            const newCommande = payload.new;
            if (
              newCommande.type === commandeToolkit.TYPES_COMMANDE.LIVRAISON &&
              newCommande.statut_livraison ===
                commandeToolkit.STATUTS_LIVRAISON.EN_ATTENTE &&
              newCommande.statut_commande ===
                commandeToolkit.STATUTS_COMMANDE.EN_COURS
            ) {
              setCommandes((prev) => [newCommande, ...prev]);
              toast.info("Nouvelle commande en attente", {
                description: `Client: ${newCommande.client}`,
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedCommande = payload.new;
            // Si la commande n'est plus en attente, la retirer de la liste
            if (
              updatedCommande.statut_livraison !==
                commandeToolkit.STATUTS_LIVRAISON.EN_ATTENTE ||
              updatedCommande.statut_commande !==
                commandeToolkit.STATUTS_COMMANDE.EN_COURS
            ) {
              setCommandes((prev) =>
                prev.filter((c) => c.id !== updatedCommande.id)
              );
            } else {
              // Mettre à jour la commande existante
              setCommandes((prev) =>
                prev.map((c) =>
                  c.id === updatedCommande.id ? updatedCommande : c
                )
              );
            }
          } else if (payload.eventType === "DELETE") {
            setCommandes((prev) =>
              prev.filter((c) => c.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [visible]);

  // Extraire les valeurs uniques pour les filtres géographiques
  const uniqueCommunes = [
    ...new Set(
      commandes
        .filter((c) => c.lieu_livraison?.commune)
        .map((c) => c.lieu_livraison.commune)
    ),
  ].sort();

  const uniqueQuartiers = [
    ...new Set(
      commandes
        .filter((c) => c.lieu_livraison?.quartier)
        .map((c) => c.lieu_livraison.quartier)
    ),
  ].sort();

  const uniqueArrondissements = [
    ...new Set(
      commandes
        .filter((c) => c.lieu_livraison?.arrondissement)
        .map((c) => c.lieu_livraison.arrondissement)
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

    const matchStatutPaiement =
      filterStatutPaiement === "all" ||
      commande.statut_paiement === filterStatutPaiement;

    // Filtres géographiques
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
    filterStatutPaiement,
    filterCommunes,
    filterQuartiers,
    filterArrondissements,
  ]);

  // Réinitialiser les filtres
  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterStatutPaiement("all");
    setFilterCommunes([]);
    setFilterQuartiers([]);
    setFilterArrondissements([]);
  };

  // Vérifier si des filtres sont actifs
  const hasActiveFilters =
    searchTerm ||
    filterStatutPaiement !== "all" ||
    filterCommunes.length > 0 ||
    filterQuartiers.length > 0 ||
    filterArrondissements.length > 0;

  const hasGeoFilters =
    filterCommunes.length > 0 ||
    filterQuartiers.length > 0 ||
    filterArrondissements.length > 0;

  // Naviguer vers la commande pour édition
  const handleEditCommande = (commande) => {
    navigate(`/commande?id=${commande.id}`);
  };

  // Marquer comme "en cours de livraison"
  const handleStartDelivery = async (commande) => {
    try {
      const { error: err } = await commandeToolkit.updateStatutLivraison(
        commande.id,
        commandeToolkit.STATUTS_LIVRAISON.EN_COURS,
        commande.version
      );

      if (err) {
        toast.error("Erreur", { description: err.message });
      } else {
        toast.success("Livraison démarrée", {
          description: `Commande de ${commande.client} en cours de livraison`,
        });
      }
    } catch (err) {
      toast.error("Erreur", { description: err.message });
    }
  };

  // Marquer comme livré
  const handleMarkAsDelivered = async (commande) => {
    try {
      const { error: err } = await commandeToolkit.updateStatutLivraison(
        commande.id,
        commandeToolkit.STATUTS_LIVRAISON.LIVREE,
        commande.version
      );

      if (err) {
        toast.error("Erreur", { description: err.message });
      } else {
        toast.success("Livraison confirmée", {
          description: `Commande de ${commande.client} livrée avec succès`,
        });
      }
    } catch (err) {
      toast.error("Erreur", { description: err.message });
    }
  };

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
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            <Clock className="w-10 h-10 text-orange-500" />
            Commandes en Attente
          </h1>
          <p className="text-muted-foreground text-lg mt-1">
            Commandes de livraison en attente d'être expédiées
          </p>
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </motion.div>

      {/* Stats rapides */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-100">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-2xl font-bold">{commandes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100">
              <Package className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Non payées</p>
              <p className="text-2xl font-bold">
                {
                  commandes.filter(
                    (c) =>
                      c.statut_paiement ===
                      commandeToolkit.STATUTS_PAIEMENT.NON_PAYEE
                  ).length
                }
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-yellow-100">
              <Package className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Partiellement payées
              </p>
              <p className="text-2xl font-bold">
                {
                  commandes.filter(
                    (c) =>
                      c.statut_paiement ===
                      commandeToolkit.STATUTS_PAIEMENT.PARTIELLEMENT_PAYEE
                  ).length
                }
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payées</p>
              <p className="text-2xl font-bold">
                {
                  commandes.filter(
                    (c) =>
                      c.statut_paiement ===
                      commandeToolkit.STATUTS_PAIEMENT.PAYEE
                  ).length
                }
              </p>
            </div>
          </div>
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
              placeholder="Rechercher par client, contact ou ID..."
              className="pl-10 h-12"
            />
          </div>

          {/* Filtre Statut Paiement */}
          <Select
            value={filterStatutPaiement}
            onValueChange={setFilterStatutPaiement}>
            <SelectTrigger className="w-[200px] h-12">
              <SelectValue placeholder="Paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les paiements</SelectItem>
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

          {/* Bouton Réinitialiser */}
          {hasActiveFilters && (
            <Button variant="outline" size="lg" onClick={handleResetFilters}>
              <X className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          )}
        </div>

        {/* Filtres géographiques */}
        <div className="flex items-center gap-4 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>Filtres géographiques:</span>
          </div>

          {/* Filtre Communes */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[180px] h-10 justify-between",
                  filterCommunes.length > 0 && "border-blue-500"
                )}>
                {filterCommunes.length === 0
                  ? "Communes"
                  : `${filterCommunes.length} commune${filterCommunes.length > 1 ? "s" : ""}`}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[220px] p-2 max-h-[300px] overflow-y-auto"
              align="start">
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
                            : prev.filter((c) => c !== commune)
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

          {/* Filtre Quartiers */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[180px] h-10 justify-between",
                  filterQuartiers.length > 0 && "border-blue-500"
                )}>
                {filterQuartiers.length === 0
                  ? "Quartiers"
                  : `${filterQuartiers.length} quartier${filterQuartiers.length > 1 ? "s" : ""}`}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[220px] p-2 max-h-[300px] overflow-y-auto"
              align="start">
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
                            : prev.filter((q) => q !== quartier)
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

          {/* Filtre Arrondissements */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[180px] h-10 justify-between",
                  filterArrondissements.length > 0 && "border-blue-500"
                )}>
                {filterArrondissements.length === 0
                  ? "Arrondissements"
                  : `${filterArrondissements.length} arrond.`}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[220px] p-2 max-h-[300px] overflow-y-auto"
              align="start">
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
                            : prev.filter((a) => a !== arrond)
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
            {filterStatutPaiement !== "all" && (
              <Badge variant="secondary">
                Paiement: {filterStatutPaiement}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => setFilterStatutPaiement("all")}
                />
              </Badge>
            )}
            {filterCommunes.map((commune) => (
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
                      prev.filter((c) => c !== commune)
                    )
                  }
                />
              </Badge>
            ))}
            {filterQuartiers.map((quartier) => (
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
                      prev.filter((q) => q !== quartier)
                    )
                  }
                />
              </Badge>
            ))}
            {filterArrondissements.map((arrond) => (
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
                      prev.filter((a) => a !== arrond)
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
            {filteredCommandes.length > 1 ? "s" : ""} en attente
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
            <Clock className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">
              Aucune commande en attente
            </h3>
            <p className="text-muted-foreground mt-2">
              {hasActiveFilters
                ? "Essayez de modifier vos filtres"
                : "Toutes les commandes ont été traitées"}
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
                  <motion.div
                    key={commande.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative">
                    <CommandeCard
                      commande={commande}
                      onEdit={handleEditCommande}
                      viewMode={viewMode}
                    />
                    {/* Actions rapides */}
                    <div className="absolute bottom-4 right-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartDelivery(commande)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
                        <Truck className="w-4 h-4 mr-1" />
                        Démarrer
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleMarkAsDelivered(commande)}
                        className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Livré
                      </Button>
                    </div>
                  </motion.div>
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
    </div>
  );
};

export default DesktopCommandesEnAttente;
