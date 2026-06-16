# CLAUDE.md — Les Sandwichs du Docteur v2

Ce fichier est lu par Claude Code à chaque session. Il contient tout le nécessaire pour
travailler dans ce projet sans re-scanner le code.

---

## Présentation du projet

PWA de gestion pour sandwicherie axée sur l'alimentation saine et la prévention santé.
L'application permet de superviser l'intégralité de l'activité : commandes, stock,
comptabilité, distribution, insights, et gestion des équipes.

- **Public cible** : équipe interne (vendeurs, superviseurs, admins)
- **Langue** : français (interface + nommage métier)
- **Version précédente** : `../les-sandwichs-du-docteur-v1` — NE PAS MODIFIER

---

## Stack technique

| Outil | Version | Rôle |
|---|---|---|
| React | 19.2 | Framework UI |
| Vite | 7.2 | Build + dev server |
| Tailwind CSS | v4 (via @tailwindcss/vite) | Styles |
| React Router DOM | 7.10 | Routing |
| Zustand | 5.0 | State management |
| **GSAP** | 3.12 | **Animations (unique autorisé)** |
| **@gsap/react** | 2.1 | Hook useGSAP |
| shadcn/ui (Radix UI) | — | Composants UI de base |
| Supabase | 2.87 | Base de données + auth |
| Firebase | 12.6 | Push notifications |
| idb | 8.0 | IndexedDB (mode offline) |
| Recharts | 3.7 | Graphiques |
| Leaflet + react-leaflet | 1.9/5.0 | Cartes |
| jspdf + jspdf-autotable | 4.0/5.0 | Génération PDF |
| KKiapay | 0.0.7 | Paiement mobile |
| Zod | 4.1 | Validation de schémas |
| date-fns | 4.1 | Manipulation de dates |
| Lucide React | 0.555 | Icônes |
| Sonner | 2.0 | Notifications toast |
| vite-plugin-pwa + Workbox | 1.2 | PWA + Service Worker |
| libphonenumber-js | 1.12 | Validation téléphone |

---

## Architecture

Architecture **hybride feature + shared** :

```
src/
├── app/               # App.jsx, main.jsx
├── routes/            # Routes.jsx, vendeurRoutes.jsx, superviseurRoutes.jsx
├── layouts/           # MainLayout (layout unique responsive), EmptyLayout, ErrorLayout
├── features/          # Un dossier par domaine métier (colocalisé)
│   ├── auth/          components/ hooks/ services/ store/ schemas/
│   ├── commandes/     components/ hooks/ services/ store/ utils/ pages/
│   ├── panneauDeVente/ cart/ catalog/ client/ payment/ store/ hooks/
│   ├── comptabilite/  components/ hooks/ services/ pages/
│   ├── dashboard/     components/ hooks/ pages/
│   ├── distribution/  components/ hooks/ pages/
│   ├── menus/         components/ hooks/ services/ pages/
│   ├── promotions/    components/ hooks/ services/
│   ├── stock/         components/ hooks/ pages/
│   ├── livreurs/      components/ hooks/ pages/
│   ├── adresses/      components/ hooks/ services/
│   ├── insights/      components/ hooks/ utils/ pages/
│   ├── utilisateurs/  components/ hooks/ pages/
│   ├── profil/        components/ hooks/ pages/
│   ├── parametres/    components/ hooks/ pages/
│   ├── backDay/       components/ hooks/ pages/
│   └── outils/        pages/
├── shared/
│   ├── components/
│   │   ├── ui/        shadcn/ui primitives (.tsx)
│   │   ├── navbars/   DesktopNavbar, MobileNavbar
│   │   └── animations/ Composants animés réutilisables (NumberTicker, etc.)
│   ├── hooks/         useBreakpoint, useGSAP, usePWAInstall, usePWAUpdate, ...
│   └── utils/         cn(), formatters, permissions.js
├── lib/
│   ├── animations.js  ← SOURCE UNIQUE DES ANIMATIONS
│   ├── supabase.js
│   ├── firebase.js
│   └── utils.ts       cn() (compat shadcn)
├── store/             Stores globaux (connectivityStore, cookieConsentStore, styleSettingsStore, ...)
├── db/                IndexedDB (indexedDB.js, syncQueue.js, adressesDB.js)
└── constants/         Constantes métier
```

