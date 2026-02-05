import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PiggyBank,
  Loader2,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  LineChart as LineChartIcon,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import * as comptabiliteToolkit from "@/utils/comptabiliteToolkit";

/**
 * Interface de suivi dynamique du revenu
 * Graphiques: Line Chart + Bougies par jour/semaine/mois
 * 100% Responsive
 */
const RevenuView = () => {
  // États
  const [loading, setLoading] = useState(true);
  const [revenus, setRevenus] = useState([]);
  const [stats, setStats] = useState(null);
  const [granularite, setGranularite] = useState("jour"); // jour, semaine, mois
  const [periode, setPeriode] = useState("30jours"); // 7jours, 30jours, 3mois, 6mois, 1an

  // Charger les données
  const fetchRevenus = async () => {
    setLoading(true);
    try {
      // Calculer les dates selon la période sélectionnée
      const endDate = new Date();
      const startDate = new Date();

      switch (periode) {
        case "7jours":
          startDate.setDate(endDate.getDate() - 7);
          break;
        case "30jours":
          startDate.setDate(endDate.getDate() - 30);
          break;
        case "3mois":
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case "6mois":
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case "1an":
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      // Récupérer les revenus
      const resultRevenus = await comptabiliteToolkit.getRevenusParPeriode(
        startDateStr,
        endDateStr,
        granularite
      );

      // Récupérer les statistiques
      const resultStats = await comptabiliteToolkit.getStatistiquesRevenu(
        startDateStr,
        endDateStr
      );

      if (resultRevenus.success) {
        setRevenus(resultRevenus.revenus);
      }

      if (resultStats.success) {
        setStats(resultStats.stats);
      }
    } catch (error) {
      console.error("Erreur chargement revenus:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenus();
  }, [granularite, periode]);

  // Formater un montant
  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR").format(montant) + " FCFA";
  };

  // Formater une période pour l'affichage
  const formatPeriode = (periode) => {
    if (granularite === "jour") {
      return new Date(periode).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      });
    } else if (granularite === "semaine") {
      return periode; // S01, S02, etc.
    } else {
      const [annee, mois] = periode.split("-");
      const date = new Date(annee, parseInt(mois) - 1);
      return date.toLocaleDateString("fr-FR", {
        month: "short",
        year: "numeric",
      });
    }
  };

  // Tooltip personnalisé
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{formatPeriode(data.periode)}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-emerald-600">Encaissements:</span>
              <span className="font-medium">{formatMontant(data.encaissements)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-red-600">Dépenses:</span>
              <span className="font-medium">{formatMontant(data.depenses)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t">
              <span
                className={`font-semibold ${
                  data.revenu >= 0 ? "text-emerald-600" : "text-red-600"
                }`}>
                Revenu:
              </span>
              <span
                className={`font-bold ${
                  data.revenu >= 0 ? "text-emerald-600" : "text-red-600"
                }`}>
                {formatMontant(data.revenu)}
              </span>
            </div>
            {data.variationPourcent !== undefined && data.variationPourcent !== 0 && (
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">Variation:</span>
                <span
                  className={`font-medium ${
                    data.variation >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}>
                  {data.variation >= 0 ? "+" : ""}
                  {data.variationPourcent}%
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Composant bougie personnalisée
  const CandleShape = (props) => {
    const { x, y, width, height, payload } = props;
    if (!payload) return null;

    const { ouverture, fermeture, max, min } = payload;
    const isPositive = fermeture >= ouverture;
    const color = isPositive ? "#10b981" : "#ef4444";

    // Position réelle basée sur l'échelle
    const yScale = props.yAxis;
    const yOuverture = yScale.scale(ouverture);
    const yFermeture = yScale.scale(fermeture);
    const yMax = yScale.scale(max);
    const yMin = yScale.scale(min);

    const bodyTop = Math.min(yOuverture, yFermeture);
    const bodyHeight = Math.abs(yOuverture - yFermeture);
    const bodyX = x + width / 2 - 3;

    return (
      <g>
        {/* Mèche haute et basse */}
        <line
          x1={x + width / 2}
          y1={yMax}
          x2={x + width / 2}
          y2={yMin}
          stroke={color}
          strokeWidth={1}
        />
        {/* Corps de la bougie */}
        <rect
          x={bodyX}
          y={bodyTop}
          width={6}
          height={Math.max(bodyHeight, 2)}
          fill={color}
          stroke={color}
          strokeWidth={1}
        />
      </g>
    );
  };

  // Obtenir l'icône de tendance
  const getTendanceIcon = () => {
    if (!stats) return <Minus className="h-5 w-5" />;
    if (stats.tendance === "hausse") return <ArrowUp className="h-5 w-5 text-green-600" />;
    if (stats.tendance === "baisse")
      return <ArrowDown className="h-5 w-5 text-red-600" />;
    return <Minus className="h-5 w-5 text-gray-600" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Revenu</h2>
          <p className="text-sm text-muted-foreground">
            Suivi dynamique du revenu (Encaissements - Dépenses)
          </p>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Période */}
            <div className="space-y-2">
              <Label>Période</Label>
              <Select value={periode} onValueChange={setPeriode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7jours">7 derniers jours</SelectItem>
                  <SelectItem value="30jours">30 derniers jours</SelectItem>
                  <SelectItem value="3mois">3 derniers mois</SelectItem>
                  <SelectItem value="6mois">6 derniers mois</SelectItem>
                  <SelectItem value="1an">1 an</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Granularité */}
            <div className="space-y-2">
              <Label>Granularité</Label>
              <Select value={granularite} onValueChange={setGranularite}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jour">Par jour</SelectItem>
                  <SelectItem value="semaine">Par semaine</SelectItem>
                  <SelectItem value="mois">Par mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques globales */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Revenu total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-teal-600" />
                <p
                  className={`text-2xl font-bold ${
                    stats.revenuTotal >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}>
                  {formatMontant(stats.revenuTotal)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Revenu moyen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <p className="text-2xl font-bold">{formatMontant(stats.revenuMoyen)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Tendance
                {getTendanceIcon()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                variant="outline"
                className={
                  stats.tendance === "hausse"
                    ? "bg-green-100 text-green-800"
                    : stats.tendance === "baisse"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                }>
                {stats.tendance === "hausse"
                  ? "En hausse"
                  : stats.tendance === "baisse"
                  ? "En baisse"
                  : "Stable"}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.nombreJoursPositifs} jours positifs / {stats.nombreJoursNegatifs} négatifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Min / Max
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-green-600">Max:</span>
                  <span className="font-medium">{formatMontant(stats.revenuMax)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-600">Min:</span>
                  <span className="font-medium">{formatMontant(stats.revenuMin)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Graphiques */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : revenus.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Aucune donnée pour la période sélectionnée</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="line" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="line">
              <LineChartIcon className="h-4 w-4 mr-2" />
              Courbe
            </TabsTrigger>
            <TabsTrigger value="candle">
              <BarChart3 className="h-4 w-4 mr-2" />
              Bougies
            </TabsTrigger>
          </TabsList>

          {/* Line Chart */}
          <TabsContent value="line">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Évolution du revenu</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={revenus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="periode"
                      tickFormatter={formatPeriode}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />

                    {/* Aire pour encaissements */}
                    <Area
                      type="monotone"
                      dataKey="encaissements"
                      fill="#10b98133"
                      stroke="#10b981"
                      name="Encaissements"
                    />

                    {/* Aire pour dépenses */}
                    <Area
                      type="monotone"
                      dataKey="depenses"
                      fill="#ef444433"
                      stroke="#ef4444"
                      name="Dépenses"
                    />

                    {/* Ligne principale du revenu */}
                    <Line
                      type="monotone"
                      dataKey="revenu"
                      stroke="#0ea5e9"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      name="Revenu net"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Candle Chart */}
          <TabsContent value="candle">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bougies du revenu</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={revenus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="periode"
                      tickFormatter={formatPeriode}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                    <Bar
                      dataKey="revenu"
                      shape={<CandleShape />}
                      fill="#8884d8"
                      name="Revenu"
                    />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-2">Légende des bougies:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-6 bg-green-600"></div>
                      <span>Vert: Revenu en hausse par rapport à la période précédente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-6 bg-red-600"></div>
                      <span>Rouge: Revenu en baisse par rapport à la période précédente</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Tableau de détails */}
      {!loading && revenus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détails par période</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Période</th>
                    <th className="text-right p-3 font-medium">Encaissements</th>
                    <th className="text-right p-3 font-medium">Dépenses</th>
                    <th className="text-right p-3 font-medium">Revenu</th>
                    <th className="text-right p-3 font-medium">Variation</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {revenus.slice().reverse().map((revenu, index) => (
                    <tr key={revenu.periode} className="hover:bg-muted/50">
                      <td className="p-3">{formatPeriode(revenu.periode)}</td>
                      <td className="p-3 text-right text-emerald-600 font-medium">
                        {formatMontant(revenu.encaissements)}
                      </td>
                      <td className="p-3 text-right text-red-600 font-medium">
                        {formatMontant(revenu.depenses)}
                      </td>
                      <td
                        className={`p-3 text-right font-semibold ${
                          revenu.revenu >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}>
                        {formatMontant(revenu.revenu)}
                      </td>
                      <td className="p-3 text-right">
                        {revenu.variationPourcent !== 0 && (
                          <Badge
                            variant="outline"
                            className={
                              revenu.variation >= 0
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }>
                            {revenu.variation >= 0 ? "+" : ""}
                            {revenu.variationPourcent}%
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RevenuView;
