-- Migration vers le système d'inscription libre avec approbation admin
-- Ce script ajoute les champs nécessaires et met à jour les politiques RLS

-- ========================================
-- ÉTAPE 1: MODIFICATION DE LA TABLE USERS
-- ========================================

-- Ajouter les nouveaux champs d'approbation
ALTER TABLE users
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending'
  CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Mettre à jour les utilisateurs existants comme approuvés
UPDATE users
SET approval_status = 'approved',
    approved_at = created_at
WHERE approval_status = 'pending' AND is_active = true;

-- Créer un index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);

-- Commentaires
COMMENT ON COLUMN users.approval_status IS 'Statut d''approbation: pending, approved, rejected';
COMMENT ON COLUMN users.approved_by IS 'Admin qui a approuvé/rejeté le compte';
COMMENT ON COLUMN users.approved_at IS 'Date d''approbation/rejet';
COMMENT ON COLUMN users.rejection_reason IS 'Raison du rejet (si rejected)';

-- ========================================
-- ÉTAPE 2: SUPPRESSION DE TOUTES LES ANCIENNES POLITIQUES
-- ========================================

-- Désactiver temporairement RLS pour supprimer toutes les politiques
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les politiques existantes de manière dynamique
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', policy_record.policyname);
        RAISE NOTICE 'Suppression de la politique: %', policy_record.policyname;
    END LOOP;
END $$;

-- Réactiver RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ÉTAPE 3: NOUVELLES POLITIQUES RLS
-- ========================================

-- POLITIQUE 1: INSCRIPTION LIBRE (INSERT)
-- Permet à tout utilisateur authentifié de créer son profil
-- Le statut sera automatiquement "pending"
CREATE POLICY "Inscription libre pour tous"
ON users FOR INSERT
TO authenticated
WITH CHECK (
  -- L'utilisateur crée son propre profil
  id = auth.uid() AND
  -- Le statut doit être "pending" lors de l'inscription
  approval_status = 'pending' AND
  -- Le rôle doit être "vendeur" par défaut
  role = 'vendeur'
);

-- POLITIQUE 2: LECTURE DU PROFIL (SELECT)
-- Utilisateurs peuvent voir leur propre profil
CREATE POLICY "Utilisateurs lisent leur profil"
ON users FOR SELECT
TO authenticated
USING (id = auth.uid());

-- POLITIQUE 3: LECTURE POUR ADMINS/SUPERVISEURS (SELECT)
-- Admins et superviseurs peuvent voir tous les profils
CREATE POLICY "Admins lisent tous les profils"
ON users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('admin', 'superviseur')
    AND u.is_active = true
  )
);

-- POLITIQUE 4: MODIFICATION DU PROFIL (UPDATE)
-- Utilisateurs peuvent modifier leur propre profil (sauf statut d'approbation)
CREATE POLICY "Utilisateurs modifient leur profil"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  -- Ne peut pas changer son propre statut d'approbation
  approval_status = (SELECT approval_status FROM users WHERE id = auth.uid())
);

-- POLITIQUE 5: MODIFICATION PAR ADMINS (UPDATE)
-- Admins peuvent tout modifier, y compris les statuts
CREATE POLICY "Admins modifient tous les profils"
ON users FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
    AND u.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
    AND u.is_active = true
  )
);

-- POLITIQUE 6: SUPPRESSION (DELETE)
-- Seuls les admins peuvent supprimer des utilisateurs
CREATE POLICY "Admins suppriment des utilisateurs"
ON users FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
    AND u.is_active = true
  )
);

-- ========================================
-- ÉTAPE 4: SUPPRESSION DE LA TABLE PREUSERS
-- ========================================

-- La table preusers n'est plus nécessaire
-- ATTENTION: Sauvegardez les données avant de supprimer si nécessaire!

-- Sauvegarder les emails en attente (optionnel)
-- CREATE TABLE preusers_backup AS SELECT * FROM preusers;

-- Supprimer la table preusers
DROP TABLE IF EXISTS preusers CASCADE;

-- ========================================
-- ÉTAPE 5: FONCTION HELPER POUR APPROBATION
-- ========================================

-- Fonction pour approuver un utilisateur
CREATE OR REPLACE FUNCTION approve_user(
  user_id_to_approve UUID,
  admin_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Vérifier que l'admin existe et est actif
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = admin_id
    AND role = 'admin'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Vous n''avez pas les permissions pour approuver des utilisateurs';
  END IF;

  -- Approuver l'utilisateur
  UPDATE users
  SET
    approval_status = 'approved',
    is_active = true,
    approved_by = admin_id,
    approved_at = NOW(),
    rejection_reason = NULL
  WHERE id = user_id_to_approve;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour rejeter un utilisateur
CREATE OR REPLACE FUNCTION reject_user(
  user_id_to_reject UUID,
  admin_id UUID,
  reason TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Vérifier que l'admin existe et est actif
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = admin_id
    AND role = 'admin'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Vous n''avez pas les permissions pour rejeter des utilisateurs';
  END IF;

  -- Rejeter l'utilisateur
  UPDATE users
  SET
    approval_status = 'rejected',
    is_active = false,
    approved_by = admin_id,
    approved_at = NOW(),
    rejection_reason = reason
  WHERE id = user_id_to_reject;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaires
COMMENT ON FUNCTION approve_user IS 'Approuve un utilisateur en attente (admin uniquement)';
COMMENT ON FUNCTION reject_user IS 'Rejette un utilisateur en attente (admin uniquement)';

-- ========================================
-- ÉTAPE 6: VÉRIFICATION
-- ========================================

-- Vérifier les nouvelles colonnes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('approval_status', 'approved_by', 'approved_at', 'rejection_reason')
ORDER BY ordinal_position;

-- Vérifier les politiques
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- Compter les utilisateurs par statut
SELECT
  approval_status,
  COUNT(*) as total
FROM users
GROUP BY approval_status;

SELECT '✅ Migration terminée avec succès!' AS message;
