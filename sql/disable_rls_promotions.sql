-- =====================================================
-- Désactiver RLS sur les tables promotions
-- =====================================================
-- À utiliser pour déboguer uniquement
-- =====================================================

-- Désactiver RLS
ALTER TABLE public.promotions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions_archive DISABLE ROW LEVEL SECURITY;

-- Vérifier
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM
    pg_tables
WHERE
    schemaname = 'public'
    AND tablename IN ('promotions', 'promotions_archive');

-- Test de lecture
SELECT COUNT(*) as nb_templates FROM public.promotions;
SELECT COUNT(*) as nb_instances FROM public.promotions_archive;
