-- Créer la table tasks pour la gestion des tâches
-- Supporte les tâches quotidiennes récurrentes et les tâches ponctuelles

-- Table principale des tâches
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Assignation
    assigned_to UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Statut et priorité
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Dates
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Tâches récurrentes
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(50) CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly', NULL)),
    parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,

    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON public.tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring ON public.tasks(is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_tasks_updated_at();

-- Trigger pour définir completed_at automatiquement
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = timezone('utc'::text, now());
    ELSIF NEW.status != 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_task_completed_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_task_completed_at();

-- Fonction pour créer les tâches quotidiennes à partir des templates
CREATE OR REPLACE FUNCTION create_daily_tasks()
RETURNS void AS $$
DECLARE
    recurring_task RECORD;
    new_task_id UUID;
BEGIN
    -- Pour chaque tâche récurrente quotidienne
    FOR recurring_task IN
        SELECT * FROM public.tasks
        WHERE is_recurring = true
        AND recurrence_pattern = 'daily'
        AND parent_task_id IS NULL
    LOOP
        -- Vérifier s'il n'existe pas déjà une tâche créée aujourd'hui pour ce template
        IF NOT EXISTS (
            SELECT 1 FROM public.tasks
            WHERE parent_task_id = recurring_task.id
            AND DATE(created_at) = CURRENT_DATE
        ) THEN
            -- Créer une nouvelle tâche basée sur le template
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
                timezone('utc'::text, now()) + INTERVAL '1 day',
                false,
                NULL,
                recurring_task.id
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Les vendeurs ne peuvent voir que leurs propres tâches
CREATE POLICY "Vendeurs peuvent voir leurs tâches"
    ON public.tasks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'vendeur'
            AND tasks.assigned_to = auth.uid()
        )
    );

-- Policy: Les superviseurs voient toutes les tâches sauf celles des admins
CREATE POLICY "Superviseurs voient tâches sauf admins"
    ON public.tasks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'superviseur'
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = tasks.assigned_to
            AND users.role = 'admin'
        )
    );

-- Policy: Les admins voient toutes les tâches
CREATE POLICY "Admins voient toutes les tâches"
    ON public.tasks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy INSERT: Restrictions selon le rôle
CREATE POLICY "Permissions création tâches"
    ON public.tasks
    FOR INSERT
    WITH CHECK (
        -- Admins peuvent assigner à tout le monde
        (
            EXISTS (
                SELECT 1 FROM public.users
                WHERE users.id = auth.uid()
                AND users.role = 'admin'
            )
        )
        OR
        -- Superviseurs peuvent assigner aux superviseurs et vendeurs
        (
            EXISTS (
                SELECT 1 FROM public.users
                WHERE users.id = auth.uid()
                AND users.role = 'superviseur'
            )
            AND EXISTS (
                SELECT 1 FROM public.users
                WHERE users.id = assigned_to
                AND users.role IN ('superviseur', 'vendeur')
            )
        )
        OR
        -- Vendeurs peuvent s'assigner à eux-mêmes uniquement
        (
            EXISTS (
                SELECT 1 FROM public.users
                WHERE users.id = auth.uid()
                AND users.role = 'vendeur'
            )
            AND assigned_to = auth.uid()
        )
    );

-- Policy UPDATE: Seul l'assigné ou l'assigneur peut modifier
CREATE POLICY "Permissions modification tâches"
    ON public.tasks
    FOR UPDATE
    USING (
        assigned_to = auth.uid()
        OR assigned_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy DELETE: Seul l'assigneur ou un admin peut supprimer
CREATE POLICY "Permissions suppression tâches"
    ON public.tasks
    FOR DELETE
    USING (
        assigned_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Commentaires
COMMENT ON TABLE public.tasks IS 'Table de gestion des tâches avec support des tâches récurrentes';
COMMENT ON COLUMN public.tasks.is_recurring IS 'Indique si c''est une tâche template pour récurrence';
COMMENT ON COLUMN public.tasks.parent_task_id IS 'Référence vers la tâche template si créée par récurrence';
COMMENT ON FUNCTION create_daily_tasks IS 'Fonction à appeler quotidiennement pour créer les tâches récurrentes';
