-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at sur la table users
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour enregistrer l'historique de connexion
CREATE OR REPLACE FUNCTION public.log_user_connection()
RETURNS TRIGGER AS $$
BEGIN
  -- Enregistrer uniquement si last_login_at a changé
  IF (TG_OP = 'UPDATE' AND NEW.last_login_at IS DISTINCT FROM OLD.last_login_at) THEN
    INSERT INTO public.user_connection_history (user_id, connection_date, success)
    VALUES (NEW.id, NEW.last_login_at, true);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour enregistrer l'historique de connexion
DROP TRIGGER IF EXISTS log_user_connection_trigger ON public.users;
CREATE TRIGGER log_user_connection_trigger
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_user_connection();

-- Fonction pour créer automatiquement un profil utilisateur après inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Note: Cette fonction sera appelée après la création d'un utilisateur dans auth.users
  -- Le profil complet sera créé via l'application
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Commentaires
COMMENT ON FUNCTION public.update_updated_at_column IS 'Met à jour automatiquement la colonne updated_at';
COMMENT ON FUNCTION public.log_user_connection IS 'Enregistre chaque connexion dans l''historique';
COMMENT ON FUNCTION public.handle_new_user IS 'Gère la création d''un nouveau profil utilisateur';
