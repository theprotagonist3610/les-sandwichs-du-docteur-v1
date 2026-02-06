/**
 * rapportToolkit.jsx
 * Utilitaires pour la gestion des rapports journaliers
 * Architecture MVC - Couche Model/Data Access
 *
 * Schema de la table rapports:
 * {
 *   id: UUID auto-généré (PK),
 *   denomination: string (rapport_DDMMYYYY),
 *   total_ventes: number,
 *   total_encaissement: number,
 *   total_depense: number,
 *   objectifs: JSONB { ventes: number, encaissement: number, depense: number },
 *   created_at: timestamptz,
 *   updated_at: timestamptz,
 *   created_by: UUID (FK vers users),
 * }
 */

import { supabase } from "@/config/supabase";

// ============================================================================
// CONSTANTES
// ============================================================================

export const RAPPORT_PREFIX = "rapport_";

// ============================================================================
// UTILITAIRES
// ============================================================================

/**
 * Génère la dénomination d'un rapport au format rapport_DDMMYYYY
 * @param {Date|string} date - Date du rapport
 * @returns {string} Dénomination formatée
 */
export const genererDenomination = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${RAPPORT_PREFIX}${day}${month}${year}`;
};

/**
 * Extrait la date d'une dénomination de rapport
 * @param {string} denomination - Dénomination au format rapport_DDMMYYYY
 * @returns {Date|null} Date extraite ou null si invalide
 */
export const extraireDateDeDenomination = (denomination) => {
  if (!denomination || !denomination.startsWith(RAPPORT_PREFIX)) {
    return null;
  }
  const dateStr = denomination.replace(RAPPORT_PREFIX, "");
  if (dateStr.length !== 8) return null;

  const day = parseInt(dateStr.substring(0, 2), 10);
  const month = parseInt(dateStr.substring(2, 4), 10) - 1;
  const year = parseInt(dateStr.substring(4, 8), 10);

  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return null;

  return date;
};

/**
 * Calcule le pourcentage d'écart entre réalisé et objectif
 * @param {number} realise - Valeur réalisée
 * @param {number} objectif - Valeur objectif
 * @returns {number} Pourcentage d'écart (+/-)
 */
export const calculerEcartPourcentage = (realise, objectif) => {
  if (!objectif || objectif === 0) return 0;
  return Math.round(((realise - objectif) / objectif) * 100);
};

/**
 * Formate un écart en pourcentage avec signe
 * @param {number} ecart - Écart en pourcentage
 * @returns {string} Écart formaté (ex: "+15%" ou "-8%")
 */
export const formaterEcart = (ecart) => {
  if (ecart >= 0) return `+${ecart}%`;
  return `${ecart}%`;
};

// ============================================================================
// CRÉATION
// ============================================================================

/**
 * Créer un nouveau rapport journalier
 * @param {Object} rapportData - Données du rapport
 * @param {string} rapportData.date - Date du rapport (YYYY-MM-DD)
 * @param {number} rapportData.total_ventes - Total des ventes
 * @param {number} rapportData.total_encaissement - Total des encaissements
 * @param {number} rapportData.total_depense - Total des dépenses
 * @param {Object} rapportData.objectifs - Objectifs { ventes, encaissement, depense }
 * @param {string} userId - ID de l'utilisateur créateur
 * @returns {Promise<{success: boolean, rapport?: Object, error?: string}>}
 */
export const createRapport = async (rapportData, userId) => {
  try {
    // Validation des données
    if (!rapportData.date) {
      return {
        success: false,
        error: "La date du rapport est requise",
      };
    }

    if (rapportData.total_ventes === undefined || rapportData.total_ventes < 0) {
      return {
        success: false,
        error: "Le total des ventes doit être un nombre positif",
      };
    }

    if (rapportData.total_encaissement === undefined || rapportData.total_encaissement < 0) {
      return {
        success: false,
        error: "Le total des encaissements doit être un nombre positif",
      };
    }

    if (rapportData.total_depense === undefined || rapportData.total_depense < 0) {
      return {
        success: false,
        error: "Le total des dépenses doit être un nombre positif",
      };
    }

    // Générer la dénomination
    const denomination = genererDenomination(rapportData.date);

    // Vérifier si un rapport existe déjà pour cette date
    const { data: existingRapport } = await supabase
      .from("rapports")
      .select("id")
      .eq("denomination", denomination)
      .single();

    if (existingRapport) {
      return {
        success: false,
        error: `Un rapport existe déjà pour cette date (${denomination})`,
      };
    }

    // Calculer les écarts si objectifs fournis
    const objectifs = rapportData.objectifs || {};
    const objectifsAvecEcarts = {
      ventes: calculerEcartPourcentage(rapportData.total_ventes, objectifs.ventes || 0),
      encaissement: calculerEcartPourcentage(rapportData.total_encaissement, objectifs.encaissement || 0),
      depense: calculerEcartPourcentage(rapportData.total_depense, objectifs.depense || 0),
    };

    // Créer le rapport
    const { data, error } = await supabase
      .from("rapports")
      .insert({
        denomination,
        total_ventes: rapportData.total_ventes,
        total_encaissement: rapportData.total_encaissement,
        total_depense: rapportData.total_depense,
        objectifs: objectifsAvecEcarts,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur création rapport:", error);
      return {
        success: false,
        error: error.message || "Erreur lors de la création du rapport",
      };
    }

    return {
      success: true,
      rapport: data,
    };
  } catch (error) {
    console.error("Erreur createRapport:", error);
    return {
      success: false,
      error: error.message || "Erreur inattendue lors de la création du rapport",
    };
  }
};

// ============================================================================
// LECTURE
// ============================================================================

/**
 * Récupérer un rapport par son ID
 * @param {string} rapportId - ID du rapport
 * @returns {Promise<{success: boolean, rapport?: Object, error?: string}>}
 */
export const getRapportById = async (rapportId) => {
  try {
    if (!rapportId) {
      return {
        success: false,
        error: "L'ID du rapport est requis",
      };
    }

    const { data, error } = await supabase
      .from("rapports")
      .select(`
        *,
        createur:users!created_by(id, nom, prenoms)
      `)
      .eq("id", rapportId)
      .single();

    if (error) {
      console.error("Erreur getRapportById:", error);
      return {
        success: false,
        error: error.message || "Erreur lors de la récupération du rapport",
      };
    }

    if (!data) {
      return {
        success: false,
        error: "Rapport non trouvé",
      };
    }

    return {
      success: true,
      rapport: data,
    };
  } catch (error) {
    console.error("Erreur getRapportById:", error);
    return {
      success: false,
      error: error.message || "Erreur inattendue",
    };
  }
};

/**
 * Récupérer un rapport par sa dénomination
 * @param {string} denomination - Dénomination du rapport (rapport_DDMMYYYY)
 * @returns {Promise<{success: boolean, rapport?: Object, error?: string}>}
 */
export const getRapportByDenomination = async (denomination) => {
  try {
    if (!denomination) {
      return {
        success: false,
        error: "La dénomination du rapport est requise",
      };
    }

    const { data, error } = await supabase
      .from("rapports")
      .select(`
        *,
        createur:users!created_by(id, nom, prenoms)
      `)
      .eq("denomination", denomination)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Erreur getRapportByDenomination:", error);
      return {
        success: false,
        error: error.message || "Erreur lors de la récupération du rapport",
      };
    }

    return {
      success: true,
      rapport: data || null,
    };
  } catch (error) {
    console.error("Erreur getRapportByDenomination:", error);
    return {
      success: false,
      error: error.message || "Erreur inattendue",
    };
  }
};

/**
 * Récupérer un rapport par date
 * @param {string} date - Date au format YYYY-MM-DD
 * @returns {Promise<{success: boolean, rapport?: Object, error?: string}>}
 */
export const getRapportByDate = async (date) => {
  const denomination = genererDenomination(date);
  return getRapportByDenomination(denomination);
};

/**
 * Récupérer tous les rapports avec pagination
 * @param {number} limit - Nombre de résultats par page
 * @param {number} offset - Décalage pour la pagination
 * @returns {Promise<{success: boolean, rapports?: Array, total?: number, error?: string}>}
 */
export const getAllRapports = async (limit = 30, offset = 0) => {
  try {
    // Récupérer les rapports
    const { data, error, count } = await supabase
      .from("rapports")
      .select(`
        *,
        createur:users!created_by(id, nom, prenoms)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Erreur getAllRapports:", error);
      return {
        success: false,
        error: error.message || "Erreur lors de la récupération des rapports",
      };
    }

    return {
      success: true,
      rapports: data || [],
      total: count || 0,
    };
  } catch (error) {
    console.error("Erreur getAllRapports:", error);
    return {
      success: false,
      error: error.message || "Erreur inattendue",
    };
  }
};

