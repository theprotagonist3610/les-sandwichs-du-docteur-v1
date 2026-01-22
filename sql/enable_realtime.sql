-- ============================================================================
-- ACTIVATION DE REALTIME POUR LES TABLES
-- ============================================================================
-- Active les publications Realtime pour permettre la synchronisation en temps réel
-- ============================================================================

-- Activer Realtime sur la table commandes
ALTER PUBLICATION supabase_realtime ADD TABLE commandes;

-- Activer Realtime sur la table notifications_queue
ALTER PUBLICATION supabase_realtime ADD TABLE notifications_queue;

-- Activer Realtime sur la table commandes_sync_queue
ALTER PUBLICATION supabase_realtime ADD TABLE commandes_sync_queue;

-- Activer Realtime sur la table commandes_history
ALTER PUBLICATION supabase_realtime ADD TABLE commandes_history;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Realtime activé sur les tables:';
  RAISE NOTICE '   - commandes (pour synchronisation temps réel)';
  RAISE NOTICE '   - notifications_queue (pour notifications push)';
  RAISE NOTICE '   - commandes_sync_queue (pour synchro offline)';
  RAISE NOTICE '   - commandes_history (pour suivi des modifications)';
  RAISE NOTICE '';
  RAISE NOTICE '📡 Les clients peuvent maintenant s''abonner aux changements en temps réel';
END $$;
