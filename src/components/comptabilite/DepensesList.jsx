import { useState, useEffect, useMemo, useCallback } from "react";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Search,
  Filter,
  TrendingDown,
  Calendar,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  FileText,
  MapPin,
} from "lucide-react";
import * as comptabiliteToolkit from "@/utils/comptabiliteToolkit";
import { getAllEmplacements } from "@/utils/emplacementToolkit";
import DepenseForm from "./DepenseForm";

const formatMontant = (montant) =>
  new Intl.NumberFormat("fr-FR").format(montant) + " FCFA";

const parseMotif = (motif) => {
  if (typeof motif === "object" && motif !== null) return motif;
  if (typeof motif === "string") {
    try { return JSON.parse(motif); } catch { return { motif }; }
  }
  return {};
};

const getMotifTexte = (motif) => parseMotif(motif)?.motif ?? motif;
const getMotifEmplacement = (motif) => parseMotif(motif)?.emplacement ?? null;
const getMotifQuantite = (motif) => parseMotif(motif)?.quantite ?? null;
const getMotifUnite = (motif) => parseMotif(motif)?.unite ?? null;

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const TooltipChart = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow text-sm">
      <p className="font-medium mb-1">{label}</p>
      <p className="text-red-600 font-semibold">{formatMontant(payload[0].value)}</p>
    </div>
  );
};

/**
 * Liste complète des dépenses avec filtres, filtre emplacement et barchart
 */
