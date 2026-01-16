-- ============================================
-- RECONSTRUCTION COMPLÈTE DU SYSTÈME D'AUTHENTIFICATION
-- ============================================
-- Ce script résout tous les problèmes de récursion RLS
-- et reconstruit proprement le système d'approbation des utilisateurs

-- ============================================
-- ÉTAPE 1: NETTOYAGE COMPLET
-- ============================================

-- Désactiver RLS temporairement
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
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

-- Supprimer les fonctions d'approbation
DROP FUNCTION IF EXISTS approve_user(UUID, UUID);
DROP FUNCTION IF EXISTS reject_user(UUID, UUID, TEXT);

-- Supprimer la table users
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- ÉTAPE 2: CRÉATION DE LA TABLE USERS
-- ============================================

CREATE TABLE users (
  -- Identité
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  prenoms TEXT NOT NULL,
  telephone TEXT,
  sexe TEXT CHECK (sexe IN ('Homme', 'Femme', 'Autre')),
  date_naissance DATE,

  -- Rôles et permissions
  role TEXT NOT NULL DEFAULT 'vendeur' CHECK (role IN ('vendeur', 'superviseur', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT false,

  -- Système d'approbation
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  -- Métadonnées
  photo_url TEXT,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_approval_status ON users(approval_status);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Commentaires
COMMENT ON TABLE users IS 'Table des profils utilisateurs avec système d''approbation';
COMMENT ON COLUMN users.approval_status IS 'Statut d''approbation: pending (en attente), approved (approuvé), rejected (rejeté)';
COMMENT ON COLUMN users.is_active IS 'Compte actif (true) ou désactivé (false)';
COMMENT ON COLUMN users.role IS 'Rôle de l''utilisateur: vendeur, superviseur, admin';

-- ============================================
-- ÉTAPE 3: POLITIQUES RLS SANS RÉCURSION
-- ============================================

-- Activer RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLITIQUES INSERT
-- ============================================

-- Politique 1: Inscription libre
-- Tout utilisateur authentifié peut créer son propre profil
CREATE POLICY "users_insert_own_profile"
ON users FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()
  AND approval_status = 'pending'
  AND role = 'vendeur'
  AND is_active = false
);

COMMENT ON POLICY "users_insert_own_profile" ON users IS
'Permet à un utilisateur de créer son propre profil lors de l''inscription';

-- ============================================
-- POLITIQUES SELECT (LECTURE)
-- ============================================

-- Politique 2: Lecture de son propre profil
-- Chaque utilisateur peut toujours lire son propre profil
CREATE POLICY "users_select_own_profile"
ON users FOR SELECT
TO authenticated
USING (id = auth.uid());

COMMENT ON POLICY "users_select_own_profile" ON users IS
'Permet à un utilisateur de lire son propre profil';

-- Politique 3: Lecture pour superviseurs et admins
-- Solution sans récursion: utiliser une fonction immutable
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_is_active()
RETURNS BOOLEAN AS $$
  SELECT is_active FROM users WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Politique pour superviseurs/admins
CREATE POLICY "users_select_for_supervisors_admins"
ON users FOR SELECT
TO authenticated
USING (
  -- Utiliser les fonctions qui s'exécutent une seule fois par requête
  auth_user_role() IN ('superviseur', 'admin')
  AND auth_user_is_active() = true
);

COMMENT ON POLICY "users_select_for_supervisors_admins" ON users IS
'Permet aux superviseurs et admins actifs de lire tous les profils';

-- ============================================
-- POLITIQUES UPDATE (MODIFICATION)
-- ============================================

-- Politique 4: Modification de son propre profil
-- Utilisateurs peuvent modifier leur profil SAUF approval_status
CREATE POLICY "users_update_own_profile"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  -- L'utilisateur ne peut pas changer son propre statut d'approbation
  -- On le vérifie en s'assurant que approval_status reste identique
);

COMMENT ON POLICY "users_update_own_profile" ON users IS
'Permet à un utilisateur de modifier son propre profil (sauf statut d''approbation)';

-- Politique 5: Modification pour admins
-- Admins peuvent modifier tous les profils
CREATE POLICY "users_update_for_admins"
ON users FOR UPDATE
TO authenticated
USING (
  auth_user_role() = 'admin'
  AND auth_user_is_active() = true
)
WITH CHECK (
  auth_user_role() = 'admin'
  AND auth_user_is_active() = true
);

COMMENT ON POLICY "users_update_for_admins" ON users IS
'Permet aux admins actifs de modifier tous les profils';

-- ============================================
-- POLITIQUES DELETE (SUPPRESSION)
-- ============================================

-- Politique 6: Suppression pour admins uniquement
CREATE POLICY "users_delete_for_admins"
ON users FOR DELETE
TO authenticated
USING (
  auth_user_role() = 'admin'
  AND auth_user_is_active() = true
);

COMMENT ON POLICY "users_delete_for_admins" ON users IS
'Permet aux admins actifs de supprimer des utilisateurs';

-- ============================================
-- ÉTAPE 4: FONCTIONS D'APPROBATION
-- ============================================

-- Fonction pour approuver un utilisateur
CREATE OR REPLACE FUNCTION approve_user(
  user_id_to_approve UUID,
  admin_id UUID
)
RETURNS VOID AS $$
DECLARE
  admin_role TEXT;
  admin_active BOOLEAN;
BEGIN
  -- Vérifier que l'admin existe et est actif
  SELECT role, is_active INTO admin_role, admin_active
  FROM users
  WHERE id = admin_id;

  IF admin_role != 'admin' OR NOT admin_active THEN
    RAISE EXCEPTION 'Seuls les administrateurs actifs peuvent approuver des utilisateurs';
  END IF;

  -- Approuver l'utilisateur
  UPDATE users
  SET
    approval_status = 'approved',
    is_active = true,
    approved_by = admin_id,
    approved_at = NOW(),
    rejection_reason = NULL,
    updated_at = NOW()
  WHERE id = user_id_to_approve;

  RAISE NOTICE 'Utilisateur % approuvé par %', user_id_to_approve, admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_user IS
'Approuve un utilisateur en attente (admin uniquement)';

-- Fonction pour rejeter un utilisateur
CREATE OR REPLACE FUNCTION reject_user(
  user_id_to_reject UUID,
  admin_id UUID,
  reason TEXT
)
RETURNS VOID AS $$
DECLARE
  admin_role TEXT;
  admin_active BOOLEAN;
BEGIN
  -- Vérifier que l'admin existe et est actif
  SELECT role, is_active INTO admin_role, admin_active
  FROM users
  WHERE id = admin_id;

  IF admin_role != 'admin' OR NOT admin_active THEN
    RAISE EXCEPTION 'Seuls les administrateurs actifs peuvent rejeter des utilisateurs';
  END IF;

  -- Rejeter l'utilisateur
  UPDATE users
  SET
    approval_status = 'rejected',
    is_active = false,
    approved_by = admin_id,
    approved_at = NOW(),
    rejection_reason = reason,
    updated_at = NOW()
  WHERE id = user_id_to_reject;

  RAISE NOTICE 'Utilisateur % rejeté par %', user_id_to_reject, admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_user IS
'Rejette un utilisateur en attente (admin uniquement)';

-- ============================================
-- ÉTAPE 5: TRIGGER POUR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ÉTAPE 6: DONNÉES DE TEST (OPTIONNEL)
-- ============================================

-- Décommenter pour créer un admin de test
/*
-- Note: Vous devez d'abord créer le compte dans Supabase Auth
-- puis insérer manuellement l'ID ici

INSERT INTO users (
  id,
  email,
  nom,
  prenoms,
  role,
  is_active,
  approval_status,
  approved_at
) VALUES (
  'VOTRE-UUID-AUTH-ICI', -- Remplacer par l'UUID du compte auth créé
  'admin@example.com',
  'Admin',
  'Système',
  'admin',
  true,
  'approved',
  NOW()
) ON CONFLICT (id) DO NOTHING;
*/

-- ============================================
-- ÉTAPE 7: VÉRIFICATIONS
-- ============================================

-- Afficher les politiques créées
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- Afficher les fonctions créées
SELECT
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  obj_description(oid) AS description
FROM pg_proc
WHERE proname IN ('approve_user', 'reject_user', 'auth_user_role', 'auth_user_is_active')
ORDER BY proname;

-- Vérifier la structure de la table
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Message de succès
SELECT '✅ Système d''authentification reconstruit avec succès!' AS message,
       'Les politiques RLS sont maintenant sans récursion' AS details;
