-- ============================================================================
-- SCRIPT DE GÉNÉRATION D'OPÉRATIONS COMPTABLES RÉALISTES
-- ============================================================================
-- Génère des opérations d'encaissement et de dépenses sur 6 mois
-- pour simuler l'activité d'une sandwicherie
-- ============================================================================

-- PRÉREQUIS : Avoir au moins un utilisateur dans la table users
-- Vérifier avec : SELECT id FROM users LIMIT 1;

DO $$
DECLARE
  v_user_id UUID;
  v_date DATE;
  v_end_date DATE;
  v_montant DECIMAL(10,2);
  v_compte TEXT;
  v_comptes TEXT[] := ARRAY['caisse', 'MTN MoMo', 'Celtiis Cash'];
  v_jour_semaine INT;
  v_nombre_encaissements INT;
  v_nombre_depenses INT;
  i INT;
BEGIN
  -- Récupérer un utilisateur existant (prendre le premier admin/superviseur)
  SELECT id INTO v_user_id
  FROM users
  WHERE role IN ('admin', 'superviseur')
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé. Veuillez créer un utilisateur admin ou superviseur d''abord.';
  END IF;

  RAISE NOTICE 'Utilisateur sélectionné: %', v_user_id;
  RAISE NOTICE 'Début de la génération des opérations...';
  RAISE NOTICE '';

  -- Définir la période : 6 mois en arrière jusqu'à aujourd'hui
  v_date := CURRENT_DATE - INTERVAL '6 months';
  v_end_date := CURRENT_DATE;

  -- Boucle sur chaque jour
  WHILE v_date <= v_end_date LOOP
    v_jour_semaine := EXTRACT(DOW FROM v_date); -- 0=Dimanche, 6=Samedi

    -- ========================================================================
    -- ENCAISSEMENTS (Ventes quotidiennes)
    -- ========================================================================
    -- Plus d'encaissements en semaine, moins le dimanche
    IF v_jour_semaine = 0 THEN
      -- Dimanche : 1-2 encaissements (jour calme)
      v_nombre_encaissements := 1 + floor(random() * 2)::INT;
    ELSIF v_jour_semaine = 6 THEN
      -- Samedi : 3-5 encaissements (jour moyen)
      v_nombre_encaissements := 3 + floor(random() * 3)::INT;
    ELSE
      -- Lundi-Vendredi : 4-8 encaissements (jours actifs)
      v_nombre_encaissements := 4 + floor(random() * 5)::INT;
    END IF;

    -- Générer les encaissements
    FOR i IN 1..v_nombre_encaissements LOOP
      -- Montant aléatoire entre 5000 et 50000 XOF
      v_montant := 5000 + (random() * 45000)::DECIMAL(10,2);
      v_montant := ROUND(v_montant / 100) * 100; -- Arrondir à la centaine

      -- Choisir un compte aléatoire (80% caisse, 15% MoMo, 5% Celtiis)
      IF random() < 0.80 THEN
        v_compte := 'caisse';
      ELSIF random() < 0.95 THEN
        v_compte := 'MTN MoMo';
      ELSE
        v_compte := 'Celtiis Cash';
      END IF;

      -- Insérer l'encaissement
      INSERT INTO operations_comptables (
        operation,
        compte,
        montant,
        motif,
        date_operation,
        user_id
      ) VALUES (
        'encaissement',
        v_compte::type_compte,
        v_montant,
        CASE
          WHEN v_montant < 10000 THEN 'Vente sandwichs et boissons'
          WHEN v_montant < 25000 THEN 'Vente repas du midi'
          WHEN v_montant < 40000 THEN 'Vente groupe/entreprise'
          ELSE 'Vente événement spécial'
        END,
        v_date,
        v_user_id
      );
    END LOOP;

    -- ========================================================================
    -- DÉPENSES (Variables selon le jour)
    -- ========================================================================
    -- Lundi et Jeudi : plus de dépenses (réapprovisionnement)
    -- Autres jours : dépenses courantes
    IF v_jour_semaine IN (1, 4) THEN
      -- Lundi/Jeudi : 2-4 dépenses
      v_nombre_depenses := 2 + floor(random() * 3)::INT;
    ELSIF v_jour_semaine = 0 THEN
      -- Dimanche : 0-1 dépense
      v_nombre_depenses := floor(random() * 2)::INT;
    ELSE
      -- Autres jours : 1-2 dépenses
      v_nombre_depenses := 1 + floor(random() * 2)::INT;
    END IF;

    -- Générer les dépenses
    FOR i IN 1..v_nombre_depenses LOOP
      -- Montant aléatoire entre 500 et 80000 XOF
      v_montant := 500 + (random() * 79500)::DECIMAL(10,2);
      v_montant := ROUND(v_montant / 100) * 100; -- Arrondir à la centaine

      -- Choisir un compte (90% caisse, 8% MoMo, 2% Celtiis)
      IF random() < 0.90 THEN
        v_compte := 'caisse';
      ELSIF random() < 0.98 THEN
        v_compte := 'MTN MoMo';
      ELSE
        v_compte := 'Celtiis Cash';
      END IF;

      -- Insérer la dépense avec un motif réaliste
      INSERT INTO operations_comptables (
        operation,
        compte,
        montant,
        motif,
        date_operation,
        user_id
      ) VALUES (
        'depense',
        v_compte::type_compte,
        v_montant,
        CASE
          WHEN v_montant < 2000 THEN
            CASE floor(random() * 4)::INT
              WHEN 0 THEN 'Achat condiments et épices'
              WHEN 1 THEN 'Transport et déplacement'
              WHEN 2 THEN 'Petit matériel cuisine'
              ELSE 'Produits d''entretien'
            END
          WHEN v_montant < 10000 THEN
            CASE floor(random() * 5)::INT
              WHEN 0 THEN 'Achat pain et viennoiseries'
              WHEN 1 THEN 'Achat légumes et fruits'
              WHEN 2 THEN 'Achat boissons et jus'
              WHEN 3 THEN 'Électricité et eau'
              ELSE 'Téléphone et internet'
            END
          WHEN v_montant < 30000 THEN
            CASE floor(random() * 4)::INT
              WHEN 0 THEN 'Achat viandes et charcuteries'
              WHEN 1 THEN 'Achat fromages et produits laitiers'
              WHEN 2 THEN 'Salaires journaliers'
              ELSE 'Maintenance équipements'
            END
          ELSE
            CASE floor(random() * 3)::INT
              WHEN 0 THEN 'Réapprovisionnement stock complet'
              WHEN 1 THEN 'Loyer mensuel'
              ELSE 'Achat équipement majeur'
            END
        END,
        v_date,
        v_user_id
      );
    END LOOP;

    -- Passer au jour suivant
    v_date := v_date + INTERVAL '1 day';
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'GÉNÉRATION TERMINÉE';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Résumé des opérations créées:';
  RAISE NOTICE '';
