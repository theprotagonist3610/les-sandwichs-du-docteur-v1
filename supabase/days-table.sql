-- =====================================================
-- TABLE: days (Clôtures journalières)
-- Description: Enregistre les métriques de performance quotidiennes
-- =====================================================

-- Suppression si existe
DROP TABLE IF EXISTS days CASCADE;

-- Création de la table
CREATE TABLE days (
  -- Identifiants
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Temporalité
  jour DATE NOT NULL UNIQUE, -- Format: YYYY-MM-DD (unique par jour)
  ouverture TIME, -- HH:MM:SS - Première commande du jour
  fermeture TIME, -- HH:MM:SS - Dernière commande du jour
  duree_ouverture_minutes INTEGER, -- Durée totale en minutes

  -- Métriques de ventes globales
  nombre_ventes_total INTEGER DEFAULT 0,
  nombre_ventes_sur_place INTEGER DEFAULT 0,
  nombre_ventes_livraison INTEGER DEFAULT 0,
  nombre_ventes_emporter INTEGER DEFAULT 0,

  -- Métriques de paiement - Quantités
  nombre_paiements_momo INTEGER DEFAULT 0,
  nombre_paiements_cash INTEGER DEFAULT 0,
  nombre_paiements_autre INTEGER DEFAULT 0,
  nombre_paiements_mixtes INTEGER DEFAULT 0, -- Commandes avec plusieurs modes de paiement

  -- Métriques de paiement - Montants
  montant_percu_cash DECIMAL(10, 2) DEFAULT 0,
  montant_percu_momo DECIMAL(10, 2) DEFAULT 0,
  montant_percu_autre DECIMAL(10, 2) DEFAULT 0,
  chiffre_affaires DECIMAL(10, 2) DEFAULT 0, -- Total des ventes

  -- Métriques de performance
  panier_moyen DECIMAL(10, 2) DEFAULT 0, -- CA / nombre de ventes
  ticket_moyen DECIMAL(10, 2) DEFAULT 0, -- Montant moyen par commande
  cadence_vente DECIMAL(10, 2) DEFAULT 0, -- Ventes par heure d'ouverture
  taux_livraison DECIMAL(5, 2) DEFAULT 0, -- % de livraisons

  -- Produits et promotions
  meilleur_produit_id UUID REFERENCES menus(id),
  meilleur_produit_nom TEXT,
  meilleur_produit_quantite INTEGER DEFAULT 0,
  nombre_produits_distincts INTEGER DEFAULT 0, -- Variété du catalogue vendu
  nombre_promotions_utilisees INTEGER DEFAULT 0,
  montant_total_remises DECIMAL(10, 2) DEFAULT 0,

  -- Points de vente
  nombre_points_vente_actifs INTEGER DEFAULT 0,
  meilleur_point_vente_id UUID REFERENCES emplacements(id),
  meilleur_point_vente_nom TEXT,
  meilleur_point_vente_ca DECIMAL(10, 2) DEFAULT 0,

  -- Vendeurs
  nombre_vendeurs_actifs INTEGER DEFAULT 0,
  meilleur_vendeur_id UUID REFERENCES users(id),
  meilleur_vendeur_nom TEXT,
  meilleur_vendeur_ventes INTEGER DEFAULT 0,

  -- Métriques avancées
  nombre_clients_uniques INTEGER DEFAULT 0, -- Clients distincts
  taux_clients_reguliers DECIMAL(5, 2) DEFAULT 0, -- % clients avec >1 commande
  heure_pointe_debut TIME, -- Début de l'heure de pointe
  heure_pointe_fin TIME, -- Fin de l'heure de pointe
  ventes_heure_pointe INTEGER DEFAULT 0,

  -- Temps moyens
  temps_moyen_preparation_minutes DECIMAL(10, 2) DEFAULT 0,
  temps_moyen_livraison_minutes DECIMAL(10, 2) DEFAULT 0,

  -- Statuts des commandes
  nombre_commandes_annulees INTEGER DEFAULT 0,
  nombre_commandes_en_preparation INTEGER DEFAULT 0,
  nombre_commandes_livrees INTEGER DEFAULT 0,
  nombre_commandes_retirees INTEGER DEFAULT 0,
  taux_completion DECIMAL(5, 2) DEFAULT 0, -- % commandes livrées/retirées

  -- Prévisions (calculées au début de la journée)
  previsions JSONB, -- Métriques prévisionnelles basées sur historique
  previsions_generees_le TIMESTAMPTZ, -- Date de génération des prévisions
  previsions_base_sur_jours INTEGER, -- Nombre de jours utilisés pour les prévisions
  previsions_confiance DECIMAL(3, 2), -- Score de confiance 0-1 (ex: 0.85)

  -- Métadonnées
  cloture_par UUID REFERENCES users(id) NOT NULL, -- Utilisateur qui a clôturé
  cloture_a TIMESTAMPTZ DEFAULT NOW(), -- Date/heure de la clôture
  notes TEXT, -- Notes ou observations

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEX pour optimisation des requêtes
-- =====================================================

CREATE INDEX idx_days_jour ON days(jour DESC);
CREATE INDEX idx_days_cloture_par ON days(cloture_par);
CREATE INDEX idx_days_meilleur_point_vente ON days(meilleur_point_vente_id);
CREATE INDEX idx_days_meilleur_vendeur ON days(meilleur_vendeur_id);
CREATE INDEX idx_days_created_at ON days(created_at DESC);

-- Index GIN pour recherches dans JSONB previsions
CREATE INDEX idx_days_previsions ON days USING GIN (previsions);

-- =====================================================
-- TRIGGER pour updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_days_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_days_updated_at
  BEFORE UPDATE ON days
  FOR EACH ROW
  EXECUTE FUNCTION update_days_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Activer RLS
ALTER TABLE days ENABLE ROW LEVEL SECURITY;

-- SELECT: Tous les utilisateurs authentifiés peuvent lire
CREATE POLICY "authenticated_users_can_read_days"
ON days FOR SELECT TO authenticated
USING (true);

-- INSERT: Seulement admin et superviseur peuvent créer des clôtures
CREATE POLICY "admins_and_supervisors_can_insert_days"
ON days FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'superviseur')
  )
);

-- UPDATE: Seulement admin et superviseur peuvent modifier (avec restriction)
CREATE POLICY "admins_and_supervisors_can_update_days"
ON days FOR UPDATE TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'superviseur')
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'superviseur')
  )
);

-- DELETE: Seulement admin peut supprimer
CREATE POLICY "admins_can_delete_days"
ON days FOR DELETE TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE days IS 'Clôtures journalières avec métriques de performance et prévisions';
COMMENT ON COLUMN days.jour IS 'Date de la journée (unique)';
COMMENT ON COLUMN days.cadence_vente IS 'Nombre de ventes par heure d''ouverture';
COMMENT ON COLUMN days.panier_moyen IS 'Montant moyen par transaction';
COMMENT ON COLUMN days.taux_completion IS 'Pourcentage de commandes complétées';
COMMENT ON COLUMN days.taux_livraison IS 'Pourcentage de commandes en livraison';
COMMENT ON COLUMN days.previsions IS 'Métriques prévisionnelles (JSONB) avec même structure que métriques réelles';
COMMENT ON COLUMN days.previsions_confiance IS 'Score de confiance des prévisions (0-1) basé sur variance historique';
