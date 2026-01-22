# Ordre d'exécution des scripts SQL - Système de Menus

Ce document décrit l'ordre exact dans lequel exécuter les scripts SQL pour initialiser le système de gestion des menus.

## ⚠️ Important

Exécutez ces scripts dans l'ordre indiqué pour éviter les erreurs de dépendances.

## 📋 Ordre d'exécution

### 1. Table principale des menus

```sql
-- Crée la table menus avec types ENUM et triggers
sql/create_menus_table.sql
```

**Ce qui est créé :**
- Types ENUM (type_menu, statut_menu)
- Table `menus` avec tous les champs (nom, type, description, ingredients, etc.)
- Indexes pour optimisation (type, statut, nom, ingredients, created_at)
- Trigger `update_menus_updated_at` pour auto-update du timestamp
- Trigger `auto_update_menu_statut` pour gérer le statut automatique (prix = 0 → indisponible)

---

### 2. Politiques RLS pour la table menus

```sql
-- Configure les permissions d'accès à la table menus
sql/create_menus_rls_policies.sql
```

**Ce qui est créé :**
- Policy SELECT : Public (lecture pour tous, même non-authentifiés)
- Policy INSERT : Admins et Superviseurs uniquement
- Policy UPDATE : Admins et Superviseurs uniquement
- Policy DELETE : Admins uniquement

---

### 3. Bucket Storage pour les images

```sql
-- Crée et configure le bucket pour stocker les images des menus
sql/create_menus_storage_bucket.sql
```

**Ce qui est créé :**
- Bucket `menu-images` (public, 5 MB max, formats: JPEG, PNG, WebP, GIF)
- Policy SELECT : Public (lecture pour tous)
- Policy INSERT : Admins et Superviseurs uniquement
- Policy UPDATE : Admins et Superviseurs uniquement
- Policy DELETE : Admins et Superviseurs uniquement

---

### 4. Activation de Realtime

```sql
-- Active les publications Realtime pour la synchronisation temps réel
sql/enable_realtime_menus.sql
```

**Ce qui est activé :**
- Realtime sur `menus` - synchronisation temps réel des menus

---

### 5. Données de test (Optionnel)

```sql
-- Génère des menus de test (sandwichs, boissons, desserts, menus complets)
sql/seed_menus_test_data.sql
```

**Ce qui est créé :**
- 6 Sandwichs
- 9 Boissons
- 6 Desserts
- 6 Menus Complets
- 3 Menus indisponibles (pour tester le filtrage)
- **Total: 30 menus**

---

## 🔄 Commande unique pour tout exécuter

Si vous souhaitez exécuter tous les scripts en une seule fois :

```sql
-- ATTENTION : Exécutez ceci uniquement si vous êtes sûr de l'ordre
\i sql/create_menus_table.sql
\i sql/create_menus_rls_policies.sql
\i sql/create_menus_storage_bucket.sql
\i sql/enable_realtime_menus.sql
\i sql/seed_menus_test_data.sql
```

---

## ✅ Vérification après exécution

Après avoir exécuté tous les scripts, vérifiez que tout est en place :

```sql
-- Vérifier la table menus
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'menus';

-- Vérifier les types ENUM
SELECT typname FROM pg_type
WHERE typname IN ('type_menu', 'statut_menu');

-- Vérifier les politiques RLS
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'menus'
ORDER BY cmd;

-- Vérifier les triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table = 'menus';

-- Vérifier le bucket Storage
SELECT name, public FROM storage.buckets
WHERE name = 'menu-images';

-- Vérifier les politiques Storage
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%menus%'
ORDER BY cmd;

-- Vérifier que Realtime est activé
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'menus';

-- Vérifier les données de test (si script exécuté)
SELECT
  type,
  COUNT(*) as nombre,
  COUNT(*) FILTER (WHERE statut = 'disponible') as disponibles,
  ROUND(AVG(prix)) as prix_moyen
FROM menus
GROUP BY type
ORDER BY type;
```

