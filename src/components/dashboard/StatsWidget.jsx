import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp } from "lucide-react";

const StatsWidget = ({ isMobile = false }) => {
  return (
    <Card>
      <CardHeader className={isMobile ? "pb-2 px-4 pt-4" : "pb-3"}>
        <div className="flex items-center justify-between">
          <CardTitle
            className={`${
              isMobile ? "text-base" : "text-lg"
            } font-semibold text-foreground`}>
            Statistiques
          </CardTitle>
          <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg">
            <BarChart3
              className={`${
                isMobile ? "w-4 h-4" : "w-5 h-5"
              } text-indigo-600 dark:text-indigo-400`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className={isMobile ? "px-4 pb-4" : ""}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp
            className={`${
              isMobile ? "w-4 h-4" : "w-5 h-5"
            } text-green-600 dark:text-green-400`}
          />
          <span
            className={`${
              isMobile ? "text-sm" : "text-base"
            } text-muted-foreground`}>
            Aperçu des performances
          </span>
        </div>
        <div
          className={`p-4 bg-muted/50 rounded-lg border border-border ${
            isMobile ? "text-xs" : "text-sm"
          }`}>
          <p className="text-muted-foreground text-center">
            Contenu à venir...
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsWidget;
