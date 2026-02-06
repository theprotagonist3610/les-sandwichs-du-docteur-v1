# Packaging Android APK depuis PWA

## Méthode 1: Bubblewrap (TWA) - Recommandée ⭐

### Prérequis

```bash
# Node.js (déjà installé)
# Java JDK 17+
# Android SDK

# Installer Java JDK
# Télécharger depuis: https://adoptium.net/

# Installer Android SDK via Android Studio
# Ou via ligne de commande: https://developer.android.com/studio/command-line/sdkmanager
```

### Installation de Bubblewrap

```bash
npm install -g @bubblewrap/cli
```

### Initialisation du Projet

```bash
# Dans le dossier racine du projet
bubblewrap init --manifest https://votre-domaine.com/manifest.webmanifest
```

Répondez aux questions:
- **Domain**: votre-domaine.com
- **Start URL**: /
- **Name**: Les Sandwichs du Docteur
- **Short Name**: LSD
- **Theme Color**: #a41624
- **Background Color**: #ffe8c9
- **Display Mode**: standalone
- **Icon URL**: https://votre-domaine.com/pwa-512x512.png
- **Maskable Icon URL**: https://votre-domaine.com/pwa-maskable-512x512.png

### Configuration du fichier twa-manifest.json

```json
{
  "packageId": "com.lsd.sandwichs",
  "host": "votre-domaine.com",
  "name": "Les Sandwichs du Docteur",
  "launcherName": "LSD",
  "display": "standalone",
  "themeColor": "#a41624",
  "backgroundColor": "#ffe8c9",
  "startUrl": "/",
  "iconUrl": "https://votre-domaine.com/pwa-512x512.png",
  "maskableIconUrl": "https://votre-domaine.com/pwa-maskable-512x512.png",
  "splashScreenFadeOutDuration": 300,
  "signingKey": {
    "path": "./android.keystore",
    "alias": "android"
  },
  "appVersionName": "1.0.0",
  "appVersionCode": 1,
  "shortcuts": [],
  "enableNotifications": true,
  "enableSiteSettingsShortcut": true,
  "isChromeOSOnly": false,
  "minSdkVersion": 24,
  "targetSdkVersion": 34
}
```

### Génération de la Clé de Signature

```bash
# Créer un keystore pour signer l'APK
keytool -genkey -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000

# Suivre les instructions et noter le mot de passe
```

### Build de l'APK

```bash
# Build APK de développement (non signé)
bubblewrap build

# Build APK de production (signé)
bubblewrap build --skipPwaValidation
```

L'APK sera généré dans: `./app-release-signed.apk`

### Mise à Jour

```bash
# Mettre à jour l'APK après modification de la PWA
bubblewrap update
bubblewrap build
```

---

## Méthode 2: PWABuilder - Plus Simple

### Étapes

