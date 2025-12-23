-- Table des emplacements (points de vente)
-- Gère les différents emplacements où l'activité est déployée
CREATE TABLE IF NOT EXISTS public.emplacements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('base', 'stand', 'kiosque', 'boutique')),
  adresse JSONB NOT NULL DEFAULT '{"departement": "", "commune": "", "arrondissement": "", "quartier": "", "localisation": {"lat": null, "lng": null}}'::jsonb,
  responsable_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  horaires JSONB NOT NULL DEFAULT '{
    "lundi": {"ouverture": "08:00", "fermeture": "18:00"},
    "mardi": {"ouverture": "08:00", "fermeture": "18:00"},
    "mercredi": {"ouverture": "08:00", "fermeture": "18:00"},
    "jeudi": {"ouverture": "08:00", "fermeture": "18:00"},
    "vendredi": {"ouverture": "08:00", "fermeture": "18:00"},
    "samedi": {"ouverture": "08:00", "fermeture": "14:00"},
    "dimanche": {"ouverture": null, "fermeture": null}
  }'::jsonb,
  statut VARCHAR(30) NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'ferme_temporairement')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_emplacements_type ON public.emplacements(type);
CREATE INDEX IF NOT EXISTS idx_emplacements_statut ON public.emplacements(statut);
CREATE INDEX IF NOT EXISTS idx_emplacements_responsable ON public.emplacements(responsable_id);
CREATE INDEX IF NOT EXISTS idx_emplacements_created_at ON public.emplacements(created_at);

-- Index GIN pour recherche dans les champs JSONB
CREATE INDEX IF NOT EXISTS idx_emplacements_adresse ON public.emplacements USING GIN (adresse);
CREATE INDEX IF NOT EXISTS idx_emplacements_horaires ON public.emplacements USING GIN (horaires);

-- Commentaires sur la table et les colonnes
COMMENT ON TABLE public.emplacements IS 'Table des emplacements (points de vente) de l''entreprise';
COMMENT ON COLUMN public.emplacements.id IS 'Identifiant unique de l''emplacement';
COMMENT ON COLUMN public.emplacements.nom IS 'Nom de l''emplacement';
COMMENT ON COLUMN public.emplacements.type IS 'Type d''emplacement: base (principal), stand (marché), kiosque, boutique';
COMMENT ON COLUMN public.emplacements.adresse IS 'Adresse structurée avec département, commune, arrondissement, quartier et coordonnées GPS';
COMMENT ON COLUMN public.emplacements.responsable_id IS 'ID de l''utilisateur responsable de cet emplacement';
COMMENT ON COLUMN public.emplacements.horaires IS 'Horaires d''ouverture et fermeture pour chaque jour de la semaine';
COMMENT ON COLUMN public.emplacements.statut IS 'Statut actuel de l''emplacement';
COMMENT ON COLUMN public.emplacements.created_at IS 'Date et heure de création';
COMMENT ON COLUMN public.emplacements.updated_at IS 'Date et heure de dernière modification';

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_emplacements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_emplacements_updated_at
  BEFORE UPDATE ON public.emplacements
  FOR EACH ROW
  EXECUTE FUNCTION update_emplacements_updated_at();

-- RLS (Row Level Security) Policies
ALTER TABLE public.emplacements ENABLE ROW LEVEL SECURITY;

-- Policy: Les admins ont tous les droits
CREATE POLICY "admins_all_emplacements" ON public.emplacements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- Policy: Les superviseurs peuvent voir tous les emplacements (lecture seule)
CREATE POLICY "superviseurs_read_emplacements" ON public.emplacements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'superviseur'
      AND users.is_active = true
    )
  );

-- Policy: Les vendeurs ne peuvent voir que leur emplacement assigné
CREATE POLICY "vendeurs_read_own_emplacement" ON public.emplacements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'vendeur'
      AND users.is_active = true
      AND users.id = emplacements.responsable_id
    )
  );

-- Fonction pour récupérer les emplacements avec coordonnées GPS valides (pour affichage carte)
CREATE OR REPLACE FUNCTION get_emplacements_with_coordinates()
RETURNS TABLE (
  id UUID,
  nom VARCHAR(200),
  type VARCHAR(20),
  statut VARCHAR(30),
  lat NUMERIC,
  lng NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.nom,
    e.type,
    e.statut,
    (e.adresse->'localisation'->>'lat')::NUMERIC AS lat,
    (e.adresse->'localisation'->>'lng')::NUMERIC AS lng
  FROM public.emplacements e
  WHERE
    e.adresse->'localisation'->>'lat' IS NOT NULL
    AND e.adresse->'localisation'->>'lng' IS NOT NULL
    AND (e.adresse->'localisation'->>'lat')::NUMERIC IS NOT NULL
    AND (e.adresse->'localisation'->>'lng')::NUMERIC IS NOT NULL
  ORDER BY e.nom;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les statistiques des emplacements
CREATE OR REPLACE FUNCTION get_emplacements_stats()
RETURNS TABLE (
  total BIGINT,
  actif BIGINT,
  inactif BIGINT,
  ferme_temporairement BIGINT,
  par_type JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE statut = 'actif')::BIGINT AS actif,
    COUNT(*) FILTER (WHERE statut = 'inactif')::BIGINT AS inactif,
    COUNT(*) FILTER (WHERE statut = 'ferme_temporairement')::BIGINT AS ferme_temporairement,
    jsonb_build_object(
      'base', COUNT(*) FILTER (WHERE type = 'base'),
      'stand', COUNT(*) FILTER (WHERE type = 'stand'),
      'kiosque', COUNT(*) FILTER (WHERE type = 'kiosque'),
      'boutique', COUNT(*) FILTER (WHERE type = 'boutique')
    ) AS par_type
  FROM public.emplacements;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_emplacements_with_coordinates() IS 'Récupère tous les emplacements ayant des coordonnées GPS valides pour affichage sur carte';
COMMENT ON FUNCTION get_emplacements_stats() IS 'Calcule les statistiques des emplacements (total, par statut, par type)';
