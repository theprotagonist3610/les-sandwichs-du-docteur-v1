/**
 * MobileProductions.jsx
 * Layout mobile — onglets par recette + liste des lots
 */

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Settings2, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ProductionForm from "@/components/productions/ProductionForm";
import RecetteConfig  from "@/components/productions/RecetteConfig";
import {
  RECETTE_COLORS, RECETTE_LABELS, RECETTE_ICONS, RECETTES_IDS,
  formatMontant, formatQte, formatDate, formatRendement,
} from "@/utils/productionToolkit";

// ─── Mini-carte résumé recette ────────────────────────────────────────────────

const MiniRecetteCard = ({ recette, dernierLot, onNouveauLot, onConfig }) => {
  const color = RECETTE_COLORS[recette.id];
  const marge = dernierLot?.marge_estimee;

  return (
    <div className="rounded-xl border-2 bg-card mx-4 mt-3 p-4" style={{ borderColor: color + "30" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Rendement estimé</span>
          <span className="text-sm font-semibold">{recette.rendement_estime_pct} %</span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xs text-muted-foreground">Prix / {recette.ingredient_principal?.unite}</span>
          <span className="text-sm font-semibold">{formatMontant(recette.prix_vente_par_unite_produite)}</span>
        </div>
      </div>

      {dernierLot ? (
        <div className="rounded-lg bg-muted/40 p-2.5 mb-3 flex flex-col gap-1 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Dernier lot</span>
            <span>{formatDate(dernierLot.date_production)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">{formatQte(dernierLot.qte_produite_reelle, dernierLot.recette?.ingredient_principal?.unite)}</span>
            <span className={cn("font-semibold", marge >= 0 ? "text-green-600" : "text-destructive")}>
              {marge >= 0 ? "+" : ""}{formatMontant(marge)}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic mb-3">Aucun lot enregistré</p>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 text-white font-medium"
          style={{ background: color }}
          onClick={onNouveauLot}
        >
          <Plus className="w-4 h-4 mr-1" /> Nouveau lot
        </Button>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={onConfig}>
          <Settings2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// ─── Carte lot dans la liste ──────────────────────────────────────────────────

const CarteLot = ({ prod, onEdit, onDelete }) => {
  const color     = RECETTE_COLORS[prod.recette_id] ?? "#6b7280";
  const marge     = prod.marge_estimee;
  const rendement = prod.rendement_reel_pct;
  const recEstime = prod.recette?.rendement_estime_pct ?? 85;
  const rendColor = rendement == null ? "text-muted-foreground"
    : rendement >= recEstime       ? "text-green-600"
    : rendement >= recEstime * 0.8 ? "text-amber-600"
    : "text-destructive";

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{RECETTE_ICONS[prod.recette_id]}</span>
          <span className="text-sm font-medium">{RECETTE_LABELS[prod.recette_id]}</span>
        </div>
        <span className="text-xs text-muted-foreground">{formatDate(prod.date_production)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Qté produite</span>
          <span className="font-semibold">
            {formatQte(prod.qte_produite_reelle, prod.recette?.ingredient_principal?.unite)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Coût matières</span>
          <span className="font-medium">{formatMontant(prod.cout_total_reel)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Prix vente estimé</span>
          <span className="font-medium">{formatMontant(prod.prix_vente_estime)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Rendement</span>
          <span className={cn("font-semibold", rendColor)}>{formatRendement(rendement)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Marge estimée</span>
          <span className={cn("text-sm font-bold", marge >= 0 ? "text-green-600" : "text-destructive")}>
            {marge >= 0 ? "+" : ""}{formatMontant(marge)}
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(prod)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(prod.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const MobileProductions = ({ hook }) => {
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

  const tabs = [{ value: "all", label: "Tous" }, ...RECETTES_IDS.map((id) => ({
    value: id,
    label: RECETTE_ICONS[id],
    title: RECETTE_LABELS[id],
  }))];

  const prodsFiltrées = filtreRecette
    ? productions.filter((p) => p.recette_id === filtreRecette)
    : productions;

  return (
    <div className="flex flex-col min-h-full pb-24">

      {/* Titre */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold">Productions</h1>
        <p className="text-xs text-muted-foreground">Suivi des lots par recette</p>
      </div>

      {/* Onglets */}
      <Tabs
        value={filtreRecette ?? "all"}
        onValueChange={(v) => setFiltreRecette(v === "all" ? null : v)}
        className="flex-1"
      >
        <TabsList className="mx-4 w-[calc(100%-2rem)] grid grid-cols-4">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs" title={t.title}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Onglet "Tous" */}
        <TabsContent value="all" className="mt-0">
          <div className="px-4 pt-3 pb-2 flex justify-end">
            <Button size="sm" onClick={() => ouvrirNouveauLot(null)} className="gap-1">
              <Plus className="w-4 h-4" /> Nouveau lot
            </Button>
          </div>
          <div className="px-4 flex flex-col gap-3">
            {productionsLoading
              ? <div className="h-24 rounded-xl bg-muted animate-pulse" />
              : prodsFiltrées.length === 0
              ? <p className="text-sm text-muted-foreground text-center py-8">Aucune production enregistrée</p>
              : prodsFiltrées.map((p) => (
                  <CarteLot
                    key={p.id} prod={p}
                    onEdit={ouvrirEditionLot}
                    onDelete={(id) => setConfirmDelete({ open: true, id })}
                  />
                ))
            }
          </div>
        </TabsContent>

        {/* Onglet par recette */}
        {RECETTES_IDS.map((id) => {
          const recette  = recettes.find((r) => r.id === id);
          const lotsRecette = productions.filter((p) => p.recette_id === id);
          return (
            <TabsContent key={id} value={id} className="mt-0">
              {recette && (
                <MiniRecetteCard
                  recette={recette}
                  dernierLot={lastLots[id]}
                  onNouveauLot={() => ouvrirNouveauLot(id)}
                  onConfig={() => ouvrirConfig(id)}
                />
              )}
              <div className="px-4 pt-3 flex flex-col gap-3">
                {productionsLoading
                  ? <div className="h-24 rounded-xl bg-muted animate-pulse" />
                  : lotsRecette.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-8">Aucun lot pour cette recette</p>
                  : lotsRecette.map((p) => (
                      <CarteLot
                        key={p.id} prod={p}
                        onEdit={ouvrirEditionLot}
                        onDelete={(id) => setConfirmDelete({ open: true, id })}
                      />
                    ))
                }
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Sheet production */}
      <Sheet open={dialogProduction.open} onOpenChange={(o) => !o && setDialogProduction({ ...dialogProduction, open: false })}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle>
              {dialogProduction.mode === "create" ? "Enregistrer un lot" : "Modifier le lot"}
            </SheetTitle>
          </SheetHeader>
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
        </SheetContent>
      </Sheet>

      {/* Sheet config recette */}
      <Sheet open={dialogConfig.open} onOpenChange={(o) => !o && setDialogConfig({ ...dialogConfig, open: false })}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Configurer — {RECETTE_LABELS[dialogConfig.recetteId] ?? ""}</SheetTitle>
          </SheetHeader>
          {dialogConfig.open && (
            <RecetteConfig
              recette={recetteParId(dialogConfig.recetteId)}
              onSave={handleSaveConfig}
              onCancel={() => setDialogConfig({ ...dialogConfig, open: false })}
              loading={submitLoading}
            />
          )}
        </SheetContent>
      </Sheet>

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

export default MobileProductions;
