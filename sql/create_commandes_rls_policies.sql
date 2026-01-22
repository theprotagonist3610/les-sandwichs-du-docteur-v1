-- ============================================================================
-- POLITIQUES RLS - Table COMMANDES
-- ============================================================================
-- Permissions:
-- - Tous les utilisateurs authentifiés peuvent lire toutes les commandes
-- - Tous les utilisateurs authentifiés peuvent créer des commandes
-- - Tous les utilisateurs authentifiés peuvent modifier les commandes non clôturées
-- - Seuls les admins peuvent supprimer des commandes
-- ============================================================================

-- Activer RLS sur la table commandes
ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLITIQUE 1: SELECT (Lecture)
-- Tous les utilisateurs authentifiés peuvent voir toutes les commandes
-- ============================================================================
DROP POLICY IF EXISTS "authenticated_users_can_read_commandes" ON commandes;

CREATE POLICY "authenticated_users_can_read_commandes"
ON commandes
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- POLITIQUE 2: INSERT (Création)
-- Tous les utilisateurs authentifiés peuvent créer des commandes
-- ============================================================================
DROP POLICY IF EXISTS "authenticated_users_can_create_commandes" ON commandes;

CREATE POLICY "authenticated_users_can_create_commandes"
ON commandes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================================
-- POLITIQUE 3: UPDATE (Modification)
-- Tous les utilisateurs authentifiés peuvent modifier les commandes non clôturées
-- Une commande est considérée comme clôturée si statut_commande = 'terminee' ou 'annulee'
-- ============================================================================
DROP POLICY IF EXISTS "authenticated_users_can_update_open_commandes" ON commandes;

CREATE POLICY "authenticated_users_can_update_open_commandes"
ON commandes
FOR UPDATE
TO authenticated
USING (statut_commande = 'en_cours')
WITH CHECK (statut_commande = 'en_cours');

-- ============================================================================
-- POLITIQUE 4: DELETE (Suppression)
-- Seuls les admins peuvent supprimer des commandes
-- ============================================================================
DROP POLICY IF EXISTS "admins_can_delete_commandes" ON commandes;

CREATE POLICY "admins_can_delete_commandes"
ON commandes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ============================================================================
-- Vérifier que toutes les politiques ont été créées
-- ============================================================================
SELECT
  schemaname,
  tablename,
  policyname AS policy_name,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression
FROM pg_policies
WHERE tablename = 'commandes'
ORDER BY
  CASE cmd
    WHEN 'r' THEN 1  -- SELECT
    WHEN 'a' THEN 2  -- INSERT
    WHEN 'w' THEN 3  -- UPDATE
    WHEN 'd' THEN 4  -- DELETE
  END,
  policyname;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Politiques RLS créées pour la table commandes';
  RAISE NOTICE '   - SELECT: Tous les utilisateurs authentifiés';
  RAISE NOTICE '   - INSERT: Tous les utilisateurs authentifiés';
  RAISE NOTICE '   - UPDATE: Commandes en cours uniquement';
  RAISE NOTICE '   - DELETE: Admins uniquement';
END $$;
