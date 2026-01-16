-- =====================================================
-- DIAGNOSTIC COMPLET - Tables Promotions
-- =====================================================

-- 1. Vérifier que les tables existent
SELECT
    'TABLES' as verification,
    table_name,
    CASE
        WHEN table_name IS NOT NULL THEN '✓ Existe'
        ELSE '✗ Manquante'
    END as status
FROM
    information_schema.tables
WHERE
    table_schema = 'public'
    AND table_name IN ('promotions', 'promotions_archive');

-- 2. Vérifier RLS
SELECT
    'RLS' as verification,
    tablename,
    CASE
        WHEN rowsecurity THEN '⚠️ ACTIVÉ'
        ELSE '✓ Désactivé'
    END as status
FROM
    pg_tables
WHERE
    schemaname = 'public'
    AND tablename IN ('promotions', 'promotions_archive');

-- 3. Compter les politiques RLS
SELECT
    'POLITIQUES RLS' as verification,
    tablename,
    COUNT(*) as nombre_politiques
FROM
    pg_policies
WHERE
    schemaname = 'public'
    AND tablename IN ('promotions', 'promotions_archive')
GROUP BY tablename;

-- 4. Lister TOUTES les politiques RLS
SELECT
    'DÉTAIL POLITIQUES' as verification,
    tablename,
    policyname,
    cmd as operation,
    roles as pour_role
FROM
    pg_policies
WHERE
    schemaname = 'public'
    AND tablename IN ('promotions', 'promotions_archive')
ORDER BY tablename, policyname;

-- 5. Vérifier REALTIME
SELECT
    'REALTIME' as verification,
    tablename,
    CASE
        WHEN tablename IS NOT NULL THEN '✓ Activé'
        ELSE '✗ Désactivé'
    END as status
FROM
    pg_publication_tables
WHERE
    pubname = 'supabase_realtime'
    AND tablename IN ('promotions', 'promotions_archive');

-- 6. Compter les données
SELECT
    'DONNÉES' as verification,
    'promotions' as table_name,
    COUNT(*) as nombre_lignes
FROM public.promotions
UNION ALL
SELECT
    'DONNÉES',
    'promotions_archive',
    COUNT(*)
FROM public.promotions_archive;

-- 7. Test de lecture directe (sans RLS)
SET LOCAL ROLE postgres;
SELECT
    'TEST LECTURE (bypass RLS)' as verification,
    'promotions' as table_name,
    COUNT(*) as accessible
FROM public.promotions
UNION ALL
SELECT
    'TEST LECTURE (bypass RLS)',
    'promotions_archive',
    COUNT(*)
FROM public.promotions_archive;

-- =====================================================
-- RECOMMANDATIONS
-- =====================================================

-- Si RLS est activé mais qu'il n'y a PAS de politique pour le rôle 'anon':
-- => Exécuter sql/disable_rls_promotions.sql

-- Si REALTIME n'est pas activé pour promotions_archive:
-- => Exécuter sql/reset_realtime_promotions.sql

-- Si les tables n'existent pas:
-- => Exécuter sql/create_promotions_table.sql puis sql/create_promotions_archive_table.sql
