import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  TrendingUp,
  Calendar,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  FileText,
} from "lucide-react";
import * as comptabiliteToolkit from "@/utils/comptabiliteToolkit";
import EncaissementForm from "./EncaissementForm";

/**
 * Liste complète des encaissements avec filtres et pagination
 * 100% Responsive
 */
const EncaissementsList = () => {
  // États
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Filtres
  const [filters, setFilters] = useState({
    compte: "",
    searchTerm: "",
    startDate: "",
    endDate: "",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  // Statistiques
  const [stats, setStats] = useState({
    totalEncaissements: 0,
    nombreOperations: 0,
  });

  // Charger les opérations
  const fetchOperations = async () => {
    setLoading(true);
    try {
      const result = await comptabiliteToolkit.getOperations({
        operation: comptabiliteToolkit.TYPES_OPERATION.ENCAISSEMENT,
        compte: filters.compte || undefined,
        searchTerm: filters.searchTerm || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        limit,
        offset: (currentPage - 1) * limit,
        orderBy: "date_operation",
        ascending: false,
      });

      if (result.success) {
        setOperations(result.operations);
        setTotal(result.total);

        // Calculer les stats
        const totalEnc = result.operations.reduce(
          (sum, op) => sum + parseFloat(op.montant),
          0
        );
        setStats({
          totalEncaissements: totalEnc,
          nombreOperations: result.total,
        });
      }
    } catch (error) {
      console.error("Erreur chargement encaissements:", error);
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage et quand les filtres changent
  useEffect(() => {
    fetchOperations();
  }, [currentPage, filters]);

  // Réinitialiser à la page 1 quand les filtres changent
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [filters.compte, filters.searchTerm, filters.startDate, filters.endDate]);

  // Calculer le nombre de pages
  const totalPages = useMemo(() => {
    return Math.ceil(total / limit);
  }, [total, limit]);

  // Gérer le changement de filtre
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setFilters({
      compte: "",
      searchTerm: "",
      startDate: "",
      endDate: "",
    });
  };

  // Gérer le succès d'ajout
  const handleAddSuccess = () => {
    setShowAddDialog(false);
    fetchOperations(); // Recharger la liste
  };

  // Formater un montant
  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR").format(montant) + " FCFA";
  };

  // Formater une date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header avec bouton d'ajout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Encaissements</h2>
          <p className="text-sm text-muted-foreground">
            Gérer et consulter les encaissements
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nouvel encaissement
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total encaissé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <p className="text-2xl font-bold text-emerald-600">
                {formatMontant(stats.totalEncaissements)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nombre d'opérations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <p className="text-2xl font-bold">{stats.nombreOperations}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un motif..."
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Compte */}
            <Select
              value={filters.compte || "tous"}
              onValueChange={(value) => handleFilterChange("compte", value === "tous" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les comptes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les comptes</SelectItem>
                {Object.entries(comptabiliteToolkit.COMPTE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date début */}
            <Input
              type="date"
              placeholder="Date début"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
            />

            {/* Date fin */}
            <Input
              type="date"
              placeholder="Date fin"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
            />
          </div>

          {/* Bouton réinitialiser */}
          {(filters.compte || filters.searchTerm || filters.startDate || filters.endDate) && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste des opérations */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : operations.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Aucun encaissement trouvé</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddDialog(true)}
                className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Créer le premier encaissement
              </Button>
            </div>
          ) : (
            <>
              {/* Table desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium text-sm">Date</th>
                      <th className="text-left p-4 font-medium text-sm">Compte</th>
                      <th className="text-left p-4 font-medium text-sm">Motif</th>
                      <th className="text-right p-4 font-medium text-sm">Montant</th>
                      <th className="text-left p-4 font-medium text-sm">Par</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {operations.map((op) => (
                      <tr key={op.id} className="hover:bg-muted/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{formatDate(op.date_operation)}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="outline">
                              {comptabiliteToolkit.COMPTE_LABELS[op.compte] || op.compte}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm line-clamp-2">{op.motif}</p>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-semibold text-emerald-600">
                            {formatMontant(op.montant)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-muted-foreground">
                            {op.user?.prenoms} {op.user?.nom}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards mobile */}
              <div className="md:hidden divide-y">
                {operations.map((op) => (
                  <div key={op.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                        <span className="font-semibold text-emerald-600">
                          {formatMontant(op.montant)}
                        </span>
                      </div>
                      <Badge variant="outline">
                        {comptabiliteToolkit.COMPTE_LABELS[op.compte] || op.compte}
                      </Badge>
                    </div>

                    <p className="text-sm text-foreground">{op.motif}</p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(op.date_operation)}
                      </div>
                      <span>
                        {op.user?.prenoms} {op.user?.nom}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} sur {totalPages} ({total} résultats)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'ajout */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvel encaissement</DialogTitle>
          </DialogHeader>
          <EncaissementForm
            onSuccess={handleAddSuccess}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EncaissementsList;
