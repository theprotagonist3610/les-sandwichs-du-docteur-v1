-- Migration 015 — Système de distribution
-- Tables : config_prix_produits, distributeurs_eligibles, tournees_distribution,
--          lignes_tournee, paiements_ristourne

-- ─── ENUMs ───────────────────────────────────────────────────────────────────

-- type_produit_distrib intentionally omitted: produits are TEXT + FK vers config_prix_produits
-- pour permettre l'ajout de nouveaux produits sans modifier le schéma.
CREATE TYPE type_distributeur_enum    AS ENUM ('ambulant', 'statique');
CREATE TYPE periodicite_paiement_enum AS ENUM ('journalier', 'hebdomadaire', 'mensuel');
CREATE TYPE statut_paiement_enum      AS ENUM ('non_paye', 'partiel', 'paye');
CREATE TYPE mode_paiement_enum        AS ENUM ('especes', 'mobile_money', 'virement');

-- ─── Fonction updated_at (idempotente) ───────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── 1. config_prix_produits ─────────────────────────────────────────────────
-- Prix unitaires de référence par produit.
-- Snapshottés dans prix_unitaire_applique à chaque saisie de tournée.

CREATE TABLE config_prix_produits (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  produit       TEXT        NOT NULL UNIQUE,
  nom           TEXT        NOT NULL,
  prix_unitaire NUMERIC     NOT NULL DEFAULT 0 CHECK (prix_unitaire >= 0),
  actif         BOOLEAN     NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO config_prix_produits (produit, nom, prix_unitaire) VALUES
  ('yaourt_50',  'Yaourt 50',  50),
  ('yaourt_100', 'Yaourt 100', 100),
  ('gateau',     'Gâteau',     100);

-- ─── 2. distributeurs_eligibles ──────────────────────────────────────────────

CREATE TABLE distributeurs_eligibles (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom                      TEXT        NOT NULL,
  adresse                  TEXT,
  contact                  TEXT,
  zone                     TEXT,
  statut_eligibilite       BOOLEAN     NOT NULL DEFAULT true,
  date_inscription         DATE        NOT NULL DEFAULT CURRENT_DATE,
  periodicite_distribution TEXT[]      NOT NULL DEFAULT '{}',
  -- ex : ['lundi', 'mercredi', 'vendredi']
  type_distributeur        type_distributeur_enum    NOT NULL DEFAULT 'ambulant',
  taux_ristourne           NUMERIC     NOT NULL DEFAULT 0
                             CHECK (taux_ristourne >= 0 AND taux_ristourne <= 1),
  -- ex : 0.10 = 10 %
  periodicite_paiement     periodicite_paiement_enum NOT NULL DEFAULT 'journalier',
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_distributeurs_zone   ON distributeurs_eligibles (zone);
CREATE INDEX idx_distributeurs_statut ON distributeurs_eligibles (statut_eligibilite);

CREATE TRIGGER trg_distributeurs_updated_at
  BEFORE UPDATE ON distributeurs_eligibles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 3. tournees_distribution ────────────────────────────────────────────────
-- Un enregistrement = une sortie d'un distributeur à une date donnée.
-- ristourne_due est calculée par le toolkit et figée à la création.
-- montant_paye est mis à jour lors des saisies dans paiements_ristourne.

CREATE TABLE tournees_distribution (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_distributeur UUID        NOT NULL
                    REFERENCES distributeurs_eligibles(id) ON DELETE RESTRICT,
  date_tournee    DATE        NOT NULL DEFAULT CURRENT_DATE,
  ristourne_due   NUMERIC     NOT NULL DEFAULT 0 CHECK (ristourne_due >= 0),
  montant_paye    NUMERIC     NOT NULL DEFAULT 0 CHECK (montant_paye >= 0),
  statut_paiement statut_paiement_enum NOT NULL DEFAULT 'non_paye',
  feedback        TEXT,
  created_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_distributeur, date_tournee)
  -- une seule tournée par distributeur par jour
);

CREATE INDEX idx_tournees_distributeur ON tournees_distribution (id_distributeur);
CREATE INDEX idx_tournees_date         ON tournees_distribution (date_tournee DESC);
CREATE INDEX idx_tournees_statut       ON tournees_distribution (statut_paiement);
CREATE INDEX idx_tournees_dist_date    ON tournees_distribution (id_distributeur, date_tournee DESC);

CREATE TRIGGER trg_tournees_updated_at
  BEFORE UPDATE ON tournees_distribution
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 4. lignes_tournee ───────────────────────────────────────────────────────
-- Une ligne par produit dans la tournée (max 2 lignes : yaourt + gateau).
-- quantite_vendue  = quantite_recue - quantite_recuperee  → calculé dans le toolkit
-- vente            = quantite_vendue * prix_unitaire_applique
-- ristourne_ligne  = vente * taux_ristourne du distributeur

CREATE TABLE lignes_tournee (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_tournee             UUID        NOT NULL
                           REFERENCES tournees_distribution(id) ON DELETE CASCADE,
  type_produit           TEXT        NOT NULL REFERENCES config_prix_produits(produit),
  prix_unitaire_applique NUMERIC     NOT NULL DEFAULT 0,
  quantite_recue         INTEGER     NOT NULL DEFAULT 0 CHECK (quantite_recue >= 0),
  quantite_recuperee     INTEGER     NOT NULL DEFAULT 0 CHECK (quantite_recuperee >= 0),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_tournee, type_produit),
  CONSTRAINT qte_coherente CHECK (quantite_recuperee <= quantite_recue)
);

