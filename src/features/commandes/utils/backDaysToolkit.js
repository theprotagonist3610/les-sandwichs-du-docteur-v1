import { supabase } from "@/lib/supabase";
import {
  createCommande,
  getAllCommandes,
  getBaseEmplacementId,
  TYPES_COMMANDE,
  STATUTS_COMMANDE,
  STATUTS_PAIEMENT,
  STATUTS_LIVRAISON,
  DEFAULT_DETAILS_PAIEMENT,
} from "@/features/commandes/utils/commandeToolkit";
import {
  createOperation,
  getOperations,
  TYPES_OPERATION,
  TYPES_COMPTE,
  COMPTE_LABELS,
} from "@/features/comptabilite/utils/comptabiliteToolkit";
import {
  calculateDayMetrics,
  saveDayClosure,
  getDayClosureByDate,
  getCommandesByDate,
} from "@/features/comptabilite/utils/dayClosureToolkit";

// ============================================================================
// CONSTANTES
// ============================================================================

export { TYPES_COMMANDE, STATUTS_COMMANDE, STATUTS_PAIEMENT, STATUTS_LIVRAISON };
export { TYPES_OPERATION, TYPES_COMPTE, COMPTE_LABELS };

export const SOURCE_BACK_DAY = "back-day";

export const STATUTS_JOURNEE = {
  VIDE: "vide",
  PARTIEL: "partiel",
  CLOTURE: "cloture",
};

// ============================================================================
// UTILITAIRES DE DATE
// ============================================================================

export const formatDateStr = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatDateFr = (dateStr) => {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const validateBackDayDate = (dateStr) => {
  if (!dateStr) {
    return { valid: false, message: "Date requise." };
  }

  const today = formatDateStr(new Date());

  if (dateStr >= today) {
    return {
      valid: false,
      message: "La date doit être antérieure à aujourd'hui.",
    };
  }

  const twoYearsAgo = formatDateStr(
    new Date(new Date().setFullYear(new Date().getFullYear() - 2))
  );
  if (dateStr < twoYearsAgo) {
    return {
      valid: false,
      message: "La date ne peut pas être antérieure à 2 ans.",
    };
  }

  return { valid: true, message: "" };
};

export const getYesterdayStr = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateStr(yesterday);
};

export const navigateDay = (dateStr, delta) => {
  const date = new Date(dateStr + "T12:00:00");
  date.setDate(date.getDate() + delta);
  return formatDateStr(date);
};

// ============================================================================
// COMMANDES RÉTROACTIVES
// ============================================================================

export const createCommandeRetroactive = async (commandeData, vendeurId, dateStr) => {
  const validation = validateBackDayDate(dateStr);
  if (!validation.valid) {
    return { commande: null, error: { message: validation.message } };
  }

  try {
    let pointDeVente = commandeData.point_de_vente;
    if (!pointDeVente) {
      pointDeVente = await getBaseEmplacementId();
      if (!pointDeVente) {
        return {
          commande: null,
          error: {
            message: "Aucun emplacement de base trouvé.",
            code: "NO_BASE_EMPLACEMENT",
          },
        };
      }
    }

    const retroTimestamp = `${dateStr}T12:00:00.000Z`;

    const newCommande = {
      type: TYPES_COMMANDE.SUR_PLACE,
      client: "non identifie",
      contact_client: "",
      contact_alternatif: "",
      lieu_livraison: null,
      instructions_livraison: "",
      livreur: null,
      date_livraison: null,
      heure_livraison: null,
      frais_livraison: 0,
      statut_livraison: STATUTS_LIVRAISON.EN_ATTENTE,
      statut_paiement: STATUTS_PAIEMENT.NON_PAYEE,
      statut_commande: STATUTS_COMMANDE.EN_COURS,
      details_commandes: [],
      promotion: null,
      details_paiement: { ...DEFAULT_DETAILS_PAIEMENT },
      ...commandeData,
      vendeur: vendeurId,
      point_de_vente: pointDeVente,
      created_at: retroTimestamp,
      updated_at: retroTimestamp,
      details_paiement: {
        ...DEFAULT_DETAILS_PAIEMENT,
        ...commandeData.details_paiement,
        _source: SOURCE_BACK_DAY,
      },
    };

    const { data, error } = await supabase
      .from("commandes")
      .insert([newCommande])
      .select()
      .single();

    if (error) {
      return { commande: null, error };
    }

    return { commande: data, error: null };
  } catch (error) {
    return { commande: null, error };
  }
};

export const getCommandesRetroactives = async (dateStr) => {
  try {
    const commandes = await getCommandesByDate(dateStr);
    return { commandes, error: null };
  } catch (error) {
    return { commandes: [], error };
  }
};

// ============================================================================
// SYNTHÈSE JOURNALIÈRE (MODE SIMPLIFIÉ - SOLUTION A)
// ============================================================================

