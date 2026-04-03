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
import { Loader2, TrendingDown } from "lucide-react";
import * as comptabiliteToolkit from "@/utils/comptabiliteToolkit";
import { getAllEmplacements } from "@/utils/emplacementToolkit";

const CATEGORIES_DEPENSE = [
  "Achat poisson",
  "Achat viande",
  "Achat légumes",
  "Achat épices",
  "Achat emballage",
  "Achat pain",
  "Achat lait",
  "Achat boisson",
  "Achat ustensiles",
  "Achat autres",
  "Charges fixes",
];

const UNITES_DEPENSE = ["kg", "g", "L", "cL", "pièce(s)", "lot(s)", "boîte(s)", "sachet(s)", "carton(s)"];

const FORM_VIDE = {
  compte: comptabiliteToolkit.TYPES_COMPTE.CAISSE,
  montant: "",
  quantite: "",
  date_operation: new Date().toISOString().split("T")[0],
};

const DepenseForm = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(FORM_VIDE);
  const [errors, setErrors] = useState({});

  const [emplacements, setEmplacements] = useState([]);
  const [emplacementId, setEmplacementId] = useState("_none");
  const [categorieDepense, setCategorieDepense] = useState("_none");
  const [detailsMotif, setDetailsMotif] = useState("");
  const [unite, setUnite] = useState("_none");

  useEffect(() => {
    getAllEmplacements({ statut: "actif" }).then(({ emplacements }) =>
      setEmplacements(emplacements ?? [])
    );
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
    if (categorieDepense === "_none") newErrors.categorie = "La catégorie est requise";
    if (emplacementId === "_none") newErrors.emplacement = "L'emplacement est requis";
    if (!formData.quantite || parseFloat(formData.quantite) <= 0)
      newErrors.quantite = "La quantité doit être supérieure à 0";
    if (unite === "_none") newErrors.unite = "L'unité est requise";
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
      const motifTexte = detailsMotif.trim()
        ? `${categorieDepense} - ${detailsMotif.trim()}`
        : categorieDepense;

      const result = await comptabiliteToolkit.createOperation({
        operation: comptabiliteToolkit.TYPES_OPERATION.DEPENSE,
        compte: formData.compte,
        montant: parseFloat(formData.montant),
        motif: {
          motif: motifTexte,
          emplacement: emplacementNom,
          quantite: parseFloat(formData.quantite),
          unite,
        },
        date_operation: formData.date_operation,
      });

      if (result.success) {
        setFormData(FORM_VIDE);
        setEmplacementId("_none");
        setCategorieDepense("_none");
        setDetailsMotif("");
        setUnite("_none");
        setErrors({});
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

      {/* Catégorie */}
      <div className="space-y-2">
        <Label>
          Catégorie <span className="text-red-500">*</span>
        </Label>
        <Select
          value={categorieDepense}
          onValueChange={(v) => { setCategorieDepense(v); setDetailsMotif(""); }}>
          <SelectTrigger className={errors.categorie ? "border-red-500" : ""}>
            <SelectValue placeholder="Choisir une catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none" disabled>Choisir une catégorie</SelectItem>
            {CATEGORIES_DEPENSE.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categorie && <p className="text-xs text-red-500">{errors.categorie}</p>}
      </div>

      {/* Détails du motif */}
      {categorieDepense !== "_none" && (
        <div className="space-y-2">
          <Label htmlFor="details-motif">Détails</Label>
          <Input
            id="details-motif"
            placeholder="Ex: Facture #5678, fournisseur X..."
            value={detailsMotif}
            onChange={(e) => setDetailsMotif(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Motif :{" "}
            <span className="font-medium">
              {detailsMotif.trim()
                ? `${categorieDepense} - ${detailsMotif.trim()}`
                : categorieDepense}
            </span>
          </p>
        </div>
      )}

      {/* Quantité + Unité */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="quantite">
            Quantité <span className="text-red-500">*</span>
          </Label>
          <Input
            id="quantite"
            type="number"
            step="0.01"
            min="0"
            placeholder="Ex: 5"
            value={formData.quantite}
            onChange={(e) => handleChange("quantite", e.target.value)}
            className={errors.quantite ? "border-red-500" : ""}
          />
          {errors.quantite && <p className="text-xs text-red-500">{errors.quantite}</p>}
        </div>
        <div className="space-y-2">
          <Label>
            Unité <span className="text-red-500">*</span>
          </Label>
          <Select value={unite} onValueChange={setUnite}>
            <SelectTrigger className={errors.unite ? "border-red-500" : ""}>
              <SelectValue placeholder="Unité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none" disabled>Unité</SelectItem>
              {UNITES_DEPENSE.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.unite && <p className="text-xs text-red-500">{errors.unite}</p>}
        </div>
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
          max={new Date().toISOString().split("T")[0]}
          className={errors.date_operation ? "border-red-500" : ""}
        />
        {errors.date_operation && (
          <p className="text-xs text-red-500">{errors.date_operation}</p>
        )}
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
          ) : (
            <><TrendingDown className="h-4 w-4 mr-2" />Enregistrer la dépense</>
          )}
        </Button>
      </div>
    </form>
  );
};

export default DepenseForm;