/**
 * Filtrer les rapports par période
 * @param {string} dateDebut - Date de début (YYYY-MM-DD)
 * @param {string} dateFin - Date de fin (YYYY-MM-DD)
 * @returns {Promise<{success: boolean, rapports?: Array, error?: string}>}
 */
export const getRapportsByPeriode = async (dateDebut, dateFin) => {
  try {
    if (!dateDebut || !dateFin) {
      return {
        success: false,
        error: "Les dates de début et de fin sont requises",
      };
    }

    const startOfDay = `${dateDebut}T00:00:00`;
    const endOfDay = `${dateFin}T23:59:59`;

    const { data, error } = await supabase
      .from("rapports")
      .select(`
        *,
        createur:users!created_by(id, nom, prenoms)
      `)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur getRapportsByPeriode:", error);
      return {
        success: false,
        error: error.message || "Erreur lors de la récupération des rapports",
      };
    }

    return {
      success: true,
      rapports: data || [],
    };
  } catch (error) {
    console.error("Erreur getRapportsByPeriode:", error);
    return {
      success: false,
      error: error.message || "Erreur inattendue",
    };
  }
};

/**
 * Filtrer les rapports par objectifs (performance)
 * @param {string} typeObjectif - Type d'objectif (ventes, encaissement, depense)
 * @param {string} comparaison - Type de comparaison (positif, negatif, tous)
 * @returns {Promise<{success: boolean, rapports?: Array, error?: string}>}
 */
