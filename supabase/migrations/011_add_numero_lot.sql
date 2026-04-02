-- ============================================================================
-- MIGRATION 011 : Numéro de lot auto-généré pour stock_lots
-- Ajoute : numero_lot VARCHAR(20) UNIQUE, généré automatiquement par trigger
-- Format  : LOT-00001 (séquence globale, 5 chiffres, zéro-paddé)
-- Dépend de : 010_create_stock_tables.sql
-- Date    : 2026-03-30
-- ============================================================================


-- ── Séquence globale ──────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS public.stock_lots_numero_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

COMMENT ON SEQUENCE public.stock_lots_numero_seq IS
  'Séquence globale pour la génération des numéros de lot (LOT-00001, LOT-00002, …)';


-- ── Colonne numero_lot ────────────────────────────────────────────────────────

ALTER TABLE public.stock_lots
  ADD COLUMN IF NOT EXISTS numero_lot VARCHAR(20) UNIQUE;

COMMENT ON COLUMN public.stock_lots.numero_lot IS
  'Numéro de lot lisible, auto-généré au format LOT-XXXXX (séquence globale). '
  'Sert d''identifiant humain pour tracer les lots dans les documents et l''interface.';

-- Index pour les recherches par numero_lot
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_lots_numero_lot
  ON public.stock_lots(numero_lot);


-- ── Trigger de génération ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generer_numero_lot()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_lot IS NULL THEN
    NEW.numero_lot := 'LOT-' || LPAD(nextval('public.stock_lots_numero_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generer_numero_lot() IS
  'Génère automatiquement le numero_lot au format LOT-XXXXX lors de l''insertion.';

CREATE TRIGGER trigger_generer_numero_lot
  BEFORE INSERT ON public.stock_lots
  FOR EACH ROW
  EXECUTE FUNCTION public.generer_numero_lot();


-- ── Rétroactivement : numéroter les lots déjà existants ──────────────────────
-- (utile si la table avait déjà des données au moment de la migration)

UPDATE public.stock_lots
SET numero_lot = 'LOT-' || LPAD(nextval('public.stock_lots_numero_seq')::TEXT, 5, '0')
WHERE numero_lot IS NULL;
