# Guide du Système de Permissions

Ce guide explique comment utiliser le système de permissions basé sur les rôles pour contrôler l'accès aux fonctionnalités de l'application.

## Table des matières

1. [Architecture](#architecture)
2. [Hiérarchie des rôles](#hiérarchie-des-rôles)
3. [Fonctions de vérification](#fonctions-de-vérification)
4. [Utilisation](#utilisation)
5. [Exemples pratiques](#exemples-pratiques)

---

## Architecture

Le système de permissions est composé de 4 éléments principaux :

### 1. `src/utils/permissions.js`
Fonctions utilitaires pour vérifier les permissions basées sur les rôles.

### 2. `src/hooks/usePermissions.js`
Hook React personnalisé pour accéder facilement aux permissions dans les composants.

### 3. `src/components/auth/PermissionGuard.jsx`
Composant de garde pour le rendu conditionnel d'éléments UI.

### 4. `src/components/auth/WithPermission.jsx`
HOC (Higher Order Component) pour protéger des pages entières.

---

## Hiérarchie des rôles

Les rôles sont organisés du plus élevé au plus bas :

1. **Admin** (`admin`)
   - Accès complet à toutes les fonctionnalités
   - Peut créer, modifier, désactiver tous les utilisateurs
   - Peut modifier les rôles
   - Accès aux paramètres système

2. **Superviseur** (`superviseur`)
   - Peut voir tous les utilisateurs
   - Peut modifier les utilisateurs vendeurs uniquement
   - Peut réinitialiser les mots de passe des vendeurs
   - Accès à la comptabilité, statistiques, gestion du stock

3. **Vendeur** (`vendeur`)
   - Accès limité à son propre profil
   - Peut voir et modifier ses propres informations
   - Accès au dashboard et aux commandes uniquement

---

## Fonctions de vérification

### Permissions utilisateurs

#### `canViewUsers(userRole)`
Vérifie si l'utilisateur peut voir la liste des utilisateurs.
- **Admin** : ✅
- **Superviseur** : ✅
- **Vendeur** : ❌

#### `canViewUser(userRole, currentUserId, targetUserId)`
Vérifie si l'utilisateur peut voir un profil utilisateur spécifique.
- **Admin** : ✅ (tous les profils)
- **Superviseur** : ✅ (tous les profils)
- **Vendeur** : ✅ (son propre profil uniquement)

#### `canCreateUser(userRole)`
Vérifie si l'utilisateur peut créer un nouvel utilisateur.
- **Admin** : ✅
- **Superviseur** : ❌
- **Vendeur** : ❌

#### `canEditUser(userRole, currentUserId, targetUserId, targetUserRole)`
Vérifie si l'utilisateur peut modifier un profil utilisateur.
- **Admin** : ✅ (tous les profils)
- **Superviseur** : ✅ (vendeurs uniquement)
- **Vendeur** : ✅ (son propre profil uniquement)

#### `canEditUserRole(userRole, currentUserId, targetUserId)`
Vérifie si l'utilisateur peut modifier le rôle d'un autre utilisateur.
- **Admin** : ✅ (sauf son propre rôle)
- **Superviseur** : ❌
- **Vendeur** : ❌

#### `canDeactivateUser(userRole, currentUserId, targetUserId)`
Vérifie si l'utilisateur peut désactiver un compte utilisateur.
- **Admin** : ✅ (sauf son propre compte)
- **Superviseur** : ❌
- **Vendeur** : ❌

#### `canResetUserPassword(userRole, currentUserId, targetUserId, targetUserRole)`
Vérifie si l'utilisateur peut réinitialiser le mot de passe d'un autre utilisateur.
- **Admin** : ✅ (tous les utilisateurs sauf soi-même)
- **Superviseur** : ✅ (vendeurs uniquement)
- **Vendeur** : ❌

### Permissions modules

#### `canAccessAccounting(userRole)`
Accès à la section comptabilité.
- **Admin** : ✅
- **Superviseur** : ✅
- **Vendeur** : ❌

#### `canAccessAdvancedStats(userRole)`
Accès aux statistiques avancées.
- **Admin** : ✅
- **Superviseur** : ✅
- **Vendeur** : ❌

#### `canManageStock(userRole)`
Gestion du stock.
- **Admin** : ✅
- **Superviseur** : ✅
- **Vendeur** : ❌

#### `canAccessSettings(userRole)`
Accès aux paramètres système.
- **Admin** : ✅
- **Superviseur** : ❌
- **Vendeur** : ❌

---

## Utilisation

### 1. Utilisation avec le Hook `usePermissions`

Le moyen le plus simple d'utiliser les permissions dans un composant :

```jsx
import usePermissions from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";

const MyComponent = () => {
  const { canCreateUser, checkCanEditUser } = usePermissions();

  return (
    <div>
      {/* Afficher un bouton uniquement pour ceux qui peuvent créer */}
      {canCreateUser && (
        <Button onClick={handleCreate}>Créer un utilisateur</Button>
      )}

      {/* Vérifier avec un ID cible */}
      {checkCanEditUser(targetUserId) && (
        <Button onClick={handleEdit}>Modifier</Button>
      )}
    </div>
  );
};
```

### 2. Utilisation avec `PermissionGuard`

Pour le rendu conditionnel d'éléments UI :

```jsx
import PermissionGuard from "@/components/auth/PermissionGuard";
import { canCreateUser } from "@/utils/permissions";
import { Button } from "@/components/ui/button";

const MyComponent = () => {
  return (
    <div>
      <PermissionGuard permissionCheck={(userRole) => canCreateUser(userRole)}>
        <Button>Créer un utilisateur</Button>
      </PermissionGuard>

      {/* Avec un fallback */}
      <PermissionGuard
        permissionCheck={(userRole, userId) => canEditUser(userRole, userId, targetId)}
        fallback={<p className="text-muted-foreground">Accès refusé</p>}
      >
        <EditUserForm />
      </PermissionGuard>
    </div>
  );
};
```

### 3. Utilisation avec `WithPermission` HOC

Pour protéger des pages entières :

```jsx
import WithPermission from "@/components/auth/WithPermission";
import { canViewUsers } from "@/utils/permissions";

const UsersPage = () => {
  return (
    <div>
      <h1>Liste des utilisateurs</h1>
      {/* Contenu de la page */}
    </div>
  );
};

// Protéger la page - rediriger vers "/" si pas la permission
export default WithPermission(
  UsersPage,
  (userRole) => canViewUsers(userRole),
  "/"
);
```

### 4. Utilisation directe des fonctions

Dans les fonctions ou les gestionnaires d'événements :

```jsx
import useActiveUserStore from "@/store/activeUserStore";
import { canEditUser } from "@/utils/permissions";
import { toast } from "sonner";

const handleEdit = (targetUserId, targetUserRole) => {
  const { user } = useActiveUserStore.getState();

  if (!canEditUser(user.role, user.id, targetUserId, targetUserRole)) {
    toast.error("Permission refusée", {
      description: "Vous n'avez pas la permission de modifier cet utilisateur",
    });
    return;
  }

  // Continuer avec l'édition
  // ...
};
```

---

## Exemples pratiques

### Exemple 1 : Page de gestion des utilisateurs (Admin uniquement)

```jsx
import WithPermission from "@/components/auth/WithPermission";
import PermissionGuard from "@/components/auth/PermissionGuard";
import usePermissions from "@/hooks/usePermissions";
import { canViewUsers, canCreateUser } from "@/utils/permissions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const UsersManagementPage = () => {
  const { canCreateUser: hasCreatePermission } = usePermissions();

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>

        {/* Bouton créer visible uniquement pour les admins */}
        {hasCreatePermission && (
          <Button onClick={handleCreateUser}>
            <Plus className="w-4 h-4 mr-2" />
            Créer un utilisateur
          </Button>
        )}
      </div>

      {/* Liste des utilisateurs */}
      <UsersList />
    </div>
  );
};

// Protéger la page - accessible uniquement aux superviseurs et admins
export default WithPermission(
  UsersManagementPage,
  (userRole) => canViewUsers(userRole),
  "/"
);
```

### Exemple 2 : Actions conditionnelles dans une liste

```jsx
import usePermissions from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Key } from "lucide-react";

const UserRow = ({ user }) => {
  const {
    checkCanEditUser,
    checkCanDeactivateUser,
    checkCanResetUserPassword,
  } = usePermissions();

  const canEdit = checkCanEditUser(user.id, user.role);
  const canDeactivate = checkCanDeactivateUser(user.id);
  const canResetPassword = checkCanResetUserPassword(user.id, user.role);

  return (
    <tr>
      <td>{user.nom}</td>
      <td>{user.prenoms}</td>
      <td>{user.email}</td>
      <td>{user.role}</td>
      <td className="flex gap-2">
        {/* Bouton éditer */}
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
            <Edit className="w-4 h-4" />
          </Button>
        )}

        {/* Bouton réinitialiser mot de passe */}
        {canResetPassword && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleResetPassword(user)}
          >
            <Key className="w-4 h-4" />
          </Button>
        )}

        {/* Bouton désactiver */}
        {canDeactivate && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDeactivate(user)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </td>
    </tr>
  );
};

export default UserRow;
```

### Exemple 3 : Formulaire d'édition avec champs conditionnels

```jsx
import usePermissions from "@/hooks/usePermissions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";

const EditUserForm = ({ targetUser }) => {
  const { checkCanEditUserRole } = usePermissions();

  const canEditRole = checkCanEditUserRole(targetUser.id);

  return (
    <form>
      <div>
        <Label>Nom</Label>
        <Input name="nom" defaultValue={targetUser.nom} />
      </div>

      <div>
        <Label>Prénoms</Label>
        <Input name="prenoms" defaultValue={targetUser.prenoms} />
      </div>

      {/* Champ rôle visible uniquement pour ceux qui peuvent le modifier */}
      {canEditRole && (
        <div>
          <Label>Rôle</Label>
          <Select defaultValue={targetUser.role}>
            <SelectItem value="admin">Administrateur</SelectItem>
            <SelectItem value="superviseur">Superviseur</SelectItem>
            <SelectItem value="vendeur">Vendeur</SelectItem>
          </Select>
        </div>
      )}

      <Button type="submit">Enregistrer</Button>
    </form>
  );
};

export default EditUserForm;
```

### Exemple 4 : Navigation conditionnelle

```jsx
import usePermissions from "@/hooks/usePermissions";
import { Link } from "react-router-dom";
import { Users, Settings, DollarSign, BarChart } from "lucide-react";

const NavigationMenu = () => {
  const {
    canViewUsers,
    canAccessAccounting,
    canAccessAdvancedStats,
    canAccessSettings,
  } = usePermissions();

  return (
    <nav>
      {/* Tous les utilisateurs voient le dashboard */}
      <Link to="/">
        <BarChart className="w-5 h-5" />
        Dashboard
      </Link>

      {/* Superviseurs et admins uniquement */}
      {canViewUsers && (
        <Link to="/utilisateurs">
          <Users className="w-5 h-5" />
          Utilisateurs
        </Link>
      )}

      {/* Superviseurs et admins uniquement */}
      {canAccessAccounting && (
        <Link to="/comptabilite">
          <DollarSign className="w-5 h-5" />
          Comptabilité
        </Link>
      )}

      {/* Admins uniquement */}
      {canAccessSettings && (
        <Link to="/parametres">
          <Settings className="w-5 h-5" />
          Paramètres
        </Link>
      )}
    </nav>
  );
};

export default NavigationMenu;
```

---

## Bonnes pratiques

### 1. Toujours vérifier côté serveur
Les permissions côté client sont pour l'UX uniquement. **Les vérifications critiques doivent toujours être faites côté serveur** (RLS Supabase).

### 2. Utiliser le hook dans les composants
Préférez `usePermissions()` pour une meilleure lisibilité et performance :

```jsx
// ✅ BIEN
const { canCreateUser } = usePermissions();

// ❌ MOINS BIEN (mais fonctionnel)
import { canCreateUser } from "@/utils/permissions";
const { user } = useActiveUserStore();
const hasPermission = canCreateUser(user.role);
```

### 3. Combiner avec les toasts pour le feedback
```jsx
const handleAction = () => {
  if (!checkCanEditUser(userId)) {
    toast.error("Permission refusée");
    return;
  }
  // Continuer
};
```

### 4. Protéger les routes sensibles
Utilisez toujours `WithPermission` pour les pages entières :

```jsx
export default WithPermission(
  AdminPage,
  (userRole) => isAdmin(userRole),
  "/"
);
```

---

## Résumé

| Outil | Usage | Exemple |
|-------|-------|---------|
| `usePermissions()` | Dans les composants React | `const { canCreateUser } = usePermissions();` |
| `PermissionGuard` | Rendu conditionnel d'éléments | `<PermissionGuard permissionCheck={...}>...</PermissionGuard>` |
| `WithPermission` | Protection de pages entières | `export default WithPermission(Page, check, "/")` |
| Fonctions directes | Dans handlers/utils | `canEditUser(role, userId, targetId)` |

Le système de permissions est maintenant prêt à être utilisé dans toute l'application ! 🎉
