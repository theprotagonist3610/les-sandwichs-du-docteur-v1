-- ============================================================================
-- MIGRATION 010 : Système de gestion de stock
-- Tables    : stock_lots, stock_mouvements
-- Modifie   : production_schemas (+ duree_conservation_jours)
-- Dépend de : 009_create_productions_tables.sql
-- Date      : 2026-03-30
-- ============================================================================


-- ============================================================================
-- ÉTAPE 1 : Extension de production_schemas
-- Ajout de duree_conservation_jours pour pré-remplir la durée de conservation
-- lors de l'intégration automatique au stock
-- ============================================================================

ALTER TABLE public.production_schemas
  ADD COLUMN IF NOT EXISTS duree_conservation_jours INTEGER
    CHECK (duree_conservation_jours > 0);

COMMENT ON COLUMN public.production_schemas.duree_conservation_jours IS
  'Durée de conservation estimée en jours. Utilisée pour calculer date_peremption lors de l''intégration au stock.';


-- ============================================================================
-- ÉTAPE 2 : Table stock_lots
-- Un lot = les résultats d''une production pour un item spécifique.
-- Chaque entrée en stock (depuis une production ou manuelle) crée un lot.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stock_lots (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification de l'item
  nom                       VARCHAR(200)  NOT NULL,
  categorie                 VARCHAR(20)   NOT NULL DEFAULT 'autre'
                              CHECK (categorie IN ('pain', 'sauce', 'garniture', 'boisson', 'autre')),

  -- Traçabilité production (nullable pour entrées manuelles)
  production_id             UUID          REFERENCES public.productions(id) ON DELETE SET NULL,
  schema_id                 UUID          REFERENCES public.production_schemas(id) ON DELETE SET NULL,

  -- ── Quantités ────────────────────────────────────────────────────────────
  quantite_initiale         NUMERIC(12,3) NOT NULL
                              CHECK (quantite_initiale > 0),
  quantite_disponible       NUMERIC(12,3) NOT NULL
                              CHECK (quantite_disponible >= 0),
  quantite_vendue           NUMERIC(12,3) NOT NULL DEFAULT 0
                              CHECK (quantite_vendue >= 0),
  quantite_perdue           NUMERIC(12,3) NOT NULL DEFAULT 0
                              CHECK (quantite_perdue >= 0),

  -- ── Coûts ────────────────────────────────────────────────────────────────
  -- cout_unitaire = production.cout_total / Σ quantite_initiale de la production
  cout_unitaire             NUMERIC(12,2) NOT NULL DEFAULT 0
                              CHECK (cout_unitaire >= 0),
  -- cout_total    = cout_unitaire × quantite_initiale
  cout_total                NUMERIC(14,2) NOT NULL DEFAULT 0
                              CHECK (cout_total >= 0),
  -- cout_vendu    = cout_unitaire × quantite_vendue  (mis à jour à chaque vente)
  cout_vendu                NUMERIC(14,2) NOT NULL DEFAULT 0
                              CHECK (cout_vendu >= 0),
  -- cout_perdu    = cout_unitaire × quantite_perdue  (mis à jour à chaque perte)
  cout_perdu                NUMERIC(14,2) NOT NULL DEFAULT 0
                              CHECK (cout_perdu >= 0),

  -- ── Dates & Conservation ─────────────────────────────────────────────────
  date_production           DATE          NOT NULL,
  duree_conservation_jours  INTEGER       CHECK (duree_conservation_jours > 0),
  -- date_peremption est calculée et stockée pour faciliter les requêtes d'alerte
  date_peremption           DATE,

  -- ── Statut ───────────────────────────────────────────────────────────────
  -- disponible          : stock > 0, non périmé
  -- partiellement_vendu : stock > 0, des ventes enregistrées
  -- epuise              : stock = 0 (tout vendu ou perdu)
  -- perime              : date_peremption dépassée
  statut                    VARCHAR(25)   NOT NULL DEFAULT 'disponible'
                              CHECK (statut IN (
                                'disponible',
                                'partiellement_vendu',
                                'epuise',
                                'perime'
                              )),

  -- ── Méta ─────────────────────────────────────────────────────────────────
  notes                     TEXT,
  created_by                UUID          REFERENCES public.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Contrainte : quantite_vendue + quantite_perdue <= quantite_initiale
  CONSTRAINT chk_quantites_coherentes
    CHECK (quantite_vendue + quantite_perdue <= quantite_initiale)
);

-- ── Index stock_lots ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_stock_lots_nom
  ON public.stock_lots(nom);

CREATE INDEX IF NOT EXISTS idx_stock_lots_categorie
  ON public.stock_lots(categorie);

CREATE INDEX IF NOT EXISTS idx_stock_lots_statut
  ON public.stock_lots(statut);

