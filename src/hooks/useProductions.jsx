/**
 * useProductions.jsx
 * Hook principal pour la gestion des schémas et productions
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import useActiveUserStore from "@/store/activeUserStore";
import {
  getSchemas,
  createSchema,
  updateSchema,
  archiverSchema,
  deleteSchema,
  getProductions,
  createProduction,
  updateProduction,
  changerStatutProduction,
  deleteProduction,
  getMetriquesSchema,
  getDashboardProductions,
  canManageProductions,
  canDeleteSchema,
  initProductionFromSchema,
} from "@/utils/productionToolkit";
import { integrerProductionAuStock } from "@/utils/stockToolkit";

export const ONGLETS = {
  SCHEMAS: "schemas",
  PRODUCTIONS: "productions",
};

const useProductions = () => {
  const { user } = useActiveUserStore();
  const userRole = user?.role;

  const canManage = canManageProductions(userRole);
  const canDelete = canDeleteSchema(userRole);

  // ── Onglet actif ───────────────────────────────────────────────────────────
  const [ongletActif, setOngletActif] = useState(ONGLETS.SCHEMAS);

  // ── État Schémas ───────────────────────────────────────────────────────────
  const [schemas, setSchemas] = useState([]);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  const [schemaSelectionne, setSchemaSelectionneState] = useState(null);
  const [metriquesSchema, setMetriquesSchema] = useState(null);
  const [loadingMetriques, setLoadingMetriques] = useState(false);
  const [filtreCategorie, setFiltreCategorie] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [afficherArchives, setAfficherArchives] = useState(false);

  // ── État Productions ───────────────────────────────────────────────────────
  const [productions, setProductions] = useState([]);
  const [loadingProductions, setLoadingProductions] = useState(false);
  const [productionSelectionnee, setProductionSelectionnee] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [filtreSchema, setFiltreSchema] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtreDateDebut, setFiltreDateDebut] = useState("");
  const [filtreDateFin, setFiltreDateFin] = useState("");

  // ── Formulaires ────────────────────────────────────────────────────────────
  const [dialogSchemaOuvert, setDialogSchemaOuvert] = useState(false);
  const [schemaEnEdition, setSchemaEnEdition] = useState(null);
  const [dialogProductionOuvert, setDialogProductionOuvert] = useState(false);
  const [productionEnEdition, setProductionEnEdition] = useState(null);
  const [schemaInitProd, setSchemaInitProd] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Confirmations ──────────────────────────────────────────────────────────
  const [confirmArchiver, setConfirmArchiver] = useState(null);
  const [confirmSupprimer, setConfirmSupprimer] = useState(null);

  // ── Intégration stock ──────────────────────────────────────────────────────
  const [integrationLoading, setIntegrationLoading] = useState(false);

  // ============================================================================
  // SCHÉMAS — Chargement
  // ============================================================================

  const chargerSchemas = useCallback(async () => {
    setLoadingSchemas(true);
    const result = await getSchemas({
      actifSeulement: !afficherArchives,
      categorie: filtreCategorie || undefined,
      searchTerm: searchTerm || undefined,
    });
    setLoadingSchemas(false);
    if (result.success) {
      setSchemas(result.schemas);
    } else {
      toast.error("Erreur lors du chargement des schémas", {
        description: result.error,
      });
    }
  }, [afficherArchives, filtreCategorie, searchTerm]);

  useEffect(() => {
    chargerSchemas();
  }, [chargerSchemas]);

  const chargerMetriquesSchema = useCallback(async (schemaId) => {
    setLoadingMetriques(true);
    setMetriquesSchema(null);
    const result = await getMetriquesSchema(schemaId);
    setLoadingMetriques(false);
    if (result.success) {
      setMetriquesSchema(result.metriques);
    }
  }, []);

  const selectionnerSchema = useCallback(
    (schema) => {
      setSchemaSelectionneState(schema);
      if (schema) chargerMetriquesSchema(schema.id);
      else setMetriquesSchema(null);
    },
    [chargerMetriquesSchema]
  );

  // ============================================================================
  // SCHÉMAS — CRUD
  // ============================================================================

  const soumettreSchema = async (formData) => {
    setSubmitting(true);
    let result;
    if (schemaEnEdition) {
      result = await updateSchema(schemaEnEdition.id, formData, userRole);
    } else {
      result = await createSchema(formData, userRole);
    }
    setSubmitting(false);

    if (result.success) {
      toast.success(
        schemaEnEdition ? "Schéma mis à jour" : "Schéma créé avec succès"
      );
      setDialogSchemaOuvert(false);
      setSchemaEnEdition(null);
      chargerSchemas();
      if (schemaSelectionne?.id === result.schema?.id) {
        setSchemaSelectionneState(result.schema);
      }
    } else {
      const msg = result.errors?.join(", ") || result.error;
      toast.error("Erreur", { description: msg });
    }
    return result;
  };

  const confirmerArchiverSchema = (schema) => setConfirmArchiver(schema);
  const confirmerSupprimerSchema = (schema) => setConfirmSupprimer(schema);

  const archiverSchemaAction = async (schemaId) => {
    const result = await archiverSchema(schemaId, userRole);
    setConfirmArchiver(null);
    if (result.success) {
      toast.success("Schéma archivé");
      chargerSchemas();
      if (schemaSelectionne?.id === schemaId) selectionnerSchema(null);
    } else {
      toast.error("Erreur", { description: result.error });
    }
  };

  const supprimerSchemaAction = async (schemaId) => {
    const result = await deleteSchema(schemaId, userRole);
    setConfirmSupprimer(null);
    if (result.success) {
      toast.success("Schéma supprimé");
      chargerSchemas();
      if (schemaSelectionne?.id === schemaId) selectionnerSchema(null);
    } else {
      toast.error("Erreur", { description: result.error });
    }
  };

  const ouvrirCreerSchema = () => {
    setSchemaEnEdition(null);
    setDialogSchemaOuvert(true);
  };

  const ouvrirEditerSchema = (schema) => {
    setSchemaEnEdition(schema);
    setDialogSchemaOuvert(true);
  };

  // ============================================================================
  // PRODUCTIONS — Chargement
  // ============================================================================

  const chargerProductions = useCallback(async () => {
    setLoadingProductions(true);
    const result = await getProductions({
      schemaId: filtreSchema || undefined,
      statut: filtreStatut || undefined,
      startDate: filtreDateDebut || undefined,
      endDate: filtreDateFin || undefined,
    });
    setLoadingProductions(false);
    if (result.success) {
      setProductions(result.productions);
    } else {
      toast.error("Erreur lors du chargement des productions", {
        description: result.error,
      });
    }
  }, [filtreSchema, filtreStatut, filtreDateDebut, filtreDateFin]);

  const chargerDashboard = useCallback(async () => {
    const result = await getDashboardProductions();
    if (result.success) setDashboard(result.dashboard);
  }, []);

  useEffect(() => {
    if (ongletActif === ONGLETS.PRODUCTIONS) {
      chargerProductions();
      chargerDashboard();
    }
  }, [ongletActif, chargerProductions, chargerDashboard]);

  // ============================================================================
  // PRODUCTIONS — CRUD
  // ============================================================================

  const soumettreProduction = async (formData) => {
    setSubmitting(true);
    let result;
    if (productionEnEdition) {
      result = await updateProduction(productionEnEdition.id, formData, userRole);
    } else {
      result = await createProduction(formData, userRole);
    }
    setSubmitting(false);

    if (result.success) {
      setDialogProductionOuvert(false);
      setProductionEnEdition(null);
      chargerProductions();
      chargerDashboard();

      // Intégration au stock si demandée
      if (formData.integrer_au_stock && result.production?.id) {
        const integResult = await integrerProductionAuStock(result.production.id, userRole);
        if (integResult.success) {
          toast.success("Production enregistrée et intégrée au stock", {
            description: `${integResult.nb_lots} lot(s) créé(s)`,
          });
        } else {
          toast.success("Production enregistrée");
          toast.warning("Intégration au stock échouée", {
            description: integResult.error,
          });
        }
      } else {
        toast.success(
          productionEnEdition ? "Production mise à jour" : "Production enregistrée"
        );
      }
    } else {
      const msg = result.errors?.join(", ") || result.error;
      toast.error("Erreur", { description: msg });
    }
    return result;
  };

  const changerStatut = async (productionId, statut) => {
    const result = await changerStatutProduction(productionId, statut, userRole);
    if (result.success) {
      toast.success("Statut mis à jour");
      chargerProductions();
      if (productionSelectionnee?.id === productionId) {
        setProductionSelectionnee(result.production);
      }
    } else {
      toast.error("Erreur", { description: result.error });
    }
  };

  const supprimerProduction = async (productionId) => {
    const result = await deleteProduction(productionId, userRole);
    if (result.success) {
      toast.success("Production supprimée");
      chargerProductions();
      chargerDashboard();
      if (productionSelectionnee?.id === productionId)
        setProductionSelectionnee(null);
    } else {
      toast.error("Erreur", { description: result.error });
    }
  };

  const ouvrirCreerProduction = (schema = null) => {
    setProductionEnEdition(null);
    setSchemaInitProd(schema);
    setDialogProductionOuvert(true);
  };

  const ouvrirEditerProduction = (production) => {
    setProductionEnEdition(production);
    setSchemaInitProd(null);
    setDialogProductionOuvert(true);
  };

  // ============================================================================
  // STOCK — Intégration
  // ============================================================================

  const integrerAuStock = async (productionId) => {
    setIntegrationLoading(true);
    const result = await integrerProductionAuStock(productionId, userRole);
    setIntegrationLoading(false);
    if (result.success) {
      toast.success(`${result.nb_lots} lot(s) intégré(s) au stock`);
      chargerProductions();
    } else {
      toast.error("Erreur lors de l'intégration", { description: result.error });
    }
    return result;
  };

  return {
    // User / Permissions
    user,
    userRole,
    canManage,
    canDelete,

    // Onglets
    ongletActif,
    setOngletActif,

    // Schémas — état
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
    chargerSchemas,

    // Schémas — actions
    dialogSchemaOuvert,
    setDialogSchemaOuvert,
    schemaEnEdition,
    ouvrirCreerSchema,
    ouvrirEditerSchema,
    soumettreSchema,
    confirmerArchiverSchema,
    confirmerSupprimerSchema,
    archiverSchemaAction,
    supprimerSchemaAction,
    confirmArchiver,
    setConfirmArchiver,
    confirmSupprimer,
    setConfirmSupprimer,

    // Productions — état
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
    chargerProductions,

    // Productions — actions
    dialogProductionOuvert,
    setDialogProductionOuvert,
    productionEnEdition,
    schemaInitProd,
    ouvrirCreerProduction,
    ouvrirEditerProduction,
    soumettreProduction,
    changerStatut,
    supprimerProduction,

    // Stock
    integrerAuStock,
    integrationLoading,

    // Shared
    submitting,
    initProductionFromSchema,
  };
};

export default useProductions;