END $$;

-- Afficher les statistiques des opérations générées
DO $$
DECLARE
  v_total_encaissements DECIMAL(10,2);
  v_total_depenses DECIMAL(10,2);
  v_solde DECIMAL(10,2);
  v_nb_encaissements INT;
  v_nb_depenses INT;
  v_date_debut DATE;
  v_date_fin DATE;
BEGIN
  -- Statistiques globales
  SELECT
    COUNT(*) FILTER (WHERE operation = 'encaissement'),
    COALESCE(SUM(montant) FILTER (WHERE operation = 'encaissement'), 0),
    COUNT(*) FILTER (WHERE operation = 'depense'),
    COALESCE(SUM(montant) FILTER (WHERE operation = 'depense'), 0),
    MIN(date_operation),
    MAX(date_operation)
  INTO
    v_nb_encaissements,
    v_total_encaissements,
    v_nb_depenses,
    v_total_depenses,
    v_date_debut,
    v_date_fin
  FROM operations_comptables;

  v_solde := v_total_encaissements - v_total_depenses;

  RAISE NOTICE 'Période: % à %', v_date_debut, v_date_fin;
  RAISE NOTICE '';
  RAISE NOTICE 'ENCAISSEMENTS:';
  RAISE NOTICE '  - Nombre: %', v_nb_encaissements;
  RAISE NOTICE '  - Montant total: % XOF', v_total_encaissements;
  RAISE NOTICE '  - Moyenne par opération: % XOF', ROUND(v_total_encaissements / NULLIF(v_nb_encaissements, 0), 2);
  RAISE NOTICE '';
  RAISE NOTICE 'DÉPENSES:';
  RAISE NOTICE '  - Nombre: %', v_nb_depenses;
  RAISE NOTICE '  - Montant total: % XOF', v_total_depenses;
  RAISE NOTICE '  - Moyenne par opération: % XOF', ROUND(v_total_depenses / NULLIF(v_nb_depenses, 0), 2);
  RAISE NOTICE '';
  RAISE NOTICE 'SOLDE NET: % XOF', v_solde;
  RAISE NOTICE '';
  RAISE NOTICE '------------------------------------------------';
  RAISE NOTICE 'Répartition par compte:';
  RAISE NOTICE '------------------------------------------------';
  RAISE NOTICE '';
END $$;

-- Détails par compte
SELECT
  compte,
  COUNT(*) FILTER (WHERE operation = 'encaissement') as nb_encaissements,
  COALESCE(SUM(montant) FILTER (WHERE operation = 'encaissement'), 0) as total_encaissements,
  COUNT(*) FILTER (WHERE operation = 'depense') as nb_depenses,
  COALESCE(SUM(montant) FILTER (WHERE operation = 'depense'), 0) as total_depenses,
  COALESCE(SUM(montant) FILTER (WHERE operation = 'encaissement'), 0) -
  COALESCE(SUM(montant) FILTER (WHERE operation = 'depense'), 0) as solde
FROM operations_comptables
GROUP BY compte
ORDER BY compte;
