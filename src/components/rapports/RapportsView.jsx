import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BarChart3,
  TableIcon,
  Loader2,
  Download,
  RefreshCw,
  Target,
  Wallet,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getAllRapports,
  getRapportsByPeriode,
  getStatistiquesPeriode,
  formaterEcart,
  extraireDateDeDenomination,
  exporterRapportsCSV,
} from "@/utils/rapportToolkit";

/**
 * Vue des rapports journaliers avec tableaux et graphiques
 * Supporte les périodicités: Semaine, Mois, Année
 */
const RapportsView = ({ isMobile = false }) => {
  // États
  const [rapports, setRapports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // table | chart
  const [periode, setPeriode] = useState("semaine"); // semaine | mois | annee
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  // Calculer les dates de la période sélectionnée
  const getPeriodeDates = useMemo(() => {
    const today = new Date();
    let dateDebut, dateFin;

    switch (periode) {
      case "semaine":
        // Début de la semaine (lundi)
        dateDebut = new Date(today);
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        dateDebut.setDate(today.getDate() + diff);
        dateFin = new Date(today);
        break;
      case "mois":
        // Début du mois
        dateDebut = new Date(today.getFullYear(), today.getMonth(), 1);
        dateFin = new Date(today);
        break;
      case "annee":
        // Début de l'année
        dateDebut = new Date(today.getFullYear(), 0, 1);
        dateFin = new Date(today);
        break;
      default:
        dateDebut = new Date(today);
        dateDebut.setDate(today.getDate() - 7);
        dateFin = new Date(today);
    }

    return {
      debut: dateDebut.toISOString().split("T")[0],
      fin: dateFin.toISOString().split("T")[0],
    };
  }, [periode]);

  // Charger les rapports
  const fetchRapports = async () => {
    setLoading(true);
    try {
      const { debut, fin } = getPeriodeDates;

      // Récupérer les rapports de la période
      const result = await getRapportsByPeriode(debut, fin);

      if (result.success) {
        setRapports(result.rapports || []);

        // Récupérer les statistiques
        if (result.rapports && result.rapports.length > 0) {
          const statsResult = await getStatistiquesPeriode(debut, fin);
          if (statsResult.success) {
            setStats(statsResult.stats);
          }
        } else {
          setStats(null);
        }
      }
    } catch (error) {
      console.error("Erreur chargement rapports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRapports();
  }, [periode]);

  // Pagination
  const paginatedRapports = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return rapports.slice(start, start + limit);
  }, [rapports, currentPage]);

  const totalPages = Math.ceil(rapports.length / limit);

  // Formater un montant
  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR").format(montant || 0) + " F";
  };

  // Formater une date
  const formatDate = (denomination) => {
    const date = extraireDateDeDenomination(denomination);
    if (!date) return "-";
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Obtenir la couleur de l'écart
  const getEcartColor = (ecart, isDepense = false) => {
    if (ecart === 0) return "text-muted-foreground";
    // Pour les dépenses, positif = mauvais (on a dépensé plus)
    if (isDepense) {
      return ecart > 0 ? "text-red-600" : "text-green-600";
    }
    // Pour ventes/encaissements, positif = bon
    return ecart >= 0 ? "text-green-600" : "text-red-600";
  };

  // Obtenir l'icône de l'écart
  const getEcartIcon = (ecart, isDepense = false) => {
    if (ecart === 0) return <Minus className="w-3 h-3" />;
    if (isDepense) {
      return ecart > 0 ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      );
    }
    return ecart >= 0 ? (
      <TrendingUp className="w-3 h-3" />
    ) : (
      <TrendingDown className="w-3 h-3" />
    );
  };

  // Exporter en CSV
  const handleExport = () => {
    const csv = exporterRapportsCSV(rapports);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapports_${periode}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Calculer les données pour le graphique (barres simplifiées)
  const chartData = useMemo(() => {
    if (!rapports || rapports.length === 0) return [];

    // Prendre les 7 derniers rapports pour le graphique
    return rapports.slice(0, 7).reverse().map((r) => ({
      date: formatDate(r.denomination),
      ventes: r.total_ventes || 0,
      encaissement: r.total_encaissement || 0,
      depense: r.total_depense || 0,
      ecartVentes: r.objectifs?.ventes || 0,
      ecartEncaissement: r.objectifs?.encaissement || 0,
      ecartDepense: r.objectifs?.depense || 0,
    }));
  }, [rapports]);

  // Valeur max pour le graphique
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 100000;
    const values = chartData.flatMap((d) => [d.ventes, d.encaissement, d.depense]);
    return Math.max(...values, 1);
  }, [chartData]);

  return (
    <div className="space-y-4">
      {/* Header avec filtres */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className={`${isMobile ? "text-lg" : "text-xl"} font-bold flex items-center gap-2`}>
            <FileText className="w-5 h-5 text-primary" />
            Rapports Journaliers
          </h3>
          <p className="text-sm text-muted-foreground">
            Suivi des performances vs objectifs
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Sélecteur de période */}
          <Select value={periode} onValueChange={setPeriode}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semaine">Semaine</SelectItem>
              <SelectItem value="mois">Mois</SelectItem>
              <SelectItem value="annee">Année</SelectItem>
            </SelectContent>
          </Select>

          {/* Toggle Vue */}
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="rounded-r-none">
              <TableIcon className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "chart" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("chart")}
              className="rounded-l-none">
              <BarChart3 className="w-4 h-4" />
            </Button>
          </div>

          {/* Boutons d'action */}
          <Button variant="outline" size="sm" onClick={fetchRapports}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={rapports.length === 0}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Statistiques de la période */}
      {stats && (
        <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-3`}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">Ventes totales</span>
              </div>
              <p className="text-lg font-bold">{stats.ventes.total}</p>
              <p className="text-xs text-muted-foreground">
                Moy: {stats.ventes.moyenne}/jour
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Encaissements</span>
              </div>
              <p className="text-lg font-bold">{formatMontant(stats.encaissements.total)}</p>
              <p className="text-xs text-muted-foreground">
                Moy: {formatMontant(stats.encaissements.moyenne)}/jour
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-xs text-muted-foreground">Dépenses</span>
              </div>
              <p className="text-lg font-bold text-red-600">
                {formatMontant(stats.depenses.total)}
              </p>
              <p className="text-xs text-muted-foreground">
                Moy: {formatMontant(stats.depenses.moyenne)}/jour
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-muted-foreground">Performance</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-green-600">
                  +{stats.objectifs.encaissement_positifs}
                </Badge>
                <Badge variant="outline" className="text-red-600">
                  -{stats.objectifs.encaissement_negatifs}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.periode.nombre_rapports} rapports
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contenu principal */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : rapports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Aucun rapport pour cette période
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        /* Vue Tableau */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Ventes</TableHead>
                    <TableHead className="text-right">Encaissement</TableHead>
                    <TableHead className="text-right">Dépenses</TableHead>
                    <TableHead className="text-center">Écarts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRapports.map((rapport) => (
                    <TableRow key={rapport.id}>
                      <TableCell className="font-medium">
                        {formatDate(rapport.denomination)}
                      </TableCell>
                      <TableCell className="text-right">
                        {rapport.total_ventes}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMontant(rapport.total_encaissement)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatMontant(rapport.total_depense)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          {/* Écart Ventes */}
                          <div
                            className={`flex items-center gap-0.5 text-xs ${getEcartColor(
                              rapport.objectifs?.ventes
                            )}`}>
                            {getEcartIcon(rapport.objectifs?.ventes)}
                            <span>{formaterEcart(rapport.objectifs?.ventes || 0)}</span>
                          </div>
                          {/* Écart Encaissement */}
                          <div
                            className={`flex items-center gap-0.5 text-xs ${getEcartColor(
                              rapport.objectifs?.encaissement
                            )}`}>
                            {getEcartIcon(rapport.objectifs?.encaissement)}
                            <span>{formaterEcart(rapport.objectifs?.encaissement || 0)}</span>
                          </div>
                          {/* Écart Dépense */}
                          <div
                            className={`flex items-center gap-0.5 text-xs ${getEcartColor(
                              rapport.objectifs?.depense,
                              true
                            )}`}>
                            {getEcartIcon(rapport.objectifs?.depense, true)}
                            <span>{formaterEcart(rapport.objectifs?.depense || 0)}</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} sur {totalPages}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Vue Graphique */
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Évolution sur les 7 derniers jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Légende */}
              <div className="flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  <span>Ventes</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span>Encaissements</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <span>Dépenses</span>
                </div>
              </div>

              {/* Graphique en barres simple */}
              <div className="space-y-3">
                {chartData.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium w-20">{item.date}</span>
                      <div className="flex gap-2">
                        <span className={getEcartColor(item.ecartEncaissement)}>
                          {formaterEcart(item.ecartEncaissement)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 h-6">
                      {/* Barre Encaissement */}
                      <div
                        className="bg-green-500 rounded-sm transition-all"
                        style={{
                          width: `${(item.encaissement / maxValue) * 100}%`,
                          minWidth: item.encaissement > 0 ? "4px" : "0",
                        }}
                        title={`Encaissement: ${formatMontant(item.encaissement)}`}
                      />
                      {/* Barre Dépense */}
                      <div
                        className="bg-red-500 rounded-sm transition-all"
                        style={{
                          width: `${(item.depense / maxValue) * 100}%`,
                          minWidth: item.depense > 0 ? "4px" : "0",
                        }}
                        title={`Dépense: ${formatMontant(item.depense)}`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>+{formatMontant(item.encaissement)}</span>
                      <span>-{formatMontant(item.depense)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {chartData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Pas assez de données pour afficher le graphique
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RapportsView;
