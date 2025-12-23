# PLAN DE CORRECTION - SYSTÈME DE GESTION DES LIVREURS

**Date:** 2025-12-21
**Objectif:** Corriger les 13 erreurs identifiées dans l'audit
**Priorité:** CRITIQUE - Synchronisation actuellement non fonctionnelle

---

## RÉSUMÉ EXÉCUTIF

### Erreurs identifiées: 13
- 🔴 **Critiques (bloquantes):** 3
- 🟡 **Majeures (bugs sérieux):** 4
- 🔵 **Mineures (améliorations):** 6

### Stratégie de correction
Les corrections seront effectuées en 3 phases successives :
1. **Phase 1 - URGENTE:** Débloquer la synchronisation (3 erreurs critiques)
2. **Phase 2 - IMPORTANTE:** Corriger les bugs de données (4 erreurs majeures)
3. **Phase 3 - OPTIMISATION:** Améliorer robustesse et performance (6 améliorations)

---

## PHASE 1 - CORRECTIONS CRITIQUES (URGENT)

**Durée estimée:** 1-2 jours
**Objectif:** Rendre la synchronisation fonctionnelle

### ✅ CORRECTION #1: Normaliser les types d'opération

**Erreur:** JavaScript utilise `"create"/"update"/"delete"` alors que SQL attend `'INSERT'/'UPDATE'/'DELETE'`

**Impact:** ❌ Aucune synchronisation ne fonctionne

#### Étape 1.1 - Créer le fichier de constantes

**Fichier:** `src/constants/syncConstants.js` (NOUVEAU)

```javascript
/**
 * Constantes pour la synchronisation IndexedDB ↔ Supabase
 */

// Types d'opérations (conformes à la contrainte SQL)
export const OPERATION_TYPES = {
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
};

// Types d'entités
export const ENTITY_TYPES = {
  LIVREUR: 'livreur',
  ADRESSE: 'adresse',
  FOURNISSEUR: 'fournisseur',
  // À compléter au fur et à mesure
};

// Statuts de synchronisation
export const SYNC_STATUS = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  FAILED: 'failed',
};

// Mapper les types user-friendly vers les types SQL
export const mapOperationType = (userType) => {
  const mapping = {
    'create': OPERATION_TYPES.INSERT,
    'update': OPERATION_TYPES.UPDATE,
    'delete': OPERATION_TYPES.DELETE,
    'INSERT': OPERATION_TYPES.INSERT,
    'UPDATE': OPERATION_TYPES.UPDATE,
    'DELETE': OPERATION_TYPES.DELETE,
  };

  const normalized = mapping[userType];

  if (!normalized) {
    throw new Error(`Type d'opération invalide: ${userType}. Attendu: create, update, delete`);
  }

  return normalized;
};
```

#### Étape 1.2 - Modifier useLivreursSync.jsx

**Fichier:** `src/hooks/useLivreursSync.jsx`

**Changements:**

```javascript
// AJOUTER en haut du fichier
import {
  OPERATION_TYPES,
  ENTITY_TYPES,
  SYNC_STATUS,
  mapOperationType,
} from "@/constants/syncConstants";

// MODIFIER la fonction addToQueue (ligne 62)
const addToQueue = useCallback(async (operation) => {
  try {
    // Validation
    if (!operation.type) {
      throw new Error("Type d'opération requis");
    }
    if (!operation.entity_id && !operation.livreurId) {
      throw new Error("entity_id ou livreurId requis");
    }

    const db = await initDB();
    const queueItem = {
      operation_type: mapOperationType(operation.type), // ✓ Convertit "create" → "INSERT"
      entity_type: ENTITY_TYPES.LIVREUR,
      entity_id: operation.entity_id || operation.livreurId, // Support des 2 formats
      data: operation.data,
      timestamp: new Date().toISOString(),
      status: SYNC_STATUS.PENDING,
    };

    await db.add("sync_queue", queueItem);
    await updateQueueStats();
  } catch (error) {
    console.error("Erreur ajout à la queue:", error);
    throw error; // Propager l'erreur pour que l'appelant soit notifié
  }
}, []);

