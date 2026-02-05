# Installation du système de comptabilité - Supabase

Ce guide vous aide à installer toutes les tables et fonctions nécessaires pour le système de comptabilité dans Supabase.

## Ordre d'exécution des scripts

Exécutez les scripts dans cet ordre exact pour éviter les erreurs de dépendances.

---

## 1. Table `operations_comptables`

Cette table stocke toutes les opérations comptables (encaissements et dépenses).

**Fichier**: `create_operations_comptables_table.sql`

```sql
-- ============================================================================
-- TABLE OPERATIONS_COMPTABLES
-- ============================================================================

-- Créer les types ENUM
CREATE TYPE type_operation AS ENUM ('encaissement', 'depense');
CREATE TYPE type_compte AS ENUM ('caisse', 'MTN MoMo', 'Moov Money', 'Celtiis Cash', 'banque', 'autre');

-- Créer la table
CREATE TABLE IF NOT EXISTS operations_comptables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation type_operation NOT NULL,
  compte type_compte NOT NULL DEFAULT 'caisse',
  montant DECIMAL(10, 2) NOT NULL CHECK (montant > 0),
  motif TEXT NOT NULL,
  date_operation DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_operations_comptables_date ON operations_comptables(date_operation);
CREATE INDEX IF NOT EXISTS idx_operations_comptables_user ON operations_comptables(user_id);
CREATE INDEX IF NOT EXISTS idx_operations_comptables_operation ON operations_comptables(operation);
CREATE INDEX IF NOT EXISTS idx_operations_comptables_compte ON operations_comptables(compte);
CREATE INDEX IF NOT EXISTS idx_operations_comptables_created_at ON operations_comptables(created_at);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_operations_comptables_updated_at
  BEFORE UPDATE ON operations_comptables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE operations_comptables ENABLE ROW LEVEL SECURITY;

-- Les admins ont un accès complet
CREATE POLICY "Admins have full access to operations_comptables"
  ON operations_comptables FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- Les superviseurs ont un accès complet
CREATE POLICY "Superviseurs have full access to operations_comptables"
  ON operations_comptables FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'superviseur'
  ));

-- Les vendeurs peuvent seulement lire
CREATE POLICY "Vendeurs can read operations_comptables"
  ON operations_comptables FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'vendeur'
  ));

-- ============================================================================
-- FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour obtenir le solde d'un compte à une date donnée
CREATE OR REPLACE FUNCTION get_solde_compte(
  p_compte type_compte DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL AS $$
DECLARE
  v_total_encaissements DECIMAL := 0;
  v_total_depenses DECIMAL := 0;
BEGIN
  -- Calculer le total des encaissements
  SELECT COALESCE(SUM(montant), 0) INTO v_total_encaissements
  FROM operations_comptables
  WHERE operation = 'encaissement'
    AND (p_compte IS NULL OR compte = p_compte)
    AND (p_start_date IS NULL OR date_operation >= p_start_date)
    AND date_operation <= p_end_date;

  -- Calculer le total des dépenses
  SELECT COALESCE(SUM(montant), 0) INTO v_total_depenses
  FROM operations_comptables
  WHERE operation = 'depense'
    AND (p_compte IS NULL OR compte = p_compte)
    AND (p_start_date IS NULL OR date_operation >= p_start_date)
    AND date_operation <= p_end_date;

  -- Retourner le solde net
  RETURN v_total_encaissements - v_total_depenses;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir le solde de tous les comptes
CREATE OR REPLACE FUNCTION get_solde_total(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  compte type_compte,
  total_encaissements DECIMAL,
  total_depenses DECIMAL,
  solde DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.compte,
    COALESCE(SUM(CASE WHEN c.operation = 'encaissement' THEN c.montant ELSE 0 END), 0) AS total_encaissements,
    COALESCE(SUM(CASE WHEN c.operation = 'depense' THEN c.montant ELSE 0 END), 0) AS total_depenses,
    COALESCE(SUM(CASE WHEN c.operation = 'encaissement' THEN c.montant ELSE -c.montant END), 0) AS solde
  FROM operations_comptables c
  WHERE (p_start_date IS NULL OR c.date_operation >= p_start_date)
    AND c.date_operation <= p_end_date
  GROUP BY c.compte
  ORDER BY c.compte;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les statistiques comptables
CREATE OR REPLACE FUNCTION get_statistiques_comptables(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_encaissements DECIMAL,
  total_depenses DECIMAL,
  solde_net DECIMAL,
  nombre_operations INTEGER,
  nombre_encaissements INTEGER,
  nombre_depenses INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN operation = 'encaissement' THEN montant ELSE 0 END), 0) AS total_encaissements,
    COALESCE(SUM(CASE WHEN operation = 'depense' THEN montant ELSE 0 END), 0) AS total_depenses,
    COALESCE(SUM(CASE WHEN operation = 'encaissement' THEN montant ELSE -montant END), 0) AS solde_net,
    COUNT(*)::INTEGER AS nombre_operations,
    COUNT(CASE WHEN operation = 'encaissement' THEN 1 END)::INTEGER AS nombre_encaissements,
    COUNT(CASE WHEN operation = 'depense' THEN 1 END)::INTEGER AS nombre_depenses
  FROM operations_comptables
  WHERE date_operation >= p_start_date
    AND date_operation <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2. Activer Realtime pour `operations_comptables`

**Fichier**: `enable_realtime_operations_comptables.sql`

```sql
-- ============================================================================
-- ACTIVATION REALTIME POUR OPERATIONS_COMPTABLES
-- ============================================================================

