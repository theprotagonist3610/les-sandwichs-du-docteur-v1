-- ============================================================================
-- FONCTIONS DE VALIDATION CÔTÉ SERVEUR
-- ============================================================================
-- Valide les données des commandes au niveau PostgreSQL
-- Empêche l'insertion/modification de données invalides même si validation client bypassée
-- ============================================================================

-- Fonction de validation d'une commande (complète)
CREATE OR REPLACE FUNCTION validate_commande_data(p_commande_data JSONB)
RETURNS JSONB AS $$
DECLARE
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_warnings TEXT[] := ARRAY[]::TEXT[];
  v_item JSONB;
  v_total NUMERIC := 0;
  v_total_details NUMERIC := 0;
BEGIN
  -- Validation du type
  IF NOT (p_commande_data->>'type' = ANY(ARRAY['livraison', 'sur-place'])) THEN
    v_errors := array_append(v_errors, 'Type de commande invalide (doit être "livraison" ou "sur-place")');
  END IF;

  -- Validation du client
  IF p_commande_data->>'client' IS NULL OR trim(p_commande_data->>'client') = '' THEN
    v_warnings := array_append(v_warnings, 'Nom du client non fourni');
  END IF;

  -- Validation des détails de commande
  IF p_commande_data->'details_commandes' IS NULL OR
     jsonb_array_length(p_commande_data->'details_commandes') = 0 THEN
    v_errors := array_append(v_errors, 'La commande doit contenir au moins un item');
  ELSE
    -- Valider chaque item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_commande_data->'details_commandes')
    LOOP
      -- Valider le nom de l'item
      IF v_item->>'item' IS NULL OR trim(v_item->>'item') = '' THEN
        v_errors := array_append(v_errors, 'Un item n''a pas de nom');
      END IF;

      -- Valider la quantité
      IF (v_item->>'quantite')::NUMERIC IS NULL OR (v_item->>'quantite')::NUMERIC <= 0 THEN
        v_errors := array_append(v_errors, format('Quantité invalide pour l''item "%s"', v_item->>'item'));
      END IF;

      -- Valider le prix unitaire
      IF (v_item->>'prix_unitaire')::NUMERIC IS NULL OR (v_item->>'prix_unitaire')::NUMERIC < 0 THEN
        v_errors := array_append(v_errors, format('Prix unitaire invalide pour l''item "%s"', v_item->>'item'));
      END IF;

      -- Calculer le total
      v_total_details := v_total_details + (
        (v_item->>'quantite')::NUMERIC * (v_item->>'prix_unitaire')::NUMERIC
      );
    END LOOP;
  END IF;

  -- Validation spécifique aux livraisons
  IF p_commande_data->>'type' = 'livraison' THEN
    -- Vérifier l'adresse de livraison
    IF p_commande_data->'lieu_livraison' IS NULL THEN
      v_errors := array_append(v_errors, 'Adresse de livraison requise pour une livraison');
    END IF;

    -- Vérifier le contact client
    IF p_commande_data->>'contact_client' IS NULL OR trim(p_commande_data->>'contact_client') = '' THEN
      v_errors := array_append(v_errors, 'Contact client requis pour une livraison');
    END IF;

    -- Vérifier la date de livraison
    IF p_commande_data->>'date_livraison' IS NOT NULL THEN
      IF (p_commande_data->>'date_livraison')::DATE < CURRENT_DATE THEN
        v_errors := array_append(v_errors, 'La date de livraison ne peut pas être dans le passé');
      END IF;
    END IF;

    -- Vérifier les frais de livraison
    IF (p_commande_data->>'frais_livraison')::NUMERIC < 0 THEN
      v_errors := array_append(v_errors, 'Les frais de livraison ne peuvent pas être négatifs');
    END IF;
  END IF;

  -- Validation du paiement
  IF p_commande_data->'details_paiement' IS NOT NULL THEN
    v_total := COALESCE((p_commande_data->'details_paiement'->>'total')::NUMERIC, 0);

    -- Vérifier que le total correspond aux détails
    IF abs(v_total - v_total_details) > 0.01 THEN
      v_warnings := array_append(v_warnings, format(
        'Incohérence entre le total (%s) et la somme des items (%s)',
        v_total, v_total_details
      ));
    END IF;

    -- Vérifier que les montants payés sont positifs
    IF COALESCE((p_commande_data->'details_paiement'->>'momo')::NUMERIC, 0) < 0 THEN
      v_errors := array_append(v_errors, 'Le montant MoMo ne peut pas être négatif');
    END IF;

    IF COALESCE((p_commande_data->'details_paiement'->>'cash')::NUMERIC, 0) < 0 THEN
      v_errors := array_append(v_errors, 'Le montant cash ne peut pas être négatif');
    END IF;

    IF COALESCE((p_commande_data->'details_paiement'->>'autre')::NUMERIC, 0) < 0 THEN
      v_errors := array_append(v_errors, 'Le montant autre ne peut pas être négatif');
    END IF;
  END IF;

  -- Validation de la promotion
  IF p_commande_data->'promotion' IS NOT NULL THEN
    IF p_commande_data->'promotion'->>'type' NOT IN ('pourcentage', 'montant') THEN
      v_errors := array_append(v_errors, 'Type de promotion invalide');
    END IF;

    IF (p_commande_data->'promotion'->>'valeur')::NUMERIC <= 0 THEN
      v_errors := array_append(v_errors, 'La valeur de la promotion doit être positive');
    END IF;

    -- Si c'est un pourcentage, vérifier qu'il est <= 100
    IF p_commande_data->'promotion'->>'type' = 'pourcentage' AND
       (p_commande_data->'promotion'->>'valeur')::NUMERIC > 100 THEN
      v_errors := array_append(v_errors, 'Le pourcentage de réduction ne peut pas dépasser 100%');
    END IF;
  END IF;

  -- Retourner le résultat de validation
  RETURN jsonb_build_object(
    'is_valid', array_length(v_errors, 1) IS NULL,
    'errors', array_to_json(v_errors),
    'warnings', array_to_json(v_warnings)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_commande_data(JSONB) IS 'Valide les données d''une commande côté serveur';

-- Trigger de validation avant INSERT/UPDATE
CREATE OR REPLACE FUNCTION validate_commande_before_save()
RETURNS TRIGGER AS $$
DECLARE
  v_validation_result JSONB;
  v_errors JSONB;
  v_commande_data JSONB;
BEGIN
  -- Construire un JSONB avec les données de la commande
  v_commande_data := jsonb_build_object(
    'type', NEW.type,
    'client', NEW.client,
    'contact_client', NEW.contact_client,
    'lieu_livraison', NEW.lieu_livraison,
    'details_commandes', NEW.details_commandes,
    'details_paiement', NEW.details_paiement,
    'promotion', NEW.promotion,
    'frais_livraison', NEW.frais_livraison,
    'date_livraison', NEW.date_livraison
  );

  -- Valider les données
  v_validation_result := validate_commande_data(v_commande_data);

  -- Si invalide, lever une exception
  IF NOT (v_validation_result->>'is_valid')::BOOLEAN THEN
    v_errors := v_validation_result->'errors';
    RAISE EXCEPTION 'Validation échouée: %', v_errors::TEXT
      USING HINT = 'Vérifiez les données de la commande',
            ERRCODE = '23514'; -- check_violation
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger de validation
DROP TRIGGER IF EXISTS trigger_validate_commande ON commandes;
CREATE TRIGGER trigger_validate_commande
  BEFORE INSERT OR UPDATE ON commandes
  FOR EACH ROW
  EXECUTE FUNCTION validate_commande_before_save();

-- Fonction pour valider qu'un utilisateur peut modifier une commande
CREATE OR REPLACE FUNCTION can_modify_commande(
  p_commande_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_commande RECORD;
  v_user RECORD;
BEGIN
  -- Récupérer la commande
  SELECT * INTO v_commande
  FROM commandes
  WHERE id = p_commande_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Les commandes clôturées ne peuvent pas être modifiées
  IF v_commande.statut_commande != 'en_cours' THEN
    RETURN false;
  END IF;

  -- Récupérer l'utilisateur
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Les admins peuvent tout modifier
  IF v_user.role = 'admin' THEN
    RETURN true;
  END IF;

  -- Les superviseurs peuvent tout modifier
  IF v_user.role = 'superviseur' THEN
    RETURN true;
  END IF;

  -- Les vendeurs peuvent modifier leurs propres commandes
  IF v_user.role = 'vendeur' AND v_commande.vendeur = p_user_id THEN
    RETURN true;
  END IF;

  -- Les livreurs peuvent modifier le statut de livraison de leurs commandes assignées
  IF v_user.role = 'livreur' AND v_commande.livreur = p_user_id THEN
    RETURN true;
  END IF;

  -- Par défaut, refuser
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION can_modify_commande(UUID, UUID) IS 'Vérifie si un utilisateur peut modifier une commande';

-- Fonction pour valider les dates de livraison
CREATE OR REPLACE FUNCTION validate_delivery_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- La date réelle de livraison doit être >= date prévue
  IF NEW.date_reelle_livraison IS NOT NULL AND
     NEW.date_livraison IS NOT NULL AND
     NEW.date_reelle_livraison < NEW.date_livraison THEN
    RAISE EXCEPTION 'La date réelle de livraison ne peut pas être antérieure à la date prévue'
      USING ERRCODE = '23514';
  END IF;

  -- La date de livraison ne peut pas être dans le passé (sauf si déjà livrée)
  IF TG_OP = 'INSERT' AND
     NEW.date_livraison IS NOT NULL AND
     NEW.date_livraison < CURRENT_DATE AND
     NEW.statut_livraison != 'livree' THEN
    RAISE EXCEPTION 'La date de livraison ne peut pas être dans le passé'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_delivery_dates ON commandes;
CREATE TRIGGER trigger_validate_delivery_dates
  BEFORE INSERT OR UPDATE OF date_livraison, date_reelle_livraison ON commandes
  FOR EACH ROW
  EXECUTE FUNCTION validate_delivery_dates();

-- Fonction pour valider les transitions de statut
CREATE OR REPLACE FUNCTION validate_status_transitions()
RETURNS TRIGGER AS $$
BEGIN
  -- Valider les transitions de statut_commande
  IF TG_OP = 'UPDATE' AND OLD.statut_commande != NEW.statut_commande THEN
    -- Une commande terminée ou annulée ne peut plus changer de statut
    IF OLD.statut_commande IN ('terminee', 'annulee') THEN
      RAISE EXCEPTION 'Une commande terminée ou annulée ne peut plus être modifiée'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Valider les transitions de statut_livraison
  IF TG_OP = 'UPDATE' AND OLD.statut_livraison != NEW.statut_livraison THEN
    -- Une livraison livrée ne peut pas redevenir en cours
    IF OLD.statut_livraison = 'livree' AND NEW.statut_livraison != 'livree' THEN
      RAISE EXCEPTION 'Une livraison complétée ne peut pas revenir en arrière'
        USING ERRCODE = '23514';
    END IF;

    -- Si le statut devient "livree", mettre à jour la date réelle
    IF NEW.statut_livraison = 'livree' AND NEW.date_reelle_livraison IS NULL THEN
      NEW.date_reelle_livraison := CURRENT_DATE;
      NEW.heure_reelle_livraison := CURRENT_TIME;
    END IF;
  END IF;

  -- Valider que la commande est terminée si tous les critères sont remplis
  IF NEW.statut_livraison = 'livree' AND
     NEW.statut_paiement = 'payee' AND
     NEW.statut_commande = 'en_cours' THEN
    NEW.statut_commande := 'terminee';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_status_transitions ON commandes;
CREATE TRIGGER trigger_validate_status_transitions
  BEFORE UPDATE OF statut_commande, statut_livraison, statut_paiement ON commandes
  FOR EACH ROW
  EXECUTE FUNCTION validate_status_transitions();

-- Fonction pour valider l'assignation de livreur
CREATE OR REPLACE FUNCTION validate_livreur_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_livreur_role TEXT;
BEGIN
  -- Si un livreur est assigné, vérifier qu'il a bien le rôle "livreur"
  IF NEW.livreur IS NOT NULL THEN
    SELECT role INTO v_livreur_role
    FROM users
    WHERE id = NEW.livreur;

    IF v_livreur_role IS NULL THEN
      RAISE EXCEPTION 'Utilisateur livreur introuvable'
        USING ERRCODE = '23503'; -- foreign_key_violation
    END IF;

    IF v_livreur_role != 'livreur' THEN
      RAISE EXCEPTION 'L''utilisateur assigné n''a pas le rôle livreur'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Si c'est une commande sur place, pas de livreur requis
  IF NEW.type = 'sur-place' AND NEW.livreur IS NOT NULL THEN
    RAISE WARNING 'Une commande sur place n''a pas besoin de livreur';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_livreur_assignment ON commandes;
CREATE TRIGGER trigger_validate_livreur_assignment
  BEFORE INSERT OR UPDATE OF livreur ON commandes
  FOR EACH ROW
  EXECUTE FUNCTION validate_livreur_assignment();

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Fonctions de validation serveur créées:';
  RAISE NOTICE '   - validate_commande_data() - Validation complète des données';
  RAISE NOTICE '   - can_modify_commande() - Vérification des permissions';
  RAISE NOTICE '   - validate_delivery_dates() - Validation des dates de livraison';
  RAISE NOTICE '   - validate_status_transitions() - Validation des transitions de statut';
  RAISE NOTICE '   - validate_livreur_assignment() - Validation de l''assignation de livreur';
  RAISE NOTICE '✅ Triggers de validation activés';
  RAISE NOTICE '🛡️  Les données sont maintenant validées au niveau PostgreSQL';
END $$;
