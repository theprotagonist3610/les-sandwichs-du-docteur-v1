import { useState, useEffect } from "react";
import { Plus, MapPin, Edit2, Trash2, X } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Badge }    from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import useZones      from "@/hooks/useZones";
import ZoneMapPicker from "@/components/distribution/ZoneMapPicker";
import { formatZone } from "@/utils/distributionToolkit";

// ─── État initial formulaire ──────────────────────────────────────────────────

const FORM_INIT = {
  nom: "", description: "",
  departement: "", arrondissement: "", commune: "",
  quartiers: [],
  centre: null,
  rayon: "",
};

// ─── Formulaire ───────────────────────────────────────────────────────────────

const FormZone = ({ form, onChange }) => {
  const [mapOpen,        setMapOpen]        = useState(false);
  const [quartierInput,  setQuartierInput]  = useState("");

  const addQuartier = () => {
    const q = quartierInput.trim();
    if (q && !form.quartiers.includes(q))
      onChange("quartiers", [...form.quartiers, q]);
    setQuartierInput("");
  };

  return (
    <div className="flex flex-col gap-4">

      <div className="grid gap-1.5">
        <Label htmlFor="z-nom">Nom *</Label>
        <Input id="z-nom" value={form.nom}
          onChange={(e) => onChange("nom", e.target.value)}
          placeholder="Ex : Zone Akwa Nord" />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="z-desc">Description</Label>
        <Textarea id="z-desc" rows={2} value={form.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Description de la zone de distribution" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="z-dept">Département</Label>
          <Input id="z-dept" value={form.departement}
            onChange={(e) => onChange("departement", e.target.value)}
            placeholder="Wouri" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="z-arrond">Arrondissement</Label>
          <Input id="z-arrond" value={form.arrondissement}
            onChange={(e) => onChange("arrondissement", e.target.value)}
            placeholder="Douala 1er" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="z-commune">Commune</Label>
          <Input id="z-commune" value={form.commune}
            onChange={(e) => onChange("commune", e.target.value)}
            placeholder="Douala" />
        </div>
      </div>

      {/* Quartiers — chip input */}
      <div className="grid gap-1.5">
        <Label>Quartiers</Label>
        <div className="flex gap-2">
          <Input
            value={quartierInput}
            onChange={(e) => setQuartierInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addQuartier(); } }}
            placeholder="Nom du quartier + Entrée" />
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={addQuartier}>
            Ajouter
          </Button>
        </div>
        {form.quartiers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {form.quartiers.map((q) => (
              <Badge key={q} variant="secondary" className="text-xs gap-1 pr-1.5">
                {q}
                <button
                  type="button"
                  onClick={() => onChange("quartiers", form.quartiers.filter((x) => x !== q))}
                  className="hover:text-destructive transition-colors ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Centre géographique */}
      <div className="grid gap-2">
        <Label>Délimitation géographique</Label>
        <div className="flex items-center gap-2 flex-wrap">
          <Button type="button" variant="outline" size="sm" className="gap-1.5"
            onClick={() => setMapOpen(true)}>
            <MapPin className="w-3.5 h-3.5" />
            {form.centre ? "Modifier le centre" : "Choisir sur la carte"}
          </Button>
          {form.centre && (
            <span className="text-xs text-muted-foreground font-mono">
              {form.centre.lat.toFixed(5)}, {form.centre.lng.toFixed(5)}
            </span>
          )}
        </div>
        {form.centre && (
          <div className="flex items-center gap-2">
            <Label htmlFor="z-rayon" className="shrink-0 text-xs text-muted-foreground w-20">
              Rayon (km)
            </Label>
            <Input
              id="z-rayon" type="number" min="0" step="0.1"
              className="w-28 h-8 text-xs"
              value={form.rayon}
              onChange={(e) => onChange("rayon", e.target.value)}
              placeholder="ex : 2.5" />
          </div>
        )}
      </div>

      <ZoneMapPicker
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        onConfirm={(centre) => onChange("centre", centre)}
        initialCentre={form.centre}
        rayon={Number(form.rayon) || 0}
      />
    </div>
  );
};

// ─── Carte zone ───────────────────────────────────────────────────────────────

const ZoneCard = ({ zone: z, onEdit, onDelete }) => {
  const subtitle = formatZone(z);
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{z.nom}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(z)}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(z.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {z.quartiers?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {z.quartiers.map((q) => (
            <Badge key={q} variant="secondary" className="text-xs">{q}</Badge>
          ))}
        </div>
      )}

      {z.centre && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono">{z.centre.lat.toFixed(4)}, {z.centre.lng.toFixed(4)}</span>
          {z.rayon && <span>· {z.rayon} km</span>}
        </div>
      )}
    </div>
  );
};

// ─── Onglet ───────────────────────────────────────────────────────────────────

const OngletZones = () => {
  const hook       = useZones();
  const [form, setForm]         = useState(FORM_INIT);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hook.dialog.open) return;
    if (hook.dialog.mode === "edit" && hook.dialog.data) {
      const z = hook.dialog.data;
      setForm({
        nom:            z.nom            ?? "",
        description:    z.description    ?? "",
        departement:    z.departement    ?? "",
        arrondissement: z.arrondissement ?? "",
        commune:        z.commune        ?? "",
        quartiers:      z.quartiers      ?? [],
        centre:         z.centre         ?? null,
        rayon:          z.rayon != null  ? String(z.rayon) : "",
      });
    } else {
      setForm(FORM_INIT);
    }
  }, [hook.dialog.open, hook.dialog.mode, hook.dialog.data]);

  const onChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.nom.trim()) return;
    setSubmitting(true);
    await hook.soumettre({
      ...form,
      rayon:  form.rayon !== "" ? Number(form.rayon) : null,
      centre: form.centre ?? null,
    });
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col gap-4">

      {/* ── Barre supérieure ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {hook.zones.length} zone{hook.zones.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" className="h-8 gap-1.5" onClick={hook.ouvrirCreation}>
          <Plus className="w-3.5 h-3.5" /> Nouvelle zone
        </Button>
      </div>

      {/* ── Liste ── */}
      {hook.loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : hook.zones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <MapPin className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Aucune zone définie</p>
          <Button size="sm" variant="outline" onClick={hook.ouvrirCreation}>
            Créer la première
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {hook.zones.map((z) => (
            <ZoneCard key={z.id} zone={z}
              onEdit={hook.ouvrirEdition}
              onDelete={hook.ouvrirSuppression} />
          ))}
        </div>
      )}

      {/* ── Dialog création / édition ── */}
      <Dialog open={hook.dialog.open}
        onOpenChange={(o) => !o && hook.setDialog({ open: false, mode: "create", data: null })}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {hook.dialog.mode === "create" ? "Nouvelle zone" : "Modifier la zone"}
            </DialogTitle>
          </DialogHeader>
          <FormZone form={form} onChange={onChange} />
          <DialogFooter>
            <Button variant="outline"
              onClick={() => hook.setDialog({ open: false, mode: "create", data: null })}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={!form.nom.trim() || submitting}>
              {submitting ? "Enregistrement…" : hook.dialog.mode === "create" ? "Créer" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation suppression ── */}
      <AlertDialog open={hook.confirmDelete.open}
        onOpenChange={(o) => !o && hook.setConfirmDelete({ open: false, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette zone ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les distributeurs rattachés seront détachés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
              onClick={hook.supprimer}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OngletZones;
