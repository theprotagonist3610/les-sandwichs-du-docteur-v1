-- Fix pour le problème "Profil utilisateur introuvable"
-- Le problème vient de la politique RLS "Admins lisent tous les profils"
-- qui peut créer une récursion infinie avec EXISTS (SELECT FROM users)

-- ========================================
-- ÉTAPE 1: SUPPRIMER LA POLITIQUE PROBLÉMATIQUE
-- ========================================

DROP POLICY IF EXISTS "Admins lisent tous les profils" ON users;

-- ========================================
-- ÉTAPE 2: RECRÉER LA POLITIQUE SANS RÉCURSION
-- ========================================

-- MÉTHODE 1: Utiliser une sous-requête simple sans EXISTS
CREATE POLICY "Admins lisent tous les profils"
ON users FOR SELECT
TO authenticated
USING (
  -- L'utilisateur peut lire tous les profils SI son propre rôle est admin/superviseur
  auth.uid() IN (
    SELECT id
    FROM users
    WHERE id = auth.uid()
    AND role IN ('admin', 'superviseur')
    AND is_active = true
  )
);

-- ========================================
-- ÉTAPE 3: VÉRIFICATION
-- ========================================

-- Vérifier que les 3 politiques SELECT existent
SELECT
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'SELECT'
ORDER BY policyname;

-- Résultat attendu:
-- 1. "Admins lisent tous les profils" (SELECT)
-- 2. "Utilisateurs lisent leur profil" (SELECT)

-- ========================================
-- ALTERNATIVE: Si le problème persiste
-- ========================================

-- Si la méthode ci-dessus ne fonctionne pas, utiliser cette approche
-- qui sépare complètement les deux politiques:

/*
-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Admins lisent tous les profils" ON users;

-- Créer deux politiques distinctes plus simples
CREATE POLICY "Admins lisent leur propre profil"
ON users FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  AND role IN ('admin', 'superviseur')
  AND is_active = true
);

CREATE POLICY "Admins lisent autres profils"
ON users FOR SELECT
TO authenticated
USING (
  id != auth.uid()
  AND EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('admin', 'superviseur')
    AND u.is_active = true
  )
);
*/

SELECT '✅ Correction appliquée avec succès!' AS message;
