/**
 * MobileStock.jsx
 * Page de gestion du stock — version mobile
 */

import { useState, useEffect } from "react";
import useBreakpoint from "@/hooks/useBreakpoint";
import useStock, { ONGLETS_STOCK } from "@/hooks/useStock";
import {
  STATUTS_LOT,
  STATUTS_LOT_LABELS,
  CATEGORIES_STOCK_LABELS,
  TYPES_MOUVEMENT_LABELS,
} from "@/utils/stockToolkit";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  LayoutGrid,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  ChevronRight,
  Filter,
  RefreshCw,
  TrendingDown,
} from "lucide-react";

// ── Badges ──────────────────────────────────────────────────────────────────

const STATUT_CLASSES = {
  [STATUTS_LOT.DISPONIBLE]:          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  [STATUTS_LOT.PARTIELLEMENT_VENDU]: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  [STATUTS_LOT.EPUISE]:              "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
  [STATUTS_LOT.PERIME]:              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const ALERTE_CLASSES = {
  critique:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  urgent:    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  attention: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const StatutBadge = ({ statut }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_CLASSES[statut] || ""}`}>
    {STATUTS_LOT_LABELS[statut] || statut}
  </span>
);

const AlerteBadge = ({ niveau, jours }) => {
  if (!niveau || niveau === "ok") return null;
  const label = jours <= 0 ? "Expiré" : jours === 1 ? "Expire demain" : `${jours}j`;
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${ALERTE_CLASSES[niveau] || ""}`}>
      <AlertTriangle className="w-3 h-3" />
      {label}
    </span>
  );
};

// ── Carte Lot ───────────────────────────────────────────────────────────────

const CarteLot = ({ lot, onClick }) => (
  <button
    onClick={() => onClick(lot)}
    className="w-full flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:bg-accent/50 transition-colors text-left">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm font-medium text-foreground truncate flex-1">{lot.nom}</p>
        <StatutBadge statut={lot.statut} />
        <AlerteBadge niveau={lot.alerte_peremption} jours={lot.jours_avant_peremption} />
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">
        {lot.numero_lot && <span className="font-mono">{lot.numero_lot} · </span>}
        {CATEGORIES_STOCK_LABELS[lot.categorie] || lot.categorie}
        {" · "}{lot.quantite_disponible} / {lot.quantite_initiale} disponible
        {lot.cout_unitaire > 0 && ` · ${lot.cout_unitaire.toLocaleString("fr-FR")} F/u`}
      </p>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
  </button>
);

// ── Formulaire perte ────────────────────────────────────────────────────────

const FormulairePerteInline = ({ lot, onSubmit, loading, onAnnuler }) => {
  const [quantite, setQuantite] = useState("");
  const [motif, setMotif] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(parseFloat(quantite), motif);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="text-xs text-muted-foreground">
        Disponible : <span className="font-semibold text-foreground">{lot.quantite_disponible}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm">Quantité perdue *</Label>
        <Input
          type="number"
          placeholder="0"
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
          min="0.01"
          max={lot.quantite_disponible}
          step="0.01"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm">Motif *</Label>
        <Input
          placeholder="Péremption, accident, vol..."
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          required
        />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onAnnuler}>
          Annuler
        </Button>
        <Button
          type="submit"
          size="sm"
          variant="destructive"
          disabled={loading || !quantite || !motif}>
          {loading ? "Enregistrement..." : "Confirmer la perte"}
        </Button>
      </div>
    </form>
  );
};

// ── Formulaire lot manuel ───────────────────────────────────────────────────

