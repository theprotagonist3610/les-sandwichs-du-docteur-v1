-- ============================================================================
-- ACTIVER LE REALTIME POUR LA TABLE RAPPORTS
-- ============================================================================

-- Ajouter la table rapports a la publication realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rapports;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '+ Realtime active pour la table rapports';
  RAISE NOTICE '! Les clients peuvent maintenant souscrire aux changements en temps reel';
END $$;