-- Activer la réplication en temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE operations_comptables;
```

---

## 3. Table `budget_comptable`

Cette table stocke les budgets et prévisions mensuels.

**Fichier**: `create_budget_comptable_table.sql`

```sql
-- ============================================================================
-- TABLE BUDGET_COMPTABLE
-- ============================================================================

-- Créer les types ENUM
CREATE TYPE type_budget AS ENUM ('budget', 'prevision');
CREATE TYPE statut_budget AS ENUM ('brouillon', 'valide', 'cloture');

-- Créer la table
CREATE TABLE IF NOT EXISTS budget_comptable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type type_budget NOT NULL DEFAULT 'budget',
  mois INTEGER NOT NULL CHECK (mois >= 1 AND mois <= 12),
  annee INTEGER NOT NULL CHECK (annee >= 2020 AND annee <= 2100),
  details JSONB NOT NULL DEFAULT '{
    "comptes": {},
    "total_encaissements": 0,
    "total_depenses": 0,
    "solde_net": 0,
    "commentaire": ""
  }'::jsonb,
  statut statut_budget NOT NULL DEFAULT 'brouillon',
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte d'unicité : un seul budget/prévision par mois et année
  CONSTRAINT unique_budget_period UNIQUE (type, mois, annee)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_budget_comptable_mois_annee ON budget_comptable(mois, annee);
CREATE INDEX IF NOT EXISTS idx_budget_comptable_type ON budget_comptable(type);
CREATE INDEX IF NOT EXISTS idx_budget_comptable_statut ON budget_comptable(statut);
CREATE INDEX IF NOT EXISTS idx_budget_comptable_user ON budget_comptable(user_id);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_budget_comptable_updated_at
  BEFORE UPDATE ON budget_comptable
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE budget_comptable ENABLE ROW LEVEL SECURITY;

-- Les admins ont un accès complet
CREATE POLICY "Admins have full access to budget_comptable"
  ON budget_comptable FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

-- Les superviseurs ont un accès complet
CREATE POLICY "Superviseurs have full access to budget_comptable"
  ON budget_comptable FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'superviseur'
  ));

-- ============================================================================
-- FONCTIONS POUR LE BUDGET
-- ============================================================================

