import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, TrendingUp } from "lucide-react";
import * as comptabiliteToolkit from "@/utils/comptabiliteToolkit";
import { getAllEmplacements } from "@/utils/emplacementToolkit";

const parseMotif = (motif) => {
  if (typeof motif === "object" && motif !== null) return motif;
  if (typeof motif === "string") {
    try { return JSON.parse(motif); } catch { return { motif }; }
  }
  return {};
};

const EncaissementForm = ({ onSuccess, onCancel, initialData = null }) => {
  const isEditMode = !!initialData;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      const m = parseMotif(initialData.motif);
      return {
        compte: initialData.compte ?? comptabiliteToolkit.TYPES_COMPTE.CAISSE,
        montant: String(initialData.montant ?? ""),
        motifTexte: m?.motif ?? "",
        date_operation: initialData.date_operation?.split("T")[0] ?? new Date().toISOString().split("T")[0],
      };
    }
    return {
      compte: comptabiliteToolkit.TYPES_COMPTE.CAISSE,
      montant: "",
      motifTexte: "",
      date_operation: new Date().toISOString().split("T")[0],
    };
  });
  const [emplacements, setEmplacements] = useState([]);
  const [emplacementId, setEmplacementId] = useState("_none");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    getAllEmplacements({ statut: "actif" }).then(({ emplacements: list }) => {
      const loaded = list ?? [];
      setEmplacements(loaded);
      // En mode édition, retrouver l'ID à partir du nom stocké dans motif
      if (initialData) {
        const m = parseMotif(initialData.motif);
        const nom = m?.emplacement ?? "";
        const found = loaded.find((e) => e.nom === nom);
        setEmplacementId(found ? found.id : "_none");
      }
    });
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.compte) newErrors.compte = "Le compte est requis";
    if (!formData.montant || parseFloat(formData.montant) <= 0)
      newErrors.montant = "Le montant doit être supérieur à 0";
    if (!formData.motifTexte.trim()) newErrors.motifTexte = "Le motif est requis";
    if (emplacementId === "_none") newErrors.emplacement = "L'emplacement est requis";
    if (!formData.date_operation) newErrors.date_operation = "La date est requise";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const emplacementNom = emplacements.find((e) => e.id === emplacementId)?.nom ?? "";
      const motif = { motif: formData.motifTexte.trim(), emplacement: emplacementNom };

      let result;
      if (isEditMode) {
        result = await comptabiliteToolkit.updateOperation(initialData.id, {
          compte: formData.compte,
          montant: parseFloat(formData.montant),
          motif,
          date_operation: formData.date_operation,
        });
      } else {
        result = await comptabiliteToolkit.createOperation({
          operation: comptabiliteToolkit.TYPES_OPERATION.ENCAISSEMENT,
          compte: formData.compte,
          montant: parseFloat(formData.montant),
          motif,
          date_operation: formData.date_operation,
        });
      }

      if (result.success) {
        if (!isEditMode) {
          setFormData({
            compte: comptabiliteToolkit.TYPES_COMPTE.CAISSE,
            montant: "",
            motifTexte: "",
            date_operation: new Date().toISOString().split("T")[0],
          });
          setEmplacementId("_none");
          setErrors({});
        }
        if (onSuccess) onSuccess(result.operation);
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
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-3 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
          <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">
            {isEditMode ? "Modifier l'encaissement" : "Nouvel encaissement"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isEditMode
              ? "Mettre à jour les informations de l'encaissement"
              : "Enregistrer un encaissement dans la comptabilité"}
          </p>
        </div>
      </div>

      {/* Compte */}
      <div className="space-y-2">
        <Label htmlFor="compte">
          Compte <span className="text-red-500">*</span>
        </Label>
        <Select value={formData.compte} onValueChange={(v) => handleChange("compte", v)}>
          <SelectTrigger id="compte" className={errors.compte ? "border-red-500" : ""}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(comptabiliteToolkit.COMPTE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.compte && <p className="text-xs text-red-500">{errors.compte}</p>}
      </div>

      {/* Emplacement */}
      <div className="space-y-2">
        <Label htmlFor="emplacement">
          Emplacement <span className="text-red-500">*</span>
        </Label>
        <Select value={emplacementId} onValueChange={setEmplacementId}>
          <SelectTrigger id="emplacement" className={errors.emplacement ? "border-red-500" : ""}>
            <SelectValue placeholder="Choisir un emplacement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none" disabled>Choisir un emplacement</SelectItem>
            {emplacements.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.emplacement && <p className="text-xs text-red-500">{errors.emplacement}</p>}
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
          placeholder="Ex: 50000"
          value={formData.montant}
          onChange={(e) => handleChange("montant", e.target.value)}
          className={errors.montant ? "border-red-500" : ""}
        />
        {errors.montant && <p className="text-xs text-red-500">{errors.montant}</p>}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date_operation">
          Date de l'encaissement <span className="text-red-500">*</span>
        </Label>
        <Input
          id="date_operation"
          type="date"
          value={formData.date_operation}
          onChange={(e) => handleChange("date_operation", e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          className={errors.date_operation ? "border-red-500" : ""}
        />
        {errors.date_operation && (
          <p className="text-xs text-red-500">{errors.date_operation}</p>
        )}
      </div>

      {/* Motif */}
      <div className="space-y-2">
        <Label htmlFor="motifTexte">
          Motif <span className="text-red-500">*</span>
        </Label>
        <Input
          id="motifTexte"
          placeholder="Ex: Vente de sandwichs, Commande #1234..."
          value={formData.motifTexte}
          onChange={(e) => handleChange("motifTexte", e.target.value)}
          className={errors.motifTexte ? "border-red-500" : ""}
        />
        {errors.motifTexte && <p className="text-xs text-red-500">{errors.motifTexte}</p>}
      </div>

      {/* Erreur générale */}
      {errors.submit && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}
          className="flex-1 sm:flex-initial">
          Annuler
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 sm:flex-initial">
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</>
          ) : isEditMode ? (
            <><TrendingUp className="h-4 w-4 mr-2" />Mettre à jour</>
          ) : (
            <><TrendingUp className="h-4 w-4 mr-2" />Enregistrer l'encaissement</>
          )}
        </Button>
      </div>
    </form>
  );
};

export default EncaissementForm;
