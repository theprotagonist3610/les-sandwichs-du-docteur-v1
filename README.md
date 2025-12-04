# 🥪 Les Sandwichs du Docteur v1

PWA de gestion pour sandwicherie axée sur l'alimentation saine et la prévention santé. Conçue par un médecin généraliste pour allier plaisir gustatif et bien-être au quotidien.

## 📋 Description

Application web progressive (PWA) permettant de superviser l'ensemble de l'activité d'une sandwicherie healthy. Interface responsive optimisée pour desktop et mobile, installable sur tous les appareils.

## ✨ Fonctionnalités

- **Dashboard** : vue d'ensemble de l'activité en temps réel
- **Commandes** : gestion et suivi des commandes clients
- **Stock** : inventaire et alertes de réapprovisionnement
- **Statistiques** : analyses et indicateurs de performance
- **Comptabilité** : suivi financier et rapports

## 👥 Rôles et accès

| Rôle | Niveau | Routes accessibles |
|------|--------|-------------------|
| Admin | Admin | Dashboard, Commandes, Stock, Statistiques, Comptabilité |
| Superviseur | User | Dashboard, Commandes, Stock, Statistiques, Comptabilité |
| Vendeur | User | Dashboard, Commandes |

> Les comptes Admin sont créés manuellement côté backend.

## 🛠️ Tech Stack

| Technologie | Usage |
|-------------|-------|
| [Vite.js](https://vitejs.dev/) | Build tool et dev server |
| [React Router](https://reactrouter.com/) | Routing SPA |
| [Tailwind CSS](https://tailwindcss.com/) | Styling utility-first |
| [Framer Motion](https://www.framer.com/motion/) | Animations |
| [Lucide React](https://lucide.dev/) | Icônes |
| [Supabase](https://supabase.com/) | Base de données PostgreSQL |
| [Firebase](https://firebase.google.com/) | Notifications push |

## 📱 Vues supportées

- **Desktop** : interface complète avec sidebar navigation
- **Mobile** : interface adaptée avec bottom navigation

## 🚀 Installation

```bash
# Cloner le repository
git clone https://github.com/theprotagonist3610/les-sandwichs-du-docteur-v1.git

# Accéder au dossier
cd les-sandwichs-du-docteur-v1

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
```

### Variables d'environnement

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Firebase
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

## 💻 Développement

```bash
# Lancer le serveur de développement
npm run dev

# Build de production
npm run build

# Prévisualiser le build
npm run preview
```

## 📁 Structure du projet

```
src/
├── assets/          # Images et fichiers statiques
├── components/      # Composants réutilisables
├── layouts/         # Layouts Desktop et Mobile
├── pages/           # Pages de l'application
│   ├── Dashboard/
│   ├── Commandes/
│   ├── Stock/
│   ├── Statistiques/
│   └── Comptabilite/
├── hooks/           # Custom hooks
├── routes/          # Custom routes
├── services/        # Services API (Supabase, Firebase)
├── stores/          # State management
├── utils/           # Fonctions utilitaires
└── App.jsx
```

## 📄 Licence

MIT © Les Sandwichs du Docteur

---

*Manger sain, c'est prendre soin de soi.* 🩺
