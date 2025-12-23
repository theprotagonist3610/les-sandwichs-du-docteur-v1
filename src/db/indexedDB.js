import { openDB } from 'idb';

/**
 * Configuration de la base de données IndexedDB locale
 * Base: LSDDatabase
 * Version: 1
 */

const DB_NAME = 'LSDDatabase';
const DB_VERSION = 2;

/**
 * Initialiser et ouvrir la base de données IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`Mise à jour de la base de données v${oldVersion} → v${newVersion}`);

      // Store: adresses
      if (!db.objectStoreNames.contains('adresses')) {
        const adressesStore = db.createObjectStore('adresses', { keyPath: 'id' });

        // Index pour les recherches par localisation géographique
        adressesStore.createIndex('departement', 'departement', { unique: false });
        adressesStore.createIndex('commune', 'commune', { unique: false });
        adressesStore.createIndex('arrondissement', 'arrondissement', { unique: false });
        adressesStore.createIndex('quartier', 'quartier', { unique: false });

        // Index pour le statut actif/inactif
        adressesStore.createIndex('is_active', 'is_active', { unique: false });

        // Index pour le statut de synchronisation
        adressesStore.createIndex('sync_status', 'sync_status', { unique: false });

        // Index pour trier par date de mise à jour
        adressesStore.createIndex('updated_at', 'updated_at', { unique: false });

        console.log('✓ Store "adresses" créé avec succès');
      }

      // Store: sync_queue - Queue des opérations à synchroniser
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', {
          keyPath: 'id',
          autoIncrement: true
        });

        // Index pour filtrer par type d'opération
        syncStore.createIndex('operation_type', 'operation_type', { unique: false });

        // Index pour filtrer par statut
        syncStore.createIndex('status', 'status', { unique: false });

        // Index pour trier par timestamp
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });

        // Index composite pour les requêtes fréquentes
        syncStore.createIndex('status_timestamp', ['status', 'timestamp'], { unique: false });

        console.log('✓ Store "sync_queue" créé avec succès');
      }

      // Store: sync_metadata - Métadonnées de synchronisation
      if (!db.objectStoreNames.contains('sync_metadata')) {
        db.createObjectStore('sync_metadata', { keyPath: 'key' });
        console.log('✓ Store "sync_metadata" créé avec succès');
      }

      // Store: livreurs
      if (!db.objectStoreNames.contains('livreurs')) {
        const livreursStore = db.createObjectStore('livreurs', { keyPath: 'id' });

        // Index pour les recherches
        livreursStore.createIndex('denomination', 'denomination', { unique: false });
        livreursStore.createIndex('contact', 'contact', { unique: false });

        // Index pour le statut actif/inactif
        livreursStore.createIndex('is_active', 'is_active', { unique: false });

        // Index pour trier par date
        livreursStore.createIndex('created_at', 'created_at', { unique: false });
        livreursStore.createIndex('updated_at', 'updated_at', { unique: false });

        // Index composite pour les recherches avec filtre actif
        livreursStore.createIndex('active_denomination', ['is_active', 'denomination'], { unique: false });

        console.log('✓ Store "livreurs" créé avec succès');
      }
    },

    blocked() {
      console.warn('Mise à jour de la base de données bloquée par un autre onglet');
    },

    blocking() {
      console.warn('Cette version de la base de données bloque un autre onglet');
    },

    terminated() {
      console.error('Connexion à la base de données terminée de manière inattendue');
    }
  });
};

/**
 * Vérifier si la base de données est initialisée
 * @returns {Promise<boolean>}
 */
export const isDBInitialized = async () => {
  try {
    const db = await initDB();
    const metadata = await db.get('sync_metadata', 'initial_sync_done');
    return metadata?.value === true;
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'initialisation:', error);
    return false;
  }
};

/**
 * Réinitialiser complètement la base de données (DANGER!)
 * @returns {Promise<void>}
 */
export const resetDB = async () => {
  try {
    const db = await initDB();

    // Vider toutes les tables
    const stores = ['adresses', 'livreurs', 'sync_queue', 'sync_metadata'];
    for (const storeName of stores) {
      const tx = db.transaction(storeName, 'readwrite');
      await tx.store.clear();
      await tx.done;
    }

    console.log('✓ Base de données réinitialisée');
  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    throw error;
  }
};

/**
 * Obtenir les statistiques de la base de données
 * @returns {Promise<Object>}
 */
export const getDBStats = async () => {
  try {
    const db = await initDB();

    const stats = {
      adresses: await db.count('adresses'),
      livreurs: await db.count('livreurs'),
      sync_queue: await db.count('sync_queue'),
      metadata: await db.count('sync_metadata'),
      dbSize: 0, // IndexedDB ne fournit pas directement la taille
    };

    return stats;
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return null;
  }
};

export default {
  initDB,
  isDBInitialized,
  resetDB,
  getDBStats,
  DB_NAME,
  DB_VERSION
};