1. Aller sur [PWABuilder.com](https://www.pwabuilder.com/)
2. Entrer l'URL de votre PWA: `https://votre-domaine.com`
3. Cliquer sur **"Start"**
4. PWABuilder analyse votre PWA
5. Aller dans l'onglet **"Package"**
6. Sélectionner **"Android"**
7. Configurer les options:
   - Package ID: `com.lsd.sandwichs`
   - App name: `Les Sandwichs du Docteur`
   - Version: `1.0.0`
   - Enable notifications: Oui
8. Cliquer sur **"Generate Package"**
9. Télécharger le fichier `.apk` généré

### Avantages de PWABuilder

- Aucune installation requise
- Interface graphique simple
- Génère également pour iOS et Windows
- Validation automatique de la PWA

---

## Méthode 3: Capacitor (Solution Hybride)

Pour plus de contrôle et d'accès aux APIs natives.

### Installation

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
```

### Initialisation

```bash
npx cap init "Les Sandwichs du Docteur" "com.lsd.sandwichs"
```

### Configuration capacitor.config.ts

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lsd.sandwichs',
  appName: 'Les Sandwichs du Docteur',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
```

### Ajout de la Plateforme Android

```bash
# Build de la PWA
npm run build

# Ajouter Android
npx cap add android

# Copier les assets
npx cap copy android

# Synchroniser
npx cap sync android
```

### Ouvrir dans Android Studio

```bash
npx cap open android
```

Dans Android Studio:
1. Build > Generate Signed Bundle / APK
2. Sélectionner APK
3. Créer/sélectionner un keystore
4. Build

---

## Recommandations

### Pour Votre Cas (LSD)

**Utilisez Bubblewrap (TWA)** si:
- ✅ Votre PWA est déjà fonctionnelle et bien testée
- ✅ Vous voulez une solution simple et légère
- ✅ Vous n'avez pas besoin d'APIs natives spécifiques
- ✅ Vous voulez des mises à jour automatiques du contenu

**Utilisez Capacitor** si:
- ✅ Vous avez besoin d'accès à des APIs natives (caméra, GPS avancé, etc.)
- ✅ Vous voulez un contrôle total sur l'expérience native
- ✅ Vous prévoyez d'ajouter des fonctionnalités natives à l'avenir

### Checklist Avant Packaging

- [ ] PWA déployée sur HTTPS
- [ ] manifest.webmanifest configuré correctement
- [ ] Icônes 512x512 (regular + maskable) disponibles
- [ ] Service worker fonctionnel
- [ ] Tests sur navigateur mobile
- [ ] Lighthouse PWA score > 90

### Configuration du Manifest (Vérification)

Votre `manifest.webmanifest` actuel:

```json
{
  "name": "Les Sandwichs du Docteur",
  "short_name": "LSD",
  "description": "Application de gestion pour sandwicherie",
  "theme_color": "#a41624",
  "background_color": "#ffe8c9",
  "display": "standalone",
  "scope": "/",
  "start_url": "/",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/pwa-64x64.png",
      "sizes": "64x64",
      "type": "image/png"
    },
    {
      "src": "/pwa-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/pwa-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/pwa-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/pwa-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

✅ Votre manifest est déjà bien configuré!

---

## Publication sur Google Play Store

### 1. Créer un Compte Développeur

- Coût: 25 USD (frais unique)
- URL: https://play.google.com/console/signup

### 2. Préparer les Assets

- **APK signé** (généré ci-dessus)
- **Captures d'écran** (minimum 2):
  - Téléphone: 16:9 (1080x1920)
  - Tablette 7": 16:9 (1024x600)
  - Tablette 10": 16:9 (2048x1536)
- **Icône d'application**: 512x512 PNG
- **Bannière**: 1024x500 PNG
- **Description courte**: Max 80 caractères
- **Description longue**: Max 4000 caractères
- **Politique de confidentialité**: URL obligatoire

### 3. Soumettre l'Application

1. Console Google Play > Créer une application
2. Remplir les détails de l'application
3. Uploader l'APK dans "Production" ou "Test interne"
4. Configurer la fiche du Store
5. Remplir le questionnaire de contenu
6. Soumettre pour examen (1-7 jours)

---

## Commandes Rapides

```bash
# Installation Bubblewrap
npm install -g @bubblewrap/cli

# Initialiser
bubblewrap init --manifest https://votre-domaine.com/manifest.webmanifest

# Générer keystore
keytool -genkey -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000

# Build APK
bubblewrap build

# Installer sur appareil connecté via ADB
adb install app-release-signed.apk

# Mettre à jour
bubblewrap update
bubblewrap build
```

---

## Dépannage

### Erreur: "Invalid manifest"
- Vérifier que manifest.webmanifest est accessible en HTTPS
- Valider le JSON sur jsonlint.com

### Erreur: "Java JDK not found"
- Installer Java JDK 17+
- Définir JAVA_HOME dans les variables d'environnement

### Erreur: "Android SDK not found"
- Installer Android Studio
- Définir ANDROID_HOME dans les variables d'environnement

### APK non installable
- Vérifier la signature: `jarsigner -verify -verbose -certs app-release-signed.apk`
- Activer "Sources inconnues" sur l'appareil Android

---

## Ressources

- [Bubblewrap Documentation](https://github.com/GoogleChromeLabs/bubblewrap)
- [PWABuilder](https://www.pwabuilder.com/)
- [Capacitor Docs](https://capacitorjs.com/)
- [Google Play Console](https://play.google.com/console/)
- [TWA Guide](https://developer.chrome.com/docs/android/trusted-web-activity/)

---

**Date**: 2026-02-06
**Version**: 1.0
