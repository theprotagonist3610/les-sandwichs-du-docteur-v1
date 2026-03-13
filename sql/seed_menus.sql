-- ============================================================================
-- Peuplement de la table menus
-- ============================================================================
-- Insère les menus de la carte Les Sandwichs du Docteur
-- Exécuter dans le SQL Editor de Supabase
-- ============================================================================

-- Créer un index unique sur le nom si inexistant (pour éviter les doublons)
CREATE UNIQUE INDEX IF NOT EXISTS idx_menus_nom_unique ON menus (nom);

INSERT INTO menus (nom, type, description, ingredients, indice_calorique, prix, statut)
VALUES
  -- ==================== SANDWICHS ====================
  (
    'Sandwich viande simple',
    'sandwich',
    'Sandwich garni de viande grillée sur pain classique, simple et savoureux',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    500,
    'indisponible'
  ),
  (
    'Sandwich poisson simple',
    'sandwich',
    'Sandwich au poisson frais assaisonné sur pain classique, léger et nutritif',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    500,
    'indisponible'
  ),
  (
    'Sandwich viande viennois',
    'sandwich',
    'Sandwich de viande grillée servi sur pain viennois moelleux et doré',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    700,
    'disponible'
  ),
  (
    'Sandwich poisson viennois',
    'sandwich',
    'Sandwich au poisson frais servi sur pain viennois fondant et parfumé',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    700,
    'disponible'
  ),
  (
    'Box poisson',
    'sandwich',
    'Box généreuse de poisson grillé accompagnée de crudités fraîches',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    2000,
    'disponible'
  ),
  (
    'Box viande',
    'sandwich',
    'Box copieuse de viande grillée accompagnée de crudités fraîches',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    2000,
    'disponible'
  ),
  (
    'Box mixte',
    'sandwich',
    'Box variée alliant viande et poisson grillés avec crudités fraîches',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    2000,
    'disponible'
  ),
  (
    'Sandwich personnalisé',
    'sandwich',
    'Sandwich sur mesure composé selon les préférences du client',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    0,
    'disponible'
  ),

  -- ==================== BOISSONS ====================
  (
    'Yaourt 350ml',
    'boisson',
    'Yaourt frais artisanal en format 350ml, onctueux et rafraîchissant',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    800,
    'disponible'
  ),
  (
    'Yaourt 500ml',
    'boisson',
    'Yaourt frais artisanal en format 500ml, idéal pour se désaltérer',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    1000,
    'indisponible'
  ),
  (
    'Yaourt 1L',
    'boisson',
    'Yaourt frais artisanal en grand format 1L, parfait pour partager',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    1500,
    'indisponible'
  ),
  (
    'Dègue 350ml',
    'boisson',
    'Dègue traditionnel en format 350ml, boisson lactée aux céréales',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    850,
    'indisponible'
  ),
  (
    'Dègue 500ml',
    'boisson',
    'Dègue traditionnel en format 500ml, boisson lactée onctueuse aux céréales',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    1200,
    'disponible'
  ),
  (
    'Dègue 1L',
    'boisson',
    'Dègue traditionnel en grand format 1L, boisson lactée généreuse aux céréales',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    1600,
    'indisponible'
  ),

  -- ==================== MENUS COMPLETS ====================
  (
    'Menu etudiant',
    'menu complet',
    'Formule économique pour étudiants avec sandwich et boisson au choix',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    1000,
    'indisponible'
  ),
  (
    'Menu simple',
    'menu complet',
    'Formule complète avec sandwich au choix, boisson et accompagnement',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    1500,
    'disponible'
  ),
  (
    'Menu Mixte',
    'menu complet',
    'Formule premium avec sandwich mixte viande-poisson, boisson et accompagnement',
    '{}',
    '{"joule": 0.0, "calorie": 0.0}',
    1700,
    'disponible'
  )

ON CONFLICT (nom) DO UPDATE SET
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  prix = EXCLUDED.prix,
  statut = EXCLUDED.statut;