export const getRapportsByObjectif = async (typeObjectif, comparaison = "tous") => {
  try {
    const validTypes = ["ventes", "encaissement", "depense"];
    if (!validTypes.includes(typeObjectif)) {
      return {
        success: false,
        error: `Type d'objectif invalide. Valeurs acceptées: ${validTypes.join(", ")}`,
      };
    }

    const { data, error } = await supabase
      .from("rapports")
      .select(`
        *,
        createur:users!created_by(id, nom, prenoms)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur getRapportsByObjectif:", error);
      return {
        success: false,
        error: error.message || "Erreur lors de la récupération des rapports",
      };
    }

    // Filtrer selon la performance
    let rapportsFiltres = data || [];

    if (comparaison === "positif") {
      rapportsFiltres = rapportsFiltres.filter(
        (r) => r.objectifs && r.objectifs[typeObjectif] >= 0
      );
    } else if (comparaison === "negatif") {
      rapportsFiltres = rapportsFiltres.filter(
        (r) => r.objectifs && r.objectifs[typeObjectif] < 0
      );
    }

    return {
      success: true,
      rapports: rapportsFiltres,
    };
  } catch (error) {
    console.error("Erreur getRapportsByObjectif:", error);
    return {
      success: false,
      error: error.message || "Erreur inattendue",
    };
  }
};

// ============================================================================
// MISE À JOUR
// ============================================================================

/**
 * Mettre à jour un rapport existant
 * @param {string} rapportId - ID du rapport à mettre à jour
 * @param {Object} updateData - Données à mettre à jour
 * @returns {Promise<{success: boolean, rapport?: Object, error?: string}>}
 */
export const updateRapport = async (rapportId, updateData) => {
  try {
    if (!rapportId) {
      return {
        success: false,
        error: "L'ID du rapport est requis",
      };
    }

    // Vérifier que le rapport existe
    const { data: existingRapport, error: checkError } = await supabase
      .from("rapports")
      .select("id")
      .eq("id", rapportId)
      .single();

    if (checkError || !existingRapport) {
      return {
        success: false,
        error: "Rapport non trouvé",
      };
    }

    // Préparer les données de mise à jour
    const dataToUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (updateData.total_ventes !== undefined) {
      dataToUpdate.total_ventes = updateData.total_ventes;
    }
    if (updateData.total_encaissement !== undefined) {
      dataToUpdate.total_encaissement = updateData.total_encaissement;
    }
    if (updateData.total_depense !== undefined) {
      dataToUpdate.total_depense = updateData.total_depense;
    }
    if (updateData.objectifs !== undefined) {
      dataToUpdate.objectifs = updateData.objectifs;
    }

    // Mettre à jour le rapport
    const { data, error } = await supabase
      .from("rapports")
      .update(dataToUpdate)
      .eq("id", rapportId)
      .select(`
        *,
        createur:users!created_by(id, nom, prenoms)
      `)
      .single();

    if (error) {
      console.error("Erreur updateRapport:", error);
      return {
        success: false,
        error: error.message || "Erreur lors de la mise à jour du rapport",
      };
    }

    return {
      success: true,
      rapport: data,
    };
  } catch (error) {
    console.error("Erreur updateRapport:", error);
    return {
      success: false,
      error: error.message || "Erreur inattendue",
    };
  }
};

// ============================================================================
// SUPPRESSION
// ============================================================================

/**
 * Supprimer un rapport
 * @param {string} rapportId - ID du rapport à supprimer
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteRapport = async (rapportId) => {
  try {
    if (!rapportId) {
      return {
        success: false,
        error: "L'ID du rapport est requis",
      };
    }

    const { error } = await supabase
      .from("rapports")
      .delete()
      .eq("id", rapportId);

    if (error) {
      console.error("Erreur deleteRapport:", error);
      return {
        success: false,
        error: error.message || "Erreur lors de la suppression du rapport",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Erreur deleteRapport:", error);
    return {
      success: false,
      error: error.message || "Erreur inattendue",
    };
  }
};

// ============================================================================
// STATISTIQUES ET AGRÉGATIONS
// ============================================================================

/**
 * Calculer les statistiques sur une période
 * @param {string} dateDebut - Date de début (YYYY-MM-DD)
 * @param {string} dateFin - Date de fin (YYYY-MM-DD)
 * @returns {Promise<{success: boolean, stats?: Object, error?: string}>}
 */
export const getStatistiquesPeriode = async (dateDebut, dateFin) => {
  try {
    const result = await getRapportsByPeriode(dateDebut, dateFin);

    if (!result.success) {
      return result;
    }

    const rapports = result.rapports;

    if (rapports.length === 0) {
      return {
        success: false,
        error: "Aucun rapport trouvé pour cette période",
      };
    }

    // Calculer les statistiques
    const stats = {
      periode: {
        debut: dateDebut,
        fin: dateFin,
        nombre_rapports: rapports.length,
      },
      ventes: {
        total: rapports.reduce((sum, r) => sum + (r.total_ventes || 0), 0),
        moyenne: 0,
        min: Math.min(...rapports.map((r) => r.total_ventes || 0)),
        max: Math.max(...rapports.map((r) => r.total_ventes || 0)),
      },
      encaissements: {
        total: rapports.reduce((sum, r) => sum + (r.total_encaissement || 0), 0),
        moyenne: 0,
        min: Math.min(...rapports.map((r) => r.total_encaissement || 0)),
        max: Math.max(...rapports.map((r) => r.total_encaissement || 0)),
      },
      depenses: {
        total: rapports.reduce((sum, r) => sum + (r.total_depense || 0), 0),
        moyenne: 0,
        min: Math.min(...rapports.map((r) => r.total_depense || 0)),
        max: Math.max(...rapports.map((r) => r.total_depense || 0)),
      },
      objectifs: {
        ventes_positifs: rapports.filter((r) => r.objectifs?.ventes >= 0).length,
        ventes_negatifs: rapports.filter((r) => r.objectifs?.ventes < 0).length,
        encaissement_positifs: rapports.filter((r) => r.objectifs?.encaissement >= 0).length,
        encaissement_negatifs: rapports.filter((r) => r.objectifs?.encaissement < 0).length,
        depense_positifs: rapports.filter((r) => r.objectifs?.depense >= 0).length,
        depense_negatifs: rapports.filter((r) => r.objectifs?.depense < 0).length,
      },
    };

    // Calculer les moyennes
    stats.ventes.moyenne = Math.round(stats.ventes.total / rapports.length);
    stats.encaissements.moyenne = Math.round(stats.encaissements.total / rapports.length);
    stats.depenses.moyenne = Math.round(stats.depenses.total / rapports.length);

    return {
      success: true,
      stats,
    };
  } catch (error) {
    console.error("Erreur getStatistiquesPeriode:", error);
    return {
      success: false,
      error: error.message || "Erreur inattendue",
    };
  }
};

/**
 * Générer un rapport automatique à partir des données du jour
 * @param {string} date - Date au format YYYY-MM-DD
 * @param {Object} donnees - Données calculées { total_ventes, total_encaissement, total_depense }
 * @param {Object} objectifs - Objectifs prévus { ventes, encaissement, depense }
 * @param {string} userId - ID de l'utilisateur créateur
 * @returns {Promise<{success: boolean, rapport?: Object, error?: string}>}
 */
export const genererRapportAutomatique = async (date, donnees, objectifs, userId) => {
  try {
    // Vérifier si un rapport existe déjà
    const existingResult = await getRapportByDate(date);

    if (existingResult.rapport) {
      // Mettre à jour le rapport existant
      return updateRapport(existingResult.rapport.id, {
        total_ventes: donnees.total_ventes,
        total_encaissement: donnees.total_encaissement,
        total_depense: donnees.total_depense,
        objectifs: {
          ventes: calculerEcartPourcentage(donnees.total_ventes, objectifs.ventes),
          encaissement: calculerEcartPourcentage(donnees.total_encaissement, objectifs.encaissement),
          depense: calculerEcartPourcentage(donnees.total_depense, objectifs.depense),
        },
      });
    }

    // Créer un nouveau rapport
    return createRapport(
      {
        date,
        total_ventes: donnees.total_ventes,
        total_encaissement: donnees.total_encaissement,
        total_depense: donnees.total_depense,
        objectifs,
      },
      userId
    );
  } catch (error) {
    console.error("Erreur genererRapportAutomatique:", error);
    return {
      success: false,
      error: error.message || "Erreur inattendue",
    };
  }
};

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Exporter les rapports en format JSON
 * @param {Array} rapports - Liste des rapports à exporter
 * @returns {string} JSON formaté
 */
export const exporterRapportsJSON = (rapports) => {
  return JSON.stringify(rapports, null, 2);
};

/**
 * Exporter les rapports en format CSV
 * @param {Array} rapports - Liste des rapports à exporter
 * @returns {string} CSV formaté
 */
export const exporterRapportsCSV = (rapports) => {
  if (!rapports || rapports.length === 0) return "";

  const headers = [
    "Dénomination",
    "Total Ventes",
    "Total Encaissement",
    "Total Dépense",
    "Écart Ventes (%)",
    "Écart Encaissement (%)",
    "Écart Dépense (%)",
    "Date Création",
  ];

  const rows = rapports.map((r) => [
    r.denomination,
    r.total_ventes,
    r.total_encaissement,
    r.total_depense,
    r.objectifs?.ventes || 0,
    r.objectifs?.encaissement || 0,
    r.objectifs?.depense || 0,
    new Date(r.created_at).toLocaleDateString("fr-FR"),
  ]);

  const csvContent = [
    headers.join(";"),
    ...rows.map((row) => row.join(";")),
  ].join("\n");

  return csvContent;
};
