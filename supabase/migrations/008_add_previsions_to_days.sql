-- =====================================================
-- Migration: Ajout des colonnes de prévisions à la table days
-- Date: 2026-01-27
-- =====================================================

-- Ajouter la colonne previsions (JSONB)
ALTER TABLE days
ADD COLUMN IF NOT EXISTS previsions JSONB;

-- Ajouter les métadonnées des prévisions
ALTER TABLE days
ADD COLUMN IF NOT EXISTS previsions_generees_le TIMESTAMPTZ;

ALTER TABLE days
ADD COLUMN IF NOT EXISTS previsions_base_sur_jours INTEGER;

ALTER TABLE days
ADD COLUMN IF NOT EXISTS previsions_confiance DECIMAL(3, 2);

-- Créer l'index GIN pour les recherches JSONB
CREATE INDEX IF NOT EXISTS idx_days_previsions
ON days USING GIN (previsions);

-- Ajouter les commentaires
COMMENT ON COLUMN days.previsions IS 'Métriques prévisionnelles (JSONB) avec même structure que métriques réelles';
COMMENT ON COLUMN days.previsions_generees_le IS 'Date et heure de génération des prévisions';
COMMENT ON COLUMN days.previsions_base_sur_jours IS 'Nombre de jours historiques utilisés pour calculer les prévisions';
COMMENT ON COLUMN days.previsions_confiance IS 'Score de confiance des prévisions (0-1) basé sur variance historique';

-- =====================================================
-- Exemple de structure JSONB pour previsions:
-- =====================================================
/*
{
  "nombre_ventes_total": 45,
  "chiffre_affaires": 125000,
  "panier_moyen": 2777,
  "cadence_vente": 4.5,
  "nombre_paiements_momo": 25,
  "nombre_paiements_cash": 20,
  "montant_percu_momo": 70000,
  "montant_percu_cash": 55000,
  "meilleur_produit_quantite": 15,
  "nombre_vendeurs_actifs": 3,
  "taux_livraison": 35.5,

  -- Métadonnées internes
  "_metadata": {
    "algorithme": "weighted_average",
    "ponderation": {
      "last_7_days": 0.5,
      "last_15_days": 0.3,
      "last_30_days": 0.2
    },
    "jours_utilises": [
      "2026-01-26",
      "2026-01-25",
      "..."
    ],
    "variance": {
      "nombre_ventes_total": 0.12,
      "chiffre_affaires": 0.15
    }
  }
}
*/
