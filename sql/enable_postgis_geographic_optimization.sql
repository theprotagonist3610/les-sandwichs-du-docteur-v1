-- ============================================================================
-- INSTALLATION POSTGIS ET OPTIMISATION GÉOGRAPHIQUE
-- ============================================================================
-- Active l'extension PostGIS pour des requêtes géographiques performantes
-- Crée des colonnes et index géographiques pour la table commandes
-- ============================================================================

-- Activer l'extension PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Extension PostGIS activée';
END $$;

-- Ajouter une colonne de type GEOGRAPHY pour la localisation
-- Cela remplace le calcul Haversine côté client par des calculs PostGIS optimisés
ALTER TABLE commandes
ADD COLUMN IF NOT EXISTS geo_location GEOGRAPHY(POINT, 4326);

-- Créer une fonction pour extraire et mettre à jour la géolocalisation depuis le JSONB
CREATE OR REPLACE FUNCTION update_commande_geo_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Extraire les coordonnées du champ lieu_livraison JSONB
  IF NEW.lieu_livraison IS NOT NULL AND
     NEW.lieu_livraison->'localisation' IS NOT NULL AND
     NEW.lieu_livraison->'localisation'->>'lat' IS NOT NULL AND
     NEW.lieu_livraison->'localisation'->>'lng' IS NOT NULL
  THEN
    NEW.geo_location := ST_SetSRID(
      ST_MakePoint(
        (NEW.lieu_livraison->'localisation'->>'lng')::DOUBLE PRECISION,
        (NEW.lieu_livraison->'localisation'->>'lat')::DOUBLE PRECISION
      ),
      4326
    )::GEOGRAPHY;
  ELSE
    NEW.geo_location := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour mettre à jour automatiquement geo_location
DROP TRIGGER IF EXISTS trigger_update_geo_location ON commandes;
CREATE TRIGGER trigger_update_geo_location
  BEFORE INSERT OR UPDATE OF lieu_livraison ON commandes
  FOR EACH ROW
  EXECUTE FUNCTION update_commande_geo_location();

-- Mettre à jour les geo_location pour les commandes existantes
UPDATE commandes
SET geo_location = ST_SetSRID(
  ST_MakePoint(
    (lieu_livraison->'localisation'->>'lng')::DOUBLE PRECISION,
    (lieu_livraison->'localisation'->>'lat')::DOUBLE PRECISION
  ),
  4326
)::GEOGRAPHY
WHERE lieu_livraison IS NOT NULL
  AND lieu_livraison->'localisation' IS NOT NULL
  AND lieu_livraison->'localisation'->>'lat' IS NOT NULL
  AND lieu_livraison->'localisation'->>'lng' IS NOT NULL;

-- Créer un index spatial GIST pour des recherches géographiques ultra-rapides
CREATE INDEX IF NOT EXISTS idx_commandes_geo_location ON commandes USING GIST(geo_location);

