/**
 * DesktopProductions.jsx
 * Page de gestion des productions — version desktop
 * Layout : liste gauche | panneau détail droite
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
  Archive,
  Pencil,
  Trash2,
  BarChart2,
  X,
  PackageCheck,
} from "lucide-react";
import SchemaForm from "@/components/productions/SchemaForm";
import ProductionForm from "@/components/productions/ProductionForm";
import MetriquesPanel from "@/components/productions/MetriquesPanel";

// ── Badges Statut ──────────────────────────────────────────────────────────────

const STATUT_CLASSES = {
  [STATUTS_PRODUCTION.PLANIFIEE]:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  [STATUTS_PRODUCTION.EN_COURS]:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  [STATUTS_PRODUCTION.TERMINEE]:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  [STATUTS_PRODUCTION.ANNULEE]:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const StatutBadge = ({ statut }) => (
  <span
    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_CLASSES[statut] || ""}`}>
    {STATUTS_LABELS[statut] || statut}
  </span>
);

// ── Panneau Schéma (droite) ────────────────────────────────────────────────────

const PanneauSchema = ({
  schema,
  metriques,
  loadingMetriques,
  onClose,
  onEditer,
  onArchiver,
  onSupprimer,
  onNouvelleProduction,
  canManage,
  canDelete,
}) => (
  <div className="flex flex-col h-full">
    {/* Header panneau */}
    <div className="flex items-start justify-between p-4 border-b border-border shrink-0">
      <div>
        <h3 className="text-base font-semibold">{schema.nom}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {CATEGORIES_LABELS[schema.categorie]}
          {!schema.actif && " · Archivé"}
        </p>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>

    {/* Corps scrollable */}
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
      {/* Détails du schéma */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
          <span className="text-xs text-muted-foreground">Ingrédient principal</span>
          <span className="text-sm font-medium">
            {schema.ingredient_principal?.nom}
          </span>
          <span className="text-xs text-muted-foreground">
            {schema.ingredient_principal?.quantite} {schema.ingredient_principal?.unite}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
          <span className="text-xs text-muted-foreground">Rendement estimé</span>
          <span className="text-sm font-medium">
            {schema.rendement_estime?.quantite || "—"}{" "}
            {schema.rendement_estime?.unite || ""}
          </span>
        </div>
        {schema.duree_preparation_minutes && (
          <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
            <span className="text-xs text-muted-foreground">Durée estimée</span>
            <span className="text-sm font-medium">
              {schema.duree_preparation_minutes} min
            </span>
          </div>
        )}
      </div>

      {schema.ingredients_secondaires?.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Ingrédients secondaires
          </span>
          {schema.ingredients_secondaires.map((ing, i) => (
            <span key={i} className="text-xs text-foreground px-2">
              · {ing.nom} — {ing.quantite} {ing.unite}
            </span>
          ))}
        </div>
      )}

      {schema.notes && (
        <p className="text-xs text-muted-foreground italic">{schema.notes}</p>
      )}

      {/* Métriques */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart2 className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Métriques historiques</h4>
        </div>
        <MetriquesPanel
          schema={schema}
          metriques={metriques}
          loading={loadingMetriques}
        />
      </div>
    </div>

    {/* Actions */}
    {canManage && (
      <div className="shrink-0 p-4 border-t border-border flex flex-col gap-2">
        <Button onClick={onNouvelleProduction} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle production
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEditer}>
            <Pencil className="w-4 h-4 mr-1" />
            Modifier
          </Button>
          {schema.actif && (
            <Button variant="outline" size="sm" className="flex-1" onClick={onArchiver}>
              <Archive className="w-4 h-4 mr-1" />
              Archiver
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={onSupprimer}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    )}
  </div>
);

// ── Panneau Production (droite) ────────────────────────────────────────────────

const PanneauProduction = ({
  production,
  onClose,
  onEditer,
  onSupprimer,
  onChangerStatut,
  onIntegrerStock,
  integrationLoading,
  canManage,
  canDelete,
}) => (
  <div className="flex flex-col h-full">
    <div className="flex items-start justify-between p-4 border-b border-border shrink-0">
      <div>
        <h3 className="text-base font-semibold">{production.nom}</h3>
        <div className="flex items-center gap-2 mt-1">
          <StatutBadge statut={production.statut} />
          <span className="text-xs text-muted-foreground">
            {production.date_production}
          </span>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
      {production.schema?.nom && (
        <div className="flex items-center gap-2 px-2.5 py-2 bg-muted/30 rounded-lg">
          <FlaskConical className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm">{production.schema.nom}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {production.cout_total > 0 && (
          <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
            <span className="text-xs text-muted-foreground">Coût total</span>
            <span className="text-sm font-semibold">
              {production.cout_total.toLocaleString("fr-FR")} F
            </span>
          </div>
        )}
        {production.cout_unitaire > 0 && (
          <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
            <span className="text-xs text-muted-foreground">Coût unitaire</span>
            <span className="text-sm font-semibold">
              {production.cout_unitaire.toLocaleString("fr-FR")} F
            </span>
          </div>
        )}
        {production.taux_rendement != null && (
          <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
            <span className="text-xs text-muted-foreground">Taux rendement</span>
            <span className="text-sm font-semibold">
              {parseFloat(production.taux_rendement).toFixed(1)}%
            </span>
          </div>
        )}
        {production.rendement_reel?.quantite && (
          <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
            <span className="text-xs text-muted-foreground">Rendement réel</span>
            <span className="text-sm font-semibold">
              {production.rendement_reel.quantite} {production.rendement_reel.unite}
            </span>
          </div>
        )}
        {production.duree_reelle_minutes && (
          <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
            <span className="text-xs text-muted-foreground">Durée réelle</span>
            <span className="text-sm font-semibold">
              {production.duree_reelle_minutes} min
            </span>
          </div>
        )}
        {production.ecart_cout != null && (
          <div className="flex flex-col gap-0.5 p-2.5 bg-muted/30 rounded-lg">
            <span className="text-xs text-muted-foreground">Écart coût</span>
            <span
              className={`text-sm font-semibold ${
                production.ecart_cout > 0 ? "text-red-600" : "text-green-600"
              }`}>
              {production.ecart_cout > 0 ? "+" : ""}
              {production.ecart_cout.toLocaleString("fr-FR")} F
            </span>
          </div>
        )}
      </div>

      {production.operateur && (
        <div className="text-xs text-muted-foreground">
          Opérateur :{" "}
          <span className="font-medium">
            {production.operateur.prenoms} {production.operateur.nom}
          </span>
        </div>
      )}

      {production.notes && (
        <p className="text-xs text-muted-foreground italic">{production.notes}</p>
      )}

      {/* Changement de statut */}
      {canManage &&
        production.statut !== STATUTS_PRODUCTION.TERMINEE &&
        production.statut !== STATUTS_PRODUCTION.ANNULEE && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Changer le statut
            </span>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(STATUTS_PRODUCTION)
                .filter(([, v]) => v !== production.statut)
                .map(([, v]) => (
                  <Button
                    key={v}
                    variant="outline"
                    size="sm"
                    onClick={() => onChangerStatut(production.id, v)}>
                    → {STATUTS_LABELS[v]}
                  </Button>
                ))}
            </div>
          </div>
        )}
    </div>

    {canManage && (
      <div className="shrink-0 p-4 border-t border-border flex flex-col gap-2">
        {production.statut === STATUTS_PRODUCTION.TERMINEE && (
          <Button
            variant="outline"
            className="w-full"
            disabled={integrationLoading}
            onClick={onIntegrerStock}>
            <PackageCheck className="w-4 h-4 mr-2" />
            {integrationLoading ? "Intégration..." : "Intégrer au stock"}
          </Button>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEditer}>
            <Pencil className="w-4 h-4 mr-1" />
            Modifier
          </Button>
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={onSupprimer}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    )}
  </div>
);

