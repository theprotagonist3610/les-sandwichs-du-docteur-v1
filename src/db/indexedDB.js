import { openDB } from 'idb';

const DB_NAME = 'LSDDatabase';
const DB_VERSION = 2;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      if (!db.objectStoreNames.contains('adresses')) {
        const adressesStore = db.createObjectStore('adresses', { keyPath: 'id' });
        adressesStore.createIndex('departement', 'departement', { unique: false });
        adressesStore.createIndex('commune', 'commune', { unique: false });
        adressesStore.createIndex('arrondissement', 'arrondissement', { unique: false });
        adressesStore.createIndex('quartier', 'quartier', { unique: false });
        adressesStore.createIndex('is_active', 'is_active', { unique: false });
        adressesStore.createIndex('sync_status', 'sync_status', { unique: false });
        adressesStore.createIndex('updated_at', 'updated_at', { unique: false });
      }

      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', {
          keyPath: 'id',
          autoIncrement: true,
        });
        syncStore.createIndex('operation_type', 'operation_type', { unique: false });
        syncStore.createIndex('status', 'status', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('status_timestamp', ['status', 'timestamp'], { unique: false });
      }

      if (!db.objectStoreNames.contains('sync_metadata')) {
        db.createObjectStore('sync_metadata', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('livreurs')) {
        const livreursStore = db.createObjectStore('livreurs', { keyPath: 'id' });
        livreursStore.createIndex('denomination', 'denomination', { unique: false });
        livreursStore.createIndex('contact', 'contact', { unique: false });
        livreursStore.createIndex('is_active', 'is_active', { unique: false });
        livreursStore.createIndex('created_at', 'created_at', { unique: false });
        livreursStore.createIndex('updated_at', 'updated_at', { unique: false });
        livreursStore.createIndex('active_denomination', ['is_active', 'denomination'], { unique: false });
      }
    },

    blocked() {},
    blocking() {},
    terminated() {},
  });
};

export const isDBInitialized = async () => {
  try {
    const db = await initDB();
    const metadata = await db.get('sync_metadata', 'initial_sync_done');
    return metadata?.value === true;
  } catch {
    return false;
  }
};

export const resetDB = async () => {
  const db = await initDB();
  for (const storeName of ['adresses', 'livreurs', 'sync_queue', 'sync_metadata']) {
    const tx = db.transaction(storeName, 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
};

export const getDBStats = async () => {
  try {
    const db = await initDB();
    return {
      adresses: await db.count('adresses'),
      livreurs: await db.count('livreurs'),
      sync_queue: await db.count('sync_queue'),
      metadata: await db.count('sync_metadata'),
      dbSize: 0, // IndexedDB ne fournit pas la taille directement
    };
  } catch {
    return null;
  }
};

export { DB_NAME, DB_VERSION };
