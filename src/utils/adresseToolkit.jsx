import { supabase } from "@/config/supabase";
import adresseListeData from "@/assets/adresse_liste.js";

/**
 * Toolkit de gestion des adresses
 *
 * Schema d'une adresse:
 * {
 *   id: UUID (auto-généré),
 *   departement: string,
 *   commune: string,
 *   arrondissement: string,
 *   quartier: string,
 *   localisation: JSON { lat: number, lng: number },
 *   is_active: boolean (par défaut true),
 *   created_at: timestamp,
 *   updated_at: timestamp
 * }
 */

// ==================== CRUD Operations ====================

/**
 * Cr�er une nouvelle adresse
 * @param {Object} adresseData - Donn�es de l'adresse
 * @returns {Promise<{adresse, error}>}
 */
export const createAdresse = async (adresseData) => {
  try {
    const { data, error } = await supabase
      .from("adresses")
      .insert([
        {
          departement: adresseData.departement,
          commune: adresseData.commune,
          arrondissement: adresseData.arrondissement,
          quartier: adresseData.quartier,
          localisation: adresseData.localisation || null,
          is_active: adresseData.is_active !== undefined ? adresseData.is_active : true,
        },
      ])
      .select()
      .single();

    return { adresse: data, error };
  } catch (error) {
    console.error("Erreur lors de la cr�ation de l'adresse:", error);
    return { adresse: null, error };
  }
};

/**
 * Récupérer toutes les adresses
 * @param {Object} options - Options de filtrage
 * @param {boolean} options.includeInactive - Inclure les adresses inactives (par défaut false)
 * @returns {Promise<{adresses, error}>}
 */
export const getAllAdresses = async (options = {}) => {
  try {
    let query = supabase
      .from("adresses")
      .select("*")
      .order("created_at", { ascending: false });

    // Par défaut, ne récupérer que les adresses actives
    if (!options.includeInactive) {
      query = query.eq("is_active", true);
    }

    // Filtrer par statut actif si spécifié
    if (typeof options.isActive === "boolean") {
      query = query.eq("is_active", options.isActive);
    }

    // Filtrer par département si spécifié
    if (options.departement) {
      query = query.ilike("departement", `%${options.departement}%`);
    }

    // Filtrer par commune si spécifié
    if (options.commune) {
      query = query.ilike("commune", `%${options.commune}%`);
    }

    // Filtrer par arrondissement si spécifié
    if (options.arrondissement) {
      query = query.ilike("arrondissement", `%${options.arrondissement}%`);
    }

    // Filtrer par quartier si spécifié
    if (options.quartier) {
      query = query.ilike("quartier", `%${options.quartier}%`);
    }

    const { data, error } = await query;

    return { adresses: data || [], error };
  } catch (error) {
    console.error("Erreur lors de la r�cup�ration des adresses:", error);
    return { adresses: [], error };
  }
};

/**
 * R�cup�rer une adresse par ID
 * @param {string} adresseId - ID de l'adresse
 * @returns {Promise<{adresse, error}>}
 */
export const getAdresseById = async (adresseId) => {
  try {
    const { data, error } = await supabase
      .from("adresses")
      .select("*")
      .eq("id", adresseId)
      .single();

    return { adresse: data, error };
  } catch (error) {
    console.error("Erreur lors de la r�cup�ration de l'adresse:", error);
    return { adresse: null, error };
  }
};

/**
 * Mettre � jour une adresse
 * @param {string} adresseId - ID de l'adresse
 * @param {Object} updates - Donn�es � mettre � jour
 * @returns {Promise<{adresse, error}>}
 */
export const updateAdresse = async (adresseId, updates) => {
  try {
    const { id, created_at, updated_at, ...safeUpdates } = updates;

    const { data, error } = await supabase
      .from("adresses")
      .update(safeUpdates)
      .eq("id", adresseId)
      .select()
      .single();

    return { adresse: data, error };
  } catch (error) {
    console.error("Erreur lors de la mise � jour de l'adresse:", error);
    return { adresse: null, error };
  }
};

