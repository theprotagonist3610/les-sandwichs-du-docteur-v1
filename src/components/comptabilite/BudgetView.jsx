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
import {
  Calculator,
  Plus,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Calendar,
  Edit,
  Trash2,
  Copy,
  Lock,
  FileCheck,
} from "lucide-react";
import * as comptabiliteToolkit from "@/utils/comptabiliteToolkit";

/**
 * Interface de gestion des budgets mensuels
 * 100% Responsive
 */
const BudgetView = () => {
  // États
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  // Filtres
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Formulaire
  const [formData, setFormData] = useState({
    type: comptabiliteToolkit.TYPES_BUDGET.BUDGET,
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
    comptes: {},
  });
  const [errors, setErrors] = useState({});

  // Charger les budgets
  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const result = await comptabiliteToolkit.getBudgets({
        type: comptabiliteToolkit.TYPES_BUDGET.BUDGET,
        annee: selectedYear,
        orderBy: "mois",
        ascending: false,
      });

      if (result.success) {
        setBudgets(result.budgets);
      }
    } catch (error) {
      console.error("Erreur chargement budgets:", error);
    } finally {
      setLoading(false);
    }
  };

  // Charger la comparaison budget vs réalisé
  const fetchComparison = async () => {
    setLoadingComparison(true);
    try {
      const result = await comptabiliteToolkit.compareBudgetVsRealise(
        selectedMonth,
        selectedYear
      );

      if (result.success) {
        setComparison(result.comparaison);
      }
    } catch (error) {
      console.error("Erreur chargement comparaison:", error);
    } finally {
      setLoadingComparison(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [selectedYear]);

  useEffect(() => {
    fetchComparison();
  }, [selectedMonth, selectedYear]);

  // Initialiser le formulaire pour un nouveau budget
  const initializeForm = () => {
    const initialComptes = {};
    Object.values(comptabiliteToolkit.TYPES_COMPTE).forEach((compte) => {
      initialComptes[compte] = {
        encaissements: 0,
        depenses: 0,
      };
    });

    setFormData({
      type: comptabiliteToolkit.TYPES_BUDGET.BUDGET,
      mois: selectedMonth,
      annee: selectedYear,
      comptes: initialComptes,
    });
    setErrors({});
  };

  // Ouvrir le dialog de création
  const handleCreate = () => {
    initializeForm();
    setShowCreateDialog(true);
  };

  // Ouvrir le dialog d'édition
  const handleEdit = (budget) => {
    setSelectedBudget(budget);
    setFormData({
      type: budget.type,
      mois: budget.mois,
      annee: budget.annee,
      comptes: budget.details?.comptes || {},
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

  // Créer un budget
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
      };

      const result = await comptabiliteToolkit.createBudget({
        type: formData.type,
        mois: formData.mois,
        annee: formData.annee,
        details,
      });

      if (result.success) {
        setShowCreateDialog(false);
        fetchBudgets();
        if (formData.mois === selectedMonth && formData.annee === selectedYear) {
          fetchComparison();
        }
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour un budget
  const handleSubmitEdit = async () => {
    if (!validateForm() || !selectedBudget) return;

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

      const result = await comptabiliteToolkit.updateBudget(selectedBudget.id, {
        details,
      });

      if (result.success) {
        setShowEditDialog(false);
        setSelectedBudget(null);
        fetchBudgets();
        fetchComparison();
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Valider un budget
  const handleValidate = async (budgetId) => {
    try {
      const result = await comptabiliteToolkit.validateBudget(budgetId);
      if (result.success) {
        fetchBudgets();
      }
    } catch (error) {
      console.error("Erreur validation budget:", error);
    }
  };

  // Clôturer un budget
  const handleClose = async (budgetId) => {
    try {
      const result = await comptabiliteToolkit.cloturerBudget(budgetId);
      if (result.success) {
        fetchBudgets();
      }
    } catch (error) {
      console.error("Erreur clôture budget:", error);
    }
  };

  // Supprimer un budget
  const handleDelete = async (budgetId) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce budget ?")) return;

    try {
      const result = await comptabiliteToolkit.deleteBudget(budgetId);
      if (result.success) {
        fetchBudgets();
        if (comparison && comparison.budget?.id === budgetId) {
          setComparison(null);
        }
      }
    } catch (error) {
      console.error("Erreur suppression budget:", error);
    }
  };

  // Dupliquer un budget
  const handleDuplicate = async (mois, annee) => {
    try {
      const result = await comptabiliteToolkit.duplicateBudgetFromPreviousMonth(
        mois,
        annee
      );
      if (result.success) {
        fetchBudgets();
        if (mois === selectedMonth && annee === selectedYear) {
          fetchComparison();
        }
      }
    } catch (error) {
      console.error("Erreur duplication budget:", error);
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

  // Calculer le taux de réalisation avec couleur
  const getTauxRealisationColor = (taux) => {
    if (taux >= 90 && taux <= 110) return "text-green-600";
    if (taux >= 80 && taux <= 120) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Budget</h2>
          <p className="text-sm text-muted-foreground">
            Créer et suivre les budgets mensuels
          </p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau budget
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sélection du mois */}
            <div className="space-y-2">
              <Label>Mois</Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}>
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

            {/* Sélection de l'année */}
            <div className="space-y-2">
              <Label>Année</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}>
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
        </CardContent>
      </Card>

      {/* Comparaison Budget vs Réalisé */}
      {loadingComparison ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : comparison ? (
        <div className="space-y-4">
          {/* Vue d'ensemble */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Budget prévu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-purple-600" />
                  <p className="text-2xl font-bold text-purple-600">
                    {formatMontant(comparison.budget?.details?.total_encaissements || 0)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Dépenses: {formatMontant(comparison.budget?.details?.total_depenses || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Réalisé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatMontant(comparison.realise?.total_encaissements || 0)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Dépenses: {formatMontant(comparison.realise?.total_depenses || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Écart global
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {comparison.ecarts?.global?.encaissements?.ecart >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <p
                    className={`text-2xl font-bold ${
                      comparison.ecarts?.global?.encaissements?.ecart >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                    {formatMontant(Math.abs(comparison.ecarts?.global?.encaissements?.ecart || 0))}
                  </p>
                </div>
                <p
                  className={`text-xs font-medium mt-2 ${getTauxRealisationColor(
                    comparison.ecarts?.global?.encaissements?.taux_realisation || 0
                  )}`}>
                  {comparison.ecarts?.global?.encaissements?.taux_realisation?.toFixed(1)}% de
                  réalisation
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Détail par compte */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détail par compte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {comparison.ecarts?.par_compte &&
                  Object.entries(comparison.ecarts.par_compte).map(([compte, ecart]) => (
                    <div
                      key={compte}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">
                          {comptabiliteToolkit.COMPTE_LABELS[compte] || compte}
                        </h4>
                        <Badge
                          variant="outline"
                          className={
                            ecart.encaissements.taux_realisation >= 90 &&
                            ecart.encaissements.taux_realisation <= 110
                              ? "bg-green-100 text-green-800"
                              : "bg-orange-100 text-orange-800"
                          }>
                          {ecart.encaissements.taux_realisation?.toFixed(1)}%
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        {/* Encaissements */}
                        <div>
                          <p className="text-muted-foreground mb-1">Encaissements</p>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Prévu:</span>
                              <span className="font-medium">
                                {formatMontant(ecart.encaissements.prevu)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Réalisé:</span>
                              <span className="font-medium text-emerald-600">
                                {formatMontant(ecart.encaissements.realise)}
                              </span>
                            </div>
                            <div className="flex justify-between pt-1 border-t">
                              <span className="text-muted-foreground">Écart:</span>
                              <span
                                className={`font-semibold ${
                                  ecart.encaissements.ecart >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}>
                                {ecart.encaissements.ecart >= 0 ? "+" : ""}
                                {formatMontant(ecart.encaissements.ecart)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Dépenses */}
                        <div>
                          <p className="text-muted-foreground mb-1">Dépenses</p>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Prévu:</span>
                              <span className="font-medium">
                                {formatMontant(ecart.depenses.prevu)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Réalisé:</span>
                              <span className="font-medium text-red-600">
                                {formatMontant(ecart.depenses.realise)}
                              </span>
                            </div>
                            <div className="flex justify-between pt-1 border-t">
                              <span className="text-muted-foreground">Écart:</span>
                              <span
                                className={`font-semibold ${
                                  ecart.depenses.ecart <= 0 ? "text-green-600" : "text-red-600"
                                }`}>
                                {ecart.depenses.ecart >= 0 ? "+" : ""}
                                {formatMontant(ecart.depenses.ecart)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Aucun budget défini pour {formatMois(selectedMonth)} {selectedYear}
            </p>
            <Button variant="outline" onClick={handleCreate} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Créer un budget
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Liste des budgets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budgets de l'année {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : budgets.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun budget trouvé</p>
          ) : (
            <div className="space-y-2">
              {budgets.map((budget) => (
                <div
                  key={budget.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">
                          {formatMois(budget.mois)} {budget.annee}
                        </h4>
                        {getStatutBadge(budget.statut)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Encaissements: </span>
                          <span className="font-medium text-emerald-600">
                            {formatMontant(budget.details?.total_encaissements || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Dépenses: </span>
                          <span className="font-medium text-red-600">
                            {formatMontant(budget.details?.total_depenses || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {budget.statut === comptabiliteToolkit.STATUTS_BUDGET.BROUILLON && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(budget)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleValidate(budget.id)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(budget.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {budget.statut === comptabiliteToolkit.STATUTS_BUDGET.VALIDE && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClose(budget.id)}>
                          <Lock className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de création */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau budget</DialogTitle>
          </DialogHeader>

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
              <h4 className="font-semibold">Montants par compte</h4>
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
                onClick={() => setShowCreateDialog(false)}
                className="flex-1 sm:flex-initial">
                Annuler
              </Button>
              <Button onClick={handleSubmitCreate} className="flex-1 sm:flex-initial">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Créer le budget
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Modifier le budget - {formatMois(formData.mois)} {formData.annee}
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
                  setSelectedBudget(null);
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

export default BudgetView;
