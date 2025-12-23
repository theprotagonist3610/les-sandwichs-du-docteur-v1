# Système de Synchronisation des Adresses - Documentation

## Vue d'ensemble

Ce document décrit l'implémentation complète du système de synchronisation bidirectionnelle entre IndexedDB (local) et Supabase (cloud) pour la gestion des adresses dans la PWA Les Sandwichs du Docteur.

## Architecture

### Offline-First Architecture

Le système utilise une approche **offline-first** qui garantit que l'application fonctionne même sans connexion Internet :

1. **Stockage local (IndexedDB)** : Toutes les données sont d'abord stockées localement
2. **Queue de synchronisation** : Les modifications sont enregistrées dans une queue
3. **Synchronisation bidirectionnelle** : Les changements sont synchronisés avec Supabase
4. **Temps réel** : Les changements distants sont reçus en temps réel via Supabase Realtime

### Composants du système

```
┌─────────────────────────────────────────────────────────────┐
│                     Application React                        │
├─────────────────────────────────────────────────────────────┤
│  Hooks React                                                 │
│  ├─ useAdressesLocal.jsx    (CRUD local)                    │
│  └─ useAdressesSync.jsx     (Synchronisation)               │
├─────────────────────────────────────────────────────────────┤
│  Services                                                    │
│  └─ adressesSyncService.js  (Logique de sync)               │
├─────────────────────────────────────────────────────────────┤
│  IndexedDB (Local)                                           │
│  ├─ db/indexedDB.js         (Configuration)                 │
│  ├─ db/adressesDB.js        (CRUD operations)               │
│  └─ db/syncQueue.js         (Queue de sync)                 │
├─────────────────────────────────────────────────────────────┤
│  Supabase (Cloud)                                            │
│  ├─ Table: adresses         (Données principales)           │
│  ├─ Table: adresses_sync    (Journal de changements)        │
│  └─ Triggers                (Auto-population du journal)    │
└─────────────────────────────────────────────────────────────┘
```

## Installation et Configuration

### 1. Installer les dépendances

La dépendance `idb` a déjà été installée :

```bash
npm install
```

### 2. Créer les tables Supabase

Exécuter les scripts SQL dans l'ordre suivant :

#### a. Créer la table `adresses` (si ce n'est pas déjà fait)

```bash
sql/create_adresses_table.sql
```

#### b. Créer la table `adresses_sync`

```bash
sql/create_adresses_sync_table.sql
```

#### c. Créer les triggers de synchronisation

```bash
sql/create_adresses_sync_triggers.sql
```

### 3. Activer Supabase Realtime

Dans le Dashboard Supabase :
1. Aller dans **Database** → **Replication**
2. Activer **Realtime** pour la table `adresses_sync`

Ou via SQL :
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE adresses_sync;
```

## Utilisation

### Hook `useAdressesLocal` - Gestion locale des données

Ce hook fournit toutes les opérations CRUD sur les adresses stockées localement.

#### Exemple d'utilisation

```jsx
import useAdressesLocal from '@/hooks/useAdressesLocal';

