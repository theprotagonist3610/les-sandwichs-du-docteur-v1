import { supabase } from "@/config/supabase";

/**
 * Toolkit de gestion des emplacements
 * G�re les emplacements (points de vente) avec permissions bas�es sur les r�les
 *
 * Schema:
 * {
 *   id: uuid,
 *   nom: string,
 *   type: enum('base', 'stand', 'kiosque', 'boutique'),
 *   adresse: JSON({
 *     departement: string,
 *     commune: string,
 *     arrondissement: string,
 *     quartier: string,
 *     localisation: {lat: number, lng: number}
 *   }),
 *   responsable_id: uuid,
 *   horaires: JSON({
 *     lundi: {ouverture: "08:00", fermeture: "18:00"},
 *     mardi: {...},
 *     ...
 *   }),
 *   statut: enum('actif', 'inactif', 'ferme_temporairement'),
 *   created_at: timestamp,
 *   updated_at: timestamp
 * }
 */

/**
 * Horaires par d�faut pour un emplacement
 */
export const DEFAULT_HORAIRES = {
  lundi: { ouverture: "08:00", fermeture: "18:00" },
  mardi: { ouverture: "08:00", fermeture: "18:00" },
  mercredi: { ouverture: "08:00", fermeture: "18:00" },
  jeudi: { ouverture: "08:00", fermeture: "18:00" },
  vendredi: { ouverture: "08:00", fermeture: "18:00" },
  samedi: { ouverture: "08:00", fermeture: "14:00" },
  dimanche: { ouverture: null, fermeture: null }, // Ferm�
};

/**
 * Structure d'adresse par d�faut
 */
export const DEFAULT_ADRESSE = {
  departement: "",
  commune: "",
  arrondissement: "",
  quartier: "",
  localisation: { lat: null, lng: null },
};

/**
 * R�cup�rer tous les emplacements
 * Permissions:
 * - Admins: Tous les emplacements avec acc�s complet
 * - Superviseurs: Tous les emplacements en lecture seule
 * - Vendeurs: Pas d'acc�s direct (g�r� au niveau RLS)
 *
 * @param {Object} filters - Filtres optionnels
 * @param {string} filters.statut - Filtrer par statut
 * @param {string} filters.type - Filtrer par type
 * @param {string} filters.responsableId - Filtrer par responsable
 * @returns {Promise<{emplacements, error}>}
 */
export const getAllEmplacements = async (filters = {}) => {
  try {
    let query = supabase
      .from("emplacements")
      .select("*")
      .order("created_at", { ascending: false });

    // Appliquer les filtres
    if (filters.statut) {
      query = query.eq("statut", filters.statut);
    }

    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    if (filters.responsableId) {
      query = query.eq("responsable_id", filters.responsableId);
    }

    const { data, error } = await query;

    return { emplacements: data || [], error };
  } catch (error) {
    console.error("Erreur lors de la r�cup�ration des emplacements:", error);
    return { emplacements: [], error };
  }
};

/**
 * R�cup�rer un emplacement par son ID
 * @param {string} emplacementId - ID de l'emplacement
 * @returns {Promise<{emplacement, error}>}
 */
export const getEmplacementById = async (emplacementId) => {
  try {
    const { data, error } = await supabase
      .from("emplacements")
      .select("*")
      .eq("id", emplacementId)
      .single();

    return { emplacement: data, error };
  } catch (error) {
    console.error("Erreur lors de la r�cup�ration de l'emplacement:", error);
    return { emplacement: null, error };
  }
};

/**
 * Cr�er un nouvel emplacement
 * Permissions: Admin uniquement
 *
 * @param {Object} emplacementData - Donn�es de l'emplacement
 * @param {string} emplacementData.nom - Nom de l'emplacement
 * @param {string} emplacementData.type - Type (base, stand, kiosque, boutique)
 * @param {Object} emplacementData.adresse - Adresse structur�e
 * @param {string} emplacementData.responsableId - ID du responsable
 * @param {Object} emplacementData.horaires - Horaires d'ouverture
 * @param {string} emplacementData.statut - Statut (actif, inactif, ferme_temporairement)
 * @returns {Promise<{emplacement, error}>}
 */
export const createEmplacement = async (emplacementData) => {
  try {
    const { data, error } = await supabase
      .from("emplacements")
      .insert([
        {
          nom: emplacementData.nom,
          type: emplacementData.type,
          adresse: emplacementData.adresse || DEFAULT_ADRESSE,
          responsable_id: emplacementData.responsableId,
          horaires: emplacementData.horaires || DEFAULT_HORAIRES,
          statut: emplacementData.statut || "actif",
        },
      ])
      .select("*")
      .single();

    return { emplacement: data, error };
  } catch (error) {
    console.error("Erreur lors de la cr�ation de l'emplacement:", error);
    return { emplacement: null, error };
  }
};

