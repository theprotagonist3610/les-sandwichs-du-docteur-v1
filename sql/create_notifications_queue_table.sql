-- ============================================================================
-- CRÉATION DE LA TABLE NOTIFICATIONS_QUEUE
-- ============================================================================
-- Gère la file d'attente des notifications push PWA
-- Stocke les notifications à envoyer et leur statut
-- ============================================================================

-- Créer le type ENUM pour les types de notifications
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'commande_nouvelle',
    'commande_modifiee',
    'commande_annulee',
    'livraison_assignee',
    'livraison_en_cours',
    'livraison_completee',
    'paiement_recu',
    'paiement_partiel',
    'rappel_livraison',
    'system'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Créer le type ENUM pour le statut de notification
DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM (
    'pending',    -- En attente d'envoi
    'sent',       -- Envoyée avec succès
    'failed',     -- Échec d'envoi
    'cancelled'   -- Annulée
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Créer le type ENUM pour la priorité
DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Créer la table notifications_queue
CREATE TABLE IF NOT EXISTS notifications_queue (
  -- Identifiant unique
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type de notification
  type notification_type NOT NULL,

  -- Priorité de la notification
  priority notification_priority DEFAULT 'normal',

  -- Destinataire (utilisateur)
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Si null, notification broadcast à tous les utilisateurs d'un certain rôle
  recipient_role TEXT, -- 'admin', 'superviseur', 'vendeur', 'livreur'

  -- Titre et message de la notification
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Données additionnelles (lien vers commande, etc.)
  data JSONB DEFAULT '{}'::jsonb,

  -- Référence à la commande concernée (si applicable)
  commande_id UUID REFERENCES commandes(id) ON DELETE CASCADE,

  -- Statut de la notification
  status notification_status DEFAULT 'pending',

  -- Tentatives d'envoi
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ DEFAULT NOW(), -- Quand envoyer la notification
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Raison de l'échec (si applicable)
  error_message TEXT,

  -- Métadonnées (device token, etc.)
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications_queue(status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications_queue(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON notifications_queue(recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications_queue(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications_queue(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON notifications_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_commande_id ON notifications_queue(commande_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications_queue(created_at);

-- Index composé pour la récupération des notifications en attente
CREATE INDEX IF NOT EXISTS idx_notifications_pending_scheduled ON notifications_queue(status, scheduled_at)
WHERE status = 'pending';

-- Index GIN pour les recherches JSONB
CREATE INDEX IF NOT EXISTS idx_notifications_data ON notifications_queue USING GIN(data);

-- Politique RLS: chaque utilisateur peut voir ses propres notifications
ALTER TABLE notifications_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_read_own_notifications" ON notifications_queue;
CREATE POLICY "users_can_read_own_notifications"
ON notifications_queue
FOR SELECT
TO authenticated
USING (
  recipient_id = auth.uid()
  OR
  (recipient_role IS NOT NULL AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = recipient_role
  ))
);

-- Seuls les admins et superviseurs peuvent créer des notifications
DROP POLICY IF EXISTS "admins_superviseurs_can_create_notifications" ON notifications_queue;
CREATE POLICY "admins_superviseurs_can_create_notifications"
ON notifications_queue
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superviseur')
  )
);

-- Seuls les admins peuvent modifier/supprimer les notifications
DROP POLICY IF EXISTS "admins_can_update_notifications" ON notifications_queue;
CREATE POLICY "admins_can_update_notifications"
ON notifications_queue
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "admins_can_delete_notifications" ON notifications_queue;
CREATE POLICY "admins_can_delete_notifications"
ON notifications_queue
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Fonction pour créer automatiquement une notification lors d'un événement
CREATE OR REPLACE FUNCTION create_commande_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_notification_type notification_type;
  v_title TEXT;
  v_message TEXT;
  v_recipient_id UUID;
  v_priority notification_priority;
BEGIN
  -- Déterminer le type de notification et le destinataire
  IF (TG_OP = 'INSERT') THEN
    v_notification_type := 'commande_nouvelle';
    v_title := 'Nouvelle commande';
    v_message := 'Une nouvelle commande a été créée pour ' || COALESCE(NEW.client, 'client non identifié');
    v_priority := 'normal';
    -- Notifier les superviseurs et admins
    INSERT INTO notifications_queue (type, priority, recipient_role, title, message, commande_id, data)
    VALUES (
      v_notification_type,
      v_priority,
      'superviseur',
      v_title,
      v_message,
      NEW.id,
      jsonb_build_object('commande_id', NEW.id, 'type', NEW.type)
    );

  ELSIF (TG_OP = 'UPDATE') THEN
    -- Notification si un livreur est assigné
    IF (OLD.livreur IS NULL AND NEW.livreur IS NOT NULL) THEN
      v_notification_type := 'livraison_assignee';
      v_title := 'Livraison assignée';
      v_message := 'Une livraison vous a été assignée';
      v_recipient_id := NEW.livreur;
      v_priority := 'high';

      INSERT INTO notifications_queue (type, priority, recipient_id, title, message, commande_id, data)
      VALUES (
        v_notification_type,
        v_priority,
        v_recipient_id,
        v_title,
        v_message,
        NEW.id,
        jsonb_build_object('commande_id', NEW.id, 'client', NEW.client)
      );
    END IF;

    -- Notification si statut de livraison change
    IF (OLD.statut_livraison != NEW.statut_livraison) THEN
      IF (NEW.statut_livraison = 'en_cours') THEN
        v_notification_type := 'livraison_en_cours';
        v_title := 'Livraison en cours';
        v_message := 'La livraison pour ' || COALESCE(NEW.client, 'client') || ' est en cours';
        v_priority := 'normal';
      ELSIF (NEW.statut_livraison = 'livree') THEN
        v_notification_type := 'livraison_completee';
        v_title := 'Livraison complétée';
        v_message := 'La livraison pour ' || COALESCE(NEW.client, 'client') || ' a été complétée';
        v_priority := 'normal';
      END IF;

      -- Notifier le vendeur qui a créé la commande
      IF (NEW.vendeur IS NOT NULL) THEN
        INSERT INTO notifications_queue (type, priority, recipient_id, title, message, commande_id, data)
        VALUES (
          v_notification_type,
          v_priority,
          NEW.vendeur,
          v_title,
          v_message,
          NEW.id,
          jsonb_build_object('commande_id', NEW.id, 'statut', NEW.statut_livraison)
        );
      END IF;
    END IF;

    -- Notification si paiement reçu
    IF (OLD.statut_paiement != NEW.statut_paiement AND NEW.statut_paiement = 'payee') THEN
      v_notification_type := 'paiement_recu';
      v_title := 'Paiement reçu';
      v_message := 'Paiement reçu pour la commande de ' || COALESCE(NEW.client, 'client');
      v_priority := 'normal';

      -- Notifier le vendeur
      IF (NEW.vendeur IS NOT NULL) THEN
        INSERT INTO notifications_queue (type, priority, recipient_id, title, message, commande_id, data)
        VALUES (
          v_notification_type,
          v_priority,
          NEW.vendeur,
          v_title,
          v_message,
          NEW.id,
          jsonb_build_object('commande_id', NEW.id, 'montant', NEW.details_paiement)
        );
      END IF;
    END IF;

    -- Notification si commande annulée
    IF (OLD.statut_commande != NEW.statut_commande AND NEW.statut_commande = 'annulee') THEN
      v_notification_type := 'commande_annulee';
      v_title := 'Commande annulée';
      v_message := 'La commande pour ' || COALESCE(NEW.client, 'client') || ' a été annulée';
      v_priority := 'high';

      -- Notifier le livreur s'il était assigné
      IF (NEW.livreur IS NOT NULL) THEN
        INSERT INTO notifications_queue (type, priority, recipient_id, title, message, commande_id, data)
        VALUES (
          v_notification_type,
          v_priority,
          NEW.livreur,
          v_title,
          v_message,
          NEW.id,
          jsonb_build_object('commande_id', NEW.id)
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur la table commandes
DROP TRIGGER IF EXISTS trigger_create_commande_notification ON commandes;
CREATE TRIGGER trigger_create_commande_notification
  AFTER INSERT OR UPDATE ON commandes
  FOR EACH ROW
  EXECUTE FUNCTION create_commande_notification();

-- Commentaires
COMMENT ON TABLE notifications_queue IS 'File d''attente des notifications push PWA';
COMMENT ON COLUMN notifications_queue.recipient_role IS 'Si défini, notification broadcast à tous les utilisateurs de ce rôle';
COMMENT ON COLUMN notifications_queue.scheduled_at IS 'Date/heure d''envoi planifié de la notification';
COMMENT ON FUNCTION create_commande_notification() IS 'Crée automatiquement des notifications lors des événements sur les commandes';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Table notifications_queue créée avec succès';
  RAISE NOTICE '✅ Indexes créés';
  RAISE NOTICE '✅ Politiques RLS configurées';
  RAISE NOTICE '✅ Trigger de notifications automatiques créé';
END $$;