/**
 * Désactiver une adresse (soft delete)
 * @param {string} adresseId - ID de l'adresse
 * @returns {Promise<{error}>}
 */
export const deactivateAdresse = async (adresseId) => {
  try {
    const { error } = await supabase
      .from("adresses")
      .update({ is_active: false })
      .eq("id", adresseId);

    return { error };
  } catch (error) {
    console.error("Erreur lors de la désactivation de l'adresse:", error);
    return { error };
  }
};

/**
 * Activer une adresse
 * @param {string} adresseId - ID de l'adresse
 * @returns {Promise<{error}>}
 */
export const activateAdresse = async (adresseId) => {
  try {
    const { error } = await supabase
      .from("adresses")
      .update({ is_active: true })
      .eq("id", adresseId);

    return { error };
  } catch (error) {
    console.error("Erreur lors de l'activation de l'adresse:", error);
    return { error };
  }
};

/**
 * Supprimer définitivement une adresse (hard delete - à utiliser avec précaution)
 * @param {string} adresseId - ID de l'adresse
 * @returns {Promise<{error}>}
 */
export const deleteAdressePermanently = async (adresseId) => {
  try {
    const { error } = await supabase
      .from("adresses")
      .delete()
      .eq("id", adresseId);

    return { error };
  } catch (error) {
    console.error("Erreur lors de la suppression définitive de l'adresse:", error);
    return { error };
  }
};

// ==================== Recherche et Filtrage ====================

/**
 * Rechercher des adresses par terme de recherche
 * @param {string} searchTerm - Terme de recherche
 * @param {boolean} includeInactive - Inclure les adresses inactives (par défaut false)
 * @returns {Promise<{adresses, error}>}
 */
export const searchAdresses = async (searchTerm, includeInactive = false) => {
  try {
    let query = supabase
      .from("adresses")
      .select("*")
      .or(
        `departement.ilike.%${searchTerm}%,commune.ilike.%${searchTerm}%,arrondissement.ilike.%${searchTerm}%,quartier.ilike.%${searchTerm}%`
      );

    // Par défaut, ne rechercher que dans les adresses actives
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    return { adresses: data || [], error };
  } catch (error) {
    console.error("Erreur lors de la recherche d'adresses:", error);
    return { adresses: [], error };
  }
};

/**
 * Calculer la distance entre deux points GPS (formule Haversine)
 * @param {number} lat1 - Latitude du point 1
 * @param {number} lng1 - Longitude du point 1
 * @param {number} lat2 - Latitude du point 2
 * @param {number} lng2 - Longitude du point 2
 * @returns {number} Distance en kilom�tres
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Filtrer les adresses par proximité géographique
 * @param {number} lat - Latitude du point de référence
 * @param {number} lng - Longitude du point de référence
 * @param {number} radius - Rayon en kilomètres
 * @param {boolean} includeInactive - Inclure les adresses inactives (par défaut false)
 * @returns {Promise<{adresses, error}>}
 */
export const getAdressesByProximity = async (lat, lng, radius = 5, includeInactive = false) => {
  try {
    // Récupérer toutes les adresses qui ont une localisation
    let query = supabase
      .from("adresses")
      .select("*")
      .not("localisation", "is", null);

    // Par défaut, ne récupérer que les adresses actives
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      return { adresses: [], error };
    }

    // Filtrer localement par distance
    const adressesProches = data.filter((adresse) => {
      if (!adresse.localisation) return false;

      const distance = calculateDistance(
        lat,
        lng,
        adresse.localisation.lat,
        adresse.localisation.lng
      );

      return distance <= radius;
    });

    // Ajouter la distance � chaque adresse pour le tri
    const adressesAvecDistance = adressesProches.map((adresse) => ({
      ...adresse,
      distance: calculateDistance(
        lat,
        lng,
        adresse.localisation.lat,
        adresse.localisation.lng
      ),
    }));

    // Trier par distance croissante
    adressesAvecDistance.sort((a, b) => a.distance - b.distance);

    return { adresses: adressesAvecDistance, error: null };
  } catch (error) {
    console.error(
      "Erreur lors de la recherche d'adresses par proximit�:",
      error
    );
    return { adresses: [], error };
  }
};

