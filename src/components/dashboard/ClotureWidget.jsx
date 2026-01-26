import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Clock } from "lucide-react";

const ClotureWidget = ({ isMobile = false }) => {
  return (
    <Card className="border-rose-200 dark:border-rose-900 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30">
      <CardHeader className={isMobile ? "pb-2 px-4 pt-4" : "pb-3"}>
        <div className="flex items-center justify-between">
          <CardTitle
            className={`${
              isMobile ? "text-base" : "text-lg"
            } font-semibold text-foreground`}>
            Clôture
          </CardTitle>
          <div className="bg-rose-100 dark:bg-rose-900/50 p-2 rounded-lg">
            <ClipboardCheck
              className={`${
                isMobile ? "w-4 h-4" : "w-5 h-5"
              } text-rose-600 dark:text-rose-400`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className={isMobile ? "px-4 pb-4" : ""}>
        <div className="flex items-center gap-2 mb-3">
          <Clock
            className={`${
              isMobile ? "w-4 h-4" : "w-5 h-5"
            } text-rose-600 dark:text-rose-400`}
          />
          <span
            className={`${
              isMobile ? "text-sm" : "text-base"
            } text-muted-foreground`}>
            État de la journée
          </span>
        </div>
        <div
          className={`p-4 bg-background/50 rounded-lg border border-border ${
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

export default ClotureWidget;