// MODIFIER processQueue (ligne 107)
const processQueue = useCallback(async () => {
  if (!online) return { success: false, error: "Hors ligne" };

  try {
    const db = await initDB();
    const queue = await db.getAll("sync_queue");

    const pendingOps = queue.filter(
      (op) =>
        op.entity_type === ENTITY_TYPES.LIVREUR &&
        op.status === SYNC_STATUS.PENDING
    );

    let processed = 0;
    let failed = 0;

    for (const op of pendingOps) {
      try {
        // Validation
        if (!op.entity_id) {
          throw new Error(`entity_id manquant pour l'opération ${op.id}`);
        }

        // Traitement selon le type
        switch (op.operation_type) {
          case OPERATION_TYPES.INSERT:
            if (!op.data) throw new Error("data manquant pour INSERT");
            await createSupabaseLivreur(op.data);
            break;

          case OPERATION_TYPES.UPDATE:
            if (!op.data) throw new Error("data manquant pour UPDATE");
            await updateSupabaseLivreur(op.entity_id, op.data);
            break;

          case OPERATION_TYPES.DELETE:
            await deleteSupabaseLivreur(op.entity_id);
            break;

          default:
            throw new Error(`Type d'opération inconnu: ${op.operation_type}`);
        }

        // Marquer comme traité
        const updatedOp = {
          ...op,
          status: SYNC_STATUS.PROCESSED,
          processedAt: new Date().toISOString(),
        };
        await db.put("sync_queue", updatedOp);
        processed++;

      } catch (error) {
        console.error(`Erreur traitement opération ${op.id}:`, error);
        const failedOp = {
          ...op,
          status: SYNC_STATUS.FAILED,
          error: error.message,
          failed_at: new Date().toISOString(),
        };
        await db.put("sync_queue", failedOp);
        failed++;
      }
    }

    await updateQueueStats();

    return { success: true, processed, failed };
  } catch (error) {
    console.error("Erreur traitement queue:", error);
    return { success: false, error: error.message };
  }
}, [online]);

// MODIFIER updateQueueStats (ligne 84)
const updateQueueStats = useCallback(async () => {
  try {
    const db = await initDB();
    const queue = await db.getAll("sync_queue");

    const livreurQueue = queue.filter((op) => op.entity_type === ENTITY_TYPES.LIVREUR);

    setQueueStats({
      total: livreurQueue.length,
      pending: livreurQueue.filter((op) => op.status === SYNC_STATUS.PENDING).length,
      processed: livreurQueue.filter((op) => op.status === SYNC_STATUS.PROCESSED).length,
      failed: livreurQueue.filter((op) => op.status === SYNC_STATUS.FAILED).length,
    });
  } catch (error) {
    console.error("Erreur stats queue:", error);
  }
}, []);
```

#### Étape 1.3 - Modifier DesktopLivreurs.jsx

**Fichier:** `src/pages/outils/livreurs/DesktopLivreurs.jsx`

**Changements:**

```javascript
// REMPLACER les lignes 65-69 (handleCreate)
await addToQueue({
  type: "create",      // ✓ Sera converti en "INSERT"
  entity_id: livreur.id,  // ✓ Utiliser entity_id
  data: livreur,
});

// REMPLACER les lignes 101-106 (handleUpdate)
await addToQueue({
  type: "update",      // ✓ Sera converti en "UPDATE"
  entity_id: livreur.id,
  data: livreurData,
});

// REMPLACER les lignes 136-139 (handleDelete)
await addToQueue({
  type: "delete",      // ✓ Sera converti en "DELETE"
  entity_id: livreurId,
  data: null,
});

// REMPLACER les lignes 167-171 (handleToggleActive)
await addToQueue({
  type: "update",      // ✓ Sera converti en "UPDATE"
  entity_id: livreurId,
  data: { is_active: newStatus },
});
```

#### Étape 1.4 - Modifier MobileLivreurs.jsx

**Fichier:** `src/pages/outils/livreurs/MobileLivreurs.jsx`

**Changements identiques à DesktopLivreurs.jsx:**

```javascript
// Lignes 65-69, 101-106, 136-139, 167-171
// Même modifications que Desktop
```

#### Étape 1.5 - Tests

```javascript
// Test manuel à effectuer:
1. Créer un livreur offline
   → Vérifier dans IndexedDB que sync_queue contient operation_type: "INSERT"

