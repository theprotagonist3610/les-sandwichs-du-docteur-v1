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
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowUpDown,
  DollarSign,
} from "lucide-react";
import * as comptabiliteToolkit from "@/utils/comptabiliteToolkit";

/**
 * Vue d'ensemble de la caisse avec soldes et historique 24h
 * 100% Responsive
 */
const CaisseView = () => {
  // États
  const [soldes, setSoldes] = useState({});
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filtres pour l'historique
  const [filters, setFilters] = useState({
    compte: "",
    operation: "",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 15;

  // Statistiques 24h
  const [stats24h, setStats24h] = useState({
    totalEncaissements: 0,
    totalDepenses: 0,
    soldeNet: 0,
    nombreOperations: 0,
  });

  // Charger les soldes de tous les comptes
  const fetchSoldes = async () => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      const soldesParCompte = {};
      let totalGlobal = 0;

      // Charger tous les soldes en parallèle
      const promises = Object.values(comptabiliteToolkit.TYPES_COMPTE).map(async (compte) => {
        const res = await comptabiliteToolkit.getSoldeCompte(compte, null, todayStr);
        if (res.success) {
          soldesParCompte[compte] = res.solde;
          totalGlobal += res.solde;
        }
      });

      await Promise.all(promises);
      setSoldes({ ...soldesParCompte, total: totalGlobal });
    } catch (error) {
      console.error("Erreur chargement soldes:", error);
    }
  };

  // Charger les opérations des dernières 24h
  const fetchOperations24h = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const result = await comptabiliteToolkit.getOperations({
        compte: filters.compte || undefined,
        operation: filters.operation || undefined,
        startDate: yesterday.toISOString().split("T")[0],
        endDate: now.toISOString().split("T")[0],
        limit,
        offset: (currentPage - 1) * limit,
        orderBy: "created_at",
        ascending: false,
      });

      if (result.success) {
        setOperations(result.operations);
        setTotal(result.total);

        // Calculer les stats 24h
        const encaissements = result.operations
          .filter((op) => op.operation === comptabiliteToolkit.TYPES_OPERATION.ENCAISSEMENT)
          .reduce((sum, op) => sum + parseFloat(op.montant), 0);

        const depenses = result.operations
          .filter((op) => op.operation === comptabiliteToolkit.TYPES_OPERATION.DEPENSE)
          .reduce((sum, op) => sum + parseFloat(op.montant), 0);

        setStats24h({
          totalEncaissements: encaissements,
          totalDepenses: depenses,
          soldeNet: encaissements - depenses,
          nombreOperations: result.total,
        });
      }
    } catch (error) {
      console.error("Erreur chargement opérations 24h:", error);
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage
  useEffect(() => {
    fetchSoldes();
    fetchOperations24h();
  }, [currentPage, filters]);

  // Réinitialiser à la page 1 quand les filtres changent
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [filters.compte, filters.operation]);

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
      operation: "",
    });
  };

  // Formater un montant
  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR").format(montant) + " FCFA";
  };

  // Formater une date/heure
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Obtenir la couleur du badge selon le compte
  const getCompteColor = (compte) => {
    const colors = {
      [comptabiliteToolkit.TYPES_COMPTE.CAISSE]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      [comptabiliteToolkit.TYPES_COMPTE.MTN_MOMO]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      [comptabiliteToolkit.TYPES_COMPTE.MOOV_MONEY]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      [comptabiliteToolkit.TYPES_COMPTE.CELTIIS_CASH]: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      [comptabiliteToolkit.TYPES_COMPTE.BANQUE]: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
      [comptabiliteToolkit.TYPES_COMPTE.AUTRE]: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    };
    return colors[compte] || "";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Caisse</h2>
          <p className="text-sm text-muted-foreground">
            Vue d'ensemble de la trésorerie et historique 24h
          </p>
        </div>
      </div>

      {/* Solde global */}
      <Card className="border-2 border-primary">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Solde total</p>
              <p className="text-3xl sm:text-4xl font-bold text-primary mt-1">
                {formatMontant(soldes.total || 0)}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-full">
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Soldes par compte */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(comptabiliteToolkit.COMPTE_LABELS).map(([key, label]) => (
          <Card key={key} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-lg font-bold truncate">
                {formatMontant(soldes[key] || 0)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Statistiques 24h */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Dernières 24 heures</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Encaissements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <p className="text-2xl font-bold text-emerald-600">
                  {formatMontant(stats24h.totalEncaissements)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dépenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <p className="text-2xl font-bold text-red-600">
                  {formatMontant(stats24h.totalDepenses)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Solde net
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5 text-blue-600" />
                <p
                  className={`text-2xl font-bold ${
                    stats24h.soldeNet >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}>
                  {formatMontant(stats24h.soldeNet)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtres pour l'historique */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique des opérations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Filtre par compte */}
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

            {/* Filtre par type d'opération */}
            <Select
              value={filters.operation || "toutes"}
              onValueChange={(value) =>
                handleFilterChange("operation", value === "toutes" ? "" : value)
              }>
              <SelectTrigger>
                <SelectValue placeholder="Toutes les opérations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes les opérations</SelectItem>
                <SelectItem value={comptabiliteToolkit.TYPES_OPERATION.ENCAISSEMENT}>
                  Encaissements
                </SelectItem>
                <SelectItem value={comptabiliteToolkit.TYPES_OPERATION.DEPENSE}>
                  Dépenses
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bouton réinitialiser */}
          {(filters.compte || filters.operation) && (
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
              <ArrowUpDown className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Aucune opération dans les 24h</p>
            </div>
          ) : (
            <>
              {/* Table desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium text-sm">Date/Heure</th>
                      <th className="text-left p-4 font-medium text-sm">Type</th>
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
                            <span className="text-sm">{formatDateTime(op.created_at)}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {op.operation === comptabiliteToolkit.TYPES_OPERATION.ENCAISSEMENT ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Encaissement
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              Dépense
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={getCompteColor(op.compte)}>
                            {comptabiliteToolkit.COMPTE_LABELS[op.compte] || op.compte}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <p className="text-sm line-clamp-2">{op.motif}</p>
                        </td>
                        <td className="p-4 text-right">
                          <span
                            className={`font-semibold ${
                              op.operation === comptabiliteToolkit.TYPES_OPERATION.ENCAISSEMENT
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}>
                            {op.operation === comptabiliteToolkit.TYPES_OPERATION.DEPENSE && "-"}
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
                        {op.operation === comptabiliteToolkit.TYPES_OPERATION.ENCAISSEMENT ? (
                          <>
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                            <span className="font-semibold text-emerald-600">
                              {formatMontant(op.montant)}
                            </span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-5 w-5 text-red-600" />
                            <span className="font-semibold text-red-600">
                              -{formatMontant(op.montant)}
                            </span>
                          </>
                        )}
                      </div>
                      <Badge variant="outline" className={getCompteColor(op.compte)}>
                        {comptabiliteToolkit.COMPTE_LABELS[op.compte] || op.compte}
                      </Badge>
                    </div>

                    <p className="text-sm text-foreground">{op.motif}</p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(op.created_at)}
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
    </div>
  );
};

export default CaisseView;
