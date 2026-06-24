import { initDB } from './indexedDB';

export const addAdresseLocal = async (adresse) => {
  try {
    const db = await initDB();
    await db.add('adresses', {
      ...adresse,
      sync_status: 'pending',
      local_updated_at: new Date().toISOString(),
    });
    return { success: true, id: adresse.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAllAdressesLocal = async (options = {}) => {
  try {
    const db = await initDB();
    let adresses = await db.getAll('adresses');

    if (!options.includeInactive) adresses = adresses.filter((a) => a.is_active !== false);
    if (options.departement)
      adresses = adresses.filter((a) =>
        a.departement?.toLowerCase().includes(options.departement.toLowerCase())
      );
    if (options.commune)
      adresses = adresses.filter((a) =>
        a.commune?.toLowerCase().includes(options.commune.toLowerCase())
      );
    if (options.arrondissement)
      adresses = adresses.filter((a) =>
        a.arrondissement?.toLowerCase().includes(options.arrondissement.toLowerCase())
      );
    if (options.quartier)
      adresses = adresses.filter((a) =>
        a.quartier?.toLowerCase().includes(options.quartier.toLowerCase())
      );

    adresses.sort(
      (a, b) =>
        new Date(b.local_updated_at || b.updated_at || 0) -
        new Date(a.local_updated_at || a.updated_at || 0)
    );
    return { adresses };
  } catch (error) {
    return { adresses: [], error: error.message };
  }
};

export const getAdresseByIdLocal = async (id) => {
  try {
    const db = await initDB();
    const adresse = await db.get('adresses', id);
    if (!adresse) return { error: 'Adresse non trouvée' };
    return { adresse };
  } catch (error) {
    return { error: error.message };
  }
};

export const updateAdresseLocal = async (id, updates) => {
  try {
    const db = await initDB();
    const existing = await db.get('adresses', id);
    if (!existing) return { success: false, error: 'Adresse non trouvée' };
    const now = new Date().toISOString();
    await db.put('adresses', {
      ...existing,
      ...updates,
      updated_at: now,
      local_updated_at: now,
      sync_status: 'pending',
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deactivateAdresseLocal = async (id) =>
  updateAdresseLocal(id, { is_active: false, deactivated_at: new Date().toISOString() });

export const activateAdresseLocal = async (id) => {
  try {
    const db = await initDB();
    const existing = await db.get('adresses', id);
    if (!existing) return { success: false, error: 'Adresse non trouvée' };
    const { deactivated_at, ...rest } = existing;
    const now = new Date().toISOString();
    await db.put('adresses', {
      ...rest,
      is_active: true,
      updated_at: now,
      local_updated_at: now,
      sync_status: 'pending',
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteAdresseLocalPermanently = async (id) => {
  try {
    const db = await initDB();
    await db.delete('adresses', id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const searchAdressesByIndex = async (indexName, value) => {
  try {
    const db = await initDB();
    const index = db.transaction('adresses').store.index(indexName);
    const adresses = (await index.getAll(value)).filter((a) => a.is_active !== false);
    return { adresses };
  } catch (error) {
    return { adresses: [], error: error.message };
  }
};

// Haversine : distance en km entre deux coordonnées GPS
const toRad = (deg) => deg * (Math.PI / 180);
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getAdressesByProximityLocal = async (lat, lng, radiusKm = 5, includeInactive = false) => {
  try {
    const db = await initDB();
    let adresses = await db.getAll('adresses');
    if (!includeInactive) adresses = adresses.filter((a) => a.is_active !== false);

    return {
      adresses: adresses
        .filter((a) => a.localisation?.lat && a.localisation?.lng)
        .map((a) => ({ ...a, distance: calculateDistance(lat, lng, a.localisation.lat, a.localisation.lng) }))
        .filter((a) => a.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance),
    };
  } catch (error) {
    return { adresses: [], error: error.message };
  }
};

export const countAdressesByDepartement = async (includeInactive = false) => {
  try {
    const { adresses } = await getAllAdressesLocal({ includeInactive });
    const stats = adresses.reduce((acc, a) => {
      const dept = a.departement || 'Non spécifié';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    return { stats };
  } catch (error) {
    return { stats: {}, error: error.message };
  }
};

export const getAdressesStatsLocal = async () => {
  try {
    const { adresses } = await getAllAdressesLocal({ includeInactive: true });
    return {
      stats: {
        total: adresses.length,
        active: adresses.filter((a) => a.is_active !== false).length,
        inactive: adresses.filter((a) => a.is_active === false).length,
        withGPS: adresses.filter((a) => a.localisation?.lat && a.localisation?.lng).length,
        withoutGPS: adresses.filter((a) => !a.localisation?.lat || !a.localisation?.lng).length,
        pendingSync: adresses.filter((a) => a.sync_status === 'pending').length,
        synced: adresses.filter((a) => a.sync_status === 'synced').length,
        syncErrors: adresses.filter((a) => a.sync_status === 'error').length,
      },
    };
  } catch (error) {
    return { stats: null, error: error.message };
  }
};

export const getPendingSyncAdresses = async () => {
  try {
    const db = await initDB();
    const index = db.transaction('adresses').store.index('sync_status');
    const adresses = await index.getAll('pending');
    return { adresses };
  } catch (error) {
    return { adresses: [], error: error.message };
  }
};

export const markAdresseAsSynced = async (id) => {
  try {
    const db = await initDB();
    const existing = await db.get('adresses', id);
    if (!existing) return { success: false, error: 'Adresse non trouvée' };
    await db.put('adresses', { ...existing, sync_status: 'synced', last_synced_at: new Date().toISOString() });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const markAdresseAsSyncError = async (id, errorMessage) => {
  try {
    const db = await initDB();
    const existing = await db.get('adresses', id);
    if (!existing) return { success: false, error: 'Adresse non trouvée' };
    await db.put('adresses', {
      ...existing,
      sync_status: 'error',
      sync_error: errorMessage,
      sync_error_at: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
