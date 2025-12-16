-- Ajouter le champ last_seen à la table users pour le suivi en temps réel
-- Ce champ permet de tracker la dernière activité de l'utilisateur

-- Ajouter la colonne last_seen
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Mettre à jour les utilisateurs existants avec la date actuelle
UPDATE public.users
SET last_seen = timezone('utc'::text, now())
WHERE last_seen IS NULL;

-- Créer un index pour améliorer les performances des requêtes sur last_seen
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON public.users(last_seen DESC);

-- Créer un index composite pour filtrer rapidement les utilisateurs actifs
CREATE INDEX IF NOT EXISTS idx_users_active_last_seen ON public.users(is_active, last_seen DESC)
WHERE is_active = true;

-- Fonction helper pour déterminer si un utilisateur est en ligne
-- Un utilisateur est considéré "en ligne" si last_seen < 5 minutes
CREATE OR REPLACE FUNCTION is_user_online(user_last_seen TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT user_last_seen > (timezone('utc'::text, now()) - INTERVAL '5 minutes');
$$;

-- Vue matérialisée pour les statistiques de présence (optionnel, pour optimisation future)
-- Cette vue peut être rafraîchie périodiquement pour avoir des stats rapides
CREATE MATERIALIZED VIEW IF NOT EXISTS user_presence_stats AS
SELECT
  COUNT(*) FILTER (WHERE is_active = true) as total_active_users,
  COUNT(*) FILTER (WHERE is_active = true AND last_seen > (timezone('utc'::text, now()) - INTERVAL '5 minutes')) as online_users,
  COUNT(*) FILTER (WHERE is_active = true AND last_seen BETWEEN (timezone('utc'::text, now()) - INTERVAL '1 hour') AND (timezone('utc'::text, now()) - INTERVAL '5 minutes')) as recently_active_users,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_users
FROM public.users;

-- Index pour la vue matérialisée
CREATE UNIQUE INDEX IF NOT EXISTS user_presence_stats_idx ON user_presence_stats ((1));

-- Commenter les ajouts
COMMENT ON COLUMN public.users.last_seen IS 'Dernière activité de l''utilisateur (mise à jour toutes les 2-3 minutes pendant l''utilisation)';
COMMENT ON FUNCTION is_user_online IS 'Fonction helper pour déterminer si un utilisateur est en ligne (last_seen < 5 minutes)';
COMMENT ON MATERIALIZED VIEW user_presence_stats IS 'Statistiques de présence des utilisateurs (à rafraîchir périodiquement)';

-- Pour rafraîchir la vue matérialisée (à exécuter manuellement ou via un cron)
-- REFRESH MATERIALIZED VIEW user_presence_stats;
