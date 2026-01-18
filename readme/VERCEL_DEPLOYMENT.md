# 🚀 Migration de Firebase Hosting vers Vercel

## 📋 Vue d'ensemble

Ce guide explique comment migrer l'hébergement frontend de Firebase Hosting vers Vercel, tout en gardant Supabase pour la base de données.

**Architecture finale :**
- ✅ **Frontend** : Vercel (hébergement + CDN)
- ✅ **Base de données** : Supabase (PostgreSQL + Auth + Storage)
- ✅ **Notifications** : Firebase Cloud Messaging (optionnel)
- ✅ **Domaine** : `office.dudocteur.com`

---

## 🎯 Étape 1 : Nettoyer les fichiers Firebase Hosting

### 1.1 Supprimer les fichiers Firebase inutiles

**Sur Windows (PowerShell) :**

```powershell
# Supprimer les fichiers de configuration Firebase Hosting
Remove-Item firebase.json -ErrorAction SilentlyContinue
Remove-Item .firebaserc -ErrorAction SilentlyContinue
Remove-Item .github\workflows\firebase-hosting-*.yml -ErrorAction SilentlyContinue
```

**Sur Mac/Linux :**

```bash
rm firebase.json
rm .firebaserc
rm -rf .github/workflows/firebase-hosting-*.yml
```

**Ou simplement supprimer manuellement :**
- Supprimer `firebase.json`
- Supprimer `.firebaserc`
- Supprimer `.github/workflows/firebase-hosting-merge.yml`
- Supprimer `.github/workflows/firebase-hosting-pull-request.yml`

### 1.2 Désinstaller Firebase CLI (optionnel)

Si tu n'utilises plus Firebase du tout :

```bash
npm uninstall firebase-tools
```

**Note :** Si tu gardes Firebase Cloud Messaging pour les notifications push, garde `firebase-tools` installé.

---

## 🔧 Étape 2 : Créer le fichier de configuration Vercel

### 2.1 Créer `vercel.json`

Crée un fichier `vercel.json` à la racine du projet :

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

**Explication :**
- `rewrites` : Permet à React Router de fonctionner correctement (toutes les routes pointent vers index.html)
- `headers` : Ajoute des headers de sécurité et optimise le cache des assets

---

## 🌐 Étape 3 : Déployer sur Vercel

### Option A : Déploiement via GitHub (Recommandé)

#### 3.1 Pusher le code sur GitHub

Si ce n'est pas déjà fait :

```bash
git add .
git commit -m "feat: migrate from Firebase Hosting to Vercel"
git push origin main
```

#### 3.2 Connecter Vercel à GitHub

