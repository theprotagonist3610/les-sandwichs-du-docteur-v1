-- ============================================================================
-- POLITIQUES RLS POUR LA TABLE MENUS
-- ============================================================================
-- Configure les permissions d'accès à la table menus
-- Lecture: Tous les utilisateurs (authentifiés et non-authentifiés)
-- Écriture: Admins et Superviseurs uniquement
-- ============================================================================

-- ============================================================================
-- 1. POLITIQUE SELECT - LECTURE PUBLIQUE
-- ============================================================================

-- Tout le monde peut lire les menus (même les utilisateurs non connectés)
DROP POLICY IF EXISTS "Lecture publique des menus" ON menus;
CREATE POLICY "Lecture publique des menus"
  ON menus
  FOR SELECT
  TO public
  USING (true);

-- ============================================================================
-- 2. POLITIQUE INSERT - CRÉATION ADMIN/SUPERVISEUR UNIQUEMENT
-- ============================================================================

-- Seuls les admins et superviseurs peuvent créer des menus
DROP POLICY IF EXISTS "Création menus par admins/superviseurs" ON menus;
CREATE POLICY "Création menus par admins/superviseurs"
  ON menus
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superviseur')
    )
  );

-- ============================================================================
-- 3. POLITIQUE UPDATE - MODIFICATION ADMIN/SUPERVISEUR UNIQUEMENT
-- ============================================================================

-- Seuls les admins et superviseurs peuvent modifier des menus
DROP POLICY IF EXISTS "Modification menus par admins/superviseurs" ON menus;
CREATE POLICY "Modification menus par admins/superviseurs"
  ON menus
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superviseur')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superviseur')
    )
  );

-- ============================================================================
-- 4. POLITIQUE DELETE - SUPPRESSION ADMIN UNIQUEMENT
-- ============================================================================

-- Seuls les admins peuvent supprimer des menus
DROP POLICY IF EXISTS "Suppression menus par admins uniquement" ON menus;
CREATE POLICY "Suppression menus par admins uniquement"
  ON menus
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
-- VÉRIFICATION ET CONFIRMATION
-- ============================================================================

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Politiques RLS configurées pour la table menus';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Résumé des permissions:';
  RAISE NOTICE '   SELECT (Lecture): Public (tous, même non-authentifiés)';
  RAISE NOTICE '   INSERT (Création): Admins et Superviseurs uniquement';
  RAISE NOTICE '   UPDATE (Modification): Admins et Superviseurs uniquement';
  RAISE NOTICE '   DELETE (Suppression): Admins uniquement';
  RAISE NOTICE '';
  RAISE NOTICE '⏭️  Prochaine étape: Configurer le bucket Storage pour les images';
END $$;

-- Vérification des politiques créées
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'menus'
ORDER BY cmd;
