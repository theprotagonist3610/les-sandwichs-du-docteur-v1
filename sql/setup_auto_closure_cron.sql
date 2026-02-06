-- ============================================================================
-- CONFIGURATION DU CRON JOB POUR LA CLOTURE AUTOMATIQUE
-- ============================================================================
-- Ce script configure un cron job Supabase qui declenche automatiquement
-- la cloture de la veille a minuit (00:05) chaque jour
--
-- Prerequis:
-- 1. Extension pg_cron activee sur Supabase
-- 2. Edge function auto-closure deployee
-- 3. Table rapports creee
-- ============================================================================

-- Activer l'extension pg_cron si pas deja fait
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Activer l'extension pg_net pour les appels HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- FONCTION POUR APPELER L'EDGE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_auto_closure()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  yesterday TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Calculer la date d'hier
  yesterday := (CURRENT_DATE - INTERVAL '1 day')::DATE::TEXT;

  -- ============================================================================
  -- CONFIGURATION DIRECTE (Methode 3)
  -- ============================================================================
  -- URL Supabase du projet
  supabase_url := 'https://vqssmlzhyyezreomttnr.supabase.co';

  -- Service Role Key (a recuperer dans Dashboard > Project Settings > API)
  -- IMPORTANT: Remplacez cette valeur par votre vraie service_role key
  -- Elle commence par "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxc3NtbHpoeXllenJlb210dG5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI1MDg2NCwiZXhwIjoyMDc5ODI2ODY0fQ.liwg0EWkeWGMic7BbgnAzSk_RlWWYfodyP2dO_EEZAo';

  -- Verification que la cle est configuree
  IF service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxc3NtbHpoeXllenJlb210dG5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI1MDg2NCwiZXhwIjoyMDc5ODI2ODY0fQ.liwg0EWkeWGMic7BbgnAzSk_RlWWYfodyP2dO_EEZAo' THEN
    RAISE NOTICE 'Service role key not configured, skipping auto-closure';
    RAISE NOTICE 'Editez la fonction trigger_auto_closure() avec votre service_role key';
    RETURN;
  END IF;

  -- Verifier si une cloture existe deja pour hier
  IF EXISTS (SELECT 1 FROM days WHERE jour = yesterday::DATE) THEN
    RAISE NOTICE 'Cloture already exists for %', yesterday;
    RETURN;
  END IF;

  -- Verifier s il y a des commandes pour hier
  IF NOT EXISTS (
    SELECT 1 FROM commandes
    WHERE created_at >= (yesterday || 'T00:00:00')::TIMESTAMPTZ
    AND created_at <= (yesterday || 'T23:59:59')::TIMESTAMPTZ
  ) THEN
    RAISE NOTICE 'No orders for %, skipping auto-closure', yesterday;
    RETURN;
  END IF;

  -- Appeler l'edge function via pg_net
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/auto-closure',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'date', yesterday,
      'triggered_by', 'cron_job'
    )
  ) INTO request_id;

  RAISE NOTICE 'Auto-closure triggered for % (request_id: %)', yesterday, request_id;
END;
$$;

-- ============================================================================
-- CONFIGURATION DU CRON JOB
-- ============================================================================

-- Supprimer le job existant s'il existe
SELECT cron.unschedule('auto-closure-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-closure-daily'
);

-- Creer le cron job pour s'executer a 00:05 chaque jour (heure UTC)
-- Note: Ajustez l'heure selon votre fuseau horaire
-- Pour l'Afrique de l'Ouest (UTC+0), 00:05 UTC = 00:05 local
-- Pour l'Afrique Centrale (UTC+1), 00:05 UTC = 01:05 local
SELECT cron.schedule(
  'auto-closure-daily',           -- Nom du job
  '5 0 * * *',                    -- Cron expression: 00:05 chaque jour
  $$SELECT trigger_auto_closure()$$
);

-- ============================================================================
-- ALTERNATIVE: TRIGGER SUR INSERTION DE COMMANDE
-- ============================================================================
-- Si pg_cron n'est pas disponible, on peut utiliser un trigger
-- qui verifie et declenche la cloture quand une nouvelle commande est creee

CREATE OR REPLACE FUNCTION check_and_trigger_closure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  yesterday TEXT;
BEGIN
  -- Calculer la date d'hier
  yesterday := (CURRENT_DATE - INTERVAL '1 day')::DATE::TEXT;

  -- Verifier si c'est le premier acces du jour et si hier n'est pas cloture
  IF NOT EXISTS (SELECT 1 FROM days WHERE jour = yesterday::DATE) THEN
    -- Verifier s'il y avait des commandes hier
    IF EXISTS (
      SELECT 1 FROM commandes
      WHERE created_at >= (yesterday || 'T00:00:00')::TIMESTAMPTZ
      AND created_at <= (yesterday || 'T23:59:59')::TIMESTAMPTZ
    ) THEN
      -- Marquer qu'on doit declencher la cloture (via notification)
      PERFORM pg_notify('auto_closure_needed', yesterday);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Creer le trigger (optionnel, desactive par defaut)
-- DROP TRIGGER IF EXISTS trigger_check_closure ON commandes;
-- CREATE TRIGGER trigger_check_closure
--   AFTER INSERT ON commandes
--   FOR EACH ROW
--   EXECUTE FUNCTION check_and_trigger_closure();

-- ============================================================================
-- VERIFICATION ET TESTS
-- ============================================================================

-- Verifier que le job est bien cree
SELECT * FROM cron.job WHERE jobname = 'auto-closure-daily';

-- Voir l'historique des executions (apres quelques jours)
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-closure-daily')
-- ORDER BY start_time DESC
-- LIMIT 10;

-- Test manuel de la fonction (a executer pendant les tests)
-- SELECT trigger_auto_closure();

-- ============================================================================
-- NOTES IMPORTANTES
-- ============================================================================
--
-- 1. CONFIGURATION REQUISE:
--    AVANT d'executer ce script, vous DEVEZ:
--    a) Aller dans Dashboard Supabase > Project Settings > API
--    b) Copier la "service_role" key (PAS la "anon" key!)
--    c) Remplacer 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxc3NtbHpoeXllenJlb210dG5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI1MDg2NCwiZXhwIjoyMDc5ODI2ODY0fQ.liwg0EWkeWGMic7BbgnAzSk_RlWWYfodyP2dO_EEZAo' dans la fonction
--       trigger_auto_closure() par votre vraie cle
--
--    La service_role key ressemble a:
--    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
--
-- 2. FUSEAU HORAIRE:
--    Le cron s'execute en UTC. Ajustez l'heure selon votre fuseau:
--    - UTC+0 (Afrique de l'Ouest): '5 0 * * *' = 00:05 local
--    - UTC+1 (Afrique Centrale): '5 23 * * *' = 00:05 local
--
-- 3. LOGS:
--    Les logs sont visibles dans les Edge Function logs de Supabase
--
-- 4. FALLBACK:
--    Le frontend continue de declencher la cloture au changement de jour
--    comme backup si le cron echoue
--
-- 5. SECURITE:
--    La service_role key contourne les RLS policies. Elle est stockee
--    directement dans la fonction PostgreSQL (accessible uniquement
--    cote serveur, jamais exposee au client).
--
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '+ Cron job auto-closure-daily configure';
  RAISE NOTICE '+ Execution prevue: 00:05 UTC chaque jour';
  RAISE NOTICE '! N oubliez pas de configurer les settings Supabase';
  RAISE NOTICE '! Verifiez que l edge function auto-closure est deployee';
END $$;
