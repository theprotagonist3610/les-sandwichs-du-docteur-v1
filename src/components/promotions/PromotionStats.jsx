import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Zap,
  Users,
  CheckCircle2,
  XCircle,
  Pause,
  DollarSign,
  ShoppingCart,
  Target,
} from "lucide-react";

/**
 * Composant pour afficher les statistiques des promotions
 */
const PromotionStats = ({ stats }) => {
  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chargement...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-7 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Promotions actives",
      value: stats.actives || 0,
      icon: Zap,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "En pause",
      value: stats.en_pause || 0,
      icon: Pause,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Terminées",
      value: stats.terminees || 0,
      icon: CheckCircle2,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Annulées",
      value: stats.annulees || 0,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  ];

  const performanceCards = [
    {
      title: "Revenu total",
      value: `${Math.round(stats.revenu_total || 0).toLocaleString("fr-FR")} FCFA`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Total commandes",
      value: stats.total_commandes || 0,
      icon: ShoppingCart,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Utilisations",
      value: stats.total_utilisations || 0,
      icon: Users,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
    {
      title: "Panier moyen",
      value: `${Math.round(stats.panier_moyen || 0).toLocaleString("fr-FR")} FCFA`,
      icon: Target,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Statistiques de statut */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Statut des promotions
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Statistiques de performance */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Performance globale
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {performanceCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Statistiques par type */}
      {stats.par_type && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Répartition par type
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Standard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.par_type.standard || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Flash</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.par_type.flash || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Happy Hour</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.par_type.happy_hour || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Récurrente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.par_type.recurrente || 0}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionStats;
