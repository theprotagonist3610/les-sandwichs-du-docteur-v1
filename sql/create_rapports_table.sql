-- ============================================================================
-- CREATION DE LA TABLE RAPPORTS
-- ============================================================================
-- Gestion des rapports journaliers avec suivi des objectifs
-- Acces limite aux administrateurs uniquement (CRUD)
-- Les superviseurs peuvent lire les rapports
-- ============================================================================

-- Creer la table rapports
CREATE TABLE IF NOT EXISTS rapports (
  -- Identifiant unique
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Denomination unique au format rapport_DDMMYYYY
  denomination VARCHAR(50) NOT NULL UNIQUE,

  -- Totaux journaliers
  total_ventes DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (total_ventes >= 0),
  total_encaissement DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (total_encaissement >= 0),
  total_depense DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (total_depense >= 0),

  -- Objectifs (ecarts en pourcentage par rapport aux previsions)
  -- Format: { ventes: +/-%, encaissement: +/-%, depense: +/-% }
  objectifs JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Utilisateur qui a cree le rapport
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEX POUR OPTIMISATION DES REQUETES
-- ============================================================================

-- Index sur la denomination (recherche par date)
CREATE INDEX IF NOT EXISTS idx_rapports_denomination
  ON rapports(denomination);

-- Index sur la date de creation (tri chronologique)
CREATE INDEX IF NOT EXISTS idx_rapports_created_at
  ON rapports(created_at DESC);

-- Index sur le createur (filtre par utilisateur)
CREATE INDEX IF NOT EXISTS idx_rapports_created_by
  ON rapports(created_by);

-- Index GIN sur les objectifs (recherche dans JSONB)
CREATE INDEX IF NOT EXISTS idx_rapports_objectifs_gin
  ON rapports USING gin(objectifs);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger pour mettre a jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_rapports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_rapports_updated_at ON rapports;
CREATE TRIGGER trigger_update_rapports_updated_at
  BEFORE UPDATE ON rapports
  FOR EACH ROW
  EXECUTE FUNCTION update_rapports_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS sur la table
ALTER TABLE rapports ENABLE ROW LEVEL SECURITY;

-- Politique: Les administrateurs ont acces complet (CRUD)
CREATE POLICY "Admins have full access to rapports"
  ON rapports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Politique: Les superviseurs peuvent lire les rapports
CREATE POLICY "Superviseurs can read rapports"
  ON rapports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superviseur'
    )
  );

-- ============================================================================
-- FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour obtenir les statistiques d'une periode
CREATE OR REPLACE FUNCTION get_rapports_stats(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  nombre_rapports BIGINT,
  total_ventes_periode DECIMAL,
  total_encaissements_periode DECIMAL,
  total_depenses_periode DECIMAL,
  moyenne_ventes DECIMAL,
  moyenne_encaissements DECIMAL,
  moyenne_depenses DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS nombre_rapports,
    COALESCE(SUM(r.total_ventes), 0) AS total_ventes_periode,
    COALESCE(SUM(r.total_encaissement), 0) AS total_encaissements_periode,
    COALESCE(SUM(r.total_depense), 0) AS total_depenses_periode,
    COALESCE(AVG(r.total_ventes), 0) AS moyenne_ventes,
    COALESCE(AVG(r.total_encaissement), 0) AS moyenne_encaissements,
    COALESCE(AVG(r.total_depense), 0) AS moyenne_depenses
  FROM rapports r
  WHERE r.created_at >= p_start_date::timestamptz
    AND r.created_at <= (p_end_date + INTERVAL '1 day')::timestamptz;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les rapports avec objectifs positifs/negatifs
CREATE OR REPLACE FUNCTION get_rapports_by_performance(
  p_type TEXT, -- 'ventes', 'encaissement', 'depense'
  p_positif BOOLEAN
)
RETURNS SETOF rapports AS $$
BEGIN
  IF p_positif THEN
    RETURN QUERY
    SELECT *
    FROM rapports
    WHERE (objectifs->>p_type)::integer >= 0
    ORDER BY created_at DESC;
  ELSE
    RETURN QUERY
    SELECT *
    FROM rapports
    WHERE (objectifs->>p_type)::integer < 0
    ORDER BY created_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTAIRES SUR LA TABLE
-- ============================================================================

COMMENT ON TABLE rapports IS
  'Table des rapports journaliers. CRUD par les admins, lecture par les superviseurs.';

COMMENT ON COLUMN rapports.id IS
  'Identifiant unique du rapport';

COMMENT ON COLUMN rapports.denomination IS
  'Denomination unique au format rapport_DDMMYYYY';

COMMENT ON COLUMN rapports.total_ventes IS
  'Nombre total de ventes de la journee';

COMMENT ON COLUMN rapports.total_encaissement IS
  'Total des encaissements en FCFA';

COMMENT ON COLUMN rapports.total_depense IS
  'Total des depenses en FCFA';

COMMENT ON COLUMN rapports.objectifs IS
  'Ecarts en pourcentage par rapport aux objectifs: { ventes: %, encaissement: %, depense: % }';

COMMENT ON COLUMN rapports.created_by IS
  'Administrateur qui a cree le rapport';

COMMENT ON COLUMN rapports.created_at IS
  'Date et heure de creation du rapport';

COMMENT ON COLUMN rapports.updated_at IS
  'Date et heure de derniere modification';

-- ============================================================================
-- AFFICHER UN MESSAGE DE CONFIRMATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '+ Table rapports creee avec succes';
  RAISE NOTICE '+ Index crees pour optimisation';
  RAISE NOTICE '+ RLS active (CRUD admins, lecture superviseurs)';
  RAISE NOTICE '+ Fonctions utilitaires creees (get_rapports_stats, get_rapports_by_performance)';
  RAISE NOTICE '! Pensez a activer le realtime avec: ALTER PUBLICATION supabase_realtime ADD TABLE rapports;';
END $$;
