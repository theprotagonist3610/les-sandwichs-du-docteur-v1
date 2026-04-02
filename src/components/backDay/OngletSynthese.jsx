/**
 * OngletSynthese.jsx
 * Onglet 2 du Back-Day : saisie synthétique d'une journée
 * Ventes globales (cash/momo/autre) + Dépenses + Encaissements autonomes
 */

import { useState, useEffect } from "react";
import { Banknote, Smartphone, CircleDollarSign, Plus, Loader2, TrendingUp } from "lucide-react";
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
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { TYPES_COMPTE, COMPTE_LABELS } from "@/utils/backDaysToolkit";
import { getAllEmplacements } from "@/utils/emplacementToolkit";
import DepensesJour from "./DepensesJour";

// ─── Encaissements autonomes ─────────────────────────────────────────────────

const FormulaireEncaissement = ({ onAjouter, loading }) => {
  const [motifTexte, setMotifTexte] = useState("");
  const [montant, setMontant] = useState("");
  const [compte, setCompte] = useState(TYPES_COMPTE.CAISSE);
  const [emplacements, setEmplacements] = useState([]);
  const [emplacementId, setEmplacementId] = useState("_none");

  useEffect(() => {
    getAllEmplacements({ statut: "actif" }).then(({ emplacements }) =>
      setEmplacements(emplacements ?? [])
    );
  }, []);

  const canSubmit = motifTexte.trim() && parseFloat(montant) > 0 && emplacementId !== "_none";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    const emplacementNom = emplacements.find((e) => e.id === emplacementId)?.nom ?? "";
    const ok = await onAjouter({
      motif: { motif: motifTexte.trim(), emplacement: emplacementNom },
      montant: parseFloat(montant),
      compte,
    });
    if (ok) {
      setMotifTexte("");
      setMontant("");
      setCompte(TYPES_COMPTE.CAISSE);
      setEmplacementId("_none");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Input
        placeholder="Libellé de l'encaissement *"
        value={motifTexte}
        onChange={(e) => setMotifTexte(e.target.value)}
        className="h-9 text-sm"
      />
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
        <Button type="submit" size="icon" className="h-9 w-9 shrink-0"
          disabled={!canSubmit || loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>
    </form>
  );
};

const LigneEncaissement = ({ encaissement }) => {
  const motif = (() => {
    const m = encaissement.motif;
    if (typeof m === "object" && m !== null) return m;
    if (typeof m === "string") { try { return JSON.parse(m); } catch { return { motif: m }; } }
    return {};
  })();
  const motifTexte = motif?.motif ?? encaissement.motif;
  const emplacement = motif?.emplacement ?? null;

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{motifTexte}</p>
        <p className="text-xs text-muted-foreground">
          {COMPTE_LABELS[encaissement.compte] || encaissement.compte}
          {emplacement ? ` · ${emplacement}` : ""}
        </p>
      </div>
      <span className="text-sm font-semibold text-green-600 ml-3 shrink-0">
        +{parseFloat(encaissement.montant).toLocaleString("fr-FR")} F
      </span>
    </div>
  );
};

// ─── Champ montant avec icône ─────────────────────────────────────────────────

const ChampMontant = ({ label, icon: Icon, iconColor, value, onChange, disabled }) => (
  <div className="space-y-1">
    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
      <Icon className={cn("w-3.5 h-3.5", iconColor)} />
      {label}
    </Label>
    <Input
      type="number"
      placeholder="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min="0"
      step="1"
      disabled={disabled}
      className="h-10 text-sm font-medium"
    />
  </div>
);

// ─── Composant principal ─────────────────────────────────────────────────────

/**
 * @param {Object}   props
 * @param {Object}   props.hook - Instance de useBackDay
 */
