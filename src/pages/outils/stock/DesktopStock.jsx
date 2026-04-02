/**
 * DesktopStock.jsx
 * Page de gestion du stock — version desktop
 * Layout : liste gauche | panneau détail droite
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
  X,
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

// ── Panneau Lot (droite) ─────────────────────────────────────────────────────

const PanneauLot = ({
  lot,
  mouvements,
  loadingMouvements,
  onClose,
  onSupprimer,
  onEnregistrerPerte,
  perteLoading,
  canManage,
  canDelete,
}) => {
  const [perteMode, setPerteMode] = useState(false);
  const [quantite, setQuantite]   = useState("");
  const [motif, setMotif]         = useState("");

  const handlePerte = (e) => {
    e.preventDefault();
    onEnregistrerPerte(parseFloat(quantite), motif).then((r) => {
      if (r?.success) { setQuantite(""); setMotif(""); setPerteMode(false); }
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">{lot.nom}</h3>
            {lot.numero_lot && (
              <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {lot.numero_lot}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatutBadge statut={lot.statut} />
            <AlerteBadge niveau={lot.alerte_peremption} jours={lot.jours_avant_peremption} />
            <span className="text-xs text-muted-foreground">
              {CATEGORIES_STOCK_LABELS[lot.categorie]}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Corps scrollable */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Quantités */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Disponible", value: lot.quantite_disponible },
            { label: "Initial",    value: lot.quantite_initiale },
            { label: "Vendu",      value: lot.quantite_vendue },
            { label: "Perdu",      value: lot.quantite_perdue },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <span className="text-sm font-semibold">{s.value ?? "—"}</span>
            </div>
          ))}
        </div>

        {/* Coûts */}
        {lot.cout_unitaire > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Coût unitaire", value: `${lot.cout_unitaire.toLocaleString("fr-FR")} F` },
              { label: "Coût total",    value: `${lot.cout_total.toLocaleString("fr-FR")} F` },
              lot.cout_vendu > 0 && { label: "Coût vendu", value: `${lot.cout_vendu.toLocaleString("fr-FR")} F` },
              lot.cout_perdu > 0 && { label: "Coût perdu", value: `${lot.cout_perdu.toLocaleString("fr-FR")} F` },
            ].filter(Boolean).map((s) => (
              <div key={s.label} className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <span className="text-sm font-semibold">{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Dates */}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>Production : {lot.date_production}</span>
          {lot.date_peremption && <span>Péremption : {lot.date_peremption}</span>}
          {lot.schema?.nom      && <span>Schéma : {lot.schema.nom}</span>}
          {lot.production?.nom  && <span>Source : {lot.production.nom}</span>}
        </div>

        {lot.notes && (
          <p className="text-xs text-muted-foreground italic">{lot.notes}</p>
        )}

        {/* Enregistrer une perte */}
        {canManage &&
          lot.quantite_disponible > 0 &&
          lot.statut !== STATUTS_LOT.PERIME && (
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setPerteMode(!perteMode)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/30 hover:bg-muted/50 text-sm font-medium transition-colors">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-muted-foreground" />
                  Enregistrer une perte
                </div>
                <span className="text-xs text-muted-foreground">{perteMode ? "▲" : "▼"}</span>
              </button>
              {perteMode && (
                <form onSubmit={handlePerte} className="p-3 border-t border-border flex flex-col gap-3">
                  <div className="text-xs text-muted-foreground">
                    Disponible : <span className="font-semibold text-foreground">{lot.quantite_disponible}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Quantité *</Label>
                      <Input
                        type="number" size="sm"
                        className="h-8 text-sm"
                        min="0.01" step="0.01"
                        max={lot.quantite_disponible}
                        value={quantite}
                        onChange={(e) => setQuantite(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Motif *</Label>
                      <Input
                        className="h-8 text-sm"
                        placeholder="Péremption..."
                        value={motif}
                        onChange={(e) => setMotif(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPerteMode(false)}>
                      Annuler
                    </Button>
                    <Button
                      type="submit" size="sm" variant="destructive"
                      disabled={perteLoading || !quantite || !motif}>
                      {perteLoading ? "..." : "Confirmer"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

        {/* Mouvements */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Historique mouvements</h4>
          {loadingMouvements ? (
            <p className="text-xs text-muted-foreground animate-pulse">Chargement...</p>
          ) : mouvements.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucun mouvement</p>
          ) : (
            <div className="flex flex-col gap-1">
              {mouvements.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-2.5 py-2 bg-muted/20 rounded-lg text-xs">
                  <div>
                    <span className="font-medium">{TYPES_MOUVEMENT_LABELS[m.type]}</span>
                    {m.motif && <span className="text-muted-foreground"> · {m.motif}</span>}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="font-medium">{m.quantite}</div>
                    <div className="text-muted-foreground">{m.date_mouvement}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions footer */}
      {canDelete && (
        <div className="shrink-0 p-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-destructive hover:bg-destructive/10"
            onClick={onSupprimer}>
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer ce lot
          </Button>
        </div>
      )}
    </div>
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
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label className="text-sm">Nom de l'item *</Label>
          <Input
            placeholder="ex. Sauce mayo maison"
            value={form.nom}
            onChange={(e) => set("nom", e.target.value)}
            required
          />
        </div>
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
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label className="text-sm">Durée de conservation (jours)</Label>
          <Input
            type="number" min="1"
            placeholder="ex. 3"
            value={form.duree_conservation_jours}
            onChange={(e) => set("duree_conservation_jours", e.target.value)}
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label className="text-sm">Notes</Label>
          <Textarea
            placeholder="Remarques..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>
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

// ── DesktopStock ─────────────────────────────────────────────────────────────

const DesktopStock = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(isDesktop), [isDesktop]);

  const hook = useStock();
  const {
    ongletActif, setOngletActif,
    lots, loadingLots,
    lotSelectionne, selectionnerLot,
    mouvements, loadingMouvements,
    filtreCategorie, setFiltreCategorie,
    filtreStatut, setFiltreStatut,
    searchTerm, setSearchTerm,
    includeEpuise, setIncludeEpuise,
    includePerime, setIncludePerime,
    dashboard, stockActuel, alertes, loadingVue,
    canManage, canDelete,
    enregistrerPerteAction, perteLoading,
    supprimerLotAction, marquerPerimesAction,
    confirmSupprimer, setConfirmSupprimer,
    dialogCreerLotOuvert, setDialogCreerLotOuvert,
    creerLotManuelAction, submitting,
  } = hook;

  return (
    <div
      className="min-h-screen bg-muted/30 flex flex-col"
      style={{ display: visible ? "flex" : "none" }}>
      {/* Header */}
      <div className="bg-background border-b px-6 py-4 shrink-0">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Stock</h1>
            <p className="text-xs text-muted-foreground">Lots de production et inventaire</p>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => setDialogCreerLotOuvert(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Nouveau lot
            </Button>
          )}
        </div>
      </div>

      {/* Layout principal */}
      <div className="flex flex-1 overflow-hidden max-w-[1800px] mx-auto w-full p-4 gap-4">
        {/* Colonne principale */}
        <div className="flex-1 min-w-0 flex flex-col">
          <Tabs value={ongletActif} onValueChange={setOngletActif} className="flex flex-col h-full">
            <TabsList className="w-64 mb-4 shrink-0">
              <TabsTrigger value={ONGLETS_STOCK.LOTS} className="flex items-center gap-1.5 flex-1 text-xs">
                <Package className="w-3.5 h-3.5" />
                Lots
              </TabsTrigger>
              <TabsTrigger value={ONGLETS_STOCK.VUE} className="flex items-center gap-1.5 flex-1 text-xs">
                <LayoutGrid className="w-3.5 h-3.5" />
                Vue d'ensemble
              </TabsTrigger>
            </TabsList>

            {/* ── Onglet Lots ── */}
            <TabsContent value={ONGLETS_STOCK.LOTS} className="mt-0 flex flex-col gap-3 flex-1 min-h-0">
              {/* Filtres */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-8"
                  />
                </div>
                <Select
                  value={filtreCategorie || "_all"}
                  onValueChange={(v) => setFiltreCategorie(v === "_all" ? "" : v)}>
                  <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
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
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Tous les statuts</SelectItem>
                    {Object.entries(STATUTS_LOT_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => setIncludeEpuise(!includeEpuise)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    includeEpuise
                      ? "bg-slate-200 dark:bg-slate-700 border-slate-400 text-foreground"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  Épuisés
                </button>
                <button
                  onClick={() => setIncludePerime(!includePerime)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    includePerime
                      ? "bg-red-100 dark:bg-red-900/30 border-red-400 text-red-700"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  Périmés
                </button>
              </div>

              {/* Liste lots */}
              <div className="flex-1 overflow-y-auto">
                {loadingLots ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-sm text-muted-foreground animate-pulse">Chargement...</p>
                  </div>
                ) : lots.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16">
                    <Package className="w-12 h-12 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Aucun lot trouvé</p>
                    {canManage && (
                      <Button size="sm" onClick={() => setDialogCreerLotOuvert(true)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Créer un lot
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {lots.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => selectionnerLot(lotSelectionne?.id === l.id ? null : l)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                          lotSelectionne?.id === l.id
                            ? "bg-primary/5 border-primary/30"
                            : "bg-background border-border hover:bg-accent/50"
                        }`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground truncate flex-1">
                              {l.nom}
                            </span>
                            <StatutBadge statut={l.statut} />
                            <AlerteBadge niveau={l.alerte_peremption} jours={l.jours_avant_peremption} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {l.numero_lot && <span className="font-mono">{l.numero_lot} · </span>}
                            {CATEGORIES_STOCK_LABELS[l.categorie]}
                            {" · "}{l.quantite_disponible} / {l.quantite_initiale} disponible
                            {l.date_production && ` · ${l.date_production}`}
                            {l.cout_unitaire > 0 && ` · ${l.cout_unitaire.toLocaleString("fr-FR")} F/u`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Onglet Vue d'ensemble ── */}
            <TabsContent value={ONGLETS_STOCK.VUE} className="mt-0 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
              {loadingVue ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground animate-pulse">Chargement...</p>
                </div>
              ) : (
                <>
                  {/* Dashboard */}
                  {dashboard && (
                    <div className="grid grid-cols-4 gap-2 shrink-0">
                      {[
                        { label: "Lots actifs",    value: dashboard.nb_lots_actifs },
                        { label: "Valeur stock",   value: `${(dashboard.valeur_stock_total || 0).toLocaleString("fr-FR")} F` },
                        { label: "Valeur vendue",  value: `${(dashboard.valeur_vendue || 0).toLocaleString("fr-FR")} F` },
                        { label: "Valeur perdue",  value: `${(dashboard.valeur_perdue || 0).toLocaleString("fr-FR")} F` },
                      ].map((s) => (
                        <div key={s.label} className="flex flex-col gap-0.5 p-3 bg-background border border-border rounded-xl">
                          <span className="text-xs text-muted-foreground">{s.label}</span>
                          <span className="text-lg font-bold text-foreground">{s.value ?? "—"}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Alertes */}
                  {alertes && (alertes.nb_perimes > 0 || alertes.nb_proches > 0) && (
                    <div className="shrink-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          Alertes de péremption ({alertes.nb_perimes + alertes.nb_proches})
                        </h4>
                        {canManage && alertes.nb_perimes > 0 && (
                          <Button variant="outline" size="sm" onClick={marquerPerimesAction}>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            Marquer périmés
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                        {[...alertes.critique || [], ...alertes.urgent || [], ...alertes.attention || []].map((l) => (
                          <div
                            key={l.id}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${
                              l.niveau === "critique"
                                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                : l.niveau === "urgent"
                                  ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                                  : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                            }`}>
                            <span className="font-medium">{l.nom}</span>
                            <span className={
                              l.niveau === "critique" ? "text-red-600 dark:text-red-400"
                              : l.niveau === "urgent" ? "text-orange-600 dark:text-orange-400"
                              : "text-yellow-700 dark:text-yellow-400"
                            }>
                              {l.jours <= 0 ? "Expiré" : l.jours === 1 ? "Demain" : `${l.jours}j`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stock actuel */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Stock disponible</h4>
                    {stockActuel.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Aucun item en stock</p>
                    ) : (
                      <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                        {stockActuel.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2.5 bg-background border border-border rounded-xl text-sm">
                            <div>
                              <p className="font-medium">{item.nom}</p>
                              <p className="text-xs text-muted-foreground">
                                {CATEGORIES_STOCK_LABELS[item.categorie]} · {item.nb_lots} lot(s)
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{item.quantite_disponible_totale}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Panneau détail lot — droite */}
        {lotSelectionne && ongletActif === ONGLETS_STOCK.LOTS && (
          <div className="w-80 xl:w-96 shrink-0 bg-background rounded-xl border border-border overflow-hidden flex flex-col">
            <PanneauLot
              lot={lotSelectionne}
              mouvements={mouvements}
              loadingMouvements={loadingMouvements}
              onClose={() => selectionnerLot(null)}
              onSupprimer={() => setConfirmSupprimer(lotSelectionne)}
              onEnregistrerPerte={(qte, motif) => enregistrerPerteAction(lotSelectionne.id, qte, motif)}
              perteLoading={perteLoading}
              canManage={canManage}
              canDelete={canDelete}
            />
          </div>
        )}
      </div>

      {/* Dialog Créer lot */}
      <Dialog open={dialogCreerLotOuvert} onOpenChange={setDialogCreerLotOuvert}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
              onClick={() => supprimerLotAction(confirmSupprimer?.id)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DesktopStock;