2. Passer online et synchroniser
   → Vérifier que l'opération est processed
   → Vérifier dans Supabase que le livreur existe
   → Vérifier dans livreurs_sync qu'une entrée INSERT existe

3. Modifier le livreur
   → Vérifier sync_queue: operation_type: "UPDATE"
   → Sync et vérifier Supabase updated

4. Désactiver le livreur
   → Vérifier sync_queue: operation_type: "UPDATE"
   → Sync et vérifier is_active = false

5. Supprimer le livreur
   → Vérifier sync_queue: operation_type: "DELETE"
   → Sync et vérifier suppression Supabase
```

---

### ✅ CORRECTION #2: Synchroniser les UUIDs

**Erreur:** UUID généré localement différent de l'UUID Supabase

**Impact:** ❌ Doublons, impossibilité de mettre à jour

#### Étape 2.1 - Modifier livreurToolkit.jsx

**Fichier:** `src/utils/livreurToolkit.jsx`

**Changement:**

```javascript
// REMPLACER la fonction createLivreur (lignes 33-57)
export const createLivreur = async (livreurData) => {
  try {
    const insertData = {
      denomination: livreurData.denomination,
      contact: livreurData.contact,
      is_active: livreurData.is_active ?? true,
    };

    // ✓ Si un UUID est fourni (création offline), l'utiliser
    if (livreurData.id) {
      insertData.id = livreurData.id;
    }

    const { data, error } = await supabase
      .from("livreurs")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error("Erreur création livreur:", error);
      return { success: false, error: error.message };
    }

    return { success: true, livreur: data };
  } catch (error) {
    console.error("Erreur inattendue création livreur:", error);
    return { success: false, error: error.message };
  }
};
```

#### Étape 2.2 - Vérifier le schéma SQL

**Fichier:** `sql/create_livreurs_table.sql`

Le schéma actuel est déjà compatible (ligne 15):
```sql
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
```

Le `DEFAULT` permet d'insérer un UUID personnalisé. ✅ Aucune modification nécessaire.

#### Étape 2.3 - Tests

```javascript
// Test de conservation d'UUID:
1. Créer un livreur offline
   const localId = crypto.randomUUID();
   createLivreur({ id: localId, denomination: "Test", contact: "123456789" })

2. Vérifier IndexedDB
   → Livreur existe avec id = localId

3. Synchroniser
   → processQueue() envoie data avec id = localId

4. Vérifier Supabase
   → SELECT * FROM livreurs WHERE id = localId
   → Devrait retourner 1 ligne

5. syncPull()
   → Vérifier qu'aucun doublon n'est créé dans IndexedDB
   → Devrait toujours avoir 1 seul livreur avec id = localId
