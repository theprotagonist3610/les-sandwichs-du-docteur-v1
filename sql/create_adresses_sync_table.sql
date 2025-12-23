-- =====================================================
-- TABLE: adresses_sync
-- Description: Table de synchronisation temps réel pour IndexedDB
-- Cette table enregistre tous les changements sur la table adresses
-- et permet de notifier les clients via Supabase Realtime
-- =====================================================

-- Créer la table adresses_sync
CREATE TABLE IF NOT EXISTS adresses_sync (
  id BIGSERIAL PRIMARY KEY,
  adresse_id UUID NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id),

  -- Données optionnelles pour faciliter le debugging
  old_data JSONB,
  new_data JSONB

  -- Note: Pas de contrainte FK car on doit pouvoir enregistrer les suppressions
  -- même après que l'adresse ait été supprimée de la table principale
);

-- Index pour améliorer les performances
CREATE INDEX idx_adresses_sync_adresse_id ON adresses_sync(adresse_id);
CREATE INDEX idx_adresses_sync_changed_at ON adresses_sync(changed_at DESC);
CREATE INDEX idx_adresses_sync_operation_type ON adresses_sync(operation_type);

-- Index composite pour les requêtes courantes
CREATE INDEX idx_adresses_sync_composite ON adresses_sync(adresse_id, changed_at DESC);

-- =====================================================
-- POLITIQUE RLS (Row Level Security)
-- =====================================================

-- Activer RLS sur la table
ALTER TABLE adresses_sync ENABLE ROW LEVEL SECURITY;

-- Politique de lecture: Tous les utilisateurs authentifiés peuvent voir les changements
CREATE POLICY "Lecture des changements pour utilisateurs authentifiés"
  ON adresses_sync
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique d'insertion: Seuls les triggers peuvent insérer (via service_role)
-- Les utilisateurs réguliers ne peuvent pas insérer directement
CREATE POLICY "Insertion des changements via triggers uniquement"
  ON adresses_sync
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- =====================================================
-- FONCTION DE NETTOYAGE AUTOMATIQUE
-- Supprime les enregistrements de sync de plus de 7 jours
-- pour éviter que la table ne devienne trop volumineuse
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_adresses_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM adresses_sync
  WHERE changed_at < NOW() - INTERVAL '7 days';

  RAISE NOTICE 'Nettoyage adresses_sync terminé';
END;
$$;

-- =====================================================
-- CRON JOB pour le nettoyage automatique (si pg_cron est disponible)
-- Exécute le nettoyage tous les jours à 2h du matin
-- =====================================================

-- Décommenter si pg_cron est installé sur votre instance Supabase:
-- SELECT cron.schedule(
--   'cleanup-adresses-sync',
--   '0 2 * * *', -- Tous les jours à 2h00
--   $$SELECT cleanup_adresses_sync();$$
-- );

-- Alternative: Fonction pour nettoyer manuellement
COMMENT ON FUNCTION cleanup_adresses_sync() IS
'Nettoie les enregistrements de synchronisation de plus de 7 jours.
Peut être appelé manuellement: SELECT cleanup_adresses_sync();';

-- =====================================================
-- VUES UTILES
-- =====================================================

-- Vue pour voir les changements récents (dernières 24h)
CREATE OR REPLACE VIEW recent_adresses_changes AS
SELECT
  s.id,
  s.adresse_id,
  s.operation_type,
  s.changed_at,
  s.changed_by,
  u.email AS changed_by_email,
  a.departement,
  a.commune,
  a.arrondissement,
  a.quartier
FROM adresses_sync s
LEFT JOIN auth.users u ON s.changed_by = u.id
LEFT JOIN adresses a ON s.adresse_id = a.id
WHERE s.changed_at > NOW() - INTERVAL '24 hours'
ORDER BY s.changed_at DESC;

-- Vue pour les statistiques de synchronisation
CREATE OR REPLACE VIEW adresses_sync_stats AS
SELECT
  operation_type,
  COUNT(*) as count,
  MAX(changed_at) as last_change,
  MIN(changed_at) as first_change
FROM adresses_sync
GROUP BY operation_type;

-- =====================================================
-- COMMENTAIRES POUR LA DOCUMENTATION
-- =====================================================

COMMENT ON TABLE adresses_sync IS
'Table de synchronisation temps réel pour la gestion des adresses.
Enregistre tous les changements (INSERT, UPDATE, DELETE) sur la table adresses
et permet aux clients de se synchroniser via Supabase Realtime.';

COMMENT ON COLUMN adresses_sync.adresse_id IS
'ID de l''adresse concernée par le changement';

COMMENT ON COLUMN adresses_sync.operation_type IS
'Type d''opération: INSERT (création), UPDATE (modification), DELETE (suppression)';

COMMENT ON COLUMN adresses_sync.changed_at IS
'Horodatage du changement';

COMMENT ON COLUMN adresses_sync.changed_by IS
'ID de l''utilisateur ayant effectué le changement (optionnel)';

COMMENT ON COLUMN adresses_sync.old_data IS
'Données avant le changement (pour UPDATE et DELETE)';

COMMENT ON COLUMN adresses_sync.new_data IS
'Données après le changement (pour INSERT et UPDATE)';

-- =====================================================
-- INITIALISATION: Activer Realtime pour cette table
-- =====================================================

-- Pour activer Realtime sur Supabase:
-- 1. Aller dans le Dashboard Supabase
-- 2. Database → Replication
-- 3. Activer Realtime pour la table "adresses_sync"
-- Ou exécuter via l'API Supabase:

-- ALTER PUBLICATION supabase_realtime ADD TABLE adresses_sync;

COMMENT ON TABLE adresses_sync IS
'IMPORTANT: Activer Supabase Realtime pour cette table dans le Dashboard
ou via: ALTER PUBLICATION supabase_realtime ADD TABLE adresses_sync;';

-- =====================================================
-- FIN DE LA CRÉATION DE LA TABLE
-- =====================================================

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Table adresses_sync créée avec succès!';
  RAISE NOTICE 'N''oubliez pas d''activer Realtime pour cette table.';
END $$;