/**
 * R�cup�rer toutes les adresses group�es par d�partement
 * @returns {Promise<{groupedAdresses, error}>}
 */
export const getAdressesGroupedByDepartement = async () => {
  try {
    const { data, error } = await supabase
      .from("adresses")
      .select("*")
      .order("departement", { ascending: true });

    if (error) {
      return { groupedAdresses: {}, error };
    }

    // Grouper par d�partement
    const grouped = data.reduce((acc, adresse) => {
      const dept = adresse.departement || "Non sp�cifi�";
      if (!acc[dept]) {
        acc[dept] = [];
      }
      acc[dept].push(adresse);
      return acc;
    }, {});

    return { groupedAdresses: grouped, error: null };
  } catch (error) {
    console.error("Erreur lors du groupement des adresses:", error);
    return { groupedAdresses: {}, error };
  }
};

// ==================== G�ocodage avec Nominatim ====================

/**
 * G�ocoder une adresse avec l'API Nominatim (OpenStreetMap)
 * @param {Object} adresse - Objet adresse {departement, commune, arrondissement, quartier}
 * @returns {Promise<{lat, lng, error}>}
 */
export const geocodeAdresse = async (adresse) => {
  try {
    // Construire la requ�te de recherche
    const searchQuery = [
      adresse.quartier,
      adresse.arrondissement,
      adresse.commune,
      adresse.departement,
      "Benin", // Pays
    ]
      .filter(Boolean)
      .join(", ");

    // Appel � l'API Nominatim avec d�lai pour respecter les limites
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: searchQuery,
          format: "json",
          limit: 1,
          countrycodes: "bj", // Code pays B�nin
        }),
      {
        headers: {
          "User-Agent": "Les Sandwichs du Docteur PWA",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Erreur lors de l'appel � l'API Nominatim");
    }

    const data = await response.json();

    if (data.length === 0) {
      return {
        lat: null,
        lng: null,
        error: { message: "Aucune coordonn�e trouv�e pour cette adresse" },
      };
    }

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      error: null,
    };
  } catch (error) {
    console.error("Erreur lors du g�ocodage de l'adresse:", error);
    return { lat: null, lng: null, error };
  }
};

/**
 * D�lai entre les appels API (pour respecter les limites de Nominatim: 1 req/sec)
 * @param {number} ms - Millisecondes
 * @returns {Promise}
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Initialiser la base de donn�es avec les adresses depuis adresse_liste.js
 * Cette fonction g�ocode chaque adresse et l'ins�re dans la BDD
 * @param {Function} onProgress - Callback pour suivre la progression (current, total, adresse)
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
export const initializeAdressesFromFile = async (onProgress = null) => {
  try {
    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    // R�cup�rer la liste des adresses depuis le fichier
    const adressesList = adresseListeData.default || adresseListeData;

    // Aplatir la structure (d�partements > liste)
    const allAdresses = [];
    adressesList.forEach((dept) => {
      if (dept.liste && Array.isArray(dept.liste)) {
        allAdresses.push(...dept.liste);
      }
    });

    const total = allAdresses.length;
    console.log(`Initialisation de ${total} adresses...`);

    // Traiter chaque adresse
    for (let i = 0; i < allAdresses.length; i++) {
      const adresse = allAdresses[i];

      try {
        // V�rifier si l'adresse existe d�j�
        const { data: existing } = await supabase
          .from("adresses")
          .select("id")
          .eq("departement", adresse.departement)
          .eq("commune", adresse.commune)
          .eq("arrondissement", adresse.arrondissement)
          .eq("quartier", adresse.quartier)
          .single();

        if (existing) {
          console.log(
            `Adresse d�j� existante: ${adresse.quartier}, ${adresse.commune}`
          );
          successCount++;
          if (onProgress) onProgress(i + 1, total, adresse);
          continue;
        }

        // G�ocoder l'adresse
        const { lat, lng, error: geocodeError } = await geocodeAdresse(adresse);

        if (geocodeError) {
          console.warn(
            `G�ocodage �chou� pour ${adresse.quartier}, ${adresse.commune}:`,
            geocodeError
          );
        }

        // Ins�rer l'adresse dans la BDD
        const { error: insertError } = await createAdresse({
          ...adresse,
          localisation: lat && lng ? { lat, lng } : null,
        });

        if (insertError) {
          failedCount++;
          errors.push({
            adresse,
            error: insertError.message,
          });
          console.error(
            `Erreur insertion ${adresse.quartier}, ${adresse.commune}:`,
            insertError
          );
        } else {
          successCount++;
          console.log(
            ` ${adresse.quartier}, ${adresse.commune} (${lat}, ${lng})`
          );
        }

        // Callback de progression
        if (onProgress) {
          onProgress(i + 1, total, adresse);
        }

        // D�lai de 1 seconde entre chaque requ�te (limite Nominatim)
        await delay(1000);
      } catch (error) {
        failedCount++;
        errors.push({
          adresse,
          error: error.message,
        });
        console.error(`Erreur traitement ${adresse.quartier}:`, error);
      }
    }

    console.log(
      `Initialisation termin�e: ${successCount} r�ussies, ${failedCount} �chou�es`
    );

    return {
      success: successCount,
      failed: failedCount,
      errors,
    };
  } catch (error) {
    console.error("Erreur lors de l'initialisation des adresses:", error);
    return {
      success: 0,
      failed: 0,
      errors: [{ error: error.message }],
    };
  }
};

// ==================== Export des donn�es ====================

/**
 * Exporter les adresses au format CSV
 * @param {Array} adresses - Liste des adresses � exporter
 * @returns {string} Contenu CSV
 */
