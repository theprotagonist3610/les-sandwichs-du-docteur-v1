# 🔐 Reconstruction du Système d'Authentification

## 📋 Vue d'ensemble

Ce document explique la reconstruction complète du système d'authentification pour résoudre les problèmes de **récursion RLS** qui causaient l'erreur "Profil utilisateur introuvable".

---

## 🚨 Problèmes Identifiés

### Problème Principal: Récursion Circulaire RLS

La politique RLS suivante créait une récursion infinie:

```sql
CREATE POLICY "Admins lisent tous les profils"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u  -- ❌ Lecture de 'users' pendant l'évaluation RLS de 'users'
    WHERE u.id = auth.uid()
    AND u.role IN ('admin', 'superviseur')
  )
);
```

**Pourquoi c'est problématique:**
1. L'utilisateur tente de lire son profil: `SELECT * FROM users WHERE id = auth.uid()`
2. PostgreSQL évalue les politiques RLS pour cette requête
3. La politique admin contient `EXISTS (SELECT FROM users ...)`
4. Cette sous-requête déclenche à nouveau l'évaluation RLS sur `users`
5. **Boucle infinie** → La requête échoue → "Profil utilisateur introuvable"

### Autres Problèmes

1. **Vérification email avant auth.signUp** - Requête RLS impossible pour utilisateur non authentifié
2. **Rollback client-side impossible** - `admin.deleteUser()` nécessite la clé service role
3. **Politiques UPDATE avec récursion** - Mêmes problèmes dans les politiques de modification

---

## ✅ Solution Implémentée

### 1. Fonctions SQL Stables (Sans Récursion)

Au lieu d'utiliser des sous-requêtes dans les politiques, on crée des **fonctions immutables** qui s'exécutent une seule fois:

```sql
-- Fonction qui récupère le rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Fonction qui vérifie si l'utilisateur est actif
CREATE OR REPLACE FUNCTION auth_user_is_active()
RETURNS BOOLEAN AS $$
  SELECT is_active FROM users WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Avantages:**
- `STABLE` = PostgreSQL met en cache le résultat pendant la transaction
- `SECURITY DEFINER` = Exécuté avec les permissions du créateur (contourne RLS)
- Pas de récursion car la fonction s'exécute **avant** l'évaluation des politiques

### 2. Nouvelles Politiques RLS

```sql
-- Lecture de son propre profil (toujours autorisé)
CREATE POLICY "users_select_own_profile"
ON users FOR SELECT
USING (id = auth.uid());

-- Lecture pour superviseurs/admins (via fonction)
CREATE POLICY "users_select_for_supervisors_admins"
ON users FOR SELECT
USING (
  auth_user_role() IN ('superviseur', 'admin')
  AND auth_user_is_active() = true
);
```

**Pourquoi ça fonctionne:**
1. PostgreSQL appelle `auth_user_role()` **une fois**
2. Le résultat est mis en cache
3. La politique utilise ce résultat sans faire de nouvelle requête SQL
4. Pas de récursion possible

### 3. Correction du Service d'Authentification

**Avant (Problématique):**
```javascript
// Vérification email avant signup (requête RLS impossible)
const { data: existingUser } = await supabase
  .from("users")
  .select("email")
  .eq("email", email)
  .single();

// Rollback impossible côté client
await supabase.auth.admin.deleteUser(authData.user.id);
```

**Après (Corrigé):**
```javascript
// Laisser Supabase Auth gérer les doublons d'email
const { data: authData, error: authError } = await supabase.auth.signUp({
  email,
  password,
});

// Si erreur de doublon, traduire le message
if (authError.message?.includes("already registered")) {
  return { error: { message: "Un compte existe déjà avec cet email." } };
}

// Pas de rollback automatique, log pour nettoyage manuel
if (insertError) {
  console.error("⚠️ Compte auth orphelin:", authData.user.id);
  return { error: { message: "Erreur. Code: " + authData.user.id.substring(0, 8) } };
}
```

---

## 📦 Fichiers Créés

### 1. `sql/rebuild_auth_system.sql`

Script SQL complet qui:
- ✅ Supprime la table `public.users` et toutes ses politiques
- ✅ Recrée la table avec la bonne structure
- ✅ Implémente les fonctions `auth_user_role()` et `auth_user_is_active()`
- ✅ Crée 6 politiques RLS sans récursion:
  - 1 pour INSERT (inscription)
  - 2 pour SELECT (lecture propre + lecture superviseurs/admins)
  - 2 pour UPDATE (modification propre + modification admins)
  - 1 pour DELETE (suppression admins)
- ✅ Recrée les fonctions `approve_user()` et `reject_user()`
- ✅ Ajoute un trigger pour `updated_at`
- ✅ Affiche des vérifications de succès

### 2. `src/services/authService.js` (Modifié)

Corrections dans la fonction `signUp`:
- ✅ Suppression de la vérification email pré-signup
- ✅ Gestion des erreurs de doublon d'email via Supabase Auth
- ✅ Suppression du rollback impossible côté client
- ✅ Logging des comptes orphelins pour nettoyage manuel
- ✅ Simplification des valeurs par défaut (NULL au lieu de chaînes vides)

---

## 🚀 Plan de Migration

### Étape 1: Backup (IMPORTANT!)

```sql
-- Sauvegarder les données existantes
CREATE TABLE users_backup AS SELECT * FROM users;

