import { useState, useEffect } from "react";
import { Plus, Trash2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import usePaiements from "@/hooks/usePaiements";
import { MODE_PAIEMENT_LABELS, formatMontant, formatDate, formatZone } from "@/utils/distributionToolkit";

// ─── Constante formulaire ─────────────────────────────────────────────────────

const FORM_INIT = {
  id_distributeur: "",
  date_paiement:  new Date().toISOString().slice(0, 10),
  montant:        "",
  mode_paiement:  "especes",
  reference:      "",
  notes:          "",
};

// ─── Carte solde ──────────────────────────────────────────────────────────────

const SoldeCard = ({ item, onPayer }) => {
  const { distributeur: d, ristourne_totale, montant_paye_total, solde } = item;
  const enDette = solde > 0;
  return (
    <div className={cn("rounded-xl border bg-card p-4 flex flex-col gap-3 transition-colors",
      enDette && "border-orange-200 dark:border-orange-900")}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{d.nom}</p>
          {d.zone && <p className="text-xs text-muted-foreground">{formatZone(d.zone)}</p>}
        </div>
        {enDette && (
          <Button size="sm" className="h-7 text-xs gap-1 shrink-0" onClick={() => onPayer(d.id)}>
            <Plus className="w-3 h-3" />Payer
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-muted-foreground">Total dû</p>
          <p className="font-semibold mt-0.5">{formatMontant(ristourne_totale)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-muted-foreground">Versé</p>
          <p className="font-semibold mt-0.5 text-green-600 dark:text-green-400">{formatMontant(montant_paye_total)}</p>
        </div>
        <div className={cn("rounded-lg p-2",
          enDette ? "bg-orange-50 dark:bg-orange-950/30" : "bg-green-50 dark:bg-green-950/30")}>
          <p className="text-muted-foreground">Solde</p>
          <p className={cn("font-semibold mt-0.5",
            enDette ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400")}>
            {formatMontant(solde)}
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Ligne historique ─────────────────────────────────────────────────────────

const LignePaiement = ({ paiement: p, onDelete }) => (
  <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{p.distributeur?.nom ?? "—"}</p>
      <p className="text-xs text-muted-foreground">
        {formatDate(p.date_paiement)} · {MODE_PAIEMENT_LABELS[p.mode_paiement] ?? p.mode_paiement}
        {p.reference && ` · ${p.reference}`}
      </p>
    </div>
    <p className="text-sm font-semibold text-green-600 dark:text-green-400 shrink-0">
      +{formatMontant(p.montant)}
    </p>
    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
      onClick={() => onDelete(p.id)}>
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  </div>
);

// ─── Onglet ───────────────────────────────────────────────────────────────────

const OngletPaiements = () => {
  const hook     = usePaiements();
  const soldes   = hook.soldesTous();
  const [form, setForm]           = useState(FORM_INIT);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (hook.dialog.open) {
      setForm({ ...FORM_INIT, id_distributeur: hook.dialog.data?.id_distributeur ?? "" });
    }
  }, [hook.dialog.open, hook.dialog.data]);

  const onChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.id_distributeur || !form.montant) return;
    setSubmitting(true);
    await hook.soumettre(form);
    setSubmitting(false);
  };

  const kpis = soldes.reduce(
    (acc, s) => ({ total_du: acc.total_du + s.ristourne_totale, total_verse: acc.total_verse + s.montant_paye_total, solde: acc.solde + s.solde }),
    { total_du: 0, total_verse: 0, solde: 0 }
  );

  return (
    <div className="flex flex-col gap-5">

      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total ristournes", value: kpis.total_du, cls: "" },
          { label: "Total versé",      value: kpis.total_verse, cls: "text-green-600 dark:text-green-400" },
          { label: "Solde restant",    value: kpis.solde,       cls: "text-orange-600 dark:text-orange-400" },
        ].map(k => (
          <div key={k.label} className="rounded-xl border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={cn("text-base font-bold mt-1 truncate", k.cls)}>{formatMontant(k.value)}</p>
          </div>
        ))}
      </div>

      {/* ── Actions ── */}
      <div className="flex justify-end">
        <Button size="sm" className="h-8 gap-1.5" onClick={() => hook.ouvrirPaiement()}>
          <Plus className="w-3.5 h-3.5" />Enregistrer un versement
        </Button>
      </div>

      {/* ── Soldes par distributeur ── */}
      {hook.loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : soldes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Aucun distributeur actif</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {soldes.map(s => (
            <SoldeCard key={s.distributeur.id} item={s} onPayer={hook.ouvrirPaiement} />
          ))}
        </div>
      )}

      {/* ── Historique ── */}
      {hook.paiements.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Historique des versements</h3>
          <div className="flex flex-col gap-1.5">
            {hook.paiements.map(p => (
              <LignePaiement key={p.id} paiement={p} onDelete={hook.ouvrirSuppression} />
            ))}
          </div>
        </div>
      )}

      {/* ── Dialog ── */}
      <Dialog open={hook.dialog.open} onOpenChange={o => !o && hook.setDialog({ open: false, data: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enregistrer un versement</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label>Distributeur *</Label>
              <Select value={form.id_distributeur} onValueChange={v => onChange("id_distributeur", v)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {hook.distributeurs.map(d => <SelectItem key={d.id} value={d.id}>{d.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="montant_p">Montant *</Label>
                <Input id="montant_p" type="number" min="0" placeholder="0"
                  value={form.montant} onChange={e => onChange("montant", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="date_p">Date</Label>
                <Input id="date_p" type="date" value={form.date_paiement}
                  onChange={e => onChange("date_paiement", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Mode de paiement</Label>
              <Select value={form.mode_paiement} onValueChange={v => onChange("mode_paiement", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MODE_PAIEMENT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ref_p">Référence</Label>
              <Input id="ref_p" value={form.reference} placeholder="N° transaction, reçu…"
                onChange={e => onChange("reference", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="notes_p">Notes</Label>
              <Textarea id="notes_p" value={form.notes} rows={2}
                onChange={e => onChange("notes", e.target.value)}
                placeholder="Informations complémentaires" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => hook.setDialog({ open: false, data: null })}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!form.id_distributeur || !form.montant || submitting}>
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm delete ── */}
      <AlertDialog open={hook.confirmDelete.open} onOpenChange={o => !o && hook.setConfirmDelete({ open: false, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
            <AlertDialogDescription>Le solde du distributeur sera recalculé.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={hook.supprimer}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OngletPaiements;