### Règle de placement
- Composant utilisé dans **1 feature** → `features/[feature]/components/`
- Composant utilisé dans **2+ features** → `shared/components/`
- Hook lié à un domaine → `features/[feature]/hooks/`
- Hook transversal → `shared/hooks/`
- Call Supabase → `features/[feature]/services/`
- Logique pure (calculs) → `features/[feature]/utils/`
- Store d'une feature → `features/[feature]/store/`
- Store global (settings, connectivity) → `store/`

---

## Gestion des animations

### RÈGLE ABSOLUE
> **GSAP est la seule bibliothèque d'animation autorisée.**
> **Framer Motion est banni. `motion` est banni.**
> **Toute animation doit passer par `src/lib/animations.js`.**

### Comment utiliser les animations

```jsx
// 1. Importer les presets depuis lib/animations
import { fadeInUp, staggerFadeInUp, applyHoverLift } from "@/lib/animations";

// 2. Importer le hook depuis shared/hooks (jamais directement depuis @gsap/react)
import { useGSAP } from "@/shared/hooks/useGSAP";

// 3. Utiliser dans le composant
const containerRef = useRef(null);

useGSAP(() => {
  fadeInUp(".ma-carte");
  staggerFadeInUp(".liste-item");
}, { scope: containerRef });
```

### Animations disponibles dans lib/animations.js

| Fonction | Remplace (Framer Motion) | Usage |
|---|---|---|
| `fadeInUp(el)` | `initial={{ opacity:0, y:20 }}` | Entrée standard |
| `fadeInDown(el)` | `initial={{ opacity:0, y:-20 }}` | Entrée depuis le haut |
| `fadeInLeft(el)` | `initial={{ opacity:0, x:-20 }}` | Entrée depuis la gauche |
| `fadeInRight(el)` | `initial={{ opacity:0, x:20 }}` | Entrée depuis la droite |
| `slideOutDown(el)` | `exit={{ y:100, opacity:0 }}` | Sortie vers le bas |
| `slideOutLeft/Right(el)` | `exit={{ x:±20 }}` | Sortie horizontale |
| `fadeOut(el)` | `exit={{ opacity:0 }}` | Fade sortie |
| `scaleIn(el)` | `initial={{ scale:0.9 }}` | Entrée avec scale |
| `scaleInTight(el)` | `initial={{ scale:0.95 }}` | Entrée scale légère (MenuCard POS) |
| `scaleInSmall(el)` | `initial={{ scale:0.8 }}` | Badges, petits éléments |
| `scaleOut(el)` | `exit={{ scale:0.8 }}` | Sortie avec scale |
| `springScaleIn(el)` | `type:"spring", stiffness:200` | Rebond (icône succès) |
| `springSlideUp(el)` | `type:"spring", damping:25` | Bannière cookies |
| `fadeIn(el)` | `initial={{ opacity:0 }}` | Fade simple |
| `applyHoverLift(el)` | `whileHover={{ y:-4 }}` | Lift au survol |
| `applyTapPress(el)` | `whileTap={{ scale:0.97 }}` | Pression tactile |
| `staggerFadeInUp(els)` | `delay: index * 0.1` | Liste en cascade |
| `staggerScaleIn(els)` | `delay: 0.4 + index * 0.1` | Grille en cascade |
| `animateConfirmationScreen({...})` | 5 motion.div staggerés | Écran confirmation commande |
| `countUp(el, value)` | `useMotionValue + useSpring` | Compteur animé (NumberTicker) |
| `captureFlip / animateFlip` | `motion.div layout` + `popLayout` | Réorganisation de grille |
| `exitSlideDown/FadeOut/ScaleOut` | `AnimatePresence` exit | Sortie conditionnelle |

### Pour les sorties conditionnelles (remplace AnimatePresence)

```jsx
import { exitSlideDown } from "@/lib/animations";
import { useGSAP } from "@/shared/hooks/useGSAP";

const { contextSafe } = useGSAP({ scope: containerRef });

const handleClose = contextSafe(() => {
  exitSlideDown(bannerRef.current, () => setVisible(false));
});
```

---

## Layout responsive

**Un seul layout** (pas de dual-render comme en v1) :

