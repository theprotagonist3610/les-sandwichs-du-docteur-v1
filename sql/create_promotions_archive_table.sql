-- =====================================================
-- Script de création de la table PROMOTIONS_ARCHIVE (Instances)
-- =====================================================
-- Description: Table pour stocker les instances/activations de promotions avec historique
-- Cette table est REALTIME pour synchronisation en temps réel
-- Auteur: Claude Code
-- Date: 2025-12-24
-- =====================================================

-- Supprimer la table si elle existe (à utiliser avec précaution en production)
DROP TABLE IF EXISTS public.promotions_archive CASCADE;

-- Créer la table promotions_archive (instances)
CREATE TABLE public.promotions_archive (
    -- Identifiant unique de l'instance
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Référence au template
    promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,

    -- Snapshot des données du template au moment de l'activation
    denomination VARCHAR(100) NOT NULL,
    description TEXT,
    code_promo VARCHAR(20), -- Code promo généré pour cette instance (UNIQUE via index partiel)
    type_promotion TEXT NOT NULL CHECK (type_promotion IN ('standard', 'flash', 'happy_hour', 'recurrente')),
    reduction_absolue DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    reduction_relative DECIMAL(5, 2) DEFAULT 0 NOT NULL,

    -- Période d'activation EFFECTIVE
    date_debut TIMESTAMPTZ NOT NULL,
    date_fin TIMESTAMPTZ NOT NULL,
    duree_valeur INTEGER NOT NULL,
    duree_unite TEXT NOT NULL CHECK (duree_unite IN ('minutes', 'hours', 'days', 'weeks', 'months')),

    -- Snapshot de l'éligibilité
    eligibilite JSONB NOT NULL DEFAULT '{"type": "tous"}'::JSONB,

    -- Tracking d'utilisation RÉEL
    utilisation_max INTEGER,
    utilisation_max_par_client INTEGER DEFAULT 1 NOT NULL,
    utilisation_count INTEGER DEFAULT 0 NOT NULL,

    -- Statut de l'instance
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    is_active BOOLEAN DEFAULT true NOT NULL,

    -- Métriques de performance
    revenu_genere DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    nombre_commandes INTEGER DEFAULT 0 NOT NULL,
    panier_moyen DECIMAL(10, 2) DEFAULT 0 NOT NULL,

    -- Métadonnées
    activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    activated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Contraintes
    CONSTRAINT archive_denomination_not_empty CHECK (LENGTH(TRIM(denomination)) > 0),
    CONSTRAINT archive_at_least_one_reduction CHECK (reduction_absolue > 0 OR reduction_relative > 0),
    CONSTRAINT archive_reduction_absolue_positive CHECK (reduction_absolue >= 0),
    CONSTRAINT archive_reduction_relative_range CHECK (reduction_relative >= 0 AND reduction_relative <= 100),
    CONSTRAINT archive_dates_valid CHECK (date_fin > date_debut),
    CONSTRAINT archive_utilisation_count_positive CHECK (utilisation_count >= 0),
    CONSTRAINT archive_utilisation_max_positive CHECK (utilisation_max IS NULL OR utilisation_max > 0),
    CONSTRAINT archive_metriques_positive CHECK (revenu_genere >= 0 AND nombre_commandes >= 0 AND panier_moyen >= 0)
);

-- =====================================================
-- INDEX CRITIQUES POUR PERFORMANCE
-- =====================================================

-- Index sur promotion_id pour retrouver toutes les instances d'un template
CREATE INDEX idx_archive_promotion_id ON public.promotions_archive(promotion_id);

-- Index sur les dates pour les filtres de période
CREATE INDEX idx_archive_date_debut ON public.promotions_archive(date_debut);
CREATE INDEX idx_archive_date_fin ON public.promotions_archive(date_fin);
CREATE INDEX idx_archive_dates ON public.promotions_archive(date_debut, date_fin);

