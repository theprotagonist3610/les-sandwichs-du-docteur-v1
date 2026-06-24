import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Package,
  CheckCircle,
  XCircle,
  DollarSign,
  Coffee,
  Sandwich,
  Cake,
  Utensils,
} from "lucide-react";
import { useGSAP } from "@/shared/hooks/useGSAP";
import { staggerFadeInUp, staggerScaleIn } from "@/lib/animations";

const MenuStats = ({ stats, MENU_TYPE_LABELS, MENU_TYPES }) => {
  const containerRef = useRef(null);

  if (!stats) return null;

  const typeIcons = {
    [MENU_TYPES.BOISSON]: Coffee,
    [MENU_TYPES.SANDWICH]: Sandwich,
    [MENU_TYPES.DESSERT]: Cake,
    [MENU_TYPES.MENU_COMPLET]: Utensils,
  };

  const globalStats = [
    {
      label: "Total Menus",
      value: stats.total,
      icon: Package,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Disponibles",
      value: stats.disponibles,
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Indisponibles",
      value: stats.indisponibles,
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Prix Moyen",
      value: `${Math.round(stats.prix_moyen)} FCFA`,
      icon: DollarSign,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  useGSAP(() => {
    staggerFadeInUp(".stat-card", { stagger: 0.05 });
    staggerScaleIn(".category-badge", { stagger: 0.04 });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {globalStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold mt-2">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Répartition par Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.par_type).map(([type, count]) => {
              const Icon = typeIcons[type] || Package;
              return (
                <div
                  key={type}
                  className="category-badge flex items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {MENU_TYPE_LABELS[type]}
                    </p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { MenuStats };
