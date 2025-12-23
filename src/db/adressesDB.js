import { initDB } from './indexedDB';

/**
 * Opérations CRUD pour les adresses dans IndexedDB
 */

/**
 * Ajouter une adresse dans IndexedDB
 * @param {Object} adresse - L'adresse à ajouter
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export const addAdresseLocal = async (adresse) => {
  try {
    const db = await initDB();

    // Ajouter les métadonnées de synchronisation
    const adresseWithMeta = {
      ...adresse,
      sync_status: 'pending', // pending | synced | error
      local_updated_at: new Date().toISOString(),
    };

    await db.add('adresses', adresseWithMeta);

    console.log('✓ Adresse ajoutée localement:', adresse.id);
    return { success: true, id: adresse.id };
  } catch (error) {
    console.error('Erreur lors de l\'ajout local:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Récupérer toutes les adresses depuis IndexedDB
 * @param {Object} options - Options de filtrage
 * @param {boolean} options.includeInactive - Inclure les adresses inactives
 * @param {string} options.departement - Filtrer par département
 * @param {string} options.commune - Filtrer par commune
 * @param {string} options.arrondissement - Filtrer par arrondissement
 * @param {string} options.quartier - Filtrer par quartier
 * @returns {Promise<{adresses: Array, error?: string}>}
 */
export const getAllAdressesLocal = async (options = {}) => {
  try {
    const db = await initDB();
    let adresses = await db.getAll('adresses');

    // Filtrer par statut actif/inactif
    if (!options.includeInactive) {
      adresses = adresses.filter(a => a.is_active !== false);
    }

    // Filtrer par département
    if (options.departement) {
      adresses = adresses.filter(a =>
        a.departement?.toLowerCase().includes(options.departement.toLowerCase())
      );
    }

    // Filtrer par commune
    if (options.commune) {
      adresses = adresses.filter(a =>
        a.commune?.toLowerCase().includes(options.commune.toLowerCase())
      );
    }

    // Filtrer par arrondissement
    if (options.arrondissement) {
      adresses = adresses.filter(a =>
        a.arrondissement?.toLowerCase().includes(options.arrondissement.toLowerCase())
      );
    }

    // Filtrer par quartier
    if (options.quartier) {
      adresses = adresses.filter(a =>
        a.quartier?.toLowerCase().includes(options.quartier.toLowerCase())
      );
    }

    // Trier par date de mise à jour (les plus récents en premier)
    adresses.sort((a, b) => {
      const dateA = new Date(a.local_updated_at || a.updated_at || 0);
      const dateB = new Date(b.local_updated_at || b.updated_at || 0);
      return dateB - dateA;
    });

    return { adresses };
  } catch (error) {
    console.error('Erreur lors de la récupération locale:', error);
    return { adresses: [], error: error.message };
  }
};

/**
 * Récupérer une adresse par son ID depuis IndexedDB
 * @param {string} id - L'ID de l'adresse
 * @returns {Promise<{adresse?: Object, error?: string}>}
 */
export const getAdresseByIdLocal = async (id) => {
  try {
    const db = await initDB();
    const adresse = await db.get('adresses', id);

    if (!adresse) {
      return { error: 'Adresse non trouvée' };
    }

    return { adresse };
  } catch (error) {
    console.error('Erreur lors de la récupération par ID:', error);
    return { error: error.message };
  }
};

