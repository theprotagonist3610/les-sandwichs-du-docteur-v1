-- ============================================================================
-- MIGRATION 009 : Tables de gestion de la production
-- Tables : production_schemas, productions
-- ============================================================================

-- ============================================================================
-- TABLE : production_schemas
-- Schémas de production (recettes de fabrication standardisées)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.production_schemas (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nom                       VARCHAR(200)  NOT NULL,
  categorie                 VARCHAR(20)   NOT NULL
                              CHECK (categorie IN ('pain', 'sauce', 'garniture', 'boisson', 'autre')),
  ingredient_principal      JSONB         NOT NULL
                              DEFAULT '{"nom": "", "unite": "", "quantite": 0}'::jsonb,
  ingredients_secondaires   JSONB         NOT NULL DEFAULT '[]'::jsonb,
  rendement_estime          JSONB,
  duree_preparation_minutes INTEGER       CHECK (duree_preparation_minutes > 0),
  notes                     TEXT,
  actif                     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_by                UUID          REFERENCES public.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_production_schemas_categorie
  ON public.production_schemas(categorie);

CREATE INDEX IF NOT EXISTS idx_production_schemas_actif
  ON public.production_schemas(actif);

CREATE INDEX IF NOT EXISTS idx_production_schemas_nom
  ON public.production_schemas(nom);

CREATE INDEX IF NOT EXISTS idx_production_schemas_created_by
  ON public.production_schemas(created_by);

-- Index GIN pour recherche dans les JSONB
CREATE INDEX IF NOT EXISTS idx_production_schemas_ingredient_principal
  ON public.production_schemas USING GIN (ingredient_principal);

-- Commentaires
COMMENT ON TABLE public.production_schemas IS
  'Schémas de production : recettes standardisées définissant les ingrédients et rendements estimés';
COMMENT ON COLUMN public.production_schemas.nom IS
  'Nom du schéma de production (ex. Sauce mayo maison)';
COMMENT ON COLUMN public.production_schemas.categorie IS
  'Catégorie : pain, sauce, garniture, boisson, autre';
COMMENT ON COLUMN public.production_schemas.ingredient_principal IS
  'Ingrédient principal : { nom, unite, quantite }';
COMMENT ON COLUMN public.production_schemas.ingredients_secondaires IS
  'Liste des ingrédients secondaires : [{ nom, unite, quantite }]';
COMMENT ON COLUMN public.production_schemas.rendement_estime IS
  'Rendement estimé : { quantite, unite }';
COMMENT ON COLUMN public.production_schemas.duree_preparation_minutes IS
  'Durée de préparation estimée en minutes';
COMMENT ON COLUMN public.production_schemas.actif IS
  'Schéma actif (false = archivé, conservé pour historique)';
COMMENT ON COLUMN public.production_schemas.created_by IS
  'Utilisateur ayant créé ce schéma';


-- ============================================================================
-- TABLE : productions
-- Instances de production (exécutions réelles d'un schéma)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.productions (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id               UUID          NOT NULL
                            REFERENCES public.production_schemas(id) ON DELETE RESTRICT,
  nom                     VARCHAR(200)  NOT NULL,
  statut                  VARCHAR(20)   NOT NULL DEFAULT 'terminee'
                            CHECK (statut IN ('planifiee', 'en_cours', 'terminee', 'annulee')),
  production              JSONB         NOT NULL DEFAULT '{}'::jsonb,
  cout_total              NUMERIC(12,2) NOT NULL DEFAULT 0
                            CHECK (cout_total >= 0),
  cout_unitaire           NUMERIC(12,2) NOT NULL DEFAULT 0
                            CHECK (cout_unitaire >= 0),
  date_production         DATE          NOT NULL,
  duree_reelle_minutes    INTEGER       CHECK (duree_reelle_minutes > 0),
  rendement_reel          JSONB,
  taux_rendement          NUMERIC(8,2),
  ecart_cout              NUMERIC(12,2),
  resultats               JSONB         NOT NULL DEFAULT '[]'::jsonb,
  operateur_id            UUID          REFERENCES public.users(id) ON DELETE SET NULL,
  notes                   TEXT,
  created_by              UUID          REFERENCES public.users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_productions_schema_id
  ON public.productions(schema_id);

CREATE INDEX IF NOT EXISTS idx_productions_statut
  ON public.productions(statut);

CREATE INDEX IF NOT EXISTS idx_productions_date_production
  ON public.productions(date_production DESC);

CREATE INDEX IF NOT EXISTS idx_productions_operateur_id
  ON public.productions(operateur_id);

CREATE INDEX IF NOT EXISTS idx_productions_created_by
  ON public.productions(created_by);

-- Index composite pour les requêtes analytiques courantes
CREATE INDEX IF NOT EXISTS idx_productions_schema_date
  ON public.productions(schema_id, date_production DESC);

CREATE INDEX IF NOT EXISTS idx_productions_statut_date
  ON public.productions(statut, date_production DESC);

-- Index GIN pour les JSONB
CREATE INDEX IF NOT EXISTS idx_productions_production_jsonb
  ON public.productions USING GIN (production);

-- Commentaires
COMMENT ON TABLE public.productions IS
  'Instances de production : exécutions réelles d''un schéma de production avec coûts et rendements réels';
COMMENT ON COLUMN public.productions.schema_id IS
  'Référence au schéma de production utilisé';
COMMENT ON COLUMN public.productions.nom IS
  'Nom de l''instance de production';
COMMENT ON COLUMN public.productions.statut IS
  'Statut : planifiee, en_cours, terminee, annulee';
COMMENT ON COLUMN public.productions.production IS
  'Snapshot des ingrédients avec coûts réels : { ingredient_principal: { nom, unite, quantite, cout_unitaire, cout_total }, ingredients_secondaires: [...] }';
COMMENT ON COLUMN public.productions.cout_total IS
  'Coût total réel de la production (somme des coûts de tous les ingrédients)';
COMMENT ON COLUMN public.productions.cout_unitaire IS
  'Coût par unité produite = cout_total / rendement_reel.quantite';
COMMENT ON COLUMN public.productions.date_production IS
  'Date à laquelle la production a été réalisée';
COMMENT ON COLUMN public.productions.duree_reelle_minutes IS
  'Durée réelle de la production en minutes';
COMMENT ON COLUMN public.productions.rendement_reel IS
  'Rendement réel obtenu : { quantite, unite }';
COMMENT ON COLUMN public.productions.taux_rendement IS
  'Taux de rendement en % : (rendement_reel / rendement_estime) * 100';
COMMENT ON COLUMN public.productions.ecart_cout IS
  'Écart de coût : cout_total_reel - cout_estime. Positif = dépassement, négatif = économie';
COMMENT ON COLUMN public.productions.resultats IS
  'Résultats détaillés : [{ nom, quantite }]';
COMMENT ON COLUMN public.productions.operateur_id IS
  'Utilisateur ayant réalisé la production';
COMMENT ON COLUMN public.productions.created_by IS
  'Utilisateur ayant saisi cette production dans le système';


-- ============================================================================
-- TRIGGER : updated_at automatique
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_productions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_production_schemas_updated_at
  BEFORE UPDATE ON public.production_schemas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_productions_updated_at();

CREATE TRIGGER trigger_update_productions_updated_at
  BEFORE UPDATE ON public.productions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_productions_updated_at();


-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.production_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productions ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────
-- production_schemas — Lecture
-- Tous les utilisateurs authentifiés actifs peuvent lire
-- ────────────────────────────────────────────────────────────────

CREATE POLICY "authenticated_read_production_schemas"
  ON public.production_schemas
  FOR SELECT
  TO authenticated
  USING (
    public.is_current_user_active() = true
  );

-- ────────────────────────────────────────────────────────────────
-- production_schemas — Écriture (admin + superviseur)
-- ────────────────────────────────────────────────────────────────

CREATE POLICY "supervisors_admins_insert_production_schemas"
  ON public.production_schemas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_current_user_role() IN ('admin', 'superviseur')
    AND public.is_current_user_active() = true
  );

CREATE POLICY "supervisors_admins_update_production_schemas"
  ON public.production_schemas
  FOR UPDATE
  TO authenticated
  USING (
    public.get_current_user_role() IN ('admin', 'superviseur')
    AND public.is_current_user_active() = true
  )
  WITH CHECK (
    public.get_current_user_role() IN ('admin', 'superviseur')
    AND public.is_current_user_active() = true
  );

-- ────────────────────────────────────────────────────────────────
-- production_schemas — Suppression (admin uniquement)
-- ────────────────────────────────────────────────────────────────

CREATE POLICY "admins_delete_production_schemas"
  ON public.production_schemas
  FOR DELETE
  TO authenticated
  USING (
    public.get_current_user_role() = 'admin'
    AND public.is_current_user_active() = true
  );

-- ────────────────────────────────────────────────────────────────
-- productions — Lecture
-- Tous les utilisateurs authentifiés actifs peuvent lire
-- ────────────────────────────────────────────────────────────────

CREATE POLICY "authenticated_read_productions"
  ON public.productions
  FOR SELECT
  TO authenticated
  USING (
    public.is_current_user_active() = true
  );

-- ────────────────────────────────────────────────────────────────
-- productions — Écriture (admin + superviseur)
-- ────────────────────────────────────────────────────────────────

CREATE POLICY "supervisors_admins_insert_productions"
  ON public.productions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_current_user_role() IN ('admin', 'superviseur')
    AND public.is_current_user_active() = true
  );

CREATE POLICY "supervisors_admins_update_productions"
  ON public.productions
  FOR UPDATE
  TO authenticated
  USING (
    public.get_current_user_role() IN ('admin', 'superviseur')
    AND public.is_current_user_active() = true
  )
  WITH CHECK (
    public.get_current_user_role() IN ('admin', 'superviseur')
    AND public.is_current_user_active() = true
  );

-- ────────────────────────────────────────────────────────────────
-- productions — Suppression (admin uniquement)
-- ────────────────────────────────────────────────────────────────

CREATE POLICY "admins_delete_productions"
  ON public.productions
  FOR DELETE
  TO authenticated
  USING (
    public.get_current_user_role() = 'admin'
    AND public.is_current_user_active() = true
  );
