-- Script pour corriger les politiques RLS de la table preusers
-- Permet la lecture publique pour vérifier l'existence d'un email lors de l'inscription

-- 1. Activer RLS si ce n'est pas déjà fait
ALTER TABLE preusers ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Lecture publique des preusers pour inscription" ON preusers;
DROP POLICY IF EXISTS "Admins peuvent tout faire sur preusers" ON preusers;
DROP POLICY IF EXISTS "Deletion publique apres inscription" ON preusers;

-- 3. Politique de LECTURE PUBLIQUE (SELECT)
-- Permet à TOUT LE MONDE (même non authentifié) de lire la table preusers
-- Ceci est nécessaire pour vérifier si un email existe lors de l'inscription
CREATE POLICY "Lecture publique des preusers pour inscription"
ON preusers FOR SELECT
USING (true);

-- 4. Politique de SUPPRESSION PUBLIQUE (DELETE)
-- Permet à TOUT LE MONDE de supprimer un preuser
-- Ceci est nécessaire car après inscription, le système doit supprimer le preuser
CREATE POLICY "Deletion publique apres inscription"
ON preusers FOR DELETE
USING (true);

-- 5. Politique pour les ADMINS (INSERT, UPDATE)
-- Seuls les admins peuvent créer et modifier des preusers
CREATE POLICY "Admins peuvent creer et modifier preusers"
ON preusers FOR ALL
USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 6. Vérification des politiques
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
WHERE tablename = 'preusers';

-- Affichage pour confirmation
SELECT 'Politiques RLS mises à jour avec succès pour la table preusers' AS message;