/**
 * Mettre à jour une adresse dans IndexedDB
 * @param {string} id - L'ID de l'adresse
 * @param {Object} updates - Les modifications à apporter
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateAdresseLocal = async (id, updates) => {
  try {
    const db = await initDB();

    // Récupérer l'adresse existante
    const existing = await db.get('adresses', id);
    if (!existing) {
      return { success: false, error: 'Adresse non trouvée' };
    }

    // Fusionner les modifications
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
      local_updated_at: new Date().toISOString(),
      sync_status: 'pending', // Marquer comme à synchroniser
    };

    await db.put('adresses', updated);

    console.log('✓ Adresse mise à jour localement:', id);
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la mise à jour locale:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Désactiver une adresse (soft delete)
 * @param {string} id - L'ID de l'adresse
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deactivateAdresseLocal = async (id) => {
  return updateAdresseLocal(id, {
    is_active: false,
    deactivated_at: new Date().toISOString()
  });
};

/**
 * Réactiver une adresse
 * @param {string} id - L'ID de l'adresse
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const activateAdresseLocal = async (id) => {
  try {
    const db = await initDB();

    // Récupérer l'adresse existante
    const existing = await db.get('adresses', id);
    if (!existing) {
      return { success: false, error: 'Adresse non trouvée' };
    }

    // Réactiver en supprimant la date de désactivation
    const { deactivated_at, ...rest } = existing;
    const updated = {
      ...rest,
      is_active: true,
      updated_at: new Date().toISOString(),
      local_updated_at: new Date().toISOString(),
      sync_status: 'pending',
    };

    await db.put('adresses', updated);

    console.log('✓ Adresse réactivée localement:', id);
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la réactivation locale:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Supprimer définitivement une adresse (hard delete)
 * Attention: Cette opération est irréversible
 * @param {string} id - L'ID de l'adresse
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteAdresseLocalPermanently = async (id) => {
  try {
    const db = await initDB();
    await db.delete('adresses', id);

    console.log('✓ Adresse supprimée définitivement localement:', id);
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la suppression locale:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Rechercher des adresses par localisation géographique
 * @param {string} indexName - Nom de l'index (departement, commune, arrondissement, quartier)
 * @param {string} value - Valeur à rechercher
 * @returns {Promise<{adresses: Array, error?: string}>}
 */
export const searchAdressesByIndex = async (indexName, value) => {
  try {
    const db = await initDB();
    const index = db.transaction('adresses').store.index(indexName);
    const adresses = await index.getAll(value);

    // Filtrer uniquement les adresses actives
    const activeAdresses = adresses.filter(a => a.is_active !== false);

    return { adresses: activeAdresses };
  } catch (error) {
    console.error('Erreur lors de la recherche par index:', error);
    return { adresses: [], error: error.message };
  }
};

/**
 * Récupérer les adresses par proximité géographique
 * @param {number} lat - Latitude du point de référence
 * @param {number} lng - Longitude du point de référence
 * @param {number} radiusKm - Rayon de recherche en kilomètres (défaut: 5km)
 * @param {boolean} includeInactive - Inclure les adresses inactives
 * @returns {Promise<{adresses: Array, error?: string}>}
 */
