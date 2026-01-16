-- Script de diagnostic pour identifier le problème de connexion
-- "Profil utilisateur introuvable"

-- ========================================
-- ÉTAPE 1: VÉRIFIER LES POLITIQUES RLS ACTUELLES
-- ========================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- ========================================
-- ÉTAPE 2: VÉRIFIER SI RLS EST ACTIVÉ
-- ========================================

SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'users';

-- ========================================
-- ÉTAPE 3: VÉRIFIER LA STRUCTURE DE LA TABLE
-- ========================================

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ========================================
-- ÉTAPE 4: COMPTER LES UTILISATEURS PAR STATUT
-- ========================================

SELECT
  approval_status,
  is_active,
  role,
  COUNT(*) as total
FROM users
GROUP BY approval_status, is_active, role
ORDER BY approval_status, role;

-- ========================================
-- ÉTAPE 5: TESTER LA POLITIQUE SELECT POUR UN USER
-- ========================================

-- Remplacez USER_ID_TO_TEST par l'ID d'un utilisateur qui a le problème
-- SELECT * FROM users WHERE id = 'USER_ID_TO_TEST';

-- ========================================
-- ÉTAPE 6: SOLUTION PROPOSÉE
-- ========================================

-- Si le problème persiste, la politique "Admins lisent tous les profils"
-- peut créer un problème de récursion.
-- Voici une version corrigée qui évite la récursion:

-- DROP POLICY IF EXISTS "Admins lisent tous les profils" ON users;

-- CREATE POLICY "Admins lisent tous les profils"
-- ON users FOR SELECT
-- TO authenticated
-- USING (
--   -- Vérifier le rôle directement sans sous-requête récursive
--   (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'superviseur')
--   AND
--   (SELECT is_active FROM users WHERE id = auth.uid()) = true
-- );
