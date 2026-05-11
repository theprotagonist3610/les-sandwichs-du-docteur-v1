import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Package, RotateCcw, MapPin, Loader2 } from "lucide-react";
import { getTournees, calculerTournee } from "@/utils/distributionToolkit";
import NumberTicker from "@/components/ui/number-ticker";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " F";

const DistributionWidget = ({ isMobile = false }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    ca: 0,
    nbDistributeurs: 0,
    qteRecue: 0,
    qteRecuperee: 0,
    tauxRecouvrement: 0,
    topZones: [],
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { success, tournees } = await getTournees({ startDate: today, endDate: today, limit: 500 });
      if (!success) return;

      let ca = 0, qteRecue = 0, qteRecuperee = 0;
      const distributeursSet = new Set();
      const caParZone = {};

      for (const t of tournees) {
        distributeursSet.add(t.id_distributeur);
        const { vente_totale } = calculerTournee(t.lignes ?? [], t.distributeur?.taux_ristourne ?? 0);
        ca += vente_totale;

        const zone = t.distributeur?.zone;
        if (zone?.id) {
          if (!caParZone[zone.id]) caParZone[zone.id] = { nom: zone.nom, montant: 0 };
          caParZone[zone.id].montant += vente_totale;
        }

        for (const l of t.lignes ?? []) {
          qteRecue     += l.quantite_recue     ?? 0;
          qteRecuperee += l.quantite_recuperee ?? 0;
        }
      }

      const topZones = Object.values(caParZone)
        .sort((a, b) => b.montant - a.montant)
        .slice(0, 3);
      const maxCa = topZones[0]?.montant ?? 0;

      setStats({
        ca:               Math.round(ca),
        nbDistributeurs:  distributeursSet.size,
        qteRecue,
        qteRecuperee,
        tauxRecouvrement: qteRecue > 0 ? Math.round((qteRecuperee / qteRecue) * 100) : 0,
        topZones:         topZones.map(z => ({ ...z, pct: maxCa > 0 ? Math.round((z.montant / maxCa) * 100) : 0 })),
      });
    } catch (err) {
      console.error("DistributionWidget:", err);
    } finally {
      setLoading(false);
    }
  };

  const recouvrementColor =
    stats.tauxRecouvrement >= 80 ? "text-emerald-600" : "text-red-500";

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate("/distribution")}>
      <CardHeader className={isMobile ? "pb-2 px-4 pt-4" : "pb-3"}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn(isMobile ? "text-base" : "text-lg", "font-semibold text-foreground")}>
            Distribution
          </CardTitle>
          <div className="bg-orange-100 dark:bg-orange-900/50 p-2 rounded-lg">
            <Truck className={cn(isMobile ? "w-4 h-4" : "w-5 h-5", "text-orange-600 dark:text-orange-400")} />
          </div>
        </div>
      </CardHeader>

      <CardContent className={isMobile ? "px-4 pb-4" : ""}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* CA du jour */}
            <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-1">
                <Truck className={cn(isMobile ? "w-4 h-4" : "w-5 h-5", "text-orange-600")} />
                <span className={cn(isMobile ? "text-xs" : "text-sm", "text-orange-600 dark:text-orange-400 font-medium")}>
                  CA distribution — aujourd'hui
                </span>
              </div>
              <div className={cn(isMobile ? "text-2xl" : "text-3xl", "font-bold text-orange-700 dark:text-orange-300")}>
                <NumberTicker value={stats.ca} className="inline" /> F
              </div>
            </div>

            {/* KPIs rapides */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-1 mb-1">
                  <Truck className="w-3 h-3 text-blue-600" />
                  <span className="text-[10px] text-muted-foreground">Distrib.</span>
                </div>
                <div className="text-sm font-bold text-blue-600">
                  <NumberTicker value={stats.nbDistributeurs} className="inline" />
                </div>
                <div className="text-[9px] text-muted-foreground">actifs</div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-1 mb-1">
                  <Package className="w-3 h-3 text-amber-600" />
                  <span className="text-[10px] text-muted-foreground">Qté</span>
                </div>
                <div className="text-sm font-bold text-amber-600">
                  <NumberTicker value={stats.qteRecue} className="inline" />
                </div>
                <div className="text-[9px] text-muted-foreground">remises</div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-1 mb-1">
                  <RotateCcw className="w-3 h-3 text-purple-600" />
                  <span className="text-[10px] text-muted-foreground">Recouvr.</span>
                </div>
                <div className={cn("text-sm font-bold", recouvrementColor)}>
                  <NumberTicker value={stats.tauxRecouvrement} className="inline" /> %
                </div>
                <div className="text-[9px] text-muted-foreground">retours</div>
              </div>
            </div>

            {/* Top zones */}
            {stats.topZones.length > 0 && (
              <div>
                <div className={cn(isMobile ? "text-xs" : "text-sm", "font-medium text-muted-foreground mb-2")}>
                  Top zones
                </div>
                <div className="space-y-2">
                  {stats.topZones.map((z) => (
                    <div key={z.nom} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 flex-1">
                        <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-foreground truncate">{z.nom}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 transition-all duration-300"
                            style={{ width: `${z.pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="font-semibold text-foreground ml-2 shrink-0">
                        {fmt(z.montant)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span>Aujourd'hui</span>
              {stats.nbDistributeurs === 0
                ? <span>Aucune tournée</span>
                : <span className="font-medium">{stats.nbDistributeurs} tournée{stats.nbDistributeurs > 1 ? "s" : ""}</span>
              }
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DistributionWidget;
