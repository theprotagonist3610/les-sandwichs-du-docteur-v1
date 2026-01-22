# Système de Gestion des Commandes

Système complet de gestion des commandes pour la sandwicherie avec fonctionnalités avancées.

## 📦 Architecture

Le système est composé de **deux toolkits interconnectés** :

### `commandeToolkit.jsx` - Fonctionnalités de Base
- ✅ CRUD complet (Create, Read, Update, Delete)
- ✅ Gestion des paiements avec promotions
- ✅ Assignation de livreurs
- ✅ Filtrage géographique (département, commune, quartier)
- ✅ Recherche par proximité (Haversine)
- ✅ Export CSV/JSON
- ✅ Validation client-side
- ✅ Gestion des permissions par rôle
- ✅ Cache local IndexedDB (commandes du jour)
- ✅ Gestion des collisions (optimistic locking)
- ✅ Clôture de commandes et archivage journalier

### `commandeToolkit2.jsx` - Fonctionnalités Avancées
1. **Notifications Push PWA** - Notifications en temps réel
2. **Synchronisation Bidirectionnelle** - Gestion offline/online
3. **Historique des Modifications** - Audit trail complet
4. **Optimisation PostGIS** - Requêtes géographiques ultra-rapides
5. **Validation Serveur** - Validation PostgreSQL
6. **Analytics & Rapports** - Vues matérialisées
7. **Prédictions ML** - Prévision volume & délais
8. **Génération Documents** - Excel, factures (TXT/PDF)
9. **Recherche Full-Text** - Recherche avancée

## 🗄️ Scripts SQL (à exécuter dans l'ordre)

### 1. Tables de base
```bash
# Table principale
sql/create_commandes_table.sql

# Politiques RLS
sql/create_commandes_rls_policies.sql
```

### 2. Fonctionnalités avancées
```bash
# Historique
sql/create_commandes_history_table.sql
sql/create_commandes_history_trigger.sql

# Notifications
sql/create_notifications_queue_table.sql

# Synchronisation
sql/create_sync_queue_table.sql

# PostGIS
sql/enable_postgis_geographic_optimization.sql

# Validation serveur
sql/create_server_validation_functions.sql

# Analytics
sql/create_analytics_materialized_views.sql

# Realtime (IMPORTANT pour notifications et synchro temps réel)
sql/enable_realtime.sql
```

## 🚀 Installation

### 1. Exécuter les scripts SQL dans Supabase

Connectez-vous à votre projet Supabase et exécutez les scripts SQL dans l'ordre indiqué ci-dessus.

### 2. Installer les dépendances NPM

```bash
# Pour la génération Excel
npm install xlsx

# Pour la génération PDF
npm install jspdf jspdf-autotable
```

## 📖 Utilisation

### Importer les toolkits

```javascript
import * as commandeToolkit from '@/utils/commandeToolkit';
import * as commandeToolkit2 from '@/utils/commandeToolkit2';
```

### Exemples d'utilisation

#### 1. Créer une commande

```javascript
const nouvelleCommande = {
  type: 'livraison',
  client: 'Jean Dupont',
  contact_client: '+229 97 12 34 56',
  lieu_livraison: {
    quartier: 'Akpakpa',
    commune: 'Cotonou',
    departement: 'Littoral',
    localisation: { lat: 6.3654, lng: 2.4183 }
  },
  details_commandes: [
    { item: 'Sandwich Poulet', quantite: 2, prix_unitaire: 1500 }
  ],
  details_paiement: {
    total: 3000,
    total_apres_reduction: 3000,
    momo: 0,
    cash: 0,
    autre: 0
  },
  vendeur: userId,
  statut_commande: 'en_cours',
  statut_livraison: 'en_attente',
  statut_paiement: 'non_payee'
};

const { commande, error } = await commandeToolkit.createCommande(nouvelleCommande);
```

#### 2. Activer les notifications push

