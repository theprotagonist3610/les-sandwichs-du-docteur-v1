-- Table de l'historique des connexions
CREATE TABLE IF NOT EXISTS public.user_connection_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  connection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  failure_reason TEXT
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_connection_history_user_id ON public.user_connection_history(user_id);
CREATE INDEX IF NOT EXISTS idx_connection_history_date ON public.user_connection_history(connection_date DESC);
CREATE INDEX IF NOT EXISTS idx_connection_history_user_date ON public.user_connection_history(user_id, connection_date DESC);

-- Commentaires
COMMENT ON TABLE public.user_connection_history IS 'Historique des connexions des utilisateurs';
COMMENT ON COLUMN public.user_connection_history.user_id IS 'Référence à l''utilisateur';
COMMENT ON COLUMN public.user_connection_history.connection_date IS 'Date et heure de la tentative de connexion';
COMMENT ON COLUMN public.user_connection_history.ip_address IS 'Adresse IP de la connexion';
COMMENT ON COLUMN public.user_connection_history.user_agent IS 'User agent du navigateur';
COMMENT ON COLUMN public.user_connection_history.success IS 'Indique si la connexion a réussi';
COMMENT ON COLUMN public.user_connection_history.failure_reason IS 'Raison de l''échec si applicable';