/**
 * Mettre � jour un emplacement
 * Permissions: Admin uniquement
 *
 * @param {string} emplacementId - ID de l'emplacement
 * @param {Object} updates - Mises � jour � appliquer
 * @returns {Promise<{emplacement, error}>}
 */
export const updateEmplacement = async (emplacementId, updates) => {
  try {
    // Retirer les champs qui ne doivent pas �tre mis � jour directement
    const { id, created_at, updated_at, responsable, ...safeUpdates } = updates;

    // Mapper les noms de champs du camelCase au snake_case
    const mappedUpdates = {};
    if (safeUpdates.nom !== undefined) mappedUpdates.nom = safeUpdates.nom;
    if (safeUpdates.type !== undefined) mappedUpdates.type = safeUpdates.type;
    if (safeUpdates.adresse !== undefined)
      mappedUpdates.adresse = safeUpdates.adresse;
    if (safeUpdates.responsableId !== undefined)
      mappedUpdates.responsable_id = safeUpdates.responsableId;
    if (safeUpdates.horaires !== undefined)
      mappedUpdates.horaires = safeUpdates.horaires;
    if (safeUpdates.statut !== undefined)
      mappedUpdates.statut = safeUpdates.statut;

    const { data, error } = await supabase
      .from("emplacements")
      .update(mappedUpdates)
      .eq("id", emplacementId)
      .select("*")
      .single();

    return { emplacement: data, error };
  } catch (error) {
    console.error("Erreur lors de la mise � jour de l'emplacement:", error);
    return { emplacement: null, error };
  }
};

/**
 * Supprimer un emplacement
 * Permissions: Admin uniquement
 *
 * @param {string} emplacementId - ID de l'emplacement
 * @returns {Promise<{error}>}
 */
export const deleteEmplacement = async (emplacementId) => {
  try {
    const { error } = await supabase
      .from("emplacements")
      .delete()
      .eq("id", emplacementId);

    return { error };
  } catch (error) {
    console.error("Erreur lors de la suppression de l'emplacement:", error);
    return { error };
  }
};

/**
 * Changer le statut d'un emplacement
 * @param {string} emplacementId - ID de l'emplacement
 * @param {string} statut - Nouveau statut (actif, inactif, ferme_temporairement)
 * @returns {Promise<{emplacement, error}>}
 */
export const updateEmplacementStatut = async (emplacementId, statut) => {
  return updateEmplacement(emplacementId, { statut });
};

/**
 * Obtenir les coordonn�es GPS d'une adresse via l'API de g�olocalisation du navigateur
 * Note: Cette fonction utilise l'API Geolocation du navigateur.
 * Pour une g�olocalisation d'adresse, consid�rer l'utilisation d'une API tierce comme Google Maps, OpenStreetMap Nominatim, etc.
 *
 * @param {string} adresse - Adresse compl�te en texte
 * @returns {Promise<{lat, lng, error}>}
 */
