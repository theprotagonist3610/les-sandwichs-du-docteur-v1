import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Composant de comparaison Prévisions vs Temps Réel
 * Affiche les métriques clés avec indicateurs de progression
 */
const MetricsComparison = ({ comparison, className }) => {
  if (!comparison) {
    return null;
  }

  /**
   * Formate un nombre avec séparateurs de milliers
   */
  const formatNumber = (num) => {
    return Math.round(num).toLocaleString("fr-FR");
  };

  /**
   * Calcule le pourcentage de progression (réalisé / prévu * 100)
   */
  const getProgressPercentage = (realtime, forecast) => {
    if (forecast === 0) return 0;
    return Math.min(Math.round((realtime / forecast) * 100), 100);
  };

  /**
   * Détermine la couleur selon l'écart
   */
  const getStatusColor = (status, percentChange) => {
    if (status === "equal") return "text-muted-foreground";

    const absChange = Math.abs(percentChange);
    if (absChange < 5) return "text-muted-foreground"; // Écart négligeable
    if (status === "above") return "text-green-600";
    return "text-orange-600";
  };

  /**
   * Détermine l'icône selon le statut
   */
  const getStatusIcon = (status, percentChange) => {
    if (status === "equal" || Math.abs(percentChange) < 5) {
      return <Minus className="w-4 h-4" />;
    }
    if (status === "above") {
      return <TrendingUp className="w-4 h-4" />;
    }
    return <TrendingDown className="w-4 h-4" />;
  };

  /**
   * Métriques principales à afficher
   */
  const metrics = [
    {
      key: "nombre_ventes_total",
      label: "Ventes",
      suffix: "",
      icon: "🛒",
    },
    {
      key: "chiffre_affaires",
      label: "CA",
      suffix: " F",
      icon: "💰",
    },
    {
      key: "panier_moyen",
      label: "Panier Moyen",
      suffix: " F",
      icon: "🧺",
    },
    {
      key: "cadence_vente",
      label: "Cadence",
      suffix: " /h",
      icon: "⚡",
    },
    {
      key: "nombre_paiements_momo",
      label: "Paiements MoMo",
      suffix: "",
      icon: "📱",
    },
    {
      key: "taux_livraison",
      label: "Taux Livraison",
      suffix: " %",
      icon: "🚚",
    },
  ];

  return (
    <div className={cn("grid gap-3", className)}>
      {metrics.map(({ key, label, suffix, icon }) => {
        const data = comparison[key];
        if (!data) return null;

        const { realtime, forecast, percentChange, status } = data;
        const progress = getProgressPercentage(realtime, forecast);
        const statusColor = getStatusColor(status, percentChange);
        const StatusIcon = getStatusIcon(status, percentChange);

        return (
          <Card key={key} className="p-3">
            <div className="space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {label}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={cn("gap-1", statusColor)}>
                  {StatusIcon}
                  <span className="text-xs font-semibold">
                    {percentChange > 0 ? "+" : ""}
                    {percentChange.toFixed(1)}%
                  </span>
                </Badge>
              </div>

              {/* Valeurs */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Prévu:</span>
                  <span className="font-medium">
                    {formatNumber(forecast)}
                    {suffix}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Actuel:</span>
                  <span className={cn("font-bold", statusColor)}>
                    {formatNumber(realtime)}
                    {suffix}
                  </span>
                </div>
              </div>

              {/* Barre de progression personnalisée */}
              <div className="space-y-1">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      progress >= 90
                        ? "bg-green-600"
                        : progress >= 70
                        ? "bg-blue-600"
                        : progress >= 50
                        ? "bg-orange-600"
                        : "bg-red-600"
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span className="font-medium">{progress}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default MetricsComparison;
