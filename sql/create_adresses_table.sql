-- =====================================================
-- Table: adresses
-- Description: Gestion des adresses de livraison
-- =====================================================

CREATE TABLE IF NOT EXISTS adresses (
  -- Identifiant unique
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informations géographiques
  departement TEXT NOT NULL,
  commune TEXT NOT NULL,
  arrondissement TEXT NOT NULL,
  quartier TEXT NOT NULL,
  
  -- Coordonnées GPS (stockées en JSON)
  localisation JSONB,
  
  -- Statut actif/inactif (soft delete)
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Index pour améliorer les performances
-- =====================================================

-- Index pour les recherches par localisation
CREATE INDEX IF NOT EXISTS idx_adresses_departement ON adresses(departement);
CREATE INDEX IF NOT EXISTS idx_adresses_commune ON adresses(commune);
CREATE INDEX IF NOT EXISTS idx_adresses_arrondissement ON adresses(arrondissement);
CREATE INDEX IF NOT EXISTS idx_adresses_quartier ON adresses(quartier);

-- Index pour filtrer par statut actif
CREATE INDEX IF NOT EXISTS idx_adresses_is_active ON adresses(is_active);

-- Index pour les adresses avec localisation (GIN index pour JSONB)
CREATE INDEX IF NOT EXISTS idx_adresses_localisation ON adresses USING GIN(localisation);

-- Index composite pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_adresses_active_created ON adresses(is_active, created_at DESC);

-- Index pour éviter les doublons (unique constraint composite)
CREATE UNIQUE INDEX IF NOT EXISTS idx_adresses_unique 
ON adresses(departement, commune, arrondissement, quartier) 
WHERE is_active = true;

-- =====================================================
-- Trigger pour mettre à jour automatiquement updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_adresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_adresses_updated_at
  BEFORE UPDATE ON adresses
  FOR EACH ROW
  EXECUTE FUNCTION update_adresses_updated_at();

-- =====================================================
-- Contraintes de validation
-- =====================================================

-- Validation du format de localisation (doit contenir lat et lng)
ALTER TABLE adresses 
ADD CONSTRAINT check_localisation_format 
CHECK (
  localisation IS NULL 
  OR (
    localisation ? 'lat' 
    AND localisation ? 'lng'
    AND (localisation->>'lat')::FLOAT BETWEEN -90 AND 90
    AND (localisation->>'lng')::FLOAT BETWEEN -180 AND 180
  )
);

-- Les champs texte ne doivent pas être vides
ALTER TABLE adresses 
ADD CONSTRAINT check_departement_not_empty 
CHECK (LENGTH(TRIM(departement)) > 0);

ALTER TABLE adresses 
ADD CONSTRAINT check_commune_not_empty 
CHECK (LENGTH(TRIM(commune)) > 0);

ALTER TABLE adresses 
ADD CONSTRAINT check_arrondissement_not_empty 
CHECK (LENGTH(TRIM(arrondissement)) > 0);

ALTER TABLE adresses 
ADD CONSTRAINT check_quartier_not_empty 
CHECK (LENGTH(TRIM(quartier)) > 0);

-- =====================================================
-- Fonctions utilitaires
-- =====================================================

-- Fonction pour compter les adresses par département
CREATE OR REPLACE FUNCTION count_adresses_by_departement()
RETURNS TABLE(departement TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT a.departement, COUNT(*)::BIGINT
  FROM adresses a
  WHERE a.is_active = true
  GROUP BY a.departement
  ORDER BY a.departement;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour compter les adresses par commune
CREATE OR REPLACE FUNCTION count_adresses_by_commune()
RETURNS TABLE(commune TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT a.commune, COUNT(*)::BIGINT
  FROM adresses a
  WHERE a.is_active = true
  GROUP BY a.commune
  ORDER BY a.commune;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques globales
CREATE OR REPLACE FUNCTION get_adresses_stats()
RETURNS TABLE(
  total BIGINT,
  active BIGINT,
  inactive BIGINT,
  with_location BIGINT,
  without_location BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE is_active = true)::BIGINT as active,
    COUNT(*) FILTER (WHERE is_active = false)::BIGINT as inactive,
    COUNT(*) FILTER (WHERE localisation IS NOT NULL)::BIGINT as with_location,
    COUNT(*) FILTER (WHERE localisation IS NULL)::BIGINT as without_location
  FROM adresses;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Politiques RLS (Row Level Security) pour Supabase
-- =====================================================

-- Activer RLS sur la table
ALTER TABLE adresses ENABLE ROW LEVEL SECURITY;

-- Politique: Lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Lecture adresses pour utilisateurs authentifiés"
ON adresses
FOR SELECT
TO authenticated
USING (true);

-- Politique: Insertion pour tous les utilisateurs authentifiés
CREATE POLICY "Insertion adresses pour utilisateurs authentifiés"
ON adresses
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Politique: Mise à jour pour tous les utilisateurs authentifiés
CREATE POLICY "Mise à jour adresses pour utilisateurs authentifiés"
ON adresses
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Politique: Suppression pour tous les utilisateurs authentifiés
-- (Note: préférer la désactivation via is_active)
CREATE POLICY "Suppression adresses pour utilisateurs authentifiés"
ON adresses
FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- Commentaires sur la table et les colonnes
-- =====================================================

COMMENT ON TABLE adresses IS 'Table de gestion des adresses de livraison avec géolocalisation';
COMMENT ON COLUMN adresses.id IS 'Identifiant unique UUID';
COMMENT ON COLUMN adresses.departement IS 'Département (ex: Littoral)';
COMMENT ON COLUMN adresses.commune IS 'Commune (ex: Cotonou)';
COMMENT ON COLUMN adresses.arrondissement IS 'Arrondissement (ex: 1er arrondissement)';
COMMENT ON COLUMN adresses.quartier IS 'Quartier (ex: Dandji)';
COMMENT ON COLUMN adresses.localisation IS 'Coordonnées GPS au format JSON {lat: number, lng: number}';
COMMENT ON COLUMN adresses.is_active IS 'Statut actif/inactif (soft delete)';
COMMENT ON COLUMN adresses.created_at IS 'Date de création';
COMMENT ON COLUMN adresses.updated_at IS 'Date de dernière mise à jour';

-- =====================================================
-- Données de test (optionnel)
-- =====================================================

-- Insertion de quelques adresses de test
INSERT INTO adresses (departement, commune, arrondissement, quartier, localisation) VALUES
('Littoral', 'Cotonou', '1er arrondissement', 'Dandji', '{"lat": 6.3654, "lng": 2.4183}'),
('Littoral', 'Cotonou', '1er arrondissement', 'Donaten', '{"lat": 6.3600, "lng": 2.4200}'),
('Littoral', 'Cotonou', '2ème arrondissement', 'Akpakpa', '{"lat": 6.3500, "lng": 2.4300}')
ON CONFLICT DO NOTHING;

-- =====================================================
-- Vérification de la création
-- =====================================================

-- Afficher les statistiques
SELECT * FROM get_adresses_stats();
