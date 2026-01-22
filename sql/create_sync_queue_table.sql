-- ============================================================================
-- CRÉATION DE LA TABLE COMMANDES_SYNC_QUEUE
-- ============================================================================
-- Gère la synchronisation bidirectionnelle entre le cache local et Supabase
-- Résout les conflits de modifications concurrentes offline/online
-- ============================================================================

-- Créer le type ENUM pour le type d'opération
DO $$ BEGIN
  CREATE TYPE sync_operation AS ENUM ('create', 'update', 'delete');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Créer le type ENUM pour le statut de synchronisation
DO $$ BEGIN
  CREATE TYPE sync_status AS ENUM (
    'pending',      -- En attente de synchronisation
    'syncing',      -- Synchronisation en cours
    'completed',    -- Synchronisée avec succès
    'failed',       -- Échec de synchronisation
    'conflict'      -- Conflit détecté, nécessite résolution manuelle
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Créer le type ENUM pour la stratégie de résolution de conflit
DO $$ BEGIN
  CREATE TYPE conflict_resolution AS ENUM (
    'server_wins',    -- Le serveur a priorité
    'client_wins',    -- Le client a priorité
    'manual',         -- Résolution manuelle requise
    'merge'           -- Fusion des modifications
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Créer la table commandes_sync_queue
CREATE TABLE IF NOT EXISTS commandes_sync_queue (
  -- Identifiant unique
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Référence à la commande
  commande_id UUID NOT NULL,

  -- Type d'opération à synchroniser
  operation sync_operation NOT NULL,

  -- Statut de la synchronisation
  status sync_status DEFAULT 'pending',

  -- Données de la commande (snapshot au moment de la modification locale)
  local_data JSONB NOT NULL,

  -- Données du serveur (en cas de conflit)
  server_data JSONB,

  -- Version locale et serveur pour détecter les conflits
  local_version INTEGER,
  server_version INTEGER,

  -- Utilisateur qui a effectué la modification
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Stratégie de résolution de conflit
  conflict_resolution_strategy conflict_resolution DEFAULT 'server_wins',

  -- Informations sur le conflit (si applicable)
  conflict_details JSONB,

  -- Tentatives de synchronisation
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  -- Message d'erreur (si échec)
  error_message TEXT,

  -- Métadonnées (device ID, network info, etc.)
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sync_queue_commande_id ON commandes_sync_queue(commande_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON commandes_sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_user_id ON commandes_sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_operation ON commandes_sync_queue(operation);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON commandes_sync_queue(created_at);

-- Index composé pour la récupération des items en attente
CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON commandes_sync_queue(status, created_at)
WHERE status = 'pending';

-- Index pour les conflits non résolus
CREATE INDEX IF NOT EXISTS idx_sync_queue_conflicts ON commandes_sync_queue(status)
WHERE status = 'conflict';

-- Index GIN pour les recherches JSONB
CREATE INDEX IF NOT EXISTS idx_sync_queue_local_data ON commandes_sync_queue USING GIN(local_data);
CREATE INDEX IF NOT EXISTS idx_sync_queue_conflict_details ON commandes_sync_queue USING GIN(conflict_details);

-- Politique RLS: chaque utilisateur peut voir ses propres items de sync
ALTER TABLE commandes_sync_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_read_own_sync_items" ON commandes_sync_queue;
CREATE POLICY "users_can_read_own_sync_items"
ON commandes_sync_queue
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Les utilisateurs peuvent créer des items de sync
DROP POLICY IF EXISTS "users_can_create_sync_items" ON commandes_sync_queue;
CREATE POLICY "users_can_create_sync_items"
ON commandes_sync_queue
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent modifier leurs propres items de sync
DROP POLICY IF EXISTS "users_can_update_own_sync_items" ON commandes_sync_queue;
CREATE POLICY "users_can_update_own_sync_items"
ON commandes_sync_queue
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Seuls les admins peuvent supprimer des items de sync
DROP POLICY IF EXISTS "admins_can_delete_sync_items" ON commandes_sync_queue;
CREATE POLICY "admins_can_delete_sync_items"
ON commandes_sync_queue
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Fonction pour détecter et résoudre les conflits de synchronisation
CREATE OR REPLACE FUNCTION resolve_sync_conflict(
  p_sync_id UUID,
  p_resolution_strategy conflict_resolution,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_sync_item RECORD;
  v_result JSONB;
  v_merged_data JSONB;
BEGIN
  -- Récupérer l'item de synchronisation
  SELECT * INTO v_sync_item
  FROM commandes_sync_queue
  WHERE id = p_sync_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sync item not found'
    );
  END IF;

  -- Vérifier que c'est bien un conflit
  IF v_sync_item.status != 'conflict' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Item is not in conflict status'
    );
  END IF;

  -- Appliquer la stratégie de résolution
  CASE p_resolution_strategy
    WHEN 'server_wins' THEN
      -- Le serveur gagne: ne rien faire, juste marquer comme résolu
      UPDATE commandes_sync_queue
      SET
        status = 'completed',
        resolved_at = NOW(),
        conflict_resolution_strategy = 'server_wins'
      WHERE id = p_sync_id;

      v_result := jsonb_build_object(
        'success', true,
        'resolution', 'server_wins',
        'message', 'Server version kept, local changes discarded'
      );

    WHEN 'client_wins' THEN
      -- Le client gagne: appliquer les modifications locales
      UPDATE commandes
      SET
        type = (v_sync_item.local_data->>'type')::type_commande,
        client = v_sync_item.local_data->>'client',
        contact_client = v_sync_item.local_data->>'contact_client',
        contact_alternatif = v_sync_item.local_data->>'contact_alternatif',
        lieu_livraison = v_sync_item.local_data->'lieu_livraison',
        instructions_livraison = v_sync_item.local_data->>'instructions_livraison',
        livreur = (v_sync_item.local_data->>'livreur')::UUID,
        date_livraison = (v_sync_item.local_data->>'date_livraison')::DATE,
        heure_livraison = (v_sync_item.local_data->>'heure_livraison')::TIME,
        date_reelle_livraison = (v_sync_item.local_data->>'date_reelle_livraison')::DATE,
        heure_reelle_livraison = (v_sync_item.local_data->>'heure_reelle_livraison')::TIME,
        frais_livraison = (v_sync_item.local_data->>'frais_livraison')::NUMERIC,
        statut_livraison = (v_sync_item.local_data->>'statut_livraison')::statut_livraison,
        statut_paiement = (v_sync_item.local_data->>'statut_paiement')::statut_paiement,
        statut_commande = (v_sync_item.local_data->>'statut_commande')::statut_commande,
        details_commandes = v_sync_item.local_data->'details_commandes',
        promotion = v_sync_item.local_data->'promotion',
        details_paiement = v_sync_item.local_data->'details_paiement',
        vendeur = (v_sync_item.local_data->>'vendeur')::UUID
      WHERE id = v_sync_item.commande_id;

      UPDATE commandes_sync_queue
      SET
        status = 'completed',
        synced_at = NOW(),
        resolved_at = NOW(),
        conflict_resolution_strategy = 'client_wins'
      WHERE id = p_sync_id;

      v_result := jsonb_build_object(
        'success', true,
        'resolution', 'client_wins',
        'message', 'Local changes applied to server'
      );

    WHEN 'merge' THEN
      -- Fusion: merger les modifications non conflictuelles
      -- Note: logique de fusion simplifiée, à adapter selon les besoins
      v_merged_data := v_sync_item.server_data || v_sync_item.local_data;

      UPDATE commandes
      SET
        type = (v_merged_data->>'type')::type_commande,
        client = v_merged_data->>'client',
        contact_client = v_merged_data->>'contact_client',
        lieu_livraison = v_merged_data->'lieu_livraison',
        details_commandes = v_merged_data->'details_commandes',
        details_paiement = v_merged_data->'details_paiement'
      WHERE id = v_sync_item.commande_id;

      UPDATE commandes_sync_queue
      SET
        status = 'completed',
        synced_at = NOW(),
        resolved_at = NOW(),
        conflict_resolution_strategy = 'merge'
      WHERE id = p_sync_id;

      v_result := jsonb_build_object(
        'success', true,
        'resolution', 'merge',
        'message', 'Changes merged successfully',
        'merged_data', v_merged_data
      );

    ELSE
      -- Résolution manuelle: laisser le statut conflict
      v_result := jsonb_build_object(
        'success', false,
        'error', 'Manual resolution required'
      );
  END CASE;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour nettoyer les items synchronisés (plus de 7 jours)
CREATE OR REPLACE FUNCTION cleanup_completed_sync_items()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM commandes_sync_queue
  WHERE status = 'completed'
  AND synced_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour récupérer les items de sync en attente pour un utilisateur
CREATE OR REPLACE FUNCTION get_pending_sync_items(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  commande_id UUID,
  operation sync_operation,
  status sync_status,
  local_data JSONB,
  created_at TIMESTAMPTZ,
  retry_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sq.id,
    sq.commande_id,
    sq.operation,
    sq.status,
    sq.local_data,
    sq.created_at,
    sq.retry_count
  FROM commandes_sync_queue sq
  WHERE sq.user_id = p_user_id
  AND sq.status IN ('pending', 'failed')
  AND sq.retry_count < sq.max_retries
  ORDER BY sq.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaires
COMMENT ON TABLE commandes_sync_queue IS 'File de synchronisation bidirectionnelle pour les modifications offline';
COMMENT ON COLUMN commandes_sync_queue.local_data IS 'Snapshot de la commande modifiée localement';
COMMENT ON COLUMN commandes_sync_queue.server_data IS 'Snapshot de la commande sur le serveur (en cas de conflit)';
COMMENT ON COLUMN commandes_sync_queue.conflict_resolution_strategy IS 'Stratégie de résolution en cas de conflit';
COMMENT ON FUNCTION resolve_sync_conflict(UUID, conflict_resolution, UUID) IS 'Résout un conflit de synchronisation selon la stratégie choisie';
COMMENT ON FUNCTION cleanup_completed_sync_items() IS 'Nettoie les items synchronisés de plus de 7 jours';
COMMENT ON FUNCTION get_pending_sync_items(UUID) IS 'Récupère les items en attente de synchronisation pour un utilisateur';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Table commandes_sync_queue créée avec succès';
  RAISE NOTICE '✅ Indexes créés';
  RAISE NOTICE '✅ Politiques RLS configurées';
  RAISE NOTICE '✅ Fonctions de résolution de conflits créées';
END $$;
