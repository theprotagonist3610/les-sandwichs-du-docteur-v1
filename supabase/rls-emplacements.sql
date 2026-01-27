-- ============================================================================
-- POLITIQUES RLS POUR LA TABLE EMPLACEMENTS
-- ============================================================================
-- Ce fichier contient toutes les politiques Row Level Security (RLS)
-- pour la table emplacements
--
-- À exécuter dans Supabase SQL Editor
-- ============================================================================

-- Activer RLS sur la table emplacements (si ce n'est pas déjà fait)
ALTER TABLE emplacements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLITIQUE SELECT (Lecture)
-- ============================================================================
-- Tous les utilisateurs authentifiés peuvent lire les emplacements
-- (Cette politique existe déjà dans votre base de données)

DROP POLICY IF EXISTS "authenticated_users_can_read_emplacements" ON emplacements;

CREATE POLICY "authenticated_users_can_read_emplacements"
ON emplacements
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- POLITIQUE INSERT (Création)
-- ============================================================================
-- Seuls les admins et superviseurs peuvent créer des emplacements

DROP POLICY IF EXISTS "admins_and_supervisors_can_insert_emplacements" ON emplacements;

CREATE POLICY "admins_and_supervisors_can_insert_emplacements"
ON emplacements
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'superviseur')
  )
);

-- ============================================================================
-- POLITIQUE UPDATE (Modification)
-- ============================================================================
-- Seuls les admins et superviseurs peuvent modifier des emplacements

DROP POLICY IF EXISTS "admins_and_supervisors_can_update_emplacements" ON emplacements;

CREATE POLICY "admins_and_supervisors_can_update_emplacements"
ON emplacements
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'superviseur')
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'superviseur')
  )
);

-- ============================================================================
-- POLITIQUE DELETE (Suppression)
-- ============================================================================
-- Seuls les admins peuvent supprimer des emplacements
-- (Plus restrictif que UPDATE - réservé aux admins uniquement)

DROP POLICY IF EXISTS "admins_can_delete_emplacements" ON emplacements;

CREATE POLICY "admins_can_delete_emplacements"
ON emplacements
FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);

-- ============================================================================
-- VÉRIFICATION DES POLITIQUES
-- ============================================================================
-- Pour vérifier que les politiques sont bien en place, exécutez:
-- SELECT * FROM pg_policies WHERE tablename = 'emplacements';