export const exportAdressesToCSV = (adresses) => {
  try {
    // En-t�tes
    const headers = [
      "ID",
      "D�partement",
      "Commune",
      "Arrondissement",
      "Quartier",
      "Latitude",
      "Longitude",
      "Date de cr�ation",
    ];

    // Lignes de donn�es
    const rows = adresses.map((adresse) => [
      adresse.id,
      adresse.departement || "",
      adresse.commune || "",
      adresse.arrondissement || "",
      adresse.quartier || "",
      adresse.localisation?.lat || "",
      adresse.localisation?.lng || "",
      new Date(adresse.created_at).toLocaleString("fr-FR"),
    ]);

    // Combiner en CSV
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return csv;
  } catch (error) {
    console.error("Erreur lors de l'export CSV:", error);
    return "";
  }
};

/**
 * T�l�charger les adresses au format CSV
 * @param {Array} adresses - Liste des adresses � exporter
 * @param {string} filename - Nom du fichier
 */
export const downloadAdressesAsCSV = (
  adresses,
  filename = "adresses.csv"
) => {
  const csv = exportAdressesToCSV(adresses);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exporter les adresses au format JSON
 * @param {Array} adresses - Liste des adresses � exporter
 * @returns {string} Contenu JSON
 */
export const exportAdressesToJSON = (adresses) => {
  try {
    return JSON.stringify(adresses, null, 2);
  } catch (error) {
    console.error("Erreur lors de l'export JSON:", error);
    return "[]";
  }
};

/**
 * T�l�charger les adresses au format JSON
 * @param {Array} adresses - Liste des adresses � exporter
 * @param {string} filename - Nom du fichier
 */
export const downloadAdressesAsJSON = (
  adresses,
  filename = "adresses.json"
) => {
  const json = exportAdressesToJSON(adresses);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ==================== Utilitaires ====================

/**
 * R�cup�rer les statistiques des adresses
 * @returns {Promise<{stats, error}>}
 */
export const getAdressesStats = async () => {
  try {
    const { data, error } = await supabase
      .from("adresses")
      .select("*");

    if (error) {
      return { stats: null, error };
    }

    const stats = {
      total: data.length,
      active: data.filter((a) => a.is_active).length,
      inactive: data.filter((a) => !a.is_active).length,
      withLocation: data.filter((a) => a.localisation).length,
      withoutLocation: data.filter((a) => !a.localisation).length,
      byDepartement: {},
      byCommune: {},
    };

    // Compter par département
    data.forEach((adresse) => {
      const dept = adresse.departement || "Non spécifié";
      stats.byDepartement[dept] = (stats.byDepartement[dept] || 0) + 1;

      const commune = adresse.commune || "Non spécifié";
      stats.byCommune[commune] = (stats.byCommune[commune] || 0) + 1;
    });

    return { stats, error: null };
  } catch (error) {
    console.error("Erreur lors du calcul des statistiques:", error);
    return { stats: null, error };
  }
};

/**
 * Obtenir les d�partements uniques
 * @returns {Promise<{departements, error}>}
 */
export const getUniqueDepartements = async () => {
  try {
    const { data, error } = await supabase
      .from("adresses")
      .select("departement")
      .order("departement", { ascending: true });

    if (error) {
      return { departements: [], error };
    }

    const unique = [...new Set(data.map((a) => a.departement).filter(Boolean))];
    return { departements: unique, error: null };
  } catch (error) {
    console.error("Erreur lors de la r�cup�ration des d�partements:", error);
    return { departements: [], error };
  }
};

/**
 * Obtenir les communes uniques d'un d�partement
 * @param {string} departement - Nom du d�partement
 * @returns {Promise<{communes, error}>}
 */
export const getCommunesByDepartement = async (departement) => {
  try {
    let query = supabase
      .from("adresses")
      .select("commune")
      .order("commune", { ascending: true });

    if (departement) {
      query = query.eq("departement", departement);
    }

    const { data, error } = await query;

    if (error) {
      return { communes: [], error };
    }

    const unique = [...new Set(data.map((a) => a.commune).filter(Boolean))];
    return { communes: unique, error: null };
  } catch (error) {
    console.error("Erreur lors de la r�cup�ration des communes:", error);
    return { communes: [], error };
  }
};

/**
 * Obtenir les arrondissements uniques d'une commune
 * @param {string} commune - Nom de la commune
 * @returns {Promise<{arrondissements, error}>}
 */
export const getArrondissementsByCommune = async (commune) => {
  try {
    let query = supabase
      .from("adresses")
      .select("arrondissement")
      .order("arrondissement", { ascending: true });

    if (commune) {
      query = query.eq("commune", commune);
    }

    const { data, error } = await query;

    if (error) {
      return { arrondissements: [], error };
    }

    const unique = [
      ...new Set(data.map((a) => a.arrondissement).filter(Boolean)),
    ];
    return { arrondissements: unique, error: null };
  } catch (error) {
    console.error("Erreur lors de la r�cup�ration des arrondissements:", error);
    return { arrondissements: [], error };
  }
};

/**
 * Obtenir les quartiers uniques d'un arrondissement
 * @param {string} arrondissement - Nom de l'arrondissement
 * @returns {Promise<{quartiers, error}>}
 */
export const getQuartiersByArrondissement = async (arrondissement) => {
  try {
    let query = supabase
      .from("adresses")
      .select("quartier")
      .order("quartier", { ascending: true });

    if (arrondissement) {
      query = query.eq("arrondissement", arrondissement);
    }

    const { data, error } = await query;

    if (error) {
      return { quartiers: [], error };
    }

    const unique = [...new Set(data.map((a) => a.quartier).filter(Boolean))];
    return { quartiers: unique, error: null };
  } catch (error) {
    console.error("Erreur lors de la r�cup�ration des quartiers:", error);
    return { quartiers: [], error };
  }
};

export default {
  // CRUD
  createAdresse,
  getAllAdresses,
  getAdresseById,
  updateAdresse,
  deactivateAdresse,
  activateAdresse,
  deleteAdressePermanently,

  // Recherche et filtrage
  searchAdresses,
  getAdressesByProximity,
  getAdressesGroupedByDepartement,
  calculateDistance,

  // Géocodage
  geocodeAdresse,
  initializeAdressesFromFile,

  // Export
  exportAdressesToCSV,
  downloadAdressesAsCSV,
  exportAdressesToJSON,
  downloadAdressesAsJSON,

  // Utilitaires
  getAdressesStats,
  getUniqueDepartements,
  getCommunesByDepartement,
  getArrondissementsByCommune,
  getQuartiersByArrondissement,
};