CREATE INDEX IF NOT EXISTS idx_stock_lots_production_id
  ON public.stock_lots(production_id);

CREATE INDEX IF NOT EXISTS idx_stock_lots_schema_id
  ON public.stock_lots(schema_id);

CREATE INDEX IF NOT EXISTS idx_stock_lots_date_production
  ON public.stock_lots(date_production DESC);

CREATE INDEX IF NOT EXISTS idx_stock_lots_date_peremption
  ON public.stock_lots(date_peremption ASC)
  WHERE date_peremption IS NOT NULL;

-- Index composite pour les alertes de péremption (requête fréquente)
CREATE INDEX IF NOT EXISTS idx_stock_lots_alertes
  ON public.stock_lots(date_peremption, statut)
  WHERE statut IN ('disponible', 'partiellement_vendu');

-- ── Commentaires stock_lots ───────────────────────────────────────────────────

COMMENT ON TABLE public.stock_lots IS
  'Inventaire de stock par lot. Un lot = résultats d''une production pour un item. '
  'Alimenté automatiquement à l''intégration d''une production terminée.';

COMMENT ON COLUMN public.stock_lots.nom IS
  'Nom de l''item en stock (depuis production.resultats[i].nom ou saisi manuellement)';
COMMENT ON COLUMN public.stock_lots.categorie IS
  'Catégorie héritée du schéma de production';
COMMENT ON COLUMN public.stock_lots.production_id IS
  'Production source (null si entrée manuelle)';
COMMENT ON COLUMN public.stock_lots.quantite_initiale IS
  'Quantité produite ou entrée initiale, invariable après création';
COMMENT ON COLUMN public.stock_lots.quantite_disponible IS
  'Quantité restante = initiale - vendue - perdue. Mise à jour à chaque mouvement.';
COMMENT ON COLUMN public.stock_lots.cout_unitaire IS
  'Coût par unité = production.cout_total / Σ quantite_initiale des lots de cette production';
COMMENT ON COLUMN public.stock_lots.cout_total IS
  'Coût total du lot = cout_unitaire × quantite_initiale';
COMMENT ON COLUMN public.stock_lots.cout_vendu IS
  'Coût correspondant aux ventes = cout_unitaire × quantite_vendue';
COMMENT ON COLUMN public.stock_lots.cout_perdu IS
  'Coût correspondant aux pertes = cout_unitaire × quantite_perdue';
COMMENT ON COLUMN public.stock_lots.date_peremption IS
  'date_production + duree_conservation_jours. Null si durée non renseignée.';
COMMENT ON COLUMN public.stock_lots.statut IS
  'disponible | partiellement_vendu | epuise | perime';


-- ============================================================================
-- ÉTAPE 3 : Table stock_mouvements
-- Journal immuable de tous les événements de stock.
-- Chaque vente, perte ou ajustement crée une ligne. On ne modifie jamais.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stock_mouvements (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lot concerné
  lot_id          UUID          NOT NULL
                    REFERENCES public.stock_lots(id) ON DELETE CASCADE,

  -- Type de mouvement
  -- entree      : création du lot (depuis production ou manuelle)
  -- vente       : unités vendues (peut être lié à une commande)
  -- perte       : unités perdues / périmées / abîmées
  -- ajustement  : correction manuelle (admin uniquement)
  type            VARCHAR(15)   NOT NULL
                    CHECK (type IN ('entree', 'vente', 'perte', 'ajustement')),

  -- Quantité du mouvement (toujours positive ; le sens est donné par le type)
  quantite        NUMERIC(12,3) NOT NULL
                    CHECK (quantite > 0),

  -- Coût du mouvement = quantite × cout_unitaire du lot au moment du mouvement
  cout            NUMERIC(14,2) NOT NULL DEFAULT 0
                    CHECK (cout >= 0),

  -- Contexte
  motif           TEXT,
  date_mouvement  DATE          NOT NULL DEFAULT CURRENT_DATE,

  -- Lien optionnel vers une commande (pour les ventes liées)
  commande_id     UUID,         -- pas de FK contrainte pour éviter les dépendances cycliques

  -- Méta
  created_by      UUID          REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()

  -- Note : stock_mouvements est immuable. Pas de updated_at.
);

-- ── Index stock_mouvements ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_stock_mouvements_lot_id
  ON public.stock_mouvements(lot_id);

CREATE INDEX IF NOT EXISTS idx_stock_mouvements_type
  ON public.stock_mouvements(type);

CREATE INDEX IF NOT EXISTS idx_stock_mouvements_date
  ON public.stock_mouvements(date_mouvement DESC);

