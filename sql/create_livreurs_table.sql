-- =====================================================
-- Script de création de la table LIVREURS
-- =====================================================
-- Description: Table pour gérer les livreurs
-- Auteur: Claude Code
-- Date: 2025-12-20
-- =====================================================

-- Supprimer la table si elle existe (à utiliser avec précaution en production)
DROP TABLE IF EXISTS public.livreurs CASCADE;

-- Créer la table livreurs
CREATE TABLE public.livreurs (
    -- Identifiant unique
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Informations du livreur
    denomination VARCHAR(100) NOT NULL,
    contact VARCHAR(50) NOT NULL,

    -- Statut
    is_active BOOLEAN DEFAULT true NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Contraintes
    CONSTRAINT livreurs_denomination_not_empty CHECK (LENGTH(TRIM(denomination)) > 0),
    CONSTRAINT livreurs_contact_not_empty CHECK (LENGTH(TRIM(contact)) > 0)
);

-- =====================================================
-- INDEX
-- =====================================================

-- Index sur la dénomination pour les recherches
CREATE INDEX idx_livreurs_denomination ON public.livreurs(denomination);

-- Index sur le contact pour les recherches
CREATE INDEX idx_livreurs_contact ON public.livreurs(contact);

-- Index sur is_active pour filtrer les livreurs actifs
CREATE INDEX idx_livreurs_is_active ON public.livreurs(is_active);

-- Index composite pour les recherches avec filtre actif
CREATE INDEX idx_livreurs_active_denomination ON public.livreurs(is_active, denomination);

-- Index sur created_at pour le tri chronologique
CREATE INDEX idx_livreurs_created_at ON public.livreurs(created_at DESC);

-- Index sur updated_at pour le tri par dernière modification
CREATE INDEX idx_livreurs_updated_at ON public.livreurs(updated_at DESC);

-- =====================================================
-- FONCTION DE MISE À JOUR DU TIMESTAMP
-- =====================================================

-- Créer ou remplacer la fonction de mise à jour automatique du timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER
-- =====================================================

-- Trigger pour mettre à jour automatiquement updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.livreurs;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.livreurs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur la table
ALTER TABLE public.livreurs ENABLE ROW LEVEL SECURITY;

-- Politique pour la lecture: tous les utilisateurs authentifiés peuvent lire
CREATE POLICY "Tous les utilisateurs peuvent lire les livreurs"
    ON public.livreurs
    FOR SELECT
    TO authenticated
    USING (true);

-- Politique pour l'insertion: tous les utilisateurs authentifiés peuvent créer
CREATE POLICY "Tous les utilisateurs peuvent créer des livreurs"
    ON public.livreurs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Politique pour la mise à jour: tous les utilisateurs authentifiés peuvent modifier
CREATE POLICY "Tous les utilisateurs peuvent modifier les livreurs"
    ON public.livreurs
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Politique pour la suppression: tous les utilisateurs authentifiés peuvent supprimer
-- (Note: en pratique, on utilisera plutôt la désactivation via is_active)
CREATE POLICY "Tous les utilisateurs peuvent supprimer les livreurs"
    ON public.livreurs
    FOR DELETE
    TO authenticated
    USING (true);

-- =====================================================
-- COMMENTAIRES
-- =====================================================

-- Commentaires sur la table et les colonnes
COMMENT ON TABLE public.livreurs IS 'Table contenant les informations des livreurs';

COMMENT ON COLUMN public.livreurs.id IS 'Identifiant unique du livreur (UUID)';
COMMENT ON COLUMN public.livreurs.denomination IS 'Nom ou raison sociale du livreur';
COMMENT ON COLUMN public.livreurs.contact IS 'Numéro de téléphone ou autre moyen de contact du livreur';
COMMENT ON COLUMN public.livreurs.is_active IS 'Indique si le livreur est actif (true) ou désactivé (false)';
COMMENT ON COLUMN public.livreurs.created_at IS 'Date et heure de création de l''enregistrement';
COMMENT ON COLUMN public.livreurs.updated_at IS 'Date et heure de la dernière modification';

-- =====================================================
-- DONNÉES D'EXEMPLE (optionnel - à supprimer en production)
-- =====================================================

-- Insérer quelques livreurs d'exemple
INSERT INTO public.livreurs (denomination, contact) VALUES
    ('Moto Express Douala', '+237 693 456 789'),
    ('Rapid Delivery Services', '+237 677 123 456'),
    ('City Bike Messengers', '+237 680 987 654'),
    ('Flash Transport', '+237 699 111 222'),
    ('Speedy Logistics', '+237 678 333 444');

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
    AND table_name = 'livreurs';

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
    AND table_name = 'livreurs'
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
    AND tablename = 'livreurs';

-- Vérifier les triggers
SELECT
    trigger_name,
    event_manipulation,
    action_timing
FROM
    information_schema.triggers
WHERE
    event_object_schema = 'public'
    AND event_object_table = 'livreurs';

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
    AND tablename = 'livreurs';

-- Compter les enregistrements
SELECT COUNT(*) as total_livreurs FROM public.livreurs;

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
