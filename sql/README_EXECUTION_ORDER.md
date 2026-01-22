# Ordre d'exécution des scripts SQL

Ce document décrit l'ordre exact dans lequel exécuter les scripts SQL pour initialiser le système de gestion des commandes.

## ⚠️ Important

Exécutez ces scripts dans l'ordre indiqué pour éviter les erreurs de dépendances.

## 📋 Ordre d'exécution

### 1. Table principale des commandes

```sql
-- Crée la table commandes avec tous les champs nécessaires
-- Crée les ENUM types et les triggers
sql/create_commandes_table.sql
```

**Ce qui est créé :**
- Types ENUM (type_commande, statut_livraison, statut_paiement, statut_commande)
- Table `commandes` avec indexes
- Trigger `update_commandes_updated_at` pour auto-incrémentation de version

---

### 2. Politiques RLS pour la table commandes

```sql
-- Configure les permissions d'accès à la table commandes
sql/create_commandes_rls_policies.sql
```

**Ce qui est créé :**
- Policy SELECT : Tous les utilisateurs authentifiés
- Policy INSERT : Tous les utilisateurs authentifiés
- Policy UPDATE : Seulement commandes `en_cours`
- Policy DELETE : Admins uniquement

---

### 3. Table d'historique (Audit Trail)

```sql
-- Crée la table pour l'historique des modifications
sql/create_commandes_history_table.sql
```

