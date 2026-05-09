-- Migration 017 — Ajout des colonnes géographiques à zones_distribution
-- centre : JSONB { lat, lng } — coordonnées du centre de la zone
-- rayon  : NUMERIC             — rayon en kilomètres

ALTER TABLE zones_distribution
  ADD COLUMN centre JSONB    DEFAULT NULL,
  -- ex : { "lat": 4.0511, "lng": 9.7679 }
  ADD COLUMN rayon  NUMERIC  DEFAULT NULL;
  -- en km, ex : 2.5

COMMENT ON COLUMN zones_distribution.centre IS 'Centre géographique de la zone { lat, lng }';
COMMENT ON COLUMN zones_distribution.rayon  IS 'Rayon de la zone en kilomètres';
