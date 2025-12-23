-- =====================================================
-- TRIGGERS DE SYNCHRONISATION POUR LA TABLE LIVREURS
-- Description: Triggers qui enregistrent automatiquement
-- tous les changements (INSERT, UPDATE, DELETE) dans livreurs_sync
-- pour permettre la synchronisation temps réel avec IndexedDB
-- =====================================================

-- =====================================================
-- FONCTION TRIGGER: Enregistrer les changements INSERT
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_livreurs_insert_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insérer dans la table de sync
  INSERT INTO livreurs_sync (
    livreur_id,
    operation_type,
    changed_at,
    changed_by,
    new_data
  ) VALUES (
    NEW.id,
    'INSERT',
    NOW(),
    auth.uid(), -- ID de l'utilisateur connecté (si disponible)
    row_to_json(NEW)::JSONB
  );

  RETURN NEW;
END;
$$;

-- =====================================================
-- FONCTION TRIGGER: Enregistrer les changements UPDATE
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_livreurs_update_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ne pas enregistrer si aucun changement réel
  IF NEW = OLD THEN
    RETURN NEW;
  END IF;

  -- Insérer dans la table de sync
  INSERT INTO livreurs_sync (
    livreur_id,
    operation_type,
    changed_at,
    changed_by,
    old_data,
    new_data
  ) VALUES (
    NEW.id,
    'UPDATE',
    NOW(),
    auth.uid(),
    row_to_json(OLD)::JSONB,
    row_to_json(NEW)::JSONB
  );

  RETURN NEW;
END;
$$;

-- =====================================================
-- FONCTION TRIGGER: Enregistrer les changements DELETE
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_livreurs_delete_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insérer dans la table de sync
  INSERT INTO livreurs_sync (
    livreur_id,
    operation_type,
    changed_at,
    changed_by,
    old_data
  ) VALUES (
    OLD.id,
    'DELETE',
    NOW(),
    auth.uid(),
    row_to_json(OLD)::JSONB
  );

  RETURN OLD;
END;
$$;

-- =====================================================
-- CRÉER LES TRIGGERS SUR LA TABLE LIVREURS
-- =====================================================

-- Supprimer les triggers existants si présents
DROP TRIGGER IF EXISTS livreurs_insert_sync_trigger ON livreurs;
DROP TRIGGER IF EXISTS livreurs_update_sync_trigger ON livreurs;
DROP TRIGGER IF EXISTS livreurs_delete_sync_trigger ON livreurs;

-- Trigger pour INSERT
CREATE TRIGGER livreurs_insert_sync_trigger
  AFTER INSERT ON livreurs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_livreurs_insert_sync();

-- Trigger pour UPDATE
CREATE TRIGGER livreurs_update_sync_trigger
  AFTER UPDATE ON livreurs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_livreurs_update_sync();

-- Trigger pour DELETE
CREATE TRIGGER livreurs_delete_sync_trigger
  AFTER DELETE ON livreurs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_livreurs_delete_sync();

-- =====================================================
-- COMMENTAIRES POUR LA DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION trigger_livreurs_insert_sync() IS
'Fonction trigger qui enregistre les insertions de livreurs dans livreurs_sync';

COMMENT ON FUNCTION trigger_livreurs_update_sync() IS
'Fonction trigger qui enregistre les modifications de livreurs dans livreurs_sync.
Ignore les updates qui ne modifient aucune donnée.';

COMMENT ON FUNCTION trigger_livreurs_delete_sync() IS
'Fonction trigger qui enregistre les suppressions de livreurs dans livreurs_sync';

-- =====================================================
-- FONCTION UTILITAIRE: Désactiver temporairement les triggers
-- Utile lors d'imports massifs pour éviter de surcharger livreurs_sync
-- =====================================================

CREATE OR REPLACE FUNCTION disable_livreurs_sync_triggers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  ALTER TABLE livreurs DISABLE TRIGGER livreurs_insert_sync_trigger;
  ALTER TABLE livreurs DISABLE TRIGGER livreurs_update_sync_trigger;
  ALTER TABLE livreurs DISABLE TRIGGER livreurs_delete_sync_trigger;

  RAISE NOTICE 'Triggers de synchronisation désactivés';
END;
$$;

-- =====================================================
-- FONCTION UTILITAIRE: Réactiver les triggers
-- =====================================================

CREATE OR REPLACE FUNCTION enable_livreurs_sync_triggers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  ALTER TABLE livreurs ENABLE TRIGGER livreurs_insert_sync_trigger;
  ALTER TABLE livreurs ENABLE TRIGGER livreurs_update_sync_trigger;
  ALTER TABLE livreurs ENABLE TRIGGER livreurs_delete_sync_trigger;

  RAISE NOTICE 'Triggers de synchronisation réactivés';
END;
$$;

-- =====================================================
-- FONCTION UTILITAIRE: Vérifier l'état des triggers
-- =====================================================

