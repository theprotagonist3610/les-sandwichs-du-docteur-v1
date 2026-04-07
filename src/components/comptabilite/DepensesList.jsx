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
  TrendingUp,
  Calendar,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  FileText,
  MapPin,
  Pencil,
  Trash2,
  Tag,
} from "lucide-react";
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
import * as comptabiliteToolkit from "@/utils/comptabiliteToolkit";
import { getAllEmplacements } from "@/utils/emplacementToolkit";
import DepenseForm from "./DepenseForm";

const CATEGORIES_DEPENSE = [
  "Achat poisson",
  "Achat viande",
  "Achat légumes",
  "Achat épices",
  "Achat emballage",
  "Achat pain",
  "Achat lait",
  "Achat boisson",
  "Achat ustensiles",
  "Achat autres",
  "Charges fixes",
];

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
  const [editingOp, setEditingOp] = useState(null);
  const [deletingOp, setDeletingOp] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filtres texte / compte / dates / emplacement / catégorie
  const [filters, setFilters] = useState({
    compte: "",
    searchTerm: "",
    startDate: "",
    endDate: "",
    emplacementId: "_all",
    categorie: "",
  });

  // Emplacements disponibles
  const [emplacements, setEmplacements] = useState([]);

  // KPI panel
  const [kpiData, setKpiData] = useState(null);
  const [kpiLoading, setKpiLoading] = useState(false);

  // Chart
  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  // Statistiques
  const [stats, setStats] = useState({ totalDepenses: 0, nombreOperations: 0 });

  // Nom de l'emplacement sélectionné (dérivé de filters.emplacementId)
  const filtreEmplacementNom = useMemo(
    () => emplacements.find((e) => e.id === filters.emplacementId)?.nom ?? null,
    [emplacements, filters.emplacementId]
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
        categorie: filters.categorie || undefined,
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

  // Charger les KPI (sur l'ensemble des résultats, pas seulement la page courante)
  const fetchKpi = useCallback(async () => {
    const hasFilters =
      filters.compte || filters.searchTerm || filters.startDate || filters.endDate ||
      filters.emplacementId !== "_all" || filters.categorie;

    if (!hasFilters) { setKpiData(null); return; }

    setKpiLoading(true);
    try {
      const today = new Date();
      const toISO = (d) => d.toISOString().split("T")[0];
      const sub   = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return d; };

      // Filtres de base (sans dates — pour les tendances)
      const baseNoDate = {
        operation: comptabiliteToolkit.TYPES_OPERATION.DEPENSE,
        compte:      filters.compte      || undefined,
        searchTerm:  filters.searchTerm  || undefined,
        emplacement: filtreEmplacementNom || undefined,
        categorie:   filters.categorie   || undefined,
      };

      // Filtres complets (avec dates utilisateur)
      const allFilters = {
        ...baseNoDate,
        startDate: filters.startDate || undefined,
        endDate:   filters.endDate   || undefined,
      };

      const [filteredRes, globalRes, c7, p7, c30, p30] = await Promise.all([
        // Total filtré (tous les filtres actifs)
        comptabiliteToolkit.getSommeOperations(allFilters),
        // Total global (sans filtre catégorie — référence pour le %)
        comptabiliteToolkit.getSommeOperations({ ...allFilters, categorie: undefined }),
        // Tendance 7j — derniers 7 jours
        comptabiliteToolkit.getSommeOperations({ ...baseNoDate, startDate: toISO(sub(7)),  endDate: toISO(today) }),
        // Tendance 7j — 7 jours précédents
        comptabiliteToolkit.getSommeOperations({ ...baseNoDate, startDate: toISO(sub(14)), endDate: toISO(sub(8)) }),
        // Tendance 30j — derniers 30 jours
        comptabiliteToolkit.getSommeOperations({ ...baseNoDate, startDate: toISO(sub(30)), endDate: toISO(today) }),
        // Tendance 30j — 30 jours précédents
        comptabiliteToolkit.getSommeOperations({ ...baseNoDate, startDate: toISO(sub(60)), endDate: toISO(sub(31)) }),
      ]);

      setKpiData({
        filteredTotal: filteredRes.somme ?? 0,
        globalTotal:   globalRes.somme   ?? 0,
        curr7:  c7.somme  ?? 0,
        prev7:  p7.somme  ?? 0,
        curr30: c30.somme ?? 0,
        prev30: p30.somme ?? 0,
        hasCategorie: !!filters.categorie,
      });
    } catch (e) {
      console.error("Erreur KPI dépenses:", e);
    } finally {
      setKpiLoading(false);
    }
  }, [filters, filtreEmplacementNom]);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  useEffect(() => {
    fetchKpi();
  }, [fetchKpi]);

  // Réinitialiser à la page 1 quand les filtres changent
  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.compte, filters.searchTerm, filters.startDate, filters.endDate, filters.emplacementId, filters.categorie]);

  const totalPages = useMemo(() => Math.ceil(total / limit), [total]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ compte: "", searchTerm: "", startDate: "", endDate: "", emplacementId: "_all", categorie: "" });
  };

  const handleAddSuccess = () => {
    setShowAddDialog(false);
    fetchOperations();
  };

  const handleEditSuccess = () => {
    setEditingOp(null);
    fetchOperations();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingOp) return;
    setDeleting(true);
    try {
      await comptabiliteToolkit.deleteOperation(deletingOp.id);
      setDeletingOp(null);
      fetchOperations();
    } catch (error) {
      console.error("Erreur suppression:", error);
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters =
    filters.compte || filters.searchTerm || filters.startDate || filters.endDate ||
    filters.emplacementId !== "_all" || filters.categorie;

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
              <Select
                value={filters.emplacementId}
                onValueChange={(v) => handleFilterChange("emplacementId", v)}>
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

            {/* Catégorie */}
            <Select
              value={filters.categorie || "_all"}
              onValueChange={(v) => handleFilterChange("categorie", v === "_all" ? "" : v)}>
              <SelectTrigger>
                <div className="flex items-center gap-2 truncate">
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Toutes les catégories" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Toutes les catégories</SelectItem>
                {CATEGORIES_DEPENSE.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

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

      {/* KPI Panel — visible quand au moins un filtre est actif */}
      {hasActiveFilters && (
        kpiLoading ? (
          <div className="h-20 rounded-xl bg-muted animate-pulse" />
        ) : kpiData ? (
          <Card className="border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/20">
            <CardContent className="py-3 px-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Total filtré */}
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Total filtré</p>
                  <p className="text-lg font-bold text-red-600">{formatMontant(kpiData.filteredTotal)}</p>
                </div>

                {/* % du total global (affiché seulement si filtre catégorie actif) */}
                {kpiData.hasCategorie && kpiData.globalTotal > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Part du total</p>
                    <p className="text-lg font-bold">
                      {((kpiData.filteredTotal / kpiData.globalTotal) * 100).toFixed(1)}%
                    </p>
                  </div>
                )}

                {/* Tendance 7 jours */}
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Tendance 7j</p>
                  {kpiData.prev7 > 0 ? (() => {
                    const delta = ((kpiData.curr7 - kpiData.prev7) / kpiData.prev7) * 100;
                    const up = delta >= 0;
                    return (
                      <span className={`flex items-center gap-1 text-sm font-semibold ${up ? "text-red-600" : "text-green-600"}`}>
                        {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {up ? "+" : ""}{delta.toFixed(1)}%
                      </span>
                    );
                  })() : <span className="text-xs text-muted-foreground">—</span>}
                  <p className="text-xs text-muted-foreground mt-0.5">{formatMontant(kpiData.curr7)}</p>
                </div>

                {/* Tendance 30 jours */}
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Tendance 30j</p>
                  {kpiData.prev30 > 0 ? (() => {
                    const delta = ((kpiData.curr30 - kpiData.prev30) / kpiData.prev30) * 100;
                    const up = delta >= 0;
                    return (
                      <span className={`flex items-center gap-1 text-sm font-semibold ${up ? "text-red-600" : "text-green-600"}`}>
                        {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {up ? "+" : ""}{delta.toFixed(1)}%
                      </span>
                    );
                  })() : <span className="text-xs text-muted-foreground">—</span>}
                  <p className="text-xs text-muted-foreground mt-0.5">{formatMontant(kpiData.curr30)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null
      )}

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
                      <th className="p-4 w-20"></th>
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
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditingOp(op)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-red-600"
                              onClick={() => setDeletingOp(op)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(op.date_operation)}
                        <span className="ml-1">{op.user?.prenoms} {op.user?.nom}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => setEditingOp(op)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-600"
                          onClick={() => setDeletingOp(op)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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

      {/* Dialog d'édition */}
      <Dialog open={!!editingOp} onOpenChange={(open) => !open && setEditingOp(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la dépense</DialogTitle>
          </DialogHeader>
          {editingOp && (
            <DepenseForm
              initialData={editingOp}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingOp(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* AlertDialog de suppression */}
      <AlertDialog open={!!deletingOp} onOpenChange={(open) => !open && setDeletingOp(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la dépense ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingOp && (
                <>
                  <span className="font-medium">{getMotifTexte(deletingOp.motif)}</span>
                  {" — "}
                  <span className="text-red-600 font-semibold">
                    {formatMontant(deletingOp.montant)}
                  </span>
                  <br />
                  Cette action est irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
              onClick={handleDeleteConfirm}>
              {deleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Suppression...</>
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DepensesList;
