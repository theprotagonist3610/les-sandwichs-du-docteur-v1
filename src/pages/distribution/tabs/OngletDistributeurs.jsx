import { useState, useEffect } from "react";
import { Plus, MapPin, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import useDistributeurs from "@/hooks/useDistributeurs";
import {
  JOURS_SEMAINE, JOURS_LABELS,
  TYPE_DISTRIBUTEUR_LABELS, PERIODICITE_PAIEMENT_LABELS,
  formatTaux, formatZone, formatJours,
} from "@/utils/distributionToolkit";

// ─── Constantes formulaire ────────────────────────────────────────────────────

const FORM_INIT = {
  nom: "", contact: "", adresse: "", id_zone: "",
  type_distributeur: "ambulant", statut_eligibilite: true,
  periodicite_distribution: [], taux_ristourne: "",
  periodicite_paiement: "journalier",
  date_inscription: new Date().toISOString().slice(0, 10),
  notes: "",
};

// ─── Formulaire ───────────────────────────────────────────────────────────────

const FormDistributeur = ({ form, onChange, zones }) => {
  const toggleJour = (j) => {
    const arr = form.periodicite_distribution;
    onChange("periodicite_distribution", arr.includes(j) ? arr.filter(v => v !== j) : [...arr, j]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="nom">Nom *</Label>
        <Input id="nom" value={form.nom} onChange={e => onChange("nom", e.target.value)} placeholder="Nom du distributeur" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="contact">Contact</Label>
          <Input id="contact" value={form.contact} onChange={e => onChange("contact", e.target.value)} placeholder="Téléphone" />
        </div>
        <div className="grid gap-1.5">
          <Label>Zone</Label>
          <Select value={form.id_zone || "_none"} onValueChange={v => onChange("id_zone", v === "_none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Aucune</SelectItem>
              {zones.map(z => <SelectItem key={z.id} value={z.id}>{z.nom}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="adresse">Adresse</Label>
        <Input id="adresse" value={form.adresse} onChange={e => onChange("adresse", e.target.value)} placeholder="Adresse physique" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>Type</Label>
          <Select value={form.type_distributeur} onValueChange={v => onChange("type_distributeur", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_DISTRIBUTEUR_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Périodicité paiement</Label>
          <Select value={form.periodicite_paiement} onValueChange={v => onChange("periodicite_paiement", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PERIODICITE_PAIEMENT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label>Jours de distribution</Label>
        <div className="flex flex-wrap gap-2">
          {JOURS_SEMAINE.map(j => (
            <button
              key={j} type="button" onClick={() => toggleJour(j)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                form.periodicite_distribution.includes(j)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}>
              {JOURS_LABELS[j]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="taux">Taux ristourne (%)</Label>
          <Input id="taux" type="number" min="0" max="100" step="0.1"
            value={form.taux_ristourne}
            onChange={e => onChange("taux_ristourne", e.target.value)}
            placeholder="ex : 10" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="date">Date d'inscription</Label>
          <Input id="date" type="date" value={form.date_inscription}
            onChange={e => onChange("date_inscription", e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={form.statut_eligibilite} onCheckedChange={v => onChange("statut_eligibilite", v)} />
        <Label className="cursor-pointer">{form.statut_eligibilite ? "Actif" : "Inactif"}</Label>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" value={form.notes} rows={2}
          onChange={e => onChange("notes", e.target.value)}
          placeholder="Informations complémentaires" />
      </div>
    </div>
  );
};

// ─── Carte distributeur ───────────────────────────────────────────────────────

const DistributeurCard = ({ distributeur: d, onEdit, onToggle, onDelete }) => (
  <div className={cn("rounded-xl border bg-card p-4 flex flex-col gap-3 transition-opacity", !d.statut_eligibilite && "opacity-60")}>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{d.nom}</p>
        {d.zone && <p className="text-xs text-muted-foreground mt-0.5">{formatZone(d.zone)}</p>}
        {d.contact && <p className="text-xs text-muted-foreground">{d.contact}</p>}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <Badge variant="outline" className="text-xs">{TYPE_DISTRIBUTEUR_LABELS[d.type_distributeur]}</Badge>
        <Badge className={cn("text-xs border-0", d.statut_eligibilite
          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
          : "bg-muted text-muted-foreground")}>
          {d.statut_eligibilite ? "Actif" : "Inactif"}
        </Badge>
      </div>
    </div>

    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
      <span className="font-medium text-foreground">{formatTaux(d.taux_ristourne)} ristourne</span>
      <span>{PERIODICITE_PAIEMENT_LABELS[d.periodicite_paiement]}</span>
      {d.periodicite_distribution?.length > 0 && <span>{formatJours(d.periodicite_distribution)}</span>}
    </div>

    <div className="flex items-center justify-end gap-1 pt-1 border-t border-border">
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onToggle(d)}>
        {d.statut_eligibilite ? "Désactiver" : "Activer"}
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(d)}>
        <Edit2 className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(d.id)}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  </div>
);

// ─── Onglet ───────────────────────────────────────────────────────────────────

const OngletDistributeurs = () => {
  const hook = useDistributeurs();
  const [form, setForm] = useState(FORM_INIT);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hook.dialog.open) return;
    if (hook.dialog.mode === "edit" && hook.dialog.data) {
      const d = hook.dialog.data;
      setForm({
        nom:                      d.nom                      ?? "",
        contact:                  d.contact                  ?? "",
        adresse:                  d.adresse                  ?? "",
        id_zone:                  d.id_zone                  ?? "",
        type_distributeur:        d.type_distributeur        ?? "ambulant",
        statut_eligibilite:       d.statut_eligibilite       ?? true,
        periodicite_distribution: d.periodicite_distribution ?? [],
        taux_ristourne:           d.taux_ristourne != null ? String(Math.round(d.taux_ristourne * 100)) : "",
        periodicite_paiement:     d.periodicite_paiement     ?? "journalier",
        date_inscription:         d.date_inscription         ?? new Date().toISOString().slice(0, 10),
        notes:                    d.notes                    ?? "",
      });
    } else {
      setForm(FORM_INIT);
    }
  }, [hook.dialog.open, hook.dialog.mode, hook.dialog.data]);

  const onChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.nom.trim()) return;
    setSubmitting(true);
    await hook.soumettre({
      ...form,
      taux_ristourne: Number(form.taux_ristourne || 0) / 100,
      id_zone:        form.id_zone || null,
    });
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col gap-4">

      {/* ── Filtres ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={hook.filtreStatut === null ? "tous" : String(hook.filtreStatut)}
          onValueChange={v => hook.setFiltreStatut(v === "tous" ? null : v === "true")}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous</SelectItem>
            <SelectItem value="true">Actifs</SelectItem>
            <SelectItem value="false">Inactifs</SelectItem>
          </SelectContent>
        </Select>

        <Select value={hook.filtreType ?? "tous"} onValueChange={v => hook.setFiltreType(v === "tous" ? null : v)}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous types</SelectItem>
            {Object.entries(TYPE_DISTRIBUTEUR_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex-1" />
        <Button size="sm" className="h-8 gap-1.5" onClick={hook.ouvrirCreation}>
          <Plus className="w-3.5 h-3.5" />Nouveau
        </Button>
      </div>

      {/* ── Liste ── */}
      {hook.loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : hook.distributeurs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <MapPin className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Aucun distributeur trouvé</p>
          <Button size="sm" variant="outline" onClick={hook.ouvrirCreation}>Ajouter le premier</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {hook.distributeurs.map(d => (
            <DistributeurCard key={d.id} distributeur={d}
              onEdit={hook.ouvrirEdition} onToggle={hook.toggleStatut} onDelete={hook.ouvrirSuppression} />
          ))}
        </div>
      )}

      {/* ── Dialog ── */}
      <Dialog open={hook.dialog.open} onOpenChange={o => !o && hook.setDialog({ open: false, mode: "create", data: null })}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{hook.dialog.mode === "create" ? "Nouveau distributeur" : "Modifier"}</DialogTitle>
          </DialogHeader>
          <FormDistributeur form={form} onChange={onChange} zones={hook.zones} />
          <DialogFooter>
            <Button variant="outline" onClick={() => hook.setDialog({ open: false, mode: "create", data: null })}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!form.nom.trim() || submitting}>
              {submitting ? "Enregistrement…" : hook.dialog.mode === "create" ? "Créer" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm delete ── */}
      <AlertDialog open={hook.confirmDelete.open} onOpenChange={o => !o && hook.setConfirmDelete({ open: false, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce distributeur ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. Les tournées associées sont conservées.</AlertDialogDescription>
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

export default OngletDistributeurs;
