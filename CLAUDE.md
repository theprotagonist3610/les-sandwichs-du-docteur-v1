# CLAUDE.md — Les Sandwichs du Docteur v2

Ce fichier est lu par Claude Code à chaque session. Il contient tout le nécessaire pour
travailler dans ce projet sans re-scanner le code.

## CONSIGNE DE SESSION

**Au début de chaque session, lire `TODO.md` en priorité absolue avant toute autre action.**

**Avant d'écrire ou de migrer un composant, consulter `composants.refactoring.md`.**

Si le composant y est décrit, appliquer exactement les directives de refactoring (shadcn, tokens, animation, UX rules) avant de coder. Ne pas écrire une seule ligne du composant sans avoir lu sa fiche. Si le composant n'y figure pas, appliquer les patterns transversaux du tableau récapitulatif en fin de fichier.

`TODO.md` est la source de vérité sur l'état de la migration. Il indique :
- ce qui est déjà fait (`[x]`) vs ce qui reste à faire (`[ ]`)
- l'ordre de priorité (sections 1 → 9)
- les points d'attention spécifiques (`[!]`) par composant

Ne jamais re-scanner le code de v1 ni relire MIGRATION.md pour savoir où en est la migration :
tout est synthétisé dans TODO.md. Commencer par la première tâche non cochée dans la
section de plus haute priorité.

## SKILLS DISPONIBLES

Les skills suivants sont installés localement dans `.claude/skills/` :

| Skill | Trigger | Usage |
|---|---|---|
| **ui-ux-pro-max** | `/ui-ux-pro-max` | Design intelligence : styles, couleurs, typographies, règles UX/a11y |
| **graphify** | `/graphify` | Transformation de tout input en knowledge graph |

### ui-ux-pro-max — génération de design system

```bash
python ".claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --design-system
python ".claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --domain <style|color|typography|ux|chart|react|web|google-fonts>
python ".claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --stack <react|nextjs|shadcn|svelte|vue>
```

Invoquer **systématiquement** `/ui-ux-pro-max` avant de créer ou modifier un composant visuel.

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

### Décision ADR — pages Desktop/Mobile

**La v1 avait `DesktopXxx.jsx` + `MobileXxx.jsx` pour chaque page. En v2 : un seul fichier.**

```jsx
// ✅ v2 — fichier unique avec sections Tailwind responsive
export default function GestionDesCommandes() {
  return (
    <div>
      <div className="lg:hidden"> {/* Mobile */} </div>
      <div className="hidden lg:block"> {/* Desktop */} </div>
    </div>
  );
}
```

- `useBreakpoint()` uniquement si la **logique** (données, hooks, callbacks) diffère selon l'écran — pas pour le layout seul.
- Si les deux variantes sont vraiment trop différentes (>80% de JSX distinct), accepter deux sous-composants internes `<MobileView />` et `<DesktopView />` dans le **même fichier**. Jamais deux fichiers séparés.

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

**Boilerplate store avec persist :**
```js
import { create } from "zustand";
import { persist } from "zustand/middleware";

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((s) => ({ items: [...s.items, item] })),
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: "cart" } // clé localStorage
  )
);
export default useCartStore;
```

**Store sans persist (état éphémère) :**
```js
const useCommandeRefreshStore = create((set) => ({
  refreshKey: 0,
  trigger: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
```

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
| Pages (v2) | PascalCase unique | `GestionDesCommandes.jsx` (pas Desktop/Mobile séparés) |

### Couleurs Tailwind — tokens corporate

`@theme inline` est configuré dans `index.css` → utiliser **uniquement les classes sémantiques** :

| Classe | Usage |
|---|---|
| `bg-primary` / `text-primary-foreground` | Boutons principaux, brand rouge |
| `bg-secondary` / `text-secondary-foreground` | Fonds cream, zones secondaires |
| `bg-accent` / `text-accent-foreground` | Highlights miel, badges |
| `bg-card` / `text-card-foreground` | Cartes, panneaux |
| `text-foreground` | Texte principal |
| `text-muted-foreground` | Texte secondaire, labels |
| `bg-muted` | Fonds neutres |
| `border-border` | Bordures standard |
| `bg-destructive` / `text-destructive-foreground` | Erreurs, actions destructives |

**Jamais** : `text-[#a41624]`, `bg-[var(--primary)]`, valeurs hex directes dans les composants.

### Pattern service Supabase

```js
// features/commandes/services/commandeService.js
import { supabase } from "@/lib/supabase";

export async function getCommandes(pointDeVenteId) {
  const { data, error } = await supabase
    .from("commandes")
    .select("*, menus(*)")
    .eq("point_de_vente_id", pointDeVenteId)
    .order("created_at", { ascending: false });
  if (error) throw error;  // toujours throw, jamais retourner { data, error }
  return data;
}
```

Le hook appelant wrape dans `try/catch` et gère l'état d'erreur localement.

### Rythme de commit git

Committer après chaque section TODO cochée en entier (section 1.x, 2.x, 3.x…), pas après chaque fichier.
Message format : `feat(feature): migrer [nom de la section]` — ex: `feat(commandes): migrer composants et hooks`.

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

## Philosophie de code

**Principe fondamental : conserver toutes les fonctionnalités, simplifier le code.**

Lors de la migration et de tout développement en v2, appliquer ces règles dans cet ordre de priorité :

1. **Fonctionnalité d'abord** — aucune feature existante en v1 ne doit être perdue ou dégradée. En cas de doute entre simplification et fonctionnalité, garder la fonctionnalité.
2. **Lisibilité** — un développeur qui lit le code pour la première fois doit comprendre ce qu'il fait sans commentaires. Préférer des noms explicites à des commentaires explicatifs.
3. **Maintenabilité** — éviter les abstractions prématurées. Trois lignes similaires valent mieux qu'une abstraction mal placée. Ne pas généraliser tant qu'il n'y a pas 3+ cas concrets identiques.

### Ce que cela implique concrètement

- **Supprimer le code mort** : commentaires inutiles, `console.log`, variables non utilisées, fonctions jamais appelées.
- **Pas de sur-ingénierie** : pas de HOC, context ou pattern si un hook simple suffit. Pas de fichier `index.js` barrel si la feature n'est pas encore partagée.
- **Composants ciblés** : un composant fait une chose. Si un composant dépasse ~150 lignes, chercher à le découper — mais seulement si la découpe améliore la lisibilité, pas pour respecter une règle arbitraire.
- **Hooks légers** : un hook extrait de la logique d'un composant doit avoir une responsabilité unique et un nom qui la décrit (`useCommandeRefresh`, pas `useData`).
- **Pas de duplication inutile** : si deux features ont le même helper, le placer dans `shared/utils/` — pas avant.
- **Zéro glue code** : ne pas écrire de code dont l'unique rôle est de relier d'autres bouts de code. Simplifier jusqu'au point où chaque ligne a un effet direct sur le comportement.

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
