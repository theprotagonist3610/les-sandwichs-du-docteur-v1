# Configuration des Moyens de Paiement

Ce guide explique comment configurer et utiliser les agrégateurs de paiement KKiaPay, FeeXpay et FedaPay en mode sandbox.

## Table des matières

1. [Prérequis](#prérequis)
2. [Configuration de la base de données](#configuration-de-la-base-de-données)
3. [Configuration KKiaPay](#configuration-kkiapay)
4. [Configuration FeeXpay](#configuration-feexpay)
5. [Configuration FedaPay](#configuration-fedapay)
6. [Utilisation de l'interface admin](#utilisation-de-linterface-admin)
7. [Tests en mode sandbox](#tests-en-mode-sandbox)
8. [Passage en production](#passage-en-production)

---

## Prérequis

- Compte KKiaPay : [https://kkiapay.me](https://kkiapay.me)
- Compte FeeXpay : [https://feexpay.me](https://feexpay.me)
- Compte FedaPay : [https://fedapay.com](https://fedapay.com)
- Accès admin à l'application

---

## Configuration de la base de données

### 1. Créer les tables nécessaires

Exécutez le script SQL suivant dans votre base de données Supabase :

```bash
# Via l'interface Supabase SQL Editor
# Copiez et exécutez le contenu de :
sql/create_payment_providers_table.sql
```

Ce script va créer :
- Table `payment_providers` : Configuration des agrégateurs
- Table `payment_transactions` : Historique des transactions
- Politiques RLS : Sécurisation des accès (admin uniquement)
- Triggers : Mise à jour automatique des timestamps

### 2. Vérification

Après l'exécution du script, vous devriez avoir 3 providers pré-configurés :
- **KKiaPay** (inactif, mode sandbox)
- **FeeXpay** (inactif, mode sandbox)
- **FedaPay** (inactif, mode sandbox)

> **Note** : Si vous avez déjà exécuté le script de création des tables, vous pouvez ajouter FedaPay en exécutant le script `sql/add_fedapay_provider.sql`

---

## Configuration KKiaPay

### 1. Obtenir les clés API

1. Connectez-vous à [https://kkiapay.me](https://kkiapay.me)
2. Accédez au **Dashboard**
3. Allez dans **Développeurs** > **Clés API**
4. Notez votre **Clé publique** (Public Key)

### 2. Activer le mode Sandbox

1. Dans le dashboard KKiaPay, activez le **mode Sandbox**
2. Vous recevrez des numéros de test pour simuler les paiements

### 3. Configuration dans l'application

#### Option A : Via l'interface admin (recommandé)

1. Connectez-vous en tant qu'admin
2. Accédez à **Outils** > **Moyens de paiement**
3. Cliquez sur **Configurer** dans la carte KKiaPay
4. Renseignez :
   - **Clé API publique** : Votre clé publique KKiaPay
   - **Mode Sandbox** : Activé (par défaut)
   - **Activer le provider** : Cochez pour activer
5. Cliquez sur **Enregistrer**

#### Option B : Via les variables d'environnement

Ajoutez dans votre fichier `.env` :

```env
VITE_KKIAPAY_PUBLIC_KEY=votre_clé_publique_kkiapay
```

> **Note** : Les clés configurées via l'interface admin ont la priorité sur les variables d'environnement.

---

## Configuration FeeXpay

### 1. Obtenir la clé API

1. Connectez-vous à [https://feexpay.me](https://feexpay.me)
2. Accédez au **Dashboard**
3. Allez dans **menu Développeur** (Developer)
4. Notez votre **API Key** (commence par `fp_`)

> **Note** : FeeXpay utilise une seule clé API (pas de distinction public/secret). Cette clé sert de Bearer token pour l'authentification.

### 2. Activer le mode Sandbox

1. Dans le dashboard FeeXpay, sélectionnez le **mode SANDBOX**
2. Utilisez la clé API de test fournie

### 3. Configuration dans l'application

#### Option A : Via l'interface admin (recommandé)

1. Connectez-vous en tant qu'admin
2. Accédez à **Outils** > **Moyens de paiement**
3. Cliquez sur **Configurer** dans la carte FeeXpay
4. Renseignez :
   - **Clé API publique** : Votre clé API FeeXpay (format: `fp_xxxxx`)
   - **Mode Sandbox** : Activé (par défaut)
   - **Activer le provider** : Cochez pour activer
5. Cliquez sur **Enregistrer**

#### Option B : Via les variables d'environnement

Ajoutez dans votre fichier `.env` :

```env
VITE_FEEXPAY_API_KEY=fp_votre_cle_api_feexpay
```

---

## Configuration FedaPay

### 1. Obtenir les clés API

1. Connectez-vous à [https://fedapay.com](https://fedapay.com)
2. Accédez au **Dashboard**
3. Allez dans **Développeur** > **Clés API**
4. Notez votre **Clé publique** (Public Key) et **Clé secrète** (Secret Key)

> **Note** : FedaPay utilise deux clés : une clé publique pour les paiements côté client et une clé secrète pour les vérifications serveur.

### 2. Activer le mode Sandbox

1. Dans le dashboard FedaPay, basculez en **mode Sandbox**
2. Utilisez les clés sandbox pour les tests

### 3. Configuration dans l'application

#### Option A : Via l'interface admin (recommandé)

1. Connectez-vous en tant qu'admin
2. Accédez à **Outils** > **Moyens de paiement**
3. Cliquez sur **Configurer** dans la carte FedaPay
4. Renseignez :
   - **Clé API publique** : Votre clé publique FedaPay (format: `pk_sandbox_xxxxx` ou `pk_live_xxxxx`)
   - **Clé API secrète** : Votre clé secrète FedaPay (format: `sk_sandbox_xxxxx` ou `sk_live_xxxxx`)
   - **Mode Sandbox** : Activé (par défaut)
   - **Activer le provider** : Cochez pour activer
5. Cliquez sur **Enregistrer**

#### Option B : Via les variables d'environnement

Ajoutez dans votre fichier `.env` :

```env
VITE_FEDAPAY_PUBLIC_KEY=pk_sandbox_votre_cle_publique
VITE_FEDAPAY_SECRET_KEY=sk_sandbox_votre_cle_secrete
```

> **Important** : FedaPay utilise le widget React officiel `fedapay-reactjs` avec le script `checkout.js`. Le widget gère automatiquement l'affichage du formulaire de paiement.

---

## Utilisation de l'interface admin

L'interface de gestion des moyens de paiement se trouve dans **Outils** > **Moyens de paiement**.

### Onglets disponibles

#### 1. Configuration
- Visualiser et modifier les clés API
- Activer/désactiver les providers
- Basculer entre mode Sandbox et Production
- Afficher le statut de chaque agrégateur

#### 2. Tests
- Interface de test pour chaque provider actif
- Formulaire pour simuler des paiements
- Affichage des résultats de test
- Historique des tests effectués

#### 3. Historique
- Tableau de toutes les transactions
- Filtres par statut, provider, date
- Export CSV des transactions
- Détails de chaque transaction

---

## Tests en mode sandbox

### KKiaPay - Numéros de test

KKiaPay fournit des numéros de téléphone de test pour simuler les paiements. Consultez la [documentation officielle](https://docs.kkiapay.me/v1/compte/kkiapay-sandbox-guide-de-test) pour obtenir les numéros à jour.

**Processus de test :**

1. Accédez à **Tests** dans l'interface
2. Sélectionnez un montant (ex: 100 XOF)
3. Cliquez sur **Tester le paiement KKiaPay**
4. Une popup KKiaPay s'ouvre
5. Utilisez un numéro de test fourni par KKiaPay
6. Validez le paiement
7. La transaction apparaît dans l'historique avec le statut approprié

### FeeXpay - Tests sandbox

**Processus de test :**

1. Accédez à **Tests** dans l'interface
2. Sélectionnez un montant (ex: 100 XOF)
3. Renseignez un téléphone et email de test
4. Cliquez sur **Tester le paiement FeeXpay**
5. Vous êtes redirigé vers la page de paiement FeeXpay
6. Complétez le paiement avec les coordonnées de test
7. La transaction est enregistrée dans l'historique

### FedaPay - Tests sandbox

**Processus de test :**

1. Accédez à **Tests** dans l'interface
2. Sélectionnez un montant (ex: 100 XOF)
3. Renseignez un numéro de téléphone (obligatoire) et email (optionnel)
4. Cliquez sur **Tester le paiement FedaPay**
5. Un widget modal FedaPay s'ouvre
6. Sélectionnez votre méthode de paiement (Mobile Money, Carte bancaire)
7. Complétez le paiement avec les coordonnées de test
8. La transaction est automatiquement enregistrée dans l'historique

> **Note** : FedaPay utilise un widget modal qui reste sur la même page. Le widget gère l'ensemble du flux de paiement de manière sécurisée.

### Vérification des tests

Après chaque test, vérifiez :
- ✅ La transaction apparaît dans l'**Historique**
- ✅ Le statut est correct (success, failed, pending)
- ✅ Le montant est exact
- ✅ Le badge **Sandbox** est affiché
- ✅ Les métadonnées sont enregistrées

---

## Passage en production

⚠️ **IMPORTANT** : Ne passez en production qu'après avoir validé tous les tests en sandbox.

### 1. Obtenir les clés de production

#### KKiaPay
1. Désactivez le mode Sandbox dans votre dashboard KKiaPay
2. Récupérez vos nouvelles clés API de production
3. Vérifiez votre compte (KYC) si nécessaire

#### FeeXpay
1. Passez en mode **LIVE** dans votre dashboard FeeXpay
2. Récupérez vos clés API de production
3. Complétez la vérification de compte si nécessaire

#### FedaPay
1. Désactivez le mode Sandbox dans votre dashboard FedaPay
2. Récupérez vos clés de production (publique et secrète)
3. Complétez le processus de vérification KYC si nécessaire

### 2. Configuration de production

1. Accédez à **Outils** > **Moyens de paiement**
2. Pour chaque provider :
   - Cliquez sur **Configurer**
   - Remplacez la **Clé API publique** par celle de production
   - Pour FedaPay : Remplacez également la **Clé API secrète**
   - **Désactivez** le mode Sandbox
   - Enregistrez les modifications

### 3. Vérifications de sécurité

Avant de passer en production, assurez-vous que :

- ✅ Les clés de production sont stockées de manière sécurisée
- ✅ Le mode Sandbox est **désactivé** pour les deux providers
- ✅ Les politiques RLS Supabase sont actives
- ✅ Seuls les admins ont accès à la configuration
- ✅ Les webhooks sont configurés (si nécessaire)
- ✅ Les notifications sont actives
- ✅ Un monitoring des transactions est en place

### 4. Tests de production

Effectuez un premier paiement de test réel avec un **petit montant** pour vérifier :
- Le processus de paiement complet
- L'enregistrement en base de données
- Les notifications
- Le statut final de la transaction

---

## Architecture technique

### Fichiers créés

```
src/
├── components/payments/
│   ├── KKiaPayButton.jsx         # Bouton de paiement KKiaPay
│   ├── FeeXpayButton.jsx         # Bouton de paiement FeeXpay
│   ├── PaymentProviderCard.jsx   # Carte de configuration provider
│   ├── PaymentTestInterface.jsx  # Interface de test
│   └── TransactionHistoryTable.jsx # Tableau des transactions
├── hooks/
│   ├── usePaymentProviders.jsx   # Hook pour gérer les providers
│   └── usePaymentTransactions.jsx # Hook pour gérer les transactions
├── utils/
│   └── paymentToolkit.jsx        # Fonctions utilitaires paiement
└── pages/outils/moyensdepaiement/
    ├── DesktopMoyensDePaiement.jsx
    └── MobileMoyensDePaiement.jsx

sql/
└── create_payment_providers_table.sql # Script de création BDD
```

### Flux de paiement

```
1. Utilisateur clique sur bouton paiement
   ↓
2. Validation du provider et du montant
   ↓
3. KKiaPay : Popup widget
   FeeXpay : Redirection vers page paiement
   ↓
4. Utilisateur complète le paiement
   ↓
5. Callback success/failed
   ↓
6. Enregistrement transaction en BDD
   ↓
7. Mise à jour de l'interface
```

---

## Support

### Documentation officielle

- **KKiaPay** : [https://docs.kkiapay.me](https://docs.kkiapay.me)
- **FeeXpay** : [https://docs.feexpay.me](https://docs.feexpay.me)

### Résolution de problèmes

#### "Clé API KKiaPay non configurée"
- Vérifiez que vous avez bien saisi la clé dans l'interface admin
- Ou ajoutez `VITE_KKIAPAY_PUBLIC_KEY` dans `.env`

#### "Paiement FeeXpay échoué"
- Vérifiez que le mode sandbox est activé
- Vérifiez la clé API dans le dashboard FeeXpay
- Consultez les logs de la console navigateur

#### "Provider inactif"
- Activez le provider dans la section Configuration
- Vérifiez que les clés API sont correctement configurées

#### Transactions non enregistrées
- Vérifiez les politiques RLS Supabase
- Vérifiez que vous êtes connecté en tant qu'admin
- Consultez les logs de la console

---

## Sécurité

### Bonnes pratiques

1. **Ne jamais** committer les clés API dans le code source
2. Utiliser les variables d'environnement pour les clés sensibles
3. Activer RLS sur toutes les tables de paiement
4. Limiter l'accès à la configuration aux admins uniquement
5. Vérifier les transactions côté serveur (pas seulement côté client)
6. Utiliser HTTPS en production
7. Monitorer les transactions pour détecter les anomalies
8. Implémenter des webhooks pour la vérification asynchrone

### Chiffrement

Les clés API secrètes stockées en base de données devraient idéalement être chiffrées. Considérez l'utilisation de :
- Supabase Vault (pour le stockage sécurisé)
- Chiffrement côté application avant stockage
- Variables d'environnement pour les clés les plus sensibles

---

## Prochaines étapes

- [ ] Implémenter les webhooks pour la vérification serveur
- [ ] Ajouter des notifications pour les transactions
- [ ] Créer un dashboard de statistiques
- [ ] Implémenter les remboursements
- [ ] Ajouter d'autres agrégateurs (Wave, Orange Money, etc.)
- [ ] Mettre en place un système de reconciliation comptable

---

**Date de création** : 2026-01-04
**Dernière mise à jour** : 2026-01-04
**Version** : 1.0.0