CREATE INDEX IF NOT EXISTS idx_stock_mouvements_commande_id
  ON public.stock_mouvements(commande_id)
  WHERE commande_id IS NOT NULL;

-- Index composite pour récupérer l'historique d'un lot
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_lot_date
  ON public.stock_mouvements(lot_id, date_mouvement DESC);

-- ── Commentaires stock_mouvements ─────────────────────────────────────────────

COMMENT ON TABLE public.stock_mouvements IS
  'Journal immuable des mouvements de stock. Chaque vente, perte ou ajustement crée une ligne. '
  'Permet la traçabilité complète et la reconstitution de l''état du stock à toute date.';

COMMENT ON COLUMN public.stock_mouvements.type IS
  'entree (création lot), vente, perte, ajustement (correction admin)';
COMMENT ON COLUMN public.stock_mouvements.quantite IS
  'Quantité du mouvement, toujours positive. Le type détermine si c''est une entrée ou sortie.';
COMMENT ON COLUMN public.stock_mouvements.cout IS
  'Coût valorisé au cout_unitaire du lot : quantite × cout_unitaire';
COMMENT ON COLUMN public.stock_mouvements.commande_id IS
  'Référence à la commande source pour les mouvements de type vente (non contraint par FK)';


-- ============================================================================
-- ÉTAPE 4 : Triggers updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_stock_lots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_lots_updated_at
  BEFORE UPDATE ON public.stock_lots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_lots_updated_at();


-- ============================================================================
-- ÉTAPE 5 : Trigger de cohérence statut
-- Recalcule automatiquement le statut du lot après chaque mise à jour
-- des quantités (quantite_disponible, quantite_vendue, quantite_perdue)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalculer_statut_stock_lot()
RETURNS TRIGGER AS $$
BEGIN
  -- Périmé : date dépassée (priorité sur le reste)
  IF NEW.date_peremption IS NOT NULL AND NEW.date_peremption < CURRENT_DATE THEN
    NEW.statut = 'perime';

  -- Épuisé : plus rien de disponible
  ELSIF NEW.quantite_disponible <= 0 THEN
    NEW.statut = 'epuise';

  -- Partiellement vendu : des ventes mais encore du stock
  ELSIF NEW.quantite_vendue > 0 OR NEW.quantite_perdue > 0 THEN
    NEW.statut = 'partiellement_vendu';

  -- Disponible : aucun mouvement de sortie
  ELSE
    NEW.statut = 'disponible';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculer_statut_stock_lot
  BEFORE INSERT OR UPDATE OF
    quantite_disponible,
    quantite_vendue,
    quantite_perdue,
    date_peremption
  ON public.stock_lots
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculer_statut_stock_lot();


-- ============================================================================
-- ÉTAPE 6 : Vue agrégée stock_vue_actuel
-- Vue utilitaire : stock agrégé par nom + catégorie (toutes provenances)
-- Utile pour afficher "ce qu'on a en stock" sans détail par lot
-- ============================================================================

CREATE OR REPLACE VIEW public.stock_vue_actuel AS
SELECT
  nom,
  categorie,
  COUNT(*)                                          AS nb_lots,
  SUM(quantite_disponible)                          AS quantite_disponible_totale,
  SUM(quantite_initiale)                            AS quantite_initiale_totale,
  SUM(quantite_vendue)                              AS quantite_vendue_totale,
  SUM(quantite_perdue)                              AS quantite_perdue_totale,
  ROUND(
    AVG(cout_unitaire) FILTER (WHERE cout_unitaire > 0),
    2
  )                                                 AS cout_unitaire_moyen,
  SUM(cout_total)                                   AS cout_total_engage,
  SUM(cout_vendu)                                   AS cout_vendu_total,
  SUM(cout_perdu)                                   AS cout_perdu_total,
  MIN(date_peremption) FILTER (
    WHERE date_peremption IS NOT NULL
    AND statut IN ('disponible', 'partiellement_vendu')
  )                                                 AS prochaine_peremption,
  -- Taux de valorisation = ce qui est vendu / cout total engagé
  CASE
    WHEN SUM(cout_total) > 0
    THEN ROUND(SUM(cout_vendu) / SUM(cout_total) * 100, 2)
    ELSE 0
  END                                               AS taux_valorisation_pct,
  -- Taux de perte
  CASE
    WHEN SUM(quantite_initiale) > 0
    THEN ROUND(SUM(quantite_perdue) / SUM(quantite_initiale) * 100, 2)
    ELSE 0
  END                                               AS taux_perte_pct,
  -- Y a-t-il des lots disponibles ?
  bool_or(statut IN ('disponible', 'partiellement_vendu')) AS en_stock
FROM public.stock_lots
GROUP BY nom, categorie;

