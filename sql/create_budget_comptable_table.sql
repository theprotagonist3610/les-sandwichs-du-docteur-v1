-- ============================================================================
-- CRÉATION DE LA TABLE BUDGET_COMPTABLE
-- ============================================================================
-- Gestion des budgets et prévisions mensuels avec comparaison au réalisé
-- Accès limité aux administrateurs et superviseurs uniquement
-- ============================================================================

-- Créer les types ENUM nécessaires
DO $$ BEGIN
  CREATE TYPE type_budget AS ENUM ('budget', 'prevision');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_budget AS ENUM ('brouillon', 'valide', 'cloture');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Créer la table budget_comptable
CREATE TABLE IF NOT EXISTS budget_comptable (
  -- Identifiant unique
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type de document
  type type_budget NOT NULL DEFAULT 'budget',

  -- Période concernée
  mois INTEGER NOT NULL CHECK (mois >= 1 AND mois <= 12),
  annee INTEGER NOT NULL CHECK (annee >= 2020 AND annee <= 2100),

  -- Détails du budget (structure JSON)
  details JSONB NOT NULL DEFAULT '{
    "comptes": {},
    "categories_depenses": {},
    "total_encaissements_prevus": 0,
    "total_depenses_prevues": 0,
    "solde_net_prevu": 0,
    "notes": "",
    "objectifs": []
  }'::jsonb,

  -- Statut du budget
  statut statut_budget NOT NULL DEFAULT 'brouillon',

  -- Validation
  valide_par UUID REFERENCES users(id) ON DELETE SET NULL,
  date_validation TIMESTAMPTZ,

  -- Utilisateur créateur
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Métadonnées et timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte d'unicité: un seul budget/prévision par type, mois et année
  CONSTRAINT unique_budget_period UNIQUE (type, mois, annee)
);

-- ============================================================================
-- INDEX POUR OPTIMISATION DES REQUÊTES
-- ============================================================================

-- Index sur le type de budget
CREATE INDEX IF NOT EXISTS idx_budget_comptable_type
  ON budget_comptable(type);

-- Index sur la période (mois, année)
CREATE INDEX IF NOT EXISTS idx_budget_comptable_periode
  ON budget_comptable(annee DESC, mois DESC);

-- Index sur le statut
CREATE INDEX IF NOT EXISTS idx_budget_comptable_statut
  ON budget_comptable(statut);

-- Index composé pour requêtes fréquentes (type + période)
CREATE INDEX IF NOT EXISTS idx_budget_comptable_type_periode
  ON budget_comptable(type, annee DESC, mois DESC);

-- Index pour recherche dans les détails JSON
CREATE INDEX IF NOT EXISTS idx_budget_comptable_details_gin
  ON budget_comptable USING gin(details);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_budget_comptable_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_budget_comptable_updated_at ON budget_comptable;
CREATE TRIGGER trigger_update_budget_comptable_updated_at
  BEFORE UPDATE ON budget_comptable
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_comptable_updated_at();

