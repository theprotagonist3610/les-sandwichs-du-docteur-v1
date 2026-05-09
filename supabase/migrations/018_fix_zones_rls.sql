-- Migration 018 — Correction RLS zones_distribution
-- Cause : auth.jwt() ->> 'role' ne retourne pas la valeur attendue dans ce projet.
-- Fix   : utiliser get_current_user_role() (SECURITY DEFINER, créé en migration 006)
--         qui lit directement la table public.users sans passer par le JWT.

DROP POLICY IF EXISTS "zones_modify" ON zones_distribution;

CREATE POLICY "zones_insert" ON zones_distribution
  FOR INSERT TO authenticated;

CREATE POLICY "zones_update" ON zones_distribution
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superviseur')
      AND users.is_active = true
    )
  );

CREATE POLICY "zones_delete" ON zones_distribution
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superviseur')
      AND users.is_active = true
    )
  );
