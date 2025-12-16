-- Activer Row Level Security (RLS) sur les tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_connection_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLITIQUES RLS POUR LA TABLE USERS
-- ============================================

-- Politique : Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Politique : Les superviseurs et admins peuvent voir tous les profils
CREATE POLICY "Supervisors and admins can view all profiles"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('superviseur', 'admin')
      AND is_active = true
    )
  );

-- Politique : Les utilisateurs peuvent modifier leur propre profil (sauf le rôle)
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.users WHERE id = auth.uid()) -- Le rôle ne peut pas être modifié par l'utilisateur
  );

-- Politique : Les superviseurs et admins peuvent modifier tous les profils
CREATE POLICY "Supervisors and admins can update all profiles"
  ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('superviseur', 'admin')
      AND is_active = true
    )
  );

-- Politique : Seuls les admins peuvent créer des utilisateurs
CREATE POLICY "Only admins can create users"
  ON public.users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Politique : Seuls les admins peuvent désactiver des utilisateurs (soft delete)
CREATE POLICY "Only admins can deactivate users"
  ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- ============================================
-- POLITIQUES RLS POUR LA TABLE USER_CONNECTION_HISTORY
-- ============================================

-- Politique : Les utilisateurs peuvent voir leur propre historique
CREATE POLICY "Users can view own connection history"
  ON public.user_connection_history
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Politique : Les superviseurs et admins peuvent voir tous les historiques
CREATE POLICY "Supervisors and admins can view all connection history"
  ON public.user_connection_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('superviseur', 'admin')
      AND is_active = true
    )
  );

-- Politique : Le système peut insérer dans l'historique (via trigger)
CREATE POLICY "System can insert connection history"
  ON public.user_connection_history
  FOR INSERT
  WITH CHECK (true); -- Accessible via les triggers

-- Commentaires
COMMENT ON POLICY "Users can view own profile" ON public.users IS 'Permet aux utilisateurs de voir leur propre profil';
COMMENT ON POLICY "Supervisors and admins can view all profiles" ON public.users IS 'Permet aux superviseurs et admins de voir tous les profils';
COMMENT ON POLICY "Users can update own profile" ON public.users IS 'Permet aux utilisateurs de modifier leur propre profil (sauf le rôle)';
COMMENT ON POLICY "Supervisors and admins can update all profiles" ON public.users IS 'Permet aux superviseurs et admins de modifier tous les profils';
COMMENT ON POLICY "Only admins can create users" ON public.users IS 'Seuls les admins peuvent créer des utilisateurs';
COMMENT ON POLICY "Only admins can deactivate users" ON public.users IS 'Seuls les admins peuvent désactiver des utilisateurs (soft delete)';
COMMENT ON POLICY "Users can view own connection history" ON public.user_connection_history IS 'Permet aux utilisateurs de voir leur propre historique de connexion';
COMMENT ON POLICY "Supervisors and admins can view all connection history" ON public.user_connection_history IS 'Permet aux superviseurs et admins de voir tous les historiques';
COMMENT ON POLICY "System can insert connection history" ON public.user_connection_history IS 'Permet au système d''insérer dans l''historique via triggers';