-- Fonction pour obtenir le réalisé d'un mois
CREATE OR REPLACE FUNCTION get_realise_mois(
  p_mois INTEGER,
  p_annee INTEGER
)
RETURNS TABLE (
  total_encaissements DECIMAL,
  total_depenses DECIMAL,
  solde_net DECIMAL,
  comptes JSONB
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_comptes JSONB := '{}'::jsonb;
  v_compte type_compte;
  v_enc DECIMAL;
  v_dep DECIMAL;
BEGIN
  -- Calculer les dates de début et fin du mois
  v_start_date := make_date(p_annee, p_mois, 1);
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Calculer les totaux par compte
  FOR v_compte IN SELECT unnest(enum_range(NULL::type_compte))
  LOOP
    SELECT
      COALESCE(SUM(CASE WHEN operation = 'encaissement' THEN montant ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN operation = 'depense' THEN montant ELSE 0 END), 0)
    INTO v_enc, v_dep
    FROM operations_comptables
    WHERE compte = v_compte
      AND date_operation >= v_start_date
      AND date_operation <= v_end_date;

    v_comptes := jsonb_set(
      v_comptes,
      ARRAY[v_compte::text],
      jsonb_build_object(
        'encaissements', v_enc,
        'depenses', v_dep
      )
    );
  END LOOP;

  -- Calculer les totaux globaux
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN operation = 'encaissement' THEN montant ELSE 0 END), 0) AS total_encaissements,
    COALESCE(SUM(CASE WHEN operation = 'depense' THEN montant ELSE 0 END), 0) AS total_depenses,
    COALESCE(SUM(CASE WHEN operation = 'encaissement' THEN montant ELSE -montant END), 0) AS solde_net,
    v_comptes AS comptes
  FROM operations_comptables
  WHERE date_operation >= v_start_date
    AND date_operation <= v_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour comparer budget vs réalisé
