-- =============================================================================
-- 013_add_production_modes.sql
-- Ajout du support des modes de production cycliques sur production_schemas
-- =============================================================================

ALTER TABLE production_schemas
  ADD COLUMN IF NOT EXISTS mode_production VARCHAR(20) NOT NULL DEFAULT 'a_la_demande'
    CHECK (mode_production IN ('a_la_demande', 'par_conservation', 'cyclique')),
  ADD COLUMN IF NOT EXISTS cycle_jours     INTEGER
    CHECK (cycle_jours IS NULL OR cycle_jours > 0),
  ADD COLUMN IF NOT EXISTS seuil_relance   JSONB;

COMMENT ON COLUMN production_schemas.mode_production IS
  'Mode de production : a_la_demande (défaut), par_conservation (batch avec conservation), cyclique (relance auto)';
COMMENT ON COLUMN production_schemas.cycle_jours IS
  'Pour mode cyclique : durée du cycle en jours (ex: 2 = tous les 2 jours)';
COMMENT ON COLUMN production_schemas.seuil_relance IS
  'Pour mode cyclique : seuil de stock déclenchant la relance, ex: { "quantite": 5, "unite": "portion" }';
