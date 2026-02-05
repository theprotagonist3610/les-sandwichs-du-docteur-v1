-- ============================================================================
-- CRÉATION DE LA TABLE OPERATIONS_COMPTABLES
-- ============================================================================
-- Gestion de la comptabilité de caisse avec encaissements et dépenses
-- Accès limité aux administrateurs et superviseurs uniquement
-- ============================================================================

-- Créer les types ENUM nécessaires
DO $$ BEGIN
  CREATE TYPE type_operation AS ENUM ('encaissement', 'depense');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE type_compte AS ENUM ('caisse', 'MTN MoMo', 'Moov Money', 'Celtiis Cash', 'banque', 'autre');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Créer la table operations_comptables
CREATE TABLE IF NOT EXISTS operations_comptables (
  -- Identifiant unique
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type d'opération
  operation type_operation NOT NULL,

  -- Compte concerné
  compte type_compte NOT NULL DEFAULT 'caisse',

  -- Montant de l'opération
  montant DECIMAL(10, 2) NOT NULL CHECK (montant > 0),

  -- Motif/Description de l'opération
  motif TEXT NOT NULL,

  -- Date de l'opération (peut être différente de created_at pour saisie rétroactive)
  date_operation DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Utilisateur qui a effectué l'opération
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Métadonnées et timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEX POUR OPTIMISATION DES REQUÊTES
-- ============================================================================

-- Index sur le type d'opération (pour filtres)
CREATE INDEX IF NOT EXISTS idx_operations_comptables_operation
  ON operations_comptables(operation);

-- Index sur le compte (pour filtres et calculs de soldes)
CREATE INDEX IF NOT EXISTS idx_operations_comptables_compte
  ON operations_comptables(compte);

-- Index sur la date d'opération (pour filtres et statistiques par période)
CREATE INDEX IF NOT EXISTS idx_operations_comptables_date_operation
  ON operations_comptables(date_operation DESC);

-- Index sur l'utilisateur (pour filtres par utilisateur)
CREATE INDEX IF NOT EXISTS idx_operations_comptables_user_id
  ON operations_comptables(user_id);

-- Index composé pour requêtes fréquentes (compte + date)
CREATE INDEX IF NOT EXISTS idx_operations_comptables_compte_date
  ON operations_comptables(compte, date_operation DESC);

-- Index pour recherche dans le motif (recherche textuelle)
CREATE INDEX IF NOT EXISTS idx_operations_comptables_motif_gin
  ON operations_comptables USING gin(to_tsvector('french', motif));

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_operations_comptables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_operations_comptables_updated_at ON operations_comptables;
CREATE TRIGGER trigger_update_operations_comptables_updated_at
  BEFORE UPDATE ON operations_comptables
  FOR EACH ROW
  EXECUTE FUNCTION update_operations_comptables_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS sur la table
ALTER TABLE operations_comptables ENABLE ROW LEVEL SECURITY;

-- Politique: Les administrateurs ont accès complet
CREATE POLICY "Admins have full access to operations_comptables"
  ON operations_comptables
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

-- Politique: Les superviseurs ont accès complet
CREATE POLICY "Superviseurs have full access to operations_comptables"
  ON operations_comptables
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superviseur'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'superviseur'
    )
  );

-- Politique: Les autres rôles n'ont AUCUN accès
-- (Pas besoin de policy explicite de refus, RLS bloque par défaut)

-- ============================================================================
-- FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour calculer le solde d'un compte
CREATE OR REPLACE FUNCTION get_solde_compte(
  p_compte type_compte,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  encaissements DECIMAL,
  depenses DECIMAL,
  solde DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN operation = 'encaissement' THEN montant ELSE 0 END), 0) AS encaissements,
    COALESCE(SUM(CASE WHEN operation = 'depense' THEN montant ELSE 0 END), 0) AS depenses,
    COALESCE(
      SUM(CASE WHEN operation = 'encaissement' THEN montant ELSE -montant END),
      0
    ) AS solde
  FROM operations_comptables
  WHERE compte = p_compte
    AND (p_start_date IS NULL OR date_operation >= p_start_date)
    AND (p_end_date IS NULL OR date_operation <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour calculer le solde total (tous comptes)
CREATE OR REPLACE FUNCTION get_solde_total(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  encaissements DECIMAL,
  depenses DECIMAL,
  solde DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN operation = 'encaissement' THEN montant ELSE 0 END), 0) AS encaissements,
    COALESCE(SUM(CASE WHEN operation = 'depense' THEN montant ELSE 0 END), 0) AS depenses,
    COALESCE(
      SUM(CASE WHEN operation = 'encaissement' THEN montant ELSE -montant END),
      0
    ) AS solde
  FROM operations_comptables
  WHERE (p_start_date IS NULL OR date_operation >= p_start_date)
    AND (p_end_date IS NULL OR date_operation <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les statistiques par période
CREATE OR REPLACE FUNCTION get_statistiques_comptables(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  compte type_compte,
  encaissements DECIMAL,
  depenses DECIMAL,
  solde DECIMAL,
  nombre_operations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    oc.compte,
    COALESCE(SUM(CASE WHEN oc.operation = 'encaissement' THEN oc.montant ELSE 0 END), 0) AS encaissements,
    COALESCE(SUM(CASE WHEN oc.operation = 'depense' THEN oc.montant ELSE 0 END), 0) AS depenses,
    COALESCE(
      SUM(CASE WHEN oc.operation = 'encaissement' THEN oc.montant ELSE -oc.montant END),
      0
    ) AS solde,
    COUNT(*) AS nombre_operations
  FROM operations_comptables oc
  WHERE oc.date_operation >= p_start_date
    AND oc.date_operation <= p_end_date
  GROUP BY oc.compte
  ORDER BY oc.compte;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTAIRES SUR LA TABLE
-- ============================================================================

COMMENT ON TABLE operations_comptables IS
  'Table de gestion de la comptabilité de caisse. Accessible uniquement aux administrateurs et superviseurs.';

COMMENT ON COLUMN operations_comptables.id IS
  'Identifiant unique de l''opération';

COMMENT ON COLUMN operations_comptables.operation IS
  'Type d''opération: encaissement ou dépense';

COMMENT ON COLUMN operations_comptables.compte IS
  'Type de compte: caisse, MTN MoMo, Moov Money, Celtiis Cash, banque, ou autre';

COMMENT ON COLUMN operations_comptables.montant IS
  'Montant de l''opération en FCFA (doit être positif)';

COMMENT ON COLUMN operations_comptables.motif IS
  'Description/motif de l''opération';

COMMENT ON COLUMN operations_comptables.date_operation IS
  'Date effective de l''opération (peut différer de created_at pour saisie rétroactive)';

COMMENT ON COLUMN operations_comptables.user_id IS
  'Utilisateur qui a enregistré l''opération';

COMMENT ON COLUMN operations_comptables.created_at IS
  'Date et heure de création de l''enregistrement';

COMMENT ON COLUMN operations_comptables.updated_at IS
  'Date et heure de dernière modification';

-- ============================================================================
-- AFFICHER UN MESSAGE DE CONFIRMATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Table operations_comptables créée avec succès';
  RAISE NOTICE '✓ Index créés pour optimisation';
  RAISE NOTICE '✓ RLS activé (accès limité aux admins et superviseurs)';
  RAISE NOTICE '✓ Fonctions utilitaires créées (get_solde_compte, get_solde_total, get_statistiques_comptables)';
  RAISE NOTICE 'ℹ Pensez à activer le realtime avec: ALTER PUBLICATION supabase_realtime ADD TABLE operations_comptables;';
END $$;
