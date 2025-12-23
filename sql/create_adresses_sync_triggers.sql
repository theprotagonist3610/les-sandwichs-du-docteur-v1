-- =====================================================
-- TRIGGERS DE SYNCHRONISATION POUR LA TABLE ADRESSES
-- Description: Triggers qui enregistrent automatiquement
-- tous les changements (INSERT, UPDATE, DELETE) dans adresses_sync
-- pour permettre la synchronisation temps réel avec IndexedDB
-- =====================================================

-- =====================================================
-- FONCTION TRIGGER: Enregistrer les changements INSERT
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_adresses_insert_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insérer dans la table de sync
  INSERT INTO adresses_sync (
    adresse_id,
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

CREATE OR REPLACE FUNCTION trigger_adresses_update_sync()
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
  INSERT INTO adresses_sync (
    adresse_id,
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

CREATE OR REPLACE FUNCTION trigger_adresses_delete_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insérer dans la table de sync
  INSERT INTO adresses_sync (
    adresse_id,
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
-- CRÉER LES TRIGGERS SUR LA TABLE ADRESSES
-- =====================================================

-- Supprimer les triggers existants si présents
DROP TRIGGER IF EXISTS adresses_insert_sync_trigger ON adresses;
DROP TRIGGER IF EXISTS adresses_update_sync_trigger ON adresses;
DROP TRIGGER IF EXISTS adresses_delete_sync_trigger ON adresses;

-- Trigger pour INSERT
CREATE TRIGGER adresses_insert_sync_trigger
  AFTER INSERT ON adresses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_adresses_insert_sync();

-- Trigger pour UPDATE
CREATE TRIGGER adresses_update_sync_trigger
  AFTER UPDATE ON adresses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_adresses_update_sync();

-- Trigger pour DELETE
CREATE TRIGGER adresses_delete_sync_trigger
  AFTER DELETE ON adresses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_adresses_delete_sync();

-- =====================================================
-- COMMENTAIRES POUR LA DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION trigger_adresses_insert_sync() IS
'Fonction trigger qui enregistre les insertions d''adresses dans adresses_sync';

COMMENT ON FUNCTION trigger_adresses_update_sync() IS
'Fonction trigger qui enregistre les modifications d''adresses dans adresses_sync.
Ignore les updates qui ne modifient aucune donnée.';

COMMENT ON FUNCTION trigger_adresses_delete_sync() IS
'Fonction trigger qui enregistre les suppressions d''adresses dans adresses_sync';

-- =====================================================
-- FONCTION UTILITAIRE: Désactiver temporairement les triggers
-- Utile lors d'imports massifs pour éviter de surcharger adresses_sync
-- =====================================================

CREATE OR REPLACE FUNCTION disable_adresses_sync_triggers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  ALTER TABLE adresses DISABLE TRIGGER adresses_insert_sync_trigger;
  ALTER TABLE adresses DISABLE TRIGGER adresses_update_sync_trigger;
  ALTER TABLE adresses DISABLE TRIGGER adresses_delete_sync_trigger;

  RAISE NOTICE 'Triggers de synchronisation désactivés';
END;
$$;

-- =====================================================
-- FONCTION UTILITAIRE: Réactiver les triggers
-- =====================================================

CREATE OR REPLACE FUNCTION enable_adresses_sync_triggers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  ALTER TABLE adresses ENABLE TRIGGER adresses_insert_sync_trigger;
  ALTER TABLE adresses ENABLE TRIGGER adresses_update_sync_trigger;
  ALTER TABLE adresses ENABLE TRIGGER adresses_delete_sync_trigger;

  RAISE NOTICE 'Triggers de synchronisation réactivés';
END;
$$;

-- =====================================================
-- FONCTION UTILITAIRE: Vérifier l'état des triggers
-- =====================================================

CREATE OR REPLACE FUNCTION check_adresses_sync_triggers_status()
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
  WHERE c.relname = 'adresses'
    AND t.tgname LIKE '%sync_trigger'
  ORDER BY t.tgname;
END;
$$;

-- =====================================================
-- FONCTION DE TEST: Créer des données de test
-- =====================================================

CREATE OR REPLACE FUNCTION test_adresses_sync_triggers()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  test_id UUID;
BEGIN
  RAISE NOTICE 'Début du test des triggers de synchronisation...';

  -- Test 1: INSERT
  INSERT INTO adresses (
    departement,
    commune,
    arrondissement,
    quartier,
    localisation
  ) VALUES (
    'Atlantique',
    'Cotonou',
    'Test Arrondissement',
    'Test Quartier',
    '{"lat": 6.3654, "lng": 2.4183}'::JSONB
  )
  RETURNING id INTO test_id;

  RAISE NOTICE 'Test INSERT: adresse_id = %', test_id;

  -- Vérifier l'insertion dans adresses_sync
  IF EXISTS (
    SELECT 1 FROM adresses_sync
    WHERE adresse_id = test_id
      AND operation_type = 'INSERT'
  ) THEN
    RAISE NOTICE '✓ Test INSERT réussi';
  ELSE
    RAISE WARNING '✗ Test INSERT échoué';
  END IF;

  -- Test 2: UPDATE
  UPDATE adresses
  SET quartier = 'Test Quartier Modifié'
  WHERE id = test_id;

  RAISE NOTICE 'Test UPDATE: adresse_id = %', test_id;

  -- Vérifier l'update dans adresses_sync
  IF EXISTS (
    SELECT 1 FROM adresses_sync
    WHERE adresse_id = test_id
      AND operation_type = 'UPDATE'
  ) THEN
    RAISE NOTICE '✓ Test UPDATE réussi';
  ELSE
    RAISE WARNING '✗ Test UPDATE échoué';
  END IF;

  -- Test 3: DELETE
  DELETE FROM adresses
  WHERE id = test_id;

  RAISE NOTICE 'Test DELETE: adresse_id = %', test_id;

  -- Vérifier le delete dans adresses_sync
  IF EXISTS (
    SELECT 1 FROM adresses_sync
    WHERE adresse_id = test_id
      AND operation_type = 'DELETE'
  ) THEN
    RAISE NOTICE '✓ Test DELETE réussi';
  ELSE
    RAISE WARNING '✗ Test DELETE échoué';
  END IF;

  -- Nettoyer les données de test de la table de sync
  DELETE FROM adresses_sync
  WHERE adresse_id = test_id;

  RAISE NOTICE 'Fin du test. Toutes les données de test ont été nettoyées.';
END;
$$;

COMMENT ON FUNCTION test_adresses_sync_triggers() IS
'Fonction de test pour vérifier le bon fonctionnement des triggers de synchronisation.
Usage: SELECT test_adresses_sync_triggers();';

-- =====================================================
-- FONCTION UTILITAIRE: Obtenir les statistiques des triggers
-- =====================================================

CREATE OR REPLACE FUNCTION get_adresses_sync_trigger_stats()
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
  FROM adresses_sync;
END;
$$;

COMMENT ON FUNCTION get_adresses_sync_trigger_stats() IS
'Obtenir les statistiques d''utilisation des triggers de synchronisation.
Usage: SELECT * FROM get_adresses_sync_trigger_stats();';

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Triggers de synchronisation créés avec succès!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Triggers actifs:';
  RAISE NOTICE '  - adresses_insert_sync_trigger';
  RAISE NOTICE '  - adresses_update_sync_trigger';
  RAISE NOTICE '  - adresses_delete_sync_trigger';
  RAISE NOTICE '';
  RAISE NOTICE 'Fonctions utilitaires disponibles:';
  RAISE NOTICE '  - disable_adresses_sync_triggers()';
  RAISE NOTICE '  - enable_adresses_sync_triggers()';
  RAISE NOTICE '  - check_adresses_sync_triggers_status()';
  RAISE NOTICE '  - test_adresses_sync_triggers()';
  RAISE NOTICE '  - get_adresses_sync_trigger_stats()';
  RAISE NOTICE '';
  RAISE NOTICE 'Pour tester: SELECT test_adresses_sync_triggers();';
  RAISE NOTICE '==========================================';
END $$;
