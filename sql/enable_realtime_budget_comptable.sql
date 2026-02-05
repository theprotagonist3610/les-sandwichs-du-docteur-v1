-- ============================================================================
-- ACTIVATION DU REALTIME POUR BUDGET_COMPTABLE
-- ============================================================================
-- Active les mises à jour en temps réel pour la table budget_comptable
-- ============================================================================

-- Ajouter la table à la publication realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE budget_comptable;
  RAISE NOTICE '✓ Table budget_comptable ajoutée à supabase_realtime';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'ℹ Table budget_comptable déjà dans supabase_realtime';
END $$;

-- Configurer la réplication
ALTER TABLE budget_comptable REPLICA IDENTITY FULL;
