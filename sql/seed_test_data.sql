-- ============================================================================
-- DONNÉES DE TEST - COMMANDES
-- ============================================================================
-- Génère 50 commandes par jour du 2 au 19 janvier 2026
-- Panier moyen: 2500 FCFA
-- Répartition: 30% livraison, 70% sur-place
-- Toutes les adresses sont à Cotonou
-- Les dates de livraison ne sont pas définies (conformément aux validations)
-- ============================================================================

-- Fonction pour générer des données de test
DO $$
DECLARE
  v_current_date DATE := '2026-01-02';
  v_end_date DATE := '2026-01-19';
  v_commandes_per_day INTEGER := 50;
  v_vendeur_id UUID;
  v_livreur_id UUID;
  v_commande_id UUID;
  v_current_time TIMESTAMPTZ;
  v_type_commande type_commande;
  v_client_nom TEXT;
  v_contact TEXT;
  v_quartier TEXT;
  v_arrondissement TEXT;
  v_lat DOUBLE PRECISION;
  v_lng DOUBLE PRECISION;
  v_nb_items INTEGER;
  v_prix_item NUMERIC;
  v_total NUMERIC;
  v_frais_livraison NUMERIC;
  v_has_promo BOOLEAN;
  v_montant_reduction NUMERIC;
  v_statut_paiement statut_paiement;
  v_momo NUMERIC;
  v_cash NUMERIC;
  v_statut_livraison statut_livraison;
  v_statut_commande statut_commande;

  -- Produits disponibles avec prix
  v_produits TEXT[] := ARRAY[
    'Sandwich Poulet', 'Sandwich Thon', 'Sandwich Omelette',
    'Sandwich Végétarien', 'Salade César', 'Salade Mixte',
    'Jus Ananas', 'Jus Orange', 'Jus Bissap', 'Eau Minérale',
    'Café', 'Thé', 'Smoothie Mangue', 'Smoothie Banane'
  ];

  v_prix TEXT[] := ARRAY[
    '1500', '1800', '1200',
    '1300', '2000', '1800',
    '500', '500', '600', '300',
    '400', '300', '800', '800'
  ];

  -- Quartiers de Cotonou avec coordonnées GPS
  v_quartiers TEXT[] := ARRAY[
    'Akpakpa', 'Cadjèhoun', 'Gbégamey', 'Haie Vive', 'Jonquet',
    'Menontin', 'Sainte Rita', 'Vossa', 'Agla', 'Aidjedo',
    'Fifadji', 'Ganhi', 'Houéyiho', 'Sikècodji', 'Tokpa'
  ];

  v_arrondissements TEXT[] := ARRAY[
    '1er Arrondissement', '2ème Arrondissement', '3ème Arrondissement',
    '4ème Arrondissement', '5ème Arrondissement', '6ème Arrondissement',
    '7ème Arrondissement', '8ème Arrondissement', '9ème Arrondissement',
    '10ème Arrondissement', '11ème Arrondissement', '12ème Arrondissement',
    '13ème Arrondissement'
  ];

  -- Coordonnées GPS de Cotonou (zone approximative)
  -- Centre: 6.3654° N, 2.4183° E
  v_lat_min DOUBLE PRECISION := 6.3200;
  v_lat_max DOUBLE PRECISION := 6.4100;
  v_lng_min DOUBLE PRECISION := 2.3800;
  v_lng_max DOUBLE PRECISION := 2.4600;

  -- Noms de clients
  v_prenoms TEXT[] := ARRAY[
    'Jean', 'Marie', 'Pierre', 'Fatou', 'Moussa', 'Aïcha',
    'Ibrahim', 'Aminata', 'Ousmane', 'Fatoumata', 'Mamadou',
    'Kadiatou', 'Abdoulaye', 'Mariam', 'Sekou', 'Rokia'
  ];

  v_noms TEXT[] := ARRAY[
    'Dossou', 'Kpade', 'Houngbedji', 'Akouete', 'Soglo',
    'Amoussou', 'Zinsou', 'Adande', 'Gbenou', 'Tokpanou',
    'Houeto', 'Djossou', 'Sagbo', 'Hounnou', 'Azondekon'
  ];

  v_counter INTEGER := 0;
  v_item_index INTEGER;
  v_details_commandes JSONB;
  v_item_obj JSONB;