function AdressesManager() {
  const {
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
    searchByDepartement,
    searchByProximity,
    getAdresseById,

    // Utilitaires
    refresh,
  } = useAdressesLocal();

  // Créer une nouvelle adresse
  const handleCreate = async () => {
    const result = await createAdresse({
      departement: 'Atlantique',
      commune: 'Cotonou',
      arrondissement: '1er',
      quartier: 'Dantokpa',
      localisation: { lat: 6.3654, lng: 2.4183 }
    });

    if (result.success) {
      console.log('Adresse créée:', result.id);
    }
  };

  // Mettre à jour une adresse
  const handleUpdate = async (id) => {
    const result = await updateAdresse(id, {
      quartier: 'Nouveau quartier'
    });
  };

  // Désactiver une adresse (soft delete)
  const handleDeactivate = async (id) => {
    const result = await deactivateAdresse(id);
  };

  // Rechercher par proximité
  const handleSearchNearby = async (lat, lng) => {
    const { adresses } = await searchByProximity(lat, lng, 5); // 5km
    console.log('Adresses à proximité:', adresses);
  };

  return (
    <div>
      {isLoading && <p>Chargement...</p>}
      {error && <p>Erreur: {error}</p>}

      <h2>Total: {adresses.length} adresses</h2>
      <p>Actives: {stats?.active} | Inactives: {stats?.inactive}</p>

      <button onClick={handleCreate}>Créer</button>
      <button onClick={refresh}>Rafraîchir</button>

      <ul>
        {adresses.map(adresse => (
          <li key={adresse.id}>
            {adresse.departement} - {adresse.commune}
            <button onClick={() => handleUpdate(adresse.id)}>Modifier</button>
            <button onClick={() => handleDeactivate(adresse.id)}>Désactiver</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Hook `useAdressesSync` - Synchronisation

Ce hook gère la synchronisation bidirectionnelle et le mode temps réel.

#### Exemple d'utilisation

```jsx
import useAdressesSync from '@/hooks/useAdressesSync';

function SyncManager() {
  const {
    // État
    online,
    isSyncing,
    isInitialized,
    syncError,
    lastSync,
    queueStats,

    // Actions
    syncPull,
    syncPush,
    syncFull,
    startSync,
    stopSync,

    // Utilitaires
    getSyncStatus,
    needsSync,
    getTimeSinceLastSync,
  } = useAdressesSync({
    autoStart: true,           // Démarrer la sync temps réel automatiquement
    enableAutoSync: true,      // Activer la sync périodique
    autoSyncInterval: 5 * 60 * 1000, // 5 minutes
  });

  // Synchronisation complète (Pull + Push)
  const handleFullSync = async () => {
    const result = await syncFull();
    if (result.success) {
      console.log('Synchronisation réussie');
      console.log('Pull:', result.pullCount, 'adresses');
      console.log('Push:', result.pushProcessed, 'opérations');
    }
  };

  // Envoyer les modifications locales
  const handlePush = async () => {
    const result = await syncPush();
    console.log('Envoyé:', result.processed, 'opérations');
  };

  // Télécharger depuis Supabase
  const handlePull = async () => {
    const result = await syncPull();
    console.log('Téléchargé:', result.count, 'adresses');
  };

  const status = getSyncStatus();
  const { pullMinutes, pushMinutes } = getTimeSinceLastSync();

  return (
    <div>
      <h2>État de la synchronisation</h2>

      <p>
        Connexion: {online ? '🟢 En ligne' : '🔴 Hors ligne'}
      </p>

      <p>
        Synchronisation: {isSyncing ? '🔄 En cours...' : '✅ Prête'}
      </p>

      <p>
        Initialisée: {isInitialized ? '✅' : '❌'}
      </p>

      {syncError && <p style={{color: 'red'}}>Erreur: {syncError}</p>}

      <h3>Queue de synchronisation</h3>
      <p>En attente: {queueStats?.pending || 0}</p>
      <p>Échouées: {queueStats?.failed || 0}</p>

      <h3>Dernière synchronisation</h3>
      <p>Pull: {pullMinutes ? `il y a ${pullMinutes} min` : 'Jamais'}</p>
      <p>Push: {pushMinutes ? `il y a ${pushMinutes} min` : 'Jamais'}</p>

      <h3>Actions</h3>
      <button onClick={handleFullSync} disabled={!online || isSyncing}>
        Synchronisation complète
      </button>
      <button onClick={handlePush} disabled={!online || isSyncing}>
        Envoyer les changements
      </button>
      <button onClick={handlePull} disabled={!online || isSyncing}>
        Télécharger
      </button>
      <button onClick={startSync}>Activer temps réel</button>
      <button onClick={stopSync}>Désactiver temps réel</button>

      {needsSync(10) && (
        <p style={{color: 'orange'}}>
          ⚠️ Synchronisation recommandée
        </p>
      )}
    </div>
  );
}
```

### Utilisation combinée

```jsx
import useAdressesLocal from '@/hooks/useAdressesLocal';
import useAdressesSync from '@/hooks/useAdressesSync';

function AdressesApp() {
  const local = useAdressesLocal();
  const sync = useAdressesSync({ autoStart: true });

  // Initialisation: Synchroniser si nécessaire
  useEffect(() => {
    if (!sync.isInitialized && sync.online) {
      sync.syncPull(); // Premier téléchargement
    }
  }, [sync.isInitialized, sync.online]);

  // Créer et synchroniser
  const handleCreateAndSync = async () => {
    const result = await local.createAdresse({
      departement: 'Atlantique',
      commune: 'Cotonou',
      arrondissement: '1er',
      quartier: 'Test',
    });

    if (result.success && sync.online) {
      // La sync sera automatique, mais on peut forcer
      await sync.syncPush();
    }
  };

  return (
    <div>
      <SyncIndicator {...sync} />
      <AdressesList {...local} />
      <button onClick={handleCreateAndSync}>
        Créer nouvelle adresse
      </button>
    </div>
  );
}
```

## Flux de données

### Création d'une adresse (Offline-First)

```
1. Utilisateur crée une adresse
   ↓
2. createAdresse() → IndexedDB
   ↓
3. addToSyncQueue() → Queue
   ↓
4. [Si online] Auto-sync → Supabase
   ↓
5. Trigger Supabase → adresses_sync
   ↓
6. Realtime → Autres clients
```

### Modification depuis un autre client

```
1. Client B modifie une adresse
   ↓
2. Supabase: UPDATE adresses
   ↓
3. Trigger → INSERT adresses_sync
   ↓
4. Realtime broadcast
   ↓
5. Client A reçoit le changement
   ↓
6. handleRealtimeChange() → IndexedDB
   ↓
7. UI se met à jour automatiquement
```

## Base de données IndexedDB

### Structure

**Base de données** : `LSDDatabase` (version 1)

**Stores** :

1. **adresses**
   - keyPath: `id`
   - Index: `departement`, `commune`, `arrondissement`, `quartier`, `is_active`, `sync_status`, `updated_at`

2. **sync_queue**
   - keyPath: `id` (auto-increment)
   - Index: `operation_type`, `status`, `timestamp`, `status_timestamp`

3. **sync_metadata**
   - keyPath: `key`
   - Contient: `last_pull_sync`, `last_push_sync`, `initial_sync_done`

### Statuts de synchronisation

**sync_status dans adresses** :
- `pending` : En attente de synchronisation
- `synced` : Synchronisée avec Supabase
- `error` : Erreur lors de la synchronisation

**status dans sync_queue** :
- `pending` : En attente
- `in_progress` : En cours de traitement
- `completed` : Terminée (puis supprimée)
- `failed` : Échouée (max 3 tentatives)

## Tables Supabase

### Table `adresses`

```sql
CREATE TABLE adresses (
  id UUID PRIMARY KEY,
  departement TEXT NOT NULL,
  commune TEXT NOT NULL,
  arrondissement TEXT NOT NULL,
  quartier TEXT NOT NULL,
  localisation JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table `adresses_sync`

```sql
CREATE TABLE adresses_sync (
  id BIGSERIAL PRIMARY KEY,
  adresse_id UUID NOT NULL,
  operation_type TEXT CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id),
  old_data JSONB,
  new_data JSONB
);
```

## Fonctions utilitaires SQL

### Tester les triggers

```sql
SELECT test_adresses_sync_triggers();
```

### Obtenir les statistiques

```sql
SELECT * FROM get_adresses_sync_trigger_stats();
```

### Vérifier l'état des triggers

```sql
SELECT * FROM check_adresses_sync_triggers_status();
```

### Nettoyer les anciens enregistrements

```sql
SELECT cleanup_adresses_sync(); -- Supprime les enregistrements de > 7 jours
```

### Désactiver temporairement les triggers (imports massifs)

```sql
SELECT disable_adresses_sync_triggers();
-- Effectuer l'import...
SELECT enable_adresses_sync_triggers();
```

## Gestion des conflits

Le système utilise une stratégie **last-write-wins** basée sur les timestamps :
- Le changement le plus récent (`updated_at`) a la priorité
- Pas de résolution manuelle de conflits pour le moment
- Les changements sont fusionnés automatiquement

## Mode hors ligne

Lorsque l'application est hors ligne :

1. ✅ Toutes les opérations CRUD fonctionnent normalement
2. ✅ Les changements sont enregistrés dans la queue
3. ✅ L'UI fonctionne sans interruption
4. ⏸️ La synchronisation est mise en pause
5. 🔄 Dès le retour en ligne, la sync reprend automatiquement

## Performance

### Optimisations implémentées

- **Index IndexedDB** : Recherches rapides par département, commune, etc.
- **Index Supabase** : Requêtes SQL optimisées
- **Batch processing** : Traitement par lots dans la queue
- **Nettoyage automatique** : Suppression des anciens enregistrements de sync

### Recommandations

- Activer le nettoyage automatique avec pg_cron (script fourni)
- Surveiller la taille de la table `adresses_sync`
- Limiter les updates inutiles (vérification NEW = OLD dans le trigger)

## Debugging

### Vérifier IndexedDB dans DevTools

1. F12 → Application → IndexedDB → LSDDatabase
2. Explorer les stores : adresses, sync_queue, sync_metadata

### Logs de synchronisation

Tous les logs sont préfixés avec des emojis :
- 🔄 : Synchronisation en cours
- ✓ : Opération réussie
- ❌ : Erreur
- ⚠ : Avertissement
- 📥 : PULL (téléchargement)
- 📤 : PUSH (envoi)
- 📡 : Changement temps réel

### Console Supabase

Vérifier les changements en temps réel :
```sql
SELECT * FROM recent_adresses_changes;
SELECT * FROM adresses_sync_stats;
```

## Sécurité

### Row Level Security (RLS)

- **adresses** : Politiques à définir selon vos besoins
- **adresses_sync** : Lecture pour `authenticated`, insertion pour `service_role`

### Validation

- Contraintes SQL : GPS coordinates, champs non vides
- Validation côté client : À implémenter dans les composants React

## Prochaines étapes

1. ✅ Système de base implémenté
2. ⏳ Créer les composants UI pour gérer les adresses
3. ⏳ Implémenter la géolocalisation avec Nominatim
4. ⏳ Ajouter l'import depuis `assets/adresse_liste.json`
5. ⏳ Créer les rapports et exports (CSV, JSON)
6. ⏳ Implémenter les notifications de sync

## Support

Pour toute question ou problème :
1. Consulter cette documentation
2. Vérifier les logs de la console
3. Tester les triggers avec `test_adresses_sync_triggers()`
4. Vérifier la structure IndexedDB dans DevTools

---

**Version** : 1.0
**Date** : 2025-12-19
**Auteur** : Claude Sonnet 4.5
