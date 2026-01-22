-- ============================================================================
-- BUCKET SUPABASE STORAGE POUR LES IMAGES DES MENUS
-- ============================================================================
-- Crée et configure le bucket pour stocker les images des menus
-- Politiques: Lecture publique, Écriture admins/superviseurs uniquement
-- ============================================================================

-- ============================================================================
-- 1. CRÉER LE BUCKET
-- ============================================================================

-- Créer le bucket 'menu-images' s'il n'existe pas déjà
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true, -- Public pour permettre l'accès direct aux images
  5242880, -- 5 MB max par fichier
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- ============================================================================
-- 2. POLITIQUES RLS POUR LE BUCKET
-- ============================================================================

-- Policy SELECT - Lecture publique (tous peuvent voir les images)
DROP POLICY IF EXISTS "Lecture publique des images menus" ON storage.objects;
CREATE POLICY "Lecture publique des images menus"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'menu-images');

-- Policy INSERT - Upload par admins/superviseurs uniquement
DROP POLICY IF EXISTS "Upload images menus par admins/superviseurs" ON storage.objects;
CREATE POLICY "Upload images menus par admins/superviseurs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'menu-images'
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'superviseur')
      )
    )
  );

-- Policy UPDATE - Mise à jour par admins/superviseurs uniquement
DROP POLICY IF EXISTS "Modification images menus par admins/superviseurs" ON storage.objects;
CREATE POLICY "Modification images menus par admins/superviseurs"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'superviseur')
      )
    )
  );

-- Policy DELETE - Suppression par admins/superviseurs uniquement
DROP POLICY IF EXISTS "Suppression images menus par admins/superviseurs" ON storage.objects;
CREATE POLICY "Suppression images menus par admins/superviseurs"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'superviseur')
      )
    )
  );

-- ============================================================================
-- VÉRIFICATION ET CONFIRMATION
-- ============================================================================

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Bucket Storage "menu-images" configuré avec succès';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Configuration du bucket:';
  RAISE NOTICE '   - Nom: menu-images';
  RAISE NOTICE '   - Public: Oui (lecture directe des images)';
  RAISE NOTICE '   - Taille max: 5 MB par fichier';
  RAISE NOTICE '   - Formats autorisés: JPEG, JPG, PNG, WebP, GIF';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Politiques de sécurité:';
  RAISE NOTICE '   SELECT (Lecture): Public';
  RAISE NOTICE '   INSERT (Upload): Admins et Superviseurs uniquement';
  RAISE NOTICE '   UPDATE (Modification): Admins et Superviseurs uniquement';
  RAISE NOTICE '   DELETE (Suppression): Admins et Superviseurs uniquement';
  RAISE NOTICE '';
  RAISE NOTICE '⏭️  Prochaine étape: Activer Realtime avec enable_realtime_menus.sql';
END $$;

-- Vérifier les politiques créées
SELECT
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%menus%'
ORDER BY cmd;
