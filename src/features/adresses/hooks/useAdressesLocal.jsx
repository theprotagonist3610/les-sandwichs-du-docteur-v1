import { useState, useEffect, useCallback } from 'react';
import {
  getAllAdressesLocal,
  getAdresseByIdLocal,
  addAdresseLocal,
  updateAdresseLocal,
  deactivateAdresseLocal,
  activateAdresseLocal,
  deleteAdresseLocalPermanently,
  searchAdressesByIndex,
  getAdressesByProximityLocal,
  countAdressesByDepartement,
  getAdressesStatsLocal,
} from '@/db/adressesDB';
import {
  addToSyncQueue,
  OPERATION_TYPES,
} from '@/db/syncQueue';

/**
 * Hook React pour la gestion locale des adresses via IndexedDB
 * Fournit toutes les opérations CRUD avec gestion automatique de la sync queue
 */
const useAdressesLocal = (options = {}) => {
  const [adresses, setAdresses] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Charger toutes les adresses
   */
  const loadAdresses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { adresses: data, error: loadError } = await getAllAdressesLocal(options);

    if (loadError) {
      setError(loadError);
      setAdresses([]);
    } else {
      setAdresses(data);
    }

    setIsLoading(false);
  }, []);

  /**
   * Charger les statistiques
   */
  const loadStats = useCallback(async () => {
    const { stats: statsData, error: statsError } = await getAdressesStatsLocal();

    if (!statsError) {
      setStats(statsData);
    }
  }, []);

  /**
   * Charger les données au montage du composant
   */
  useEffect(() => {
    loadAdresses();
    loadStats();
  }, []);

  /**
   * Créer une nouvelle adresse
   * @param {Object} adresseData - Données de l'adresse
   * @returns {Promise<{success: boolean, id?: string, error?: string}>}
   */
  const createAdresse = useCallback(async (adresseData) => {
    try {
      // Générer un ID temporaire (UUID côté client)
      const tempId = crypto.randomUUID();

      const adresse = {
        id: tempId,
        ...adresseData,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Ajouter à IndexedDB
      const result = await addAdresseLocal(adresse);

      if (result.success) {
        // Ajouter à la queue de synchronisation
        await addToSyncQueue({
          operation_type: OPERATION_TYPES.CREATE,
          entity_id: tempId,
          data: adresse,
        });

        // Recharger les données
        await loadAdresses();
        await loadStats();

        return { success: true, id: tempId };
      }

      return result;
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      return { success: false, error: error.message };
    }
  }, [loadAdresses, loadStats]);

  /**
   * Mettre à jour une adresse
   * @param {string} id - ID de l'adresse
   * @param {Object} updates - Modifications
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const updateAdresse = useCallback(async (id, updates) => {
    try {
      const result = await updateAdresseLocal(id, updates);

      if (result.success) {
        // Ajouter à la queue de synchronisation
        await addToSyncQueue({
          operation_type: OPERATION_TYPES.UPDATE,
          entity_id: id,
          data: updates,
        });

        // Recharger les données
        await loadAdresses();
        await loadStats();

        return { success: true };
      }

      return result;
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      return { success: false, error: error.message };
    }
  }, [loadAdresses, loadStats]);

  /**
   * Désactiver une adresse (soft delete)
   * @param {string} id - ID de l'adresse
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const deactivateAdresse = useCallback(async (id) => {
    try {
      const result = await deactivateAdresseLocal(id);

      if (result.success) {
        // Ajouter à la queue de synchronisation
        await addToSyncQueue({
          operation_type: OPERATION_TYPES.DEACTIVATE,
          entity_id: id,
          data: { is_active: false },
        });

        // Recharger les données
        await loadAdresses();
        await loadStats();

        return { success: true };
      }

      return result;
    } catch (error) {
      console.error('Erreur lors de la désactivation:', error);
      return { success: false, error: error.message };
    }
  }, [loadAdresses, loadStats]);

  /**
   * Réactiver une adresse
   * @param {string} id - ID de l'adresse
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const activateAdresse = useCallback(async (id) => {
    try {
      const result = await activateAdresseLocal(id);

      if (result.success) {
        // Ajouter à la queue de synchronisation
        await addToSyncQueue({
          operation_type: OPERATION_TYPES.ACTIVATE,
          entity_id: id,
          data: { is_active: true },
        });

        // Recharger les données
        await loadAdresses();
        await loadStats();

        return { success: true };
      }

      return result;
    } catch (error) {
      console.error('Erreur lors de la réactivation:', error);
      return { success: false, error: error.message };
    }
  }, [loadAdresses, loadStats]);

  /**
   * Supprimer définitivement une adresse (hard delete)
   * @param {string} id - ID de l'adresse
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const deleteAdresse = useCallback(async (id) => {
    try {
      const result = await deleteAdresseLocalPermanently(id);

      if (result.success) {
        // Ajouter à la queue de synchronisation
        await addToSyncQueue({
          operation_type: OPERATION_TYPES.DELETE,
          entity_id: id,
          data: {},
        });

        // Recharger les données
        await loadAdresses();
        await loadStats();

        return { success: true };
      }

      return result;
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      return { success: false, error: error.message };
    }
  }, [loadAdresses, loadStats]);

  /**
   * Rechercher une adresse par ID
   * @param {string} id - ID de l'adresse
   * @returns {Promise<{adresse?: Object, error?: string}>}
   */
  const getAdresseById = useCallback(async (id) => {
    return await getAdresseByIdLocal(id);
  }, []);

  /**
   * Rechercher par département
   * @param {string} departement - Nom du département
   * @returns {Promise<{adresses: Array, error?: string}>}
   */
  const searchByDepartement = useCallback(async (departement) => {
    return await searchAdressesByIndex('departement', departement);
  }, []);

  /**
   * Rechercher par commune
   * @param {string} commune - Nom de la commune
   * @returns {Promise<{adresses: Array, error?: string}>}
   */
  const searchByCommune = useCallback(async (commune) => {
    return await searchAdressesByIndex('commune', commune);
  }, []);

  /**
   * Rechercher par arrondissement
   * @param {string} arrondissement - Nom de l'arrondissement
   * @returns {Promise<{adresses: Array, error?: string}>}
   */
  const searchByArrondissement = useCallback(async (arrondissement) => {
    return await searchAdressesByIndex('arrondissement', arrondissement);
  }, []);

  /**
   * Rechercher par quartier
   * @param {string} quartier - Nom du quartier
   * @returns {Promise<{adresses: Array, error?: string}>}
   */
  const searchByQuartier = useCallback(async (quartier) => {
    return await searchAdressesByIndex('quartier', quartier);
  }, []);

  /**
   * Rechercher par proximité géographique
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radiusKm - Rayon en km
   * @returns {Promise<{adresses: Array, error?: string}>}
   */
  const searchByProximity = useCallback(async (lat, lng, radiusKm = 5) => {
    return await getAdressesByProximityLocal(lat, lng, radiusKm);
  }, []);

  /**
   * Obtenir le comptage par département
   * @returns {Promise<{stats: Object, error?: string}>}
   */
  const getCountByDepartement = useCallback(async () => {
    return await countAdressesByDepartement();
  }, []);

  /**
   * Rafraîchir les données
   */
  const refresh = useCallback(async () => {
    await loadAdresses();
    await loadStats();
  }, [loadAdresses, loadStats]);

  return {
    // État
    adresses,
    stats,
    isLoading,
    error,

    // Actions CRUD
    createAdresse,
    updateAdresse,
    deactivateAdresse,
    activateAdresse,
    deleteAdresse,

    // Recherche
    getAdresseById,
    searchByDepartement,
    searchByCommune,
    searchByArrondissement,
    searchByQuartier,
    searchByProximity,
    getCountByDepartement,

    // Utilitaires
    refresh,
    loadAdresses,
  };
};

export default useAdressesLocal;
