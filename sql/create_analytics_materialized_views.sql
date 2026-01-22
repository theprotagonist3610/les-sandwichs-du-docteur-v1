-- ============================================================================
-- VUES MATÉRIALISÉES POUR ANALYTICS ET RAPPORTS
-- ============================================================================
-- Précalcule les statistiques pour des performances optimales
-- À rafraîchir périodiquement (ex: chaque nuit ou à la demande)
-- ============================================================================

-- Vue matérialisée: Statistiques quotidiennes des commandes
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_commandes_stats AS
SELECT
  DATE(created_at) AS date_jour,
  COUNT(*) AS total_commandes,
  COUNT(*) FILTER (WHERE type = 'livraison') AS commandes_livraison,
  COUNT(*) FILTER (WHERE type = 'sur-place') AS commandes_sur_place,
  COUNT(*) FILTER (WHERE statut_commande = 'en_cours') AS commandes_en_cours,
  COUNT(*) FILTER (WHERE statut_commande = 'terminee') AS commandes_terminees,
  COUNT(*) FILTER (WHERE statut_commande = 'annulee') AS commandes_annulees,
  COUNT(*) FILTER (WHERE statut_livraison = 'livree') AS livraisons_completees,
  COUNT(*) FILTER (WHERE statut_paiement = 'payee') AS commandes_payees,
  SUM((details_paiement->>'total_apres_reduction')::NUMERIC) AS ca_total,
  AVG((details_paiement->>'total_apres_reduction')::NUMERIC) AS panier_moyen,
  SUM((details_paiement->>'momo')::NUMERIC) AS total_momo,
  SUM((details_paiement->>'cash')::NUMERIC) AS total_cash,
  SUM((details_paiement->>'autre')::NUMERIC) AS total_autre,
  SUM(frais_livraison) AS total_frais_livraison
FROM commandes
GROUP BY DATE(created_at)
ORDER BY date_jour DESC;

-- Index unique sur la date pour refresh concurrent
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_stats_date ON mv_daily_commandes_stats(date_jour);

COMMENT ON MATERIALIZED VIEW mv_daily_commandes_stats IS 'Statistiques quotidiennes des commandes (à rafraîchir quotidiennement)';

-- Vue matérialisée: Top produits (items) vendus
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_products AS
WITH items_exploded AS (
  SELECT
    jsonb_array_elements(details_commandes) AS item,
    DATE(created_at) AS date_jour
  FROM commandes
  WHERE statut_commande != 'annulee'
)
SELECT
  (item->>'item') AS produit,
  COUNT(*) AS nombre_commandes,
  SUM((item->>'quantite')::NUMERIC) AS quantite_totale,
  SUM((item->>'quantite')::NUMERIC * (item->>'prix_unitaire')::NUMERIC) AS ca_total,
  AVG((item->>'prix_unitaire')::NUMERIC) AS prix_moyen,
  MIN(date_jour) AS premiere_vente,
  MAX(date_jour) AS derniere_vente
FROM items_exploded
GROUP BY (item->>'item')
ORDER BY quantite_totale DESC;

-- Index unique sur le produit pour refresh concurrent
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_products_produit ON mv_top_products(produit);

COMMENT ON MATERIALIZED VIEW mv_top_products IS 'Classement des produits par quantité vendue';

-- Vue matérialisée: Performance des vendeurs
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_vendeurs_performance AS
SELECT
  u.id AS vendeur_id,
  u.nom,
  u.prenom,
  u.email,
  COUNT(c.id) AS nombre_commandes,
  COUNT(c.id) FILTER (WHERE c.statut_commande = 'terminee') AS commandes_terminees,
  COUNT(c.id) FILTER (WHERE c.statut_commande = 'annulee') AS commandes_annulees,
  SUM((c.details_paiement->>'total_apres_reduction')::NUMERIC) AS ca_total,
  AVG((c.details_paiement->>'total_apres_reduction')::NUMERIC) AS panier_moyen,
  MIN(c.created_at) AS premiere_commande,
  MAX(c.created_at) AS derniere_commande
FROM users u
LEFT JOIN commandes c ON c.vendeur = u.id
WHERE u.role IN ('vendeur', 'admin', 'superviseur')
GROUP BY u.id, u.nom, u.prenom, u.email
ORDER BY ca_total DESC NULLS LAST;

-- Index unique sur le vendeur_id pour refresh concurrent
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_vendeurs_perf_id ON mv_vendeurs_performance(vendeur_id);

COMMENT ON MATERIALIZED VIEW mv_vendeurs_performance IS 'Performance des vendeurs (CA, nombre de commandes)';

