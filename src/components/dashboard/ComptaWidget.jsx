import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, TrendingDown, Wallet, ArrowUpDown, Loader2 } from "lucide-react";
import * as comptabiliteToolkit from "@/utils/comptabiliteToolkit";
import NumberTicker from "@/components/ui/number-ticker";
import { useNavigate } from "react-router-dom";

/**
 * ComptaWidget - Widget de résumé comptable pour le dashboard
 * Affiche les soldes, revenus du jour et statistiques clés
 */
const ComptaWidget = ({ isMobile = false }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    soldeTotal: 0,
    soldesParCompte: {},
    encaissementsJour: 0,
    depensesJour: 0,
    revenuJour: 0,
    nombreOperationsJour: 0,
  });

  useEffect(() => {
    loadStats();

    // Rafraîchir toutes les 60 secondes
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      // 1. Charger les soldes de tous les comptes en parallèle
      const soldesParCompte = {};
      let totalGlobal = 0;

      const soldesPromises = Object.values(comptabiliteToolkit.TYPES_COMPTE).map(async (compte) => {
        const res = await comptabiliteToolkit.getSoldeCompte(compte, null, todayStr);
        if (res.success) {
          soldesParCompte[compte] = res.solde;
          totalGlobal += res.solde;
        }
      });

      await Promise.all(soldesPromises);

      // 2. Charger les opérations du jour
      const operationsResult = await comptabiliteToolkit.getOperations({
        startDate: todayStr,
        endDate: todayStr,
        limit: 1000, // Récupérer toutes les opérations du jour
      });

      if (operationsResult.success) {
        const operations = operationsResult.operations;

        // Calculer les totaux du jour
        const encaissementsJour = operations
          .filter((op) => op.operation === comptabiliteToolkit.TYPES_OPERATION.ENCAISSEMENT)
          .reduce((sum, op) => sum + parseFloat(op.montant), 0);

        const depensesJour = operations
          .filter((op) => op.operation === comptabiliteToolkit.TYPES_OPERATION.DEPENSE)
          .reduce((sum, op) => sum + parseFloat(op.montant), 0);

        setStats({
          soldeTotal: totalGlobal,
          soldesParCompte,
          encaissementsJour,
          depensesJour,
          revenuJour: encaissementsJour - depensesJour,
          nombreOperationsJour: operations.length,
        });
      }
    } catch (error) {
      console.error("Erreur chargement stats comptables:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR").format(Math.round(montant)) + " F";
  };

  // Obtenir les 3 comptes avec les plus gros soldes
  const topComptes = Object.entries(stats.soldesParCompte)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate("/comptabilite")}
    >
      <CardHeader className={isMobile ? "pb-2 px-4 pt-4" : "pb-3"}>
        <div className="flex items-center justify-between">
          <CardTitle
            className={`${
              isMobile ? "text-base" : "text-lg"
            } font-semibold text-foreground`}>
            Comptabilité
          </CardTitle>
          <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-lg">
            <Calculator
              className={`${
                isMobile ? "w-4 h-4" : "w-5 h-5"
              } text-emerald-600 dark:text-emerald-400`}
            />
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
            {/* Solde total */}
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} text-emerald-600`} />
                <span className={`${isMobile ? "text-xs" : "text-sm"} text-emerald-600 dark:text-emerald-400 font-medium`}>
                  Solde total
                </span>
              </div>
              <div className={`${isMobile ? "text-2xl" : "text-3xl"} font-bold text-emerald-700 dark:text-emerald-300`}>
                <NumberTicker value={stats.soldeTotal} className="inline" /> F
              </div>
            </div>

            {/* Revenus du jour */}
            <div className="grid grid-cols-3 gap-2">
              {/* Encaissements */}
              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  <span className="text-[10px] text-muted-foreground">Encaiss.</span>
                </div>
                <div className="text-sm font-bold text-emerald-600">
                  <NumberTicker value={stats.encaissementsJour} className="inline" />
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {formatMontant(stats.encaissementsJour)}
                </div>
              </div>

              {/* Dépenses */}
              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="w-3 h-3 text-red-600" />
                  <span className="text-[10px] text-muted-foreground">Dépenses</span>
                </div>
                <div className="text-sm font-bold text-red-600">
                  <NumberTicker value={stats.depensesJour} className="inline" />
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {formatMontant(stats.depensesJour)}
                </div>
              </div>

              {/* Revenu net */}
              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-1 mb-1">
                  <ArrowUpDown className="w-3 h-3 text-blue-600" />
                  <span className="text-[10px] text-muted-foreground">Revenu</span>
                </div>
                <div className={`text-sm font-bold ${stats.revenuJour >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  <NumberTicker value={stats.revenuJour} className="inline" />
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {formatMontant(stats.revenuJour)}
                </div>
              </div>
            </div>

            {/* Top 3 comptes */}
            {topComptes.length > 0 && (
              <div>
                <div className={`${isMobile ? "text-xs" : "text-sm"} font-medium text-muted-foreground mb-2`}>
                  Principaux comptes
                </div>
                <div className="space-y-2">
                  {topComptes.map(([compte, solde]) => {
                    const label = comptabiliteToolkit.COMPTE_LABELS[compte] || compte;
                    const pourcentage = ((solde / stats.soldeTotal) * 100).toFixed(0);

                    return (
                      <div key={compte} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 flex-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                            {label}
                          </Badge>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${pourcentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="font-semibold text-foreground ml-2">
                          <NumberTicker value={solde} className="inline" /> F
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer avec nombre d'opérations */}
            <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span>Aujourd'hui</span>
              <span className="font-medium">
                <NumberTicker value={stats.nombreOperationsJour} className="inline" /> opération{stats.nombreOperationsJour > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ComptaWidget;
