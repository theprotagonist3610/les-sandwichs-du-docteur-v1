# Guide de Publication sur Google Play Store

## 📋 Checklist Complète

### Avant de Commencer

- [ ] APK signé généré et testé sur plusieurs appareils
- [ ] Compte Google Play Developer créé (25 USD frais unique)
- [ ] Politique de confidentialité hébergée sur votre site
- [ ] Captures d'écran préparées
- [ ] Description de l'application rédigée
- [ ] Icônes et assets graphiques prêts

---

## 1️⃣ Créer un Compte Développeur

### Étapes

1. Aller sur [Google Play Console](https://play.google.com/console/signup)
2. Se connecter avec un compte Google
3. Accepter les conditions d'utilisation
4. Payer les frais uniques de 25 USD
5. Compléter le profil développeur

**Délai:** Compte activé immédiatement après paiement

---

## 2️⃣ Préparer les Assets Requis

### A. Captures d'Écran (OBLIGATOIRE)

#### Téléphone
- **Format:** PNG ou JPEG
- **Résolution recommandée:** 1080x1920 (16:9)
- **Minimum:** 2 captures
- **Maximum:** 8 captures

**Exemples de captures à prendre:**
1. Page Dashboard
2. Page Commandes avec commandes actives
3. Page Statistiques avec graphiques
4. Page Comptabilité
5. Carte des emplacements

#### Tablette 7 pouces (OPTIONNEL mais recommandé)
- **Résolution:** 1024x600

#### Tablette 10 pouces (OPTIONNEL)
- **Résolution:** 2048x1536

### B. Icône de l'Application (OBLIGATOIRE)

- **Format:** PNG (32-bit)
- **Taille:** 512x512 pixels
- **Transparent:** Non autorisé
- **Coins arrondis:** Non (Google les arrondira automatiquement)

**Votre icône actuelle:** `public/pwa-512x512.png` ✅

### C. Bannière de l'Application (OBLIGATOIRE)

- **Format:** PNG ou JPEG
- **Taille:** 1024x500 pixels
- **Pas de transparence**
- **Texte lisible sur différents fonds**

### D. Image de Présentation (Feature Graphic) (OBLIGATOIRE)

- **Format:** PNG ou JPEG
- **Taille:** 1024x500 pixels
- **Utilisée dans les promotions Google Play**

### E. Vidéo Promotionnelle (OPTIONNEL)

- **URL YouTube** uniquement
- **Durée recommandée:** 30-120 secondes

---

## 3️⃣ Informations de la Fiche Store

### Titre de l'Application

**Maximum:** 50 caractères

```
Les Sandwichs du Docteur
```

### Brève Description

**Maximum:** 80 caractères

```
Gestion complète de sandwicherie : commandes, stock, comptabilité, livraisons
```

### Description Complète

**Maximum:** 4000 caractères

```markdown
🥪 LES SANDWICHS DU DOCTEUR - Gestion Professionnelle de Sandwicherie

Application complète de gestion pour votre sandwicherie, axée sur l'alimentation saine et la prévention santé.

📊 TABLEAU DE BORD EN TEMPS RÉEL
• Suivi des ventes et du chiffre d'affaires
• Objectifs de vente avec prévisions intelligentes
• Indicateurs de performance en direct
• Vue d'ensemble des activités quotidiennes

🛒 GESTION DES COMMANDES
• Prise de commande rapide et intuitive
• Suivi en temps réel de la préparation
• Gestion des livraisons avec carte interactive
• Historique complet des commandes

📦 GESTION DU STOCK
• Suivi des stocks en temps réel
• Alertes de stock faible
• Historique des mouvements
• Inventaires simplifiés

💰 COMPTABILITÉ INTÉGRÉE
• Encaissements et dépenses
• Gestion multi-comptes (Caisse, MoMo, Celtiis)
• Budgets prévisionnels
• Rapports financiers détaillés
• Clôture de journée automatisée

📈 STATISTIQUES AVANCÉES
• Analyses de ventes par période
• Graphiques de performance
• Top produits et tendances
• Comparaison avec prévisions

🎯 PROMOTIONS
• Création de promotions personnalisées
• Gestion par emplacement et date
• Suivi de l'impact des promotions

🗺️ MULTI-EMPLACEMENTS
• Gestion de plusieurs points de vente
• Carte interactive des emplacements
• Métriques par emplacement
• Horaires d'ouverture configurables

👥 GESTION D'ÉQUIPE
• Rôles: Vendeur, Superviseur, Admin
• Permissions personnalisées
• Suivi des performances par utilisateur

📱 INTERFACE RESPONSIVE
• Optimisée pour mobile et tablette
• Mode sombre/clair
• Notifications push (commandes, livraisons)
• Fonctionne hors-ligne (PWA)

🔒 SÉCURITÉ
• Authentification sécurisée
• Données chiffrées
• Sauvegardes automatiques
• Protection des données sensibles

🚀 FONCTIONNALITÉS AVANCÉES
• Prévisions de vente basées sur l'historique
• Export Excel des rapports
• Génération de PDF (factures, rapports)
• Synchronisation temps réel

✨ POUR QUI ?
• Sandwicheries
• Restaurants rapides
• Food trucks
• Points de vente alimentaires

💡 POURQUOI CHOISIR LSD ?
• Solution complète tout-en-un
• Interface intuitive et moderne
• Mises à jour régulières
• Support technique réactif
• Conçue pour les professionnels de la restauration

📞 SUPPORT
Email: contact@lsd.com
Site web: https://votre-site.com

---

🌟 Téléchargez maintenant et révolutionnez la gestion de votre sandwicherie !
```

### Catégorie

- **Principale:** Entreprise
- **Secondaire:** Productivité

### Tags

```
gestion restaurant, caisse enregistreuse, comptabilité, stock, commandes, livraison, sandwicherie, food business, point de vente, POS
```

---

## 4️⃣ Classification du Contenu

### Questionnaire Google Play

Répondre honnêtement aux questions sur:
- Violence
- Contenu sexuel
- Langage vulgaire
- Drogue et alcool
- Jeux d'argent

**Pour LSD:** Tout cocher "Non" (application professionnelle)

### Public Cible

- **Âge minimum:** 3+ (Tous publics)

### Annonces Publicitaires

- **Contient des annonces:** Non

---

## 5️⃣ Politique de Confidentialité

### Obligatoire

Vous devez fournir une URL accessible publiquement.

#### Template Simple

```markdown
# Politique de Confidentialité - Les Sandwichs du Docteur

**Dernière mise à jour:** [Date]

## 1. Collecte des Données

Notre application "Les Sandwichs du Docteur" collecte les données suivantes:

### Données de Compte
- Nom d'utilisateur
- Adresse email
- Rôle (Vendeur, Superviseur, Admin)

### Données d'Activité
- Commandes créées
- Transactions comptables
- Statistiques de vente
- Localisation des emplacements (GPS)

## 2. Utilisation des Données

Les données collectées sont utilisées pour:
- Gérer les commandes et les livraisons
- Suivre les stocks et la comptabilité
- Générer des statistiques et rapports
- Améliorer nos services

## 3. Partage des Données

Nous ne vendons ni ne partageons vos données personnelles avec des tiers.

Les données sont stockées sur des serveurs sécurisés (Supabase).

## 4. Sécurité

Nous mettons en œuvre des mesures de sécurité pour protéger vos données:
- Chiffrement des données en transit (HTTPS)
- Authentification sécurisée
- Sauvegardes régulières

## 5. Vos Droits

Vous avez le droit de:
- Accéder à vos données personnelles
- Demander la correction de vos données
- Demander la suppression de votre compte

## 6. Cookies

L'application utilise des cookies pour:
- Maintenir votre session connectée
- Stocker vos préférences

## 7. Modifications

Cette politique peut être modifiée. Les changements seront communiqués via l'application.

## 8. Contact

Pour toute question: contact@lsd.com

**Adresse:** [Votre adresse professionnelle]
```

**Hébergez ce fichier sur votre site:** `https://votre-site.com/privacy-policy`

---

## 6️⃣ Informations sur les Données Utilisateur

### Déclaration de Sécurité des Données

Google Play exige que vous déclariez:

#### Données Collectées
- ✅ Localisation approximative (pour les emplacements)
- ✅ Nom (compte utilisateur)
- ✅ Adresse email
- ✅ Identifiants utilisateur
- ✅ Données d'activité de l'application
- ✅ Données financières (transactions)

#### Usage des Données
- ✅ Fonctionnalités de l'application
- ✅ Analyses
- ✅ Communication

#### Partage des Données
- ❌ Pas de partage avec des tiers

#### Chiffrement
- ✅ Données chiffrées en transit
- ✅ Données chiffrées au repos

---

## 7️⃣ Test et Déploiement

### A. Test Interne (Recommandé)

1. Créer une liste de testeurs (max 100)
2. Uploader l'APK dans "Test interne"
3. Inviter les testeurs via email
4. Collecter les retours
5. Corriger les bugs

**Durée:** Aucune revue Google nécessaire (instantané)

### B. Test Fermé (Optionnel)

1. Créer un groupe de testeurs (jusqu'à 100 000)
2. Uploader l'APK
3. Générer un lien d'inscription
4. Partager le lien

**Durée:** Revue Google en 1-2 jours

### C. Production

1. Uploader l'APK signé
2. Remplir toutes les sections
3. Soumettre pour revue
4. Attendre l'approbation

**Durée:** 1-7 jours (généralement 1-3 jours)

---

## 8️⃣ Soumettre l'Application

### Dans Google Play Console

1. **Créer l'Application**
   - Aller dans "Toutes les applications"
   - Cliquer sur "Créer une application"
   - Nom: "Les Sandwichs du Docteur"
   - Langue par défaut: Français (France)
   - Type: Application
   - Gratuite ou payante: Gratuite

2. **Configurer la Fiche du Store**
   - Ajouter les captures d'écran
   - Ajouter l'icône et la bannière
   - Rédiger les descriptions
   - Définir la catégorie

3. **Classification du Contenu**
   - Remplir le questionnaire
   - Obtenir la classification

4. **Public Cible**
   - Âge: Tous publics (3+)

5. **Déclaration de Confidentialité**
   - Ajouter l'URL de votre politique

6. **Données Utilisateur**
   - Remplir la déclaration de sécurité

7. **Télécharger l'APK**
   - Production > Versions > Créer une version
   - Uploader `app-release-signed.apk`
   - Nom de version: 1.0.0 (1)
   - Notes de version: "Version initiale"

8. **Prix et Distribution**
   - Pays: Sélectionner les pays cibles
   - Prix: Gratuit
   - Accepter les accords

9. **Soumettre**
   - Vérifier toutes les sections (✅ vert)
   - Cliquer sur "Envoyer pour examen"

---

## 9️⃣ Après Publication

### A. Mises à Jour

Pour publier une mise à jour:

1. Incrémenter la version dans `twa-manifest.json`:
```json
{
  "appVersionName": "1.0.1",
  "appVersionCode": 2
}
```

2. Rebuild l'APK:
```bash
npm run android:update
npm run android:build
```

3. Uploader sur Google Play Console:
   - Production > Créer une version
   - Uploader le nouvel APK
   - Ajouter les notes de version
   - Soumettre

**Délai:** Revue en 1-3 jours

### B. Suivi des Performances

Dans Google Play Console:
- **Statistiques:** Installations, désinstallations, notes
- **Avis utilisateurs:** Répondre aux commentaires
- **Rapports de plantage:** Corriger les bugs
- **Statistiques d'utilisation:** Analyser l'engagement

### C. Optimisation du Store (ASO)

- Améliorer les captures d'écran
- Tester différentes descriptions
- Encourager les avis positifs
- Répondre aux avis négatifs
- Mettre à jour régulièrement

---

## 🔟 Checklist de Soumission

### Avant de Soumettre

- [ ] APK signé testé sur ≥3 appareils différents
- [ ] Version incrémentée correctement
- [ ] Aucun crash ou bug majeur
- [ ] Toutes les fonctionnalités testées
- [ ] Captures d'écran de qualité (≥2)
- [ ] Icône 512x512 PNG
- [ ] Bannière 1024x500
- [ ] Description complète rédigée
- [ ] Politique de confidentialité hébergée
- [ ] Déclaration de sécurité des données complétée
- [ ] Classification du contenu remplie
- [ ] Prix et distribution configurés
- [ ] Toutes les sections vertes (✅) dans la console

### Pendant la Revue

- [ ] Surveiller les emails de Google Play
- [ ] Être prêt à répondre aux questions
- [ ] Avoir une version de backup

### Après Approbation

- [ ] Vérifier que l'app est visible sur le Store
- [ ] Tester l'installation depuis le Store
- [ ] Partager le lien: `https://play.google.com/store/apps/details?id=com.lsd.sandwichs`
- [ ] Promouvoir l'application
- [ ] Configurer les notifications de retours utilisateurs

---

## 🚨 Problèmes Courants et Solutions

### "Application Rejetée: Violation de la Politique"

**Causes fréquentes:**
- Politique de confidentialité manquante ou invalide
- Permissions non justifiées
- Contenu trompeur dans la description
- Icône ou captures d'écran de mauvaise qualité

**Solution:** Corriger le problème signalé et resoumettre

### "APK Non Compatible"

**Solution:**
- Vérifier le `minSdkVersion` (24+ recommandé)
- Vérifier le `targetSdkVersion` (34 actuellement)
- Utiliser un APK universel (pas de splits)

### "Signature Invalide"

**Solution:**
- Utiliser le même keystore pour toutes les versions
- Ne jamais perdre le keystore (sauvegarder!)
- Vérifier: `jarsigner -verify app-release-signed.apk`

---

## 💡 Conseils Pro

1. **Testez AVANT de soumettre:** Test interne gratuit et sans limite

2. **Répondez aux avis:** Améliore le classement

3. **Mises à jour régulières:** Signal positif pour Google

4. **Localisez l'application:** Français + Anglais = plus de téléchargements

5. **Badge Google Play:** Ajoutez le badge sur votre site web

6. **Analyse:** Utilisez Firebase Analytics pour comprendre l'usage

7. **Crash Reporting:** Intégrez Firebase Crashlytics

---

## 📊 Métriques de Succès

### Indicateurs à Surveiller

- **Installations:** Croissance mensuelle
- **Note moyenne:** Maintenir ≥4.0
- **Taux de rétention:** % utilisateurs actifs après 30 jours
- **Taux de désinstallation:** <20% idéalement
- **Crashes:** <1% des sessions

---

## 📞 Support Google Play

- [Centre d'aide](https://support.google.com/googleplay/android-developer)
- [Forum de la communauté](https://support.google.com/googleplay/android-developer/community)
- Contact direct (via la console pour problèmes critiques)

---

**Prêt à publier?** Suivez cette checklist étape par étape et votre application sera sur le Store! 🚀

**Lien Google Play (après publication):**
```
https://play.google.com/store/apps/details?id=com.lsd.sandwichs
```