```javascript
// Demander la permission
const { granted } = await commandeToolkit2.requestNotificationPermission();

if (granted) {
  // S'abonner aux notifications
  const unsubscribe = commandeToolkit2.subscribeToNotifications(
    userId,
    (notification) => {
      console.log('Nouvelle notification:', notification);
    }
  );

  // Pour se désabonner plus tard
  // unsubscribe();
}
```

#### 3. Récupérer les commandes du jour (avec cache)

```javascript
const { commandes, fromCache } = await commandeToolkit.getCommandesDuJour();

if (fromCache) {
  console.log('Données chargées depuis le cache (mode offline)');
} else {
  console.log('Données chargées depuis Supabase');
}
```

#### 4. Mettre à jour une commande (avec détection de collision)

```javascript
const updates = {
  statut_livraison: 'en_cours',
  livreur: livreurId
};

const { commande, collision, error } = await commandeToolkit.updateCommande(
  commandeId,
  updates,
  currentVersion // Version actuelle de la commande
);

if (collision) {
  console.error('Conflit: la commande a été modifiée par un autre utilisateur');
  // Résoudre le conflit...
}
```

#### 5. Recherche géographique optimisée (PostGIS)

```javascript
// Commandes dans un rayon de 5km
const { commandes } = await commandeToolkit2.getCommandesInRadiusOptimized(
  6.3654, // latitude
  2.4183, // longitude
  5       // rayon en km
);

// Commandes les plus proches
const { commandes } = await commandeToolkit2.getNearestCommandes(
  6.3654,
  2.4183,
  10 // nombre de commandes
);
```

#### 6. Obtenir l'historique d'une commande

```javascript
const { history } = await commandeToolkit2.getCommandeHistory(commandeId);

// Comparer deux versions
const differences = commandeToolkit2.compareVersions(
  history[0].commande_data,
  history[1].commande_data
);

// Restaurer une version précédente
const { result } = await commandeToolkit2.restoreCommandeVersion(
  historyId,
  userId
);
```

#### 7. Analytics et rapports

```javascript
// Rafraîchir les vues matérialisées
await commandeToolkit2.refreshAnalyticsViews();

// Rapport complet
const { report } = await commandeToolkit2.getAnalyticsReport(
  '2026-01-01',
  '2026-01-31'
);

// Stats quotidiennes
const { stats } = await commandeToolkit2.getDailyStats();

// Top produits
const { products } = await commandeToolkit2.getTopProducts(10);

// Performance vendeurs
const { performance } = await commandeToolkit2.getVendeursPerformance();
```

#### 8. Prédictions

```javascript
// Prédire le volume de commandes
const { predictions } = await commandeToolkit2.predictOrderVolume(7); // 7 jours

// Prédire les délais de livraison
const { prediction } = await commandeToolkit2.predictDeliveryTime();
```

#### 9. Génération de documents

```javascript
// Export Excel
await commandeToolkit2.generateExcelReport(commandes, 'rapport_janvier.xlsx');

// Facture texte
commandeToolkit2.downloadInvoiceText(commande);

// Facture PDF
await commandeToolkit2.generateInvoicePDF(commande, 'facture.pdf');
```

#### 10. Recherche full-text

```javascript
// Recherche simple
const { commandes } = await commandeToolkit2.searchCommandes('Jean');

// Recherche par ID partiel
const { commandes } = await commandeToolkit2.searchCommandesById('abc123');

// Recherche avancée
const { commandes } = await commandeToolkit2.advancedSearch({
  searchTerm: 'Jean',
  type: 'livraison',
  statut_commande: 'en_cours',
  startDate: '2026-01-01',
  endDate: '2026-01-31'
});
```

## 🔄 Synchronisation Offline

Le système gère automatiquement la synchronisation offline/online :

