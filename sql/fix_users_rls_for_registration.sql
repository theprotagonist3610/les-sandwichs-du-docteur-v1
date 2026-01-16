-- Script pour corriger les politiques RLS de la table users
-- Permet l'insertion lors de l'inscription d'un nouvel utilisateur

-- 1. Supprimer l'ancienne politique d'insertion si elle existe
DROP POLICY IF EXISTS "Utilisateurs peuvent s'inscrire" ON users;
DROP POLICY IF EXISTS "Permettre insertion lors de l inscription" ON users;

-- 2. Politique pour permettre l'INSERTION lors de l'inscription
-- Permet à un utilisateur authentifié (qui vient juste de créer son compte auth)
-- d'insérer son profil dans la table users
CREATE POLICY "Permettre insertion lors de l inscription"
ON users FOR INSERT
WITH CHECK (
  -- L'utilisateur doit être authentifié (vient de créer son compte)
  auth.role() = 'authenticated' AND
  -- L'ID dans la table users doit correspondre à l'ID du user authentifié
  id = auth.uid()
);

-- 3. Vérifier toutes les politiques existantes sur users
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

-- Affichage pour confirmation
SELECT 'Politique RLS d''inscription ajoutée avec succès pour la table users' AS message;
