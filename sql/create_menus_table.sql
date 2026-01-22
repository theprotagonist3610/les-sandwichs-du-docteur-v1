-- ============================================================================
-- TABLE MENUS - GESTION DES PRODUITS (SANDWICHS, BOISSONS, DESSERTS, MENUS)
-- ============================================================================
-- Crée la table pour gérer les menus de la sandwicherie
-- Inclut: types ENUM, triggers, indexes, et auto-update timestamp
-- ============================================================================

-- ============================================================================
-- 1. TYPES ENUM
-- ============================================================================

-- Type de menu
DO $$ BEGIN
  CREATE TYPE type_menu AS ENUM ('boisson', 'sandwich', 'dessert', 'menu complet');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Statut du menu
DO $$ BEGIN
  CREATE TYPE statut_menu AS ENUM ('disponible', 'indisponible');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. TABLE PRINCIPALE
-- ============================================================================

CREATE TABLE IF NOT EXISTS menus (
  -- Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informations de base
  nom TEXT NOT NULL,
  type type_menu NOT NULL,
  description TEXT NOT NULL,

  -- Ingrédients (tableau de texte)
  ingredients TEXT[] DEFAULT '{}',

  -- Informations nutritionnelles
  indice_calorique JSONB DEFAULT '{"joule": 0.0, "calorie": 0.0}'::jsonb,
  -- Format: {"joule": float, "calorie": float}

  -- Prix et disponibilité
  prix NUMERIC(10, 2) DEFAULT 0.0 CHECK (prix >= 0),
  statut statut_menu DEFAULT 'indisponible',

  -- Image
  image_url TEXT,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT nom_non_vide CHECK (char_length(nom) > 0),
  CONSTRAINT description_non_vide CHECK (char_length(description) > 0)
);

-- ============================================================================
-- 3. INDEXES POUR OPTIMISATION
-- ============================================================================

-- Index sur le type pour filtrage rapide
CREATE INDEX IF NOT EXISTS idx_menus_type ON menus(type);

-- Index sur le statut pour filtrage rapide
CREATE INDEX IF NOT EXISTS idx_menus_statut ON menus(statut);

-- Index composite type + statut (requête fréquente)
CREATE INDEX IF NOT EXISTS idx_menus_type_statut ON menus(type, statut);

-- Index sur le nom pour recherche
CREATE INDEX IF NOT EXISTS idx_menus_nom ON menus USING gin(to_tsvector('french', nom));

-- Index GIN sur les ingrédients pour recherche full-text
CREATE INDEX IF NOT EXISTS idx_menus_ingredients ON menus USING gin(ingredients);

-- Index sur created_at pour tri chronologique
CREATE INDEX IF NOT EXISTS idx_menus_created_at ON menus(created_at DESC);

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- Fonction pour mettre à jour le timestamp automatiquement
CREATE OR REPLACE FUNCTION update_menus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour auto-update de updated_at
DROP TRIGGER IF EXISTS trigger_update_menus_updated_at ON menus;
CREATE TRIGGER trigger_update_menus_updated_at
  BEFORE UPDATE ON menus
  FOR EACH ROW
  EXECUTE FUNCTION update_menus_updated_at();

-- Fonction pour gérer le statut automatique selon le prix
CREATE OR REPLACE FUNCTION auto_update_menu_statut()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le prix est 0, forcer le statut à 'indisponible'
  IF NEW.prix = 0 THEN
    NEW.statut = 'indisponible';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour gérer le statut automatique
DROP TRIGGER IF EXISTS trigger_auto_update_menu_statut ON menus;
CREATE TRIGGER trigger_auto_update_menu_statut
  BEFORE INSERT OR UPDATE ON menus
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_menu_statut();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS sur la table
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Table menus créée avec succès';
  RAISE NOTICE '   - Types ENUM: type_menu, statut_menu';
  RAISE NOTICE '   - 6 indexes créés pour optimisation';
  RAISE NOTICE '   - 2 triggers activés (updated_at, auto_statut)';
  RAISE NOTICE '   - RLS activé (à configurer avec les politiques)';
  RAISE NOTICE '';
  RAISE NOTICE '⏭️  Prochaine étape: Exécuter create_menus_rls_policies.sql';
END $$;