1. Va sur [vercel.com](https://vercel.com/)
2. Clique sur **Sign Up** ou **Log In**
3. Choisis **Continue with GitHub**
4. Autorise Vercel à accéder à tes repos GitHub

#### 3.3 Importer le projet

1. Une fois connecté, clique sur **Add New** → **Project**
2. Sélectionne ton repo GitHub : `les-sandwichs-du-docteur-v1`
3. Clique sur **Import**

#### 3.4 Configurer le projet

Vercel détecte automatiquement Vite. Vérifie que :

**Framework Preset :** `Vite`
**Build Command :** `npm run build`
**Output Directory :** `dist`
**Install Command :** `npm install`

#### 3.5 Ajouter les variables d'environnement

Dans la section **Environment Variables**, ajoute :

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://ton-projet.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_FIREBASE_API_KEY` | (si tu gardes FCM) |
| `VITE_FIREBASE_AUTH_DOMAIN` | (si tu gardes FCM) |
| `VITE_FIREBASE_PROJECT_ID` | (si tu gardes FCM) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | (si tu gardes FCM) |
| `VITE_FIREBASE_APP_ID` | (si tu gardes FCM) |

**Important :** Coche **Production**, **Preview**, et **Development** pour chaque variable.

#### 3.6 Déployer

1. Clique sur **Deploy**
2. Attends 1-2 minutes que le build se termine
3. Vercel te donne une URL de type : `https://les-sandwichs-du-docteur-v1.vercel.app`

### Option B : Déploiement via CLI Vercel

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Suivre les instructions :
# - Set up and deploy? Y
# - Which scope? (ton compte)
# - Link to existing project? N
# - Project name? les-sandwichs-du-docteur-v1
# - In which directory? ./
# - Override settings? N
```

---

## 🌐 Étape 4 : Configurer le domaine personnalisé `office.dudocteur.com`

### 4.1 Ajouter le domaine dans Vercel

1. Dans ton projet Vercel, va dans **Settings** → **Domains**
2. Clique sur **Add Domain**
3. Entre `office.dudocteur.com`
4. Clique sur **Add**

Vercel va te demander de configurer un enregistrement DNS.

### 4.2 Configurer le DNS

Vercel te donne un **CNAME** à ajouter :

**Instructions Vercel :**
```
Type: CNAME
Name: office
Value: cname.vercel-dns.com
```

#### Configuration selon ton registrar

**A. OVH**

1. Connecte-toi à [OVH Manager](https://www.ovh.com/manager/)
2. Va dans **Web Cloud** → **Noms de domaine** → `dudocteur.com`
3. Clique sur **Zone DNS**
4. Clique sur **Ajouter une entrée**
5. Choisis **CNAME**
6. Sous-domaine : `office`
7. Cible : `cname.vercel-dns.com`
8. Clique sur **Suivant** puis **Valider**

**B. Namecheap**

1. Connecte-toi à [Namecheap](https://www.namecheap.com/)
2. Va dans **Domain List** → **Manage** → `dudocteur.com`
3. Va dans **Advanced DNS**
4. Clique sur **Add New Record**
5. Type : `CNAME Record`
6. Host : `office`
7. Value : `cname.vercel-dns.com`
8. TTL : Automatic
9. Clique sur **Save**

**C. Cloudflare**

1. Connecte-toi à [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Sélectionne `dudocteur.com`
3. Va dans **DNS** → **Records**
4. Clique sur **Add record**
5. Type : `CNAME`
6. Name : `office`
7. Target : `cname.vercel-dns.com`
8. Proxy status : **DNS only** (nuage gris)
9. TTL : Auto
10. Clique sur **Save**

**⚠️ Important pour Cloudflare :** Le proxy doit être **désactivé** (nuage gris, pas orange).

**D. Google Domains**

1. Connecte-toi à [Google Domains](https://domains.google.com/)
2. Sélectionne `dudocteur.com`
3. Clique sur **DNS**
4. Sous **Enregistrements de ressources personnalisés** :
   - Nom : `office`
   - Type : `CNAME`
   - TTL : 3600
   - Données : `cname.vercel-dns.com`
5. Clique sur **Ajouter**

### 4.3 Vérifier la propagation DNS

**Méthode 1 : DNS Checker en ligne**
- Va sur [whatsmydns.net](https://www.whatsmydns.net/)
- Entre `office.dudocteur.com`
- Sélectionne type **CNAME**
- Vérifie que `cname.vercel-dns.com` apparaît

**Méthode 2 : Commande terminal (Windows)**
```bash
nslookup office.dudocteur.com
```

**Méthode 3 : Commande terminal (Mac/Linux)**
```bash
dig office.dudocteur.com CNAME
```

**Résultat attendu :**
```
office.dudocteur.com    CNAME   cname.vercel-dns.com
```

### 4.4 Attendre l'activation SSL

Une fois le DNS propagé (10 min à 24h) :
- Vercel provisionne automatiquement un certificat SSL (Let's Encrypt)
- Le domaine passe de **Invalid Configuration** à **Valid Configuration**
- HTTPS est activé automatiquement

---

## 🔐 Étape 5 : Configurer les redirections HTTPS

Par défaut, Vercel redirige automatiquement HTTP → HTTPS. Pas besoin de configuration supplémentaire !

---

## 🧪 Étape 6 : Tester le déploiement

### 6.1 Vérifier l'accès

```
https://office.dudocteur.com
```

### 6.2 Vérifier le certificat SSL

Dans ton navigateur :
1. Clique sur le cadenas à gauche de l'URL
2. Clique sur **Certificat**
3. Vérifie :
   - Émis par : **Let's Encrypt**
   - Nom du domaine : **office.dudocteur.com**

### 6.3 Vérifier le routing React Router

Teste plusieurs routes :
- `https://office.dudocteur.com/`
- `https://office.dudocteur.com/commandes`
- `https://office.dudocteur.com/utilisateurs`
- Rafraîchis la page (F5) sur chaque route

✅ Toutes les routes doivent fonctionner sans erreur 404.

### 6.4 Vérifier la connexion Supabase

1. Ouvre la console du navigateur (F12)
2. Va sur `https://office.dudocteur.com/connexion`
3. Connecte-toi avec un compte
4. Vérifie qu'il n'y a pas d'erreur CORS ou de connexion

---

## 🚀 Étape 7 : Déploiements automatiques

### 7.1 Workflow automatique

Avec Vercel + GitHub :
- **Push sur `main`** → Déploiement automatique en production
- **Pull Request** → Preview deployment automatique avec URL unique
- **Push sur autre branche** → Pas de déploiement (configurable)

### 7.2 Preview Deployments

Chaque PR génère automatiquement une URL de preview :
```
https://les-sandwichs-du-docteur-v1-git-feature-branch.vercel.app
```

Tu peux tester les changements avant de merger dans `main`.

---

## ⚙️ Étape 8 : Configuration avancée (optionnel)

### 8.1 Ajouter des redirections

Si tu veux des redirections personnalisées, modifie `vercel.json` :

```json
{
  "redirects": [
    {
      "source": "/old-page",
      "destination": "/new-page",
      "permanent": true
    }
  ]
}
```

### 8.2 Configurer les headers de sécurité

Déjà inclus dans `vercel.json` :
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

Pour ajouter CSP (Content Security Policy) :

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co"
        }
      ]
    }
  ]
}
```

### 8.3 Configurer les variables d'environnement par branche

Dans Vercel Dashboard :
- **Production** : Variables pour la branche `main`
- **Preview** : Variables pour les PRs
- **Development** : Variables pour `vercel dev` en local

---

## 🔄 Étape 9 : Workflow de développement

### 9.1 Développement local

```bash
# Installer Vercel CLI
npm install -g vercel

