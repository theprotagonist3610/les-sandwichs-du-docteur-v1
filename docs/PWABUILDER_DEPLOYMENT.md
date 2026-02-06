# Déploiement PWABuilder - Android & iOS

Guide complet pour encapsuler l'application PWA avec PWABuilder pour les stores Android (Google Play) et iOS (App Store).

## Prérequis

### 1. Application déployée
L'application doit être déployée sur une URL HTTPS accessible publiquement.

```bash
# Build de production
npm run build

# Déployer sur votre hébergeur (Vercel, Netlify, etc.)
```

### 2. Vérifier le score PWA
Avant de continuer, vérifiez que votre PWA est bien configurée :

1. Ouvrez Chrome DevTools (F12)
2. Onglet "Lighthouse"
3. Cochez "Progressive Web App"
4. Lancez l'audit

**Score minimum requis : 90+**

### 3. Captures d'écran requises

Ajoutez des captures d'écran dans `public/screenshots/` :

| Fichier | Dimensions | Description |
|---------|------------|-------------|
| `desktop-dashboard.png` | 1920x1080 | Vue desktop du dashboard |
| `mobile-dashboard.png` | 390x844 | Vue mobile du dashboard |

**Conseil** : Utilisez Chrome DevTools > Device Mode pour capturer les écrans aux bonnes dimensions.

---

## Étape 1 : PWABuilder

