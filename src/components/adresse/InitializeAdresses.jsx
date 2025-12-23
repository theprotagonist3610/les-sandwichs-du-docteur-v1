import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Database,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { initializeAdressesFromFile } from "@/utils/adresseToolkit";
import { toast } from "sonner";

/**
 * Composant pour initialiser les adresses depuis le fichier adresse_liste.js
 * Affiché uniquement si la table des adresses est vide
 */
const InitializeAdresses = ({ onComplete, isMobile = false }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
    currentAdresse: null,
  });
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    setIsImporting(true);
    setProgress({ current: 0, total: 0, percentage: 0, currentAdresse: null });
    setResult(null);

    toast.info("Initialisation", {
      description: "Démarrage de l'import des adresses...",
    });

    try {
      const importResult = await initializeAdressesFromFile((current, total, adresse) => {
        const percentage = Math.round((current / total) * 100);
        setProgress({
          current,
          total,
          percentage,
          currentAdresse: adresse,
        });
      });

      setResult(importResult);
      setIsImporting(false);

      if (importResult.success > 0) {
        toast.success("Import terminé", {
          description: `${importResult.success} adresse(s) importée(s) avec succès`,
        });

        // Attendre 2 secondes puis notifier le parent
        setTimeout(() => {
          onComplete?.(importResult);
        }, 2000);
      } else {
        toast.error("Import échoué", {
          description: "Aucune adresse n'a pu être importée",
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'import:", error);
      setIsImporting(false);
      toast.error("Erreur", {
        description: "Une erreur est survenue lors de l'import",
      });
    }
  };

  return (
    <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader className={isMobile ? "px-4 py-3" : ""}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Database className={`text-blue-600 dark:text-blue-400 ${isMobile ? "w-5 h-5" : "w-6 h-6"}`} />
          </div>
          <div className="flex-1">
            <CardTitle className={isMobile ? "text-base" : "text-lg"}>
              Initialisation de la base de données
            </CardTitle>
            <CardDescription className={isMobile ? "text-xs" : "text-sm"}>
              Aucune adresse trouvée. Importer les adresses depuis le fichier de base.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className={isMobile ? "px-4 pb-4" : ""}>
        <div className="space-y-4">
          {/* Avertissement */}
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className={isMobile ? "text-xs" : "text-sm"}>
              L'import peut prendre plusieurs minutes car chaque adresse est géocodée
              avec l'API Nominatim (limite: 1 requête/seconde).
            </AlertDescription>
          </Alert>

          {/* Progression */}
          {isImporting && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    Progression: {progress.current} / {progress.total}
                  </span>
                  <span className="text-muted-foreground">
                    {progress.percentage}%
                  </span>
                </div>
                <Progress value={progress.percentage} className="h-2" />
              </div>

              {progress.currentAdresse && (
                <div className={`p-3 bg-muted rounded-lg ${isMobile ? "text-xs" : "text-sm"}`}>
                  <p className="font-medium">En cours de traitement:</p>
                  <p className="text-muted-foreground mt-1">
                    {progress.currentAdresse.quartier}, {progress.currentAdresse.arrondissement}
                    <br />
                    {progress.currentAdresse.commune}, {progress.currentAdresse.departement}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Résultat */}
          {result && !isImporting && (
            <div className="space-y-3">
              <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-3"}`}>
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className={`font-medium text-green-600 dark:text-green-400 ${isMobile ? "text-xs" : "text-sm"}`}>
                      Réussies
                    </span>
                  </div>
                  <p className={`font-bold text-green-600 dark:text-green-400 ${isMobile ? "text-xl" : "text-2xl"}`}>
                    {result.success}
                  </p>
                </div>

                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className={`font-medium text-red-600 dark:text-red-400 ${isMobile ? "text-xs" : "text-sm"}`}>
                      Échecs
                    </span>
                  </div>
                  <p className={`font-bold text-red-600 dark:text-red-400 ${isMobile ? "text-xl" : "text-2xl"}`}>
                    {result.failed}
                  </p>
                </div>

                <div className={`p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900 ${isMobile ? "col-span-2" : ""}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className={`font-medium text-blue-600 dark:text-blue-400 ${isMobile ? "text-xs" : "text-sm"}`}>
                      Total traité
                    </span>
                  </div>
                  <p className={`font-bold text-blue-600 dark:text-blue-400 ${isMobile ? "text-xl" : "text-2xl"}`}>
                    {result.success + result.failed}
                  </p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <details className="p-3 bg-muted rounded-lg">
                  <summary className={`cursor-pointer font-medium ${isMobile ? "text-xs" : "text-sm"}`}>
                    Voir les erreurs ({result.errors.length})
                  </summary>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className={`text-red-600 dark:text-red-400 ${isMobile ? "text-xs" : "text-sm"}`}>
                        {error.adresse?.quartier}, {error.adresse?.commune}: {error.error}
                      </div>
                    ))}
                    {result.errors.length > 10 && (
                      <p className={`text-muted-foreground italic ${isMobile ? "text-xs" : "text-sm"}`}>
                        ... et {result.errors.length - 10} autre(s) erreur(s)
                      </p>
                    )}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Bouton d'import */}
          {!result && (
            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="w-full gap-2"
              size={isMobile ? "default" : "lg"}
            >
              {isImporting ? (
                <>
                  <Loader2 className={`animate-spin ${isMobile ? "w-4 h-4" : "w-5 h-5"}`} />
                  Import en cours...
                </>
              ) : (
                <>
                  <Download className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
                  Importer les adresses
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InitializeAdresses;
