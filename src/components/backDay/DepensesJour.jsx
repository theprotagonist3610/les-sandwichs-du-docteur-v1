/**
 * DepensesJour.jsx
 * Composant partagé de saisie et affichage des dépenses d'une journée
 * Utilisé dans OngletCommandes et OngletSynthese
 */

import { useState, useEffect } from "react";
import { Plus, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TYPES_COMPTE, COMPTE_LABELS } from "@/utils/backDaysToolkit";
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
];

const UNITES_DEPENSE = [
  "kg", "g", "L", "cL", "pièce(s)", "lot(s)", "boîte(s)", "sachet(s)", "carton(s)",
];

// ─── Formulaire d'ajout ──────────────────────────────────────────────────────

const FormulaireDepense = ({ onAjouter, loading }) => {
  const [categorie, setCategorie] = useState("_none");
  const [details, setDetails] = useState("");
  const [montant, setMontant] = useState("");
  const [compte, setCompte] = useState(TYPES_COMPTE.CAISSE);
  const [emplacements, setEmplacements] = useState([]);
  const [emplacementId, setEmplacementId] = useState("_none");
  const [quantite, setQuantite] = useState("");
  const [unite, setUnite] = useState("_none");

  useEffect(() => {
    getAllEmplacements({ statut: "actif" }).then(({ emplacements }) =>
      setEmplacements(emplacements ?? [])
    );
  }, []);

  const canSubmit =
    categorie !== "_none" &&
    emplacementId !== "_none" &&
    parseFloat(quantite) > 0 &&
    unite !== "_none" &&
    parseFloat(montant) > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const emplacementNom = emplacements.find((e) => e.id === emplacementId)?.nom ?? "";
    const motifTexte = details.trim()
      ? `${categorie} - ${details.trim()}`
      : categorie;

    const ok = await onAjouter({
      motif: {
        motif: motifTexte,
        emplacement: emplacementNom,
        quantite: parseFloat(quantite),
        unite,
      },
      montant: parseFloat(montant),
      compte,
    });

    if (ok) {
      setCategorie("_none");
      setDetails("");
      setMontant("");
      setCompte(TYPES_COMPTE.CAISSE);
      setEmplacementId("_none");
      setQuantite("");
      setUnite("_none");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* Catégorie */}
      <Select value={categorie} onValueChange={(v) => { setCategorie(v); setDetails(""); }}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Catégorie de dépense *" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none" disabled>Catégorie *</SelectItem>
          {CATEGORIES_DEPENSE.map((cat) => (
            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Détails (optionnel, affiché après sélection catégorie) */}
      {categorie !== "_none" && (
        <Input
          placeholder="Détails (fournisseur, facture…)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          className="h-9 text-sm"
        />
      )}

      {/* Emplacement */}
      <Select value={emplacementId} onValueChange={setEmplacementId}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Emplacement *" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none" disabled>Emplacement *</SelectItem>
          {emplacements.map((e) => (
            <SelectItem key={e.id} value={e.id}>{e.nom}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Quantité + Unité + Montant + Compte + Bouton */}
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          placeholder="Quantité *"
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
          min="0"
          step="0.01"
          className="h-9 text-sm"
        />
        <Select value={unite} onValueChange={setUnite}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Unité *" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none" disabled>Unité *</SelectItem>
            {UNITES_DEPENSE.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Montant (F) *"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          min="0"
          step="1"
          className="h-9 text-sm flex-1"
        />
        <Select value={compte} onValueChange={setCompte}>
          <SelectTrigger className="h-9 text-sm w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(COMPTE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={!canSubmit || loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>
    </form>
  );
};

// ─── Ligne dépense ───────────────────────────────────────────────────────────

const LigneDepense = ({ depense }) => {
  const motif = (() => {
    const m = depense.motif;
    if (typeof m === "object" && m !== null) return m;
    if (typeof m === "string") { try { return JSON.parse(m); } catch { return { motif: m }; } }
    return {};
  })();
  const motifTexte = motif?.motif ?? depense.motif;
  const emplacement = motif?.emplacement ?? null;
  const quantite = motif?.quantite ?? null;
  const unite = motif?.unite ?? null;

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{motifTexte}</p>
        <p className="text-xs text-muted-foreground">
          {COMPTE_LABELS[depense.compte] || depense.compte}
          {emplacement ? ` · ${emplacement}` : ""}
          {quantite && unite ? ` · ${quantite} ${unite}` : ""}
        </p>
      </div>
      <span className="text-sm font-semibold text-destructive ml-3 shrink-0">
        -{parseFloat(depense.montant).toLocaleString("fr-FR")} F
      </span>
    </div>
  );
};

// ─── Composant principal ─────────────────────────────────────────────────────

/**
 * @param {Object}   props
 * @param {Array}    props.depenses        - Liste des dépenses déjà enregistrées
 * @param {Function} props.onAjouter       - async ({ motif, montant, compte }) => boolean
 * @param {boolean}  [props.loading]       - Chargement en cours
 * @param {boolean}  [props.readOnly]      - Lecture seule (si clôture déjà faite)
 * @param {string}   [props.className]
 */
const DepensesJour = ({
  depenses = [],
  onAjouter,
  loading = false,
  readOnly = false,
  className,
}) => {
  const [submitting, setSubmitting] = useState(false);

  const handleAjouter = async (data) => {
    setSubmitting(true);
    const ok = await onAjouter(data);
    setSubmitting(false);
    return ok;
  };

  const total = depenses.reduce((s, d) => s + parseFloat(d.montant || 0), 0);

  return (
    <div className={cn("space-y-3", className)}>
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-destructive" />
          <span className="text-sm font-semibold">Dépenses</span>
        </div>
        {depenses.length > 0 && (
          <span className="text-sm font-bold text-destructive">
            -{total.toLocaleString("fr-FR")} F
          </span>
        )}
      </div>

      {/* Formulaire d'ajout */}
      {!readOnly && (
        <FormulaireDepense onAjouter={handleAjouter} loading={submitting} />
      )}

      {/* Liste */}
      {depenses.length > 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-1">
          {depenses.map((dep, i) => (
            <LigneDepense key={dep.id || i} depense={dep} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3">
          Aucune dépense enregistrée
        </p>
      )}
    </div>
  );
};

export default DepensesJour;
