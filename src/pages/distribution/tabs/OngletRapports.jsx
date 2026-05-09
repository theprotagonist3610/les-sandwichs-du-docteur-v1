import { BarChart2 } from "lucide-react";

const OngletRapports = () => (
  <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
      <BarChart2 className="w-8 h-8 text-muted-foreground" />
    </div>
    <div>
      <p className="text-sm font-medium">Rapports en cours de développement</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
        Analyses par zone, par produit et performances des distributeurs seront disponibles ici.
      </p>
    </div>
  </div>
);

export default OngletRapports;