```javascript
// Quand vous revenez en ligne
const { synced, failed, conflicts } = await commandeToolkit2.syncOfflineChanges(userId);

console.log(`${synced} modifications synchronisées`);
console.log(`${failed} échecs`);
console.log(`${conflicts} conflits détectés`);

// Résoudre un conflit
await commandeToolkit2.resolveSyncConflict(
  syncId,
  'server_wins', // ou 'client_wins', 'merge', 'manual'
  userId
);
```

## 🛡️ Validation

### Validation Client

```javascript
const { isValid, errors } = commandeToolkit.validateCommande(commandeData);

if (!isValid) {
  console.error('Erreurs de validation:', errors);
}
```

### Validation Serveur

```javascript
const { isValid, errors, warnings } = await commandeToolkit2.validateCommandeServer(commandeData);

if (!isValid) {
  console.error('Erreurs serveur:', errors);
}
if (warnings.length > 0) {
  console.warn('Avertissements:', warnings);
}
```

## 🔐 Permissions

```javascript
// Vérifier les permissions
const canCreate = commandeToolkit.canManageCommandes(userRole, 'create');
const canModify = await commandeToolkit2.canUserModifyCommande(commandeId, userId);
```

## 📊 Structure des Données

### Commande
```typescript
{
  id: UUID,
  type: 'livraison' | 'sur-place',
  client: string,
  contact_client?: string,
  contact_alternatif?: string,
  lieu_livraison?: {
    quartier: string,
    arrondissement: string,
    commune: string,
    departement: string,
    localisation: { lat: number, lng: number }
  },
  instructions_livraison?: string,
  livreur?: UUID,
  date_livraison?: Date,
  heure_livraison?: Time,
  frais_livraison: number,
  statut_livraison: 'en_attente' | 'en_cours' | 'livree' | 'annulee',
  statut_paiement: 'non_payee' | 'partiellement_payee' | 'payee',
  statut_commande: 'en_cours' | 'terminee' | 'annulee',
  details_commandes: Array<{
    item: string,
    quantite: number,
    prix_unitaire: number
  }>,
  promotion?: {
    code: string,
    type: 'pourcentage' | 'montant',
    valeur: number,
    montant_reduction: number
  },
  details_paiement: {
    total: number,
    total_apres_reduction: number,
    momo: number,
    cash: number,
    autre: number
  },
  vendeur?: UUID,
  version: number, // Pour optimistic locking
  created_at: Timestamp,
  updated_at: Timestamp
}
```

## 🔧 Configuration Requise

### Supabase
- PostgreSQL 14+
- Extension PostGIS activée
- Row Level Security (RLS) configuré
- Realtime activé pour les notifications

### Navigateur
- Support des Notifications Web API
- Support d'IndexedDB
- Support de Service Workers (PWA)

## ⚡ Performances

- **Cache IndexedDB** : Accès instantané aux commandes du jour
- **PostGIS** : Requêtes géographiques 10-100x plus rapides
- **Vues matérialisées** : Analytics précalculées
- **Optimistic locking** : Gestion efficace des conflits

## 🐛 Débogage

Tous les toolkits incluent des logs de débogage dans la console :

```javascript
console.group("🗺️ getCommandesInRadius");
console.log("Paramètres:", { lat, lng, radius });
console.log("Résultats:", commandes);
console.groupEnd();
```

## 📝 Notes

- Les dépendances `xlsx`, `jspdf` et `jspdf-autotable` sont importées dynamiquement pour réduire la taille du bundle
- Le système fonctionne entièrement offline grâce au cache IndexedDB
- Les notifications push nécessitent le consentement de l'utilisateur
- Les vues matérialisées doivent être rafraîchies périodiquement (recommandé : quotidiennement)

## 🚦 Prochaines Étapes

1. ✅ Exécuter tous les scripts SQL dans Supabase
2. ⏳ Tester les fonctionnalités avec des données réelles
3. ⏳ Configurer les permissions RLS selon vos besoins
4. ⏳ Ajuster les prédictions ML selon vos données
5. ⏳ Personnaliser les factures PDF avec votre logo