-- Vue matérialisée: Performance des livreurs
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_livreurs_performance AS
SELECT
  u.id AS livreur_id,
  u.nom,
  u.prenom,
  u.email,
  COUNT(c.id) AS nombre_livraisons,
  COUNT(c.id) FILTER (WHERE c.statut_livraison = 'livree') AS livraisons_completees,
  COUNT(c.id) FILTER (WHERE c.statut_livraison = 'annulee') AS livraisons_annulees,
  COUNT(c.id) FILTER (WHERE c.date_reelle_livraison <= c.date_livraison) AS livraisons_a_temps,
  COUNT(c.id) FILTER (WHERE c.date_reelle_livraison > c.date_livraison) AS livraisons_en_retard,
  AVG(
    EXTRACT(EPOCH FROM (
      c.date_reelle_livraison::TIMESTAMP + c.heure_reelle_livraison::TIME -
      (c.date_livraison::TIMESTAMP + c.heure_livraison::TIME)
    )) / 60
  ) AS delai_moyen_minutes,
  MIN(c.created_at) AS premiere_livraison,
  MAX(c.created_at) AS derniere_livraison
FROM users u
LEFT JOIN commandes c ON c.livreur = u.id
WHERE u.role = 'livreur'
  AND c.type = 'livraison'
GROUP BY u.id, u.nom, u.prenom, u.email
ORDER BY livraisons_completees DESC NULLS LAST;

-- Index unique sur le livreur_id pour refresh concurrent
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_livreurs_perf_id ON mv_livreurs_performance(livreur_id);

COMMENT ON MATERIALIZED VIEW mv_livreurs_performance IS 'Performance des livreurs (taux de réussite, ponctualité)';

-- Vue matérialisée: Statistiques par zone géographique (quartier)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_geographic_stats AS
SELECT
  (lieu_livraison->>'quartier') AS quartier,
  (lieu_livraison->>'arrondissement') AS arrondissement,
  (lieu_livraison->>'commune') AS commune,
  (lieu_livraison->>'departement') AS departement,
  COUNT(*) AS nombre_commandes,
  SUM((details_paiement->>'total_apres_reduction')::NUMERIC) AS ca_total,
  AVG((details_paiement->>'total_apres_reduction')::NUMERIC) AS panier_moyen,
  AVG(frais_livraison) AS frais_livraison_moyen
FROM commandes
WHERE type = 'livraison'
  AND lieu_livraison IS NOT NULL
  AND statut_commande != 'annulee'
GROUP BY
  (lieu_livraison->>'quartier'),
  (lieu_livraison->>'arrondissement'),
  (lieu_livraison->>'commune'),
  (lieu_livraison->>'departement')
ORDER BY ca_total DESC NULLS LAST;

-- Index pour recherches par zone
CREATE INDEX IF NOT EXISTS idx_mv_geo_stats_quartier ON mv_geographic_stats(quartier);
CREATE INDEX IF NOT EXISTS idx_mv_geo_stats_commune ON mv_geographic_stats(commune);

COMMENT ON MATERIALIZED VIEW mv_geographic_stats IS 'Statistiques par zone géographique';

-- Vue matérialisée: Taux de conversion et promotions
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_promotions_stats AS
SELECT
  (promotion->>'code') AS code_promo,
  (promotion->>'type') AS type_reduction,
  COUNT(*) AS nombre_utilisations,
  SUM((promotion->>'montant_reduction')::NUMERIC) AS montant_total_reduit,
  AVG((details_paiement->>'total')::NUMERIC) AS panier_moyen_avant_reduction,
  AVG((details_paiement->>'total_apres_reduction')::NUMERIC) AS panier_moyen_apres_reduction,
  MIN(created_at) AS premiere_utilisation,
  MAX(created_at) AS derniere_utilisation
FROM commandes
WHERE promotion IS NOT NULL
  AND statut_commande != 'annulee'
GROUP BY (promotion->>'code'), (promotion->>'type')
ORDER BY nombre_utilisations DESC;

-- Index unique sur le code promo pour refresh concurrent
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_promo_stats_code ON mv_promotions_stats(code_promo);

COMMENT ON MATERIALIZED VIEW mv_promotions_stats IS 'Statistiques d''utilisation des promotions';

-- Vue matérialisée: Statistiques horaires (patterns de commandes)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hourly_patterns AS
SELECT
  EXTRACT(HOUR FROM created_at) AS heure,
  EXTRACT(DOW FROM created_at) AS jour_semaine, -- 0=dimanche, 6=samedi
  COUNT(*) AS nombre_commandes,
  AVG((details_paiement->>'total_apres_reduction')::NUMERIC) AS panier_moyen