COMMENT ON VIEW public.stock_vue_actuel IS
  'Vue agrégée du stock actuel par item (nom + catégorie). '
  'Consolide tous les lots d''un même item. Utilisée pour l''affichage de l''inventaire global.';


-- ============================================================================
-- ÉTAPE 7 : Fonction utilitaire — vérification péremptions
-- Marque automatiquement les lots dont la date_peremption est dépassée
-- À appeler périodiquement (ou au chargement de la page stock)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.marquer_lots_perimes()
RETURNS INTEGER AS $$
DECLARE
  nb_mis_a_jour INTEGER;
BEGIN
  UPDATE public.stock_lots
  SET statut = 'perime'
  WHERE date_peremption IS NOT NULL
    AND date_peremption < CURRENT_DATE
    AND statut IN ('disponible', 'partiellement_vendu');

  GET DIAGNOSTICS nb_mis_a_jour = ROW_COUNT;
  RETURN nb_mis_a_jour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.marquer_lots_perimes() IS
  'Marque comme périmés tous les lots dont la date_peremption est dépassée. '
  'Retourne le nombre de lots mis à jour. '
  'À appeler au chargement de la page stock ou via un cron.';


-- ============================================================================
-- ÉTAPE 8 : ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.stock_lots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_mouvements ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- stock_lots — Lecture : tous les utilisateurs actifs authentifiés
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY "authenticated_read_stock_lots"
  ON public.stock_lots
  FOR SELECT
  TO authenticated
  USING (public.is_current_user_active() = true);

-- ────────────────────────────────────────────────────────────────────────────
-- stock_lots — Écriture : admin + superviseur
-- (intégration production, entrées manuelles, ventes, pertes)
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY "supervisors_admins_insert_stock_lots"
  ON public.stock_lots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_current_user_role() IN ('admin', 'superviseur')
    AND public.is_current_user_active() = true
  );

CREATE POLICY "supervisors_admins_update_stock_lots"
  ON public.stock_lots
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

-- ────────────────────────────────────────────────────────────────────────────
-- stock_lots — Suppression : admin uniquement
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY "admins_delete_stock_lots"
  ON public.stock_lots
  FOR DELETE
  TO authenticated
  USING (
    public.get_current_user_role() = 'admin'
    AND public.is_current_user_active() = true
  );

-- ────────────────────────────────────────────────────────────────────────────
-- stock_mouvements — Lecture : tous les utilisateurs actifs
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY "authenticated_read_stock_mouvements"
  ON public.stock_mouvements
  FOR SELECT
  TO authenticated
  USING (public.is_current_user_active() = true);

-- ────────────────────────────────────────────────────────────────────────────
-- stock_mouvements — Insertion : admin + superviseur
-- (journal immuable : on n'update/delete jamais)
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY "supervisors_admins_insert_stock_mouvements"
  ON public.stock_mouvements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_current_user_role() IN ('admin', 'superviseur')
    AND public.is_current_user_active() = true
  );

-- Pas de politique UPDATE/DELETE sur stock_mouvements : journal immuable.
-- Seul un admin Supabase peut modifier directement en cas d'erreur grave.


-- ============================================================================
-- RÉSUMÉ
-- ============================================================================
/*
  Tables créées :
  ─────────────────────────────────────────────────────────────────────────────
  public.stock_lots
    - Un lot par item par production
    - quantite_disponible = initiale - vendue - perdue
    - cout_vendu / cout_perdu calculés et stockés
    - Statut recalculé automatiquement par trigger

  public.stock_mouvements
    - Journal immuable (INSERT seulement)
    - Types : entree | vente | perte | ajustement
    - Lien optionnel commande_id (ventes liées aux commandes)

  Vue créée :
  ─────────────────────────────────────────────────────────────────────────────
  public.stock_vue_actuel
    - Agrégation par nom + catégorie
    - Taux de valorisation et taux de perte calculés

  Fonctions créées :
  ─────────────────────────────────────────────────────────────────────────────
  public.marquer_lots_perimes()       → renvoie le nb de lots mis à jour
  public.recalculer_statut_stock_lot  → trigger BEFORE INSERT/UPDATE
  public.update_stock_lots_updated_at → trigger updated_at

  Table modifiée :
  ─────────────────────────────────────────────────────────────────────────────
  public.production_schemas
    + duree_conservation_jours INTEGER  → pré-remplit la durée lors de
                                          l'intégration au stock

  RLS :
  ─────────────────────────────────────────────────────────────────────────────
  SELECT  → tous les utilisateurs actifs
  INSERT  → admin + superviseur
  UPDATE  → admin + superviseur  (stock_lots uniquement)
  DELETE  → admin uniquement     (stock_lots uniquement)
  stock_mouvements → INSERT only (journal immuable)
*/