export const createSyntheseJournee = async (dateStr, syntheseData, userId) => {
  const validation = validateBackDayDate(dateStr);
  if (!validation.valid) {
    return { commande: null, operations: [], error: { message: validation.message } };
  }

  const { total_cash = 0, total_momo = 0, total_autre = 0, notes = "" } = syntheseData;
  const totalVentes = total_cash + total_momo + total_autre;

  if (totalVentes <= 0) {
    return {
      commande: null,
      operations: [],
      error: { message: "Le total des ventes doit être supérieur à 0." },
    };
  }

  const retroTimestamp = `${dateStr}T12:00:00.000Z`;
  const operations = [];
  const errors = [];

  const detailsPaiement = {
    total: totalVentes,
    total_apres_reduction: totalVentes,
    cash: total_cash,
    momo: total_momo,
    autre: total_autre,
    _source: SOURCE_BACK_DAY,
    _type: "synthese",
  };

  let pointDeVente = await getBaseEmplacementId();

  const commandeSynthese = {
    type: TYPES_COMMANDE.SUR_PLACE,
    client: "SYNTHESE JOURNEE",
    contact_client: "",
    contact_alternatif: "",
    lieu_livraison: null,
    instructions_livraison: notes,
    livreur: null,
    date_livraison: null,
    heure_livraison: null,
    frais_livraison: 0,
    statut_livraison: STATUTS_LIVRAISON.EN_ATTENTE,
    statut_paiement: STATUTS_PAIEMENT.PAYEE,
    statut_commande: STATUTS_COMMANDE.TERMINEE,
    details_commandes: [
      {
        item: "Synthèse des ventes du jour",
        menu_id: null,
        quantite: 1,
        prix_unitaire: totalVentes,
        total: totalVentes,
      },
    ],
    promotion: null,
    details_paiement: detailsPaiement,
    vendeur: userId,
    point_de_vente: pointDeVente,
    created_at: retroTimestamp,
    updated_at: retroTimestamp,
  };

  const { data: commandeData, error: commandeError } = await supabase
    .from("commandes")
    .insert([commandeSynthese])
    .select()
    .single();

  if (commandeError) {
    return { commande: null, operations: [], error: commandeError };
  }

  const encaissements = [
    { compte: TYPES_COMPTE.CAISSE, montant: total_cash, label: "Cash" },
    { compte: TYPES_COMPTE.MTN_MOMO, montant: total_momo, label: "MoMo" },
    { compte: TYPES_COMPTE.AUTRE, montant: total_autre, label: "Autre" },
  ];

  for (const enc of encaissements) {
    if (enc.montant <= 0) continue;

    const result = await createOperation({
      operation: TYPES_OPERATION.ENCAISSEMENT,
      compte: enc.compte,
      montant: enc.montant,
      motif: {
        motif: `Synthèse ventes du ${formatDateFr(dateStr)} (${enc.label})`,
        emplacement: "Base",
      },
      date_operation: dateStr,
      user_id: userId,
    });

    if (result.success) {
      operations.push(result.operation);
    } else {
      errors.push(`Encaissement ${enc.label}: ${result.error}`);
    }
  }

  return {
    commande: commandeData,
    operations,
    error: errors.length > 0 ? { message: errors.join(", ") } : null,
  };
};

// ============================================================================
// OPÉRATIONS COMPTABLES RÉTROACTIVES
// ============================================================================

export const createDepenseRetroactive = async (depenseData, userId) => {
  const { montant, motif, compte = TYPES_COMPTE.CAISSE, date } = depenseData;

  const validation = validateBackDayDate(date);
  if (!validation.valid) {
    return { operation: null, error: { message: validation.message } };
  }

  if (!montant || montant <= 0) {
    return { operation: null, error: { message: "Le montant doit être supérieur à 0." } };
  }

  if (!motif || typeof motif !== "object" || !motif.motif?.trim()) {
    return { operation: null, error: { message: "Le motif est requis." } };
  }

  const result = await createOperation({
    operation: TYPES_OPERATION.DEPENSE,
    compte,
    montant,
    motif,
    date_operation: date,
    user_id: userId,
  });

  if (!result.success) {
    return { operation: null, error: { message: result.error } };
  }

  return { operation: result.operation, error: null };
};

export const createEncaissementRetroactif = async (encaissementData, userId) => {
  const { montant, motif, compte = TYPES_COMPTE.CAISSE, date } = encaissementData;

  const validation = validateBackDayDate(date);
  if (!validation.valid) {
    return { operation: null, error: { message: validation.message } };
  }

  if (!montant || montant <= 0) {
    return { operation: null, error: { message: "Le montant doit être supérieur à 0." } };
  }

  if (!motif || typeof motif !== "object" || !motif.motif?.trim()) {
    return { operation: null, error: { message: "Le motif est requis." } };
  }

  const result = await createOperation({
    operation: TYPES_OPERATION.ENCAISSEMENT,
    compte,
    montant,
    motif,
    date_operation: date,
    user_id: userId,
  });

  if (!result.success) {
    return { operation: null, error: { message: result.error } };
  }

  return { operation: result.operation, error: null };
};

