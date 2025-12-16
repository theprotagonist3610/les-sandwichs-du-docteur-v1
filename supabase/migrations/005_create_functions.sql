-- Fonction pour vérifier et désactiver les utilisateurs inactifs (6+ mois)
CREATE OR REPLACE FUNCTION public.check_and_deactivate_inactive_users()
RETURNS TABLE (
  deactivated_user_id UUID,
  deactivated_user_email VARCHAR,
  last_login TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.users
  SET is_active = false
  WHERE
    is_active = true
    AND role != 'admin' -- Ne jamais désactiver les admins automatiquement
    AND (
      last_login_at IS NULL -- Jamais connecté
      OR last_login_at < NOW() - INTERVAL '6 months' -- Inactif depuis 6+ mois
    )
  RETURNING id, email, last_login_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si un email existe déjà dans la table users
CREATE OR REPLACE FUNCTION public.check_email_exists(user_email VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE email = user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour récupérer le profil complet d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id UUID)
RETURNS TABLE (
  id UUID,
  nom VARCHAR,
  prenoms VARCHAR,
  email VARCHAR,
  telephone VARCHAR,
  sexe VARCHAR,
  date_naissance DATE,
  role VARCHAR,
  photo_url TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.nom,
    u.prenoms,
    u.email,
    u.telephone,
    u.sexe,
    u.date_naissance,
    u.role,
    u.photo_url,
    u.is_active,
    u.created_at,
    u.updated_at,
    u.last_login_at
  FROM public.users u
  WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour mettre à jour la date de dernière connexion
CREATE OR REPLACE FUNCTION public.update_last_login(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET last_login_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour compter les utilisateurs par rôle
CREATE OR REPLACE FUNCTION public.count_users_by_role()
RETURNS TABLE (
  role VARCHAR,
  total_count BIGINT,
  active_count BIGINT,
  inactive_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.role,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE u.is_active = true) as active_count,
    COUNT(*) FILTER (WHERE u.is_active = false) as inactive_count
  FROM public.users u
  GROUP BY u.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaires
COMMENT ON FUNCTION public.check_and_deactivate_inactive_users IS 'Désactive les utilisateurs inactifs depuis plus de 6 mois (sauf admins)';
COMMENT ON FUNCTION public.check_email_exists IS 'Vérifie si un email existe déjà dans la table users';
COMMENT ON FUNCTION public.get_user_profile IS 'Récupère le profil complet d''un utilisateur';
COMMENT ON FUNCTION public.update_last_login IS 'Met à jour la date de dernière connexion';
COMMENT ON FUNCTION public.count_users_by_role IS 'Compte les utilisateurs par rôle (total, actifs, inactifs)';
