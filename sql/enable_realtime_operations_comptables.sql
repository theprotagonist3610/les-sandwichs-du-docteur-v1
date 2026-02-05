-- ============================================================================
-- ACTIVATION DU REALTIME POUR OPERATIONS_COMPTABLES
-- ============================================================================
-- Active les mises à jour en temps réel pour la table operations_comptables
-- ============================================================================

-- Vérifier si la publication existe déjà
DO $$
BEGIN
  -- Ajouter la table à la publication realtime de Supabase
  ALTER PUBLICATION supabase_realtime ADD TABLE operations_comptables;
  RAISE NOTICE '✓ Table operations_comptables ajoutée à supabase_realtime';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'ℹ Table operations_comptables déjà dans supabase_realtime';
  WHEN undefined_object THEN
    RAISE NOTICE '⚠ Publication supabase_realtime non trouvée. Création...';
    CREATE PUBLICATION supabase_realtime;
    ALTER PUBLICATION supabase_realtime ADD TABLE operations_comptables;
    RAISE NOTICE '✓ Publication créée et table ajoutée';
END $$;

-- Vérifier que la réplication est correctement configurée
DO $$
DECLARE
  replica_identity TEXT;
BEGIN
  SELECT pg_catalog.pg_get_replica_identity_index(c.oid)::regclass::text
  INTO replica_identity
  FROM pg_catalog.pg_class c
  WHERE c.relname = 'operations_comptables';

  IF replica_identity IS NULL THEN
    ALTER TABLE operations_comptables REPLICA IDENTITY FULL;
    RAISE NOTICE '✓ REPLICA IDENTITY configuré sur FULL pour operations_comptables';
  ELSE
    RAISE NOTICE 'ℹ REPLICA IDENTITY déjà configuré: %', replica_identity;
  END IF;
END $$;

-- Afficher les informations sur la configuration realtime
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'REALTIME ACTIVÉ POUR OPERATIONS_COMPTABLES';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Configuration côté client (React):';
  RAISE NOTICE '';
  RAISE NOTICE 'import { supabase } from "@/config/supabase";';
  RAISE NOTICE '';
  RAISE NOTICE 'const channel = supabase';
  RAISE NOTICE '  .channel("operations_comptables_changes")';
  RAISE NOTICE '  .on(';
  RAISE NOTICE '    "postgres_changes",';
  RAISE NOTICE '    {';
  RAISE NOTICE '      event: "*", // ou "INSERT", "UPDATE", "DELETE"';
  RAISE NOTICE '      schema: "public",';
  RAISE NOTICE '      table: "operations_comptables"';
  RAISE NOTICE '    },';
  RAISE NOTICE '    (payload) => {';
  RAISE NOTICE '      console.log("Change received!", payload);';
  RAISE NOTICE '      // Rafraîchir les données';
  RAISE NOTICE '    }';
  RAISE NOTICE '  )';
  RAISE NOTICE '  .subscribe();';
  RAISE NOTICE '';
  RAISE NOTICE '// Cleanup';
  RAISE NOTICE 'return () => {';
  RAISE NOTICE '  supabase.removeChannel(channel);';
  RAISE NOTICE '};';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
END $$;
