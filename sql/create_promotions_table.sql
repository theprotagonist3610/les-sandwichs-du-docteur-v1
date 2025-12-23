-- =====================================================
-- Script de création de la table PROMOTIONS (Templates)
-- =====================================================
-- Description: Table pour stocker les templates/modèles de promotions réutilisables
-- Auteur: Claude Code
-- Date: 2025-12-24
-- =====================================================

-- Supprimer la table si elle existe (à utiliser avec précaution en production)
DROP TABLE IF EXISTS public.promotions CASCADE;

-- Créer la table promotions (templates)
CREATE TABLE public.promotions (
    -- Identifiant unique
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Informations du template
    denomination VARCHAR(100) NOT NULL,
    description TEXT,

    -- Type de promotion
    type_promotion TEXT DEFAULT 'standard' NOT NULL CHECK (type_promotion IN ('standard', 'flash', 'happy_hour', 'recurrente')),

    -- Réductions (au moins une des deux doit être > 0)
    reduction_absolue DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    reduction_relative DECIMAL(5, 2) DEFAULT 0 NOT NULL,

    -- Durée par défaut (template)
    duree_valeur INTEGER NOT NULL,
    duree_unite TEXT NOT NULL DEFAULT 'days' CHECK (duree_unite IN ('minutes', 'hours', 'days', 'weeks', 'months')),

    -- Éligibilité structurée (JSONB pour flexibilité)
    -- Format: {"type": "tous|produits|categories|panier_minimum", "produits": [], "categories": [], "panier_minimum": 0}
    eligibilite JSONB NOT NULL DEFAULT '{"type": "tous"}'::JSONB,

    -- Limitations par défaut
    utilisation_max INTEGER,
    utilisation_max_par_client INTEGER DEFAULT 1 NOT NULL,

    -- Métadonnées
    is_template BOOLEAN DEFAULT true NOT NULL,
    is_recurrente BOOLEAN DEFAULT false NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Contraintes
    CONSTRAINT promotions_denomination_not_empty CHECK (LENGTH(TRIM(denomination)) > 0),
    CONSTRAINT promotions_denomination_length CHECK (LENGTH(TRIM(denomination)) >= 3 AND LENGTH(TRIM(denomination)) <= 100),
    CONSTRAINT promotions_at_least_one_reduction CHECK (reduction_absolue > 0 OR reduction_relative > 0),
    CONSTRAINT promotions_reduction_absolue_positive CHECK (reduction_absolue >= 0),
    CONSTRAINT promotions_reduction_relative_range CHECK (reduction_relative >= 0 AND reduction_relative <= 100),
    CONSTRAINT promotions_duree_positive CHECK (duree_valeur > 0),
    CONSTRAINT promotions_utilisation_max_positive CHECK (utilisation_max IS NULL OR utilisation_max > 0),
    CONSTRAINT promotions_utilisation_max_par_client_positive CHECK (utilisation_max_par_client > 0)
);

-- =====================================================
-- INDEX
-- =====================================================

-- Index sur la dénomination pour les recherches
CREATE INDEX idx_promotions_denomination ON public.promotions(denomination);

-- Index sur le type de promotion
CREATE INDEX idx_promotions_type ON public.promotions(type_promotion);

-- Index sur les templates récurrents
CREATE INDEX idx_promotions_recurrente ON public.promotions(is_recurrente) WHERE is_recurrente = true;

-- Index GIN sur eligibilite JSONB pour recherches rapides
CREATE INDEX idx_promotions_eligibilite ON public.promotions USING GIN (eligibilite);

-- Index sur created_at pour le tri chronologique
CREATE INDEX idx_promotions_created_at ON public.promotions(created_at DESC);

-- Index sur updated_at pour le tri par dernière modification
CREATE INDEX idx_promotions_updated_at ON public.promotions(updated_at DESC);

-- Index sur created_by pour filtrer par créateur
CREATE INDEX idx_promotions_created_by ON public.promotions(created_by) WHERE created_by IS NOT NULL;

-- =====================================================
-- FONCTIONS TRIGGER
-- =====================================================

-- Réutiliser la fonction existante ou la créer si elle n'existe pas
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_updated_at_column() IS
'Met à jour automatiquement le champ updated_at à NOW() lors des UPDATE.
Fonction réutilisable pour toutes les tables nécessitant ce comportement.';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour mettre à jour automatiquement updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.promotions;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.promotions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur la table
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Politique pour la lecture: tous les utilisateurs authentifiés peuvent lire
CREATE POLICY "Tous les utilisateurs peuvent lire les templates"
    ON public.promotions
    FOR SELECT
    TO authenticated
    USING (true);

-- Politique pour l'insertion: tous les utilisateurs authentifiés peuvent créer
CREATE POLICY "Tous les utilisateurs peuvent créer des templates"
    ON public.promotions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Politique pour la mise à jour: tous les utilisateurs authentifiés peuvent modifier
