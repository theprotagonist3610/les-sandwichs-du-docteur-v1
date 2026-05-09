-- Migration 019 — Correction RLS tables de distribution (migration 015)
-- Même cause que 018 : auth.jwt() ->> 'role' ne retourne pas la valeur attendue.
-- Toutes les policies FOR ALL sont remplacées par des policies explicites
-- utilisant get_current_user_role() (SECURITY DEFINER).

-- ─── config_prix_produits ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "config_prix_modify" ON config_prix_produits;

CREATE POLICY "config_prix_insert" ON config_prix_produits
  FOR INSERT TO authenticated;

CREATE POLICY "config_prix_update" ON config_prix_produits
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superviseur')
      AND users.is_active = true
    )
  );

CREATE POLICY "config_prix_delete" ON config_prix_produits
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superviseur')
      AND users.is_active = true
    )
  );

-- ─── distributeurs_eligibles ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "distributeurs_modify" ON distributeurs_eligibles;

CREATE POLICY "distributeurs_insert" ON distributeurs_eligibles
  FOR INSERT TO authenticated;

CREATE POLICY "distributeurs_update" ON distributeurs_eligibles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superviseur')
      AND users.is_active = true
    )
  );

CREATE POLICY "distributeurs_delete" ON distributeurs_eligibles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superviseur')
      AND users.is_active = true
    )
  );

-- ─── tournees_distribution ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "tournees_insert" ON tournees_distribution;
DROP POLICY IF EXISTS "tournees_update" ON tournees_distribution;
DROP POLICY IF EXISTS "tournees_delete" ON tournees_distribution;

CREATE POLICY "tournees_insert" ON tournees_distribution
  FOR INSERT TO authenticated;

CREATE POLICY "tournees_update" ON tournees_distribution
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superviseur')
      AND users.is_active = true
    )
  );

CREATE POLICY "tournees_delete" ON tournees_distribution
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superviseur')
      AND users.is_active = true
    )
  );

-- ─── lignes_tournee ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "lignes_insert" ON lignes_tournee;
DROP POLICY IF EXISTS "lignes_update" ON lignes_tournee;
DROP POLICY IF EXISTS "lignes_delete" ON lignes_tournee;

CREATE POLICY "lignes_insert" ON lignes_tournee
  FOR INSERT TO authenticated;

CREATE POLICY "lignes_update" ON lignes_tournee
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superviseur')
      AND users.is_active = true
    )
  );

CREATE POLICY "lignes_delete" ON lignes_tournee
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superviseur')
      AND users.is_active = true
    )
  );

-- ─── paiements_ristourne ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "paiements_insert" ON paiements_ristourne;
DROP POLICY IF EXISTS "paiements_update" ON paiements_ristourne;
DROP POLICY IF EXISTS "paiements_delete" ON paiements_ristourne;

CREATE POLICY "paiements_insert" ON paiements_ristourne
  FOR INSERT TO authenticated;

CREATE POLICY "paiements_update" ON paiements_ristourne
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superviseur')
      AND users.is_active = true
    )
  );

CREATE POLICY "paiements_delete" ON paiements_ristourne
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superviseur')
      AND users.is_active = true
    )
  );