export const getOperationsRetroactives = async (dateStr) => {
  try {
    const [depResult, encResult] = await Promise.all([
      getOperations({
        operation: TYPES_OPERATION.DEPENSE,
        startDate: dateStr,
        endDate: dateStr,
        limit: 1000,
        offset: 0,
      }),
      getOperations({
        operation: TYPES_OPERATION.ENCAISSEMENT,
        startDate: dateStr,
        endDate: dateStr,
        limit: 1000,
        offset: 0,
      }),
    ]);

    return {
      depenses: depResult.success ? depResult.operations : [],
      encaissements: encResult.success ? encResult.operations : [],
      error: !depResult.success || !encResult.success
        ? { message: "Erreur lors du chargement des opérations." }
        : null,
    };
  } catch (error) {
    return { depenses: [], encaissements: [], error };
  }
};

// ============================================================================
// CLÔTURE RÉTROACTIVE
// ============================================================================

export const cloturerJourneeRetroactive = async (dateStr, userId, notes = "") => {
  const validation = validateBackDayDate(dateStr);
  if (!validation.valid) {
    return { closure: null, error: { message: validation.message } };
  }

  try {
    const commandes = await getCommandesByDate(dateStr);

    if (!commandes || commandes.length === 0) {
      return {
        closure: null,
        error: { message: "Aucune commande trouvée pour cette date. Ajoutez des commandes ou une synthèse avant de clôturer." },
      };
    }

    const metrics = await calculateDayMetrics(commandes);
    metrics.jour = dateStr;

    const closure = await saveDayClosure(metrics, userId, notes);

    return { closure, error: null };
  } catch (error) {
    return { closure: null, error };
  }
};

// ============================================================================
// STATUT D'UNE JOURNÉE
// ============================================================================

export const getStatutJournee = async (dateStr) => {
  try {
    const [commandes, closure, operations] = await Promise.all([
      getCommandesByDate(dateStr).catch(() => []),
      getDayClosureByDate(dateStr).catch(() => null),
      getOperationsRetroactives(dateStr).catch(() => ({ depenses: [], encaissements: [] })),
    ]);

    const commandesReelles = commandes.filter(
      (c) => c.client !== "SYNTHESE JOURNEE"
    );
    const commandesSynthese = commandes.filter(
      (c) => c.client === "SYNTHESE JOURNEE"
    );

    const totalVentes = commandes.reduce((sum, c) => {
      const total = c.details_paiement?.total_apres_reduction ?? c.details_paiement?.total ?? 0;
      return sum + total;
    }, 0);

    const nbOperations = (operations.depenses?.length || 0) + (operations.encaissements?.length || 0);

    let etat = STATUTS_JOURNEE.VIDE;
    if (closure) {
      etat = STATUTS_JOURNEE.CLOTURE;
    } else if (commandes.length > 0 || nbOperations > 0) {
      etat = STATUTS_JOURNEE.PARTIEL;
    }

    return {
      statut: {
        date: dateStr,
        etat,
        has_closure: !!closure,
        closure: closure || null,
        nb_commandes: commandesReelles.length,
        nb_commandes_synthese: commandesSynthese.length,
        nb_depenses: operations.depenses?.length || 0,
        nb_encaissements: operations.encaissements?.length || 0,
        total_ventes: totalVentes,
        total_depenses: operations.depenses?.reduce((s, o) => s + parseFloat(o.montant || 0), 0) || 0,
      },
      error: null,
    };
  } catch (error) {
    return { statut: null, error };
  }
};

export const getJourneesDisponibles = async (startDate, endDate) => {
  try {
    const { data: closures } = await supabase
      .from("days")
      .select("jour, chiffre_affaires, nombre_ventes_total")
      .gte("jour", startDate)
      .lte("jour", endDate)
      .order("jour", { ascending: false });

    const { data: commandesData } = await supabase
      .from("commandes")
      .select("created_at")
      .gte("created_at", `${startDate}T00:00:00`)
      .lte("created_at", `${endDate}T23:59:59`);

    const commandesParJour = {};
    (commandesData || []).forEach((c) => {
      const date = c.created_at.split("T")[0];
      commandesParJour[date] = (commandesParJour[date] || 0) + 1;
    });

    const closuresMap = {};
    (closures || []).forEach((c) => {
      closuresMap[c.jour] = c;
    });

    const jours = [];
    const cursor = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");
    const today = formatDateStr(new Date());

    while (cursor <= end) {
      const dateStr = formatDateStr(cursor);
      if (dateStr < today) {
        const hasClosure = !!closuresMap[dateStr];
        const nbCommandes = commandesParJour[dateStr] || 0;

        let etat = STATUTS_JOURNEE.VIDE;
        if (hasClosure) {
          etat = STATUTS_JOURNEE.CLOTURE;
        } else if (nbCommandes > 0) {
          etat = STATUTS_JOURNEE.PARTIEL;
        }

        jours.push({
          date: dateStr,
          etat,
          has_closure: hasClosure,
          nb_commandes: nbCommandes,
          chiffre_affaires: closuresMap[dateStr]?.chiffre_affaires || 0,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return { jours: jours.reverse(), error: null };
  } catch (error) {
    return { jours: [], error };
  }
};
