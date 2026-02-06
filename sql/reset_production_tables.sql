-- ============================================================================
-- Script de réinitialisation des données de test
-- ============================================================================
-- ATTENTION: Ce script supprime TOUTES les données des tables spécifiées
-- Utiliser uniquement pour préparer le passage en production
-- ============================================================================
-- Note: Exécuter ce script dans le SQL Editor de Supabase
-- ============================================================================

DO $$
DECLARE
  v_count_commandes INTEGER;
  v_count_tasks INTEGER;
  v_count_promotions INTEGER;
  v_count_promotions_archive INTEGER;
  v_count_operations INTEGER;
  v_count_menus INTEGER;
  v_count_livreurs INTEGER;
  v_count_history INTEGER;
  v_count_budget INTEGER;
  v_count_days INTEGER;
  v_total_records INTEGER := 0;
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'SCRIPT DE RÉINITIALISATION DES DONNÉES DE TEST';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables concernées:';
  RAISE NOTICE '  - commandes';
  RAISE NOTICE '  - tasks';
  RAISE NOTICE '  - promotions';
  RAISE NOTICE '  - promotions_archive';
  RAISE NOTICE '  - operations_comptables';
  RAISE NOTICE '  - menus';
  RAISE NOTICE '  - livreurs';
  RAISE NOTICE '  - commandes_history';
  RAISE NOTICE '  - budget_comptable';
  RAISE NOTICE '  - days';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'COMPTAGE DES ENREGISTREMENTS AVANT SUPPRESSION';
  RAISE NOTICE '============================================================================';

  -- Compter les enregistrements
  SELECT COUNT(*) INTO v_count_commandes FROM commandes;
  SELECT COUNT(*) INTO v_count_tasks FROM tasks;
  SELECT COUNT(*) INTO v_count_promotions FROM promotions;
  SELECT COUNT(*) INTO v_count_promotions_archive FROM promotions_archive;
  SELECT COUNT(*) INTO v_count_operations FROM operations_comptables;
  SELECT COUNT(*) INTO v_count_menus FROM menus;
  SELECT COUNT(*) INTO v_count_livreurs FROM livreurs;
  SELECT COUNT(*) INTO v_count_history FROM commandes_history;
  SELECT COUNT(*) INTO v_count_budget FROM budget_comptable;
  SELECT COUNT(*) INTO v_count_days FROM days;

  v_total_records := v_count_commandes + v_count_tasks + v_count_promotions +
                     v_count_promotions_archive + v_count_operations + v_count_menus +
                     v_count_livreurs + v_count_history + v_count_budget + v_count_days;

  RAISE NOTICE 'commandes: % enregistrements', v_count_commandes;
  RAISE NOTICE 'tasks: % enregistrements', v_count_tasks;
  RAISE NOTICE 'promotions: % enregistrements', v_count_promotions;
  RAISE NOTICE 'promotions_archive: % enregistrements', v_count_promotions_archive;
  RAISE NOTICE 'operations_comptables: % enregistrements', v_count_operations;
  RAISE NOTICE 'menus: % enregistrements', v_count_menus;
  RAISE NOTICE 'livreurs: % enregistrements', v_count_livreurs;
  RAISE NOTICE 'commandes_history: % enregistrements', v_count_history;
  RAISE NOTICE 'budget_comptable: % enregistrements', v_count_budget;
  RAISE NOTICE 'days: % enregistrements', v_count_days;
  RAISE NOTICE '';
  RAISE NOTICE 'TOTAL: % enregistrements seront supprimés', v_total_records;
  RAISE NOTICE '';

  IF v_total_records = 0 THEN
    RAISE NOTICE 'Aucune donnée à supprimer. Les tables sont déjà vides.';
    RETURN;
  END IF;

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'DÉBUT DE LA SUPPRESSION';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';

  -- Désactiver temporairement les triggers utilisateur pour améliorer les performances
  -- Note: On utilise USER au lieu de ALL car Supabase ne permet pas de désactiver les triggers système
  RAISE NOTICE 'Désactivation des triggers utilisateur...';
  ALTER TABLE commandes DISABLE TRIGGER USER;
  ALTER TABLE tasks DISABLE TRIGGER USER;
  ALTER TABLE promotions DISABLE TRIGGER USER;
  ALTER TABLE promotions_archive DISABLE TRIGGER USER;
  ALTER TABLE operations_comptables DISABLE TRIGGER USER;
  ALTER TABLE menus DISABLE TRIGGER USER;
  ALTER TABLE livreurs DISABLE TRIGGER USER;
  ALTER TABLE commandes_history DISABLE TRIGGER USER;
  ALTER TABLE budget_comptable DISABLE TRIGGER USER;
  ALTER TABLE days DISABLE TRIGGER USER;

  -- Suppression des données dans l'ordre pour respecter les contraintes
  -- 1. Tables qui référencent d'autres tables en premier

  RAISE NOTICE 'Suppression de commandes_history...';
  TRUNCATE TABLE commandes_history RESTART IDENTITY CASCADE;

  RAISE NOTICE 'Suppression de tasks...';
  TRUNCATE TABLE tasks RESTART IDENTITY CASCADE;

  RAISE NOTICE 'Suppression de commandes...';
  TRUNCATE TABLE commandes RESTART IDENTITY CASCADE;

  RAISE NOTICE 'Suppression de promotions_archive...';
  TRUNCATE TABLE promotions_archive RESTART IDENTITY CASCADE;

  RAISE NOTICE 'Suppression de promotions...';
  TRUNCATE TABLE promotions RESTART IDENTITY CASCADE;

  RAISE NOTICE 'Suppression de operations_comptables...';
  TRUNCATE TABLE operations_comptables RESTART IDENTITY CASCADE;

  RAISE NOTICE 'Suppression de budget_comptable...';
  TRUNCATE TABLE budget_comptable RESTART IDENTITY CASCADE;

  RAISE NOTICE 'Suppression de menus...';
  TRUNCATE TABLE menus RESTART IDENTITY CASCADE;

  RAISE NOTICE 'Suppression de livreurs...';
  TRUNCATE TABLE livreurs RESTART IDENTITY CASCADE;

  RAISE NOTICE 'Suppression de days...';
  TRUNCATE TABLE days RESTART IDENTITY CASCADE;

  -- Réactiver les triggers utilisateur
  RAISE NOTICE '';
  RAISE NOTICE 'Réactivation des triggers utilisateur...';
  ALTER TABLE commandes ENABLE TRIGGER USER;
  ALTER TABLE tasks ENABLE TRIGGER USER;
  ALTER TABLE promotions ENABLE TRIGGER USER;
  ALTER TABLE promotions_archive ENABLE TRIGGER USER;
  ALTER TABLE operations_comptables ENABLE TRIGGER USER;
  ALTER TABLE menus ENABLE TRIGGER USER;
  ALTER TABLE livreurs ENABLE TRIGGER USER;
  ALTER TABLE commandes_history ENABLE TRIGGER USER;
  ALTER TABLE budget_comptable ENABLE TRIGGER USER;
  ALTER TABLE days ENABLE TRIGGER USER;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'RÉINITIALISATION TERMINÉE AVEC SUCCÈS';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '% enregistrements au total ont été supprimés', v_total_records;
  RAISE NOTICE 'Toutes les séquences ont été réinitialisées';
  RAISE NOTICE 'Les tables sont prêtes pour les données de production';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Les tables suivantes n''ont PAS été affectées:';
  RAISE NOTICE '  - utilisateurs (comptes utilisateurs préservés)';
  RAISE NOTICE '  - emplacements (points de vente préservés)';
  RAISE NOTICE '  - produits (catalogue préservé)';
  RAISE NOTICE '  - autres tables de configuration système';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';

END $$;

-- Vérification finale
DO $$
DECLARE
  v_count_total INTEGER;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM commandes) +
    (SELECT COUNT(*) FROM tasks) +
    (SELECT COUNT(*) FROM promotions) +
    (SELECT COUNT(*) FROM promotions_archive) +
    (SELECT COUNT(*) FROM operations_comptables) +
    (SELECT COUNT(*) FROM menus) +
    (SELECT COUNT(*) FROM livreurs) +
    (SELECT COUNT(*) FROM commandes_history) +
    (SELECT COUNT(*) FROM budget_comptable) +
    (SELECT COUNT(*) FROM days)
  INTO v_count_total;

  RAISE NOTICE '';
  RAISE NOTICE 'VÉRIFICATION POST-SUPPRESSION';
  RAISE NOTICE '----------------------------';
  RAISE NOTICE 'Total enregistrements restants: %', v_count_total;

  IF v_count_total = 0 THEN
    RAISE NOTICE '✓ Toutes les tables ont été correctement vidées';
  ELSE
    RAISE WARNING '⚠ Attention: % enregistrements restants détectés', v_count_total;
  END IF;
END $$;
