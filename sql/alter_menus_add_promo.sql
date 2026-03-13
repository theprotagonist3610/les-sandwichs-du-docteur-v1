-- ============================================================================
-- MIGRATION: Ajout des colonnes promo à la table MENUS
-- ============================================================================
-- Ajoute le support des menus promotionnels avec lien vers promotions_archive
-- ============================================================================

-- Colonne flag pour identifier les menus promo
ALTER TABLE menus ADD COLUMN IF NOT EXISTS is_promo BOOLEAN DEFAULT false NOT NULL;

-- Colonne FK vers l'instance de promotion active
ALTER TABLE menus ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions_archive(id) ON DELETE SET NULL;

-- Index partiel sur les menus promo (seuls les menus promo sont indexés)
CREATE INDEX IF NOT EXISTS idx_menus_is_promo ON menus(is_promo) WHERE is_promo = true;

-- Index sur promotion_id pour les jointures
CREATE INDEX IF NOT EXISTS idx_menus_promotion_id ON menus(promotion_id) WHERE promotion_id IS NOT NULL;

-- ============================================================================
-- VÉRIFICATIONS
-- ============================================================================

-- Vérifier que les colonnes ont été ajoutées
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'menus'
    AND column_name IN ('is_promo', 'promotion_id')
ORDER BY
    ordinal_position;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Migration menus promo terminée avec succès';
  RAISE NOTICE '   - Colonne is_promo (BOOLEAN DEFAULT false) ajoutée';
  RAISE NOTICE '   - Colonne promotion_id (UUID FK → promotions_archive) ajoutée';
  RAISE NOTICE '   - 2 index partiels créés';
END $$;
