/**
 * DesktopProductions.jsx
 * Layout desktop — 3 cartes recette + tableau historique
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Settings2, Pencil, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import ProductionForm from "@/components/productions/ProductionForm";
import RecetteConfig  from "@/components/productions/RecetteConfig";
import {
  RECETTE_COLORS, RECETTE_LABELS, RECETTE_ICONS, RECETTES_IDS,
  formatMontant, formatQte, formatDate, formatRendement,
} from "@/utils/productionToolkit";

// ─── Carte recette ─────────────────────────────────────────────────────────────

const RecetteCard = ({ recette, dernierLot, onNouveauLot, onConfig }) => {
  const color = RECETTE_COLORS[recette.id];
  const icon  = RECETTE_ICONS[recette.id];
  const marge = dernierLot?.marge_estimee;

  return (
    <div className="rounded-xl border-2 bg-card p-4 flex flex-col gap-3" style={{ borderColor: color + "30" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold text-sm">{recette.nom}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onConfig}>
          <Settings2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <span>Ingrédient : <b className="text-foreground">{recette.ingredient_principal?.nom ?? "—"}</b></span>
        <span>Rendement estimé : <b className="text-foreground">{recette.rendement_estime_pct} %</b></span>
        <span>Prix vente : <b className="text-foreground">{formatMontant(recette.prix_vente_par_unite_produite)} / {recette.ingredient_principal?.unite}</b></span>
      </div>

      {dernierLot ? (
        <div className="rounded-lg bg-muted/40 p-2 flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Dernier lot — {formatDate(dernierLot.date_production)}</span>
          <div className="flex items-center justify-between">
            <span>{formatQte(dernierLot.qte_produite_reelle, dernierLot.recette?.ingredient_principal?.unite)}</span>
            <span className={cn("font-semibold", marge >= 0 ? "text-green-600" : "text-destructive")}>
              {marge >= 0 ? "+" : ""}{formatMontant(marge)}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Aucun lot enregistré</p>
      )}

      <Button
        size="sm"
        className="w-full text-white font-medium"
        style={{ background: color }}
        onClick={onNouveauLot}
      >
        <Plus className="w-4 h-4 mr-1" /> Nouveau lot
      </Button>
    </div>
  );
};

// ─── Ligne historique ─────────────────────────────────────────────────────────

const LigneHistorique = ({ prod, onEdit, onDelete }) => {
  const color     = RECETTE_COLORS[prod.recette_id] ?? "#6b7280";
  const marge     = prod.marge_estimee;
  const rendement = prod.rendement_reel_pct;
  const recEstime = prod.recette?.rendement_estime_pct ?? 85;

  const rendBadge = rendement == null ? null
    : rendement >= recEstime      ? "text-green-600"
    : rendement >= recEstime * 0.8 ? "text-amber-600"
    : "text-destructive";

  return (
    <tr className="border-b hover:bg-muted/30 transition-colors text-sm">
      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{formatDate(prod.date_production)}</td>
      <td className="py-2.5 px-3">
        <Badge variant="outline" style={{ borderColor: color + "60", color }} className="text-xs gap-1">
          <span>{RECETTE_ICONS[prod.recette_id]}</span>
          {RECETTE_LABELS[prod.recette_id]}
        </Badge>
      </td>
      <td className="py-2.5 px-3 text-right font-medium">
        {formatQte(prod.qte_produite_reelle, prod.recette?.ingredient_principal?.unite)}
      </td>
      <td className="py-2.5 px-3 text-right">{formatMontant(prod.cout_total_reel)}</td>
      <td className="py-2.5 px-3 text-right">{formatMontant(prod.prix_vente_estime)}</td>
      <td className="py-2.5 px-3 text-right">
        <span className={cn("font-semibold", marge >= 0 ? "text-green-600" : "text-destructive")}>
          {marge >= 0 ? "+" : ""}{formatMontant(marge)}
        </span>
      </td>
      <td className={cn("py-2.5 px-3 text-right font-medium", rendBadge)}>
        {formatRendement(rendement)}
      </td>
      <td className="py-2.5 px-3">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(prod)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(prod.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const DesktopProductions = ({ hook }) => {
  const {
    recettes, recettesLoading,
    productions, productionsLoading,
    filtreRecette, setFiltreRecette,
    dialogProduction, setDialogProduction,
    dialogConfig, setDialogConfig,
    confirmDelete, setConfirmDelete,
    soumettreProduction, supprimerProduction, sauvegarderConfig,
    ouvrirNouveauLot, ouvrirEditionLot, ouvrirConfig,
    derniersLots, recetteParId,
  } = hook;

  const [submitLoading, setSubmitLoading] = useState(false);
  const lastLots = derniersLots();

  const handleSubmit = async (data) => {
    setSubmitLoading(true);
    await soumettreProduction(data);
    setSubmitLoading(false);
  };

  const handleSaveConfig = async (id, updates) => {
    setSubmitLoading(true);
    await sauvegarderConfig(id, updates);
    setSubmitLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Titre */}
      <div>
        <h1 className="text-xl font-bold">Productions</h1>
        <p className="text-sm text-muted-foreground">Suivi des lots de production par recette</p>
      </div>

      {/* 3 cartes recettes */}
      <div className="grid grid-cols-3 gap-4">
        {recettesLoading
          ? RECETTES_IDS.map((id) => <div key={id} className="h-40 rounded-xl bg-muted animate-pulse" />)
          : recettes.map((r) => (
              <RecetteCard
                key={r.id}
                recette={r}
                dernierLot={lastLots[r.id]}
                onNouveauLot={() => ouvrirNouveauLot(r.id)}
                onConfig={() => ouvrirConfig(r.id)}
              />
            ))
        }
      </div>

      {/* Filtres historique */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Historique</span>
        <Select value={filtreRecette ?? "all"} onValueChange={(v) => setFiltreRecette(v === "all" ? null : v)}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les recettes</SelectItem>
            {RECETTES_IDS.map((id) => (
              <SelectItem key={id} value={id}>
                {RECETTE_ICONS[id]} {RECETTE_LABELS[id]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          className="ml-auto gap-1"
          onClick={() => ouvrirNouveauLot(null)}
        >
          <Plus className="w-4 h-4" /> Nouveau lot
        </Button>
      </div>

      {/* Tableau historique */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="text-xs text-muted-foreground">
              <th className="py-2.5 px-3 text-left font-medium">Date</th>
              <th className="py-2.5 px-3 text-left font-medium">Recette</th>
              <th className="py-2.5 px-3 text-right font-medium">Qté produite</th>
              <th className="py-2.5 px-3 text-right font-medium">Coût matières</th>
              <th className="py-2.5 px-3 text-right font-medium">Prix vente estimé</th>
              <th className="py-2.5 px-3 text-right font-medium">Marge</th>
              <th className="py-2.5 px-3 text-right font-medium">Rendement</th>
              <th className="py-2.5 px-3" />
            </tr>
          </thead>
          <tbody>
            {productionsLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  Chargement…
                </td>
              </tr>
            ) : productions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  Aucune production enregistrée
                </td>
              </tr>
            ) : productions.map((p) => (
              <LigneHistorique
                key={p.id}
                prod={p}
                onEdit={ouvrirEditionLot}
                onDelete={(id) => setConfirmDelete({ open: true, id })}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog production */}
      <Dialog open={dialogProduction.open} onOpenChange={(o) => !o && setDialogProduction({ ...dialogProduction, open: false })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogProduction.mode === "create" ? "Enregistrer un lot" : "Modifier le lot"}
            </DialogTitle>
          </DialogHeader>
          {dialogProduction.open && (
            <ProductionForm
              recettes={recettes}
              recetteIdInitiale={dialogProduction.recetteId}
              productionInitiale={dialogProduction.data}
              onSubmit={handleSubmit}
              onCancel={() => setDialogProduction({ ...dialogProduction, open: false })}
              loading={submitLoading}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog config recette */}
      <Dialog open={dialogConfig.open} onOpenChange={(o) => !o && setDialogConfig({ ...dialogConfig, open: false })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Configurer — {RECETTE_LABELS[dialogConfig.recetteId] ?? ""}
            </DialogTitle>
          </DialogHeader>
          {dialogConfig.open && (
            <RecetteConfig
              recette={recetteParId(dialogConfig.recetteId)}
              onSave={handleSaveConfig}
              onCancel={() => setDialogConfig({ ...dialogConfig, open: false })}
              loading={submitLoading}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <AlertDialog open={confirmDelete.open} onOpenChange={(o) => !o && setConfirmDelete({ open: false, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce lot ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={supprimerProduction} className="bg-destructive text-white hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DesktopProductions;