FROM commandes
WHERE statut_commande != 'annulee'
GROUP BY
  EXTRACT(HOUR FROM created_at),
  EXTRACT(DOW FROM created_at)
ORDER BY heure, jour_semaine;

-- Index composé pour recherches
CREATE INDEX IF NOT EXISTS idx_mv_hourly_patterns ON mv_hourly_patterns(heure, jour_semaine);

COMMENT ON MATERIALIZED VIEW mv_hourly_patterns IS 'Patterns de commandes par heure et jour de la semaine';

-- Fonction pour rafraîchir toutes les vues matérialisées
CREATE OR REPLACE FUNCTION refresh_all_analytics_views()
RETURNS TEXT AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_duration INTERVAL;
BEGIN
  v_start_time := clock_timestamp();

  -- Rafraîchir toutes les vues matérialisées de manière concurrente
  -- (permet les lectures pendant le refresh)
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_commandes_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_products;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_vendeurs_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_livreurs_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_geographic_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_promotions_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hourly_patterns;

  v_end_time := clock_timestamp();
  v_duration := v_end_time - v_start_time;

  RETURN format('Toutes les vues matérialisées rafraîchies en %s', v_duration);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_all_analytics_views() IS 'Rafraîchit toutes les vues matérialisées pour les analytics';

-- Fonction pour obtenir un rapport analytique complet
CREATE OR REPLACE FUNCTION get_analytics_report(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB AS $$
DECLARE
  v_report JSONB;
BEGIN
  SELECT jsonb_build_object(
    'periode', jsonb_build_object(
      'debut', p_start_date,
      'fin', p_end_date
    ),
    'resume', (
      SELECT jsonb_build_object(
        'total_commandes', COUNT(*),
        'ca_total', SUM((details_paiement->>'total_apres_reduction')::NUMERIC),
        'panier_moyen', AVG((details_paiement->>'total_apres_reduction')::NUMERIC),
        'taux_annulation', ROUND(
          COUNT(*) FILTER (WHERE statut_commande = 'annulee')::NUMERIC / COUNT(*)::NUMERIC * 100, 2
        )
      )
      FROM commandes
      WHERE created_at >= p_start_date AND created_at < p_end_date + INTERVAL '1 day'
    ),
    'par_jour', (
      SELECT jsonb_agg(row_to_json(d))
      FROM mv_daily_commandes_stats d
      WHERE d.date_jour >= p_start_date AND d.date_jour <= p_end_date
      ORDER BY d.date_jour
    ),
    'top_produits', (
      SELECT jsonb_agg(row_to_json(p))
      FROM (
        SELECT * FROM mv_top_products
        LIMIT 10
      ) p
    ),
    'top_vendeurs', (
      SELECT jsonb_agg(row_to_json(v))
      FROM (
        SELECT * FROM mv_vendeurs_performance
        LIMIT 10
      ) v
    ),
    'top_livreurs', (
      SELECT jsonb_agg(row_to_json(l))
      FROM (
        SELECT * FROM mv_livreurs_performance
        LIMIT 10
      ) l
    ),
    'par_zone', (
      SELECT jsonb_agg(row_to_json(z))
      FROM (
        SELECT * FROM mv_geographic_stats
        LIMIT 20
      ) z
    )
  ) INTO v_report;

  RETURN v_report;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_analytics_report(DATE, DATE) IS 'Génère un rapport analytique complet pour une période donnée';

-- Créer un job pour rafraîchir automatiquement les vues chaque nuit à 2h
-- Note: Ceci nécessite l'extension pg_cron (à installer via Supabase dashboard)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('refresh-analytics', '0 2 * * *', 'SELECT refresh_all_analytics_views()');

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Vues matérialisées créées:';
  RAISE NOTICE '   - mv_daily_commandes_stats (stats quotidiennes)';
  RAISE NOTICE '   - mv_top_products (top produits)';
  RAISE NOTICE '   - mv_vendeurs_performance (performance vendeurs)';
  RAISE NOTICE '   - mv_livreurs_performance (performance livreurs)';
  RAISE NOTICE '   - mv_geographic_stats (stats par zone)';
  RAISE NOTICE '   - mv_promotions_stats (stats promotions)';
  RAISE NOTICE '   - mv_hourly_patterns (patterns horaires)';
  RAISE NOTICE '✅ Fonction refresh_all_analytics_views() disponible';
  RAISE NOTICE '✅ Fonction get_analytics_report() disponible';
  RAISE NOTICE '📊 Exécutez "SELECT refresh_all_analytics_views()" pour peupler les vues';
END $$;