# Lancer le serveur de dev Vercel (avec les env variables)
vercel dev

# OU utiliser Vite directement (plus rapide)
npm run dev
```

### 9.2 Preview avant merge

```bash
# Créer une branche
git checkout -b feature/nouvelle-fonctionnalite

# Faire des modifications
# ...

# Commit et push
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin feature/nouvelle-fonctionnalite

# Créer une PR sur GitHub
# Vercel crée automatiquement un preview deployment
```

### 9.3 Déploiement en production

```bash
# Merger la PR dans main
# Vercel déploie automatiquement en production

# OU déployer manuellement
git checkout main
git pull
vercel --prod
```

---

## 🚨 Dépannage

### Problème 1 : Erreur 404 sur les routes React Router

**Symptômes :**
- Page d'accueil fonctionne
- Routes `/commandes`, `/utilisateurs` retournent 404 au refresh

**Solution :**
Vérifie que `vercel.json` contient :

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Problème 2 : Variables d'environnement non chargées

**Symptômes :**
- `import.meta.env.VITE_SUPABASE_URL` est undefined
- Erreurs de connexion Supabase

**Solutions :**
1. Vérifie que les variables sont bien ajoutées dans Vercel Dashboard → Settings → Environment Variables
2. Vérifie qu'elles commencent par `VITE_`
3. Redéploie le projet : Settings → Deployments → Menu (•••) → Redeploy

### Problème 3 : DNS ne se propage pas

**Symptômes :**
- `office.dudocteur.com` ne pointe pas vers Vercel
- Erreur "Domain not found"

**Solutions :**
1. Vérifie que tu as bien ajouté un **CNAME** (pas A)
2. Vérifie l'orthographe : `office` → `cname.vercel-dns.com`
3. Attends au moins 1 heure (propagation DNS)
4. Vide le cache DNS :
   ```bash
   # Windows
   ipconfig /flushdns

   # Mac
   sudo dscacheutil -flushcache

   # Linux
   sudo systemd-resolve --flush-caches
   ```

### Problème 4 : Certificat SSL ne se provisionne pas

**Symptômes :**
- HTTP fonctionne mais pas HTTPS
- Erreur "Your connection is not private"

**Solutions :**
1. Attends 24 heures (le provisionnement SSL peut prendre du temps)
2. Dans Vercel, va dans Settings → Domains → Clique sur **Refresh** à côté du domaine
3. Vérifie qu'il n'y a pas de CAA records qui bloquent Let's Encrypt

### Problème 5 : Build échoue sur Vercel

**Symptômes :**
- Déploiement échoue avec erreur de build
- Logs montrent des erreurs TypeScript ou ESLint

**Solutions :**
1. Teste le build en local :
   ```bash
   npm run build
   ```
2. Corrige les erreurs avant de pusher
3. Si les warnings bloquent, désactive les erreurs ESLint dans `vite.config.js` :
   ```javascript
   export default defineConfig({
     build: {
       rollupOptions: {
         onwarn(warning, warn) {
           if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
           warn(warning);
         }
       }
     }
   })
   ```

---

## 📊 Comparaison avant/après

| Aspect | Firebase Hosting | Vercel |
|--------|------------------|---------|
| **Configuration** | `firebase.json` complexe | `vercel.json` simple |
| **Déploiement** | `firebase deploy` | `git push` (auto) |
| **Custom Domain** | 2 enregistrements A | 1 enregistrement CNAME |
| **SSL** | Automatique | Automatique |
| **Preview URLs** | Non | Oui (automatique) |
| **Variables d'env** | Fichier local | Dashboard Vercel |
| **Analytics** | Via Firebase Analytics | Vercel Analytics (gratuit) |
| **Edge Network** | Firebase CDN | Vercel Edge Network |

---

## ✅ Checklist finale

Avant de considérer la migration terminée :

- [ ] Code pushé sur GitHub
- [ ] Projet importé dans Vercel
- [ ] Variables d'environnement configurées
- [ ] Premier déploiement réussi
- [ ] Enregistrement CNAME ajouté dans le registrar DNS
- [ ] Propagation DNS vérifiée
- [ ] Certificat SSL provisionné
- [ ] `https://office.dudocteur.com` accessible
- [ ] Toutes les routes React Router fonctionnent
- [ ] Connexion Supabase fonctionne
- [ ] Aucune erreur dans la console navigateur
- [ ] PWA fonctionne correctement
- [ ] Déploiements automatiques fonctionnent

---

## 🎯 Prochaines étapes

Après la migration réussie :

1. **Supprimer Firebase Hosting** (si plus utilisé) :
   ```bash
   # Dans Firebase Console
   # Hosting → Delete site
   ```

2. **Configurer Vercel Analytics** (optionnel) :
   - Ajouter `@vercel/analytics` pour suivre les performances
   ```bash
   npm install @vercel/analytics
   ```

3. **Configurer les notifications** (si tu gardes Firebase) :
   - Documentation : [Vercel + Firebase](https://vercel.com/guides/deploying-firebase-with-vercel)

---

## 📞 Support

Si tu rencontres des problèmes :

1. **Vercel Documentation** : [https://vercel.com/docs](https://vercel.com/docs)
2. **Vercel Community** : [https://github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
3. **Vercel Support** : [https://vercel.com/support](https://vercel.com/support)

---

**Date de création :** 2026-01-18
**Version :** 1.0
**Statut :** Prêt pour production ✅