const OngletSynthese = ({ hook }) => {
  const {
    depenses, ajouterDepense,
    encaissements, ajouterEncaissement,
    loadingOperations,
    enregistrerSynthese,
    statutJournee,
    totalDepensesJour,
    totalEncaissementsJour,
  } = hook;

  const [totalCash, setTotalCash] = useState("");
  const [totalMomo, setTotalMomo] = useState("");
  const [totalAutre, setTotalAutre] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittingEnc, setSubmittingEnc] = useState(false);

  const readOnly = statutJournee?.has_closure;

  const cash = parseFloat(totalCash) || 0;
  const momo = parseFloat(totalMomo) || 0;
  const autre = parseFloat(totalAutre) || 0;
  const totalVentes = cash + momo + autre;

  const canSubmitSynthese = totalVentes > 0 && !readOnly;

  const handleEnregistrerSynthese = async () => {
    setSubmitting(true);
    const ok = await enregistrerSynthese({ total_cash: cash, total_momo: momo, total_autre: autre, notes });
    if (ok) {
      setTotalCash("");
      setTotalMomo("");
      setTotalAutre("");
      setNotes("");
    }
    setSubmitting(false);
  };

  const handleAjouterEncaissement = async (data) => {
    setSubmittingEnc(true);
    const ok = await ajouterEncaissement(data);
    setSubmittingEnc(false);
    return ok;
  };

  return (
    <div className="space-y-4 p-4">

      {/* Section Ventes globales */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Ventes du jour</span>
          {totalVentes > 0 && (
            <span className="ml-auto text-sm font-bold text-primary">
              {totalVentes.toLocaleString("fr-FR")} F
            </span>
          )}
        </div>

        {readOnly ? (
          <p className="text-xs text-muted-foreground">
            Cette journée est clôturée. Aucune modification possible.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <ChampMontant
                label="Cash"
                icon={Banknote}
                iconColor="text-green-600"
                value={totalCash}
                onChange={setTotalCash}
                disabled={readOnly}
              />
              <ChampMontant
                label="MoMo"
                icon={Smartphone}
                iconColor="text-yellow-500"
                value={totalMomo}
                onChange={setTotalMomo}
                disabled={readOnly}
              />
              <ChampMontant
                label="Autre"
                icon={CircleDollarSign}
                iconColor="text-blue-500"
                value={totalAutre}
                onChange={setTotalAutre}
                disabled={readOnly}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Notes (optionnel)</Label>
              <Textarea
                placeholder="Remarques sur les ventes du jour..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-sm resize-none"
                rows={2}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleEnregistrerSynthese}
              disabled={!canSubmitSynthese || submitting}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enregistrement…</>
              ) : (
                "Enregistrer la synthèse"
              )}
            </Button>
          </>
        )}
      </Card>

      {/* Section Dépenses */}
      <Card className="p-4">
        <DepensesJour
          depenses={depenses}
          onAjouter={ajouterDepense}
          loading={loadingOperations}
          readOnly={readOnly}
        />
      </Card>

      {/* Section Encaissements autonomes */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold">Encaissements autonomes</span>
          </div>
          {encaissements.length > 0 && (
            <span className="text-sm font-bold text-green-600">
              +{totalEncaissementsJour.toLocaleString("fr-FR")} F
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Encaissements hors ventes : remboursement fournisseur, apport de fonds…
        </p>

        {!readOnly && (
          <FormulaireEncaissement onAjouter={handleAjouterEncaissement} loading={submittingEnc} />
        )}

        {encaissements.length > 0 ? (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-1">
            {encaissements.map((enc, i) => (
              <LigneEncaissement key={enc.id || i} encaissement={enc} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">
            Aucun encaissement autonome enregistré
          </p>
        )}
      </Card>

      {/* Récap du jour */}
      {(totalDepensesJour > 0 || totalEncaissementsJour > 0) && (
        <Card className="p-4 bg-muted/40">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Récapitulatif opérations</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dépenses</span>
              <span className="font-medium text-destructive">-{totalDepensesJour.toLocaleString("fr-FR")} F</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Encaissements autonomes</span>
              <span className="font-medium text-green-600">+{totalEncaissementsJour.toLocaleString("fr-FR")} F</span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between font-semibold">
              <span>Net opérations</span>
              <span className={cn(
                totalEncaissementsJour - totalDepensesJour >= 0 ? "text-green-600" : "text-destructive"
              )}>
                {(totalEncaissementsJour - totalDepensesJour).toLocaleString("fr-FR")} F
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default OngletSynthese;
