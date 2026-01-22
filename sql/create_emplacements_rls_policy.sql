-- ============================================================================
-- CRÉER POLITIQUE RLS - Table EMPLACEMENTS
-- ============================================================================
-- Permet à tous les utilisateurs authentifiés de lire les emplacements
-- ============================================================================

-- S'assurer que RLS est activé
ALTER TABLE emplacements ENABLE ROW LEVEL SECURITY;

-- Supprimer la politique si elle existe déjà
DROP POLICY IF EXISTS "authenticated_users_can_read_emplacements" ON emplacements;

-- Créer la politique de lecture pour les utilisateurs authentifiés
CREATE POLICY "authenticated_users_can_read_emplacements"
ON emplacements
FOR SELECT
TO authenticated
USING (true);

-- Vérifier que la politique a été créée
SELECT
  schemaname,
  tablename,
  policyname AS policy_name,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression
FROM pg_policies
WHERE tablename = 'emplacements'
ORDER BY policyname;
