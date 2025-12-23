import { useState, useMemo } from "react";
import LivreurCard from "./LivreurCard";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package,
  CheckCircle2,
  XCircle,
} from "lucide-react";

/**
 * Composant liste paginée de livreurs
 * @param {Object} props
 * @param {Array} props.livreurs - Liste complète des livreurs (non filtrée)
 * @param {string} props.searchTerm - Terme de recherche
 * @param {Function} props.onEdit - Callback pour éditer un livreur
 * @param {Function} props.onDelete - Callback pour supprimer un livreur
 * @param {Function} props.onToggleActive - Callback pour activer/désactiver
 * @param {number} props.itemsPerPage - Nombre d'éléments par page (défaut: 20)
 * @param {boolean} props.isMobile - Mode mobile
 */
const LivreurList = ({
  livreurs = [],
  searchTerm = "",
  onEdit,
  onDelete,
  onToggleActive,
  itemsPerPage = 20,
  isMobile = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive

  // Filtrer les livreurs par recherche ET par statut
  const filteredLivreurs = useMemo(() => {
    let results = [...livreurs];

    // Filtre par recherche
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        (l) =>
          l.denomination?.toLowerCase().includes(term) ||
          l.contact?.toLowerCase().includes(term)
      );
    }

    // Filtre par statut
    if (statusFilter === "active") {
      results = results.filter((l) => l.is_active);
    } else if (statusFilter === "inactive") {
      results = results.filter((l) => !l.is_active);
    }

    return results;
  }, [livreurs, searchTerm, statusFilter]);

  // Calculer la pagination
  const totalPages = Math.ceil(filteredLivreurs.length / itemsPerPage);

  const paginatedLivreurs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLivreurs.slice(startIndex, endIndex);
  }, [filteredLivreurs, currentPage, itemsPerPage]);

  // Navigation pagination
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () =>
    setCurrentPage((prev) => Math.max(1, prev - 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  const goToLastPage = () => setCurrentPage(totalPages);

  // Réinitialiser à la page 1 si on change de filtre
  useMemo(() => {
    setCurrentPage(1);
  }, [filteredLivreurs.length, statusFilter]);

  // Compter les stats
  const stats = useMemo(() => {
    return {
      total: livreurs.length,
      active: livreurs.filter((l) => l.is_active).length,
      inactive: livreurs.filter((l) => !l.is_active).length,
    };
  }, [livreurs]);

  // État vide
  if (livreurs.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center ${
          isMobile ? "py-12" : "py-16"
        } text-center`}
      >
        <Package
          className={`${
            isMobile ? "w-16 h-16" : "w-20 h-20"
          } text-muted-foreground/50 mb-4`}
        />
        <h3
          className={`font-semibold ${
            isMobile ? "text-base" : "text-lg"
          } text-muted-foreground mb-2`}
        >
          Aucun livreur trouvé
        </h3>
        <p className={`${isMobile ? "text-xs" : "text-sm"} text-muted-foreground`}>
          Commencez par créer un nouveau livreur.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Boutons de filtrage */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size={isMobile ? "sm" : "default"}
            onClick={() => setStatusFilter("all")}
            className="gap-2"
          >
            <Package className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
            {!isMobile && "Tous"}
            <span className={`${isMobile ? "text-xs" : "text-sm"} font-medium`}>
              ({stats.total})
            </span>
          </Button>

          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            size={isMobile ? "sm" : "default"}
            onClick={() => setStatusFilter("active")}
            className="gap-2"
          >
            <CheckCircle2 className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
            {!isMobile && "Actifs"}
            <span className={`${isMobile ? "text-xs" : "text-sm"} font-medium`}>
              ({stats.active})
            </span>
          </Button>

          <Button
            variant={statusFilter === "inactive" ? "default" : "outline"}
            size={isMobile ? "sm" : "default"}
            onClick={() => setStatusFilter("inactive")}
            className="gap-2"
          >
            <XCircle className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
            {!isMobile && "Inactifs"}
            <span className={`${isMobile ? "text-xs" : "text-sm"} font-medium`}>
              ({stats.inactive})
            </span>
          </Button>
        </div>

        <div className={`${isMobile ? "text-xs" : "text-sm"} text-muted-foreground`}>
          {filteredLivreurs.length} résultat{filteredLivreurs.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* État vide avec filtre actif */}
      {filteredLivreurs.length === 0 && livreurs.length > 0 && (
        <div
          className={`flex flex-col items-center justify-center ${
            isMobile ? "py-12" : "py-16"
          } text-center`}
        >
          <Package
            className={`${
              isMobile ? "w-16 h-16" : "w-20 h-20"
            } text-muted-foreground/50 mb-4`}
          />
          <h3
            className={`font-semibold ${
              isMobile ? "text-base" : "text-lg"
            } text-muted-foreground mb-2`}
          >
            Aucun livreur {statusFilter === "active" ? "actif" : "inactif"}
          </h3>
          <p className={`${isMobile ? "text-xs" : "text-sm"} text-muted-foreground`}>
            Essayez un autre filtre.
          </p>
        </div>
      )}

      {/* Grille de cartes */}
      {filteredLivreurs.length > 0 && (
        <div
          className={`grid gap-4 ${
            isMobile
              ? "grid-cols-1"
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {paginatedLivreurs.map((livreur) => (
            <LivreurCard
              key={livreur.id}
              livreur={livreur}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}

      {/* Contrôles de pagination */}
      {filteredLivreurs.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 pt-4 border-t">
          {/* Informations */}
          <div className={isMobile ? "text-xs" : "text-sm text-muted-foreground"}>
            Page {currentPage} sur {totalPages} ({filteredLivreurs.length} livreur
            {filteredLivreurs.length > 1 ? "s" : ""})
          </div>

          {/* Boutons de navigation */}
          <div className="flex items-center gap-2">
            {/* Première page */}
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              onClick={goToFirstPage}
              disabled={currentPage === 1}
              className={isMobile ? "px-2" : ""}
            >
              <ChevronsLeft className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
            </Button>

            {/* Page précédente */}
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className={isMobile ? "px-2" : ""}
            >
              <ChevronLeft className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
            </Button>

            {/* Numéro de page */}
            <div
              className={`${
                isMobile ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
              } border rounded-md bg-background font-medium min-w-[3rem] text-center`}
            >
              {currentPage}
            </div>

            {/* Page suivante */}
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className={isMobile ? "px-2" : ""}
            >
              <ChevronRight className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
            </Button>

            {/* Dernière page */}
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
              className={isMobile ? "px-2" : ""}
            >
              <ChevronsRight className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LivreurList;