// ── DesktopProductions ─────────────────────────────────────────────────────────

const DesktopProductions = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(isDesktop), [isDesktop]);

  const hook = useProductions();
  const {
    ongletActif,
    setOngletActif,
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
    productions,
    loadingProductions,
    productionSelectionnee,
    setProductionSelectionnee,
    dashboard,
    filtreSchema,
    setFiltreSchema,
    filtreStatut,
    setFiltreStatut,
    filtreDateDebut,
    setFiltreDateDebut,
    filtreDateFin,
    setFiltreDateFin,
    ouvrirEditerProduction,
    changerStatut,
    supprimerProduction,
    integrerAuStock,
    integrationLoading,
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
      className="min-h-screen bg-muted/30 flex flex-col"
      style={{ display: visible ? "flex" : "none" }}>
      {/* Header */}
      <div className="bg-background border-b px-6 py-4 shrink-0">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Productions</h1>
            <p className="text-xs text-muted-foreground">
              Schémas de production et historique des productions
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={ouvrirCreerSchema}>
                <FlaskConical className="w-4 h-4 mr-1.5" />
                Nouveau schéma
              </Button>
              <Button
                size="sm"
                onClick={() => ouvrirCreerProduction()}>
                <Plus className="w-4 h-4 mr-1.5" />
                Nouvelle production
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Layout principal */}
      <div className="flex flex-1 overflow-hidden max-w-[1800px] mx-auto w-full p-4 gap-4">
        {/* Colonne principale */}
        <div className="flex-1 min-w-0 flex flex-col">
          <Tabs
            value={ongletActif}
            onValueChange={setOngletActif}
            className="flex flex-col h-full">
            <TabsList className="w-72 mb-4 shrink-0">
              <TabsTrigger
                value={ONGLETS.SCHEMAS}
                className="flex items-center gap-1.5 flex-1 text-xs">
                <FlaskConical className="w-3.5 h-3.5" />
                Schémas
              </TabsTrigger>
              <TabsTrigger
                value={ONGLETS.PRODUCTIONS}
                className="flex items-center gap-1.5 flex-1 text-xs">
                <ClipboardList className="w-3.5 h-3.5" />
                Productions
              </TabsTrigger>
            </TabsList>

            {/* ── Onglet Schémas ── */}
            <TabsContent value={ONGLETS.SCHEMAS} className="mt-0 flex flex-col gap-3 flex-1 min-h-0">
              {/* Filtres */}
              <div className="flex items-center gap-2 shrink-0">
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
                  <SelectTrigger className="w-44 h-8 text-xs">
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
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  <Archive className="w-3.5 h-3.5" />
                  Archivés
                </button>
              </div>

              {/* Liste */}
              <div className="flex-1 overflow-y-auto">
                {loadingSchemas ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-sm text-muted-foreground animate-pulse">
                      Chargement...
                    </p>
                  </div>
                ) : schemas.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16">
                    <FlaskConical className="w-12 h-12 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      Aucun schéma trouvé
                    </p>
                    {canManage && (
                      <Button size="sm" onClick={ouvrirCreerSchema}>
                        <Plus className="w-4 h-4 mr-1" />
                        Créer un schéma
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                    {schemas.map((s) => (
                      <button
                        key={s.id}
                        onClick={() =>
                          selectionnerSchema(
                            schemaSelectionne?.id === s.id ? null : s
                          )
                        }
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-colors text-left ${
                          schemaSelectionne?.id === s.id
                            ? "bg-primary/5 border-primary/30"
                            : "bg-background border-border hover:bg-accent/50"
                        }`}>
                        <FlaskConical
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            schemaSelectionne?.id === s.id
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {s.nom}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {CATEGORIES_LABELS[s.categorie]}
                            {s.rendement_estime &&
                              ` · ${s.rendement_estime.quantite} ${s.rendement_estime.unite}`}
                            {s.duree_preparation_minutes &&
                              ` · ${s.duree_preparation_minutes} min`}
                            {!s.actif && " · Archivé"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Onglet Productions ── */}
            <TabsContent value={ONGLETS.PRODUCTIONS} className="mt-0 flex flex-col gap-3 flex-1 min-h-0">
              {/* Dashboard */}
              {dashboard && (
                <div className="grid grid-cols-4 gap-2 shrink-0">
                  {[
                    { label: "Total productions", value: dashboard.nb_productions_total },
                    {
                      label: "Coût total",
                      value: `${(dashboard.cout_total || 0).toLocaleString("fr-FR")} F`,
                    },
                    {
                      label: "Taux rendement",
                      value: dashboard.taux_rendement_global
                        ? `${parseFloat(dashboard.taux_rendement_global).toFixed(1)}%`
                        : "—",
                    },
                    {
                      label: "Schémas actifs",
                      value: dashboard.top_schemas?.length ?? "—",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="flex flex-col gap-0.5 p-3 bg-background border border-border rounded-xl">
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                      <span className="text-lg font-bold text-foreground">
                        {s.value ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Filtres */}
              <div className="flex items-center gap-2 shrink-0">
                <Select
                  value={filtreSchema || "_all"}
                  onValueChange={(v) => setFiltreSchema(v === "_all" ? "" : v)}>
                  <SelectTrigger className="w-48 h-8 text-xs">
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
                  <SelectTrigger className="w-40 h-8 text-xs">
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
                <Input
                  type="date"
                  value={filtreDateDebut}
                  onChange={(e) => setFiltreDateDebut(e.target.value)}
                  className="h-8 text-xs w-36"
                  title="Date début"
                />
                <span className="text-xs text-muted-foreground">→</span>
                <Input
                  type="date"
                  value={filtreDateFin}
                  onChange={(e) => setFiltreDateFin(e.target.value)}
                  className="h-8 text-xs w-36"
                  title="Date fin"
                />
              </div>

              {/* Liste */}
              <div className="flex-1 overflow-y-auto">
                {loadingProductions ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-sm text-muted-foreground animate-pulse">
                      Chargement...
                    </p>
                  </div>
                ) : productions.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16">
                    <ClipboardList className="w-12 h-12 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      Aucune production trouvée
                    </p>
                    {canManage && (
                      <Button size="sm" onClick={() => ouvrirCreerProduction()}>
                        <Plus className="w-4 h-4 mr-1" />
                        Enregistrer une production
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {productions.map((p) => (
                      <button
                        key={p.id}
                        onClick={() =>
                          setProductionSelectionnee(
                            productionSelectionnee?.id === p.id ? null : p
                          )
                        }
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                          productionSelectionnee?.id === p.id
                            ? "bg-primary/5 border-primary/30"
                            : "bg-background border-border hover:bg-accent/50"
                        }`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate flex-1">
                              {p.nom}
                            </span>
                            <StatutBadge statut={p.statut} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p.date_production}
                            {p.schema?.nom && ` · ${p.schema.nom}`}
                            {p.cout_total > 0 &&
                              ` · ${p.cout_total.toLocaleString("fr-FR")} F`}
                            {p.taux_rendement != null &&
                              ` · ${parseFloat(p.taux_rendement).toFixed(1)}% rdt`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Panneau détail — droite */}
        {(schemaSelectionne || productionSelectionnee) && (
          <div className="w-80 xl:w-96 shrink-0 bg-background rounded-xl border border-border overflow-hidden flex flex-col">
            {schemaSelectionne && ongletActif === ONGLETS.SCHEMAS && (
              <PanneauSchema
                schema={schemaSelectionne}
                metriques={metriquesSchema}
                loadingMetriques={loadingMetriques}
                onClose={() => selectionnerSchema(null)}
                onEditer={() => ouvrirEditerSchema(schemaSelectionne)}
                onArchiver={() => confirmerArchiverSchema(schemaSelectionne)}
                onSupprimer={() => confirmerSupprimerSchema(schemaSelectionne)}
                onNouvelleProduction={() => {
                  selectionnerSchema(null);
                  ouvrirCreerProduction(schemaSelectionne);
                }}
                canManage={canManage}
                canDelete={canDelete}
              />
            )}
            {productionSelectionnee && ongletActif === ONGLETS.PRODUCTIONS && (
              <PanneauProduction
                production={productionSelectionnee}
                onClose={() => setProductionSelectionnee(null)}
                onEditer={() => {
                  setProductionSelectionnee(null);
                  ouvrirEditerProduction(productionSelectionnee);
                }}
                onSupprimer={() => {
                  supprimerProduction(productionSelectionnee.id);
                  setProductionSelectionnee(null);
                }}
                onChangerStatut={(id, statut) => {
                  changerStatut(id, statut);
                  setProductionSelectionnee(null);
                }}
                onIntegrerStock={() => integrerAuStock(productionSelectionnee.id)}
                integrationLoading={integrationLoading}
                canManage={canManage}
                canDelete={canDelete}
              />
            )}
          </div>
        )}
      </div>

      {/* Dialog Schéma */}
      <Dialog open={dialogSchemaOuvert} onOpenChange={setDialogSchemaOuvert}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {productionEnEdition
                ? "Modifier la production"
                : "Enregistrer une production"}
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

export default DesktopProductions;
