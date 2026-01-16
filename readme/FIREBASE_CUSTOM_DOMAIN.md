# 🌐 Guide : Configurer office.dudocteur.com avec Firebase Hosting

## 📋 Vue d'ensemble

Ce guide explique comment configurer le sous-domaine `office.dudocteur.com` pour pointer vers votre application Firebase Hosting.

**Prérequis :**
- Domaine principal `dudocteur.com` déjà configuré
- Firebase Hosting déjà configuré pour le projet
- Accès au panneau de configuration DNS de votre registrar (ex: OVH, Namecheap, Cloudflare, etc.)

---

## 🚀 Étape 1 : Ajouter le domaine personnalisé dans Firebase Console

### 1.1 Accéder à Firebase Console

1. Aller sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionner votre projet
3. Dans le menu latéral, cliquer sur **Hosting**
4. Cliquer sur l'onglet **Domaines personnalisés** (Custom domains)

### 1.2 Ajouter le sous-domaine

1. Cliquer sur **Ajouter un domaine personnalisé** (Add custom domain)
2. Entrer `office.dudocteur.com` dans le champ
3. Cliquer sur **Continuer** (Continue)

### 1.3 Vérifier la propriété du domaine

Firebase va vous demander de prouver que vous possédez le domaine.

**Option A : Si vous avez déjà vérifié `dudocteur.com`**
- Firebase devrait automatiquement reconnaître que vous possédez le domaine parent
- Vous pouvez passer directement à l'étape suivante

**Option B : Si c'est votre première vérification**
- Firebase vous demandera d'ajouter un enregistrement TXT dans votre DNS
- Notez les valeurs fournies (quelque chose comme `google-site-verification=xxx`)

---

## 🌐 Étape 2 : Configurer les enregistrements DNS

Firebase vous fournira 2 types d'enregistrements à ajouter :

### 2.1 Enregistrement TXT (pour vérification)

**Si vous devez vérifier le domaine :**

| Type | Nom/Host | Valeur/Target |
|------|----------|---------------|
| TXT  | office (ou office.dudocteur.com) | google-site-verification=xxxxx |

### 2.2 Enregistrement A (pour pointer vers Firebase)

Firebase vous donnera **2 adresses IP**. Vous devez créer **2 enregistrements A** :

| Type | Nom/Host | Valeur/Target | TTL |
|------|----------|---------------|-----|
| A    | office   | 151.101.1.195 | 3600 |
| A    | office   | 151.101.65.195 | 3600 |

**⚠️ IMPORTANT** : Les adresses IP ci-dessus sont des exemples. Utilisez celles fournies par Firebase Console.

### 💡 Pourquoi des enregistrements A et pas CNAME ?

**Firebase recommande les enregistrements A pour plusieurs raisons :**

1. **Performance** : Pas de lookup DNS supplémentaire
2. **Redondance** : 2 IPs = haute disponibilité automatique
3. **Compatibilité** : Permet d'avoir d'autres enregistrements (TXT, MX) sur le même sous-domaine
4. **Contrôle** : Firebase peut optimiser le routing vers le PoP (Point of Presence) le plus proche

**Note** : Certains hébergeurs (Netlify, Vercel) utilisent CNAME car ils changent fréquemment d'IPs. Firebase garantit la stabilité de ses IPs, d'où l'utilisation d'enregistrements A.

---

## 🔧 Étape 3 : Configuration DNS selon votre registrar

### Option A : OVH

