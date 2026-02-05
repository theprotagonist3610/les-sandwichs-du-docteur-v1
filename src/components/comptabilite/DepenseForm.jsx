import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, TrendingDown } from "lucide-react";
import * as comptabiliteToolkit from "@/utils/comptabiliteToolkit";

/**
 * Formulaire de création de dépense
 * Responsive et validé
 */
const DepenseForm = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    compte: comptabiliteToolkit.TYPES_COMPTE.CAISSE,
    montant: "",
    motif: "",
    date_operation: new Date().toISOString().split("T")[0], // Format YYYY-MM-DD
  });
  const [errors, setErrors] = useState({});

  // Gestion des changements de champs
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Validation du formulaire
  const validateForm = () => {
    const newErrors = {};

    if (!formData.compte) {
      newErrors.compte = "Le compte est requis";
    }

    if (!formData.montant || parseFloat(formData.montant) <= 0) {
      newErrors.montant = "Le montant doit être supérieur à 0";
    }

    if (!formData.motif || formData.motif.trim() === "") {
      newErrors.motif = "Le motif est requis";
    }

    if (!formData.date_operation) {
      newErrors.date_operation = "La date est requise";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await comptabiliteToolkit.createOperation({
        operation: comptabiliteToolkit.TYPES_OPERATION.DEPENSE,
        compte: formData.compte,
        montant: parseFloat(formData.montant),
        motif: formData.motif.trim(),
        date_operation: formData.date_operation,
      });

      if (result.success) {
        // Réinitialiser le formulaire
        setFormData({
          compte: comptabiliteToolkit.TYPES_COMPTE.CAISSE,
          montant: "",
          motif: "",
          date_operation: new Date().toISOString().split("T")[0],
        });
        setErrors({});

        // Callback de succès
        if (onSuccess) {
          onSuccess(result.operation);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header visuel */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
          <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Nouvelle dépense</h3>
          <p className="text-sm text-muted-foreground">
            Enregistrer une dépense dans la comptabilité
          </p>
        </div>
      </div>

      {/* Compte */}
      <div className="space-y-2">
        <Label htmlFor="compte">
          Compte <span className="text-red-500">*</span>
        </Label>
        <Select value={formData.compte} onValueChange={(value) => handleChange("compte", value)}>
          <SelectTrigger id="compte" className={errors.compte ? "border-red-500" : ""}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(comptabiliteToolkit.COMPTE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.compte && <p className="text-xs text-red-500">{errors.compte}</p>}
      </div>

      {/* Montant */}
      <div className="space-y-2">
        <Label htmlFor="montant">
          Montant (FCFA) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="montant"
          type="number"
          step="0.01"
          min="0"
          placeholder="Ex: 25000"
          value={formData.montant}
          onChange={(e) => handleChange("montant", e.target.value)}
          className={errors.montant ? "border-red-500" : ""}
        />
        {errors.montant && <p className="text-xs text-red-500">{errors.montant}</p>}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date_operation">
          Date de la dépense <span className="text-red-500">*</span>
        </Label>
        <Input
          id="date_operation"
          type="date"
          value={formData.date_operation}
          onChange={(e) => handleChange("date_operation", e.target.value)}
          max={new Date().toISOString().split("T")[0]} // Ne pas permettre dates futures
          className={errors.date_operation ? "border-red-500" : ""}
        />
        {errors.date_operation && (
          <p className="text-xs text-red-500">{errors.date_operation}</p>
        )}
      </div>

      {/* Motif */}
      <div className="space-y-2">
        <Label htmlFor="motif">
          Motif/Description <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="motif"
          placeholder="Ex: Achat de fournitures - Facture #5678"
          value={formData.motif}
          onChange={(e) => handleChange("motif", e.target.value)}
          rows={3}
          className={errors.motif ? "border-red-500" : ""}
        />
        {errors.motif && <p className="text-xs text-red-500">{errors.motif}</p>}
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
          onClick={onCancel}
          disabled={loading}
          className="flex-1 sm:flex-initial">
          Annuler
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 sm:flex-initial">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <TrendingDown className="h-4 w-4 mr-2" />
              Enregistrer la dépense
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default DepenseForm;