```

---

### ✅ CORRECTION #3: Standardiser les noms de champs

**Erreur:** Mélange de `livreurId` et `entity_id`

**Impact:** ⚠️ Confusion, risque d'undefined

**Note:** Cette correction est déjà incluse dans la Correction #1 (Étapes 1.3 et 1.4).

Les modifications dans Desktop/Mobile remplacent tous les `livreurId` par `entity_id`.

La fonction `addToQueue` modifiée supporte les deux formats pour la rétrocompatibilité:
```javascript
entity_id: operation.entity_id || operation.livreurId
```

#### Tests

```javascript
// Vérifier qu'aucune opération n'a entity_id = undefined:
1. Ouvrir IndexedDB dans DevTools
2. Aller dans sync_queue
3. Vérifier que tous les items ont entity_id valide (UUID)
```

---

## PHASE 2 - CORRECTIONS MAJEURES (IMPORTANTE)

**Durée estimée:** 1 semaine
**Objectif:** Corriger les bugs de données et sécurité

### ✅ CORRECTION #4: Supprimer double mise à jour de updated_at

**Erreur:** Timestamp mis à jour par le code ET par le trigger SQL

#### Étape 4.1 - Modifier livreurToolkit.jsx

**Fichier:** `src/utils/livreurToolkit.jsx`

```javascript
// REMPLACER updateLivreur (lignes 132-156)
export const updateLivreur = async (livreurId, updates) => {
  try {
    // ✓ Laisser le trigger SQL gérer updated_at
    const { data, error } = await supabase
      .from("livreurs")
      .update(updates)  // ❌ NE PAS ajouter updated_at manuellement
      .eq("id", livreurId)
      .select()
      .single();

    if (error) {
      console.error("Erreur mise à jour livreur:", error);
      return { success: false, error: error.message };
    }

    return { success: true, livreur: data };
  } catch (error) {
    console.error("Erreur inattendue mise à jour livreur:", error);
    return { success: false, error: error.message };
  }
};
```

#### Étape 4.2 - Modifier deactivateLivreur et activateLivreur

**Fichier:** `src/utils/livreurToolkit.jsx`

```javascript
// REMPLACER deactivateLivreur (lignes 163-185)
export const deactivateLivreur = async (livreurId) => {
  try {
    const { data, error } = await supabase
      .from("livreurs")
      .update({ is_active: false })  // ✓ Sans updated_at
      .eq("id", livreurId)
      .select()
      .single();

    if (error) {
      console.error("Erreur désactivation livreur:", error);
      return { success: false, error: error.message };
    }

    return { success: true, livreur: data };
  } catch (error) {
    console.error("Erreur inattendue désactivation livreur:", error);
    return { success: false, error: error.message };
  }
};

// REMPLACER activateLivreur (lignes 192-214)
export const activateLivreur = async (livreurId) => {
  try {
    const { data, error } = await supabase
      .from("livreurs")
      .update({ is_active: true })  // ✓ Sans updated_at
      .eq("id", livreurId)
      .select()
      .single();

    if (error) {
      console.error("Erreur activation livreur:", error);
      return { success: false, error: error.message };
    }

    return { success: true, livreur: data };
  } catch (error) {
    console.error("Erreur inattendue activation livreur:", error);
    return { success: false, error: error.message };
  }
};
```

#### Tests

```javascript
// Vérifier que updated_at est correct:
1. Modifier un livreur
2. Noter le timestamp retourné par l'API
3. SELECT updated_at FROM livreurs WHERE id = ...
4. Les 2 timestamps doivent être identiques (±1ms)
```

---

### ✅ CORRECTION #5: Implémenter résolution de conflits

**Erreur:** Last-write-wins écrase toutes les données sans merge

#### Étape 5.1 - Créer fonction de merge

**Fichier:** `src/hooks/useLivreursSync.jsx`

```javascript
// AJOUTER après les imports
/**
 * Merge intelligent de 2 versions d'un livreur
 * Stratégie: Last-write-wins par champ
 */
