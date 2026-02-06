# ============================================================================
# Script de Build Android APK depuis PWA (Windows PowerShell)
# ============================================================================
# Automatise le processus de génération d'APK via Bubblewrap (TWA)
# ============================================================================

param(
    [string]$Domain = "localhost:5173",
    [switch]$RebuildPwa
)

$ErrorActionPreference = "Stop"

# Configuration
$APP_NAME = "Les Sandwichs du Docteur"
$PACKAGE_ID = "com.lsd.sandwichs"
$KEYSTORE_FILE = "android.keystore"
$KEYSTORE_ALIAS = "android"

Write-Host "============================================================================" -ForegroundColor Blue
Write-Host "Build Android APK - $APP_NAME" -ForegroundColor Blue
Write-Host "============================================================================" -ForegroundColor Blue
Write-Host ""

# Vérifier les prérequis
Write-Host "1. Vérification des prérequis..." -ForegroundColor Yellow

# Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé" -ForegroundColor Red
    exit 1
}

# Java
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "✓ Java $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Java JDK n'est pas installé" -ForegroundColor Red
    Write-Host "Installer depuis: https://adoptium.net/" -ForegroundColor Yellow
    exit 1
}

# Bubblewrap
try {
    $bubblewrapVersion = bubblewrap --version 2>&1
    Write-Host "✓ Bubblewrap $bubblewrapVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠ Bubblewrap n'est pas installé" -ForegroundColor Yellow
    Write-Host "Installation de Bubblewrap..." -ForegroundColor Yellow
    npm install -g @bubblewrap/cli
    Write-Host "✓ Bubblewrap installé" -ForegroundColor Green
}

Write-Host ""

# Vérifier si c'est une première initialisation
if (-not (Test-Path "twa-manifest.json")) {
    Write-Host "2. Initialisation du projet TWA..." -ForegroundColor Yellow
    Write-Host "Cette étape n'est nécessaire qu'une seule fois" -ForegroundColor Yellow
    Write-Host ""

    # Demander le domaine si non fourni
    if ($Domain -eq "localhost:5173") {
        $ProductionDomain = Read-Host "Entrez le domaine de production (ex: app.lsd.com)"
        if ($ProductionDomain) {
            $Domain = $ProductionDomain
        }
    }

    Write-Host "Configuration:" -ForegroundColor Blue
    Write-Host "  Domain: $Domain"
    Write-Host "  Package ID: $PACKAGE_ID"
    Write-Host "  App Name: $APP_NAME"
    Write-Host ""

    # Initialiser bubblewrap
    bubblewrap init --manifest "https://$Domain/manifest.webmanifest"

    Write-Host "✓ Projet TWA initialisé" -ForegroundColor Green
} else {
    Write-Host "✓ Projet TWA déjà initialisé" -ForegroundColor Green
}

Write-Host ""

# Vérifier le keystore
if (-not (Test-Path $KEYSTORE_FILE)) {
    Write-Host "3. Génération de la clé de signature..." -ForegroundColor Yellow
    Write-Host "Cette clé sera utilisée pour signer l'APK" -ForegroundColor Yellow
    Write-Host "⚠ IMPORTANT: Sauvegardez cette clé et son mot de passe!" -ForegroundColor Red
    Write-Host ""

    keytool -genkey -v `
        -keystore $KEYSTORE_FILE `
        -alias $KEYSTORE_ALIAS `
        -keyalg RSA `
        -keysize 2048 `
        -validity 10000 `
        -dname "CN=Les Sandwichs du Docteur, O=LSD, L=Abidjan, C=CI" `
        -storepass "changeme" `
        -keypass "changeme"

    Write-Host ""
    Write-Host "⚠ IMPORTANT:" -ForegroundColor Red
    Write-Host "  Fichier de clé: $KEYSTORE_FILE"
    Write-Host "  Alias: $KEYSTORE_ALIAS"
    Write-Host "  Mot de passe par défaut: changeme"
    Write-Host "  Changez ce mot de passe pour la production!" -ForegroundColor Red
    Write-Host ""
    Write-Host "✓ Clé de signature générée" -ForegroundColor Green
} else {
    Write-Host "✓ Clé de signature existante" -ForegroundColor Green
}

Write-Host ""

# Build de la PWA (si dist n'existe pas ou si demandé)
if (-not (Test-Path "dist") -or $RebuildPwa) {
    Write-Host "4. Build de la PWA..." -ForegroundColor Yellow
    npm run build
    Write-Host "✓ PWA buildée" -ForegroundColor Green
} else {
    Write-Host "✓ PWA déjà buildée (utilisez -RebuildPwa pour forcer)" -ForegroundColor Green
}

Write-Host ""

# Mise à jour du manifest TWA
Write-Host "5. Mise à jour du manifest TWA..." -ForegroundColor Yellow
if (Test-Path "twa-manifest.json") {
    bubblewrap update --skipPwaValidation
    Write-Host "✓ Manifest TWA mis à jour" -ForegroundColor Green
}

Write-Host ""

# Build de l'APK
Write-Host "6. Build de l'APK..." -ForegroundColor Yellow
Write-Host "Cette étape peut prendre quelques minutes..." -ForegroundColor Yellow

bubblewrap build --skipPwaValidation

Write-Host ""
Write-Host "✓ APK généré avec succès!" -ForegroundColor Green

# Trouver le fichier APK généré
$APK_FILE = Get-ChildItem -Path . -Recurse -Filter "app-release-signed.apk" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $APK_FILE) {
    $APK_FILE = Get-ChildItem -Path . -Recurse -Filter "app-release-unsigned.apk" -ErrorAction SilentlyContinue | Select-Object -First 1
}

if ($APK_FILE) {
    $APK_SIZE = [math]::Round($APK_FILE.Length / 1MB, 2)
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor Blue
    Write-Host "Build terminé avec succès!" -ForegroundColor Green
    Write-Host "============================================================================" -ForegroundColor Blue
    Write-Host ""
    Write-Host "  Fichier APK: $($APK_FILE.FullName)" -ForegroundColor Green
    Write-Host "  Taille: $APK_SIZE MB"
    Write-Host ""

    # Vérifier la signature
    try {
        $verifyResult = jarsigner -verify $APK_FILE.FullName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ APK signé correctement" -ForegroundColor Green
        } else {
            Write-Host "⚠ APK non signé" -ForegroundColor Red
        }
    } catch {
        Write-Host "⚠ Impossible de vérifier la signature (jarsigner non trouvé)" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "Prochaines étapes:" -ForegroundColor Blue
    Write-Host "  1. Testez l'APK sur un appareil Android:"
    Write-Host "     adb install $($APK_FILE.FullName)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  2. Ou transférez le fichier sur votre appareil et installez-le"
    Write-Host "     (Activez 'Sources inconnues' dans les paramètres)"
    Write-Host ""
    Write-Host "  3. Pour publier sur Google Play Store:"
    Write-Host "     - Consultez docs/PACKAGING_ANDROID.md"
    Write-Host "     - Préparez les assets (captures d'écran, description, etc.)"
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor Blue
} else {
    Write-Host "❌ Erreur: APK non trouvé" -ForegroundColor Red
    exit 1
}