const FormulaireLotManuel = ({ onSubmit, submitting, onAnnuler }) => {
  const [form, setForm] = useState({
    nom: "", categorie: "", quantite_initiale: "", cout_unitaire: "",
    date_production: new Date().toISOString().split("T")[0],
    duree_conservation_jours: "", notes: "",
  });
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm">Nom de l'item *</Label>
        <Input
          placeholder="ex. Sauce mayo"
          value={form.nom}
          onChange={(e) => set("nom", e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm">Catégorie *</Label>
          <Select value={form.categorie} onValueChange={(v) => set("categorie", v)}>
            <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORIES_STOCK_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm">Quantité initiale *</Label>
          <Input
            type="number" min="0.01" step="0.01"
            value={form.quantite_initiale}
            onChange={(e) => set("quantite_initiale", e.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm">Coût unitaire (F)</Label>
          <Input
            type="number" min="0" step="0.01"
            value={form.cout_unitaire}
            onChange={(e) => set("cout_unitaire", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm">Date de production *</Label>
          <Input
            type="date"
            value={form.date_production}
            onChange={(e) => set("date_production", e.target.value)}
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm">Durée de conservation (jours)</Label>
        <Input
          type="number" min="1"
          placeholder="ex. 3"
          value={form.duree_conservation_jours}
          onChange={(e) => set("duree_conservation_jours", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm">Notes</Label>
        <Textarea
          placeholder="Remarques..."
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>
      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button type="button" variant="ghost" onClick={onAnnuler}>Annuler</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Création..." : "Créer le lot"}
        </Button>
      </div>
    </form>
  );
};

// ── Onglet Lots ─────────────────────────────────────────────────────────────

const OngletLots = ({ hook }) => {
  const {
    lots, loadingLots, lotSelectionne, selectionnerLot,
    mouvements, loadingMouvements,
    filtreCategorie, setFiltreCategorie,
    filtreStatut, setFiltreStatut,
    searchTerm, setSearchTerm,
    includeEpuise, setIncludeEpuise,
    includePerime, setIncludePerime,
    canManage, canDelete,
    dialogPerteOuvert, setDialogPerteOuvert,
    confirmSupprimer, setConfirmSupprimer,
    enregistrerPerteAction, supprimerLotAction,
    perteLoading,
  } = hook;

  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [perteMode, setPerteMode] = useState(false);

  const hasFiltre = filtreCategorie || filtreStatut || includeEpuise || includePerime;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Barre recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un lot..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFiltresOuverts(!filtresOuverts)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            filtresOuverts || hasFiltre
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-card border-border text-muted-foreground"
          }`}>
          <Filter className="w-3.5 h-3.5" />
          Filtres
        </button>
      </div>

      {filtresOuverts && (
        <div className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border border-border">
          <Select
            value={filtreCategorie || "_all"}
            onValueChange={(v) => setFiltreCategorie(v === "_all" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Toutes catégories</SelectItem>
              {Object.entries(CATEGORIES_STOCK_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filtreStatut || "_all"}
            onValueChange={(v) => setFiltreStatut(v === "_all" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous les statuts</SelectItem>
              {Object.entries(STATUTS_LOT_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <button
              onClick={() => setIncludeEpuise(!includeEpuise)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                includeEpuise ? "bg-slate-200 dark:bg-slate-700 border-slate-400 text-foreground" : "border-border text-muted-foreground"
              }`}>
              Épuisés
            </button>
            <button
              onClick={() => setIncludePerime(!includePerime)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                includePerime ? "bg-red-100 dark:bg-red-900/30 border-red-400 text-red-700" : "border-border text-muted-foreground"
              }`}>
              Périmés
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {loadingLots ? (
        <p className="text-sm text-muted-foreground text-center py-6 animate-pulse">Chargement...</p>
      ) : lots.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Package className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aucun lot trouvé</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {lots.map((l) => (
            <CarteLot key={l.id} lot={l} onClick={selectionnerLot} />
          ))}
        </div>
      )}

      {/* FAB */}
      {canManage && (
        <button
          onClick={() => hook.setDialogCreerLotOuvert(true)}
          className="fixed bottom-6 right-4 z-30 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">Nouveau lot</span>
        </button>
      )}

      {/* Fiche Lot — Sheet */}
      <Sheet open={!!lotSelectionne} onOpenChange={(o) => { if (!o) { selectionnerLot(null); setPerteMode(false); }}}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-xl">
          {lotSelectionne && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle>{lotSelectionne.nom}</SheetTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatutBadge statut={lotSelectionne.statut} />
                  <AlerteBadge
                    niveau={lotSelectionne.alerte_peremption}
                    jours={lotSelectionne.jours_avant_peremption}
                  />
                  {lotSelectionne.numero_lot && (
                    <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {lotSelectionne.numero_lot}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {CATEGORIES_STOCK_LABELS[lotSelectionne.categorie]}
                  </span>
                </div>
              </SheetHeader>

              {/* Infos quantités */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: "Disponible", value: lotSelectionne.quantite_disponible },
                  { label: "Initial", value: lotSelectionne.quantite_initiale },
                  { label: "Vendu", value: lotSelectionne.quantite_vendue },
                  { label: "Perdu", value: lotSelectionne.quantite_perdue },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <span className="font-semibold text-sm">{s.value ?? "—"}</span>
                  </div>
                ))}
              </div>

              {/* Infos coûts */}
              {lotSelectionne.cout_unitaire > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { label: "Coût unitaire", value: `${lotSelectionne.cout_unitaire.toLocaleString("fr-FR")} F` },
                    { label: "Coût total", value: `${lotSelectionne.cout_total.toLocaleString("fr-FR")} F` },
                    lotSelectionne.cout_vendu > 0 && { label: "Coût vendu", value: `${lotSelectionne.cout_vendu.toLocaleString("fr-FR")} F` },
                    lotSelectionne.cout_perdu > 0 && { label: "Coût perdu", value: `${lotSelectionne.cout_perdu.toLocaleString("fr-FR")} F` },
                  ].filter(Boolean).map((s) => (
                    <div key={s.label} className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                      <span className="font-semibold text-sm">{s.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Dates */}
              <div className="flex flex-col gap-1 text-xs text-muted-foreground mb-4 px-1">
                <span>Production : {lotSelectionne.date_production}</span>
                {lotSelectionne.date_peremption && (
                  <span>Péremption : {lotSelectionne.date_peremption}</span>
                )}
                {lotSelectionne.schema?.nom && (
                  <span>Schéma : {lotSelectionne.schema.nom}</span>
                )}
                {lotSelectionne.production?.nom && (
                  <span>Production source : {lotSelectionne.production.nom}</span>
                )}
              </div>

              {/* Notes */}
              {lotSelectionne.notes && (
                <p className="text-xs text-muted-foreground italic px-1 mb-4">
                  {lotSelectionne.notes}
                </p>
              )}

              {/* Enregistrer une perte */}
              {canManage && lotSelectionne.quantite_disponible > 0 &&
                lotSelectionne.statut !== STATUTS_LOT.PERIME && (
                  <div className="mb-4 border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setPerteMode(!perteMode)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Enregistrer une perte</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{perteMode ? "▲" : "▼"}</span>
                    </button>
                    {perteMode && (
                      <div className="p-3 border-t border-border">
                        <FormulairePerteInline
                          lot={lotSelectionne}
                          onSubmit={(qte, motif) => enregistrerPerteAction(lotSelectionne.id, qte, motif)}
                          loading={perteLoading}
                          onAnnuler={() => setPerteMode(false)}
                        />
                      </div>
                    )}
                  </div>
                )}

              {/* Mouvements */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2">Mouvements</h4>
                {loadingMouvements ? (
                  <p className="text-xs text-muted-foreground animate-pulse">Chargement...</p>
                ) : mouvements.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Aucun mouvement</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {mouvements.map((m) => (
                      <div key={m.id} className="flex items-center justify-between px-2.5 py-2 bg-muted/20 rounded-lg text-xs">
                        <div>
                          <span className="font-medium">{TYPES_MOUVEMENT_LABELS[m.type]}</span>
                          {m.motif && <span className="text-muted-foreground"> · {m.motif}</span>}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-medium">{m.quantite}</div>
                          <div className="text-muted-foreground">{m.date_mouvement}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              {canDelete && (
                <div className="border-t border-border pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 w-full"
                    onClick={() => setConfirmSupprimer(lotSelectionne)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer ce lot
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

// ── Onglet Vue d'ensemble ───────────────────────────────────────────────────

const OngletVue = ({ hook }) => {
  const { dashboard, stockActuel, alertes, loadingVue, canManage, marquerPerimesAction } = hook;

  if (loadingVue) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground animate-pulse">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Dashboard */}
      {dashboard && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Lots actifs", value: dashboard.nb_lots_actifs },
            { label: "Valeur stock", value: `${(dashboard.valeur_stock_total || 0).toLocaleString("fr-FR")} F` },
            { label: "Valeur vendue", value: `${(dashboard.valeur_vendue || 0).toLocaleString("fr-FR")} F` },
            { label: "Valeur perdue", value: `${(dashboard.valeur_perdue || 0).toLocaleString("fr-FR")} F` },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5 p-3 bg-card border border-border rounded-xl">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <span className="text-base font-bold text-foreground">{s.value ?? "—"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Alertes péremption */}
      {alertes && (alertes.nb_perimes > 0 || alertes.nb_proches > 0) && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Alertes ({alertes.nb_perimes + alertes.nb_proches})
            </h4>
            {canManage && alertes.nb_perimes > 0 && (
              <button
                onClick={marquerPerimesAction}
                className="text-xs text-primary hover:underline flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Marquer périmés
              </button>
            )}
          </div>
          {alertes.critique?.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs">
              <span className="font-medium">{l.nom}</span>
              <span className="text-red-600 dark:text-red-400">Expire demain</span>
            </div>
          ))}
          {alertes.urgent?.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-xs">
              <span className="font-medium">{l.nom}</span>
              <span className="text-orange-600 dark:text-orange-400">{l.jours}j restants</span>
            </div>
          ))}
          {alertes.attention?.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs">
              <span className="font-medium">{l.nom}</span>
              <span className="text-yellow-700 dark:text-yellow-400">{l.jours}j restants</span>
            </div>
          ))}
        </div>
      )}

      {/* Stock actuel agrégé */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Stock disponible</h4>
        {stockActuel.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Aucun item en stock</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {stockActuel.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-card border border-border rounded-lg text-sm">
                <div>
                  <p className="font-medium">{item.nom}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORIES_STOCK_LABELS[item.categorie]}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{item.quantite_disponible_totale}</p>
                  <p className="text-xs text-muted-foreground">{item.nb_lots} lot(s)</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── MobileStock ─────────────────────────────────────────────────────────────

const MobileStock = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(isMobile), [isMobile]);

  const hook = useStock();
  const {
    ongletActif, setOngletActif,
    dialogCreerLotOuvert, setDialogCreerLotOuvert,
    creerLotManuelAction, submitting,
    confirmSupprimer, setConfirmSupprimer,
    supprimerLotAction,
    selectionnerLot,
  } = hook;

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ display: visible ? "flex" : "none" }}>
      {/* Header */}
      <div className="bg-background border-b px-4 py-3 shrink-0">
        <h1 className="text-lg font-semibold">Stock</h1>
        <p className="text-xs text-muted-foreground">Lots et inventaire</p>
      </div>

      {/* Tabs */}
      <Tabs value={ongletActif} onValueChange={setOngletActif} className="flex flex-col flex-1 min-h-0">
        <TabsList className="grid grid-cols-2 rounded-none border-b h-10 shrink-0 bg-background">
          <TabsTrigger
            value={ONGLETS_STOCK.LOTS}
            className="flex items-center gap-1.5 text-xs font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <Package className="w-3.5 h-3.5" />
            Lots
          </TabsTrigger>
          <TabsTrigger
            value={ONGLETS_STOCK.VUE}
            className="flex items-center gap-1.5 text-xs font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <LayoutGrid className="w-3.5 h-3.5" />
            Vue d'ensemble
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value={ONGLETS_STOCK.LOTS} className="mt-0">
            <OngletLots hook={hook} />
          </TabsContent>
          <TabsContent value={ONGLETS_STOCK.VUE} className="mt-0">
            <OngletVue hook={hook} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Dialog Créer lot */}
      <Dialog open={dialogCreerLotOuvert} onOpenChange={setDialogCreerLotOuvert}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau lot manuel</DialogTitle>
          </DialogHeader>
          <FormulaireLotManuel
            onSubmit={creerLotManuelAction}
            submitting={submitting}
            onAnnuler={() => setDialogCreerLotOuvert(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Confirm Supprimer lot */}
      <AlertDialog
        open={!!confirmSupprimer}
        onOpenChange={(o) => !o && setConfirmSupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce lot ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le lot «&nbsp;{confirmSupprimer?.nom}&nbsp;» et tous ses mouvements seront
              supprimés définitivement. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                supprimerLotAction(confirmSupprimer?.id);
                selectionnerLot(null);
              }}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MobileStock;
