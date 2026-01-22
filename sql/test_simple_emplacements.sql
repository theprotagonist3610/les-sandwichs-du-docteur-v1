-- ============================================================================
-- TEST SIMPLE - Lecture directe de la table emplacements
-- ============================================================================

-- Test 1: Lecture directe (comme super user / service role)
SELECT * FROM emplacements LIMIT 5;

-- Test 2: Vérifier si des données existent
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN statut = 'actif' THEN 1 END) as actifs,
  COUNT(CASE WHEN statut = 'inactif' THEN 1 END) as inactifs
FROM emplacements;

-- Test 3: Vérifier la structure des adresses
SELECT
  id,
  nom,
  type,
  statut,
  adresse,
  adresse->'localisation' as localisation,
  adresse->'localisation'->>'lat' as latitude,
  adresse->'localisation'->>'lng' as longitude
FROM emplacements
LIMIT 5;
