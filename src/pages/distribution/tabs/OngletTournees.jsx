import { useState, useEffect, useMemo } from "react";
import { Plus, Truck, Edit2, Trash2, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import useTournees from "@/hooks/useTournees";
import {
  getProduitIcon, getProduitLabel,
  STATUT_PAIEMENT_LABELS, STATUT_PAIEMENT_COLORS,
  calculerTournee,
  formatMontant, formatDate,
} from "@/utils/distributionToolkit";

// ─── Constantes formulaire ────────────────────────────────────────────────────

const LIGNE_INIT = { _actif: false, quantite_recue: "", quantite_recuperee: "", prix_unitaire_applique: "" };

const buildLignes = (form, produits) =>
  produits
    .filter(p => form[p]?._actif && Number(form[p]?.quantite_recue) > 0)
    .map(p => ({
      type_produit:           p,
      quantite_recue:         Number(form[p].quantite_recue),
      quantite_recuperee:     Number(form[p].quantite_recuperee) || 0,
      prix_unitaire_applique: Number(form[p].prix_unitaire_applique) || 0,
    }));

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, colorClass = "" }) => (
  <div className="rounded-xl border bg-card p-3 flex flex-col gap-0.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={cn("text-sm font-bold truncate", colorClass)}>{value}</p>
  </div>
);

// ─── Aperçu ristourne ─────────────────────────────────────────────────────────

const AperçuRistourne = ({ preview }) => {
  if (!preview || preview.vente_totale === 0) return null;
  return (
    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between gap-2">
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Vendus : <span className="font-medium text-foreground">{preview.qte_vendue_totale}</span></span>
        <span>Vente : <span className="font-medium text-foreground">{formatMontant(preview.vente_totale)}</span></span>
      </div>
      <p className="text-xs font-semibold text-primary shrink-0">
        Ristourne : {formatMontant(preview.ristourne_due)}
      </p>
    </div>
  );
};

// ─── Formulaire tournée ───────────────────────────────────────────────────────