export const getCoordinatesFromAddress = async (adresse) => {
  try {
    // Cette impl�mentation basique devrait �tre remplac�e par une API de g�ocodage
    // Exemple avec Nominatim (OpenStreetMap) - API gratuite
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        adresse
      )}&limit=1`
    );

    if (!response.ok) {
      throw new Error("Erreur lors de la g�olocalisation");
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        error: null,
      };
    } else {
      return {
        lat: null,
        lng: null,
        error: { message: "Adresse non trouv�e" },
      };
    }
  } catch (error) {
    console.error("Erreur lors de la g�olocalisation:", error);
    return { lat: null, lng: null, error };
  }
};

/**
 * Mettre � jour les coordonn�es GPS d'un emplacement
 * @param {string} emplacementId - ID de l'emplacement
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{emplacement, error}>}
 */
export const updateEmplacementCoordinates = async (emplacementId, lat, lng) => {
  try {
    // R�cup�rer l'adresse actuelle
    const { emplacement, error: fetchError } = await getEmplacementById(
      emplacementId
    );

    if (fetchError || !emplacement) {
      return { emplacement: null, error: fetchError };
    }

    // Mettre � jour la localisation dans l'adresse
    const updatedAdresse = {
      ...emplacement.adresse,
      localisation: { lat, lng },
    };

    return updateEmplacement(emplacementId, { adresse: updatedAdresse });
  } catch (error) {
    console.error("Erreur lors de la mise � jour des coordonn�es:", error);
    return { emplacement: null, error };
  }
};

/**
 * R�cup�rer les statistiques des emplacements
 * @returns {Promise<{stats, error}>}
 */
export const getEmplacementStats = async () => {
  try {
    const { data, error } = await supabase
      .from("emplacements")
      .select("statut, type");

    if (error) return { stats: null, error };

    // Calculer les statistiques
    const stats = {
      total: data.length,
      actif: data.filter((e) => e.statut === "actif").length,
      inactif: data.filter((e) => e.statut === "inactif").length,
      ferme_temporairement: data.filter(
        (e) => e.statut === "ferme_temporairement"
      ).length,
      parType: {
        base: data.filter((e) => e.type === "base").length,
        stand: data.filter((e) => e.type === "stand").length,
        kiosque: data.filter((e) => e.type === "kiosque").length,
        boutique: data.filter((e) => e.type === "boutique").length,
      },
    };

    return { stats, error: null };
  } catch (error) {
    console.error("Erreur lors du calcul des statistiques:", error);
    return { stats: null, error };
  }
};

/**
 * R�cup�rer les emplacements avec leurs coordonn�es GPS pour affichage sur carte
 * @returns {Promise<{emplacements, error}>}
 */
export const getEmplacementsForMap = async () => {
  try {
    let q = supabase.from("promotions").select("*");
    const { data, error } = await q;
    console.log("Promotions debug:", { data, error });
    console.group("🗺️ getEmplacementsForMap - Debug");

    // Vérifier la connexion Supabase
    console.log("🔍 Vérification de la connexion Supabase...");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    console.log("👤 Utilisateur connecté:", {
      userId: user?.id,
      email: user?.email,
      error: userError,
    });

    // Étape 1: Récupérer TOUS les emplacements sans filtres
    console.log("📍 Étape 1: Récupération de TOUS les emplacements...");
    const query = supabase.from("emplacements").select("*");
    const { data: allData, error: allError } = await query;

    console.log("✅ Résultat de la requête emplacements:", {
      count: allData?.length || 0,
      hasData: !!allData,
      dataIsArray: Array.isArray(allData),
      data: allData,
      error: allError,
      errorDetails: allError
        ? {
            message: allError.message,
            details: allError.details,
            hint: allError.hint,
            code: allError.code,
          }
        : null,
    });

    if (allError) {
      console.error("❌ Erreur Supabase:", allError);
      console.groupEnd();
      return { emplacements: [], error: allError };
    }

    // Étape 2: Analyser la structure des adresses
    console.log("📍 Étape 2: Analyse de la structure des adresses...");
    allData?.forEach((emp, index) => {
      console.log(`Emplacement ${index + 1}:`, {
        id: emp.id,
        nom: emp.nom,
        type: emp.type,
        statut: emp.statut,
        adresse: emp.adresse,
        "adresse.localisation": emp.adresse?.localisation,
        "adresse.localisation.lat": emp.adresse?.localisation?.lat,
        "adresse.localisation.lng": emp.adresse?.localisation?.lng,
      });
    });

    // Étape 3: Filtrer les emplacements avec coordonnées
    console.log("📍 Étape 3: Filtrage des emplacements avec coordonnées...");
    const emplacementsWithCoords =
      allData?.filter((e) => {
        const hasLat = e.adresse?.localisation?.lat != null;
        const hasLng = e.adresse?.localisation?.lng != null;
        const isValid = hasLat && hasLng;

        if (!isValid) {
          console.log(`⚠️ Emplacement "${e.nom}" ignoré:`, {
            hasLat,
            hasLng,
            lat: e.adresse?.localisation?.lat,
            lng: e.adresse?.localisation?.lng,
          });
        }

        return isValid;
      }) || [];

    console.log(
      `✅ ${emplacementsWithCoords.length} emplacements avec coordonnées trouvés`
    );

    // Étape 4: Formater pour la carte
    console.log("📍 Étape 4: Formatage pour la carte...");
    const emplacements = emplacementsWithCoords.map((e) => ({
      id: e.id,
      nom: e.nom,
      type: e.type,
      statut: e.statut,
      lat: e.adresse.localisation.lat,
      lng: e.adresse.localisation.lng,
    }));

    console.log("✅ Emplacements formatés:", emplacements);
    console.groupEnd();

    return { emplacements, error: null };
  } catch (error) {
    console.error(
      "❌ Exception lors de la récupération des emplacements pour la carte:",
      error
    );
    console.groupEnd();
    return { emplacements: [], error };
  }
};

/**
 * V�rifier si un utilisateur peut g�rer les emplacements
 * @param {string} userRole - R�le de l'utilisateur
 * @returns {boolean}
 */
export const canManageEmplacements = (userRole) => {
  return userRole === "admin";
};

/**
 * V�rifier si un utilisateur peut voir les emplacements
 * @param {string} userRole - R�le de l'utilisateur
 * @returns {boolean}
 */
export const canViewEmplacements = (userRole) => {
  return userRole === "admin" || userRole === "superviseur";
};

export default {
  getAllEmplacements,
  getEmplacementById,
  createEmplacement,
  updateEmplacement,
  deleteEmplacement,
  updateEmplacementStatut,
  getCoordinatesFromAddress,
  updateEmplacementCoordinates,
  getEmplacementStats,
  getEmplacementsForMap,
  canManageEmplacements,
  canViewEmplacements,
  DEFAULT_HORAIRES,
  DEFAULT_ADRESSE,
};