const mergeLivreurConflict = (local, remote) => {
  const localTime = new Date(local.updated_at);
  const remoteTime = new Date(remote.updated_at);

  // Si remote est plus récent, le prendre entièrement
  if (remoteTime > localTime) {
    return { ...remote, _merged: false, _source: 'remote' };
  }

  // Si local est plus récent, le garder entièrement
  if (localTime > remoteTime) {
    return { ...local, _merged: false, _source: 'local' };
  }

  // Si même timestamp (rare mais possible), merger field-by-field
  // En cas d'égalité, privilégier le remote (serveur fait foi)
  return {
    id: remote.id,
    denomination: remote.denomination !== local.denomination
      ? remote.denomination
      : local.denomination,
    contact: remote.contact !== local.contact
      ? remote.contact
      : local.contact,
    is_active: remote.is_active, // Le serveur fait foi pour le statut
    created_at: local.created_at, // Garder le plus ancien
    updated_at: new Date(Math.max(localTime, remoteTime)).toISOString(),
    _merged: true,
    _source: 'conflict',
  };
};
```

#### Étape 5.2 - Modifier syncPull

**Fichier:** `src/hooks/useLivreursSync.jsx`

```javascript
// REMPLACER la boucle de merge (lignes 201-214)
// Ajouter ou mettre à jour depuis Supabase
for (const [id, supabaseLivreur] of supabaseMap) {
  const localLivreur = localMap.get(id);

  if (!localLivreur) {
    // Nouveau livreur depuis Supabase
    await store.add(supabaseLivreur);
    added++;
  } else {
    // Livreur existe déjà localement, merger
    const merged = mergeLivreurConflict(localLivreur, supabaseLivreur);

    // Mettre à jour seulement si le merge a changé quelque chose
    if (
      merged._source === 'remote' ||
      merged._source === 'conflict' ||
      JSON.stringify(merged) !== JSON.stringify(localLivreur)
    ) {
      // Nettoyer les champs de debug
      delete merged._merged;
      delete merged._source;

      await store.put(merged);
      updated++;
    }
  }
}
```

#### Tests

```javascript
// Test de conflit:
1. User A offline: Modifie denomination de "DHL" → "DHL Express"
2. User B offline: Modifie contact de "+237693456789" → "+237698765432"
3. User A sync en premier (updated_at = T1)
4. User B sync ensuite (updated_at = T2 > T1)
5. Vérifier résultat final:
   - Si T2 > T1: denomination = "DHL", contact = "+237698765432" (User B gagne)
   - Aucune donnée perdue (logged)
```

---

### ✅ CORRECTION #6: Vérifier politique RLS

**Erreur:** RLS trop restrictive bloque les triggers

#### Étape 6.1 - Exécuter le script de fix

**Fichier:** `sql/fix_livreurs_sync_rls.sql` (déjà existant)

```sql
-- EXÉCUTER dans Supabase SQL Editor
DROP POLICY IF EXISTS "Insertion des changements via triggers uniquement" ON livreurs_sync;

CREATE POLICY "Insertion des changements pour utilisateurs authentifiés"
  ON livreurs_sync
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

#### Étape 6.2 - Vérifier les politiques

```sql
-- VÉRIFIER dans Supabase SQL Editor
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'livreurs_sync';

-- Doit retourner:
-- policyname: "Insertion des changements pour utilisateurs authentifiés"
-- roles: {authenticated}
-- cmd: INSERT
```

#### Tests

```javascript
// Tester les triggers:
1. Créer un livreur via Supabase (en tant qu'utilisateur authentifié)
2. Vérifier que livreurs_sync contient une ligne avec operation_type = 'INSERT'
3. Modifier le livreur
4. Vérifier que livreurs_sync contient une ligne avec operation_type = 'UPDATE'
```

---

### ✅ CORRECTION #7: Validation des IDs

**Déjà corrigée dans Correction #1** (processQueue avec validation)

---

## PHASE 3 - OPTIMISATIONS (AMÉLIORATION)

**Durée estimée:** 2 semaines
**Objectif:** Performance, robustesse, maintenabilité

### 🔵 AMÉLIORATION #8: Nettoyage automatique de la queue

#### Étape 8.1 - Créer fonction cleanupQueue

**Fichier:** `src/hooks/useLivreursSync.jsx`

```javascript
// AJOUTER après processQueue
/**
 * Nettoyer les opérations traitées de plus de 7 jours
 */
const cleanupQueue = useCallback(async () => {
  try {
    const db = await initDB();
    const queue = await db.getAll("sync_queue");

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    let deleted = 0;

    for (const op of queue) {
      // Supprimer les opérations processed de plus de 7 jours
      if (
        op.status === SYNC_STATUS.PROCESSED &&
        op.processedAt &&
        new Date(op.processedAt) < weekAgo
      ) {
        await db.delete("sync_queue", op.id);
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`🧹 Queue nettoyée: ${deleted} opération(s) supprimée(s)`);
      await updateQueueStats();
    }

    return { success: true, deleted };
  } catch (error) {
    console.error("Erreur nettoyage queue:", error);
    return { success: false, error: error.message };
  }
}, [updateQueueStats]);
```

