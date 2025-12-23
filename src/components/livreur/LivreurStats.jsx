import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Clock,
} from "lucide-react";

/**
 * Composant pour afficher les statistiques des livreurs
 * @param {Object} props
 * @param {Object} props.stats - Objet contenant les statistiques
 * @param {number} props.stats.total - Nombre total de livreurs
 * @param {number} props.stats.active - Nombre de livreurs actifs
 * @param {number} props.stats.inactive - Nombre de livreurs inactifs
 * @param {number} props.stats.recentlyAdded - Livreurs ajoutés cette semaine
 * @param {number} props.stats.recentlyUpdated - Livreurs modifiés cette semaine
 * @param {boolean} props.isMobile - Mode mobile
 */
const LivreurStats = ({ stats, isMobile = false }) => {
  const statCards = [
    {
      title: "Total",
      value: stats.total || 0,
      icon: Package,
      description: "Livreurs au total",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Actifs",
      value: stats.active || 0,
      icon: CheckCircle2,
      description: "Livreurs actifs",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Inactifs",
      value: stats.inactive || 0,
      icon: XCircle,
      description: "Livreurs désactivés",
      color: "text-gray-500",
      bgColor: "bg-gray-500/10",
    },
    {
      title: "Nouveaux",
      value: stats.recentlyAdded || 0,
      icon: TrendingUp,
      description: "Ajoutés cette semaine",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Modifiés",
      value: stats.recentlyUpdated || 0,
      icon: Clock,
      description: "Modifiés cette semaine",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div
      className={`grid gap-4 ${
        isMobile
          ? "grid-cols-2"
          : "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
      }`}
    >
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader
              className={`${
                isMobile ? "p-4 pb-2" : "p-6 pb-4"
              } flex flex-row items-center justify-between space-y-0`}
            >
              <CardTitle
                className={`${
                  isMobile ? "text-xs" : "text-sm"
                } font-medium text-muted-foreground`}
              >
                {stat.title}
              </CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-md`}>
                <Icon
                  className={`${isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} ${
                    stat.color
                  }`}
                />
              </div>
            </CardHeader>
            <CardContent className={isMobile ? "p-4 pt-0" : "px-6 pb-4"}>
              <div
                className={`${
                  isMobile ? "text-xl" : "text-2xl"
                } font-bold mb-1`}
              >
                {stat.value}
              </div>
              <p
                className={`${
                  isMobile ? "text-xs" : "text-sm"
                } text-muted-foreground`}
              >
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default LivreurStats;
