-- ============================================================================
-- ACTIVATION DE REALTIME POUR LA TABLE MENUS
-- ============================================================================
-- Active les publications Realtime pour permettre la synchronisation en temps réel
-- des modifications de menus dans l'application
-- ============================================================================

-- Activer Realtime sur la table menus
ALTER PUBLICATION supabase_realtime ADD TABLE menus;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Realtime activé sur la table menus';
  RAISE NOTICE '';
  RAISE NOTICE '📡 Les clients peuvent maintenant s''abonner aux changements en temps réel:';
  RAISE NOTICE '   - INSERT: Nouveau menu ajouté';
  RAISE NOTICE '   - UPDATE: Menu modifié (prix, statut, etc.)';
  RAISE NOTICE '   - DELETE: Menu supprimé';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Utilisation dans le code:';
  RAISE NOTICE '   const channel = supabase.channel("menus-changes")';
  RAISE NOTICE '     .on("postgres_changes", {';
  RAISE NOTICE '       event: "*",';
  RAISE NOTICE '       schema: "public",';
  RAISE NOTICE '       table: "menus"';
  RAISE NOTICE '     }, (payload) => { console.log(payload) })';
  RAISE NOTICE '     .subscribe();';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Phase 1 (SQL) terminée!';
  RAISE NOTICE '⏭️  Prochaine étape: Implémenter utils/menuToolkit.jsx';
END $$;

-- Vérifier que Realtime est activé
SELECT
  schemaname,
  tablename,
  'Realtime activé' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'menus';
