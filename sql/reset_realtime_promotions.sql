-- =====================================================
-- Réinitialiser REALTIME après recréation des tables
-- =====================================================

-- 1. Supprimer les tables de la publication REALTIME (ignorer les erreurs)
-- Note: Ces commandes peuvent échouer si les tables ne sont pas dans la publication, c'est normal
DO $$
BEGIN
    -- Essayer de supprimer promotions
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.promotions;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignorer l'erreur
    END;

    -- Essayer de supprimer promotions_archive
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.promotions_archive;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignorer l'erreur
    END;
END $$;

-- 2. Ré-ajouter promotions_archive à la publication REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions_archive;

-- 3. Vérifier que REALTIME est activé
SELECT
    schemaname,
    tablename
FROM
    pg_publication_tables
WHERE
    pubname = 'supabase_realtime';

-- Devrait afficher promotions_archive dans la liste

-- 4. Vérifier que les tables existent et sont accessibles
SELECT COUNT(*) as nb_templates FROM public.promotions;
SELECT COUNT(*) as nb_instances FROM public.promotions_archive;

-- 5. Test de connexion REALTIME (info)
SELECT
    'promotions_archive' as table_name,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
            AND tablename = 'promotions_archive'
        ) THEN 'REALTIME ACTIVÉ ✓'
        ELSE 'REALTIME DÉSACTIVÉ ✗'
    END as status;
