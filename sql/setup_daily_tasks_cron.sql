-- Configuration du cron job pour générer automatiquement les tâches quotidiennes
-- Ce script configure pg_cron (extension PostgreSQL) pour appeler create_daily_tasks() chaque jour à minuit

-- PRÉREQUIS: Installer l'extension pg_cron sur votre instance PostgreSQL
-- Pour Supabase: pg_cron est déjà installé par défaut

-- 1. Activer l'extension pg_cron (si pas déjà activée)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Créer le cron job pour exécuter create_daily_tasks() tous les jours à minuit (00:00)
-- Timezone: UTC (ajuster selon votre fuseau horaire)
SELECT cron.schedule(
    'generate-daily-tasks',           -- Nom du job
    '0 0 * * *',                      -- Cron expression: À minuit tous les jours
    $$SELECT create_daily_tasks()$$   -- Commande SQL à exécuter
);

-- ALTERNATIVE: Pour tester immédiatement, créer un job toutes les 5 minutes (à commenter après tests)
-- SELECT cron.schedule(
--     'generate-daily-tasks-test',
--     '*/5 * * * *',
--     $$SELECT create_daily_tasks()$$
-- );

-- 3. Vérifier que le job a été créé
SELECT * FROM cron.job WHERE jobname = 'generate-daily-tasks';

-- 4. Surveiller l'exécution du job (historique)
-- SELECT * FROM cron.job_run_details WHERE jobid = (
--     SELECT jobid FROM cron.job WHERE jobname = 'generate-daily-tasks'
-- ) ORDER BY start_time DESC LIMIT 10;

-- COMMANDES UTILES:

-- Désactiver temporairement le job
-- SELECT cron.unschedule('generate-daily-tasks');

-- Modifier l'horaire du job (par exemple, à 1h du matin)
-- SELECT cron.schedule(
--     'generate-daily-tasks',
--     '0 1 * * *',
--     $$SELECT create_daily_tasks()$$
-- );

-- Exécuter manuellement la fonction (pour tests)
-- SELECT create_daily_tasks();

-- NOTES:
-- - Le cron s'exécute en UTC par défaut
-- - Pour l'heure locale ivoirienne (UTC+0), minuit UTC = minuit locale
-- - Les logs d'exécution sont stockés dans cron.job_run_details
-- - En cas d'erreur, consulter les logs: SELECT * FROM cron.job_run_details WHERE status = 'failed';

-- CONFIGURATION POUR SUPABASE:
-- Sur Supabase, vous pouvez également configurer le cron via le Dashboard:
-- 1. Allez dans Database > Extensions
-- 2. Activez pg_cron si nécessaire
-- 3. Utilisez le SQL Editor pour exécuter ce script