-- Trigger pour valider automatiquement la structure JSON
CREATE OR REPLACE FUNCTION validate_budget_details()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier que les champs obligatoires existent
  IF NOT (NEW.details ? 'comptes') THEN
    RAISE EXCEPTION 'Le champ "comptes" est obligatoire dans details';
  END IF;

  IF NOT (NEW.details ? 'total_encaissements_prevus') THEN
    NEW.details = jsonb_set(NEW.details, '{total_encaissements_prevus}', '0');
  END IF;

  IF NOT (NEW.details ? 'total_depenses_prevues') THEN
    NEW.details = jsonb_set(NEW.details, '{total_depenses_prevues}', '0');
  END IF;

  IF NOT (NEW.details ? 'solde_net_prevu') THEN
    NEW.details = jsonb_set(NEW.details, '{solde_net_prevu}', '0');
  END IF;

  -- Calculer automatiquement le solde net si les totaux sont présents
  NEW.details = jsonb_set(
    NEW.details,
    '{solde_net_prevu}',
    to_jsonb(
      (NEW.details->>'total_encaissements_prevus')::numeric -
      (NEW.details->>'total_depenses_prevues')::numeric
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_budget_details ON budget_comptable;
CREATE TRIGGER trigger_validate_budget_details
  BEFORE INSERT OR UPDATE ON budget_comptable
  FOR EACH ROW
  EXECUTE FUNCTION validate_budget_details();

-- Trigger pour enregistrer la date de validation
CREATE OR REPLACE FUNCTION set_budget_validation_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le statut passe à "valide" et qu'il n'y a pas de date de validation
  IF NEW.statut = 'valide' AND OLD.statut != 'valide' AND NEW.date_validation IS NULL THEN
    NEW.date_validation = NOW();
    NEW.valide_par = auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_budget_validation_date ON budget_comptable;
CREATE TRIGGER trigger_set_budget_validation_date
  BEFORE UPDATE ON budget_comptable
  FOR EACH ROW
  EXECUTE FUNCTION set_budget_validation_date();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS sur la table
ALTER TABLE budget_comptable ENABLE ROW LEVEL SECURITY;

-- Politique: Les administrateurs ont accès complet
CREATE POLICY "Admins have full access to budget_comptable"
  ON budget_comptable
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
CREATE POLICY "Superviseurs have full access to budget_comptable"
  ON budget_comptable
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

-- ============================================================================
-- FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour obtenir le budget d'un mois
CREATE OR REPLACE FUNCTION get_budget_mois(
  p_mois INTEGER,
  p_annee INTEGER,
  p_type type_budget DEFAULT 'budget'
)
RETURNS TABLE (
  id UUID,
  type type_budget,
  details JSONB,
  statut statut_budget,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.type,
    b.details,
    b.statut,
    b.created_at
  FROM budget_comptable b
  WHERE b.mois = p_mois
    AND b.annee = p_annee
    AND b.type = p_type
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour calculer le réalisé d'un mois (depuis operations_comptables)
CREATE OR REPLACE FUNCTION get_realise_mois(
  p_mois INTEGER,
  p_annee INTEGER
)
RETURNS TABLE (
  total_encaissements DECIMAL,
  total_depenses DECIMAL,
  solde_net DECIMAL,
  par_compte JSONB,
  nombre_operations BIGINT
) AS $$
DECLARE
  date_debut DATE;
  date_fin DATE;
  comptes_data JSONB;
BEGIN
  -- Calculer les dates de début et fin du mois
  date_debut := make_date(p_annee, p_mois, 1);
  date_fin := (date_debut + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Construire l'objet JSON pour chaque compte
  SELECT jsonb_object_agg(
    compte,
    jsonb_build_object(
      'encaissements', COALESCE(encaissements, 0),
      'depenses', COALESCE(depenses, 0),
      'solde', COALESCE(encaissements, 0) - COALESCE(depenses, 0)
    )
  )
  INTO comptes_data
  FROM (
    SELECT
      oc.compte,
      SUM(CASE WHEN oc.operation = 'encaissement' THEN oc.montant ELSE 0 END) AS encaissements,
      SUM(CASE WHEN oc.operation = 'depense' THEN oc.montant ELSE 0 END) AS depenses
    FROM operations_comptables oc
    WHERE oc.date_operation >= date_debut
      AND oc.date_operation <= date_fin
    GROUP BY oc.compte
  ) comptes_summary;

  -- Retourner les résultats
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN oc.operation = 'encaissement' THEN oc.montant ELSE 0 END), 0) AS total_encaissements,
    COALESCE(SUM(CASE WHEN oc.operation = 'depense' THEN oc.montant ELSE 0 END), 0) AS total_depenses,
    COALESCE(
      SUM(CASE WHEN oc.operation = 'encaissement' THEN oc.montant ELSE -oc.montant END),
      0
    ) AS solde_net,
    COALESCE(comptes_data, '{}'::jsonb) AS par_compte,
    COUNT(*)::BIGINT AS nombre_operations
  FROM operations_comptables oc
  WHERE oc.date_operation >= date_debut
    AND oc.date_operation <= date_fin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour comparer budget vs réalisé
CREATE OR REPLACE FUNCTION compare_budget_vs_realise(
  p_mois INTEGER,
  p_annee INTEGER
)
RETURNS JSONB AS $$
DECLARE
  budget_data RECORD;
  realise_data RECORD;
  result JSONB;
  ecarts JSONB;
  comptes_ecarts JSONB;
  compte_key TEXT;
  compte_budget JSONB;
  compte_realise JSONB;
BEGIN
  -- Récupérer le budget
  SELECT * INTO budget_data
  FROM get_budget_mois(p_mois, p_annee, 'budget');

  -- Récupérer le réalisé
  SELECT * INTO realise_data
  FROM get_realise_mois(p_mois, p_annee);

  -- Si pas de budget, retourner seulement le réalisé
  IF budget_data IS NULL THEN
    RETURN jsonb_build_object(
      'budget', NULL,
      'realise', jsonb_build_object(
        'total_encaissements', realise_data.total_encaissements,
        'total_depenses', realise_data.total_depenses,
        'solde_net', realise_data.solde_net,
        'par_compte', realise_data.par_compte
      ),
      'ecarts', NULL,
      'message', 'Aucun budget défini pour cette période'
    );
  END IF;

  -- Calculer les écarts globaux
  ecarts := jsonb_build_object(
    'encaissements', jsonb_build_object(
      'prevu', (budget_data.details->>'total_encaissements_prevus')::numeric,
      'realise', realise_data.total_encaissements,
      'ecart', realise_data.total_encaissements - (budget_data.details->>'total_encaissements_prevus')::numeric,
      'taux_realisation', CASE
        WHEN (budget_data.details->>'total_encaissements_prevus')::numeric = 0 THEN 0
        ELSE ROUND((realise_data.total_encaissements / (budget_data.details->>'total_encaissements_prevus')::numeric) * 100, 2)
      END
    ),
    'depenses', jsonb_build_object(
      'prevu', (budget_data.details->>'total_depenses_prevues')::numeric,
      'realise', realise_data.total_depenses,
      'ecart', realise_data.total_depenses - (budget_data.details->>'total_depenses_prevues')::numeric,
      'taux_realisation', CASE
        WHEN (budget_data.details->>'total_depenses_prevues')::numeric = 0 THEN 0
        ELSE ROUND((realise_data.total_depenses / (budget_data.details->>'total_depenses_prevues')::numeric) * 100, 2)
      END
    ),
    'solde_net', jsonb_build_object(
      'prevu', (budget_data.details->>'solde_net_prevu')::numeric,
      'realise', realise_data.solde_net,
      'ecart', realise_data.solde_net - (budget_data.details->>'solde_net_prevu')::numeric
    )
  );

  -- Calculer les écarts par compte
  comptes_ecarts := '{}'::jsonb;
  FOR compte_key IN SELECT jsonb_object_keys(budget_data.details->'comptes')
  LOOP
    compte_budget := budget_data.details->'comptes'->compte_key;
    compte_realise := COALESCE(realise_data.par_compte->compte_key, '{"encaissements":0,"depenses":0,"solde":0}'::jsonb);

    comptes_ecarts := comptes_ecarts || jsonb_build_object(
      compte_key,
      jsonb_build_object(
        'encaissements', jsonb_build_object(
          'prevu', COALESCE((compte_budget->>'encaissements_prevus')::numeric, 0),
          'realise', COALESCE((compte_realise->>'encaissements')::numeric, 0),
          'ecart', COALESCE((compte_realise->>'encaissements')::numeric, 0) - COALESCE((compte_budget->>'encaissements_prevus')::numeric, 0)
        ),
        'depenses', jsonb_build_object(
          'prevu', COALESCE((compte_budget->>'depenses_prevues')::numeric, 0),
          'realise', COALESCE((compte_realise->>'depenses')::numeric, 0),
          'ecart', COALESCE((compte_realise->>'depenses')::numeric, 0) - COALESCE((compte_budget->>'depenses_prevues')::numeric, 0)
        ),
        'solde', jsonb_build_object(
          'prevu', COALESCE((compte_budget->>'solde_prevu')::numeric, 0),
          'realise', COALESCE((compte_realise->>'solde')::numeric, 0),
          'ecart', COALESCE((compte_realise->>'solde')::numeric, 0) - COALESCE((compte_budget->>'solde_prevu')::numeric, 0)
        )
      )
    );
  END LOOP;

  -- Construire le résultat final
  result := jsonb_build_object(
    'budget', budget_data.details,
    'realise', jsonb_build_object(
      'total_encaissements', realise_data.total_encaissements,
      'total_depenses', realise_data.total_depenses,
      'solde_net', realise_data.solde_net,
      'par_compte', realise_data.par_compte,
      'nombre_operations', realise_data.nombre_operations
    ),
    'ecarts', jsonb_build_object(
      'global', ecarts,
      'par_compte', comptes_ecarts
    ),
    'statut_budget', budget_data.statut
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTAIRES SUR LA TABLE
-- ============================================================================

COMMENT ON TABLE budget_comptable IS
  'Table de gestion des budgets et prévisions mensuels. Accessible uniquement aux administrateurs et superviseurs.';

COMMENT ON COLUMN budget_comptable.type IS
  'Type de document: budget (contraignant) ou prévision (indicatif)';

COMMENT ON COLUMN budget_comptable.mois IS
  'Mois concerné (1-12)';

COMMENT ON COLUMN budget_comptable.annee IS
  'Année concernée';

COMMENT ON COLUMN budget_comptable.details IS
  'Structure JSON contenant les prévisions par compte et catégories';

COMMENT ON COLUMN budget_comptable.statut IS
  'Statut du budget: brouillon, valide, ou cloture';

-- ============================================================================
-- AFFICHER UN MESSAGE DE CONFIRMATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Table budget_comptable créée avec succès';
  RAISE NOTICE '✓ Index créés pour optimisation';
  RAISE NOTICE '✓ RLS activé (accès limité aux admins et superviseurs)';
  RAISE NOTICE '✓ Triggers créés (validation JSON, calcul automatique du solde)';
  RAISE NOTICE '✓ Fonctions créées:';
  RAISE NOTICE '  - get_budget_mois(mois, annee, type)';
  RAISE NOTICE '  - get_realise_mois(mois, annee)';
  RAISE NOTICE '  - compare_budget_vs_realise(mois, annee)';
  RAISE NOTICE 'ℹ Pensez à activer le realtime avec le script enable_realtime_budget_comptable.sql';
END $$;
