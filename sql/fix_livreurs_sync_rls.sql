-- =====================================================
-- FIX: Politique RLS pour livreurs_sync
-- Problème: Les triggers ne peuvent pas insérer dans livreurs_sync
-- car la politique limite l'insertion à service_role uniquement
-- Solution: Permettre l'insertion aux utilisateurs authentifiés
-- =====================================================

-- Supprimer l'ancienne politique d'insertion restrictive
DROP POLICY IF EXISTS "Insertion des changements via triggers uniquement" ON livreurs_sync;

-- Créer une nouvelle politique qui permet aux utilisateurs authentifiés d'insérer
-- (Les triggers s'exécutent avec les permissions de l'utilisateur connecté)
CREATE POLICY "Insertion des changements pour utilisateurs authentifiés"
  ON livreurs_sync
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Politique RLS mise à jour avec succès!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Les utilisateurs authentifiés peuvent maintenant';
  RAISE NOTICE 'insérer dans livreurs_sync via les triggers.';
  RAISE NOTICE '==========================================';
END $$;
