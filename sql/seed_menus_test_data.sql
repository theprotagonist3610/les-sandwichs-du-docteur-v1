-- ============================================================================
-- DONNÉES DE TEST - MENUS
-- ============================================================================
-- Génère des menus de test pour la sandwicherie
-- Inclut: Sandwichs, Boissons, Desserts, Menus Complets
-- ============================================================================

-- Insertion des menus de test
DO $$
BEGIN
  RAISE NOTICE '🚀 Génération des données de test pour les menus...';

  -- ============================================================================
  -- 1. SANDWICHS
  -- ============================================================================

  INSERT INTO menus (nom, type, description, ingredients, indice_calorique, prix, statut) VALUES
  (
    'Sandwich Poulet Grillé',
    'sandwich',
    'Sandwich savoureux au poulet grillé avec salade fraîche, tomates et sauce maison',
    ARRAY['Pain complet', 'Poulet grillé', 'Salade verte', 'Tomates', 'Oignons', 'Sauce maison'],
    '{"joule": 1674, "calorie": 400}'::jsonb,
    1500,
    'disponible'
  ),
  (
    'Sandwich Thon Mayo',
    'sandwich',
    'Sandwich au thon avec mayonnaise légère, laitue croquante et cornichons',
    ARRAY['Pain blanc', 'Thon', 'Mayonnaise', 'Laitue', 'Cornichons', 'Carottes râpées'],
    '{"joule": 1883, "calorie": 450}'::jsonb,
    1800,
    'disponible'
  ),
  (
    'Sandwich Omelette',
    'sandwich',
    'Sandwich à l''omelette nature ou aux légumes, simple et nutritif',
    ARRAY['Pain de mie', 'Oeufs', 'Poivrons', 'Oignons', 'Fromage', 'Épices'],
    '{"joule": 1256, "calorie": 300}'::jsonb,
    1200,
    'disponible'
  ),
  (
    'Sandwich Végétarien',
    'sandwich',
    'Sandwich 100% végétal avec avocat, légumes grillés et houmous',
    ARRAY['Pain aux céréales', 'Avocat', 'Courgettes grillées', 'Aubergines', 'Houmous', 'Roquette'],
    '{"joule": 1465, "calorie": 350}'::jsonb,
    1300,
    'disponible'
  ),
  (
    'Sandwich Jambon Fromage',
    'sandwich',
    'Classique jambon-beurre revisité avec fromage fondant',
    ARRAY['Baguette', 'Jambon de qualité', 'Fromage', 'Beurre', 'Salade', 'Tomates'],
    '{"joule": 1674, "calorie": 400}'::jsonb,
    1400,
    'disponible'
  ),
  (
    'Sandwich Saumon Fumé',
    'sandwich',
    'Sandwich raffiné au saumon fumé avec cream cheese et aneth',
    ARRAY['Pain complet', 'Saumon fumé', 'Cream cheese', 'Aneth', 'Concombre', 'Citron'],
    '{"joule": 1465, "calorie": 350}'::jsonb,
    2200,
    'disponible'
  );

  -- ============================================================================
  -- 2. BOISSONS
  -- ============================================================================

  INSERT INTO menus (nom, type, description, ingredients, indice_calorique, prix, statut) VALUES
  (
    'Jus d''Ananas Frais',
    'boisson',
    'Jus d''ananas 100% naturel, pressé à froid',
    ARRAY['Ananas frais'],
    '{"joule": 418, "calorie": 100}'::jsonb,
    500,
    'disponible'
  ),
  (
    'Jus d''Orange Frais',
    'boisson',
    'Jus d''orange fraîchement pressé, riche en vitamine C',
    ARRAY['Oranges fraîches'],
    '{"joule": 460, "calorie": 110}'::jsonb,
    500,
    'disponible'
  ),
  (
    'Bissap (Hibiscus)',
    'boisson',
    'Boisson traditionnelle à l''hibiscus, légèrement sucrée',
    ARRAY['Fleurs d''hibiscus', 'Sucre', 'Eau', 'Menthe'],
    '{"joule": 335, "calorie": 80}'::jsonb,
    600,
    'disponible'
  ),
  (
    'Eau Minérale',
    'boisson',
    'Eau minérale plate en bouteille (50cl)',
    ARRAY['Eau minérale'],
    '{"joule": 0, "calorie": 0}'::jsonb,
    300,
    'disponible'
  ),
  (
    'Café Expresso',
    'boisson',
    'Café expresso corsé, grains 100% arabica',
    ARRAY['Grains de café arabica', 'Eau'],
    '{"joule": 8, "calorie": 2}'::jsonb,
    400,
    'disponible'
  ),
  (
    'Thé Vert',
    'boisson',
    'Thé vert bio, infusé à la perfection',
    ARRAY['Feuilles de thé vert', 'Eau chaude'],
    '{"joule": 4, "calorie": 1}'::jsonb,
    300,
    'disponible'
  ),
  (
    'Smoothie Mangue',
    'boisson',
    'Smoothie onctueux à la mangue fraîche et yaourt',
    ARRAY['Mangue fraîche', 'Yaourt nature', 'Miel', 'Glace'],
    '{"joule": 669, "calorie": 160}'::jsonb,
    800,
    'disponible'
  ),
  (
    'Smoothie Banane',
    'boisson',
    'Smoothie énergétique banane-avoine',
    ARRAY['Bananes', 'Lait', 'Avoine', 'Miel', 'Cannelle'],
    '{"joule": 753, "calorie": 180}'::jsonb,
    800,
    'disponible'
  ),
  (
    'Chocolat Chaud',
    'boisson',
    'Chocolat chaud onctueux au cacao pur',
    ARRAY['Lait entier', 'Cacao pur', 'Sucre', 'Vanille'],
    '{"joule": 837, "calorie": 200}'::jsonb,
    700,
    'disponible'
  );

  -- ============================================================================
  -- 3. DESSERTS
  -- ============================================================================

  INSERT INTO menus (nom, type, description, ingredients, indice_calorique, prix, statut) VALUES
  (
    'Salade de Fruits Frais',
    'dessert',
    'Mélange de fruits frais de saison',
    ARRAY['Ananas', 'Mangue', 'Papaye', 'Banane', 'Orange', 'Citron'],
    '{"joule": 502, "calorie": 120}'::jsonb,
    1000,
    'disponible'
  ),
  (
    'Yaourt Nature Bio',
    'dessert',
    'Yaourt nature bio avec option miel ou confiture',
    ARRAY['Lait bio fermenté', 'Ferments lactiques'],
    '{"joule": 251, "calorie": 60}'::jsonb,
    600,
    'disponible'
  ),
  (
    'Muffin aux Pépites de Chocolat',
    'dessert',
    'Muffin moelleux fait maison aux pépites de chocolat',
    ARRAY['Farine', 'Oeufs', 'Sucre', 'Beurre', 'Pépites de chocolat', 'Levure'],
    '{"joule": 1423, "calorie": 340}'::jsonb,
    800,
    'disponible'
  ),
  (
    'Cookies Maison',
    'dessert',
    'Cookies croustillants aux pépites de chocolat (2 pièces)',
    ARRAY['Farine', 'Beurre', 'Sucre roux', 'Chocolat noir', 'Vanille'],
    '{"joule": 1256, "calorie": 300}'::jsonb,
    700,
    'disponible'
  ),
  (
    'Brownie au Chocolat',
    'dessert',
    'Brownie fondant au chocolat noir intense',
    ARRAY['Chocolat noir', 'Beurre', 'Oeufs', 'Sucre', 'Farine', 'Noix'],
    '{"joule": 1590, "calorie": 380}'::jsonb,
    900,
    'disponible'
  ),
  (
    'Tarte aux Fruits',
    'dessert',
    'Part de tarte aux fruits frais du jour',
    ARRAY['Pâte sablée', 'Fruits frais', 'Crème pâtissière', 'Nappage'],
    '{"joule": 1172, "calorie": 280}'::jsonb,
    1100,
    'disponible'
  );

  -- ============================================================================
  -- 4. MENUS COMPLETS
  -- ============================================================================

  INSERT INTO menus (nom, type, description, ingredients, indice_calorique, prix, statut) VALUES
  (
    'Menu Équilibré',
    'menu complet',
    'Sandwich au choix + Boisson + Salade de fruits',
    ARRAY['1 Sandwich au choix', '1 Boisson au choix', 'Salade de fruits frais'],
    '{"joule": 2511, "calorie": 600}'::jsonb,
    2800,
    'disponible'
  ),
  (
    'Menu Express',
    'menu complet',
    'Sandwich Poulet + Eau minérale',
    ARRAY['Sandwich Poulet Grillé', 'Eau minérale 50cl'],
    '{"joule": 1674, "calorie": 400}'::jsonb,
    1700,
    'disponible'
  ),
  (
    'Menu Gourmand',
    'menu complet',
    'Sandwich au choix + Smoothie + Dessert au choix',
    ARRAY['1 Sandwich au choix', '1 Smoothie au choix', '1 Dessert au choix'],
    '{"joule": 3347, "calorie": 800}'::jsonb,
    3500,
    'disponible'
  ),
  (
    'Menu Végétarien',
    'menu complet',
    'Sandwich Végétarien + Jus frais + Yaourt bio',
    ARRAY['Sandwich Végétarien', 'Jus orange frais', 'Yaourt nature bio'],
    '{"joule": 2176, "calorie": 520}'::jsonb,
    2500,
    'disponible'
  ),
  (
    'Menu Petit-Déjeuner',
    'menu complet',
    'Omelette + Pain + Café + Fruit',
    ARRAY['Omelette nature', 'Pain complet', 'Café expresso', 'Fruit frais'],
    '{"joule": 1590, "calorie": 380}'::jsonb,
    1800,
    'disponible'
  ),
  (
    'Menu Premium',
    'menu complet',
    'Sandwich Saumon + Smoothie Mangue + Brownie + Café',
    ARRAY['Sandwich Saumon Fumé', 'Smoothie Mangue', 'Brownie au Chocolat', 'Café expresso'],
    '{"joule": 3682, "calorie": 880}'::jsonb,
    4200,
    'disponible'
  );

  -- ============================================================================
  -- 5. QUELQUES MENUS INDISPONIBLES (POUR TESTER LE FILTRAGE)
  -- ============================================================================

  INSERT INTO menus (nom, type, description, ingredients, indice_calorique, prix, statut) VALUES
  (
    'Sandwich Spécial Été',
    'sandwich',
    'Édition limitée - Disponible en été uniquement',
    ARRAY['Pain ciabatta', 'Poulet mariné', 'Mangue', 'Roquette', 'Sauce spéciale'],
    '{"joule": 1590, "calorie": 380}'::jsonb,
    1900,
    'indisponible'
  ),
  (
    'Jus de Fruit de la Passion',
    'boisson',
    'En rupture de stock temporairement',
    ARRAY['Fruits de la passion'],
    '{"joule": 418, "calorie": 100}'::jsonb,
    650,
    'indisponible'
  ),
  (
    'Menu Spécial Fêtes',
    'menu complet',
    'Menu des fêtes de fin d''année',
    ARRAY['Sandwich festif', 'Boisson champagne sans alcool', 'Dessert de fête'],
    '{"joule": 3347, "calorie": 800}'::jsonb,
    5000,
    'indisponible'
  );

  RAISE NOTICE '✅ Données de test générées avec succès!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistiques:';
  RAISE NOTICE '   - %  Sandwichs', (SELECT COUNT(*) FROM menus WHERE type = 'sandwich');
  RAISE NOTICE '   - % Boissons', (SELECT COUNT(*) FROM menus WHERE type = 'boisson');
  RAISE NOTICE '   - % Desserts', (SELECT COUNT(*) FROM menus WHERE type = 'dessert');
  RAISE NOTICE '   - % Menus Complets', (SELECT COUNT(*) FROM menus WHERE type = 'menu complet');
  RAISE NOTICE '   - % Disponibles', (SELECT COUNT(*) FROM menus WHERE statut = 'disponible');
  RAISE NOTICE '   - % Indisponibles', (SELECT COUNT(*) FROM menus WHERE statut = 'indisponible');
  RAISE NOTICE '   - Total: % menus', (SELECT COUNT(*) FROM menus);

END $$;

-- ============================================================================
-- VÉRIFICATIONS
-- ============================================================================

-- Afficher tous les menus par type
SELECT
  type,
  COUNT(*) as nombre,
  ROUND(AVG(prix)) as prix_moyen,
  COUNT(*) FILTER (WHERE statut = 'disponible') as disponibles
FROM menus
GROUP BY type
ORDER BY type;

-- Afficher les 5 menus les plus chers
SELECT
  nom,
  type,
  prix,
  statut
FROM menus
ORDER BY prix DESC
LIMIT 5;

-- Afficher les menus par statut
SELECT
  statut,
  COUNT(*) as nombre
FROM menus
GROUP BY statut;