-- Fonction optimisée pour récupérer les commandes dans un rayon (PostGIS)
CREATE OR REPLACE FUNCTION get_commandes_within_radius(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  type type_commande,
  client TEXT,
  contact_client TEXT,
  lieu_livraison JSONB,
  statut_commande statut_commande,
  statut_livraison statut_livraison,
  distance_km DOUBLE PRECISION,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.type,
    c.client,
    c.contact_client,
    c.lieu_livraison,
    c.statut_commande,
    c.statut_livraison,
    ST_Distance(
      c.geo_location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::GEOGRAPHY
    ) / 1000.0 AS distance_km, -- Convertir mètres en kilomètres
    c.created_at
  FROM commandes c
  WHERE c.geo_location IS NOT NULL
  AND ST_DWithin(
    c.geo_location,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::GEOGRAPHY,
    p_radius_km * 1000 -- Convertir km en mètres
  )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_commandes_within_radius(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) IS 'Récupère les commandes dans un rayon donné (en km) avec PostGIS (optimisé)';

-- Fonction pour trouver les N commandes les plus proches d'un point
CREATE OR REPLACE FUNCTION get_nearest_commandes(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  client TEXT,
  contact_client TEXT,
  lieu_livraison JSONB,
  statut_livraison statut_livraison,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.client,
    c.contact_client,
    c.lieu_livraison,
    c.statut_livraison,
    ST_Distance(
      c.geo_location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::GEOGRAPHY
    ) / 1000.0 AS distance_km
  FROM commandes c
  WHERE c.geo_location IS NOT NULL
  ORDER BY c.geo_location <-> ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::GEOGRAPHY
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_nearest_commandes(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) IS 'Récupère les N commandes les plus proches d''un point';

-- Fonction pour calculer la distance entre deux commandes
CREATE OR REPLACE FUNCTION get_distance_between_commandes(
  p_commande_id_1 UUID,
  p_commande_id_2 UUID
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  v_distance_km DOUBLE PRECISION;
BEGIN
  SELECT
    ST_Distance(c1.geo_location, c2.geo_location) / 1000.0
  INTO v_distance_km
  FROM commandes c1, commandes c2
  WHERE c1.id = p_commande_id_1
  AND c2.id = p_commande_id_2
  AND c1.geo_location IS NOT NULL
  AND c2.geo_location IS NOT NULL;

  RETURN v_distance_km;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_distance_between_commandes(UUID, UUID) IS 'Calcule la distance (en km) entre deux commandes';

-- Fonction pour optimiser les tournées de livraison (clustering géographique)
CREATE OR REPLACE FUNCTION get_delivery_clusters(
  p_date DATE,
  p_cluster_radius_km DOUBLE PRECISION DEFAULT 2.0
)
RETURNS TABLE (
  cluster_id INTEGER,
  commande_ids UUID[],
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  commande_count INTEGER
) AS $$
BEGIN
  -- Note: Implémentation simplifiée utilisant ST_ClusterDBSCAN
  -- Pour une vraie optimisation de tournées, utiliser pgRouting
  RETURN QUERY
  WITH clustered_commandes AS (
    SELECT
      c.id,
      c.geo_location,
      ST_ClusterDBSCAN(
        c.geo_location,
        eps := p_cluster_radius_km * 1000, -- Rayon du cluster en mètres
        minpoints := 2 -- Minimum 2 commandes par cluster
      ) OVER () AS cluster_num
    FROM commandes c
    WHERE c.date_livraison = p_date
      AND c.statut_livraison IN ('en_attente', 'en_cours')
      AND c.geo_location IS NOT NULL
  )
  SELECT
    cc.cluster_num::INTEGER AS cluster_id,
    array_agg(cc.id) AS commande_ids,
    ST_Y(ST_Centroid(ST_Collect(cc.geo_location::GEOMETRY)))::DOUBLE PRECISION AS center_lat,
    ST_X(ST_Centroid(ST_Collect(cc.geo_location::GEOMETRY)))::DOUBLE PRECISION AS center_lng,
    COUNT(*)::INTEGER AS commande_count
  FROM clustered_commandes cc
  WHERE cc.cluster_num IS NOT NULL
  GROUP BY cc.cluster_num
  ORDER BY commande_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_delivery_clusters(DATE, DOUBLE PRECISION) IS 'Regroupe les livraisons par clusters géographiques pour optimiser les tournées';

-- Fonction pour calculer la zone de couverture (convex hull) des livraisons d'un jour
CREATE OR REPLACE FUNCTION get_delivery_coverage_area(p_date DATE)
RETURNS JSONB AS $$
DECLARE
  v_coverage_geojson JSONB;
BEGIN
  SELECT
    ST_AsGeoJSON(ST_ConvexHull(ST_Collect(geo_location::GEOMETRY)))::JSONB
  INTO v_coverage_geojson
  FROM commandes
  WHERE date_livraison = p_date
    AND geo_location IS NOT NULL;

  RETURN v_coverage_geojson;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_delivery_coverage_area(DATE) IS 'Calcule la zone de couverture géographique des livraisons pour une date donnée (GeoJSON)';

-- Fonction pour obtenir des statistiques géographiques
CREATE OR REPLACE FUNCTION get_geographic_stats(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_commandes', COUNT(*),
    'commandes_avec_location', COUNT(*) FILTER (WHERE geo_location IS NOT NULL),
    'distance_moyenne_km', AVG(
      ST_Distance(
        geo_location,
        (SELECT geo_location FROM commandes WHERE geo_location IS NOT NULL ORDER BY created_at DESC LIMIT 1)
      )
    ) / 1000.0,
    'perimetre_couverture_km2', ST_Area(ST_ConvexHull(ST_Collect(geo_location::GEOMETRY))) / 1000000.0
  )
  INTO v_stats
  FROM commandes
  WHERE created_at >= p_start_date
    AND created_at < p_end_date + INTERVAL '1 day';

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_geographic_stats(DATE, DATE) IS 'Calcule des statistiques géographiques sur une période donnée';

-- Commentaires sur la colonne
COMMENT ON COLUMN commandes.geo_location IS 'Géolocalisation PostGIS (POINT) pour requêtes optimisées';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Colonne geo_location ajoutée à la table commandes';
  RAISE NOTICE '✅ Trigger de mise à jour automatique créé';
  RAISE NOTICE '✅ Index spatial GIST créé';
  RAISE NOTICE '✅ Fonctions PostGIS optimisées créées:';
  RAISE NOTICE '   - get_commandes_within_radius()';
  RAISE NOTICE '   - get_nearest_commandes()';
  RAISE NOTICE '   - get_distance_between_commandes()';
  RAISE NOTICE '   - get_delivery_clusters()';
  RAISE NOTICE '   - get_delivery_coverage_area()';
  RAISE NOTICE '   - get_geographic_stats()';
  RAISE NOTICE '🚀 Recherches géographiques maintenant ultra-rapides!';
END $$;