-- Index composite CRITIQUE pour rechercher les instances actives en ce moment
CREATE INDEX idx_archive_active ON public.promotions_archive(is_active, status, date_debut, date_fin)
WHERE is_active = true AND status = 'active';

-- Index pour les promotions flash actives (critical for performance)
CREATE INDEX idx_archive_flash_active ON public.promotions_archive(type_promotion, is_active, status, date_debut, date_fin)
WHERE type_promotion = 'flash' AND is_active = true AND status = 'active';

-- Index sur le statut pour filtrer par état
CREATE INDEX idx_archive_status ON public.promotions_archive(status);

-- Index sur le code promo pour validation rapide
CREATE INDEX idx_archive_code_promo ON public.promotions_archive(code_promo)
WHERE code_promo IS NOT NULL;

-- Index unique sur code_promo pour éviter les doublons
CREATE UNIQUE INDEX idx_archive_code_promo_unique ON public.promotions_archive(code_promo)
WHERE code_promo IS NOT NULL AND is_active = true;

-- Index sur le type de promotion
CREATE INDEX idx_archive_type ON public.promotions_archive(type_promotion);

-- Index GIN sur eligibilite JSONB
CREATE INDEX idx_archive_eligibilite ON public.promotions_archive USING GIN (eligibilite);

-- Index sur activated_at pour tri chronologique des activations
CREATE INDEX idx_archive_activated_at ON public.promotions_archive(activated_at DESC);

-- Index sur completed_at pour instances complétées
CREATE INDEX idx_archive_completed_at ON public.promotions_archive(completed_at DESC)
WHERE completed_at IS NOT NULL;

-- Index sur cancelled_at pour instances annulées
CREATE INDEX idx_archive_cancelled_at ON public.promotions_archive(cancelled_at DESC)
WHERE cancelled_at IS NOT NULL;

-- Index sur activated_by pour filtrer par utilisateur
CREATE INDEX idx_archive_activated_by ON public.promotions_archive(activated_by)
WHERE activated_by IS NOT NULL;

-- Index composite pour métriques
CREATE INDEX idx_archive_metriques ON public.promotions_archive(revenu_genere DESC, nombre_commandes DESC)
WHERE status = 'completed';

-- =====================================================
-- FONCTIONS TRIGGER
-- =====================================================

-- Trigger pour mettre à jour automatiquement updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.promotions_archive;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.promotions_archive
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour auto-compléter les instances expirées
CREATE OR REPLACE FUNCTION auto_complete_expired_instances()
RETURNS void AS $$
BEGIN
    UPDATE public.promotions_archive
    SET
        status = 'completed',
        is_active = false,
        completed_at = NOW()
    WHERE
        status = 'active'
        AND date_fin < NOW()
        AND completed_at IS NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_complete_expired_instances() IS
'Marque automatiquement les instances expirées comme complétées.
À exécuter via un CRON job ou manuellement.
Usage: SELECT auto_complete_expired_instances();';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur la table
ALTER TABLE public.promotions_archive ENABLE ROW LEVEL SECURITY;

-- Politiques pour les utilisateurs AUTHENTIFIÉS
CREATE POLICY "Utilisateurs authentifiés peuvent lire les instances"
    ON public.promotions_archive
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent créer des instances"
    ON public.promotions_archive
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Utilisateurs authentifiés peuvent modifier les instances"
    ON public.promotions_archive
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Utilisateurs authentifiés peuvent supprimer les instances"
    ON public.promotions_archive
    FOR DELETE
    TO authenticated
    USING (true);

