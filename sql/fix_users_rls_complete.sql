-- Solution complète pour permettre l'inscription
-- Approche: Supprimer TOUTES les politiques restrictives et recréer proprement

-- 1. Lister les politiques existantes (pour backup)
SELECT
  policyname,
  cmd,
  pg_get_expr(polqual, polrelid) AS using_expr,
  pg_get_expr(polwithcheck, polrelid) AS with_check_expr
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'users';

-- 2. Supprimer TOUTES les politiques existantes
DROP POLICY IF EXISTS "Utilisateurs peuvent s'inscrire" ON users;
DROP POLICY IF EXISTS "Permettre insertion lors de l inscription" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Superviseurs peuvent voir tous les utilisateurs" ON users;
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leur propre profil" ON users;
DROP POLICY IF EXISTS "Utilisateurs peuvent modifier leur propre profil" ON users;
DROP POLICY IF EXISTS "Admins peuvent tout faire sur users" ON users;

-- 3. Recréer les politiques dans le BON ORDRE

-- POLITIQUE 1: INSERTION (lors de l'inscription)
-- PERMISSIVE + Sans restriction = permet à tout user authentifié d'insérer
CREATE POLICY "Permettre insertion lors inscription"
ON users FOR INSERT
TO authenticated
WITH CHECK (
  -- L'ID inséré doit correspondre à l'ID de l'utilisateur authentifié
  id = auth.uid()
);

-- POLITIQUE 2: SELECT (lecture)
-- Permet aux users de voir leur propre profil
CREATE POLICY "Utilisateurs voient leur profil"
ON users FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

-- POLITIQUE 3: SELECT pour admins/superviseurs
-- Permet aux admins et superviseurs de voir tous les profils
CREATE POLICY "Admins et superviseurs voient tous les profils"
ON users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('admin', 'superviseur')
  )
);

-- POLITIQUE 4: UPDATE (modification)
-- Permet aux users de modifier leur propre profil
CREATE POLICY "Utilisateurs modifient leur profil"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- POLITIQUE 5: UPDATE pour admins
-- Permet aux admins de modifier tous les profils
CREATE POLICY "Admins modifient tous les profils"
ON users FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
  )
);

-- POLITIQUE 6: DELETE (suppression)
-- Seuls les admins peuvent supprimer des users
CREATE POLICY "Admins peuvent supprimer users"
ON users FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
  )
);

-- 4. Vérification finale
SELECT 'Politiques RLS recréées avec succès!' AS message;

SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;
