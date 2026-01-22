# Système de Gestion des Menus

Système complet de gestion des menus pour la sandwicherie avec fonctionnalités CRUD, filtrage, recherche et exports.

## 📦 Architecture

Le système est composé d'un toolkit JavaScript unique :

### `menuToolkit.jsx` - Fonctionnalités Complètes
- ✅ CRUD complet (Create, Read, Update, Delete)
- ✅ Gestion des images via Supabase Storage
- ✅ Filtrage par type et statut
- ✅ Recherche full-text (nom, description, ingrédients)
- ✅ Export CSV/JSON
- ✅ Validation client-side
- ✅ Gestion des permissions par rôle
- ✅ Statistiques utilitaires

## 🗄️ Scripts SQL (à exécuter dans l'ordre)

### 1. Table de base
```bash
# Table principale avec types ENUM et triggers
sql/create_menus_table.sql

# Politiques RLS (lecture publique, écriture admins/superviseurs)
sql/create_menus_rls_policies.sql
```

### 2. Stockage des images
```bash
# Bucket Storage pour les images (5 MB max, formats: JPEG, PNG, WebP, GIF)
sql/create_menus_storage_bucket.sql
```

### 3. Realtime
```bash
# Activation Realtime pour synchronisation temps réel
sql/enable_realtime_menus.sql
```

### 4. Données de test (optionnel)
```bash
# 30+ menus exemple (sandwichs, boissons, desserts, menus complets)
sql/seed_menus_test_data.sql
```

## 🚀 Installation

### 1. Exécuter les scripts SQL dans Supabase

Connectez-vous à votre projet Supabase et exécutez les scripts SQL dans l'ordre indiqué ci-dessus.

### 2. Aucune dépendance NPM supplémentaire

Toutes les fonctionnalités utilisent des APIs natives du navigateur.

## 📖 Utilisation

### Importer le toolkit

```javascript
import * as menuToolkit from '@/utils/menuToolkit';

// ou import sélectif
import {
  createMenu,
  getMenus,
  filterMenus,
  MENU_TYPES
} from '@/utils/menuToolkit';
```

### Exemples d'utilisation

#### 1. Créer un menu

```javascript
const nouveauMenu = {
  nom: 'Sandwich Poulet Curry',
  type: menuToolkit.MENU_TYPES.SANDWICH,
  description: 'Délicieux sandwich au poulet mariné au curry avec légumes croquants',
  ingredients: ['Pain complet', 'Poulet curry', 'Salade', 'Tomates', 'Oignons'],
  indice_calorique: {
    joule: 1674,
    calorie: 400
  },
  prix: 1600,
  statut: menuToolkit.MENU_STATUTS.DISPONIBLE
};

// Avec image
const imageFile = document.getElementById('image-upload').files[0];
const { menu, error } = await menuToolkit.createMenu(nouveauMenu, imageFile);

if (error) {
  console.error('Erreur:', error);
} else {
  console.log('Menu créé:', menu);
}
```

#### 2. Récupérer tous les menus

```javascript
// Tous les menus (tri par défaut: type puis nom)
const { menus, error } = await menuToolkit.getMenus();

// Avec options
const { menus, error } = await menuToolkit.getMenus({
  orderBy: { column: 'prix', ascending: false },
  limit: 10
});
```

#### 3. Filtrer les menus

```javascript
// Filtrer par type
const { menus } = await menuToolkit.filterMenus({
  type: menuToolkit.MENU_TYPES.SANDWICH
});

// Filtrer par statut
const { menus } = await menuToolkit.filterMenus({
  statut: menuToolkit.MENU_STATUTS.DISPONIBLE
});

// Filtrer par type ET statut
const { menus } = await menuToolkit.filterMenus({
  type: menuToolkit.MENU_TYPES.BOISSON,
  statut: menuToolkit.MENU_STATUTS.DISPONIBLE
});
```

#### 4. Rechercher des menus

```javascript
// Recherche dans nom, description et ingrédients
const { menus } = await menuToolkit.searchMenus('poulet');
```

#### 5. Mettre à jour un menu

