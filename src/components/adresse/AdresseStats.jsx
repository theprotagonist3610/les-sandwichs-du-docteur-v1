import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

/**
 * Widget de statistiques des adresses
 */
const AdresseStats = ({ stats, isMobile = false }) => {
  if (!stats) {
    return null;
  }

  const statsCards = [
    {
      title: "Total",
      value: stats.total || 0,
      icon: BarChart3,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      description: "Adresses enregistrées",
    },
    {
      title: "Actives",
      value: stats.active || 0,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950",
      percentage: stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0,
    },
    {
      title: "Inactives",
      value: stats.inactive || 0,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950",
      percentage: stats.total > 0 ? ((stats.inactive / stats.total) * 100).toFixed(1) : 0,
    },
    {
      title: "Avec GPS",
      value: stats.withGPS || 0,
      icon: MapPin,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      percentage: stats.total > 0 ? ((stats.withGPS / stats.total) * 100).toFixed(1) : 0,
    },
  ];

  const syncStats = [
    {
      title: "Synchronisées",
      value: stats.synced || 0,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
    },
    {
      title: "En attente",
      value: stats.pendingSync || 0,
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
    },
    {
      title: "Erreurs",
      value: stats.syncErrors || 0,
      icon: AlertCircle,
      color: "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Statistiques principales */}
      <div className={`grid gap-4 ${isMobile ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-border">
              <CardHeader className={isMobile ? "pb-2 px-3 pt-3" : "pb-2"}>
                <div className="flex items-center justify-between">
                  <CardTitle className={`${isMobile ? "text-xs" : "text-sm"} font-medium text-muted-foreground`}>
                    {stat.title}
                  </CardTitle>
                  <div className={`${stat.bgColor} p-2 rounded-lg`}>
                    <Icon className={`${isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} ${stat.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className={isMobile ? "px-3 pb-3" : ""}>
                <div className={`${isMobile ? "text-xl" : "text-2xl"} font-bold text-foreground`}>
                  {stat.value}
                </div>
                {stat.percentage !== undefined && (
                  <p className={`${isMobile ? "text-[10px]" : "text-xs"} text-muted-foreground mt-1`}>
                    {stat.percentage}% du total
                  </p>
                )}
                {stat.description && (
                  <p className={`${isMobile ? "text-[10px]" : "text-xs"} text-muted-foreground mt-1`}>
                    {stat.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Statistiques de synchronisation */}
      <Card>
        <CardHeader className={isMobile ? "px-4 py-3" : ""}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? "text-sm" : "text-base"}`}>
            <TrendingUp className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
            Synchronisation
          </CardTitle>
        </CardHeader>
        <CardContent className={isMobile ? "px-4 pb-4" : ""}>
          <div className={`grid gap-4 ${isMobile ? "grid-cols-3" : "grid-cols-3"}`}>
            {syncStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Icon className={`${isMobile ? "w-5 h-5" : "w-6 h-6"} ${stat.color}`} />
                  </div>
                  <div className={`${isMobile ? "text-xl" : "text-2xl"} font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className={`${isMobile ? "text-xs" : "text-sm"} text-muted-foreground mt-1`}>
                    {stat.title}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top départements */}
      {stats.byDepartement && Object.keys(stats.byDepartement).length > 0 && (
        <Card>
          <CardHeader className={isMobile ? "px-4 py-3" : ""}>
            <CardTitle className={isMobile ? "text-sm" : "text-base"}>
              Par Département
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? "px-4 pb-4" : ""}>
            <div className="space-y-3">
              {Object.entries(stats.byDepartement)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([departement, count]) => {
                  const percentage = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0;
                  return (
                    <div key={departement} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isMobile ? "text-xs" : "text-sm"}`}>
                          {departement}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-muted-foreground ${isMobile ? "text-xs" : "text-sm"}`}>
                            {count} ({percentage}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdresseStats;
