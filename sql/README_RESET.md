# Script de Réinitialisation pour Production

## ⚠️ AVERTISSEMENT CRITIQUE

Ce script **SUPPRIME DÉFINITIVEMENT** toutes les données de test. Cette opération est **IRRÉVERSIBLE**.

## Tables Concernées

Le script réinitialise les tables suivantes:

- **commandes** - Toutes les commandes de test
- **tasks** - Toutes les tâches liées aux commandes
- **promotions** - Promotions actives
- **promotions_archive** - Historique des promotions
- **operations_comptables** - Opérations comptables de test
- **menus** - Menus créés
- **livreurs** - Livreurs enregistrés
- **commandes_history** - Historique des modifications de commandes
- **budget_comptable** - Budgets prévisionnels
- **days** - Données de clôture journalière

## Tables PRÉSERVÉES

Le script ne touche **PAS** aux tables suivantes:

- **utilisateurs** - Comptes utilisateurs (vendeurs, superviseurs, admin)
- **emplacements** - Points de vente configurés
- **produits** - Catalogue de produits
- Autres tables de configuration système

## Avant d'Exécuter

### 1. Sauvegarde de Sécurité

**OBLIGATOIRE**: Créer une sauvegarde complète de la base de données avant d'exécuter ce script.

```bash
# Via Supabase Dashboard:
# Settings > Database > Backup > Create Backup

# Ou via pg_dump (si accès direct):
pg_dump -h your-host -U postgres -d your-database > backup_before_reset.sql
```

### 2. Vérification de l'Environnement

- ✅ Assurez-vous d'être sur la **bonne base de données**
- ✅ Vérifiez que c'est bien l'environnement de **production**
- ✅ Confirmez que vous avez une **sauvegarde récente**
- ✅ Prévenez l'équipe que la base va être réinitialisée

### 3. Arrêt Temporaire de l'Application

Recommandé d'arrêter temporairement l'application pendant la réinitialisation pour éviter:
- Nouvelles insertions pendant la suppression
- Erreurs côté client
- Incohérences de données

## Exécution du Script

### Via Supabase Dashboard

1. Connectez-vous à [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Créez une nouvelle query
5. Copiez le contenu de `reset_production_tables.sql`
6. **LISEZ LE RAPPORT DE COMPTAGE** affiché avant de confirmer
7. Exécutez le script

### Via psql

```bash
psql -h your-host -U postgres -d your-database -f reset_production_tables.sql
```

## Ce que Fait le Script

1. **Comptage Initial**: Affiche le nombre d'enregistrements dans chaque table
2. **Désactivation des Triggers**: Pour améliorer les performances
3. **Suppression en Cascade**: Supprime les données dans l'ordre correct
4. **Réinitialisation des Séquences**: Remet les auto-increment à 1
5. **Réactivation des Triggers**: Restaure les triggers
6. **Vérification Finale**: Confirme que toutes les tables sont vides

## Sortie Attendue

```
============================================================================
SCRIPT DE RÉINITIALISATION DES DONNÉES DE TEST
============================================================================

Tables concernées:
  - commandes
  - tasks
  ...

============================================================================
COMPTAGE DES ENREGISTREMENTS AVANT SUPPRESSION
============================================================================
commandes: 145 enregistrements
tasks: 423 enregistrements
...
TOTAL: 1234 enregistrements seront supprimés

============================================================================
DÉBUT DE LA SUPPRESSION
============================================================================

Désactivation des triggers...
Suppression de commandes_history...
Suppression de tasks...
...

Réactivation des triggers...

============================================================================
RÉINITIALISATION TERMINÉE AVEC SUCCÈS
============================================================================

1234 enregistrements au total ont été supprimés
Toutes les séquences ont été réinitialisées
Les tables sont prêtes pour les données de production

VÉRIFICATION POST-SUPPRESSION
----------------------------
Total enregistrements restants: 0
✓ Toutes les tables ont été correctement vidées
```

## Après l'Exécution

### 1. Vérification

Vérifiez que les tables essentielles sont toujours intactes:

```sql
-- Vérifier les utilisateurs
SELECT COUNT(*) as nb_utilisateurs FROM utilisateurs;

-- Vérifier les emplacements
SELECT COUNT(*) as nb_emplacements FROM emplacements;

-- Vérifier les produits
SELECT COUNT(*) as nb_produits FROM produits;

-- Vérifier que les tables réinitialisées sont vides
SELECT
  (SELECT COUNT(*) FROM commandes) as commandes,
  (SELECT COUNT(*) FROM operations_comptables) as operations,
  (SELECT COUNT(*) FROM days) as days;
-- Doit retourner: commandes=0, operations=0, days=0
```

### 2. Redémarrage de l'Application

- Redémarrez l'application
- Testez la création d'une première commande réelle
- Vérifiez que les auto-increment fonctionnent (IDs commencent à 1)

### 3. Première Clôture

La première clôture de journée créera les données de référence pour les prévisions futures.

## En Cas de Problème

### Erreur pendant l'exécution

Si le script échoue:

1. Les triggers sont automatiquement réactivés par la gestion d'erreur PostgreSQL
2. Certaines tables peuvent être partiellement vidées
3. **RESTAUREZ LA SAUVEGARDE** et corrigez le problème avant de réessayer

### Restauration de la Sauvegarde

```bash
# Via pg_restore
pg_restore -h your-host -U postgres -d your-database backup_before_reset.sql
```

## Checklist Finale

Avant d'exécuter ce script en production:

- [ ] Sauvegarde complète créée et vérifiée
- [ ] Équipe prévenue de la maintenance
- [ ] Application arrêtée temporairement
- [ ] Environnement de production confirmé
- [ ] Script lu et compris
- [ ] Rapport de comptage vérifié
- [ ] Plan de restauration prêt en cas de problème

## Support

En cas de doute ou de problème:
1. **NE PAS** exécuter le script
2. Vérifier la documentation
3. Tester d'abord sur un environnement de staging
4. Contacter l'équipe technique si nécessaire

---

**Date de dernière modification**: 2026-02-06
**Version**: 1.0