BEGIN
  -- Récupérer un vendeur et un livreur (utiliser les IDs existants ou créer des valeurs par défaut)
  SELECT id INTO v_vendeur_id FROM users WHERE role = 'vendeur' LIMIT 1;
  SELECT id INTO v_livreur_id FROM users WHERE role = 'livreur' LIMIT 1;

  RAISE NOTICE '🚀 Génération de données de test...';
  RAISE NOTICE '📅 Période: % à %', v_current_date, v_end_date;
  RAISE NOTICE '📊 Commandes par jour: %', v_commandes_per_day;

  -- Boucle sur chaque jour
  WHILE v_current_date <= v_end_date LOOP

    -- Générer 50 commandes pour ce jour
    FOR i IN 1..v_commandes_per_day LOOP
      v_counter := v_counter + 1;

      -- Heure aléatoire entre 8h et 20h
      v_current_time := v_current_date +
                        (INTERVAL '8 hours') +
                        (random() * INTERVAL '12 hours');

      -- Type de commande (30% livraison, 70% sur-place pour éviter les validations de dates)
      IF random() < 0.3 THEN
        v_type_commande := 'livraison';
      ELSE
        v_type_commande := 'sur-place';
      END IF;

      -- Nom du client
      v_client_nom := v_prenoms[1 + floor(random() * array_length(v_prenoms, 1))] || ' ' ||
                      v_noms[1 + floor(random() * array_length(v_noms, 1))];

      -- Contact
      v_contact := '+229 ' ||
                   (90 + floor(random() * 10))::TEXT || ' ' ||
                   lpad((floor(random() * 100))::TEXT, 2, '0') || ' ' ||
                   lpad((floor(random() * 100))::TEXT, 2, '0') || ' ' ||
                   lpad((floor(random() * 100))::TEXT, 2, '0');

      -- Localisation (si livraison)
      IF v_type_commande = 'livraison' THEN
        v_quartier := v_quartiers[1 + floor(random() * array_length(v_quartiers, 1))];
        v_arrondissement := v_arrondissements[1 + floor(random() * array_length(v_arrondissements, 1))];
        v_lat := v_lat_min + (random() * (v_lat_max - v_lat_min));
        v_lng := v_lng_min + (random() * (v_lng_max - v_lng_min));
      END IF;

      -- Nombre d'items (1 à 5)
      v_nb_items := 1 + floor(random() * 5);

      -- Construire les détails de commande
      v_details_commandes := '[]'::jsonb;
      v_total := 0;

      FOR j IN 1..v_nb_items LOOP
        v_item_index := 1 + floor(random() * array_length(v_produits, 1));
        v_prix_item := v_prix[v_item_index]::NUMERIC;

        v_item_obj := jsonb_build_object(
          'item', v_produits[v_item_index],
          'quantite', 1 + floor(random() * 3), -- 1 à 3 unités
          'prix_unitaire', v_prix_item,
          'total', v_prix_item * (1 + floor(random() * 3))
        );

        v_details_commandes := v_details_commandes || v_item_obj;
        v_total := v_total + (v_item_obj->>'total')::NUMERIC;
      END LOOP;

      -- Ajuster le total pour avoir un panier moyen de 2500
      -- Ajouter une variation de ±30%
      v_total := 2500 + (random() * 1500 - 750);
      v_total := ROUND(v_total / 100) * 100; -- Arrondir à la centaine

      -- Frais de livraison (si livraison)
      IF v_type_commande = 'livraison' THEN
        v_frais_livraison := 200 + (floor(random() * 4) * 100); -- 200 à 500
        v_total := v_total + v_frais_livraison;
      ELSE
        v_frais_livraison := 0;
      END IF;

      -- Promotion (20% des commandes)
      v_has_promo := random() < 0.2;
      IF v_has_promo THEN
        v_montant_reduction := ROUND(v_total * 0.1); -- 10% de réduction
      ELSE
        v_montant_reduction := 0;
      END IF;

      -- Statut de paiement (85% payées, 10% partiellement, 5% non payées)
      IF random() < 0.85 THEN
        v_statut_paiement := 'payee';
        v_momo := ROUND(v_total * 0.6); -- 60% MoMo
        v_cash := v_total - v_montant_reduction - v_momo;
      ELSIF random() < 0.95 THEN
        v_statut_paiement := 'partiellement_payee';
        v_momo := ROUND(v_total * 0.4);
        v_cash := ROUND(v_total * 0.3);
      ELSE
        v_statut_paiement := 'non_payee';
        v_momo := 0;
        v_cash := 0;
      END IF;

      -- Statut de livraison (si livraison)
      IF v_type_commande = 'livraison' THEN
        -- Toutes les livraisons sont en attente (pas de dates définies)
        v_statut_livraison := 'en_attente';
      ELSE
        v_statut_livraison := 'en_attente'; -- Sur place n'a pas de livraison
      END IF;

      -- Statut de commande (principalement en cours, quelques terminées/annulées)
      IF random() < 0.05 THEN
        v_statut_commande := 'annulee';
      ELSIF random() < 0.2 THEN
        v_statut_commande := 'terminee';
      ELSE
        v_statut_commande := 'en_cours';
      END IF;

      -- Insérer la commande
      INSERT INTO commandes (
        type,
        client,
        contact_client,
        lieu_livraison,
        livreur,
        date_livraison,
        heure_livraison,
        date_reelle_livraison,
        heure_reelle_livraison,
        frais_livraison,
        statut_livraison,
        statut_paiement,
        statut_commande,
        details_commandes,
        promotion,
        details_paiement,
        vendeur,
        created_at,
        updated_at
      ) VALUES (
        v_type_commande,
        v_client_nom,
        v_contact,
        CASE
          WHEN v_type_commande = 'livraison' THEN
            jsonb_build_object(
              'quartier', v_quartier,
              'arrondissement', v_arrondissement,
              'commune', 'Cotonou',
              'departement', 'Littoral',
              'localisation', jsonb_build_object(
                'lat', v_lat,
                'lng', v_lng
              )
            )
          ELSE NULL
        END,
        CASE
          WHEN v_type_commande = 'livraison' AND v_livreur_id IS NOT NULL THEN v_livreur_id
          ELSE NULL
        END,
        NULL, -- date_livraison (sera définie manuellement ou via l'app)
        NULL, -- heure_livraison (sera définie manuellement ou via l'app)
        NULL, -- date_reelle_livraison (pas encore livrée)
        NULL, -- heure_reelle_livraison (pas encore livrée)
        v_frais_livraison,
        v_statut_livraison,
        v_statut_paiement,
        v_statut_commande,
        v_details_commandes,
        CASE
          WHEN v_has_promo THEN
            jsonb_build_object(
              'code', 'PROMO' || (floor(random() * 10))::TEXT,
              'type', 'pourcentage',
              'valeur', 10,
              'montant_reduction', v_montant_reduction
            )
          ELSE NULL
        END,
        jsonb_build_object(
          'total', v_total,
          'total_apres_reduction', v_total - v_montant_reduction,
          'momo', v_momo,
          'cash', v_cash,
          'autre', 0
        ),
        v_vendeur_id,
        v_current_time,
        v_current_time
      );

      -- Afficher progression tous les 100 commandes
      IF v_counter % 100 = 0 THEN
        RAISE NOTICE '✅ % commandes générées...', v_counter;
      END IF;

    END LOOP;

    -- Jour suivant
    v_current_date := v_current_date + INTERVAL '1 day';

  END LOOP;

  RAISE NOTICE '✅ Total: % commandes générées!', v_counter;
  RAISE NOTICE '📊 Statistiques:';
  RAISE NOTICE '   - Période: 2026-01-02 à 2026-01-19';
  RAISE NOTICE '   - Commandes par jour: %', v_commandes_per_day;
  RAISE NOTICE '   - Panier moyen cible: 2500 FCFA';
  RAISE NOTICE '   - Répartition: 30%% livraison, 70%% sur-place';
  RAISE NOTICE '   - Toutes les adresses sont à Cotonou';
  RAISE NOTICE '   - Dates de livraison: non définies (à planifier manuellement)';

END $$;

-- Vérifier les données générées
SELECT
  DATE(created_at) as date,
  COUNT(*) as nb_commandes,
  ROUND(AVG((details_paiement->>'total_apres_reduction')::NUMERIC)) as panier_moyen,
  COUNT(*) FILTER (WHERE type = 'livraison') as nb_livraisons,
  COUNT(*) FILTER (WHERE type = 'sur-place') as nb_sur_place,
  COUNT(*) FILTER (WHERE statut_paiement = 'payee') as nb_payees
FROM commandes
WHERE created_at >= '2026-01-02' AND created_at < '2026-01-20'
GROUP BY DATE(created_at)
ORDER BY date;

-- Statistiques globales
SELECT
  COUNT(*) as total_commandes,
  ROUND(AVG((details_paiement->>'total_apres_reduction')::NUMERIC)) as panier_moyen,
  ROUND(SUM((details_paiement->>'total_apres_reduction')::NUMERIC)) as ca_total,
  COUNT(*) FILTER (WHERE type = 'livraison') as total_livraisons,
  COUNT(*) FILTER (WHERE type = 'sur-place') as total_sur_place,
  COUNT(*) FILTER (WHERE statut_commande = 'terminee') as total_terminees,
  COUNT(*) FILTER (WHERE statut_commande = 'en_cours') as total_en_cours,
  COUNT(*) FILTER (WHERE statut_commande = 'annulee') as total_annulees
FROM commandes
WHERE created_at >= '2026-01-02' AND created_at < '2026-01-20';

-- Afficher les quartiers les plus demandés
SELECT
  lieu_livraison->>'quartier' as quartier,
  COUNT(*) as nb_commandes,
  ROUND(AVG((details_paiement->>'total_apres_reduction')::NUMERIC)) as panier_moyen
FROM commandes
WHERE created_at >= '2026-01-02'
  AND created_at < '2026-01-20'
  AND type = 'livraison'
  AND lieu_livraison->>'quartier' IS NOT NULL
GROUP BY lieu_livraison->>'quartier'
ORDER BY nb_commandes DESC
LIMIT 10;
