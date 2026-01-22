-- ============================================================================
-- CRÉATION DE LA TABLE COMMANDES
-- ============================================================================
-- Gestion complète des commandes avec livraison, paiement et promotions
-- ============================================================================

-- Créer les types ENUM nécessaires
DO $$ BEGIN
  CREATE TYPE type_commande AS ENUM ('livraison', 'sur-place');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_livraison AS ENUM ('en_attente', 'en_cours', 'livree', 'annulee');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_paiement AS ENUM ('non_payee', 'partiellement_payee', 'payee');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_commande AS ENUM ('en_cours', 'terminee', 'annulee');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Créer la table commandes
CREATE TABLE IF NOT EXISTS commandes (
  -- Identifiant unique
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type de commande
  type type_commande NOT NULL DEFAULT 'sur-place',

  -- Informations client
  client TEXT DEFAULT 'non identifie',
  contact_client TEXT, -- Téléphone principal
  contact_alternatif TEXT, -- Téléphone alternatif ou de la personne à livrer

  -- Informations de livraison
  lieu_livraison JSONB, -- Adresse complète structurée
  instructions_livraison TEXT,
  livreur UUID REFERENCES users(id) ON DELETE SET NULL, -- ID du livreur
  date_livraison DATE,
  heure_livraison TIME,
  date_reelle_livraison DATE,
  heure_reelle_livraison TIME,
  frais_livraison NUMERIC(10, 2) DEFAULT 0,

  -- Statuts
  statut_livraison statut_livraison DEFAULT 'en_attente',
  statut_paiement statut_paiement DEFAULT 'non_payee',
  statut_commande statut_commande DEFAULT 'en_cours',

  -- Détails de la commande (array d'items)
  details_commandes JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{ item: string, quantite: number, prix_unitaire: number, total: number }]

  -- Promotion appliquée
  promotion JSONB,
  -- Structure: { code: string, type: 'pourcentage'|'montant', valeur: number, montant_reduction: number }

  -- Détails du paiement
  details_paiement JSONB DEFAULT '{
    "total": 0,
    "total_apres_reduction": 0,
    "momo": 0,
    "cash": 0,
    "autre": 0
  }'::jsonb,

  -- Vendeur qui a créé la commande
  vendeur UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Champ pour la gestion des collisions (versioning optimiste)
  version INTEGER DEFAULT 1
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_commandes_type ON commandes(type);
CREATE INDEX IF NOT EXISTS idx_commandes_statut_commande ON commandes(statut_commande);
CREATE INDEX IF NOT EXISTS idx_commandes_statut_livraison ON commandes(statut_livraison);
CREATE INDEX IF NOT EXISTS idx_commandes_statut_paiement ON commandes(statut_paiement);
CREATE INDEX IF NOT EXISTS idx_commandes_vendeur ON commandes(vendeur);
CREATE INDEX IF NOT EXISTS idx_commandes_livreur ON commandes(livreur);
CREATE INDEX IF NOT EXISTS idx_commandes_date_livraison ON commandes(date_livraison);
CREATE INDEX IF NOT EXISTS idx_commandes_created_at ON commandes(created_at);
CREATE INDEX IF NOT EXISTS idx_commandes_client ON commandes(client);

-- Index GIN pour les recherches JSONB
CREATE INDEX IF NOT EXISTS idx_commandes_lieu_livraison ON commandes USING GIN(lieu_livraison);
CREATE INDEX IF NOT EXISTS idx_commandes_details_commandes ON commandes USING GIN(details_commandes);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_commandes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1; -- Incrémenter la version pour la gestion des collisions
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_commandes_updated_at ON commandes;
CREATE TRIGGER trigger_update_commandes_updated_at
  BEFORE UPDATE ON commandes
  FOR EACH ROW
  EXECUTE FUNCTION update_commandes_updated_at();

-- Commentaires sur la table et les colonnes
COMMENT ON TABLE commandes IS 'Table de gestion des commandes avec livraison et paiement';
COMMENT ON COLUMN commandes.type IS 'Type de commande: livraison ou sur-place';
COMMENT ON COLUMN commandes.client IS 'Nom du client (par défaut: non identifie)';
COMMENT ON COLUMN commandes.lieu_livraison IS 'Adresse de livraison structurée (JSON)';
COMMENT ON COLUMN commandes.details_commandes IS 'Liste des items commandés avec quantités et prix';
COMMENT ON COLUMN commandes.promotion IS 'Détails de la promotion appliquée';
COMMENT ON COLUMN commandes.details_paiement IS 'Répartition du paiement (cash, momo, autre)';
COMMENT ON COLUMN commandes.version IS 'Version pour la gestion des collisions (optimistic locking)';

-- Afficher un message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Table commandes créée avec succès';
  RAISE NOTICE '✅ Indexes créés';
  RAISE NOTICE '✅ Trigger updated_at configuré';
END $$;
