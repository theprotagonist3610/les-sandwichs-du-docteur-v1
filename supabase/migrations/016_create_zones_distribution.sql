-- Migration 016 — Table zones_distribution
-- Remplace la colonne zone TEXT de distributeurs_eligibles par une FK vers zones_distribution.

-- ─── Table zones_distribution ─────────────────────────────────────────────────

CREATE TABLE zones_distribution (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom            TEXT        NOT NULL,
  description    TEXT,
  departement    TEXT,
  arrondissement TEXT,
  commune        TEXT,
  quartiers      TEXT[],
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_zones_nom        ON zones_distribution (nom);
CREATE INDEX idx_zones_departement ON zones_distribution (departement);

CREATE TRIGGER trg_zones_updated_at
  BEFORE UPDATE ON zones_distribution
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Mise à jour distributeurs_eligibles ─────────────────────────────────────
-- Suppression de la colonne zone TEXT et remplacement par id_zone UUID FK.

DROP INDEX IF EXISTS idx_distributeurs_zone;

ALTER TABLE distributeurs_eligibles
  DROP COLUMN IF EXISTS zone,
  ADD  COLUMN id_zone UUID REFERENCES zones_distribution(id) ON DELETE SET NULL;

CREATE INDEX idx_distributeurs_id_zone ON distributeurs_eligibles (id_zone);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE zones_distribution ENABLE ROW LEVEL SECURITY;

-- Lecture pour tous les authentifiés, écriture admin/superviseur
DROP POLICY IF EXISTS "zones_select" ON zones_distribution;
DROP POLICY IF EXISTS "zones_modify" ON zones_distribution;

CREATE POLICY "zones_select"
ON zones_distribution
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "zones_modify"
ON zones_distribution
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superviseur')
    AND users.is_active = true
  )
);