```javascript
const updates = {
  prix: 1700,
  statut: menuToolkit.MENU_STATUTS.DISPONIBLE
};

// Sans changer l'image
const { menu, error } = await menuToolkit.updateMenu(menuId, updates);

// Avec nouvelle image
const newImageFile = document.getElementById('image-upload').files[0];
const { menu, error } = await menuToolkit.updateMenu(menuId, updates, newImageFile);
```

#### 6. Supprimer un menu

```javascript
// Supprime le menu ET son image associée
const { success, error } = await menuToolkit.deleteMenu(menuId);
```

#### 7. Upload/Suppression d'images

```javascript
// Upload manuel d'une image
const imageFile = document.getElementById('image-upload').files[0];
const { url, path, error } = await menuToolkit.uploadMenuImage(imageFile, menuId);

// Suppression manuelle d'une image
const { success, error } = await menuToolkit.deleteMenuImage(imageUrl);
```

#### 8. Exports

```javascript
// Export CSV
menuToolkit.exportMenusToCSV(menus, 'menus_janvier.csv');

// Export JSON
menuToolkit.exportMenusToJSON(menus, 'menus_janvier.json');
```

#### 9. Validation

```javascript
const menuData = {
  nom: 'Sandwich Test',
  type: 'sandwich',
  description: 'Description test',
  prix: 1500
};

const { isValid, errors } = menuToolkit.validateMenu(menuData);

if (!isValid) {
  console.error('Erreurs de validation:', errors);
}
```

#### 10. Vérification des permissions

```javascript
const userRole = 'superviseur';

const canCreate = menuToolkit.canManageMenus(userRole, 'create'); // true
const canUpdate = menuToolkit.canManageMenus(userRole, 'update'); // true
const canDelete = menuToolkit.canManageMenus(userRole, 'delete'); // false (admins uniquement)
```

#### 11. Statistiques

```javascript
const stats = menuToolkit.getMenusStats(menus);

console.log('Total:', stats.total);
console.log('Disponibles:', stats.disponibles);
console.log('Sandwichs:', stats.par_type[menuToolkit.MENU_TYPES.SANDWICH]);
console.log('Prix moyen:', stats.prix_moyen);
```

## 🔐 Permissions

### Politiques RLS configurées

- **SELECT (Lecture)**: Public (tous, même non-authentifiés)
- **INSERT (Création)**: Admins et Superviseurs uniquement
- **UPDATE (Modification)**: Admins et Superviseurs uniquement
- **DELETE (Suppression)**: Admins uniquement

### Storage (Images)

- **Lecture**: Public (accès direct aux images)
- **Upload/Modification/Suppression**: Admins et Superviseurs uniquement

## 📊 Structure des Données

### Menu

```typescript
{
  id: UUID,
  nom: string,
  type: 'boisson' | 'sandwich' | 'dessert' | 'menu complet',
  description: string,
  ingredients: string[], // tableau de chaînes
  indice_calorique: {
    joule: number,
    calorie: number
  },
  prix: number, // en FCFA, défaut 0.0
  statut: 'disponible' | 'indisponible', // auto 'indisponible' si prix = 0
  image_url: string | null, // URL Supabase Storage
  created_at: Timestamp,
  updated_at: Timestamp // auto-update via trigger
}
```

## 🎨 Constantes Disponibles

```javascript
// Types de menus
MENU_TYPES = {
  BOISSON: 'boisson',
  SANDWICH: 'sandwich',
  DESSERT: 'dessert',
  MENU_COMPLET: 'menu complet'
}

// Statuts
MENU_STATUTS = {
  DISPONIBLE: 'disponible',
  INDISPONIBLE: 'indisponible'
}

// Labels (pour affichage)
MENU_TYPE_LABELS = {
  'boisson': 'Boisson',
  'sandwich': 'Sandwich',
  'dessert': 'Dessert',
  'menu complet': 'Menu Complet'
}

MENU_STATUT_LABELS = {
  'disponible': 'Disponible',
  'indisponible': 'Indisponible'
}

// Configuration Storage
MENU_IMAGES_BUCKET = 'menu-images'
MAX_IMAGE_SIZE = 5242880 // 5 MB
ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
]
```

