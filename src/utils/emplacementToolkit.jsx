import { supabase } from "@/config/supabase";

/**
 * Toolkit de gestion des emplacements
 * Gère les emplacements (points de vente) avec permissions basées sur les rôles
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
 * Horaires par défaut pour un emplacement
 */
export const DEFAULT_HORAIRES = {
  lundi: { ouverture: "08:00", fermeture: "18:00" },
  mardi: { ouverture: "08:00", fermeture: "18:00" },
  mercredi: { ouverture: "08:00", fermeture: "18:00" },
  jeudi: { ouverture: "08:00", fermeture: "18:00" },
  vendredi: { ouverture: "08:00", fermeture: "18:00" },
  samedi: { ouverture: "08:00", fermeture: "14:00" },
  dimanche: { ouverture: null, fermeture: null }, // Fermé
};

/**
 * Structure d'adresse par défaut
 */
export const DEFAULT_ADRESSE = {
  departement: "",
  commune: "",
  arrondissement: "",
  quartier: "",
  localisation: { lat: null, lng: null },
};

/**
 * Récupérer tous les emplacements
 * Permissions:
 * - Admins: Tous les emplacements avec accès complet
 * - Superviseurs: Tous les emplacements en lecture seule
 * - Vendeurs: Pas d'accès direct (géré au niveau RLS)
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
      .select(`
        *,
        responsable:responsable_id(id, nom, prenoms, role, photo_url, telephone)
      `)
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
    console.error("Erreur lors de la récupération des emplacements:", error);
    return { emplacements: [], error };
  }
};

/**
 * Récupérer un emplacement par son ID
 * @param {string} emplacementId - ID de l'emplacement
 * @returns {Promise<{emplacement, error}>}
 */
export const getEmplacementById = async (emplacementId) => {
  try {
    const { data, error } = await supabase
      .from("emplacements")
      .select(`
        *,
        responsable:responsable_id(id, nom, prenoms, role, photo_url, telephone, email)
      `)
      .eq("id", emplacementId)
      .single();

    return { emplacement: data, error };
  } catch (error) {
    console.error("Erreur lors de la récupération de l'emplacement:", error);
    return { emplacement: null, error };
  }
};

/**
 * Créer un nouvel emplacement
 * Permissions: Admin uniquement
 *
 * @param {Object} emplacementData - Données de l'emplacement
 * @param {string} emplacementData.nom - Nom de l'emplacement
 * @param {string} emplacementData.type - Type (base, stand, kiosque, boutique)
 * @param {Object} emplacementData.adresse - Adresse structurée
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
      .select(`
        *,
        responsable:responsable_id(id, nom, prenoms, role, photo_url, telephone)
      `)
      .single();

    return { emplacement: data, error };
  } catch (error) {
    console.error("Erreur lors de la création de l'emplacement:", error);
    return { emplacement: null, error };
  }
};

/**
 * Mettre à jour un emplacement
 * Permissions: Admin uniquement
 *
 * @param {string} emplacementId - ID de l'emplacement
 * @param {Object} updates - Mises à jour à appliquer
 * @returns {Promise<{emplacement, error}>}
 */
export const updateEmplacement = async (emplacementId, updates) => {
  try {
    // Retirer les champs qui ne doivent pas être mis à jour directement
    const { id, created_at, updated_at, responsable, ...safeUpdates } = updates;

    // Mapper les noms de champs du camelCase au snake_case
    const mappedUpdates = {};
    if (safeUpdates.nom !== undefined) mappedUpdates.nom = safeUpdates.nom;
    if (safeUpdates.type !== undefined) mappedUpdates.type = safeUpdates.type;
    if (safeUpdates.adresse !== undefined) mappedUpdates.adresse = safeUpdates.adresse;
    if (safeUpdates.responsableId !== undefined) mappedUpdates.responsable_id = safeUpdates.responsableId;
    if (safeUpdates.horaires !== undefined) mappedUpdates.horaires = safeUpdates.horaires;
    if (safeUpdates.statut !== undefined) mappedUpdates.statut = safeUpdates.statut;

    const { data, error } = await supabase
      .from("emplacements")
      .update(mappedUpdates)
      .eq("id", emplacementId)
      .select(`
        *,
        responsable:responsable_id(id, nom, prenoms, role, photo_url, telephone)
      `)
      .single();

    return { emplacement: data, error };
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'emplacement:", error);
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
 * Obtenir les coordonnées GPS d'une adresse via l'API de géolocalisation du navigateur
 * Note: Cette fonction utilise l'API Geolocation du navigateur.
 * Pour une géolocalisation d'adresse, considérer l'utilisation d'une API tierce comme Google Maps, OpenStreetMap Nominatim, etc.
 *
 * @param {string} adresse - Adresse complète en texte
 * @returns {Promise<{lat, lng, error}>}
 */
export const getCoordinatesFromAddress = async (adresse) => {
  try {
    // Cette implémentation basique devrait être remplacée par une API de géocodage
    // Exemple avec Nominatim (OpenStreetMap) - API gratuite
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresse)}&limit=1`
    );

    if (!response.ok) {
      throw new Error("Erreur lors de la géolocalisation");
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
        error: { message: "Adresse non trouvée" },
      };
    }
  } catch (error) {
    console.error("Erreur lors de la géolocalisation:", error);
    return { lat: null, lng: null, error };
  }
};

/**
 * Mettre à jour les coordonnées GPS d'un emplacement
 * @param {string} emplacementId - ID de l'emplacement
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{emplacement, error}>}
 */
export const updateEmplacementCoordinates = async (emplacementId, lat, lng) => {
  try {
    // Récupérer l'adresse actuelle
    const { emplacement, error: fetchError } = await getEmplacementById(emplacementId);

    if (fetchError || !emplacement) {
      return { emplacement: null, error: fetchError };
    }

    // Mettre à jour la localisation dans l'adresse
    const updatedAdresse = {
      ...emplacement.adresse,
      localisation: { lat, lng },
    };

    return updateEmplacement(emplacementId, { adresse: updatedAdresse });
  } catch (error) {
    console.error("Erreur lors de la mise à jour des coordonnées:", error);
    return { emplacement: null, error };
  }
};

/**
 * Récupérer les statistiques des emplacements
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
      ferme_temporairement: data.filter((e) => e.statut === "ferme_temporairement").length,
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
 * Récupérer les emplacements avec leurs coordonnées GPS pour affichage sur carte
 * @returns {Promise<{emplacements, error}>}
 */
export const getEmplacementsForMap = async () => {
  try {
    const { data, error } = await supabase
      .from("emplacements")
      .select("id, nom, type, statut, adresse")
      .not("adresse->localisation->lat", "is", null)
      .not("adresse->localisation->lng", "is", null);

    // Filtrer et formater pour la carte
    const emplacements = data?.map((e) => ({
      id: e.id,
      nom: e.nom,
      type: e.type,
      statut: e.statut,
      lat: e.adresse?.localisation?.lat,
      lng: e.adresse?.localisation?.lng,
    })) || [];

    return { emplacements, error };
  } catch (error) {
    console.error("Erreur lors de la récupération des emplacements pour la carte:", error);
    return { emplacements: [], error };
  }
};

/**
 * Vérifier si un utilisateur peut gérer les emplacements
 * @param {string} userRole - Rôle de l'utilisateur
 * @returns {boolean}
 */
export const canManageEmplacements = (userRole) => {
  return userRole === "admin";
};

/**
 * Vérifier si un utilisateur peut voir les emplacements
 * @param {string} userRole - Rôle de l'utilisateur
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