export const getAdressesByProximityLocal = async (
  lat,
  lng,
  radiusKm = 5,
  includeInactive = false
) => {
  try {
    const db = await initDB();
    let adresses = await db.getAll('adresses');

    // Filtrer par statut actif/inactif
    if (!includeInactive) {
      adresses = adresses.filter(a => a.is_active !== false);
    }

    // Filtrer uniquement celles qui ont une localisation
    const adressesWithLocation = adresses.filter(a =>
      a.localisation?.lat && a.localisation?.lng
    );

    // Calculer la distance et filtrer
    const adressesWithDistance = adressesWithLocation.map(adresse => {
      const distance = calculateDistance(
        lat,
        lng,
        adresse.localisation.lat,
        adresse.localisation.lng
      );
      return { ...adresse, distance };
    });

    // Filtrer par rayon et trier par distance
    const nearby = adressesWithDistance
      .filter(a => a.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return { adresses: nearby };
  } catch (error) {
    console.error('Erreur lors de la recherche par proximité:', error);
    return { adresses: [], error: error.message };
  }
};

/**
 * Calculer la distance entre deux points GPS (formule de Haversine)
 * @param {number} lat1 - Latitude du point 1
 * @param {number} lng1 - Longitude du point 1
 * @param {number} lat2 - Latitude du point 2
 * @param {number} lng2 - Longitude du point 2
 * @returns {number} Distance en kilomètres
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Convertir des degrés en radians
 */
const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Compter les adresses par département
 * @param {boolean} includeInactive - Inclure les adresses inactives
 * @returns {Promise<{stats: Object, error?: string}>}
 */
export const countAdressesByDepartement = async (includeInactive = false) => {
  try {
    const { adresses } = await getAllAdressesLocal({ includeInactive });

    const stats = adresses.reduce((acc, adresse) => {
      const dept = adresse.departement || 'Non spécifié';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    return { stats };
  } catch (error) {
    console.error('Erreur lors du comptage par département:', error);
    return { stats: {}, error: error.message };
  }
};

/**
 * Obtenir les statistiques des adresses
 * @returns {Promise<{stats: Object, error?: string}>}
 */
export const getAdressesStatsLocal = async () => {
  try {
    const { adresses: allAdresses } = await getAllAdressesLocal({ includeInactive: true });

    const stats = {
      total: allAdresses.length,
      active: allAdresses.filter(a => a.is_active !== false).length,
      inactive: allAdresses.filter(a => a.is_active === false).length,
      withGPS: allAdresses.filter(a => a.localisation?.lat && a.localisation?.lng).length,
      withoutGPS: allAdresses.filter(a => !a.localisation?.lat || !a.localisation?.lng).length,
      pendingSync: allAdresses.filter(a => a.sync_status === 'pending').length,
      synced: allAdresses.filter(a => a.sync_status === 'synced').length,
      syncErrors: allAdresses.filter(a => a.sync_status === 'error').length,
    };

    return { stats };
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return { stats: null, error: error.message };
  }
};

/**
 * Récupérer les adresses en attente de synchronisation
 * @returns {Promise<{adresses: Array, error?: string}>}
 */
export const getPendingSyncAdresses = async () => {
  try {
    const db = await initDB();
    const index = db.transaction('adresses').store.index('sync_status');
    const adresses = await index.getAll('pending');

    return { adresses };
  } catch (error) {
    console.error('Erreur lors de la récupération des adresses pending:', error);
    return { adresses: [], error: error.message };
  }
};

/**
 * Marquer une adresse comme synchronisée
 * @param {string} id - L'ID de l'adresse
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const markAdresseAsSynced = async (id) => {
  try {
    const db = await initDB();
    const existing = await db.get('adresses', id);

    if (!existing) {
      return { success: false, error: 'Adresse non trouvée' };
    }

    const updated = {
      ...existing,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
    };

    await db.put('adresses', updated);
    return { success: true };
  } catch (error) {
    console.error('Erreur lors du marquage comme synced:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Marquer une adresse en erreur de synchronisation
 * @param {string} id - L'ID de l'adresse
 * @param {string} errorMessage - Message d'erreur
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const markAdresseAsSyncError = async (id, errorMessage) => {
  try {
    const db = await initDB();
    const existing = await db.get('adresses', id);

    if (!existing) {
      return { success: false, error: 'Adresse non trouvée' };
    }

    const updated = {
      ...existing,
      sync_status: 'error',
      sync_error: errorMessage,
      sync_error_at: new Date().toISOString(),
    };

    await db.put('adresses', updated);
    return { success: true };
  } catch (error) {
    console.error('Erreur lors du marquage en erreur:', error);
    return { success: false, error: error.message };
  }
};

export default {
  addAdresseLocal,
  getAllAdressesLocal,
  getAdresseByIdLocal,
  updateAdresseLocal,
  deactivateAdresseLocal,
  activateAdresseLocal,
  deleteAdresseLocalPermanently,
  searchAdressesByIndex,
  getAdressesByProximityLocal,
  countAdressesByDepartement,
  getAdressesStatsLocal,
  getPendingSyncAdresses,
  markAdresseAsSynced,
  markAdresseAsSyncError,
};