```jsx
// layouts/MainLayout.jsx
const MainLayout = () => (
  <div className="h-screen overflow-hidden flex flex-col">
    <MobileNavbar className="flex lg:hidden" />
    <DesktopNavbar className="hidden lg:flex" />
    <main className="flex-1 overflow-y-auto ...">
      <Outlet />   {/* rendu une seule fois */}
    </main>
  </div>
);
```

- Seuil breakpoint : **1024px** (via `useBreakpoint` dans `shared/hooks/`)
- Les navbars se cachent via Tailwind (`lg:hidden` / `hidden lg:flex`)
- `<Outlet />` est rendu **une seule fois** (correction v1 : double render éliminé)

---

## Routing

- Routing basé sur le rôle : `vendeur` / `superviseur` / `admin`
- `createAppRouter(role)` dans `routes/Routes.jsx`
- Routes créées avec `createBrowserRouter` de React Router DOM 7
- Alias `@/` → `./src` (configuré dans `vite.config.js` et `jsconfig.json`)

---

## State management

- **Zustand** `create` + middleware `persist` pour les stores qui survivent au rechargement
- Stores globaux (settings, connectivity, cookieConsent) → `src/store/`
- Stores de feature → `src/features/[feature]/store/`
- Pas de Context React pour l'état global

---

## Conventions de nommage

| Élément | Convention | Exemple |
|---|---|---|
| Composants | PascalCase | `CommandeCard`, `PaymentConfirmation` |
| Pages | PascalCase français | `GestionDesCommandes` |
| Hooks | `use` + PascalCase | `useCommandeCache`, `useBreakpoint` |
| Stores | `use` + PascalCase + `Store` | `useCartStore`, `useStyleSettingsStore` |
| Fichiers utils | camelCase | `commandeToolkit.js`, `dayClosureToolkit.js` |
| Dossiers features | camelCase français | `panneauDeVente/`, `backDay/` |
| Variables env | `VITE_` + UPPER_SNAKE | `VITE_SUPABASE_URL` |
| Imports | alias `@/` | `@/lib/animations`, `@/shared/hooks/useGSAP` |

---

## Commandes essentielles

```bash
npm run dev       # Serveur de développement (localhost:5173)
npm run build     # Build production
npm run preview   # Prévisualiser le build
npm run lint      # ESLint
```

---

## Variables d'environnement requises

Copier `.env.example` → `.env` et remplir :

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## Ce qui ne doit jamais être modifié

- **`../les-sandwichs-du-docteur-v1/`** — la v1 est en production, intouchable
- **`src/lib/animations.js`** — peut être étendu, jamais vidé ni bypassé
- **`src/index.css`** — palette corporate, ne pas changer les variables CSS racines

---

## Points de vigilance

1. **Framer Motion / motion** : si tu vois un import depuis `"framer-motion"` ou `"motion"`, c'est une erreur. Signaler et corriger.
2. **Import GSAP direct** : `import gsap from "gsap"` dans un composant est interdit. Passer par `@/lib/animations`.
3. **Dual render** : ne jamais recréer le pattern `<MobileLayout /><DesktopLayout />` de la v1. Un seul Outlet.
4. **toolkits vs utils** : en v2, pas de dossier `toolkits/` à la racine. Les calls Supabase vont dans `features/[feature]/services/`, la logique pure dans `features/[feature]/utils/`.
5. **Fichiers `.tsx`** : réservés aux composants `shared/components/ui/` (shadcn). Tout le reste est `.jsx` ou `.js`.

---

## Historique des décisions d'architecture (ADR)

| Date | Décision | Raison |
|---|---|---|
| 2026-06-16 | Architecture hybride feature + shared | 12+ domaines métier = feature-based ; composants partagés = shared/ |
| 2026-06-16 | `panneauDeVente` feature autonome | POS est un sous-système indépendant des commandes |
| 2026-06-16 | Layout unique responsive (Option C) | Éliminer le double render de `<Outlet />` de la v1 |
| 2026-06-16 | Remplacement Framer Motion → GSAP | Bundle plus léger, contrôle impératif adapté aux animations complexes |
| 2026-06-16 | Source unique `lib/animations.js` | Centraliser pour éviter la dispersion et faciliter la maintenance |