CREATE POLICY "Tous les utilisateurs peuvent modifier les templates"
    ON public.promotions
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Politique pour la suppression: tous les utilisateurs authentifiés peuvent supprimer
CREATE POLICY "Tous les utilisateurs peuvent supprimer les templates"
    ON public.promotions
    FOR DELETE
    TO authenticated
    USING (true);

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Obtenir les statistiques des templates
CREATE OR REPLACE FUNCTION get_promotion_templates_stats()
RETURNS TABLE (
    total INTEGER,
    par_type_standard INTEGER,
    par_type_flash INTEGER,
    par_type_happy_hour INTEGER,
    par_type_recurrente INTEGER,
    recurrentes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total,
        COUNT(*) FILTER (WHERE type_promotion = 'standard')::INTEGER as par_type_standard,
        COUNT(*) FILTER (WHERE type_promotion = 'flash')::INTEGER as par_type_flash,
        COUNT(*) FILTER (WHERE type_promotion = 'happy_hour')::INTEGER as par_type_happy_hour,
        COUNT(*) FILTER (WHERE type_promotion = 'recurrente')::INTEGER as par_type_recurrente,
        COUNT(*) FILTER (WHERE is_recurrente = true)::INTEGER as recurrentes
    FROM public.promotions;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_promotion_templates_stats() IS
'Retourne les statistiques globales des templates de promotions.
Usage: SELECT * FROM get_promotion_templates_stats();';

-- =====================================================
-- COMMENTAIRES
-- =====================================================

-- Commentaires sur la table et les colonnes
COMMENT ON TABLE public.promotions IS 'Table contenant les templates/modèles de promotions réutilisables (pas de dates ni codes promo)';

COMMENT ON COLUMN public.promotions.id IS 'Identifiant unique du template (UUID)';
COMMENT ON COLUMN public.promotions.denomination IS 'Nom du template de promotion (3-100 caractères)';
COMMENT ON COLUMN public.promotions.description IS 'Description détaillée du template (optionnel)';
COMMENT ON COLUMN public.promotions.type_promotion IS 'Type: standard, flash, happy_hour, recurrente';
COMMENT ON COLUMN public.promotions.reduction_absolue IS 'Réduction en valeur absolue (montant fixe en FCFA)';
COMMENT ON COLUMN public.promotions.reduction_relative IS 'Réduction en pourcentage (0-100)';
COMMENT ON COLUMN public.promotions.duree_valeur IS 'Valeur de la durée par défaut (ex: 30 pour 30 minutes)';
COMMENT ON COLUMN public.promotions.duree_unite IS 'Unité de temps: minutes, hours, days, weeks, months';
COMMENT ON COLUMN public.promotions.eligibilite IS 'Conditions d''éligibilité en JSONB: {"type": "tous|produits|categories|panier_minimum", ...}';
COMMENT ON COLUMN public.promotions.utilisation_max IS 'Nombre maximum d''utilisations par défaut (NULL = illimité)';
COMMENT ON COLUMN public.promotions.utilisation_max_par_client IS 'Nombre maximum d''utilisations par client par défaut';
COMMENT ON COLUMN public.promotions.is_template IS 'Indique que c''est un template (toujours true)';
COMMENT ON COLUMN public.promotions.is_recurrente IS 'Indique si le template peut être réactivé plusieurs fois';
COMMENT ON COLUMN public.promotions.created_by IS 'ID de l''utilisateur qui a créé ce template';
COMMENT ON COLUMN public.promotions.created_at IS 'Date et heure de création du template';
COMMENT ON COLUMN public.promotions.updated_at IS 'Date et heure de la dernière modification du template';

-- =====================================================
-- DONNÉES D'EXEMPLE (optionnel - à supprimer en production)
-- =====================================================

-- Insérer quelques templates d'exemple
INSERT INTO public.promotions (denomination, description, type_promotion, reduction_absolue, reduction_relative, duree_valeur, duree_unite, eligibilite, utilisation_max, is_recurrente) VALUES
    -- Template Flash Déjeuner (réutilisable quotidiennement)
    (
        'Flash Déjeuner',
        'Profitez de 25% de réduction pendant 30 minutes seulement !',
        'flash',
        0,
        25,
        30,
        'minutes',
        '{"type": "tous"}'::JSONB,
        100,
        true
    ),
    -- Template Happy Hour (réutilisable)
    (
        'Happy Hour Midi',
        'Réduction de 1000 FCFA sur tous les menus du midi',
        'happy_hour',
        1000,
        0,
        2,
        'hours',
        '{"type": "categories", "categories": ["menus", "sandwichs"]}'::JSONB,
        NULL,
        true
    ),
    -- Template Promotion de Noël (non récurrent)
    (
        'Promotion de Noël',
        'Célébrez les fêtes avec 20% de réduction',
        'standard',
        0,
        20,
        30,
        'days',
        '{"type": "tous"}'::JSONB,
        500,
        false
    ),
    -- Template Fidélité (récurrent)
    (
        'Fidélité Plus',
        'Commandez pour minimum 5000 FCFA et recevez 1500 FCFA de réduction',
        'standard',
        1500,
        0,
        90,
        'days',
        '{"type": "panier_minimum", "panier_minimum": 5000}'::JSONB,
        NULL,
        true
    ),
    -- Template Étudiant (récurrent longue durée)
    (
        'Étudiant',
        'Réduction permanente de 10% pour les étudiants sur les sandwichs sains',
        'recurrente',
        0,
        10,
        12,
        'months',
        '{"type": "categories", "categories": ["sandwichs-sains"]}'::JSONB,
        NULL,
        true
    );

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
    AND table_name = 'promotions';

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
    AND table_name = 'promotions'
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
    AND tablename = 'promotions';

-- Vérifier les triggers
SELECT
    trigger_name,
    event_manipulation,
    action_timing
FROM
    information_schema.triggers
WHERE
    event_object_schema = 'public'
    AND event_object_table = 'promotions';

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
    AND tablename = 'promotions';

-- Compter les enregistrements
SELECT COUNT(*) as total_templates FROM public.promotions;

-- Afficher les templates
SELECT
    id,
    denomination,
    type_promotion,
    reduction_absolue,
    reduction_relative,
    duree_valeur || ' ' || duree_unite as duree,
    eligibilite,
    utilisation_max,
    is_recurrente
FROM public.promotions
ORDER BY created_at DESC;

-- Tester la fonction utilitaire
SELECT * FROM get_promotion_templates_stats();

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