const FormTournee = ({ form, onChange, distributeurs, prix, preview }) => {
  const produits = Object.keys(prix);
  const onLigne = (produit, field, value) =>
    onChange(produit, { ...form[produit], [field]: value });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>Distributeur *</Label>
          <Select value={form.id_distributeur} onValueChange={v => onChange("id_distributeur", v)}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {distributeurs.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.nom}{d.zone ? ` — ${d.zone.nom}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="date_t">Date *</Label>
          <Input id="date_t" type="date" value={form.date_tournee}
            onChange={e => onChange("date_tournee", e.target.value)} />
        </div>
      </div>

      {produits.map(produit => {
        const actif = form[produit]?._actif ?? false;
        return (
          <div key={produit} className={cn(
            "rounded-lg border p-3 flex flex-col gap-3 transition-colors",
            actif ? "border-border" : "border-border/50 bg-muted/20"
          )}>
            <div className="flex items-center gap-2">
              <Switch
                checked={actif}
                onCheckedChange={v => {
                  const updated = { ...form[produit], _actif: v };
                  if (v && !updated.prix_unitaire_applique)
                    updated.prix_unitaire_applique = String(prix[produit]?.prix_unitaire ?? "");
                  onChange(produit, updated);
                }}
              />
              <span>{getProduitIcon(produit)}</span>
              <span className={cn("text-sm font-medium", !actif && "text-muted-foreground")}>
                {getProduitLabel(produit, prix)}
              </span>
              {prix[produit] && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatMontant(prix[produit].prix_unitaire)} / u.
                </span>
              )}
            </div>

            {actif && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "prix_unitaire_applique", label: "Prix unitaire", placeholder: String(prix[produit]?.prix_unitaire ?? 0) },
                  { key: "quantite_recue",         label: "Qté remise",    placeholder: "0" },
                  { key: "quantite_recuperee",     label: "Qté récupérée", placeholder: "0" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="grid gap-1">
                    <Label className="text-xs">{label}</Label>
                    <Input type="number" min="0" className="h-8 text-xs"
                      placeholder={placeholder}
                      value={form[produit][key]}
                      onChange={e => onLigne(produit, key, e.target.value)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <AperçuRistourne preview={preview} />

      <div className="grid gap-1.5">
        <Label htmlFor="feedback_t">Feedback</Label>
        <Textarea id="feedback_t" value={form.feedback} rows={2}
          onChange={e => onChange("feedback", e.target.value)}
          placeholder="Observations, remarques..." />
      </div>
    </div>
  );
};

// ─── Vue grille ───────────────────────────────────────────────────────────────

const _CARD_COLORS = [
  "bg-amber-50 dark:bg-amber-950/30",
  "bg-orange-50 dark:bg-orange-950/30",
  "bg-purple-50 dark:bg-purple-950/30",
  "bg-blue-50 dark:bg-blue-950/30",
  "bg-green-50 dark:bg-green-950/30",
  "bg-pink-50 dark:bg-pink-950/30",
];

const _hi = (str, len) => {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return h % len;
};

const getCardColor = (p) => _CARD_COLORS[_hi(p, _CARD_COLORS.length)];

const TourneeCard = ({ tournee: t, prix, onEdit, onDelete }) => {
  const lignesAffichees = (t.lignes ?? []).map(l => ({
    icon:  getProduitIcon(l.type_produit),
    label: getProduitLabel(l.type_produit, prix),
    l,
    color: getCardColor(l.type_produit),
  }));
  const { vente_totale } = calculerTournee(t.lignes ?? [], t.distributeur?.taux_ristourne ?? 0);

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{t.distributeur?.nom ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{formatDate(t.date_tournee)}</p>
        </div>
        <Badge className={cn("text-xs border-0", STATUT_PAIEMENT_COLORS[t.statut_paiement])}>
          {STATUT_PAIEMENT_LABELS[t.statut_paiement] ?? t.statut_paiement}
        </Badge>
      </div>

      <div className="flex gap-2">
        {lignesAffichees.map(({ icon, label, l, color }) => {
          const vendu = l.quantite_recue - l.quantite_recuperee;
          return (
            <div key={label} className={cn("flex-1 rounded-lg p-2 text-center", color)}>
              <p className="text-xs text-muted-foreground">{icon} {label}</p>
              <p className="text-sm font-semibold mt-0.5">
                {vendu} <span className="text-xs font-normal text-muted-foreground">/ {l.quantite_recue}</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs">
            <span className="text-muted-foreground">CA : </span>
            <span className="font-semibold">{formatMontant(vente_totale)}</span>
          </p>
          <p className="text-xs">
            <span className="text-muted-foreground">Ristourne : </span>
            <span className="font-semibold text-primary">{formatMontant(t.ristourne_due)}</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(t)}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(t.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Vue liste ────────────────────────────────────────────────────────────────

const TourneeRow = ({ tournee: t, prix, onEdit, onDelete }) => {
  const { vente_totale } = calculerTournee(t.lignes ?? [], t.distributeur?.taux_ristourne ?? 0);

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
      {/* Date */}
      <p className="text-xs text-muted-foreground w-24 shrink-0 hidden sm:block">
        {formatDate(t.date_tournee)}
      </p>

      {/* Distributeur + zone */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{t.distributeur?.nom ?? "—"}</p>
        <p className="text-xs text-muted-foreground sm:hidden">{formatDate(t.date_tournee)}</p>
        {t.distributeur?.zone && (
          <p className="text-xs text-muted-foreground truncate hidden sm:block">
            {t.distributeur.zone.nom}
          </p>
        )}
      </div>

      {/* Produits résumés */}
      <div className="hidden md:flex items-center gap-3 shrink-0">
        {(t.lignes ?? []).map(l => {
          const vendu = l.quantite_recue - l.quantite_recuperee;
          return (
            <span key={l.type_produit} className="text-xs text-muted-foreground whitespace-nowrap">
              {getProduitIcon(l.type_produit)}&nbsp;
              <span className="font-medium text-foreground">{vendu}</span>
              <span>/{l.quantite_recue}</span>
            </span>
          );
        })}
      </div>

      {/* CA */}
      <p className="text-sm font-semibold shrink-0">{formatMontant(vente_totale)}</p>

      {/* Statut */}
      <Badge className={cn("text-[10px] border-0 px-1.5 shrink-0", STATUT_PAIEMENT_COLORS[t.statut_paiement])}>
        {STATUT_PAIEMENT_LABELS[t.statut_paiement] ?? t.statut_paiement}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(t)}>
          <Edit2 className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(t.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

// ─── Onglet ───────────────────────────────────────────────────────────────────

const OngletTournees = () => {
  const hook = useTournees();
  const [form, setForm] = useState({
    id_distributeur: "",
    date_tournee: new Date().toISOString().slice(0, 10),
    feedback: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [vue, setVue] = useState(() => localStorage.getItem("tournees_vue") ?? "grille");

  useEffect(() => { localStorage.setItem("tournees_vue", vue); }, [vue]);

  const produits = useMemo(() => Object.keys(hook.prix), [hook.prix]);
  const prixDefault = (p) => String(hook.prix[p]?.prix_unitaire ?? "");

  // KPIs calculés sur les tournées filtrées
  const kpis = useMemo(() => {
    let ca = 0, verse = 0, restant = 0;
    for (const t of hook.tournees) {
      const { vente_totale } = calculerTournee(t.lignes ?? [], t.distributeur?.taux_ristourne ?? 0);
      ca      += vente_totale;
      verse   += Number(t.montant_paye  ?? 0);
      restant += Math.max(0, Number(t.ristourne_due ?? 0) - Number(t.montant_paye ?? 0));
    }
    return {
      ca:      Math.round(ca),
      verse:   Math.round(verse),
      restant: Math.round(restant),
    };
  }, [hook.tournees]);

  useEffect(() => {
    if (!hook.dialog.open || produits.length === 0) return;
    if (hook.dialog.mode === "edit" && hook.dialog.data) {
      const t = hook.dialog.data;
      const toLigne = (p) => {
        const l = t.lignes?.find(l => l.type_produit === p);
        return l
          ? { _actif: true, quantite_recue: String(l.quantite_recue), quantite_recuperee: String(l.quantite_recuperee), prix_unitaire_applique: String(l.prix_unitaire_applique) }
          : { ...LIGNE_INIT, prix_unitaire_applique: prixDefault(p) };
      };
      setForm({
        id_distributeur: t.id_distributeur ?? "",
        date_tournee:    t.date_tournee    ?? new Date().toISOString().slice(0, 10),
        ...Object.fromEntries(produits.map(p => [p, toLigne(p)])),
        feedback: t.feedback ?? "",
      });
    } else {
      setForm({
        id_distributeur: hook.dialog.data?.id_distributeur ?? "",
        date_tournee: new Date().toISOString().slice(0, 10),
        ...Object.fromEntries(produits.map(p => [p, { ...LIGNE_INIT, prix_unitaire_applique: prixDefault(p) }])),
        feedback: "",
      });
    }
  }, [hook.dialog.open, hook.dialog.mode, hook.dialog.data, hook.prix]);

  const onChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const lignes   = useMemo(() => buildLignes(form, produits), [form, produits]);
  const preview  = useMemo(() => hook.previewTournee(lignes, form.id_distributeur), [lignes, form.id_distributeur, hook.previewTournee]);

  const handleSubmit = async () => {
    if (!form.id_distributeur || !form.date_tournee || lignes.length === 0) return;
    setSubmitting(true);
    await hook.soumettre({ ...form, lignes });
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col gap-4">

      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="CA généré"
          value={formatMontant(kpis.ca)}
        />
        <KpiCard
          label="Versé"
          value={formatMontant(kpis.verse)}
          colorClass="text-green-600 dark:text-green-400"
        />
        <KpiCard
          label="Restant"
          value={formatMontant(kpis.restant)}
          colorClass={kpis.restant > 0
            ? "text-orange-600 dark:text-orange-400"
            : "text-green-600 dark:text-green-400"}
        />
      </div>

      {/* ── Filtres + toggle vue ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={hook.filtreIdDistributeur ?? "tous"}
          onValueChange={v => hook.setFiltreIdDistributeur(v === "tous" ? null : v)}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Tous" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les distributeurs</SelectItem>
            {hook.distributeurs.map(d => <SelectItem key={d.id} value={d.id}>{d.nom}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={hook.filtreStatut ?? "tous"}
          onValueChange={v => hook.setFiltreStatut(v === "tous" ? null : v)}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous</SelectItem>
            <SelectItem value="non_paye">Non payé</SelectItem>
            <SelectItem value="partiel">Partiel</SelectItem>
            <SelectItem value="paye">Payé</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Toggle grille / liste */}
        <div className="flex items-center rounded-lg border overflow-hidden h-8">
          <button
            onClick={() => setVue("grille")}
            className={cn(
              "px-2 h-full flex items-center transition-colors",
              vue === "grille"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}>
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setVue("liste")}
            className={cn(
              "px-2 h-full flex items-center transition-colors",
              vue === "liste"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}>
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        <Button size="sm" className="h-8 gap-1.5" onClick={() => hook.ouvrirCreation()}>
          <Plus className="w-3.5 h-3.5" />Nouvelle tournée
        </Button>
      </div>

      {/* ── Contenu ── */}
      {hook.loading ? (
        <div className={vue === "grille"
          ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
          : "flex flex-col gap-1.5"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn("rounded-xl bg-muted animate-pulse", vue === "grille" ? "h-44" : "h-12")} />
          ))}
        </div>
      ) : hook.tournees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <Truck className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Aucune tournée enregistrée</p>
          <Button size="sm" variant="outline" onClick={() => hook.ouvrirCreation()}>
            Enregistrer une tournée
          </Button>
        </div>
      ) : vue === "grille" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {hook.tournees.map(t => (
            <TourneeCard key={t.id} tournee={t} prix={hook.prix} onEdit={hook.ouvrirEdition} onDelete={hook.ouvrirSuppression} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {hook.tournees.map(t => (
            <TourneeRow key={t.id} tournee={t} prix={hook.prix} onEdit={hook.ouvrirEdition} onDelete={hook.ouvrirSuppression} />
          ))}
        </div>
      )}

      {/* ── Dialog création / édition ── */}
      <Dialog open={hook.dialog.open} onOpenChange={o => !o && hook.setDialog({ open: false, mode: "create", data: null })}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{hook.dialog.mode === "create" ? "Nouvelle tournée" : "Modifier la tournée"}</DialogTitle>
          </DialogHeader>
          <FormTournee form={form} onChange={onChange} distributeurs={hook.distributeurs} prix={hook.prix} preview={preview} />
          <DialogFooter>
            <Button variant="outline" onClick={() => hook.setDialog({ open: false, mode: "create", data: null })}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!form.id_distributeur || lignes.length === 0 || submitting}>
              {submitting ? "Enregistrement…" : hook.dialog.mode === "create" ? "Enregistrer" : "Mettre à jour"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm delete ── */}
      <AlertDialog open={hook.confirmDelete.open} onOpenChange={o => !o && hook.setConfirmDelete({ open: false, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette tournée ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
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

export default OngletTournees;
