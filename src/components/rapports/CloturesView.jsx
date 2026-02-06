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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Lock,
  Calendar,
  BarChart3,
  TableIcon,
  Loader2,
  RefreshCw,
  ShoppingCart,
  Wallet,
  Users,
  MapPin,
  Package,
  TrendingUp,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getAllDayClosures, getDayClosureByDate } from "@/utils/dayClosureToolkit";

/**
 * Vue des clôtures journalières avec tableaux et graphiques
 * Supporte les périodicités: Semaine, Mois, Année
 */
const CloturesView = ({ isMobile = false }) => {
  // États
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table"); // table | chart
  const [periode, setPeriode] = useState("semaine"); // semaine | mois | annee
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClosure, setSelectedClosure] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const limit = 10;

  // Calculer les dates de la période sélectionnée
  const getPeriodeDates = useMemo(() => {
    const today = new Date();
    let dateDebut;

    switch (periode) {
      case "semaine":
        dateDebut = new Date(today);
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        dateDebut.setDate(today.getDate() + diff);
        break;
      case "mois":
        dateDebut = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "annee":
        dateDebut = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        dateDebut = new Date(today);
        dateDebut.setDate(today.getDate() - 7);
    }

    return {
      debut: dateDebut.toISOString().split("T")[0],
      fin: today.toISOString().split("T")[0],
    };
  }, [periode]);

  // Charger les clôtures
  const fetchClosures = async () => {
    setLoading(true);
    try {
      // Calculer le nombre de jours à charger selon la période
      let limitCount = 7;
      if (periode === "mois") limitCount = 31;
      if (periode === "annee") limitCount = 365;

      const data = await getAllDayClosures(limitCount, 0);

      // Filtrer selon la période
      const { debut } = getPeriodeDates;
      const filtered = data.filter((c) => c.jour >= debut);

      setClosures(filtered);
    } catch (error) {
      console.error("Erreur chargement clôtures:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosures();
  }, [periode]);

  // Statistiques calculées
  const stats = useMemo(() => {
    if (closures.length === 0) return null;

    const totalVentes = closures.reduce((sum, c) => sum + (c.nombre_ventes_total || 0), 0);
    const totalCA = closures.reduce((sum, c) => sum + (c.chiffre_affaires || 0), 0);
    const avgPanier = totalCA / (totalVentes || 1);

    return {
      nombre_jours: closures.length,
      total_ventes: totalVentes,
      total_ca: totalCA,
      panier_moyen: Math.round(avgPanier),
      moyenne_ventes_jour: Math.round(totalVentes / closures.length),
      moyenne_ca_jour: Math.round(totalCA / closures.length),
    };
  }, [closures]);

  // Pagination
  const paginatedClosures = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return closures.slice(start, start + limit);
  }, [closures, currentPage]);

  const totalPages = Math.ceil(closures.length / limit);

  // Formater un montant
  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR").format(montant || 0) + " F";
  };

  // Formater une date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  // Formater une heure
  const formatTime = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Ouvrir les détails d'une clôture
  const handleViewDetails = async (closure) => {
    try {
      const details = await getDayClosureByDate(closure.jour);
      setSelectedClosure(details);
      setShowDetails(true);
    } catch (error) {
      console.error("Erreur chargement détails:", error);
    }
  };

  // Données pour le graphique
  const chartData = useMemo(() => {
    if (!closures || closures.length === 0) return [];
    return closures.slice(0, 7).reverse().map((c) => ({
      date: formatDate(c.jour),
      ventes: c.nombre_ventes_total || 0,
      ca: c.chiffre_affaires || 0,
      panierMoyen: c.panier_moyen || 0,
    }));
  }, [closures]);

  const maxCA = useMemo(() => {
    if (chartData.length === 0) return 100000;
    return Math.max(...chartData.map((d) => d.ca), 1);
  }, [chartData]);

  return (
    <div className="space-y-4">
      {/* Header avec filtres */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className={`${isMobile ? "text-lg" : "text-xl"} font-bold flex items-center gap-2`}>
            <Lock className="w-5 h-5 text-primary" />
            Clôtures Journalières
          </h3>
          <p className="text-sm text-muted-foreground">
            Historique des clôtures de caisse
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

          {/* Bouton refresh */}
          <Button variant="outline" size="sm" onClick={fetchClosures}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Statistiques de la période */}
      {stats && (
        <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-3`}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">Jours clôturés</span>
              </div>
              <p className="text-lg font-bold">{stats.nombre_jours}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="w-4 h-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Ventes totales</span>
              </div>
              <p className="text-lg font-bold">{stats.total_ventes}</p>
              <p className="text-xs text-muted-foreground">
                Moy: {stats.moyenne_ventes_jour}/jour
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-muted-foreground">CA total</span>
              </div>
              <p className="text-lg font-bold">{formatMontant(stats.total_ca)}</p>
              <p className="text-xs text-muted-foreground">
                Moy: {formatMontant(stats.moyenne_ca_jour)}/jour
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <span className="text-xs text-muted-foreground">Panier moyen</span>
              </div>
              <p className="text-lg font-bold">{formatMontant(stats.panier_moyen)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contenu principal */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : closures.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Aucune clôture pour cette période
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
                    <TableHead className="text-right">CA</TableHead>
                    <TableHead className="text-right">Panier Moy.</TableHead>
                    <TableHead>Clôturé par</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClosures.map((closure) => (
                    <TableRow key={closure.jour}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{formatDate(closure.jour)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(closure.cloture_a)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {closure.nombre_ventes_total || 0}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMontant(closure.chiffre_affaires)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMontant(closure.panier_moyen)}
                      </TableCell>
                      <TableCell>
                        {closure.cloture_par_info ? (
                          <span className="text-sm">
                            {closure.cloture_par_info.prenoms?.split(" ")[0]}{" "}
                            {closure.cloture_par_info.nom}
                          </span>
                        ) : (
                          <Badge variant="outline">Auto</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(closure)}>
                          <Eye className="w-4 h-4" />
                        </Button>
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
              Évolution du CA sur les 7 derniers jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Graphique en barres */}
              <div className="space-y-3">
                {chartData.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium w-20">{item.date}</span>
                      <div className="flex gap-4 text-muted-foreground">
                        <span>{item.ventes} ventes</span>
                        <span className="font-medium text-foreground">
                          {formatMontant(item.ca)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-4">
                      <div
                        className="bg-primary h-4 rounded-full transition-all flex items-center justify-end pr-2"
                        style={{ width: `${Math.max((item.ca / maxCA) * 100, 5)}%` }}>
                        {item.ca > maxCA * 0.2 && (
                          <span className="text-[10px] text-primary-foreground">
                            {formatMontant(item.ca)}
                          </span>
                        )}
                      </div>
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

      {/* Dialog Détails */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Détails de la clôture
            </DialogTitle>
          </DialogHeader>

          {selectedClosure && (
            <div className="space-y-4">
              {/* Date et heure */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      {new Date(selectedClosure.jour).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatTime(selectedClosure.cloture_a)}
                  </div>
                </div>
              </div>

              {/* Métriques principales */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                      <span className="text-xs text-muted-foreground">Ventes</span>
                    </div>
                    <p className="text-xl font-bold">
                      {selectedClosure.nombre_ventes_total}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-muted-foreground">CA</span>
                    </div>
                    <p className="text-xl font-bold">
                      {formatMontant(selectedClosure.chiffre_affaires)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Meilleurs du jour */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Meilleurs du jour</h4>
                <div className="space-y-2">
                  {selectedClosure.meilleur_vendeur_info && (
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">Vendeur</span>
                      </div>
                      <span className="text-sm font-medium">
                        {selectedClosure.meilleur_vendeur_info.prenoms?.split(" ")[0]}{" "}
                        {selectedClosure.meilleur_vendeur_info.nom}
                      </span>
                    </div>
                  )}
                  {selectedClosure.meilleur_point_vente_info && (
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Point de vente</span>
                      </div>
                      <span className="text-sm font-medium">
                        {selectedClosure.meilleur_point_vente_info.nom}
                      </span>
                    </div>
                  )}
                  {selectedClosure.meilleur_produit_info && (
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-orange-600" />
                        <span className="text-sm">Produit</span>
                      </div>
                      <span className="text-sm font-medium">
                        {selectedClosure.meilleur_produit_info.nom}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Détails paiements */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Répartition des paiements</h4>
                <div className="space-y-1 text-sm">
                  {selectedClosure.montant_percu_espece > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Espèces</span>
                      <span>{formatMontant(selectedClosure.montant_percu_espece)}</span>
                    </div>
                  )}
                  {selectedClosure.montant_percu_mobile > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mobile Money</span>
                      <span>{formatMontant(selectedClosure.montant_percu_mobile)}</span>
                    </div>
                  )}
                  {selectedClosure.montant_percu_carte > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Carte</span>
                      <span>{formatMontant(selectedClosure.montant_percu_carte)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedClosure.notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{selectedClosure.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CloturesView;