#### Étape 8.2 - Appeler après sync

```javascript
// MODIFIER syncFull (ligne 264)
const syncFull = useCallback(async () => {
  if (!online) {
    return { success: false, error: "Hors ligne" };
  }

  setIsSyncing(true);
  setSyncError(null);

  try {
    // 1. Push les changements locaux
    const pushResult = await syncPush();

    // 2. Pull les données Supabase
    const pullResult = await syncPull();

    // 3. Nettoyer la queue
    await cleanupQueue();  // ✓ AJOUTER

    setLastSync(new Date().toISOString());

    return {
      success: true,
      pushProcessed: pushResult.processed || 0,
      pullCount: pullResult.pullCount || 0,
    };
  } catch (error) {
    console.error("Erreur sync complète:", error);
    setSyncError(error.message);
    return { success: false, error: error.message };
  } finally {
    setIsSyncing(false);
  }
}, [online, syncPush, syncPull, cleanupQueue]);

// EXPORTER cleanupQueue
return {
  ...
  cleanupQueue,  // ✓ AJOUTER
};
```

---

### 🔵 AMÉLIORATION #9-13

Les améliorations 9 à 13 seront implémentées de manière similaire. Détails disponibles dans l'audit complet.

**Liste:**
- #9: Stockage données complètes (old_data/new_data)
- #10: Transactions atomiques IndexedDB
- #11: Constantes pour entity_type (déjà fait)
- #12: Mapping des erreurs Supabase
- #13: Index SQL optimisés

---

## CHECKLIST DE VALIDATION

### ✅ Phase 1 terminée quand:
- [ ] sync_queue contient operation_type: "INSERT"/"UPDATE"/"DELETE"
- [ ] processQueue() traite correctement les opérations
- [ ] Aucune erreur dans livreurs_sync (contrainte CHECK respectée)
- [ ] UUID local = UUID Supabase après sync
- [ ] Aucun doublon dans IndexedDB après syncPull()
- [ ] entity_id jamais undefined dans sync_queue

### ✅ Phase 2 terminée quand:
- [ ] updated_at identique entre API response et DB
- [ ] Conflits mergés sans perte de données
- [ ] Triggers fonctionnent avec utilisateur authentifié
- [ ] Validation bloque les opérations invalides

### ✅ Phase 3 terminée quand:
- [ ] Queue nettoyée automatiquement
- [ ] Transactions atomiques sur syncPull
- [ ] Erreurs traduites en français
- [ ] Performance optimale sur 1000+ livreurs

---

## COMMANDES UTILES

### Vérifier IndexedDB
```javascript
// Console DevTools
const db = await indexedDB.open("lsd_db_v2");
const tx = db.transaction("sync_queue", "readonly");
const store = tx.objectStore("sync_queue");
const all = await store.getAll();
console.table(all);
```

### Vérifier Supabase
```sql
-- Voir les changements récents
SELECT * FROM recent_livreurs_changes;

-- Voir les stats de sync
SELECT * FROM livreurs_sync_stats;

-- Tester les triggers
SELECT test_livreurs_sync_triggers();
```

### Reset complet (développement uniquement)
```javascript
// ATTENTION: Efface toutes les données locales!
await indexedDB.deleteDatabase("lsd_db_v2");
location.reload();
```

---

## TIMELINE RECOMMANDÉE

| Semaine | Phase | Tâches | Validation |
|---------|-------|--------|------------|
| **Sem 1** | Phase 1 | Corrections #1, #2, #3 | Tests de synchronisation |
| **Sem 2** | Phase 2 | Corrections #4, #5, #6, #7 | Tests de conflits |
| **Sem 3-4** | Phase 3 | Améliorations #8-13 | Tests de charge |

**Total:** 4 semaines pour système production-ready

---

## SUPPORT

En cas de problème durant la correction :
1. Vérifier les logs console (erreurs)
2. Vérifier IndexedDB (sync_queue)
3. Vérifier Supabase (livreurs_sync table)
4. Tester avec fix_livreurs_sync_rls.sql

**Prochaine étape:** Commencer Phase 1 - Correction #1