1. Connectez-vous à [OVH Manager](https://www.ovh.com/manager/)
2. Allez dans **Web Cloud** → **Noms de domaine** → `dudocteur.com`
3. Cliquez sur l'onglet **Zone DNS**
4. Cliquez sur **Ajouter une entrée**

**Pour l'enregistrement TXT (si nécessaire) :**
- Type : `TXT`
- Sous-domaine : `office`
- Cible : `google-site-verification=xxxxx` (valeur fournie par Firebase)
- Cliquez sur **Suivant** puis **Valider**

**Pour les enregistrements A :**
- Type : `A`
- Sous-domaine : `office`
- Cible : `151.101.1.195` (première IP fournie par Firebase)
- Cliquez sur **Suivant** puis **Valider**

Répétez pour la deuxième IP :
- Type : `A`
- Sous-domaine : `office`
- Cible : `151.101.65.195` (deuxième IP fournie par Firebase)
- Cliquez sur **Suivant** puis **Valider**

### Option B : Namecheap

1. Connectez-vous à [Namecheap](https://www.namecheap.com/)
2. Allez dans **Domain List** → Cliquez sur **Manage** à côté de `dudocteur.com`
3. Allez dans **Advanced DNS**

**Pour l'enregistrement TXT (si nécessaire) :**
- Type : `TXT Record`
- Host : `office`
- Value : `google-site-verification=xxxxx`
- TTL : Automatic
- Cliquez sur **Save**

**Pour les enregistrements A :**
- Type : `A Record`
- Host : `office`
- Value : `151.101.1.195` (première IP)
- TTL : Automatic
- Cliquez sur **Save**

Ajoutez un deuxième enregistrement A avec la deuxième IP.

### Option C : Cloudflare

1. Connectez-vous à [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Sélectionnez `dudocteur.com`
3. Allez dans **DNS** → **Records**

**Pour l'enregistrement TXT (si nécessaire) :**
- Type : `TXT`
- Name : `office`
- Content : `google-site-verification=xxxxx`
- Proxy status : **DNS only** (nuage gris, pas orange)
- Cliquez sur **Save**

**Pour les enregistrements A :**
- Type : `A`
- Name : `office`
- IPv4 address : `151.101.1.195` (première IP)
- Proxy status : **DNS only** (nuage gris, pas orange)
- TTL : Auto
- Cliquez sur **Save**

Ajoutez un deuxième enregistrement A avec la deuxième IP.

**⚠️ IMPORTANT pour Cloudflare** : Le proxy (nuage orange) doit être **désactivé** pour les domaines Firebase. Laissez-le en **DNS only** (nuage gris).

### Option D : Google Domains

1. Connectez-vous à [Google Domains](https://domains.google.com/)
2. Sélectionnez `dudocteur.com`
3. Cliquez sur **DNS** dans le menu latéral
4. Faites défiler jusqu'à **Enregistrements de ressources personnalisés**

**Pour l'enregistrement TXT (si nécessaire) :**
- Nom : `office`
- Type : `TXT`
- TTL : 3600
- Données : `google-site-verification=xxxxx`
- Cliquez sur **Ajouter**

**Pour les enregistrements A :**
- Nom : `office`
- Type : `A`
- TTL : 3600
- Données :
  ```
  151.101.1.195
  151.101.65.195
  ```
  (entrez les deux IPs, une par ligne)
- Cliquez sur **Ajouter**

### Option E : Autres registrars

Les principes sont les mêmes pour tous les registrars :

1. Trouvez la section **DNS Management** ou **Zone DNS**
2. Ajoutez un enregistrement **TXT** (si nécessaire pour vérification) :
   - Host/Name : `office` ou `office.dudocteur.com`
   - Value : `google-site-verification=xxxxx`
3. Ajoutez **2 enregistrements A** :
   - Host/Name : `office` ou `office.dudocteur.com`
   - Value : Les 2 adresses IP fournies par Firebase

---

## ⏱️ Étape 4 : Attendre la propagation DNS

### Délais de propagation

- **Minimum** : 10-15 minutes
- **Typique** : 1-2 heures
- **Maximum** : 24-48 heures (rare)

### Vérifier la propagation DNS

**Méthode 1 : DNS Checker en ligne**
- Allez sur [whatsmydns.net](https://www.whatsmydns.net/)
- Entrez `office.dudocteur.com`
- Sélectionnez type **A**
- Vérifiez que les IPs Firebase apparaissent dans plusieurs régions

**Méthode 2 : Commande terminal (Windows)**
```bash
nslookup office.dudocteur.com
```

**Méthode 2 : Commande terminal (Mac/Linux)**
```bash
dig office.dudocteur.com
```

**Résultat attendu :**
```
office.dudocteur.com has address 151.101.1.195
office.dudocteur.com has address 151.101.65.195
```

---

## 🔐 Étape 5 : Activer le certificat SSL (HTTPS)

Une fois la propagation DNS terminée :

### 5.1 Retour sur Firebase Console

1. Retournez dans Firebase Console → **Hosting** → **Domaines personnalisés**
2. Vous devriez voir `office.dudocteur.com` avec le statut **En attente** (Pending)
3. Cliquez sur **Vérifier** si le statut ne se met pas à jour automatiquement

### 5.2 Provisionnement du certificat SSL

Firebase va automatiquement :
- Vérifier que les enregistrements DNS sont corrects
- Provisionner un certificat SSL via **Let's Encrypt**
- Activer HTTPS pour votre domaine

**Délai :** 15 minutes à 24 heures (généralement < 1 heure)

### 5.3 Statuts possibles

| Statut | Signification |
|--------|---------------|
| ⏳ **En attente** (Pending) | Firebase attend la propagation DNS |
| ✅ **Connecté** (Connected) | Tout fonctionne ! HTTPS activé |
| ❌ **Échec** (Failed) | Problème de configuration DNS |

---

## 🧪 Étape 6 : Tester le déploiement

### 6.1 Vérifier l'accès HTTP

Ouvrez votre navigateur :
```
http://office.dudocteur.com
```

**Note** : Vous serez redirigé automatiquement vers HTTPS une fois le certificat SSL provisionné.

### 6.2 Vérifier l'accès HTTPS

```
https://office.dudocteur.com
```

### 6.3 Vérifier le certificat SSL

Dans votre navigateur :
1. Cliquez sur l'icône du cadenas à gauche de l'URL
2. Cliquez sur **Certificat** (ou **Certificate**)
3. Vérifiez que :
   - Émis par : **Let's Encrypt**
   - Valide jusqu'à : Date future (certificats Let's Encrypt sont valides 90 jours)
   - Nom du domaine : **office.dudocteur.com**

---

## 🔧 Étape 7 : Configuration Firebase (si nécessaire)

### 7.1 Vérifier firebase.json

Si vous avez plusieurs sites Firebase Hosting, vérifiez votre `firebase.json` :

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### 7.2 Redéployer (si nécessaire)

Si vous avez modifié `firebase.json` :

```bash
npm run build
firebase deploy --only hosting
```

---

## 🚨 Dépannage

### Problème 1 : DNS ne se propage pas

**Symptômes :**
- `nslookup` ne retourne pas les bonnes IPs
- Firebase affiche toujours "En attente"

**Solutions :**
1. Vérifiez que vous avez bien ajouté **2 enregistrements A** (pas 1 seul)
2. Vérifiez l'orthographe : `office` (pas `Office` ou `office.`)
3. Attendez au moins 1 heure avant de conclure à un problème
4. Videz le cache DNS de votre ordinateur :
   ```bash
   # Windows
   ipconfig /flushdns

   # Mac
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

   # Linux
   sudo systemd-resolve --flush-caches
   ```

### Problème 2 : Firebase affiche "Échec de la connexion"

**Causes possibles :**
1. Les enregistrements A pointent vers de mauvaises IPs
2. Un enregistrement CNAME existe déjà pour `office` (conflit)
3. Les enregistrements DNS ont un proxy activé (Cloudflare)

**Solutions :**
1. Vérifiez les IPs fournies par Firebase (elles peuvent changer)
2. Supprimez tout enregistrement CNAME pour `office`
3. Désactivez le proxy Cloudflare (nuage gris, pas orange)

### Problème 3 : Certificat SSL ne se provisionne pas

**Symptômes :**
- Le site fonctionne en HTTP mais pas en HTTPS
- Erreur "Your connection is not private"

**Solutions :**
1. Attendez 24 heures (le provisionnement SSL peut prendre du temps)
2. Vérifiez que les enregistrements A sont corrects
3. Dans Firebase Console, essayez de cliquer sur **Réessayer** (Retry)
4. Vérifiez qu'il n'y a pas de CAA records qui bloquent Let's Encrypt :
   ```bash
   dig CAA dudocteur.com
   ```

### Problème 4 : "ERR_TOO_MANY_REDIRECTS"

**Cause :** Conflit entre Firebase et un proxy (ex: Cloudflare avec proxy activé)

**Solution :** Désactivez le proxy Cloudflare pour les enregistrements A de Firebase.

### Problème 5 : Le site affiche le contenu d'un autre domaine

**Cause :** Plusieurs sites Firebase Hosting, configuration multi-site incorrecte

**Solution :**
1. Vérifiez dans Firebase Console → Hosting que le domaine est lié au bon site
2. Utilisez Firebase multi-site hosting si nécessaire

---

## 📊 Résumé de configuration

Voici un récapitulatif des enregistrements DNS à ajouter :

| Type | Nom | Valeur | Priorité |
|------|-----|--------|----------|
| TXT  | office | google-site-verification=xxxxx | - |
| A    | office | 151.101.1.195 (IP 1 de Firebase) | - |
| A    | office | 151.101.65.195 (IP 2 de Firebase) | - |

**⚠️ Remplacez les valeurs ci-dessus par celles fournies par Firebase Console**

---

## ✅ Checklist finale

Avant de considérer que tout fonctionne :

- [ ] Enregistrements DNS ajoutés dans le registrar
- [ ] Propagation DNS vérifiée (whatsmydns.net)
- [ ] Firebase Console affiche "Connecté" pour office.dudocteur.com
- [ ] Certificat SSL provisionné (cadenas vert dans le navigateur)
- [ ] `http://office.dudocteur.com` redirige vers `https://office.dudocteur.com`
- [ ] Le contenu du site s'affiche correctement
- [ ] Pas d'erreur de certificat SSL
- [ ] Application PWA fonctionne correctement

---

## 🔄 Maintenance

### Renouvellement du certificat SSL

Firebase renouvelle automatiquement les certificats Let's Encrypt tous les 60 jours. Vous n'avez rien à faire.

### Changement d'adresses IP Firebase

Si Firebase change ses adresses IP (très rare) :
1. Firebase vous notifiera par email
2. Mettez à jour les enregistrements A dans votre DNS
3. Attendez la propagation DNS

---

## 📞 Support

Si vous rencontrez des problèmes :

1. **Firebase Support** : [https://firebase.google.com/support](https://firebase.google.com/support)
2. **Firebase Community** : [https://stackoverflow.com/questions/tagged/firebase-hosting](https://stackoverflow.com/questions/tagged/firebase-hosting)
3. **Documentation Firebase** : [https://firebase.google.com/docs/hosting/custom-domain](https://firebase.google.com/docs/hosting/custom-domain)

---

**Date de création :** 2026-01-16
**Version :** 1.0
**Statut :** Prêt pour production ✅
