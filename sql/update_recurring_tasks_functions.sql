-- Mise à jour de la fonction create_daily_tasks pour gérer TOUTES les récurrences
-- (quotidiennes, hebdomadaires, mensuelles)

CREATE OR REPLACE FUNCTION create_daily_tasks()
RETURNS void AS $$
DECLARE
    recurring_task RECORD;
    should_create_task BOOLEAN;
BEGIN
    -- Pour chaque tâche récurrente (template)
    FOR recurring_task IN
        SELECT * FROM public.tasks
        WHERE is_recurring = true
        AND parent_task_id IS NULL
    LOOP
        should_create_task := FALSE;

        -- Logique selon le pattern de récurrence
        CASE recurring_task.recurrence_pattern
            -- QUOTIDIENNE: Créer tous les jours
            WHEN 'daily' THEN
                -- Vérifier qu'aucune tâche n'a été créée aujourd'hui
                IF NOT EXISTS (
                    SELECT 1 FROM public.tasks
                    WHERE parent_task_id = recurring_task.id
                    AND DATE(created_at) = CURRENT_DATE
                ) THEN
                    should_create_task := TRUE;
                END IF;

            -- HEBDOMADAIRE: Créer tous les lundis
            WHEN 'weekly' THEN
                -- Vérifier que c'est lundi (1 = Monday dans PostgreSQL)
                -- ET qu'aucune tâche n'a été créée cette semaine
                IF EXTRACT(ISODOW FROM CURRENT_DATE) = 1
                   AND NOT EXISTS (
                    SELECT 1 FROM public.tasks
                    WHERE parent_task_id = recurring_task.id
                    AND DATE_TRUNC('week', created_at) = DATE_TRUNC('week', CURRENT_DATE)
                ) THEN
                    should_create_task := TRUE;
                END IF;

            -- MENSUELLE: Créer le premier jour du mois
            WHEN 'monthly' THEN
                -- Vérifier que c'est le 1er du mois
                -- ET qu'aucune tâche n'a été créée ce mois
                IF EXTRACT(DAY FROM CURRENT_DATE) = 1
                   AND NOT EXISTS (
                    SELECT 1 FROM public.tasks
                    WHERE parent_task_id = recurring_task.id
                    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
                ) THEN
                    should_create_task := TRUE;
                END IF;
        END CASE;

        -- Créer la tâche si nécessaire
        IF should_create_task THEN
            INSERT INTO public.tasks (
                title,
                description,
                assigned_to,
                assigned_by,
                status,
                priority,
                due_date,
                is_recurring,
                recurrence_pattern,
                parent_task_id
            ) VALUES (
                recurring_task.title,
                recurring_task.description,
                recurring_task.assigned_to,
                recurring_task.assigned_by,
                'pending',
                recurring_task.priority,
                -- Due date selon le pattern
                CASE recurring_task.recurrence_pattern
                    WHEN 'daily' THEN timezone('utc'::text, now()) + INTERVAL '1 day'
                    WHEN 'weekly' THEN timezone('utc'::text, now()) + INTERVAL '1 week'
                    WHEN 'monthly' THEN timezone('utc'::text, now()) + INTERVAL '1 month'
                    ELSE timezone('utc'::text, now()) + INTERVAL '1 day'
                END,
                false,
                NULL,
                recurring_task.id
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour le commentaire de la fonction
COMMENT ON FUNCTION create_daily_tasks IS 'Fonction à appeler quotidiennement pour créer les tâches récurrentes (quotidiennes, hebdomadaires, mensuelles)';

-- NOTES D'UTILISATION:
--
-- 1. Cette fonction doit être appelée TOUS LES JOURS par le cron job
-- 2. Elle gère automatiquement les 3 types de récurrence:
--    - daily: Crée une tâche chaque jour
--    - weekly: Crée une tâche chaque lundi
--    - monthly: Crée une tâche le 1er de chaque mois
--
-- 3. La fonction vérifie toujours qu'une tâche n'a pas déjà été créée
--    pour la période concernée avant d'en créer une nouvelle
--
-- 4. Les dates d'échéance sont automatiquement calculées:
--    - daily: +1 jour
--    - weekly: +1 semaine
--    - monthly: +1 mois
--
-- 5. Pour tester manuellement:
--    SELECT create_daily_tasks();
