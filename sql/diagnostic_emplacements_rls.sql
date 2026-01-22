-- ============================================================================
-- DIAGNOSTIC COMPLET - Table EMPLACEMENTS
-- ============================================================================

-- 1. Vérifier si RLS est activé sur la table emplacements
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'emplacements';

-- 2. Lister toutes les politiques RLS sur la table emplacements
SELECT
  schemaname,
  tablename,
  policyname AS policy_name,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'emplacements'
ORDER BY
  CASE cmd
    WHEN 'r' THEN 1  -- SELECT
    WHEN 'a' THEN 2  -- INSERT
    WHEN 'w' THEN 3  -- UPDATE
    WHEN 'd' THEN 4  -- DELETE
  END,
  policyname;

-- 3. Compter le nombre d'emplacements dans la table (en tant que super user)
SELECT COUNT(*) AS total_emplacements FROM emplacements;

-- 4. Afficher tous les emplacements avec leurs informations de base
SELECT
  id,
  nom,
  type,
  statut,
  responsable_id,
  adresse,
  created_at
FROM emplacements
ORDER BY created_at DESC
LIMIT 10;

-- 5. Vérifier l'utilisateur actuellement connecté
SELECT
  auth.uid() AS current_user_id,
  auth.role() AS current_auth_role;

-- 6. Si vous êtes connecté, vérifier votre profil dans la table users
SELECT
  id,
  email,
  role,
  is_active
FROM users
WHERE id = auth.uid();