-- Politiques pour le rôle ANON (clé API anon)
CREATE POLICY "Anon peut lire les instances"
    ON public.promotions_archive
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Anon peut créer des instances"
    ON public.promotions_archive
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Anon peut modifier les instances"
    ON public.promotions_archive
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anon peut supprimer les instances"
    ON public.promotions_archive
    FOR DELETE
    TO anon
    USING (true);

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Obtenir les instances actives en ce moment
CREATE OR REPLACE FUNCTION get_active_instances_now()
RETURNS TABLE (
    id UUID,
    promotion_id UUID,
    denomination VARCHAR,
    code_promo VARCHAR,
    type_promotion TEXT,
    reduction_absolue DECIMAL,
    reduction_relative DECIMAL,
    date_debut TIMESTAMPTZ,
    date_fin TIMESTAMPTZ,
    temps_restant_secondes INTEGER,
    utilisation_count INTEGER,
    utilisation_max INTEGER,
    revenu_genere DECIMAL,
    nombre_commandes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.promotion_id,
        p.denomination,
        p.code_promo,
        p.type_promotion,
        p.reduction_absolue,
        p.reduction_relative,
        p.date_debut,
        p.date_fin,
        EXTRACT(EPOCH FROM (p.date_fin - NOW()))::INTEGER as temps_restant_secondes,
        p.utilisation_count,
        p.utilisation_max,
        p.revenu_genere,
        p.nombre_commandes
    FROM public.promotions_archive p
    WHERE p.is_active = true
      AND p.status = 'active'
      AND p.date_debut <= NOW()
      AND p.date_fin >= NOW()
    ORDER BY p.date_fin ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_instances_now() IS
'Récupère toutes les instances de promotions actuellement actives avec le temps restant en secondes.
Usage: SELECT * FROM get_active_instances_now();';

-- Obtenir les instances flash actives
CREATE OR REPLACE FUNCTION get_active_flash_instances()
RETURNS TABLE (
    id UUID,
    promotion_id UUID,
    denomination VARCHAR,
    code_promo VARCHAR,
    reduction_absolue DECIMAL,
    reduction_relative DECIMAL,
    date_fin TIMESTAMPTZ,
    temps_restant_secondes INTEGER,
    utilisation_count INTEGER,
    utilisation_max INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.promotion_id,
        p.denomination,
        p.code_promo,
        p.reduction_absolue,
        p.reduction_relative,
        p.date_fin,
        EXTRACT(EPOCH FROM (p.date_fin - NOW()))::INTEGER as temps_restant_secondes,
        p.utilisation_count,
        p.utilisation_max
    FROM public.promotions_archive p
    WHERE p.type_promotion = 'flash'
      AND p.is_active = true
      AND p.status = 'active'
      AND p.date_debut <= NOW()
      AND p.date_fin >= NOW()
    ORDER BY p.date_fin ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_flash_instances() IS
'Récupère toutes les instances flash actuellement actives.
Usage: SELECT * FROM get_active_flash_instances();';

-- Valider un code promo
CREATE OR REPLACE FUNCTION validate_code_promo_sql(
    p_code_promo VARCHAR,
    p_panier_montant DECIMAL DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    is_valid BOOLEAN,
    instance_id UUID,
    denomination VARCHAR,
    reduction_absolue DECIMAL,
    reduction_relative DECIMAL,
    message TEXT
) AS $$
DECLARE
    v_instance RECORD;
BEGIN
    -- Chercher l'instance
    SELECT * INTO v_instance
    FROM public.promotions_archive
    WHERE code_promo = p_code_promo
      AND is_active = true
      AND status = 'active'
      AND date_debut <= NOW()
      AND date_fin >= NOW()
    LIMIT 1;

    -- Code invalide ou instance non trouvée
    IF v_instance IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, 'Code promo invalide ou expiré'::TEXT;
        RETURN;
    END IF;

    -- Vérifier limite globale
    IF v_instance.utilisation_max IS NOT NULL AND v_instance.utilisation_count >= v_instance.utilisation_max THEN
        RETURN QUERY SELECT false, v_instance.id, v_instance.denomination, v_instance.reduction_absolue, v_instance.reduction_relative, 'Cette promotion a atteint sa limite d''utilisation'::TEXT;
        RETURN;
    END IF;

    -- Vérifier éligibilité panier minimum
    IF v_instance.eligibilite->>'type' = 'panier_minimum' THEN
        IF p_panier_montant IS NULL OR p_panier_montant < (v_instance.eligibilite->>'panier_minimum')::DECIMAL THEN
            RETURN QUERY SELECT false, v_instance.id, v_instance.denomination, v_instance.reduction_absolue, v_instance.reduction_relative,
                'Montant minimum non atteint: ' || (v_instance.eligibilite->>'panier_minimum') || ' FCFA requis'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Code valide
    RETURN QUERY SELECT true, v_instance.id, v_instance.denomination, v_instance.reduction_absolue, v_instance.reduction_relative, 'Code promo valide'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_code_promo_sql IS
'Valide un code promo et retourne les détails de l''instance.
Usage: SELECT * FROM validate_code_promo_sql(''FLASH123'', 5000.00, ''user-uuid'');';

-- Incrémenter le compteur d'utilisation
CREATE OR REPLACE FUNCTION increment_instance_usage(p_instance_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.promotions_archive
    SET utilisation_count = utilisation_count + 1
    WHERE id = p_instance_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_instance_usage IS
'Incrémente le compteur d''utilisation d''une instance.
Usage: SELECT increment_instance_usage(''instance-uuid'');';

-- Obtenir les statistiques des instances
CREATE OR REPLACE FUNCTION get_instances_stats()
RETURNS TABLE (
    total INTEGER,
    actives INTEGER,
    flash_actives INTEGER,
    par_statut_active INTEGER,
    par_statut_paused INTEGER,
    par_statut_completed INTEGER,
    par_statut_cancelled INTEGER,
    utilisation_totale BIGINT,
    revenu_total DECIMAL,
    commandes_totales BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total,
        COUNT(*) FILTER (WHERE is_active = true AND status = 'active' AND date_debut <= NOW() AND date_fin >= NOW())::INTEGER as actives,
        COUNT(*) FILTER (WHERE type_promotion = 'flash' AND is_active = true AND status = 'active' AND date_debut <= NOW() AND date_fin >= NOW())::INTEGER as flash_actives,
        COUNT(*) FILTER (WHERE status = 'active')::INTEGER as par_statut_active,
        COUNT(*) FILTER (WHERE status = 'paused')::INTEGER as par_statut_paused,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as par_statut_completed,
        COUNT(*) FILTER (WHERE status = 'cancelled')::INTEGER as par_statut_cancelled,
        COALESCE(SUM(utilisation_count), 0)::BIGINT as utilisation_totale,
        COALESCE(SUM(revenu_genere), 0)::DECIMAL as revenu_total,
        COALESCE(SUM(nombre_commandes), 0)::BIGINT as commandes_totales
    FROM public.promotions_archive;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_instances_stats() IS
'Retourne les statistiques globales des instances de promotions.
Usage: SELECT * FROM get_instances_stats();';

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE public.promotions_archive IS 'Table contenant les instances/activations de promotions avec historique et métriques (REALTIME activé)';

COMMENT ON COLUMN public.promotions_archive.id IS 'Identifiant unique de l''instance (UUID)';
COMMENT ON COLUMN public.promotions_archive.promotion_id IS 'Référence au template de promotion';
COMMENT ON COLUMN public.promotions_archive.denomination IS 'Nom de la promotion (snapshot du template)';
COMMENT ON COLUMN public.promotions_archive.description IS 'Description (snapshot du template)';
COMMENT ON COLUMN public.promotions_archive.code_promo IS 'Code promo unique généré pour cette instance';
COMMENT ON COLUMN public.promotions_archive.type_promotion IS 'Type: standard, flash, happy_hour, recurrente';
COMMENT ON COLUMN public.promotions_archive.reduction_absolue IS 'Réduction absolue en FCFA (snapshot)';
COMMENT ON COLUMN public.promotions_archive.reduction_relative IS 'Réduction relative en % (snapshot)';
COMMENT ON COLUMN public.promotions_archive.date_debut IS 'Date et heure de début effective de cette instance';
COMMENT ON COLUMN public.promotions_archive.date_fin IS 'Date et heure de fin effective de cette instance';
COMMENT ON COLUMN public.promotions_archive.duree_valeur IS 'Valeur de la durée (snapshot)';
COMMENT ON COLUMN public.promotions_archive.duree_unite IS 'Unité de temps (snapshot)';
COMMENT ON COLUMN public.promotions_archive.eligibilite IS 'Conditions d''éligibilité (snapshot)';
COMMENT ON COLUMN public.promotions_archive.utilisation_max IS 'Limite globale d''utilisation';
COMMENT ON COLUMN public.promotions_archive.utilisation_max_par_client IS 'Limite par client';
COMMENT ON COLUMN public.promotions_archive.utilisation_count IS 'Nombre réel d''utilisations de cette instance';
COMMENT ON COLUMN public.promotions_archive.status IS 'Statut: active, paused, completed, cancelled';
COMMENT ON COLUMN public.promotions_archive.is_active IS 'Instance active (true) ou désactivée (false)';
COMMENT ON COLUMN public.promotions_archive.revenu_genere IS 'Revenu total généré par cette instance';
COMMENT ON COLUMN public.promotions_archive.nombre_commandes IS 'Nombre de commandes utilisant cette instance';
COMMENT ON COLUMN public.promotions_archive.panier_moyen IS 'Panier moyen des commandes avec cette promotion';
COMMENT ON COLUMN public.promotions_archive.activated_by IS 'ID de l''utilisateur qui a activé cette instance';
COMMENT ON COLUMN public.promotions_archive.activated_at IS 'Date et heure d''activation de l''instance';
COMMENT ON COLUMN public.promotions_archive.completed_at IS 'Date et heure de complétion';
COMMENT ON COLUMN public.promotions_archive.cancelled_at IS 'Date et heure d''annulation';
COMMENT ON COLUMN public.promotions_archive.cancel_reason IS 'Raison de l''annulation';
COMMENT ON COLUMN public.promotions_archive.created_at IS 'Date de création de l''enregistrement';
COMMENT ON COLUMN public.promotions_archive.updated_at IS 'Date de dernière modification';

-- =====================================================
-- VÉRIFICATIONS
-- =====================================================

-- Vérifier que la table a été créée
SELECT
    table_name,
    table_type
FROM
    information_schema.tables
WHERE
    table_schema = 'public'
    AND table_name = 'promotions_archive';

-- Vérifier les colonnes
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'promotions_archive'
ORDER BY
    ordinal_position;

-- Vérifier les index
SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
    AND tablename = 'promotions_archive';

-- Vérifier les contraintes de clé étrangère
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'promotions_archive';

-- Vérifier les triggers
SELECT
    trigger_name,
    event_manipulation,
    action_timing
FROM
    information_schema.triggers
WHERE
    event_object_schema = 'public'
    AND event_object_table = 'promotions_archive';

-- Vérifier les politiques RLS
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM
    pg_policies
WHERE
    schemaname = 'public'
    AND tablename = 'promotions_archive';

-- Tester les fonctions utilitaires
SELECT * FROM get_instances_stats();
SELECT * FROM get_active_instances_now();
SELECT * FROM get_active_flash_instances();

-- =====================================================
-- ACTIVATION REALTIME
-- =====================================================

-- Activer Supabase Realtime pour cette table
-- IMPORTANT: Exécuter cette commande pour activer la synchronisation temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions_archive;

COMMENT ON TABLE public.promotions_archive IS
'Table contenant les instances/activations de promotions avec historique et métriques.
REALTIME ACTIVÉ: Les changements sont diffusés en temps réel à tous les clients connectés.
Les instances sont créées en activant des templates de la table promotions.';

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
