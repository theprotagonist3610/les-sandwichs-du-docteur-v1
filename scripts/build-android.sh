#!/bin/bash

# ============================================================================
# Script de Build Android APK depuis PWA
# ============================================================================
# Automatise le processus de génération d'APK via Bubblewrap (TWA)
# ============================================================================

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Les Sandwichs du Docteur"
PACKAGE_ID="com.lsd.sandwichs"
DOMAIN="${1:-localhost:5173}"  # Domaine par défaut pour dev
KEYSTORE_FILE="android.keystore"
KEYSTORE_ALIAS="android"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Build Android APK - ${APP_NAME}${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Vérifier les prérequis
echo -e "${YELLOW}1. Vérification des prérequis...${NC}"

# Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# Java
if ! command -v java &> /dev/null; then
    echo -e "${RED}❌ Java JDK n'est pas installé${NC}"
    echo -e "${YELLOW}Installer depuis: https://adoptium.net/${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Java $(java -version 2>&1 | head -n 1)${NC}"

# Bubblewrap
if ! command -v bubblewrap &> /dev/null; then
    echo -e "${YELLOW}⚠ Bubblewrap n'est pas installé${NC}"
    echo -e "${YELLOW}Installation de Bubblewrap...${NC}"
    npm install -g @bubblewrap/cli
    echo -e "${GREEN}✓ Bubblewrap installé${NC}"
else
    echo -e "${GREEN}✓ Bubblewrap $(bubblewrap --version)${NC}"
fi

echo ""

# Vérifier si c'est une première initialisation
if [ ! -f "twa-manifest.json" ]; then
    echo -e "${YELLOW}2. Initialisation du projet TWA...${NC}"
    echo -e "${YELLOW}Cette étape n'est nécessaire qu'une seule fois${NC}"
    echo ""

    # Demander le domaine si non fourni
    if [ "$DOMAIN" == "localhost:5173" ]; then
        read -p "Entrez le domaine de production (ex: app.lsd.com): " PRODUCTION_DOMAIN
        DOMAIN=${PRODUCTION_DOMAIN:-$DOMAIN}
    fi

    echo -e "${BLUE}Configuration:${NC}"
    echo -e "  Domain: ${DOMAIN}"
    echo -e "  Package ID: ${PACKAGE_ID}"
    echo -e "  App Name: ${APP_NAME}"
    echo ""

    # Initialiser bubblewrap
    bubblewrap init --manifest "https://${DOMAIN}/manifest.webmanifest"

    echo -e "${GREEN}✓ Projet TWA initialisé${NC}"
else
    echo -e "${GREEN}✓ Projet TWA déjà initialisé${NC}"
fi

echo ""

# Vérifier le keystore
if [ ! -f "$KEYSTORE_FILE" ]; then
    echo -e "${YELLOW}3. Génération de la clé de signature...${NC}"
    echo -e "${YELLOW}Cette clé sera utilisée pour signer l'APK${NC}"
    echo -e "${RED}⚠ IMPORTANT: Sauvegardez cette clé et son mot de passe!${NC}"
    echo ""

    keytool -genkey -v \
        -keystore "$KEYSTORE_FILE" \
        -alias "$KEYSTORE_ALIAS" \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -dname "CN=Les Sandwichs du Docteur, O=LSD, L=Abidjan, C=CI" \
        -storepass "changeme" \
        -keypass "changeme"

    echo ""
    echo -e "${RED}⚠ IMPORTANT:${NC}"
    echo -e "  Fichier de clé: ${KEYSTORE_FILE}"
    echo -e "  Alias: ${KEYSTORE_ALIAS}"
    echo -e "  Mot de passe par défaut: changeme"
    echo -e "  ${RED}Changez ce mot de passe pour la production!${NC}"
    echo ""
    echo -e "${GREEN}✓ Clé de signature générée${NC}"
else
    echo -e "${GREEN}✓ Clé de signature existante${NC}"
fi

echo ""

# Build de la PWA (si dist n'existe pas ou si demandé)
if [ ! -d "dist" ] || [ "$2" == "--rebuild-pwa" ]; then
    echo -e "${YELLOW}4. Build de la PWA...${NC}"
    npm run build
    echo -e "${GREEN}✓ PWA buildée${NC}"
else
    echo -e "${GREEN}✓ PWA déjà buildée (utilisez --rebuild-pwa pour forcer)${NC}"
fi

echo ""

# Mise à jour du manifest TWA
echo -e "${YELLOW}5. Mise à jour du manifest TWA...${NC}"
if [ -f "twa-manifest.json" ]; then
    bubblewrap update --skipPwaValidation
    echo -e "${GREEN}✓ Manifest TWA mis à jour${NC}"
fi

echo ""

# Build de l'APK
echo -e "${YELLOW}6. Build de l'APK...${NC}"
echo -e "${YELLOW}Cette étape peut prendre quelques minutes...${NC}"

bubblewrap build --skipPwaValidation

echo ""
echo -e "${GREEN}✓ APK généré avec succès!${NC}"

# Trouver le fichier APK généré
APK_FILE=$(find . -name "app-release-signed.apk" -o -name "app-release-unsigned.apk" | head -n 1)

if [ -n "$APK_FILE" ]; then
    APK_SIZE=$(du -h "$APK_FILE" | cut -f1)
    echo ""
    echo -e "${BLUE}============================================================================${NC}"
    echo -e "${GREEN}Build terminé avec succès!${NC}"
    echo -e "${BLUE}============================================================================${NC}"
    echo ""
    echo -e "  Fichier APK: ${GREEN}${APK_FILE}${NC}"
    echo -e "  Taille: ${APK_SIZE}"
    echo ""

    # Vérifier la signature
    if command -v jarsigner &> /dev/null; then
        echo -e "${YELLOW}Vérification de la signature...${NC}"
        if jarsigner -verify "$APK_FILE" &> /dev/null; then
            echo -e "${GREEN}✓ APK signé correctement${NC}"
        else
            echo -e "${RED}⚠ APK non signé${NC}"
        fi
    fi

    echo ""
    echo -e "${BLUE}Prochaines étapes:${NC}"
    echo -e "  1. Testez l'APK sur un appareil Android:"
    echo -e "     ${YELLOW}adb install ${APK_FILE}${NC}"
    echo ""
    echo -e "  2. Ou transférez le fichier sur votre appareil et installez-le"
    echo -e "     (Activez 'Sources inconnues' dans les paramètres)"
    echo ""
    echo -e "  3. Pour publier sur Google Play Store:"
    echo -e "     - Consultez docs/PACKAGING_ANDROID.md"
    echo -e "     - Préparez les assets (captures d'écran, description, etc.)"
    echo ""
    echo -e "${BLUE}============================================================================${NC}"
else
    echo -e "${RED}❌ Erreur: APK non trouvé${NC}"
    exit 1
fi