CREATE INDEX idx_lignes_tournee  ON lignes_tournee (id_tournee);
CREATE INDEX idx_lignes_produit  ON lignes_tournee (type_produit);

-- ─── 5. paiements_ristourne ──────────────────────────────────────────────────
-- Traçabilité complète des versements effectués aux distributeurs.
-- Fonctionne pour les 3 périodicités (journalier / hebdomadaire / mensuel).

CREATE TABLE paiements_ristourne (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_distributeur UUID        NOT NULL
                    REFERENCES distributeurs_eligibles(id) ON DELETE RESTRICT,
  date_paiement   DATE        NOT NULL DEFAULT CURRENT_DATE,
  montant         NUMERIC     NOT NULL CHECK (montant > 0),
  mode_paiement   mode_paiement_enum NOT NULL DEFAULT 'especes',
  reference       TEXT,
  notes           TEXT,
  created_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_paiements_distributeur ON paiements_ristourne (id_distributeur);
CREATE INDEX idx_paiements_date         ON paiements_ristourne (date_paiement DESC);
CREATE INDEX idx_paiements_dist_date    ON paiements_ristourne (id_distributeur, date_paiement DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE config_prix_produits    ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributeurs_eligibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournees_distribution   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_tournee          ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements_ristourne     ENABLE ROW LEVEL SECURITY;

-- config_prix_produits
DROP POLICY IF EXISTS "config_prix_select" ON config_prix_produits;
DROP POLICY IF EXISTS "config_prix_modify" ON config_prix_produits;

CREATE POLICY "config_prix_select"
ON config_prix_produits
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "config_prix_modify"
ON config_prix_produits
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

-- distributeurs_eligibles
DROP POLICY IF EXISTS "distributeurs_select" ON distributeurs_eligibles;
DROP POLICY IF EXISTS "distributeurs_modify" ON distributeurs_eligibles;

CREATE POLICY "distributeurs_select"
ON distributeurs_eligibles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "distributeurs_modify"
ON distributeurs_eligibles
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

-- tournees_distribution
DROP POLICY IF EXISTS "tournees_select" ON tournees_distribution;
DROP POLICY IF EXISTS "tournees_insert" ON tournees_distribution;
DROP POLICY IF EXISTS "tournees_update" ON tournees_distribution;
DROP POLICY IF EXISTS "tournees_delete" ON tournees_distribution;

CREATE POLICY "tournees_select"
ON tournees_distribution
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "tournees_insert"
ON tournees_distribution
FOR INSERT
TO authenticated;

CREATE POLICY "tournees_update"
ON tournees_distribution
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superviseur')
    AND users.is_active = true
  )
);

CREATE POLICY "tournees_delete"
ON tournees_distribution
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superviseur')
    AND users.is_active = true
  )
);

-- lignes_tournee
DROP POLICY IF EXISTS "lignes_select" ON lignes_tournee;
DROP POLICY IF EXISTS "lignes_insert" ON lignes_tournee;
DROP POLICY IF EXISTS "lignes_update" ON lignes_tournee;
DROP POLICY IF EXISTS "lignes_delete" ON lignes_tournee;

CREATE POLICY "lignes_select"
ON lignes_tournee
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "lignes_insert"
ON lignes_tournee
FOR INSERT
TO authenticated;

CREATE POLICY "lignes_update"
ON lignes_tournee
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superviseur')
    AND users.is_active = true
  )
);

CREATE POLICY "lignes_delete"
ON lignes_tournee
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superviseur')
    AND users.is_active = true
  )
);

-- paiements_ristourne
DROP POLICY IF EXISTS "paiements_select" ON paiements_ristourne;
DROP POLICY IF EXISTS "paiements_insert" ON paiements_ristourne;
DROP POLICY IF EXISTS "paiements_update" ON paiements_ristourne;
DROP POLICY IF EXISTS "paiements_delete" ON paiements_ristourne;

CREATE POLICY "paiements_select"
ON paiements_ristourne
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "paiements_insert"
ON paiements_ristourne
FOR INSERT
TO authenticated;

CREATE POLICY "paiements_update"
ON paiements_ristourne
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superviseur')
    AND users.is_active = true
  )
);

CREATE POLICY "paiements_delete"
ON paiements_ristourne
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superviseur')
    AND users.is_active = true
  )
);
