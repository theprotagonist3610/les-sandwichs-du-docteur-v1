# Migrations Supabase - Gestion des utilisateurs

Ce dossier contient les migrations SQL pour configurer la base de données Supabase pour la gestion des utilisateurs.

## Ordre d'exécution des migrations

Les migrations doivent être exécutées dans l'ordre suivant :

1. **001_create_users_table.sql** - Création de la table `users`
2. **002_create_connection_history_table.sql** - Création de la table `user_connection_history`
3. **003_create_triggers.sql** - Création des triggers (updated_at, historique connexion)
4. **004_create_rls_policies.sql** - Configuration des politiques de sécurité Row Level Security
5. **005_create_functions.sql** - Création des fonctions utilitaires

## Comment appliquer les migrations

### Via l'interface Supabase Dashboard

1. Connectez-vous à votre projet Supabase : https://app.supabase.com
2. Allez dans **SQL Editor**
3. Copiez-collez le contenu de chaque migration dans l'ordre
4. Exécutez chaque migration

### Via Supabase CLI (recommandé)

```bash
# Installer Supabase CLI si ce n'est pas déjà fait
npm install -g supabase

# Se connecter à votre projet
supabase login

# Lier votre projet local
supabase link --project-ref <YOUR_PROJECT_ID>

# Appliquer toutes les migrations
supabase db push
```

## Structure de la base de données

### Table `users`
- Stocke les informations de profil des utilisateurs
- Liée à `auth.users` de Supabase Auth
- Contient : nom, prenoms, email, telephone, sexe, date_naissance, role, photo_url, is_active

### Table `user_connection_history`
- Historique de toutes les connexions
- Enregistre : user_id, connection_date, ip_address, user_agent, success, failure_reason

## Politiques de sécurité (RLS)

### Pour les vendeurs :
- ✅ Peuvent voir et modifier leur propre profil uniquement
- ❌ Ne peuvent pas modifier leur rôle
- ✅ Peuvent voir leur propre historique de connexion

### Pour les superviseurs :
- ✅ Peuvent voir et modifier tous les profils
- ✅ Peuvent voir tous les historiques de connexion
- ❌ Ne peuvent pas créer ou supprimer des utilisateurs

### Pour les admins :
- ✅ Tous les droits (CRUD complet sur les utilisateurs)
- ✅ Peuvent créer, modifier, désactiver des utilisateurs
- ✅ Peuvent réinitialiser les mots de passe

## Fonctions disponibles

- `check_and_deactivate_inactive_users()` - Désactive les utilisateurs inactifs depuis 6+ mois
- `check_email_exists(email)` - Vérifie si un email existe déjà
- `get_user_profile(user_id)` - Récupère le profil complet d'un utilisateur
- `update_last_login(user_id)` - Met à jour la date de dernière connexion
- `count_users_by_role()` - Statistiques des utilisateurs par rôle

## Notes importantes

1. **Soft Delete** : Les utilisateurs ne sont jamais supprimés physiquement, seulement désactivés (`is_active = false`)
2. **Protection Admin** : Les admins ne peuvent pas être désactivés automatiquement pour inactivité
3. **Trigger automatique** : `updated_at` est mis à jour automatiquement à chaque modification
4. **Historique automatique** : Chaque connexion est enregistrée automatiquement via trigger
