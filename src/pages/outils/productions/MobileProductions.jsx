/**
 * MobileProductions.jsx
 * Page de gestion des productions — version mobile
 */

import { useState, useEffect } from "react";
import useBreakpoint from "@/hooks/useBreakpoint";
import useProductions, { ONGLETS } from "@/hooks/useProductions";
import {
  CATEGORIES_LABELS,
  STATUTS_LABELS,
  STATUTS_PRODUCTION,
} from "@/utils/productionToolkit";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  Search,
  FlaskConical,
  ClipboardList,
  ChevronRight,
  Archive,
  Pencil,
  Trash2,
  BarChart2,
  Filter,
  PackageCheck,
} from "lucide-react";
import SchemaForm from "@/components/productions/SchemaForm";
import ProductionForm from "@/components/productions/ProductionForm";
import MetriquesPanel from "@/components/productions/MetriquesPanel";

// ── Badges ─────────────────────────────────────────────────────────────────────

const STATUT_CLASSES = {
  [STATUTS_PRODUCTION.PLANIFIEE]: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  [STATUTS_PRODUCTION.EN_COURS]: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  [STATUTS_PRODUCTION.TERMINEE]: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  [STATUTS_PRODUCTION.ANNULEE]: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const StatutBadge = ({ statut }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_CLASSES[statut] || ""}`}>
    {STATUTS_LABELS[statut] || statut}
  </span>
);

// ── Carte Schéma ───────────────────────────────────────────────────────────────

const CarteSchema = ({ schema, onClick }) => (
  <button
    onClick={() => onClick(schema)}
    className="w-full flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:bg-accent/50 transition-colors text-left">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground truncate">{schema.nom}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {CATEGORIES_LABELS[schema.categorie] || schema.categorie}
        {schema.rendement_estime &&
          ` · ${schema.rendement_estime.quantite} ${schema.rendement_estime.unite}`}
        {!schema.actif && " · Archivé"}
      </p>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
  </button>
);

// ── Carte Production ───────────────────────────────────────────────────────────

const CarteProduction = ({ production, onClick }) => (
  <button
    onClick={() => onClick(production)}
    className="w-full flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:bg-accent/50 transition-colors text-left">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm font-medium text-foreground truncate flex-1">
          {production.nom}
        </p>
        <StatutBadge statut={production.statut} />
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">
        {production.date_production}
        {production.schema?.nom && ` · ${production.schema.nom}`}
        {production.cout_total > 0 &&
          ` · ${production.cout_total.toLocaleString("fr-FR")} F`}
      </p>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
  </button>
);

// ── Onglet Schémas ─────────────────────────────────────────────────────────────

const OngletSchemas = ({ hook }) => {
  const {
    schemas,
    loadingSchemas,
    schemaSelectionne,
    selectionnerSchema,
    metriquesSchema,
    loadingMetriques,
    filtreCategorie,
    setFiltreCategorie,
    searchTerm,
    setSearchTerm,
    afficherArchives,
    setAfficherArchives,
    canManage,
    canDelete,
    ouvrirCreerSchema,
    ouvrirEditerSchema,
    confirmerArchiverSchema,
    confirmerSupprimerSchema,
    ouvrirCreerProduction,
  } = hook;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un schéma..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        <Select
          value={filtreCategorie || "_all"}
          onValueChange={(v) => setFiltreCategorie(v === "_all" ? "" : v)}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Toutes catégories</SelectItem>
            {Object.entries(CATEGORIES_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          onClick={() => setAfficherArchives(!afficherArchives)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            afficherArchives
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border text-muted-foreground"
          }`}>
          <Archive className="w-3.5 h-3.5" />
          Archivés
        </button>
      </div>

      {/* Liste */}
      {loadingSchemas ? (
        <p className="text-sm text-muted-foreground text-center py-6 animate-pulse">
          Chargement...
        </p>
      ) : schemas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <FlaskConical className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aucun schéma trouvé</p>
          {canManage && (
            <Button size="sm" onClick={ouvrirCreerSchema}>
              <Plus className="w-4 h-4 mr-1" />
              Créer un schéma
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {schemas.map((s) => (
            <CarteSchema key={s.id} schema={s} onClick={selectionnerSchema} />
          ))}
        </div>
      )}

      {/* FAB */}
      {canManage && (
        <button
          onClick={ouvrirCreerSchema}
          className="fixed bottom-6 right-4 z-30 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">Nouveau schéma</span>
        </button>
      )}

      {/* Fiche Schéma — Sheet */}
      <Sheet open={!!schemaSelectionne} onOpenChange={(o) => !o && selectionnerSchema(null)}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-xl">
          {schemaSelectionne && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle>{schemaSelectionne.nom}</SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {CATEGORIES_LABELS[schemaSelectionne.categorie]}
                  {!schemaSelectionne.actif && " · Archivé"}
                </p>
              </SheetHeader>

              {/* Infos schéma */}
              <div className="flex flex-col gap-3 mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground">Ingrédient principal</span>
                    <span className="font-medium">
                      {schemaSelectionne.ingredient_principal?.nom}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {schemaSelectionne.ingredient_principal?.quantite}{" "}
                      {schemaSelectionne.ingredient_principal?.unite}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground">Rendement estimé</span>
                    <span className="font-medium">
                      {schemaSelectionne.rendement_estime?.quantite || "—"}{" "}
                      {schemaSelectionne.rendement_estime?.unite || ""}
                    </span>
                  </div>
                  {schemaSelectionne.duree_preparation_minutes && (
                    <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
                      <span className="text-xs text-muted-foreground">Durée estimée</span>
                      <span className="font-medium">
                        {schemaSelectionne.duree_preparation_minutes} min
                      </span>
                    </div>
                  )}
                </div>

                {schemaSelectionne.ingredients_secondaires?.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      Ingrédients secondaires
                    </span>
                    {schemaSelectionne.ingredients_secondaires.map((ing, i) => (
                      <span key={i} className="text-xs text-foreground px-2">
                        · {ing.nom} — {ing.quantite} {ing.unite}
                      </span>
                    ))}
                  </div>
                )}

                {schemaSelectionne.notes && (
                  <p className="text-xs text-muted-foreground italic px-1">
                    {schemaSelectionne.notes}
                  </p>
                )}
              </div>

              {/* Métriques */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2">Métriques</h4>
                <MetriquesPanel
                  schema={schemaSelectionne}
                  metriques={metriquesSchema}
                  loading={loadingMetriques}
                />
              </div>

              {/* Actions */}
              {canManage && (
                <div className="flex flex-col gap-2 border-t border-border pt-4">
                  <Button
                    onClick={() => {
                      selectionnerSchema(null);
                      ouvrirCreerProduction(schemaSelectionne);
                    }}
                    className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle production
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        selectionnerSchema(null);
                        ouvrirEditerSchema(schemaSelectionne);
                      }}>
                      <Pencil className="w-4 h-4 mr-1" />
                      Modifier
                    </Button>
                    {schemaSelectionne.actif && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => confirmerArchiverSchema(schemaSelectionne)}>
                        <Archive className="w-4 h-4 mr-1" />
                        Archiver
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => confirmerSupprimerSchema(schemaSelectionne)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

// ── Onglet Productions ─────────────────────────────────────────────────────────

const OngletProductions = ({ hook }) => {
  const {
    productions,
    loadingProductions,
    productionSelectionnee,
    setProductionSelectionnee,
    schemas,
    dashboard,
    filtreSchema,
    setFiltreSchema,
    filtreStatut,
    setFiltreStatut,
    canManage,
    canDelete,
    ouvrirCreerProduction,
    ouvrirEditerProduction,
    changerStatut,
    supprimerProduction,
    integrerAuStock,
    integrationLoading,
  } = hook;

  const [filtresOuverts, setFiltresOuverts] = useState(false);

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Dashboard mini */}
      {dashboard && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total", value: dashboard.nb_productions_total },
            {
              label: "Coût total",
              value: `${(dashboard.cout_total || 0).toLocaleString("fr-FR")} F`,
            },
            {
              label: "Taux rdt",
              value: dashboard.taux_rendement_global
                ? `${parseFloat(dashboard.taux_rendement_global).toFixed(1)}%`
                : "—",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-0.5 p-2 bg-card border border-border rounded-lg text-center">
              <span className="text-lg font-bold text-foreground">{s.value ?? "—"}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFiltresOuverts(!filtresOuverts)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            filtresOuverts || filtreSchema || filtreStatut
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
            value={filtreSchema || "_all"}
            onValueChange={(v) => setFiltreSchema(v === "_all" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous les schémas</SelectItem>
              {schemas.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filtreStatut || "_all"}
            onValueChange={(v) => setFiltreStatut(v === "_all" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Tous les statuts</SelectItem>
              {Object.entries(STATUTS_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Liste */}
      {loadingProductions ? (
        <p className="text-sm text-muted-foreground text-center py-6 animate-pulse">
          Chargement...
        </p>
      ) : productions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aucune production trouvée</p>
          {canManage && (
            <Button size="sm" onClick={() => ouvrirCreerProduction()}>
              <Plus className="w-4 h-4 mr-1" />
              Enregistrer une production
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {productions.map((p) => (
            <CarteProduction
              key={p.id}
              production={p}
              onClick={setProductionSelectionnee}
            />
          ))}
        </div>
      )}

      {/* FAB */}
      {canManage && (
        <button
          onClick={() => ouvrirCreerProduction()}
          className="fixed bottom-6 right-4 z-30 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">Nouvelle production</span>
        </button>
      )}

      {/* Fiche Production — Sheet */}
      <Sheet
        open={!!productionSelectionnee}
        onOpenChange={(o) => !o && setProductionSelectionnee(null)}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto rounded-t-xl">
          {productionSelectionnee && (
            <>
              <SheetHeader className="mb-3">
                <SheetTitle>{productionSelectionnee.nom}</SheetTitle>
                <div className="flex items-center gap-2">
                  <StatutBadge statut={productionSelectionnee.statut} />
                  <span className="text-xs text-muted-foreground">
                    {productionSelectionnee.date_production}
                  </span>
                </div>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                {productionSelectionnee.cout_total > 0 && (
                  <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground">Coût total</span>
                    <span className="font-semibold">
                      {productionSelectionnee.cout_total.toLocaleString("fr-FR")} F
                    </span>
                  </div>
                )}
                {productionSelectionnee.cout_unitaire > 0 && (
                  <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground">Coût unitaire</span>
                    <span className="font-semibold">
                      {productionSelectionnee.cout_unitaire.toLocaleString("fr-FR")} F
                    </span>
                  </div>
                )}
                {productionSelectionnee.taux_rendement != null && (
                  <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground">Taux rendement</span>
                    <span className="font-semibold">
                      {parseFloat(productionSelectionnee.taux_rendement).toFixed(1)}%
                    </span>
                  </div>
                )}
                {productionSelectionnee.duree_reelle_minutes && (
                  <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground">Durée réelle</span>
                    <span className="font-semibold">
                      {productionSelectionnee.duree_reelle_minutes} min
                    </span>
                  </div>
                )}
              </div>

              {productionSelectionnee.notes && (
                <p className="text-xs text-muted-foreground italic px-1 mb-4">
                  {productionSelectionnee.notes}
                </p>
              )}

              {/* Changement de statut */}
              {canManage &&
                productionSelectionnee.statut !== STATUTS_PRODUCTION.TERMINEE && (
                  <div className="flex flex-col gap-2 mb-4">
                    <span className="text-xs font-medium text-muted-foreground">
                      Changer le statut
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(STATUTS_PRODUCTION)
                        .filter(([, v]) => v !== productionSelectionnee.statut)
                        .map(([, v]) => (
                          <Button
                            key={v}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              changerStatut(productionSelectionnee.id, v);
                              setProductionSelectionnee(null);
                            }}>
                            → {STATUTS_LABELS[v]}
                          </Button>
                        ))}
                    </div>
                  </div>
                )}

              {/* Intégrer au stock */}
              {canManage &&
                productionSelectionnee.statut === STATUTS_PRODUCTION.TERMINEE && (
                  <div className="border-t border-border pt-3">
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={integrationLoading}
                      onClick={() => integrerAuStock(productionSelectionnee.id)}>
                      <PackageCheck className="w-4 h-4 mr-2" />
                      {integrationLoading ? "Intégration..." : "Intégrer au stock"}
                    </Button>
                  </div>
                )}

              {/* Actions */}
              {canManage && (
                <div className="flex gap-2 border-t border-border pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setProductionSelectionnee(null);
                      ouvrirEditerProduction(productionSelectionnee);
                    }}>
                    <Pencil className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        supprimerProduction(productionSelectionnee.id);
                        setProductionSelectionnee(null);
                      }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

// ── MobileProductions ──────────────────────────────────────────────────────────

const MobileProductions = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(isMobile), [isMobile]);

  const hook = useProductions();
  const {
    ongletActif,
    setOngletActif,
    schemas,
    dialogSchemaOuvert,
    setDialogSchemaOuvert,
    schemaEnEdition,
    soumettreSchema,
    submitting,
    dialogProductionOuvert,
    setDialogProductionOuvert,
    productionEnEdition,
    schemaInitProd,
    soumettreProduction,
    confirmArchiver,
    setConfirmArchiver,
    archiverSchemaAction,
    confirmSupprimer,
    setConfirmSupprimer,
    supprimerSchemaAction,
  } = hook;

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      style={{ display: visible ? "flex" : "none" }}>
      {/* Header */}
      <div className="bg-background border-b px-4 py-3 shrink-0">
        <h1 className="text-lg font-semibold">Productions</h1>
        <p className="text-xs text-muted-foreground">
          Schémas et historique de production
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={ongletActif}
        onValueChange={setOngletActif}
        className="flex flex-col flex-1 min-h-0">
        <TabsList className="grid grid-cols-2 rounded-none border-b h-10 shrink-0 bg-background">
          <TabsTrigger
            value={ONGLETS.SCHEMAS}
            className="flex items-center gap-1.5 text-xs font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <FlaskConical className="w-3.5 h-3.5" />
            Schémas
          </TabsTrigger>
          <TabsTrigger
            value={ONGLETS.PRODUCTIONS}
            className="flex items-center gap-1.5 text-xs font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <ClipboardList className="w-3.5 h-3.5" />
            Productions
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value={ONGLETS.SCHEMAS} className="mt-0">
            <OngletSchemas hook={hook} />
          </TabsContent>
          <TabsContent value={ONGLETS.PRODUCTIONS} className="mt-0">
            <OngletProductions hook={hook} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Dialog Schéma */}
      <Dialog open={dialogSchemaOuvert} onOpenChange={setDialogSchemaOuvert}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {schemaEnEdition ? "Modifier le schéma" : "Nouveau schéma de production"}
            </DialogTitle>
          </DialogHeader>
          <SchemaForm
            schemaInitial={schemaEnEdition}
            onSubmit={soumettreSchema}
            submitting={submitting}
            onAnnuler={() => setDialogSchemaOuvert(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Production */}
      <Dialog open={dialogProductionOuvert} onOpenChange={setDialogProductionOuvert}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {productionEnEdition ? "Modifier la production" : "Enregistrer une production"}
            </DialogTitle>
          </DialogHeader>
          <ProductionForm
            schemas={schemas}
            schemaInitial={schemaInitProd}
            productionInitiale={productionEnEdition}
            onSubmit={soumettreProduction}
            submitting={submitting}
            onAnnuler={() => setDialogProductionOuvert(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Confirm Archiver */}
      <AlertDialog
        open={!!confirmArchiver}
        onOpenChange={(o) => !o && setConfirmArchiver(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce schéma ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le schéma «&nbsp;{confirmArchiver?.nom}&nbsp;» sera désactivé. Il ne
              sera plus visible dans la liste principale.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiverSchemaAction(confirmArchiver?.id)}>
              Archiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Supprimer */}
      <AlertDialog
        open={!!confirmSupprimer}
        onOpenChange={(o) => !o && setConfirmSupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le schéma «&nbsp;{confirmSupprimer?.nom}&nbsp;» sera supprimé. Cette
              action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => supprimerSchemaAction(confirmSupprimer?.id)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MobileProductions;