**Ce qui est créé :**
- Type ENUM `action_type`
- Table `commandes_history`
- Indexes sur commande_id, modified_by, modified_at
- Politiques RLS (lecture seule, pas d'insertion/modification directe)

---

### 4. Trigger d'historique automatique

```sql
-- Active l'enregistrement automatique des modifications
sql/create_commandes_history_trigger.sql
```

**Ce qui est créé :**
- Fonction `log_commande_changes()`
- Trigger `trigger_log_commande_changes` (INSERT/UPDATE/DELETE)
- Fonction `get_commande_history(UUID)` - récupérer l'historique
- Fonction `restore_commande_version(UUID, UUID)` - restaurer une version

**⚠️ Dépend de :** `create_commandes_history_table.sql`

---

### 5. Table de notifications push

```sql
-- Crée le système de notifications
sql/create_notifications_queue_table.sql
```

**Ce qui est créé :**
- Types ENUM (notification_type, notification_status, notification_priority)
- Table `notifications_queue`
- Indexes sur recipient_id, status, scheduled_at
- Fonction `create_commande_notification()` - trigger automatique
- Trigger `trigger_create_commande_notification` sur la table commandes

**⚠️ Dépend de :** `create_commandes_table.sql`

---

### 6. Table de synchronisation offline

```sql
-- Crée le système de sync bidirectionnelle
sql/create_sync_queue_table.sql
```

**Ce qui est créé :**
- Types ENUM (sync_operation, sync_status, conflict_resolution)
- Table `commandes_sync_queue`
- Fonction `resolve_sync_conflict(UUID, conflict_resolution, UUID)`
- Fonction `cleanup_completed_sync_items()` - nettoyage
- Fonction `get_pending_sync_items(UUID)` - récupérer items en attente

**⚠️ Dépend de :** `create_commandes_table.sql`

---

### 7. Extension PostGIS et optimisation géographique

```sql
-- Active PostGIS et crée les fonctions géographiques
sql/enable_postgis_geographic_optimization.sql
```

**Ce qui est créé :**
- Extension `postgis`
- Colonne `geo_location` (GEOGRAPHY POINT) sur table commandes
- Trigger `trigger_update_geo_location` - mise à jour automatique
- Index spatial GIST sur geo_location
- 6 fonctions PostGIS :
  - `get_commandes_within_radius(lat, lng, radius)`
  - `get_nearest_commandes(lat, lng, limit)`
  - `get_distance_between_commandes(id1, id2)`
  - `get_delivery_clusters(date, radius)`
  - `get_delivery_coverage_area(date)`
  - `get_geographic_stats(start_date, end_date)`

**⚠️ Dépend de :** `create_commandes_table.sql`

---

### 8. Fonctions de validation serveur

```sql
-- Active la validation côté PostgreSQL
sql/create_server_validation_functions.sql
```

**Ce qui est créé :**
- Fonction `validate_commande_data(JSONB)` - validation complète
- Fonction `can_modify_commande(UUID, UUID)` - vérification permissions
- Trigger `trigger_validate_commande` - validation avant INSERT/UPDATE
- Trigger `trigger_validate_delivery_dates` - validation dates
- Trigger `trigger_validate_status_transitions` - validation transitions
- Trigger `trigger_validate_livreur_assignment` - validation livreur

**⚠️ Dépend de :** `create_commandes_table.sql`

---

### 9. Vues matérialisées pour analytics

```sql
-- Crée les vues précalculées pour l'analyse de données
sql/create_analytics_materialized_views.sql
```

**Ce qui est créé :**
- 7 vues matérialisées :
  - `mv_daily_commandes_stats` - stats quotidiennes
  - `mv_top_products` - top produits
  - `mv_vendeurs_performance` - performance vendeurs
  - `mv_livreurs_performance` - performance livreurs
  - `mv_geographic_stats` - stats par zone
  - `mv_promotions_stats` - stats promotions
  - `mv_hourly_patterns` - patterns horaires
- Fonction `refresh_all_analytics_views()` - rafraîchir toutes les vues
- Fonction `get_analytics_report(start_date, end_date)` - rapport complet

**⚠️ Dépend de :** `create_commandes_table.sql`

---

### 10. Activation de Realtime

```sql
-- Active les publications Realtime pour la synchronisation temps réel
sql/enable_realtime.sql
```

**Ce qui est activé :**
- Realtime sur `commandes` - synchronisation temps réel des commandes
- Realtime sur `notifications_queue` - notifications push en temps réel
- Realtime sur `commandes_sync_queue` - synchro offline
- Realtime sur `commandes_history` - suivi des modifications

**⚠️ Dépend de :** Toutes les tables doivent être créées

---

## 🔄 Commande unique pour tout exécuter

Si vous souhaitez exécuter tous les scripts en une seule fois (à vos risques) :

```sql
-- ATTENTION : Exécutez ceci uniquement si vous êtes sûr de l'ordre
\i sql/create_commandes_table.sql
\i sql/create_commandes_rls_policies.sql
\i sql/create_commandes_history_table.sql
\i sql/create_commandes_history_trigger.sql
\i sql/create_notifications_queue_table.sql
\i sql/create_sync_queue_table.sql
\i sql/enable_postgis_geographic_optimization.sql
\i sql/create_server_validation_functions.sql
\i sql/create_analytics_materialized_views.sql
\i sql/enable_realtime.sql
```

## ✅ Vérification après exécution

Après avoir exécuté tous les scripts, vérifiez que tout est en place :

```sql
-- Vérifier les tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'commandes',
  'commandes_history',
  'notifications_queue',
  'commandes_sync_queue'
);

-- Vérifier les vues matérialisées
SELECT matviewname FROM pg_matviews
WHERE schemaname = 'public';

-- Vérifier les fonctions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%commande%';

-- Vérifier les triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Vérifier PostGIS
SELECT PostGIS_Version();

-- Vérifier les politiques RLS
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('commandes', 'commandes_history', 'notifications_queue', 'commandes_sync_queue');

-- Vérifier que Realtime est activé
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('commandes', 'commandes_history', 'notifications_queue', 'commandes_sync_queue');
```

## 🧹 Nettoyage (si nécessaire)

Pour supprimer tout le système et recommencer :

```sql
-- ⚠️ ATTENTION : Ceci supprime TOUTES les données !

-- Supprimer les vues matérialisées
DROP MATERIALIZED VIEW IF EXISTS mv_daily_commandes_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_top_products CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_vendeurs_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_livreurs_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_geographic_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_promotions_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_hourly_patterns CASCADE;

-- Supprimer les tables
DROP TABLE IF EXISTS commandes_sync_queue CASCADE;
DROP TABLE IF EXISTS notifications_queue CASCADE;
DROP TABLE IF EXISTS commandes_history CASCADE;
DROP TABLE IF EXISTS commandes CASCADE;

-- Supprimer les types ENUM
DROP TYPE IF EXISTS conflict_resolution CASCADE;
DROP TYPE IF EXISTS sync_status CASCADE;
DROP TYPE IF EXISTS sync_operation CASCADE;
DROP TYPE IF EXISTS notification_priority CASCADE;
DROP TYPE IF EXISTS notification_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS action_type CASCADE;
DROP TYPE IF EXISTS statut_commande CASCADE;
DROP TYPE IF EXISTS statut_paiement CASCADE;
DROP TYPE IF EXISTS statut_livraison CASCADE;
DROP TYPE IF EXISTS type_commande CASCADE;

-- Supprimer l'extension PostGIS (optionnel)
-- DROP EXTENSION IF EXISTS postgis CASCADE;
```

## 📊 Après l'installation

1. **Rafraîchir les vues matérialisées** (pour peupler les analytics) :
   ```sql
   SELECT refresh_all_analytics_views();
   ```

2. **Vérifier que les triggers fonctionnent** :
   ```sql
   -- Insérer une commande test
   INSERT INTO commandes (type, client, details_commandes, details_paiement)
   VALUES (
     'sur-place',
     'Test Client',
     '[{"item": "Test", "quantite": 1, "prix_unitaire": 1000}]'::jsonb,
     '{"total": 1000, "total_apres_reduction": 1000, "momo": 0, "cash": 1000, "autre": 0}'::jsonb
   );

   -- Vérifier l'historique
   SELECT * FROM commandes_history ORDER BY modified_at DESC LIMIT 1;

   -- Vérifier les notifications
   SELECT * FROM notifications_queue ORDER BY created_at DESC LIMIT 1;
   ```

## 🔗 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation PostGIS](https://postgis.net/documentation/)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/)

## 💡 Conseils

- Exécutez les scripts un par un et vérifiez les messages de succès
- Lisez attentivement les messages d'erreur s'il y en a
- Les scripts sont idempotents (vous pouvez les ré-exécuter sans problème)
- Utilisez `DROP ... IF EXISTS` avant de recréer pour éviter les conflits
