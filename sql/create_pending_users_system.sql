-- ============================================
-- SYSTÈME D'INSCRIPTION AVEC TABLE TEMPORAIRE
-- ============================================
-- Cette approche utilise une table pending_users pour stocker
-- les nouvelles inscriptions en attente d'approbation.
-- La row dans public.users est créée UNIQUEMENT lors de l'approbation.

-- ============================================
-- ÉTAPE 1: CRÉATION DE LA TABLE pending_users
-- ============================================

-- Supprimer la table si elle existe
DROP TABLE IF EXISTS pending_users CASCADE;

-- Créer la table pour les inscriptions en attente
CREATE TABLE pending_users (
  -- Identité (référence à auth.users)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Informations du formulaire d'inscription
  email TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  prenoms TEXT NOT NULL,
  telephone TEXT,
  sexe TEXT CHECK (sexe IN ('Homme', 'Femme', 'Autre')),
  date_naissance DATE,

  -- Rôle demandé (toujours vendeur par défaut)
  requested_role TEXT NOT NULL DEFAULT 'vendeur' CHECK (requested_role IN ('vendeur', 'superviseur', 'admin')),

  -- Statut de la demande
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Raison du rejet (si rejeté)
  rejection_reason TEXT,

  -- Qui a traité la demande et quand
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,

  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_pending_users_email ON pending_users(email);
CREATE INDEX idx_pending_users_status ON pending_users(status);
CREATE INDEX idx_pending_users_created_at ON pending_users(created_at DESC);

-- Commentaires
COMMENT ON TABLE pending_users IS 'Table temporaire pour les inscriptions en attente d''approbation';
COMMENT ON COLUMN pending_users.status IS 'Statut: pending (en attente), approved (approuvé et migré vers users), rejected (rejeté)';
COMMENT ON COLUMN pending_users.requested_role IS 'Rôle demandé par l''utilisateur (toujours vendeur à l''inscription)';

-- ============================================
-- ÉTAPE 2: POLITIQUES RLS POUR pending_users
-- ============================================

-- Activer RLS
ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;

-- Politique 1: INSERT - N'importe qui peut créer une inscription (même non authentifié)
-- IMPORTANT: Après l'inscription, l'utilisateur est authentifié avec auth.uid()
CREATE POLICY "pending_users_insert_own"
ON pending_users FOR INSERT
TO public
WITH CHECK (
  status = 'pending'
  AND requested_role = 'vendeur'
);

COMMENT ON POLICY "pending_users_insert_own" ON pending_users IS
'Permet à n''importe qui de créer une inscription en attente (même avant authentification complète)';

-- Politique 2: SELECT - L'utilisateur peut lire sa propre inscription
CREATE POLICY "pending_users_select_own"
ON pending_users FOR SELECT
TO authenticated
USING (id = auth.uid());

COMMENT ON POLICY "pending_users_select_own" ON pending_users IS
'Permet à un utilisateur de lire sa propre inscription en attente';

-- Politique 3: SELECT - Les admins/superviseurs peuvent voir toutes les inscriptions
CREATE POLICY "pending_users_select_for_admins"
ON pending_users FOR SELECT
TO authenticated
USING (
  auth_user_role() IN ('admin', 'superviseur')
  AND auth_user_is_active() = true
);

COMMENT ON POLICY "pending_users_select_for_admins" ON pending_users IS
'Permet aux admins/superviseurs de voir toutes les inscriptions en attente';

-- Politique 4: UPDATE - Seuls les admins peuvent modifier le statut
CREATE POLICY "pending_users_update_for_admins"
ON pending_users FOR UPDATE
TO authenticated
USING (
  auth_user_role() = 'admin'
  AND auth_user_is_active() = true
)
WITH CHECK (
  auth_user_role() = 'admin'
  AND auth_user_is_active() = true
);

COMMENT ON POLICY "pending_users_update_for_admins" ON pending_users IS
'Permet aux admins de modifier les inscriptions en attente';

-- Politique 5: DELETE - Seuls les admins peuvent supprimer une inscription
CREATE POLICY "pending_users_delete_for_admins"
ON pending_users FOR DELETE
TO authenticated
USING (
  auth_user_role() = 'admin'
  AND auth_user_is_active() = true
);

COMMENT ON POLICY "pending_users_delete_for_admins" ON pending_users IS
'Permet aux admins de supprimer une inscription en attente';

-- ============================================
-- ÉTAPE 3: TRIGGER POUR updated_at
-- ============================================

CREATE TRIGGER update_pending_users_updated_at
  BEFORE UPDATE ON pending_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ÉTAPE 4: FONCTION D'APPROBATION (NOUVELLE VERSION)
-- ============================================

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS approve_user(UUID, UUID);

-- Créer la nouvelle fonction d'approbation
CREATE OR REPLACE FUNCTION approve_pending_user(
  pending_user_id UUID,
  admin_id UUID
)
RETURNS JSON AS $$
DECLARE
  pending_record RECORD;
  new_user_id UUID;
BEGIN
  -- Vérifier que l'admin existe et est actif
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = admin_id
    AND role = 'admin'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Seuls les administrateurs actifs peuvent approuver des inscriptions';
  END IF;

  -- Récupérer les données de l'inscription en attente
  SELECT * INTO pending_record
  FROM pending_users
  WHERE id = pending_user_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscription en attente introuvable ou déjà traitée';
  END IF;

  -- Créer l'utilisateur dans la table users
  INSERT INTO users (
    id,
    email,
    nom,
    prenoms,
    telephone,
    sexe,
    date_naissance,
    role,
    is_active,
    approval_status,
    approved_by,
    approved_at
  ) VALUES (
    pending_record.id,
    pending_record.email,
    pending_record.nom,
    pending_record.prenoms,
    pending_record.telephone,
    pending_record.sexe,
    pending_record.date_naissance,
    pending_record.requested_role, -- Généralement 'vendeur'
    true, -- Actif dès l'approbation
    'approved',
    admin_id,
    NOW()
  )
  RETURNING id INTO new_user_id;

  -- Marquer l'inscription comme approuvée
  UPDATE pending_users
  SET
    status = 'approved',
    reviewed_by = admin_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = pending_user_id;

  -- Retourner les informations du nouvel utilisateur
  RETURN json_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', pending_record.email,
    'nom', pending_record.nom,
    'prenoms', pending_record.prenoms
  );

EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, rollback automatique
    RAISE EXCEPTION 'Erreur lors de l''approbation: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_pending_user IS
'Approuve une inscription en attente et crée l''utilisateur dans la table users';

-- ============================================
-- ÉTAPE 5: FONCTION DE REJET (NOUVELLE VERSION)
-- ============================================

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS reject_user(UUID, UUID, TEXT);

-- Créer la nouvelle fonction de rejet
CREATE OR REPLACE FUNCTION reject_pending_user(
  pending_user_id UUID,
  admin_id UUID,
  reason TEXT
)
RETURNS JSON AS $$
DECLARE
  pending_record RECORD;
BEGIN
  -- Vérifier que l'admin existe et est actif
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = admin_id
    AND role = 'admin'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Seuls les administrateurs actifs peuvent rejeter des inscriptions';
  END IF;

  -- Récupérer les données de l'inscription en attente
  SELECT * INTO pending_record
  FROM pending_users
  WHERE id = pending_user_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscription en attente introuvable ou déjà traitée';
  END IF;

  -- Marquer l'inscription comme rejetée
  UPDATE pending_users
  SET
    status = 'rejected',
    rejection_reason = reason,
    reviewed_by = admin_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = pending_user_id;

  -- Retourner les informations
  RETURN json_build_object(
    'success', true,
    'user_id', pending_user_id,
    'email', pending_record.email,
    'reason', reason
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur lors du rejet: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_pending_user IS
'Rejette une inscription en attente avec une raison';

-- ============================================
-- ÉTAPE 6: FONCTION POUR NETTOYER LES ANCIENNES INSCRIPTIONS
-- ============================================

-- Fonction pour supprimer les inscriptions rejetées de plus de 30 jours
CREATE OR REPLACE FUNCTION cleanup_old_pending_users()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Supprimer les inscriptions rejetées de plus de 30 jours
  DELETE FROM pending_users
  WHERE status = 'rejected'
  AND reviewed_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_pending_users IS
'Supprime les inscriptions rejetées de plus de 30 jours';

-- ============================================
-- ÉTAPE 7: VUES UTILES
-- ============================================

-- Vue pour les inscriptions en attente (pour faciliter les requêtes)
CREATE OR REPLACE VIEW v_pending_users_summary AS
SELECT
  pu.id,
  pu.email,
  pu.nom,
  pu.prenoms,
  pu.telephone,
  pu.sexe,
  pu.date_naissance,
  pu.requested_role,
  pu.status,
  pu.rejection_reason,
  pu.created_at,
  pu.reviewed_at,
  u.nom || ' ' || u.prenoms AS reviewed_by_name
FROM pending_users pu
LEFT JOIN users u ON pu.reviewed_by = u.id
WHERE pu.status = 'pending'
ORDER BY pu.created_at DESC;

COMMENT ON VIEW v_pending_users_summary IS
'Vue des inscriptions en attente avec informations du reviewer';

-- ============================================
-- ÉTAPE 8: MODIFICATION DE LA TABLE users (OPTIONNEL)
-- ============================================

-- Si vous voulez garder une trace de la demande originale
-- Ajouter une colonne pour référencer la demande d'inscription

ALTER TABLE users
ADD COLUMN IF NOT EXISTS pending_user_id UUID REFERENCES pending_users(id);

COMMENT ON COLUMN users.pending_user_id IS
'Référence à l''inscription en attente qui a créé cet utilisateur';

-- ============================================
-- ÉTAPE 9: VÉRIFICATIONS
-- ============================================

-- Vérifier la structure de pending_users
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'pending_users'
ORDER BY ordinal_position;

-- Vérifier les politiques RLS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'pending_users'
ORDER BY cmd, policyname;

-- Vérifier les fonctions
SELECT
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  obj_description(oid) AS description
FROM pg_proc
WHERE proname IN ('approve_pending_user', 'reject_pending_user', 'cleanup_old_pending_users')
ORDER BY proname;

-- Message de succès
SELECT '✅ Système pending_users créé avec succès!' AS message,
       'Les nouvelles inscriptions seront stockées dans pending_users' AS details,
       'Les utilisateurs seront créés dans users uniquement après approbation' AS workflow;