CREATE OR REPLACE FUNCTION compare_budget_vs_realise(
  p_mois INTEGER,
  p_annee INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_budget budget_comptable%ROWTYPE;
  v_realise RECORD;
  v_result JSONB;
  v_ecarts JSONB := '{}'::jsonb;
  v_ecarts_par_compte JSONB := '{}'::jsonb;
  v_compte_key TEXT;
  v_budget_compte JSONB;
  v_realise_compte JSONB;
BEGIN
  -- Récupérer le budget
  SELECT * INTO v_budget
  FROM budget_comptable
  WHERE type = 'budget'
    AND mois = p_mois
    AND annee = p_annee
  LIMIT 1;

  -- Récupérer le réalisé
  SELECT * INTO v_realise
  FROM get_realise_mois(p_mois, p_annee);

  -- Si pas de budget, retourner juste le réalisé
  IF v_budget.id IS NULL THEN
    RETURN jsonb_build_object(
      'budget', NULL,
      'realise', row_to_json(v_realise)::jsonb,
      'ecarts', NULL
    );
  END IF;

  -- Calculer les écarts globaux
  v_ecarts := jsonb_build_object(
    'global', jsonb_build_object(
      'encaissements', jsonb_build_object(
        'prevu', v_budget.details->'total_encaissements',
        'realise', v_realise.total_encaissements,
        'ecart', v_realise.total_encaissements - (v_budget.details->>'total_encaissements')::DECIMAL,
        'taux_realisation', CASE
          WHEN (v_budget.details->>'total_encaissements')::DECIMAL > 0
          THEN (v_realise.total_encaissements / (v_budget.details->>'total_encaissements')::DECIMAL * 100)
          ELSE 0
        END
      ),
      'depenses', jsonb_build_object(
        'prevu', v_budget.details->'total_depenses',
        'realise', v_realise.total_depenses,
        'ecart', v_realise.total_depenses - (v_budget.details->>'total_depenses')::DECIMAL,
        'taux_realisation', CASE
          WHEN (v_budget.details->>'total_depenses')::DECIMAL > 0
          THEN (v_realise.total_depenses / (v_budget.details->>'total_depenses')::DECIMAL * 100)
          ELSE 0
        END
      )
    )
  );

  -- Calculer les écarts par compte
  FOR v_compte_key IN SELECT jsonb_object_keys(v_budget.details->'comptes')
  LOOP
    v_budget_compte := v_budget.details->'comptes'->v_compte_key;
    v_realise_compte := v_realise.comptes->v_compte_key;

    v_ecarts_par_compte := jsonb_set(
      v_ecarts_par_compte,
      ARRAY[v_compte_key],
      jsonb_build_object(
        'encaissements', jsonb_build_object(
          'prevu', v_budget_compte->'encaissements',
          'realise', v_realise_compte->'encaissements',
          'ecart', (v_realise_compte->>'encaissements')::DECIMAL - (v_budget_compte->>'encaissements')::DECIMAL,
          'taux_realisation', CASE
            WHEN (v_budget_compte->>'encaissements')::DECIMAL > 0
            THEN ((v_realise_compte->>'encaissements')::DECIMAL / (v_budget_compte->>'encaissements')::DECIMAL * 100)
            ELSE 0
          END
        ),
        'depenses', jsonb_build_object(
          'prevu', v_budget_compte->'depenses',
          'realise', v_realise_compte->'depenses',
          'ecart', (v_realise_compte->>'depenses')::DECIMAL - (v_budget_compte->>'depenses')::DECIMAL,
          'taux_realisation', CASE
            WHEN (v_budget_compte->>'depenses')::DECIMAL > 0
            THEN ((v_realise_compte->>'depenses')::DECIMAL / (v_budget_compte->>'depenses')::DECIMAL * 100)
            ELSE 0
          END
        )
      )
    );
  END LOOP;

  v_ecarts := jsonb_set(v_ecarts, ARRAY['par_compte'], v_ecarts_par_compte);

  -- Construire le résultat final
  v_result := jsonb_build_object(
    'budget', row_to_json(v_budget)::jsonb,
    'realise', row_to_json(v_realise)::jsonb,
    'ecarts', v_ecarts
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. Activer Realtime pour `budget_comptable`

**Fichier**: `enable_realtime_budget_comptable.sql`

```sql
-- ============================================================================
-- ACTIVATION REALTIME POUR BUDGET_COMPTABLE
-- ============================================================================

-- Activer la réplication en temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE budget_comptable;
```

---

## Instructions d'installation

### Via l'interface Supabase (Recommandé)

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor**
3. Créez une nouvelle requête
4. Copiez-collez le contenu du **script 1** (operations_comptables)
5. Cliquez sur **Run**
6. Répétez pour chaque script dans l'ordre

### Via la CLI Supabase

```bash
# Se connecter au projet
supabase link --project-ref your-project-ref

# Exécuter les scripts dans l'ordre
supabase db execute < sql/create_operations_comptables_table.sql
supabase db execute < sql/enable_realtime_operations_comptables.sql
supabase db execute < sql/create_budget_comptable_table.sql
supabase db execute < sql/enable_realtime_budget_comptable.sql
```

---

## Vérification de l'installation

Après avoir exécuté tous les scripts, vérifiez que tout fonctionne:

```sql
-- Vérifier que les tables existent
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('operations_comptables', 'budget_comptable');

-- Vérifier les fonctions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_solde_compte',
  'get_solde_total',
  'get_statistiques_comptables',
  'get_realise_mois',
  'compare_budget_vs_realise'
);

-- Vérifier les types ENUM
SELECT typname
FROM pg_type
WHERE typname IN (
  'type_operation',
  'type_compte',
  'type_budget',
  'statut_budget'
);

-- Vérifier le realtime
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

---

## Résolution de problèmes

### Erreur: "type already exists"
Si vous obtenez cette erreur, les types ENUM existent déjà. Vous pouvez:
- Ignorer l'erreur et continuer
- Ou supprimer les types existants (attention, cela supprimera les tables associées)

### Erreur: "relation already exists"
Les tables existent déjà. Vous pouvez:
- Utiliser `DROP TABLE IF EXISTS` avant de créer la table
- Ou ignorer si les tables sont déjà créées

### Permissions insuffisantes
Assurez-vous d'être connecté avec un utilisateur ayant les droits `postgres` ou administrateur.

---

## Prochaines étapes

Une fois l'installation terminée:

1. ✅ Les tables sont créées
2. ✅ Les fonctions PostgreSQL sont disponibles
3. ✅ Le realtime est activé
4. ✅ Les RLS sont configurés
5. 🚀 Vous pouvez utiliser l'application frontend

Le système de comptabilité est maintenant opérationnel!
