/**
 * OngletCloture.jsx
 * Onglet 3 du Back-Day : clôture d'une journée rétroactive
 * Affiche les métriques calculées, permet de clôturer ou de recalculer
 */

import { Loader2, Lock, RefreshCw, CheckCircle2, ShoppingBag, Banknote, TrendingDown, BarChart3, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatDateFr } from "@/utils/backDaysToolkit";

// ─── Ligne de métrique ────────────────────────────────────────────────────────

const MetriqueLigne = ({ label, value, className }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={cn("text-sm font-semibold", className)}>{value}</span>
  </div>
);

// ─── Bloc de métriques ────────────────────────────────────────────────────────

const BlocMetriques = ({ titre, icon: Icon, iconColor, children }) => (
  <Card className="p-4 space-y-1">
    <div className="flex items-center gap-2 mb-2">
      <Icon className={cn("w-4 h-4", iconColor)} />
      <span className="text-sm font-semibold">{titre}</span>
    </div>
    {children}
  </Card>
);

// ─── Affichage clôture existante ──────────────────────────────────────────────

const RapportCloture = ({ closure, onRecalculer, isRecalculating }) => {
  const c = closure;

  return (
    <div className="space-y-4">
      {/* Badge clôturé */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-green-700">Journée clôturée</p>
          <p className="text-xs text-green-600">{formatDateFr(c.jour)}</p>
        </div>
      </div>

      {/* Ventes */}
      <BlocMetriques titre="Ventes" icon={ShoppingBag} iconColor="text-primary">
        <MetriqueLigne label="Total commandes" value={c.nombre_ventes_total || 0} />
        <MetriqueLigne label="Sur place" value={c.nombre_ventes_sur_place || 0} />
        <MetriqueLigne label="Livraison" value={c.nombre_ventes_livraison || 0} />
        <MetriqueLigne label="Panier moyen" value={`${(c.panier_moyen || 0).toLocaleString("fr-FR")} F`} />
        <MetriqueLigne label="Taux completion" value={`${Math.round((c.taux_completion || 0) * 100) / 100}%`} />
      </BlocMetriques>

      {/* Chiffre d'affaires */}
      <BlocMetriques titre="Chiffre d'affaires" icon={Banknote} iconColor="text-green-600">
        <MetriqueLigne
          label="CA total"
          value={`${(c.chiffre_affaires || 0).toLocaleString("fr-FR")} F`}
          className="text-primary"
        />
        <MetriqueLigne label="Cash" value={`${(c.montant_percu_cash || 0).toLocaleString("fr-FR")} F`} />
        <MetriqueLigne label="MoMo" value={`${(c.montant_percu_momo || 0).toLocaleString("fr-FR")} F`} />
        <MetriqueLigne label="Autre" value={`${(c.montant_percu_autre || 0).toLocaleString("fr-FR")} F`} />
      </BlocMetriques>

      {/* Produits */}
      {c.meilleur_produit_nom && (
        <BlocMetriques titre="Produits" icon={BarChart3} iconColor="text-blue-500">
          <MetriqueLigne label="Meilleur produit" value={c.meilleur_produit_nom} />
          <MetriqueLigne label="Qté vendue" value={c.meilleur_produit_quantite || 0} />
          <MetriqueLigne label="Produits distincts" value={c.nombre_produits_distincts || 0} />
        </BlocMetriques>
      )}

      {/* Horaires */}
      {(c.heure_pointe_debut || c.temps_moyen_preparation_minutes) && (
        <BlocMetriques titre="Timing" icon={Clock} iconColor="text-amber-500">
          {c.heure_pointe_debut && (
            <MetriqueLigne label="Heure de pointe" value={`${c.heure_pointe_debut}–${c.heure_pointe_fin}`} />
          )}
          {c.temps_moyen_preparation_minutes > 0 && (
            <MetriqueLigne label="Prép. moyenne" value={`${c.temps_moyen_preparation_minutes} min`} />
          )}
        </BlocMetriques>
      )}

      {/* Notes */}
      {c.notes && (
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
          <p className="text-sm">{c.notes}</p>
        </Card>
      )}

      {/* Bouton recalculer */}
      <Button variant="outline" className="w-full" onClick={onRecalculer} disabled={isRecalculating}>
        {isRecalculating ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Recalcul…</>
        ) : (
          <><RefreshCw className="w-4 h-4 mr-2" /> Recalculer la clôture</>
        )}
      </Button>
    </div>
  );
};

// ─── Formulaire de clôture ────────────────────────────────────────────────────

const FormulaireCloture = ({ hook }) => {
  const {
    statutJournee, commandesDuJour, loadingCommandes,
    notesClôture, setNotesClôture,
    cloturerJournee, isClôturing,
    totalDepensesJour,
  } = hook;

  const nbCommandes = commandesDuJour.filter(c => c.client !== "SYNTHESE JOURNEE").length;
  const nbSyntheses = commandesDuJour.filter(c => c.client === "SYNTHESE JOURNEE").length;
  const totalVentes = commandesDuJour.reduce((s, c) => {
    return s + (c.details_paiement?.total_apres_reduction ?? c.details_paiement?.total ?? 0);
  }, 0);

  const canCloture = commandesDuJour.length > 0;

  return (
    <div className="space-y-4">
      {/* Aperçu des données disponibles */}
      <Card className="p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Données disponibles pour la clôture</p>
        <MetriqueLigne label="Commandes saisies" value={nbCommandes} />
        {nbSyntheses > 0 && (
          <MetriqueLigne label="Synthèses de journée" value={nbSyntheses} />
        )}
        <MetriqueLigne
          label="CA estimé"
          value={`${totalVentes.toLocaleString("fr-FR")} F`}
          className="text-primary"
        />
        {totalDepensesJour > 0 && (
          <MetriqueLigne
            label="Dépenses"
            value={`-${totalDepensesJour.toLocaleString("fr-FR")} F`}
            className="text-destructive"
          />
        )}
      </Card>

      {/* Avertissement si pas de données */}
      {!canCloture && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
          Aucune commande enregistrée pour ce jour. Ajoutez des commandes (onglet Commandes) ou une synthèse (onglet Synthèse) avant de clôturer.
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Notes de clôture (optionnel)</Label>
        <Textarea
          placeholder="Observations sur la journée..."
          value={notesClôture}
          onChange={(e) => setNotesClôture(e.target.value)}
          className="text-sm resize-none"
          rows={3}
        />
      </div>

      {/* Bouton clôturer */}
      <Button
        className="w-full"
        onClick={cloturerJournee}
        disabled={!canCloture || isClôturing}>
        {isClôturing ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Clôture en cours…</>
        ) : (
          <><Lock className="w-4 h-4 mr-2" /> Clôturer la journée</>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        La clôture calcule les métriques et génère le rapport journalier automatiquement.
        Elle peut être recalculée si nécessaire.
      </p>
    </div>
  );
};

// ─── Composant principal ─────────────────────────────────────────────────────

/**
 * @param {Object} props
 * @param {Object} props.hook - Instance de useBackDay
 */
const OngletCloture = ({ hook }) => {
  const { statutJournee, cloturerJournee, isClôturing, loadingStatut } = hook;
  const closure = statutJournee?.closure;

  if (loadingStatut) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Clôture journalière</span>
      </div>

      {closure ? (
        <RapportCloture
          closure={closure}
          onRecalculer={cloturerJournee}
          isRecalculating={isClôturing}
        />
      ) : (
        <FormulaireCloture hook={hook} />
      )}
    </div>
  );
};

export default OngletCloture;
