-- ============================================================================
-- TRIGGER AUTOMATIQUE POUR L'AUDIT TRAIL DES COMMANDES
-- ============================================================================
-- Enregistre automatiquement chaque INSERT, UPDATE et DELETE dans commandes_history
-- ============================================================================

-- Fonction trigger pour enregistrer l'historique
CREATE OR REPLACE FUNCTION log_commande_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action action_type;
  v_commande_data JSONB;
  v_version INTEGER;
BEGIN
  -- Déterminer le type d'action
  IF (TG_OP = 'INSERT') THEN
    v_action := 'INSERT';
    v_commande_data := to_jsonb(NEW);
    v_version := NEW.version;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
    v_commande_data := to_jsonb(NEW);
    v_version := NEW.version;
  ELSIF (TG_OP = 'DELETE') THEN
    v_action := 'DELETE';
    v_commande_data := to_jsonb(OLD);
    v_version := OLD.version;
  END IF;

  -- Insérer dans la table d'historique
  -- Note: On désactive temporairement RLS pour permettre l'insertion par le trigger
  INSERT INTO commandes_history (
    commande_id,
    action,
    commande_data,
    modified_by,
    modified_at,
    version,
    metadata
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    v_action,
    v_commande_data,
    auth.uid(), -- ID de l'utilisateur actuel
    NOW(),
    v_version,
    jsonb_build_object(
      'trigger_operation', TG_OP,
      'table_name', TG_TABLE_NAME,
      'timestamp', NOW()
    )
  );

  -- Retourner la ligne appropriée selon l'opération
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS trigger_log_commande_changes ON commandes;

-- Créer le trigger qui s'exécute APRÈS chaque opération
CREATE TRIGGER trigger_log_commande_changes
  AFTER INSERT OR UPDATE OR DELETE ON commandes
  FOR EACH ROW
  EXECUTE FUNCTION log_commande_changes();

-- Commentaires
COMMENT ON FUNCTION log_commande_changes() IS 'Fonction trigger pour enregistrer automatiquement toutes les modifications sur les commandes';

-- Fonction helper pour récupérer l'historique d'une commande
CREATE OR REPLACE FUNCTION get_commande_history(p_commande_id UUID)
RETURNS TABLE (
  history_id UUID,
  action action_type,
  commande_data JSONB,
  modified_by UUID,
  modified_by_email TEXT,
  modified_at TIMESTAMPTZ,
  version INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ch.history_id,
    ch.action,
    ch.commande_data,
    ch.modified_by,
    u.email AS modified_by_email,
    ch.modified_at,
    ch.version
  FROM commandes_history ch
  LEFT JOIN users u ON ch.modified_by = u.id
  WHERE ch.commande_id = p_commande_id
  ORDER BY ch.modified_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_commande_history(UUID) IS 'Récupère l''historique complet d''une commande avec les infos de l''utilisateur';

-- Fonction pour restaurer une version précédente d'une commande
CREATE OR REPLACE FUNCTION restore_commande_version(
  p_history_id UUID,
  p_current_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_history_record RECORD;
  v_restored_data JSONB;
  v_result JSONB;
BEGIN
  -- Vérifier que l'utilisateur est admin ou superviseur
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_current_user_id
    AND role IN ('admin', 'superviseur')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permission denied: only admins and superviseurs can restore versions'
    );
  END IF;

  -- Récupérer l'enregistrement d'historique
  SELECT * INTO v_history_record
  FROM commandes_history
  WHERE history_id = p_history_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'History record not found'
    );
  END IF;

  -- Extraire les données à restaurer (sans les champs système)
  v_restored_data := v_history_record.commande_data - ARRAY['id', 'created_at', 'updated_at', 'version'];

  -- Mettre à jour la commande avec les données restaurées
  UPDATE commandes
  SET
    type = (v_restored_data->>'type')::type_commande,
    client = v_restored_data->>'client',
    contact_client = v_restored_data->>'contact_client',
    contact_alternatif = v_restored_data->>'contact_alternatif',
    lieu_livraison = v_restored_data->'lieu_livraison',
    instructions_livraison = v_restored_data->>'instructions_livraison',
    livreur = (v_restored_data->>'livreur')::UUID,
    date_livraison = (v_restored_data->>'date_livraison')::DATE,
    heure_livraison = (v_restored_data->>'heure_livraison')::TIME,
    date_reelle_livraison = (v_restored_data->>'date_reelle_livraison')::DATE,
    heure_reelle_livraison = (v_restored_data->>'heure_reelle_livraison')::TIME,
    frais_livraison = (v_restored_data->>'frais_livraison')::NUMERIC,
    statut_livraison = (v_restored_data->>'statut_livraison')::statut_livraison,
    statut_paiement = (v_restored_data->>'statut_paiement')::statut_paiement,
    statut_commande = (v_restored_data->>'statut_commande')::statut_commande,
    details_commandes = v_restored_data->'details_commandes',
    promotion = v_restored_data->'promotion',
    details_paiement = v_restored_data->'details_paiement',
    vendeur = (v_restored_data->>'vendeur')::UUID
  WHERE id = v_history_record.commande_id
  RETURNING to_jsonb(commandes.*) INTO v_result;

  RETURN jsonb_build_object(
    'success', true,
    'restored_commande', v_result,
    'restored_from_version', v_history_record.version,
    'restored_at', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION restore_commande_version(UUID, UUID) IS 'Restaure une commande à une version précédente (admins/superviseurs uniquement)';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger log_commande_changes créé sur la table commandes';
  RAISE NOTICE '✅ Fonction get_commande_history() disponible';
  RAISE NOTICE '✅ Fonction restore_commande_version() disponible';
  RAISE NOTICE '   📝 Toutes les modifications seront automatiquement enregistrées';
END $$;
