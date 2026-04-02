-- ============================================================================
-- Migration 012 : Conversion de operations_comptables.motif en JSONB
-- Structure :
--   Encaissement : { "motif": string, "emplacement": string }
--   Dépense      : { "motif": string, "emplacement": string, "quantite": number, "unite": string }
-- ============================================================================

-- Convertir la colonne motif de TEXT vers JSONB
-- Les enregistrements existants sont wrappés avec emplacement vide et quantite/unite à 0/""
ALTER TABLE public.operations_comptables
  ALTER COLUMN motif TYPE jsonb
  USING jsonb_build_object(
    'motif',       COALESCE(motif, ''),
    'emplacement', ''
  );

-- Index GIN pour les recherches JSONB
CREATE INDEX IF NOT EXISTS idx_operations_motif_gin
  ON public.operations_comptables USING gin (motif);

-- Index sur emplacement pour les filtres fréquents
CREATE INDEX IF NOT EXISTS idx_operations_motif_emplacement
  ON public.operations_comptables ((motif->>'emplacement'));