-- Vérifier la sauvegarde
SELECT COUNT(*) FROM users_backup;
```

### Étape 2: Exécuter le Script de Reconstruction

```bash
# Via Supabase Dashboard
# 1. Aller dans SQL Editor
# 2. Copier/coller le contenu de sql/rebuild_auth_system.sql
# 3. Exécuter

# OU via psql
psql "postgresql://..." -f sql/rebuild_auth_system.sql
```

### Étape 3: Recréer les Admins

Si vous aviez des admins, vous devez les recréer manuellement:

```sql
-- 1. D'abord, créer le compte dans Supabase Auth Dashboard
-- 2. Ensuite, insérer le profil avec l'UUID du compte auth

INSERT INTO users (
  id,
  email,
  nom,
  prenoms,
  role,
  is_active,
  approval_status,
  approved_at
) VALUES (
  'uuid-du-compte-auth-ici',
  'admin@example.com',
  'Admin',
  'Principal',
  'admin',
  true,
  'approved',
  NOW()
);
```

### Étape 4: Tester le Système

1. **Test d'inscription:**
   - Créer un nouveau compte
   - Vérifier qu'il apparaît avec `approval_status = 'pending'`
   - Vérifier qu'on ne peut pas se connecter

2. **Test d'approbation:**
   ```sql
   SELECT approve_user('user-id-to-approve', 'admin-id');
   ```
   - Vérifier que `is_active = true` et `approval_status = 'approved'`

3. **Test de connexion:**
   - Se connecter avec l'utilisateur approuvé
   - Vérifier qu'on peut accéder au dashboard
   - Vérifier qu'il n'y a pas d'erreur "Profil utilisateur introuvable"

4. **Test admin:**
   - Se connecter en tant qu'admin
   - Aller sur `/utilisateurs`
   - Vérifier qu'on voit tous les utilisateurs dans le tab "Utilisateurs actifs"
   - Vérifier qu'on voit les utilisateurs pending dans le tab "En attente"

### Étape 5: Restaurer les Anciennes Données (Optionnel)

Si vous voulez restaurer certains utilisateurs de la backup:

```sql
-- Restaurer des utilisateurs spécifiques
INSERT INTO users (
  id, email, nom, prenoms, role, is_active, approval_status,
  telephone, sexe, date_naissance, photo_url, last_login_at
)
SELECT
  id, email, nom, prenoms, role, is_active, 'approved' AS approval_status,
  telephone, sexe, date_naissance, photo_url, last_login_at
FROM users_backup
WHERE approval_status = 'approved'  -- Seulement les utilisateurs approuvés
ON CONFLICT (id) DO NOTHING;
```

---

## 📝 Nouvelles Politiques RLS

### Récapitulatif des 6 Politiques

| Nom | Type | Pour qui | Condition |
|-----|------|----------|-----------|
| `users_insert_own_profile` | INSERT | Tous authentifiés | Crée son propre profil en pending |
| `users_select_own_profile` | SELECT | Tous authentifiés | Lit son propre profil |
| `users_select_for_supervisors_admins` | SELECT | Superviseurs/Admins | Lit tous les profils |
| `users_update_own_profile` | UPDATE | Tous authentifiés | Modifie son propre profil |
| `users_update_for_admins` | UPDATE | Admins | Modifie tous les profils |
| `users_delete_for_admins` | DELETE | Admins | Supprime des utilisateurs |

### Flux de Permissions

```
┌──────────────────────────────────────────────────────────┐
│ INSCRIPTION (INSERT)                                      │
├──────────────────────────────────────────────────────────┤
│ 1. User crée compte auth → auth.users                    │
│ 2. User crée profil → public.users (via politique INSERT)│
│    ✅ id = auth.uid()                                    │
│    ✅ approval_status = 'pending'                        │
│    ✅ role = 'vendeur'                                   │
│    ✅ is_active = false                                  │
│ 3. User est déconnecté automatiquement                   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ CONNEXION (SELECT)                                        │
├──────────────────────────────────────────────────────────┤
│ 1. User s'authentifie → session créée                    │
│ 2. App lit profil → public.users                         │
│    ✅ Politique "users_select_own_profile" autorise      │
│    ✅ id = auth.uid() → pas de sous-requête              │
│ 3. App vérifie is_active                                 │
│    ❌ Si false → déconnexion                            │
│    ✅ Si true → accès accordé                           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ADMIN LIT TOUS LES PROFILS (SELECT)                      │
├──────────────────────────────────────────────────────────┤
│ 1. Admin fait SELECT * FROM users                        │
│ 2. Politique évalue auth_user_role()                     │
│    → Fonction s'exécute AVANT l'évaluation RLS           │
│    → Retourne 'admin'                                    │
│    → Résultat mis en cache                               │
│ 3. Politique évalue auth_user_is_active()                │
│    → Fonction s'exécute AVANT l'évaluation RLS           │
│    → Retourne true                                       │
│    → Résultat mis en cache                               │
│ 4. Condition: 'admin' IN ('admin', 'superviseur') = true │
│ 5. Accès accordé sans récursion                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🔍 Diagnostic de Problèmes