---

## 🧹 Nettoyage (si nécessaire)

Pour supprimer tout le système et recommencer :

```sql
-- ⚠️ ATTENTION : Ceci supprime TOUTES les données !

-- Supprimer la table menus
DROP TABLE IF EXISTS menus CASCADE;

-- Supprimer les types ENUM
DROP TYPE IF EXISTS type_menu CASCADE;
DROP TYPE IF EXISTS statut_menu CASCADE;

-- Supprimer le bucket Storage (via l'interface Supabase ou API)
-- Note: Impossible via SQL direct, utilisez l'interface Supabase

-- Supprimer les images du bucket
DELETE FROM storage.objects WHERE bucket_id = 'menu-images';
```

---

## 📊 Après l'installation

### 1. Vérifier que les triggers fonctionnent

```sql
-- Insérer un menu test
INSERT INTO menus (nom, type, description, prix)
VALUES (
  'Test Menu',
  'sandwich',
  'Menu de test',
  0 -- Prix à 0, le statut devrait être automatiquement 'indisponible'
)
RETURNING *;

-- Vérifier que le statut est bien 'indisponible'
SELECT nom, prix, statut FROM menus WHERE nom = 'Test Menu';

-- Mettre à jour le prix
UPDATE menus SET prix = 1000 WHERE nom = 'Test Menu';

-- Vérifier que updated_at a été mis à jour
SELECT nom, prix, statut, created_at, updated_at
FROM menus
WHERE nom = 'Test Menu';
```

### 2. Tester le Storage

```bash
# Via l'interface Supabase Storage ou via le code JavaScript
# Uploader une image dans le bucket 'menu-images'
# Vérifier que l'URL publique fonctionne
```

### 3. Tester Realtime

```javascript
// Dans votre application JavaScript
const channel = supabase
  .channel('menus-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'menus'
  }, (payload) => {
    console.log('Changement détecté:', payload);
  })
  .subscribe();

// Ensuite, insérez/modifiez/supprimez un menu pour voir les événements
```

---

## 🔗 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Supabase Storage](https://supabase.com/docs/guides/storage)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/)

---

## 💡 Conseils

- Exécutez les scripts un par un et vérifiez les messages de succès
- Lisez attentivement les messages d'erreur s'il y en a
- Les scripts sont idempotents (vous pouvez les ré-exécuter sans problème grâce aux `IF NOT EXISTS` et `DROP IF EXISTS`)
- Testez toujours avec des données de test avant d'utiliser en production

---

## 📝 Notes Importantes

### Différences avec le système de commandes

Le système de menus est **beaucoup plus simple** que le système de commandes :

- ✅ Pas de tables multiples (juste `menus`)
- ✅ Pas d'historique (pas de `menus_history`)
- ✅ Pas de notifications push (pas de `notifications_queue`)
- ✅ Pas de synchronisation offline (pas de `sync_queue`)
- ✅ Pas de PostGIS (pas de localisation géographique)
- ✅ Pas de validation serveur complexe
- ✅ Pas d'analytics avec vues matérialisées

**Total: 4 scripts** contre 10 scripts pour les commandes.

### Fonctionnalités principales

1. **CRUD simple** : Create, Read, Update, Delete
2. **Gestion d'images** : Upload vers Supabase Storage
3. **Filtrage** : Par type et statut
4. **Recherche** : Full-text sur nom, description, ingrédients
5. **Exports** : CSV et JSON
6. **Realtime** : Synchronisation en temps réel

---

## ✨ Prochaines étapes

Après avoir exécuté tous les scripts :

1. ✅ Vérifier que tout fonctionne (voir section "Vérification")
2. ⏳ Implémenter l'interface utilisateur (pages/composants React)
3. ⏳ Tester les fonctionnalités CRUD via `menuToolkit.jsx`
4. ⏳ Ajouter les menus réels de votre sandwicherie
5. ⏳ Uploader les images des menus
