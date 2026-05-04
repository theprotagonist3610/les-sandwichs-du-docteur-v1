-- Migration 014 — Refonte complète de la production
-- Remplace les tables production_schemas + productions par un modèle
-- centré sur 3 recettes fixes (viande, poisson, yaourt).

-- ─── Nettoyage ancien système ─────────────────────────────────────────────────

DROP TABLE IF EXISTS productions       CASCADE;
DROP TABLE IF EXISTS production_schemas CASCADE;

-- ─── Table recettes ───────────────────────────────────────────────────────────
-- 3 lignes fixes (id = 'viande' | 'poisson' | 'yaourt'), configurables.

CREATE TABLE recettes (
  id                          TEXT PRIMARY KEY
                                CHECK (id IN ('viande', 'poisson', 'yaourt')),
  nom                         TEXT        NOT NULL,
  ingredient_principal        JSONB       NOT NULL DEFAULT '{"nom":"","unite":"kg"}',
  -- { nom: string, unite: string }
  ingredients_secondaires     JSONB       NOT NULL DEFAULT '[]',
  -- [{ nom, unite, qte_par_kg_principal, cout_estime_unitaire }]
  prix_vente_par_unite_produite NUMERIC   NOT NULL DEFAULT 0,
  rendement_estime_pct        NUMERIC     NOT NULL DEFAULT 85,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Données initiales
INSERT INTO recettes (id, nom, ingredient_principal, rendement_estime_pct) VALUES
  ('viande',  'Farce de Viande',  '{"nom":"Viande hachée","unite":"kg"}', 85),
  ('poisson', 'Farce de Poisson', '{"nom":"Poisson","unite":"kg"}',       80),
  ('yaourt',  'Yaourt',           '{"nom":"Lait","unite":"L"}',           90);

-- ─── Table productions ────────────────────────────────────────────────────────
-- Un enregistrement = un lot de production.

CREATE TABLE productions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recette_id            TEXT        NOT NULL REFERENCES recettes(id),
  date_production       DATE        NOT NULL DEFAULT CURRENT_DATE,
  ingredient_principal  JSONB       NOT NULL DEFAULT '{}',
  -- { qte_utilisee: numeric, cout_unitaire_reel: numeric, cout_total: numeric }
  ingredients_secondaires JSONB     NOT NULL DEFAULT '[]',
  -- [{ nom, unite, qte_utilisee, cout_unitaire_reel, cout_total }]
  cout_total_reel       NUMERIC     NOT NULL DEFAULT 0,
  qte_produite_reelle   NUMERIC     NOT NULL,
  rendement_reel_pct    NUMERIC,
  prix_vente_estime     NUMERIC,
  marge_estimee         NUMERIC,
  notes                 TEXT,
  created_by            UUID        REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_productions_recette_id     ON productions (recette_id);
CREATE INDEX idx_productions_date           ON productions (date_production DESC);
CREATE INDEX idx_productions_recette_date   ON productions (recette_id, date_production DESC);

-- ─── Reconnecter stock_lots → nouvelles productions ───────────────────────────
-- Le CASCADE précédent a supprimé le FK production_id ; on le recréé.
-- La colonne schema_id reste pour compatibilité mais sans FK (production_schemas n'existe plus).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'stock_lots' AND column_name = 'production_id') THEN
    ALTER TABLE stock_lots
      DROP CONSTRAINT IF EXISTS stock_lots_production_id_fkey,
      ADD  CONSTRAINT stock_lots_production_id_fkey
        FOREIGN KEY (production_id) REFERENCES productions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE recettes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE productions ENABLE ROW LEVEL SECURITY;

-- Recettes : lecture libre, écriture admin/superviseur
CREATE POLICY "recettes_select" ON recettes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "recettes_modify" ON recettes
  FOR ALL TO authenticated
  USING      ((auth.jwt() ->> 'role') IN ('admin', 'superviseur'))
  WITH CHECK ((auth.jwt() ->> 'role') IN ('admin', 'superviseur'));

-- Productions : lecture et écriture pour tous les authentifiés
CREATE POLICY "productions_select" ON productions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "productions_insert" ON productions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "productions_update" ON productions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "productions_delete" ON productions
  FOR DELETE TO authenticated USING (true);
