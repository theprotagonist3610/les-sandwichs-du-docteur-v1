-- =====================================================
-- CORRECTION: Retirer la contrainte FK de adresses_sync
-- Description: La contrainte de clé étrangère empêche
-- l'enregistrement des DELETE car l'adresse n'existe plus
-- au moment où le trigger essaie d'insérer dans adresses_sync
-- =====================================================

-- Vérifier si la contrainte existe et la supprimer
DO $$
BEGIN
  -- Supprimer la contrainte FK si elle existe
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_adresse'
      AND table_name = 'adresses_sync'
  ) THEN
    ALTER TABLE adresses_sync DROP CONSTRAINT fk_adresse;
    RAISE NOTICE '✓ Contrainte FK supprimée avec succès';
  ELSE
    RAISE NOTICE '⚠ La contrainte FK n''existe pas (déjà supprimée ou jamais créée)';
  END IF;
END $$;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Correction appliquée avec succès!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'La table adresses_sync peut maintenant enregistrer';
  RAISE NOTICE 'les suppressions d''adresses sans erreur.';
  RAISE NOTICE '';
  RAISE NOTICE 'Pour tester: SELECT test_adresses_sync_triggers();';
  RAISE NOTICE '==========================================';
END $$;
