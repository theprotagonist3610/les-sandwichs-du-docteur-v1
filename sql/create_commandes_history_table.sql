-- ============================================================================
-- CRÉATION DE LA TABLE COMMANDES_HISTORY (AUDIT TRAIL)
-- ============================================================================
-- Enregistre automatiquement toutes les modifications sur les commandes
-- Permet de consulter l'historique complet et de restaurer des versions
-- ============================================================================

-- Créer le type ENUM pour les actions
DO $$ BEGIN
  CREATE TYPE action_type AS ENUM ('INSERT', 'UPDATE', 'DELETE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Créer la table d'historique
CREATE TABLE IF NOT EXISTS commandes_history (
  -- Identifiant unique de l'enregistrement d'historique
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Référence à la commande originale
  commande_id UUID NOT NULL,

  -- Type d'action effectuée
  action action_type NOT NULL,

  -- Données de la commande au moment de l'action (snapshot complet)
  commande_data JSONB NOT NULL,

  -- Utilisateur qui a effectué la modification
  modified_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamp de la modification
  modified_at TIMESTAMPTZ DEFAULT NOW(),

  -- Version de la commande au moment de la modification
  version INTEGER,

  -- Informations supplémentaires (IP, user agent, etc.)
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_commandes_history_commande_id ON commandes_history(commande_id);
CREATE INDEX IF NOT EXISTS idx_commandes_history_modified_by ON commandes_history(modified_by);
CREATE INDEX IF NOT EXISTS idx_commandes_history_modified_at ON commandes_history(modified_at);
CREATE INDEX IF NOT EXISTS idx_commandes_history_action ON commandes_history(action);
CREATE INDEX IF NOT EXISTS idx_commandes_history_version ON commandes_history(version);

-- Index GIN pour recherche dans les données JSONB
CREATE INDEX IF NOT EXISTS idx_commandes_history_data ON commandes_history USING GIN(commande_data);

-- Politique RLS: permettre la lecture de l'historique à tous les utilisateurs authentifiés
ALTER TABLE commandes_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_users_can_read_history" ON commandes_history;
CREATE POLICY "authenticated_users_can_read_history"
ON commandes_history
FOR SELECT
TO authenticated
USING (true);

-- Seul le trigger peut insérer dans cette table (pas d'insertion manuelle)
DROP POLICY IF EXISTS "only_triggers_can_insert_history" ON commandes_history;
CREATE POLICY "only_triggers_can_insert_history"
ON commandes_history
FOR INSERT
TO authenticated
WITH CHECK (false); -- Bloque toutes les insertions directes

-- Empêcher toute modification ou suppression de l'historique
DROP POLICY IF EXISTS "prevent_history_modification" ON commandes_history;
CREATE POLICY "prevent_history_modification"
ON commandes_history
FOR UPDATE
TO authenticated
USING (false);

DROP POLICY IF EXISTS "prevent_history_deletion" ON commandes_history;
CREATE POLICY "prevent_history_deletion"
ON commandes_history
FOR DELETE
TO authenticated
USING (false);

-- Commentaires sur la table
COMMENT ON TABLE commandes_history IS 'Audit trail de toutes les modifications sur les commandes';
COMMENT ON COLUMN commandes_history.commande_data IS 'Snapshot complet de la commande au moment de la modification';
COMMENT ON COLUMN commandes_history.metadata IS 'Informations contextuelles (IP, user agent, etc.)';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Table commandes_history créée avec succès';
  RAISE NOTICE '✅ Indexes créés';
  RAISE NOTICE '✅ Politiques RLS configurées (lecture seule)';
END $$;