### Accéder à PWABuilder
1. Allez sur [https://www.pwabuilder.com](https://www.pwabuilder.com)
2. Entrez l'URL de votre application déployée
3. Cliquez sur "Start"

### Vérification du Manifest
PWABuilder analysera votre manifest.json. Vérifiez que tous les champs sont remplis :

- ✅ `name` : "Les Sandwichs du Docteur"
- ✅ `short_name` : "Sandwichs Doc"
- ✅ `description` : Description complète
- ✅ `icons` : Toutes les tailles (64, 192, 512, maskable)
- ✅ `start_url` : "/"
- ✅ `display` : "standalone"
- ✅ `theme_color` : "#a41624"
- ✅ `background_color` : "#ffe8c9"

---

## Étape 2 : Android (Google Play)

### 2.1 Générer le package Android

1. Dans PWABuilder, cliquez sur **"Package for stores"**
2. Sélectionnez **"Android"**
3. Configurez les options :

| Option | Valeur |
|--------|--------|
| Package ID | `com.lessandwichsdudocteur.app` |
| App name | Les Sandwichs du Docteur |
| App version | 1.0.0 |
| Version code | 1 |
| Host | votre-domaine.com |
| Start URL | / |
| Display mode | Standalone |
| Status bar color | #a41624 |
| Navigation bar color | #a41624 |
| Splash background | #ffe8c9 |
| Icon | pwa-512x512.png |
| Maskable icon | maskable-icon-512x512.png |
| Signing key | Generate new |

4. Cliquez sur **"Generate"**
5. Téléchargez le fichier `.aab` (Android App Bundle)

### 2.2 Fichier assetlinks.json

PWABuilder génère un fichier `assetlinks.json` à placer sur votre serveur.

1. Créez le dossier `.well-known` à la racine de votre site
2. Placez-y le fichier `assetlinks.json` généré

```json
// public/.well-known/assetlinks.json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.lessandwichsdudocteur.app",
      "sha256_cert_fingerprints": [
        "VOTRE_FINGERPRINT_SHA256"
      ]
    }
  }
]
```

### 2.3 Publier sur Google Play

1. Connectez-vous à [Google Play Console](https://play.google.com/console)
2. Créez une nouvelle application
3. Remplissez les informations :
   - Titre : Les Sandwichs du Docteur
   - Description courte (80 car.) : Gestion de sandwicherie healthy
   - Description complète : [Votre description]
   - Catégorie : Productivité / Alimentation
4. Uploadez les captures d'écran
5. Uploadez le fichier `.aab`
6. Soumettez pour review

---

## Étape 3 : iOS (App Store)

### 3.1 Prérequis iOS

- **Compte Apple Developer** ($99/an)
- **Mac avec Xcode** installé
- **Certificats de distribution** configurés

### 3.2 Générer le package iOS

1. Dans PWABuilder, sélectionnez **"iOS"**
2. Configurez les options :

| Option | Valeur |
|--------|--------|
| Bundle ID | `com.lessandwichsdudocteur.app` |
| App name | Les Sandwichs du Docteur |
| Version | 1.0.0 |
| URL | votre-domaine.com |
| Status bar style | Black translucent |
| Splash color | #ffe8c9 |

3. Téléchargez le projet Xcode

### 3.3 Compiler avec Xcode

1. Ouvrez le projet `.xcodeproj` dans Xcode
2. Sélectionnez votre Team (Apple Developer)
3. Configurez le Bundle Identifier
4. Sélectionnez "Any iOS Device" comme destination
5. Product > Archive
6. Distribute App > App Store Connect

### 3.4 Publier sur l'App Store

1. Connectez-vous à [App Store Connect](https://appstoreconnect.apple.com)
2. Créez une nouvelle app
3. Remplissez les métadonnées
4. Uploadez les captures d'écran (obligatoires pour chaque taille d'écran)
5. Soumettez pour review

---

## Captures d'écran requises

### Google Play
| Type | Dimensions | Quantité |
|------|------------|----------|
| Phone | 1080x1920 | 2-8 |
| Tablet 7" | 1200x1920 | 1-8 |
| Tablet 10" | 1600x2560 | 1-8 |

### App Store
| Type | Dimensions | Quantité |
|------|------------|----------|
| iPhone 6.7" | 1290x2796 | 3-10 |
| iPhone 6.5" | 1284x2778 | 3-10 |
| iPhone 5.5" | 1242x2208 | 3-10 |
| iPad Pro 12.9" | 2048x2732 | 1-10 |

---

## Fichiers générés

Après le build, votre structure devrait contenir :

```
public/
├── .well-known/
│   └── assetlinks.json    # Pour Android TWA
├── screenshots/
│   ├── desktop-dashboard.png
│   └── mobile-dashboard.png
├── pwa-64x64.png
├── pwa-192x192.png
├── pwa-512x512.png
├── maskable-icon-512x512.png
├── apple-touch-icon-180x180.png
└── favicon.ico
```

---

## Vérifications finales

### Avant soumission

- [ ] URL HTTPS fonctionnelle
- [ ] Manifest.json valide
- [ ] Service Worker enregistré
- [ ] Toutes les icônes présentes
- [ ] Screenshots ajoutées
- [ ] assetlinks.json déployé (Android)
- [ ] Description et métadonnées remplies
- [ ] Politique de confidentialité
- [ ] Conditions d'utilisation

### Tests à effectuer

```bash
# Vérifier le manifest
curl -I https://votre-domaine.com/manifest.webmanifest

# Vérifier assetlinks.json
curl https://votre-domaine.com/.well-known/assetlinks.json
```

---

## Troubleshooting

### "Manifest not found"
- Vérifiez que le manifest est servi avec le bon Content-Type
- Headers requis : `Content-Type: application/manifest+json`

### "Service Worker registration failed"
- Vérifiez que le SW est servi depuis la racine
- Assurez-vous que l'URL est en HTTPS

### "Digital Asset Links verification failed" (Android)
- Vérifiez que `assetlinks.json` est accessible
- Vérifiez que le fingerprint SHA256 correspond
- Attendez la propagation DNS (jusqu'à 24h)

### "App rejected" (iOS)
- Ajoutez plus de fonctionnalités natives
- Assurez-vous que l'app fonctionne hors-ligne
- Vérifiez les guidelines Apple

---

## Ressources

- [PWABuilder Documentation](https://docs.pwabuilder.com)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- [Web.dev PWA Checklist](https://web.dev/pwa-checklist/)