const DepensesList = () => {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Filtres texte / compte / dates
  const [filters, setFilters] = useState({
    compte: "",
    searchTerm: "",
    startDate: "",
    endDate: "",
  });

  // Filtre emplacement
  const [emplacements, setEmplacements] = useState([]);
  const [filtreEmplacementId, setFiltreEmplacementId] = useState("_all");

  // Chart
  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  // Statistiques
  const [stats, setStats] = useState({ totalDepenses: 0, nombreOperations: 0 });

  // Nom de l'emplacement sélectionné
  const filtreEmplacementNom = useMemo(
    () => emplacements.find((e) => e.id === filtreEmplacementId)?.nom ?? null,
    [emplacements, filtreEmplacementId]
  );

  // Charger les emplacements au montage
  useEffect(() => {
    getAllEmplacements({ statut: "actif" }).then(({ emplacements }) =>
      setEmplacements(emplacements ?? [])
    );
  }, []);

  // Charger les données du graphique quand l'emplacement change
  useEffect(() => {
    if (!filtreEmplacementNom) {
      setChartData([]);
      return;
    }
    setLoadingChart(true);
    comptabiliteToolkit
      .getOperations({
        operation: comptabiliteToolkit.TYPES_OPERATION.DEPENSE,
        emplacement: filtreEmplacementNom,
        limit: 500,
        offset: 0,
        orderBy: "date_operation",
        ascending: true,
      })
      .then((result) => {
        setLoadingChart(false);
        if (!result.success) return;
        const grouped = {};
        result.operations.forEach((op) => {
          const d = new Date(op.date_operation);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const label = d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
          if (!grouped[key]) grouped[key] = { mois: label, total: 0 };
          grouped[key].total += parseFloat(op.montant);
        });
        setChartData(Object.values(grouped));
      });
  }, [filtreEmplacementNom]);

  // Charger les opérations
  const fetchOperations = useCallback(async () => {
    setLoading(true);
    try {
      const filterParams = {
        operation: comptabiliteToolkit.TYPES_OPERATION.DEPENSE,
        compte: filters.compte || undefined,
        searchTerm: filters.searchTerm || undefined,
        emplacement: filtreEmplacementNom || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      };

      const [result, sommeResult] = await Promise.all([
        comptabiliteToolkit.getOperations({
          ...filterParams,
          limit,
          offset: (currentPage - 1) * limit,
          orderBy: "date_operation",
          ascending: false,
        }),
        comptabiliteToolkit.getSommeOperations(filterParams),
      ]);

      if (result.success) {
        setOperations(result.operations);
        setTotal(result.total);
        setStats({
          totalDepenses: sommeResult.somme,
          nombreOperations: result.total,
        });
      }
    } catch (error) {
      console.error("Erreur chargement dépenses:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, filtreEmplacementNom, currentPage]);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  // Réinitialiser à la page 1 quand les filtres changent
  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [filters.compte, filters.searchTerm, filters.startDate, filters.endDate, filtreEmplacementId]);

  const totalPages = useMemo(() => Math.ceil(total / limit), [total]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ compte: "", searchTerm: "", startDate: "", endDate: "" });
    setFiltreEmplacementId("_all");
  };

  const handleAddSuccess = () => {
    setShowAddDialog(false);
    fetchOperations();
  };

  const hasActiveFilters =
    filters.compte || filters.searchTerm || filters.startDate || filters.endDate ||
    filtreEmplacementId !== "_all";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Dépenses</h2>
          <p className="text-sm text-muted-foreground">Gérer et consulter les dépenses</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle dépense
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total dépensé{filtreEmplacementNom ? ` · ${filtreEmplacementNom}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <p className="text-2xl font-bold text-red-600">
                {formatMontant(stats.totalDepenses)}
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
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Emplacement */}
            {emplacements.length > 0 && (
              <Select value={filtreEmplacementId} onValueChange={setFiltreEmplacementId}>
                <SelectTrigger>
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Tous les emplacements" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Tous les emplacements</SelectItem>
                  {emplacements.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Compte */}
            <Select
              value={filters.compte || "tous"}
              onValueChange={(value) =>
                handleFilterChange("compte", value === "tous" ? "" : value)
              }>
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

            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un motif..."
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Date début */}
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
            />

            {/* Date fin */}
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
            />
          </div>

          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          )}
        </CardContent>
      </Card>

      {/* BarChart emplacement */}
      {filtreEmplacementNom && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-600" />
              Dépenses par mois · {filtreEmplacementNom}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingChart ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune donnée pour cet emplacement
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="mois"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(v)
                    }
                    width={55}
                  />
                  <Tooltip content={<TooltipChart />} />
                  <Bar dataKey="total" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Liste des opérations */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : operations.length === 0 ? (
            <div className="text-center py-12">
              <TrendingDown className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Aucune dépense trouvée</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddDialog(true)}
                className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Créer la première dépense
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
                          <p className="text-sm line-clamp-1">{getMotifTexte(op.motif)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {getMotifEmplacement(op.motif) && (
                              <span className="text-xs text-muted-foreground">{getMotifEmplacement(op.motif)}</span>
                            )}
                            {getMotifQuantite(op.motif) && getMotifUnite(op.motif) && (
                              <span className="text-xs text-muted-foreground font-medium">
                                · {getMotifQuantite(op.motif)} {getMotifUnite(op.motif)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-semibold text-red-600">
                            -{formatMontant(op.montant)}
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
                        <TrendingDown className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-600">
                          -{formatMontant(op.montant)}
                        </span>
                      </div>
                      <Badge variant="outline">
                        {comptabiliteToolkit.COMPTE_LABELS[op.compte] || op.compte}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground">{getMotifTexte(op.motif)}</p>
                    <div className="flex items-center gap-2">
                      {getMotifEmplacement(op.motif) && (
                        <span className="text-xs text-muted-foreground">{getMotifEmplacement(op.motif)}</span>
                      )}
                      {op.motif?.quantite && op.motif?.unite && (
                        <span className="text-xs text-muted-foreground font-medium">
                          · {op.motif.quantite} {op.motif.unite}
                        </span>
                      )}
                    </div>
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
            <DialogTitle>Nouvelle dépense</DialogTitle>
          </DialogHeader>
          <DepenseForm
            onSuccess={handleAddSuccess}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepensesList;
