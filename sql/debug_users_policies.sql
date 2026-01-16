-- Script de diagnostic des politiques RLS sur la table users

-- 1. Vérifier si RLS est activé
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'users';

-- 2. Lister TOUTES les politiques existantes
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

-- 3. Afficher le détail de chaque politique
SELECT
  pol.polname AS policy_name,
  pol.polcmd AS command,
  CASE pol.polpermissive
    WHEN true THEN 'PERMISSIVE'
    WHEN false THEN 'RESTRICTIVE'
  END AS type,
  pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'users';