CREATE OR REPLACE FUNCTION check_livreurs_sync_triggers_status()
RETURNS TABLE (
  trigger_name TEXT,
  is_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tgname::TEXT AS trigger_name,
    t.tgenabled = 'O' AS is_enabled
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'livreurs'
    AND t.tgname LIKE '%sync_trigger'
  ORDER BY t.tgname;
END;
$$;

-- =====================================================
-- FONCTION DE TEST: Créer des données de test
-- =====================================================

CREATE OR REPLACE FUNCTION test_livreurs_sync_triggers()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  test_id UUID;
BEGIN
  RAISE NOTICE 'Début du test des triggers de synchronisation...';

  -- Test 1: INSERT
  INSERT INTO livreurs (
    denomination,
    contact,
    is_active
  ) VALUES (
    'Test Livreur Trigger',
    '+22997123456',
    true
  )
  RETURNING id INTO test_id;

  RAISE NOTICE 'Test INSERT: livreur_id = %', test_id;

  -- Vérifier l'insertion dans livreurs_sync
  IF EXISTS (
    SELECT 1 FROM livreurs_sync
    WHERE livreur_id = test_id
      AND operation_type = 'INSERT'
  ) THEN
    RAISE NOTICE '✓ Test INSERT réussi';
  ELSE
    RAISE WARNING '✗ Test INSERT échoué';
  END IF;

  -- Test 2: UPDATE
  UPDATE livreurs
  SET denomination = 'Test Livreur Modifié',
      contact = '+22997654321'
  WHERE id = test_id;

  RAISE NOTICE 'Test UPDATE: livreur_id = %', test_id;

  -- Vérifier l'update dans livreurs_sync
  IF EXISTS (
    SELECT 1 FROM livreurs_sync
    WHERE livreur_id = test_id
      AND operation_type = 'UPDATE'
  ) THEN
    RAISE NOTICE '✓ Test UPDATE réussi';
  ELSE
    RAISE WARNING '✗ Test UPDATE échoué';
  END IF;

  -- Test 3: Soft DELETE (is_active = false)
  UPDATE livreurs
  SET is_active = false
  WHERE id = test_id;

  RAISE NOTICE 'Test SOFT DELETE (is_active = false): livreur_id = %', test_id;

  -- Test 4: Hard DELETE
  DELETE FROM livreurs
  WHERE id = test_id;

  RAISE NOTICE 'Test DELETE: livreur_id = %', test_id;

  -- Vérifier le delete dans livreurs_sync
  IF EXISTS (
    SELECT 1 FROM livreurs_sync
    WHERE livreur_id = test_id
      AND operation_type = 'DELETE'
  ) THEN
    RAISE NOTICE '✓ Test DELETE réussi';
  ELSE
    RAISE WARNING '✗ Test DELETE échoué';
  END IF;

  -- Nettoyer les données de test de la table de sync
  DELETE FROM livreurs_sync
  WHERE livreur_id = test_id;

  RAISE NOTICE 'Fin du test. Toutes les données de test ont été nettoyées.';
END;
$$;

COMMENT ON FUNCTION test_livreurs_sync_triggers() IS
'Fonction de test pour vérifier le bon fonctionnement des triggers de synchronisation.
Usage: SELECT test_livreurs_sync_triggers();';

-- =====================================================
-- FONCTION UTILITAIRE: Obtenir les statistiques des triggers
-- =====================================================

CREATE OR REPLACE FUNCTION get_livreurs_sync_trigger_stats()
RETURNS TABLE (
  total_changes BIGINT,
  inserts BIGINT,
  updates BIGINT,
  deletes BIGINT,
  last_change TIMESTAMPTZ,
  changes_last_hour BIGINT,
  changes_last_day BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_changes,
    COUNT(*) FILTER (WHERE operation_type = 'INSERT')::BIGINT AS inserts,
    COUNT(*) FILTER (WHERE operation_type = 'UPDATE')::BIGINT AS updates,
    COUNT(*) FILTER (WHERE operation_type = 'DELETE')::BIGINT AS deletes,
    MAX(changed_at) AS last_change,
    COUNT(*) FILTER (WHERE changed_at > NOW() - INTERVAL '1 hour')::BIGINT AS changes_last_hour,
    COUNT(*) FILTER (WHERE changed_at > NOW() - INTERVAL '1 day')::BIGINT AS changes_last_day
  FROM livreurs_sync;
END;
$$;

COMMENT ON FUNCTION get_livreurs_sync_trigger_stats() IS
'Obtenir les statistiques d''utilisation des triggers de synchronisation.
Usage: SELECT * FROM get_livreurs_sync_trigger_stats();';

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Triggers de synchronisation créés avec succès!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Triggers actifs:';
  RAISE NOTICE '  - livreurs_insert_sync_trigger';
  RAISE NOTICE '  - livreurs_update_sync_trigger';
  RAISE NOTICE '  - livreurs_delete_sync_trigger';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctions utilitaires disponibles:';
  RAISE NOTICE '  - disable_livreurs_sync_triggers()';
  RAISE NOTICE '  - enable_livreurs_sync_triggers()';
  RAISE NOTICE '  - check_livreurs_sync_triggers_status()';
  RAISE NOTICE '  - test_livreurs_sync_triggers()';
  RAISE NOTICE '  - get_livreurs_sync_trigger_stats()';
  RAISE NOTICE '';
  RAISE NOTICE 'Pour tester: SELECT test_livreurs_sync_triggers();';
  RAISE NOTICE '==========================================';
END $$;
