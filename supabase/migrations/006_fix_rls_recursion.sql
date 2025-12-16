-- ============================================
-- CORRECTION DE LA RÉCURSION INFINIE DANS LES POLITIQUES RLS
-- ============================================

-- Supprimer toutes les politiques existantes qui causent la récursion
DROP POLICY IF EXISTS "Supervisors and admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Supervisors and admins can update all profiles" ON public.users;
DROP POLICY IF EXISTS "Only admins can create users" ON public.users;
DROP POLICY IF EXISTS "Only admins can deactivate users" ON public.users;
DROP POLICY IF EXISTS "Supervisors and admins can view all connection history" ON public.user_connection_history;

-- ============================================
-- CRÉER DES FONCTIONS SECURITY DEFINER POUR ÉVITER LA RÉCURSION
-- ============================================

-- Fonction pour récupérer le rôle de l'utilisateur actuel sans déclencher RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si l'utilisateur actuel est actif
CREATE OR REPLACE FUNCTION public.is_current_user_active()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT is_active
    FROM public.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RECRÉER LES POLITIQUES SANS RÉCURSION
-- ============================================

-- Politique : Les superviseurs et admins peuvent voir tous les profils
CREATE POLICY "Supervisors and admins can view all profiles"
  ON public.users
  FOR SELECT
  USING (
    public.get_current_user_role() IN ('superviseur', 'admin')
    AND public.is_current_user_active() = true
  );

-- Politique : Les superviseurs et admins peuvent modifier tous les profils
CREATE POLICY "Supervisors and admins can update all profiles"
  ON public.users
  FOR UPDATE
  USING (
    public.get_current_user_role() IN ('superviseur', 'admin')
    AND public.is_current_user_active() = true
  );

-- Politique : Seuls les admins peuvent créer des utilisateurs
CREATE POLICY "Only admins can create users"
  ON public.users
  FOR INSERT
  WITH CHECK (
    public.get_current_user_role() = 'admin'
    AND public.is_current_user_active() = true
  );

-- Politique : Seuls les admins peuvent désactiver des utilisateurs (soft delete)
CREATE POLICY "Only admins can deactivate users"
  ON public.users
  FOR UPDATE
  USING (
    public.get_current_user_role() = 'admin'
    AND public.is_current_user_active() = true
  )
  WITH CHECK (
    public.get_current_user_role() = 'admin'
    AND public.is_current_user_active() = true
  );

-- Politique : Les superviseurs et admins peuvent voir tous les historiques
CREATE POLICY "Supervisors and admins can view all connection history"
  ON public.user_connection_history
  FOR SELECT
  USING (
    public.get_current_user_role() IN ('superviseur', 'admin')
    AND public.is_current_user_active() = true
  );

-- Commentaires mis à jour
COMMENT ON FUNCTION public.get_current_user_role() IS 'Retourne le rôle de l''utilisateur actuel sans déclencher RLS';
COMMENT ON FUNCTION public.is_current_user_active() IS 'Vérifie si l''utilisateur actuel est actif sans déclencher RLS';