### Vérifier les Politiques Actuelles

```sql
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;
```

### Vérifier les Fonctions Helper

```sql
SELECT
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments
FROM pg_proc
WHERE proname IN ('auth_user_role', 'auth_user_is_active', 'approve_user', 'reject_user')
ORDER BY proname;
```

### Tester Manuellement les Fonctions

```sql
-- En tant qu'utilisateur connecté
SELECT auth_user_role();  -- Devrait retourner votre rôle
SELECT auth_user_is_active();  -- Devrait retourner true si vous êtes actif
```

### Vérifier les Utilisateurs

```sql
-- Compter par statut
SELECT
  approval_status,
  is_active,
  role,
  COUNT(*) as total
FROM users
GROUP BY approval_status, is_active, role
ORDER BY approval_status, role;

-- Lister les utilisateurs en attente
SELECT
  id,
  email,
  nom,
  prenoms,
  role,
  created_at
FROM users
WHERE approval_status = 'pending'
ORDER BY created_at DESC;
```

---

## ❓ FAQ

### Q: Que se passe-t-il si la création du profil échoue après la création du compte auth?

**R:** Un compte "orphelin" est créé dans `auth.users` sans profil dans `public.users`. L'erreur affichera un code (les 8 premiers caractères de l'UUID). Un admin devra supprimer manuellement ce compte:

```sql
-- Identifier le compte orphelin
SELECT id, email FROM auth.users
WHERE id NOT IN (SELECT id FROM users);

-- Supprimer depuis Supabase Dashboard → Authentication → Users
-- OU via API admin (backend uniquement)
```

### Q: Pourquoi ne pas utiliser un trigger pour créer automatiquement le profil?

**R:** Les triggers sur `auth.users` ne sont pas recommandés car:
1. `auth.users` est géré par Supabase (modifications non recommandées)
2. Les triggers ne peuvent pas faire de rollback sur `auth.users` en cas d'erreur
3. La logique métier doit rester dans l'application

### Q: Peut-on avoir plusieurs admins?

**R:** Oui! Créez simplement plusieurs profils avec `role = 'admin'` et `is_active = true`. Chaque admin peut:
- Voir tous les utilisateurs
- Approuver/rejeter des demandes
- Modifier tous les profils
- Supprimer des utilisateurs

### Q: Comment changer le rôle d'un utilisateur?

**R:** Seuls les admins peuvent le faire via SQL ou via une interface admin:

```sql
-- Promouvoir un utilisateur en superviseur
UPDATE users
SET role = 'superviseur', updated_at = NOW()
WHERE id = 'user-uuid-here';
```

### Q: Les anciennes politiques RLS interféraient-elles même pour les non-admins?

**R:** Oui! PostgreSQL évalue **toutes** les politiques SELECT avec une logique `OR`. Si **une** politique échoue avec une erreur (récursion), toute la requête échoue, même si une autre politique aurait autorisé l'accès.

---

## 🎯 Résumé

### Avant (Problématique)

```
❌ Politique RLS avec EXISTS(SELECT FROM users) → Récursion infinie
❌ Vérification email avant auth.signUp → Requête RLS impossible
❌ Rollback côté client → Nécessite service role key
❌ Tous les utilisateurs affectés, pas seulement les admins
```

### Après (Corrigé)

```
✅ Fonctions SQL STABLE sans récursion → Résultat mis en cache
✅ Supabase Auth gère les doublons d'email
✅ Logging des comptes orphelins pour nettoyage manuel
✅ Politiques RLS simples et performantes
✅ Système d'approbation fonctionnel
```

---

## 📞 Support

Si vous rencontrez des problèmes:
1. Vérifier les logs de la console (F12)
2. Exécuter les requêtes de diagnostic ci-dessus
3. Vérifier que les fonctions `auth_user_role()` et `auth_user_is_active()` existent
4. Vérifier que RLS est bien activé: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'users';`

---

**Date de création:** 2026-01-16
**Version:** 1.0
**Statut:** Production Ready ✅