## 🔧 Configuration Requise

### Supabase
- PostgreSQL 14+
- Row Level Security (RLS) configuré
- Realtime activé
- Storage bucket "menu-images" créé

### Navigateur
- Support des APIs natives (Blob, File, URLSearchParams)
- IndexedDB n'est PAS requis (contrairement aux commandes)

## ⚡ Fonctionnalités Automatiques

### Triggers PostgreSQL

1. **Auto-update `updated_at`** : Mise à jour automatique du timestamp lors de modifications
2. **Auto-statut** : Si `prix = 0`, le statut passe automatiquement à `'indisponible'`

### Gestion des Images

- Upload avec noms uniques (timestamp + random string)
- Suppression automatique lors de la suppression d'un menu
- Remplacement automatique lors de l'update avec nouvelle image
- Nettoyage en cas d'erreur (rollback de l'upload)

## 📝 Validation

### Règles de validation client

- **nom** : Obligatoire, non vide
- **type** : Obligatoire, doit être dans `MENU_TYPES`
- **description** : Obligatoire, non vide
- **prix** : Doit être un nombre ≥ 0
- **statut** : Doit être dans `MENU_STATUTS` (si fourni)
- **ingredients** : Doit être un tableau (si fourni)
- **indice_calorique** : Doit contenir `joule` et `calorie` (nombres)

## 🐛 Débogage

Tous les toolkits incluent des logs de débogage dans la console :

```javascript
console.group("📤 uploadMenuImage");
console.log("Fichier:", file.name, file.type, file.size);
// ...
console.groupEnd();
```

## 💡 Bonnes Pratiques

### 1. Toujours valider avant de créer

```javascript
const { isValid, errors } = menuToolkit.validateMenu(menuData);
if (!isValid) {
  // Afficher les erreurs à l'utilisateur
  return;
}
await menuToolkit.createMenu(menuData, imageFile);
```

### 2. Vérifier les permissions

```javascript
if (!menuToolkit.canManageMenus(userRole, 'create')) {
  console.error('Permissions insuffisantes');
  return;
}
```

### 3. Gérer les erreurs

```javascript
const { menu, error } = await menuToolkit.createMenu(menuData, imageFile);
if (error) {
  console.error('Erreur lors de la création:', error.message);
  // Afficher un message d'erreur à l'utilisateur
}
```

### 4. Optimiser les images avant upload

```javascript
// Compresser l'image si > 5 MB
if (imageFile.size > menuToolkit.MAX_IMAGE_SIZE) {
  // Utiliser une bibliothèque de compression (ex: browser-image-compression)
  imageFile = await compressImage(imageFile);
}
```

## 🚦 Étapes Suivantes

1. ✅ Exécuter tous les scripts SQL dans Supabase
2. ⏳ Tester les fonctionnalités CRUD dans l'application
3. ⏳ Ajouter des pages/composants UI pour la gestion des menus
4. ⏳ Implémenter l'upload d'images dans l'interface
5. ⏳ Tester les exports CSV/JSON

## 📚 API Complète

### CRUD

- `createMenu(menuData, imageFile?)` → `{menu, error}`
- `getMenus(options?)` → `{menus, error}`
- `getMenuById(menuId)` → `{menu, error}`
- `updateMenu(menuId, updates, newImageFile?)` → `{menu, error}`
- `deleteMenu(menuId)` → `{success, error}`

### Images

- `uploadMenuImage(file, menuId?)` → `{url, path, error}`
- `deleteMenuImage(imageUrl)` → `{success, error}`

### Filtrage & Recherche

- `filterMenus(filters)` → `{menus, error}`
- `searchMenus(searchTerm)` → `{menus, error}`

### Exports

- `exportMenusToCSV(menus, filename?)`
- `exportMenusToJSON(menus, filename?)`

### Validation & Permissions

- `validateMenu(menuData)` → `{isValid, errors}`
- `canManageMenus(userRole, action)` → `boolean`

### Statistiques

- `getMenusStats(menus)` → `{total, disponibles, indisponibles, par_type, prix_moyen}`

## 🔗 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Supabase Storage](https://supabase.com/docs/guides/storage)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/)
