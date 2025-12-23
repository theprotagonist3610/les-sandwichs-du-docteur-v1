import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  List,
} from "lucide-react";
import AdresseCard from "./AdresseCard";

/**
 * Liste paginée des adresses
 */
const AdresseList = ({
  adresses,
  onEdit,
  onDelete,
  onToggleActive,
  isMobile = false,
  itemsPerPage = 20,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculer la pagination
  const totalPages = Math.ceil(adresses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAdresses = adresses.slice(startIndex, endIndex);

  // Naviguer vers la première page
  const goToFirstPage = () => setCurrentPage(1);

  // Naviguer vers la dernière page
  const goToLastPage = () => setCurrentPage(totalPages);

  // Page précédente
  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Page suivante
  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Réinitialiser la page quand la liste change
  useState(() => {
    setCurrentPage(1);
  }, [adresses.length]);

  if (adresses.length === 0) {
    return (
      <Card>
        <CardContent className={`flex flex-col items-center justify-center ${isMobile ? "py-8 px-4" : "py-12"}`}>
          <List className={`text-muted-foreground ${isMobile ? "w-12 h-12" : "w-16 h-16"} mb-4`} />
          <p className={`text-muted-foreground text-center ${isMobile ? "text-sm" : "text-base"}`}>
            Aucune adresse trouvée
          </p>
          <p className={`text-muted-foreground text-center ${isMobile ? "text-xs" : "text-sm"} mt-2`}>
            Ajustez vos filtres ou ajoutez une nouvelle adresse
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <Card>
        <CardHeader className={isMobile ? "px-4 py-3" : ""}>
          <div className="flex items-center justify-between">
            <CardTitle className={isMobile ? "text-sm" : "text-base"}>
              {adresses.length} adresse{adresses.length > 1 ? "s" : ""} trouvée{adresses.length > 1 ? "s" : ""}
            </CardTitle>
            {totalPages > 1 && (
              <div className={`text-muted-foreground ${isMobile ? "text-xs" : "text-sm"}`}>
                Page {currentPage} sur {totalPages}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Liste des adresses */}
      <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
        {currentAdresses.map((adresse) => (
          <AdresseCard
            key={adresse.id}
            adresse={adresse}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleActive={onToggleActive}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className={isMobile ? "p-3" : "p-4"}>
            <div className="flex items-center justify-between">
              {/* Informations */}
              <div className={`text-muted-foreground ${isMobile ? "text-xs" : "text-sm"}`}>
                Affichage de {startIndex + 1} à {Math.min(endIndex, adresses.length)} sur {adresses.length}
              </div>

              {/* Contrôles de pagination */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                  className={isMobile ? "h-8 w-8 p-0" : ""}
                >
                  <ChevronsLeft className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                </Button>

                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                  className={isMobile ? "h-8 w-8 p-0" : ""}
                >
                  <ChevronLeft className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                </Button>

                <div className={`flex items-center gap-1 ${isMobile ? "mx-1" : "mx-2"}`}>
                  {/* Afficher les numéros de page */}
                  {(() => {
                    const pagesToShow = [];
                    const maxPagesToShow = isMobile ? 3 : 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
                    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

                    // Ajuster si on est près de la fin
                    if (endPage - startPage < maxPagesToShow - 1) {
                      startPage = Math.max(1, endPage - maxPagesToShow + 1);
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pagesToShow.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          size={isMobile ? "sm" : "default"}
                          onClick={() => setCurrentPage(i)}
                          className={isMobile ? "h-8 w-8 p-0 text-xs" : "h-9 w-9 p-0"}
                        >
                          {i}
                        </Button>
                      );
                    }

                    return pagesToShow;
                  })()}
                </div>

                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={isMobile ? "h-8 w-8 p-0" : ""}
                >
                  <ChevronRight className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                </Button>

                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages}
                  className={isMobile ? "h-8 w-8 p-0" : ""}
                >
                  <ChevronsRight className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdresseList;
