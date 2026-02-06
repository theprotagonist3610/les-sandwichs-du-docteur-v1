# Guide de Démarrage Rapide - Build Android

## 🚀 Méthode Rapide (PWABuilder) - 5 minutes

**La plus simple pour commencer!**

1. Déployez votre PWA sur un serveur HTTPS (Vercel, Netlify, etc.)

2. Allez sur [PWABuilder.com](https://www.pwabuilder.com/)

3. Entrez l'URL de votre PWA: `https://votre-domaine.com`

4. Cliquez sur **"Start"**

5. Dans l'onglet **"Package"**, sélectionnez **"Android"**

6. Configurez:
   - Package ID: `com.lsd.sandwichs`
   - App name: `Les Sandwichs du Docteur`
   - Version: `1.0.0`

7. Cliquez sur **"Generate Package"**

8. Téléchargez l'APK et installez-le sur votre appareil

✅ **C'est tout!** Vous avez votre première APK en moins de 5 minutes.

---

## ⚙️ Méthode Avancée (Bubblewrap/TWA)

Pour un contrôle total et des builds automatisés.

### Prérequis

```bash
# 1. Installer Java JDK 17+
# Windows: https://adoptium.net/
# Télécharger "OpenJDK 17 (LTS)" et installer

# 2. Installer Bubblewrap
npm install -g @bubblewrap/cli

# 3. Vérifier les installations
java -version
node -version
bubblewrap --version
```

### Build en 3 Commandes

```bash
# 1. Initialiser (une seule fois)
npm run android:init

# 2. Build de la PWA + APK
npm run android:build

# 3. Installer sur appareil connecté
npm run android:install
```

### Ou utilisez le script automatisé

**Windows:**
```powershell
.\scripts\build-android.ps1 -Domain "votre-domaine.com"
```

**Linux/Mac:**
```bash
chmod +x scripts/build-android.sh
./scripts/build-android.sh votre-domaine.com
```

---

## 📱 Tester sur Votre Appareil

### Option 1: Via ADB (Recommandé)

```bash
# 1. Activer le mode développeur sur Android:
#    Paramètres > À propos > Taper 7 fois sur "Numéro de build"

# 2. Activer le débogage USB:
#    Paramètres > Options pour développeurs > Débogage USB

# 3. Connecter l'appareil en USB

# 4. Installer l'APK
adb install app-release-signed.apk
```

### Option 2: Transfert Direct

1. Transférez le fichier `app-release-signed.apk` sur votre appareil
2. Ouvrez le fichier depuis le gestionnaire de fichiers
3. Android vous demandera d'activer "Installer des applis inconnues"
4. Activez cette option pour votre gestionnaire de fichiers
5. Installez l'APK

---

## 🔄 Mise à Jour de l'APK

Après avoir modifié votre PWA:

```bash
# Mettre à jour et rebuild
npm run android:update
npm run android:build
```

**Important:** Incrémentez la version dans `twa-manifest.json`:
```json
{
  "appVersionName": "1.0.1",
  "appVersionCode": 2
}
```

---

## ✅ Checklist Avant Build

- [ ] PWA déployée sur HTTPS
- [ ] manifest.webmanifest accessible
- [ ] Icônes 512x512 disponibles (regular + maskable)
- [ ] Service worker fonctionnel
- [ ] Test sur navigateur mobile réussi
- [ ] Lighthouse PWA score > 90

### Vérifier le Lighthouse Score

1. Ouvrir votre PWA dans Chrome
2. F12 > Onglet "Lighthouse"
3. Cocher "Progressive Web App"
4. Cliquer sur "Analyze page load"
5. Score doit être > 90

---

## 🐛 Problèmes Courants

### "Java JDK not found"

**Solution:**
```bash
# Windows - Définir JAVA_HOME
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17.0.XX-hotspot"
setx PATH "%PATH%;%JAVA_HOME%\bin"

# Redémarrer le terminal
```

### "Android SDK not found"

**Solution:**
- Installer [Android Studio](https://developer.android.com/studio)
- Ou télécharger uniquement [Command Line Tools](https://developer.android.com/studio#command-tools)

### "APK ne s'installe pas"

**Solution:**
```bash
# Vérifier la signature
jarsigner -verify -verbose -certs app-release-signed.apk

# Réinstaller proprement
adb uninstall com.lsd.sandwichs
adb install app-release-signed.apk
```

### "Invalid manifest URL"

**Solution:**
- Vérifier que manifest.webmanifest est accessible en HTTPS
- Tester: `curl https://votre-domaine.com/manifest.webmanifest`
- Valider le JSON: [jsonlint.com](https://jsonlint.com/)

---

## 📊 Comparer les Méthodes

| Critère | PWABuilder | Bubblewrap/TWA | Capacitor |
|---------|-----------|----------------|-----------|
| **Facilité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Rapidité** | 5 min | 15 min | 30 min |
| **Contrôle** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **APIs Natives** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Automatisation** | ❌ | ✅ | ✅ |
| **Gratuit** | ✅ | ✅ | ✅ |

**Recommandation pour LSD:**
- 🎯 **Début:** PWABuilder (test rapide)
- 🚀 **Production:** Bubblewrap/TWA (automatisation + contrôle)
- 🔧 **Avancé:** Capacitor (si besoin APIs natives spécifiques)

---

## 📦 Structure des Fichiers Générés

```
votre-projet/
├── android.keystore              # Clé de signature (NE PAS COMMIT)
├── twa-manifest.json            # Configuration TWA
├── .bubblewrap/                 # Cache Bubblewrap
├── app-release-signed.apk       # APK final
└── android/                     # Projet Android généré
    ├── app/
    ├── build.gradle
    └── gradlew
```

---

## 🎓 Ressources Utiles

- [Documentation Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)
- [PWABuilder](https://www.pwabuilder.com/)
- [Guide TWA Google](https://developer.chrome.com/docs/android/trusted-web-activity/)
- [Tester PWA sur Android](https://web.dev/install-criteria/)

---

## 💡 Astuces

### Build Rapide en Dev

```bash
# Utiliser localhost pour tester sans déployer
bubblewrap init --manifest http://localhost:5173/manifest.webmanifest

# Note: L'APK fonctionnera uniquement si le serveur dev tourne
```

### Changer l'Icône

Remplacez les fichiers dans `public/`:
- `pwa-512x512.png`
- `pwa-maskable-512x512.png`

Puis:
```bash
npm run android:update
npm run android:build
```

### Activer les Notifications

Dans `twa-manifest.json`:
```json
{
  "enableNotifications": true
}
```

### Splash Screen Personnalisé

Dans `twa-manifest.json`:
```json
{
  "backgroundColor": "#ffe8c9",
  "splashScreenFadeOutDuration": 300
}
```

---

**Prêt à démarrer?** Choisissez votre méthode et lancez-vous! 🚀
