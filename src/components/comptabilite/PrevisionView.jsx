import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartLine,
  Plus,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Calendar,
  Edit,
  Trash2,
  Lock,
  FileCheck,
  Calculator,
  Sparkles,
  BarChart3,
  Zap,
} from "lucide-react";
import * as comptabiliteToolkit from "@/utils/comptabiliteToolkit";

/**
 * Interface de gestion des prévisions mensuelles
 * Modes: Manuel et Automatique (pessimiste/réaliste/optimiste)
 * 100% Responsive
 */
const PrevisionView = () => {
  // États
  const [previsions, setPrevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPrevision, setSelectedPrevision] = useState(null);

  // Mode de création
  const [creationMode, setCreationMode] = useState("manuel"); // "manuel" ou "automatique"
  const [scenariosCalcules, setScenariosCalcules] = useState(null);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [scenarioSelectionne, setScenarioSelectionne] = useState("realiste");

  // Filtres
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Formulaire
  const [formData, setFormData] = useState({
    type: comptabiliteToolkit.TYPES_BUDGET.PREVISION,
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
    comptes: {},
  });
  const [errors, setErrors] = useState({});

  // Charger les prévisions
  const fetchPrevisions = async () => {
    setLoading(true);
    try {
      const result = await comptabiliteToolkit.getBudgets({
        type: comptabiliteToolkit.TYPES_BUDGET.PREVISION,
        annee: selectedYear,
        orderBy: "mois",
        ascending: true,
      });

      if (result.success) {
        setPrevisions(result.budgets);
      }
    } catch (error) {
      console.error("Erreur chargement prévisions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrevisions();
  }, [selectedYear]);

  // Initialiser le formulaire pour une nouvelle prévision
  const initializeForm = () => {
    const initialComptes = {};
    Object.values(comptabiliteToolkit.TYPES_COMPTE).forEach((compte) => {
      initialComptes[compte] = {
        encaissements: 0,
        depenses: 0,
      };
    });

    setFormData({
      type: comptabiliteToolkit.TYPES_BUDGET.PREVISION,
      mois: new Date().getMonth() + 1,
      annee: selectedYear,
      comptes: initialComptes,
    });
    setErrors({});
    setCreationMode("manuel");
    setScenariosCalcules(null);
    setScenarioSelectionne("realiste");
  };

  // Ouvrir le dialog de création
  const handleCreate = () => {
    initializeForm();
    setShowCreateDialog(true);
  };

  // Calculer les scénarios automatiques
  const handleCalculerScenarios = async () => {
    setLoadingScenarios(true);
    try {
      const result = await comptabiliteToolkit.calculerPrevisionsAutomatiques(
        formData.mois,
        formData.annee,
        3 // 3 mois d'historique
      );

      if (result.success) {
        setScenariosCalcules(result.previsions);
        // Pré-remplir avec le scénario réaliste
        setFormData((prev) => ({
          ...prev,
          comptes: result.previsions.scenarios.realiste.comptes,
        }));
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoadingScenarios(false);
    }
  };

  // Appliquer un scénario
  const handleAppliquerScenario = (scenario) => {
    if (!scenariosCalcules) return;

    setScenarioSelectionne(scenario);
    setFormData((prev) => ({
      ...prev,
      comptes: scenariosCalcules.scenarios[scenario].comptes,
    }));
  };

  // Ouvrir le dialog d'édition
  const handleEdit = (prevision) => {
    setSelectedPrevision(prevision);
    setFormData({
      type: prevision.type,
      mois: prevision.mois,
      annee: prevision.annee,
      comptes: prevision.details?.comptes || {},
    });
    setShowEditDialog(true);
  };

  // Gérer les changements dans les montants
  const handleMontantChange = (compte, type, value) => {
    setFormData((prev) => ({
      ...prev,
      comptes: {
        ...prev.comptes,
        [compte]: {
          ...prev.comptes[compte],
          [type]: parseFloat(value) || 0,
        },
      },
    }));
  };

  // Valider le formulaire
  const validateForm = () => {
    const newErrors = {};

    if (!formData.mois || formData.mois < 1 || formData.mois > 12) {
      newErrors.mois = "Le mois doit être entre 1 et 12";
    }

    if (!formData.annee || formData.annee < 2020) {
      newErrors.annee = "L'année doit être valide";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Créer une prévision
  const handleSubmitCreate = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const details = {
        comptes: formData.comptes,
        total_encaissements: Object.values(formData.comptes).reduce(
          (sum, c) => sum + c.encaissements,
          0
        ),
        total_depenses: Object.values(formData.comptes).reduce(
          (sum, c) => sum + c.depenses,
          0
        ),
        mode_creation: creationMode,
        scenario: creationMode === "automatique" ? scenarioSelectionne : null,
      };

      const result = await comptabiliteToolkit.createBudget({
        type: formData.type,
        mois: formData.mois,
        annee: formData.annee,
        details,
      });

      if (result.success) {
        setShowCreateDialog(false);
        fetchPrevisions();
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour une prévision
  const handleSubmitEdit = async () => {
    if (!validateForm() || !selectedPrevision) return;

    setLoading(true);
    try {
      const details = {
        comptes: formData.comptes,
        total_encaissements: Object.values(formData.comptes).reduce(
          (sum, c) => sum + c.encaissements,
          0
        ),
        total_depenses: Object.values(formData.comptes).reduce(
          (sum, c) => sum + c.depenses,
          0
        ),
      };

      const result = await comptabiliteToolkit.updateBudget(selectedPrevision.id, {
        details,
      });

      if (result.success) {
        setShowEditDialog(false);
        setSelectedPrevision(null);
        fetchPrevisions();
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Valider une prévision
  const handleValidate = async (previsionId) => {
    try {
      const result = await comptabiliteToolkit.validateBudget(previsionId);
      if (result.success) {
        fetchPrevisions();
      }
    } catch (error) {
      console.error("Erreur validation prévision:", error);
    }
  };

  // Clôturer une prévision
  const handleClose = async (previsionId) => {
    try {
      const result = await comptabiliteToolkit.cloturerBudget(previsionId);
      if (result.success) {
        fetchPrevisions();
      }
    } catch (error) {
      console.error("Erreur clôture prévision:", error);
    }
  };

  // Supprimer une prévision
  const handleDelete = async (previsionId) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette prévision ?")) return;

    try {
      const result = await comptabiliteToolkit.deleteBudget(previsionId);
      if (result.success) {
        fetchPrevisions();
      }
    } catch (error) {
      console.error("Erreur suppression prévision:", error);
    }
  };

  // Créer un budget depuis une prévision
  const handleCreateBudgetFromPrevision = async (previsionId) => {
    if (!confirm("Créer un budget à partir de cette prévision ?")) return;

    try {
      const result = await comptabiliteToolkit.createBudgetFromPrevision(previsionId);
      if (result.success) {
        alert("Budget créé avec succès depuis la prévision");
      }
    } catch (error) {
      console.error("Erreur création budget:", error);
    }
  };

  // Formater un montant
  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR").format(montant) + " FCFA";
  };

  // Formater un mois
  const formatMois = (mois) => {
    const moisNoms = [
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre",
    ];
    return moisNoms[mois - 1] || "";
  };

  // Obtenir le badge de statut
  const getStatutBadge = (statut) => {
    switch (statut) {
      case comptabiliteToolkit.STATUTS_BUDGET.BROUILLON:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            <Edit className="h-3 w-3 mr-1" />
            Brouillon
          </Badge>
        );
      case comptabiliteToolkit.STATUTS_BUDGET.VALIDE:
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Validé
          </Badge>
        );
      case comptabiliteToolkit.STATUTS_BUDGET.CLOTURE:
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            <Lock className="h-3 w-3 mr-1" />
            Clôturé
          </Badge>
        );
      default:
        return null;
    }
  };

  // Calculer les statistiques globales
  const statsGlobales = previsions.reduce(
    (acc, prev) => {
      acc.totalEncaissements += prev.details?.total_encaissements || 0;
      acc.totalDepenses += prev.details?.total_depenses || 0;
      acc.soldeNet +=
        (prev.details?.total_encaissements || 0) - (prev.details?.total_depenses || 0);
      return acc;
    },
    { totalEncaissements: 0, totalDepenses: 0, soldeNet: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Prévisions</h2>
          <p className="text-sm text-muted-foreground">
            Établir les prévisions financières mensuelles
          </p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle prévision
        </Button>
      </div>

      {/* Sélection de l'année */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label>Année</Label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques globales de l'année */}
      {previsions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total encaissements prévus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <p className="text-2xl font-bold text-emerald-600">
                  {formatMontant(statsGlobales.totalEncaissements)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total dépenses prévues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <p className="text-2xl font-bold text-red-600">
                  {formatMontant(statsGlobales.totalDepenses)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Solde net prévu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ChartLine className="h-5 w-5 text-orange-600" />
                <p
                  className={`text-2xl font-bold ${
                    statsGlobales.soldeNet >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}>
                  {formatMontant(statsGlobales.soldeNet)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Liste des prévisions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prévisions mensuelles - {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : previsions.length === 0 ? (
            <div className="text-center py-12">
              <ChartLine className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">Aucune prévision pour {selectedYear}</p>
              <Button variant="outline" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une prévision
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {previsions.map((prevision) => (
                <div
                  key={prevision.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1 space-y-3 w-full">
                      {/* En-tête */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-semibold">
                          {formatMois(prevision.mois)} {prevision.annee}
                        </h4>
                        {getStatutBadge(prevision.statut)}
                        {prevision.details?.mode_creation === "automatique" && (
                          <Badge variant="outline" className="bg-purple-100 text-purple-800">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Auto
                          </Badge>
                        )}
                      </div>

                      {/* Montants principaux */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Encaissements</p>
                            <p className="font-medium text-emerald-600">
                              {formatMontant(prevision.details?.total_encaissements || 0)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Dépenses</p>
                            <p className="font-medium text-red-600">
                              {formatMontant(prevision.details?.total_depenses || 0)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <ChartLine className="h-4 w-4 text-orange-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Solde net</p>
                            <p
                              className={`font-medium ${
                                (prevision.details?.total_encaissements || 0) -
                                  (prevision.details?.total_depenses || 0) >=
                                0
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              }`}>
                              {formatMontant(
                                (prevision.details?.total_encaissements || 0) -
                                  (prevision.details?.total_depenses || 0)
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Détail par compte */}
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Voir le détail par compte
                        </summary>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {prevision.details?.comptes &&
                            Object.entries(prevision.details.comptes).map(([compte, montants]) => (
                              <div key={compte} className="p-2 bg-muted/50 rounded">
                                <p className="font-medium text-xs mb-1">
                                  {comptabiliteToolkit.COMPTE_LABELS[compte] || compte}
                                </p>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Enc:</span>
                                    <span className="text-emerald-600">
                                      {formatMontant(montants.encaissements)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Dép:</span>
                                    <span className="text-red-600">
                                      {formatMontant(montants.depenses)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </details>
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                      {prevision.statut === comptabiliteToolkit.STATUTS_BUDGET.BROUILLON && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(prevision)}
                            className="flex-1 sm:flex-initial">
                            <Edit className="h-4 w-4 sm:mr-0 md:mr-2" />
                            <span className="sm:hidden md:inline">Éditer</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleValidate(prevision.id)}
                            className="flex-1 sm:flex-initial">
                            <CheckCircle className="h-4 w-4 sm:mr-0 md:mr-2" />
                            <span className="sm:hidden md:inline">Valider</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(prevision.id)}
                            className="flex-1 sm:flex-initial">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {prevision.statut === comptabiliteToolkit.STATUTS_BUDGET.VALIDE && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateBudgetFromPrevision(prevision.id)}
                            className="flex-1 sm:flex-initial">
                            <Calculator className="h-4 w-4 sm:mr-0 md:mr-2" />
                            <span className="sm:hidden md:inline">→ Budget</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleClose(prevision.id)}
                            className="flex-1 sm:flex-initial">
                            <Lock className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de création avec modes manuel/automatique */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle prévision</DialogTitle>
          </DialogHeader>

          <Tabs value={creationMode} onValueChange={setCreationMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manuel">
                <Edit className="h-4 w-4 mr-2" />
                Manuel
              </TabsTrigger>
              <TabsTrigger value="automatique">
                <Sparkles className="h-4 w-4 mr-2" />
                Automatique
              </TabsTrigger>
            </TabsList>

            {/* Mode Manuel */}
            <TabsContent value="manuel" className="space-y-4">
              <div className="space-y-4">
                {/* Période */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mois</Label>
                    <Select
                      value={formData.mois.toString()}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, mois: parseInt(value) }))
                      }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                          <SelectItem key={m} value={m.toString()}>
                            {formatMois(m)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Année</Label>
                    <Select
                      value={formData.annee.toString()}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, annee: parseInt(value) }))
                      }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027, 2028].map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Montants par compte */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Montants prévus par compte</h4>
                  {Object.entries(comptabiliteToolkit.COMPTE_LABELS).map(([key, label]) => (
                    <div key={key} className="p-4 border rounded-lg space-y-3">
                      <h5 className="font-medium">{label}</h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Encaissements prévus</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.comptes[key]?.encaissements || 0}
                            onChange={(e) =>
                              handleMontantChange(key, "encaissements", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Dépenses prévues</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.comptes[key]?.depenses || 0}
                            onChange={(e) => handleMontantChange(key, "depenses", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Mode Automatique */}
            <TabsContent value="automatique" className="space-y-4">
              <div className="space-y-4">
                {/* Période */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mois</Label>
                    <Select
                      value={formData.mois.toString()}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, mois: parseInt(value) }))
                      }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                          <SelectItem key={m} value={m.toString()}>
                            {formatMois(m)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Année</Label>
                    <Select
                      value={formData.annee.toString()}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, annee: parseInt(value) }))
                      }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027, 2028].map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Bouton de calcul */}
                {!scenariosCalcules && (
                  <Button
                    onClick={handleCalculerScenarios}
                    disabled={loadingScenarios}
                    className="w-full">
                    {loadingScenarios ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Calcul en cours...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Calculer les scénarios
                      </>
                    )}
                  </Button>
                )}

                {/* Scénarios calculés */}
                {scenariosCalcules && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-sm text-blue-800 dark:text-blue-400">
                        <Sparkles className="h-4 w-4 inline mr-1" />
                        Scénarios calculés sur {scenariosCalcules.moisHistorique} mois d'historique
                        ({scenariosCalcules.nbOperations} opérations)
                      </p>
                    </div>

                    {/* Sélection du scénario */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Pessimiste */}
                      <Card
                        className={`cursor-pointer transition-all ${
                          scenarioSelectionne === "pessimiste"
                            ? "ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => handleAppliquerScenario("pessimiste")}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-red-600" />
                            Pessimiste
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Enc:</span>
                            <span className="font-medium">
                              {formatMontant(
                                scenariosCalcules.scenarios.pessimiste.totaux
                                  .total_encaissements
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dép:</span>
                            <span className="font-medium">
                              {formatMontant(
                                scenariosCalcules.scenarios.pessimiste.totaux.total_depenses
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between pt-1 border-t">
                            <span className="text-muted-foreground">Net:</span>
                            <span className="font-semibold text-red-600">
                              {formatMontant(
                                scenariosCalcules.scenarios.pessimiste.totaux.solde_net
                              )}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Réaliste */}
                      <Card
                        className={`cursor-pointer transition-all ${
                          scenarioSelectionne === "realiste"
                            ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => handleAppliquerScenario("realiste")}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-blue-600" />
                            Réaliste
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Enc:</span>
                            <span className="font-medium">
                              {formatMontant(
                                scenariosCalcules.scenarios.realiste.totaux.total_encaissements
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dép:</span>
                            <span className="font-medium">
                              {formatMontant(
                                scenariosCalcules.scenarios.realiste.totaux.total_depenses
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between pt-1 border-t">
                            <span className="text-muted-foreground">Net:</span>
                            <span className="font-semibold text-blue-600">
                              {formatMontant(
                                scenariosCalcules.scenarios.realiste.totaux.solde_net
                              )}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Optimiste */}
                      <Card
                        className={`cursor-pointer transition-all ${
                          scenarioSelectionne === "optimiste"
                            ? "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => handleAppliquerScenario("optimiste")}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Zap className="h-4 w-4 text-green-600" />
                            Optimiste
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Enc:</span>
                            <span className="font-medium">
                              {formatMontant(
                                scenariosCalcules.scenarios.optimiste.totaux.total_encaissements
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dép:</span>
                            <span className="font-medium">
                              {formatMontant(
                                scenariosCalcules.scenarios.optimiste.totaux.total_depenses
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between pt-1 border-t">
                            <span className="text-muted-foreground">Net:</span>
                            <span className="font-semibold text-green-600">
                              {formatMontant(
                                scenariosCalcules.scenarios.optimiste.totaux.solde_net
                              )}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Montants par compte (éditable) */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">
                        Détails du scénario {scenarioSelectionne} (modifiable)
                      </h4>
                      {Object.entries(comptabiliteToolkit.COMPTE_LABELS).map(([key, label]) => (
                        <div key={key} className="p-3 border rounded-lg space-y-2">
                          <h5 className="font-medium text-sm">{label}</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Encaissements</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.comptes[key]?.encaissements || 0}
                                onChange={(e) =>
                                  handleMontantChange(key, "encaissements", e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Dépenses</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.comptes[key]?.depenses || 0}
                                onChange={(e) =>
                                  handleMontantChange(key, "depenses", e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Erreur générale */}
          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="flex-1 sm:flex-initial">
              Annuler
            </Button>
            <Button
              onClick={handleSubmitCreate}
              disabled={creationMode === "automatique" && !scenariosCalcules}
              className="flex-1 sm:flex-initial">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <ChartLine className="h-4 w-4 mr-2" />
                  Créer la prévision
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition (identique à avant) */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Modifier la prévision - {formatMois(formData.mois)} {formData.annee}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Montants par compte */}
            <div className="space-y-4">
              {Object.entries(comptabiliteToolkit.COMPTE_LABELS).map(([key, label]) => (
                <div key={key} className="p-4 border rounded-lg space-y-3">
                  <h5 className="font-medium">{label}</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Encaissements prévus</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.comptes[key]?.encaissements || 0}
                        onChange={(e) =>
                          handleMontantChange(key, "encaissements", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Dépenses prévues</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.comptes[key]?.depenses || 0}
                        onChange={(e) => handleMontantChange(key, "depenses", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Erreur générale */}
            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedPrevision(null);
                }}
                className="flex-1 sm:flex-initial">
                Annuler
              </Button>
              <Button onClick={handleSubmitEdit} className="flex-1 sm:flex-initial">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <FileCheck className="h-4 w-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrevisionView;
