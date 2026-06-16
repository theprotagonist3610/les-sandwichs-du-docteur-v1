# MIGRATION.md — v1 → v2

Référence de migration depuis `les-sandwichs-du-docteur-v1`.

---

## Ce qui a été fait (scaffold automatique)

- [x] `package.json` — framer-motion et motion supprimés, gsap + @gsap/react ajoutés
- [x] `vite.config.js` — identique à v1 + chunk GSAP dans manualChunks
- [x] `eslint.config.js` — identique à v1
- [x] `index.html` — point d'entrée sur `src/app/main.jsx`
- [x] `.gitignore`, `.env.example`, `jsconfig.json`, `components.json`
- [x] `src/index.css` — palette corporate intégrale copiée depuis v1
- [x] `src/lib/utils.ts` — fonction `cn()` (shadcn compat)
- [x] `src/lib/supabase.js` — client Supabase
- [x] `src/lib/firebase.js` — client Firebase
- [x] `src/lib/animations.js` — GSAP centralisé (tous les patterns v1 migrés)
- [x] `src/app/App.jsx` — skeleton câblé (imports à résoudre lors de la migration)
- [x] `src/app/main.jsx`
- [x] `src/shared/hooks/useGSAP.js` — re-export @gsap/react
- [x] `src/shared/hooks/useBreakpoint.jsx` — copie v1 (hook identique)
- [x] Structure de dossiers complète (72 répertoires)
- [x] `CLAUDE.md`
- [x] Git initialisé, branche `v2`

---

## Animations migrées — Framer Motion → GSAP

Tous les patterns ont un équivalent dans `src/lib/animations.js`.

| Composant v1 | Pattern Framer Motion | Équivalent GSAP |
|---|---|---|
| `CookiesAgreement` | Overlay `fadeIn` + bannière `springSlideUp` + `AnimatePresence` | `fadeIn()` + `springSlideUp()` + `exitSlideDown()` |
| `CommandeCard` (grille) | `fadeInUp` + `whileHover y:-4` + `exit y:-20` | `fadeInUp()` + `applyHoverLift()` + `exitFadeOut()` |
| `CommandeCard` (liste) | `fadeInLeft` + `exit x:20` | `fadeInLeft()` + `slideOutRight()` |
| `MenuCatalog` | `motion.div layout` + `AnimatePresence popLayout` | `captureFlip()` + `animateFlip()` |
| `MenuCard` POS (compact) | `scale 0.95→1` + `whileTap scale:0.97` | `scaleInTight()` + `applyTapPress(el, 0.97)` |
| `MenuCard` POS (desktop) | `scale 0.95→1` + `whileTap scale:0.98` | `scaleInTight()` + `applyTapPress(el, 0.98)` |
| `PaymentConfirmation` | 5 `motion.div` staggerés (delays 0→0.5) | `animateConfirmationScreen({...})` |
| `NumberTicker` | `useMotionValue` + `useSpring` + `useInView` | `countUp(el, value)` avec ScrollTrigger |
| `MenuCard` (gestion) | `fadeInUp` + `whileHover y:-4` + `exit y:-20` | `fadeInUp()` + `applyHoverLift()` + `slideOutDown()` |
| `MenuDialog` (ingrédients) | `AnimatePresence` badge `scale 0.8→1` | `scaleInSmall()` + `exitScaleOut()` |
| `MenuStats` (global) | Stagger `i*0.1` + `fadeInUp` | `staggerFadeInUp(els)` |
| `MenuStats` (par type) | Stagger `0.4 + i*0.1` + `scale 0.8→1` | `staggerScaleIn(els)` |
| `OngletCommandes` (backDay) | `AnimatePresence + motion` liste | `staggerFadeInUp()` + `exitFadeOut()` |
| `CommandeHeader` | `motion` entrée | `fadeInDown()` |
| `CartItem` | `motion` entrée | `fadeInLeft()` |
| `CartSummary` | `AnimatePresence` transitions | `fadeIn()` / `fadeOut()` |
| `DesktopGestionDesCommandes` | `AnimatePresence + motion` liste | `staggerFadeInUp()` |
| `MobileGestionDesCommandes` | `AnimatePresence + motion` liste | `staggerFadeInUp()` |
| `DesktopCommandesEnAttente` | `AnimatePresence + motion` | `fadeInUp()` |
| `MobileCommandesEnAttente` | `AnimatePresence + motion` | `fadeInUp()` |
| `DesktopPanneauDeVente` | `AnimatePresence` transitions panneaux | `fadeIn()` / `fadeOut()` |
| `MobilePanneauDeVente` | `AnimatePresence + motion` | `springSlideUp()` / `slideOutDown()` |
| `DesktopMenu` | `AnimatePresence + motion` | `staggerFadeInUp()` |
| `MobileMenu` | `AnimatePresence + motion` | `staggerFadeInUp()` |

---

## Ce qui reste à porter manuellement depuis la v1

### Priorité haute (bloquant pour le fonctionnement)

- [ ] **Routing** — `src/routes/Routes.jsx`, `vendeurRoutes.jsx`, `superviseurRoutes.jsx`
  - Adapter les imports pour pointer vers `features/[feature]/pages/`
- [ ] **Layouts** — `MainLayout.jsx` (nouveau pattern layout unique), `EmptyLayout`, `ErrorLayout`
  - `MainLayout` : refactoriser en layout unique (Option C validée)
- [ ] **Auth feature** — stores, hooks, services, composants (ProtectedRoute, PermissionGuard, etc.)
  - Source : `v1/src/store/activeUserStore.js`, `v1/src/hooks/usePermissions.js`, etc.
- [ ] **Stores globaux** — copier depuis `v1/src/store/` vers `src/store/`
  - `connectivityStore.js`, `cookieConsentStore.js`, `styleSettingsStore.js`
  - `soundSettingsStore.js`, `notificationSettingsStore.js`, `preferencesSettingsStore.js`
- [ ] **DB offline** — copier `v1/src/db/` → `src/db/`

### Priorité haute (features core)

- [ ] **commandes** — hook `useCommandeCache`, composants, pages, utils
  - Éliminer `commandeToolkit2.jsx` (doublon v1) — garder `commandeToolkit.jsx`
- [ ] **panneauDeVente** — `cartStore`, composants `cart/`, `catalog/`, `client/`, `payment/`
  - Remplacer framer-motion dans `MenuCard`, `MenuCatalog`, `CartItem`, `PaymentConfirmation`
- [ ] **menus** — composants `MenuCard`, `MenuDialog`, `MenuStats`
  - Remplacer framer-motion (animations identifiées dans CLAUDE.md)
- [ ] **shared/components/ui/** — copier les composants shadcn/ui depuis `v1/src/components/ui/`
  - `button`, `card`, `dialog`, `badge`, `input`, `select`, `tabs`, `sheet`, etc.
- [ ] **shared/components/navbars/** — `DesktopNavbar`, `MobileNavbar`
- [ ] **shared/components/animations/NumberTicker** — réécrire avec `countUp()` de GSAP

### Priorité moyenne

- [ ] **dashboard** — widgets + hooks
- [ ] **comptabilite** — composants, hooks, pages (nombreuses sous-pages)
- [ ] **distribution** — Leaflet maps, hooks
- [ ] **backDay** — `OngletCommandes` (remplacer AnimatePresence)
- [ ] **stock**, **livreurs**, **adresses**, **promotions**
- [ ] **insights** — `insightsToolkit/` (7 analyseurs + engines) → `features/insights/utils/`
- [ ] **parametres** — stores de settings + composants (RadioGroup, Toggle, VolumeSlider, etc.)

### Priorité basse

- [ ] **profil**, **utilisateurs** — pages et composants
- [ ] **outils** — pages (Emplacements, Fournisseurs, Evenements, Messagerie, etc.)
- [ ] **rapports** — CloturesView, RapportsView
- [ ] **payments** — FeeXpayButton, KKiaPayButton, PaymentTestInterface
- [ ] **productions** — ProductionForm, RecetteConfig
- [ ] **constants/** — copier depuis `v1/src/constants/`
- [ ] **schemas/** — `userSchema.js` → `features/auth/schemas/`

### Assets à copier

- [ ] `v1/public/` → `v2/public/` (icônes PWA, background images, sons)
- [ ] `v1/src/assets/` → `v2/src/assets/` (logo, images, adresse_liste.js)

---

## Dépendances à vérifier lors de la migration

| Package | Status | Note |
|---|---|---|
| `gsap` + `@gsap/react` | Installé | Remplace framer-motion |
| `framer-motion` | Supprimé | Banni en v2 |
| `motion` | Supprimé | Banni en v2 (doublon framer-motion v1) |
| `recharts` | Installé | Chunk séparé dans vite.config |
| `react-leaflet` | Installé | Vérifier compatibilité Leaflet 1.9 + React 19 |
| `kkiapay-react` | Installé | Version 0.0.7 très ancienne — surveiller |
| `xlsx` | Installé | Version 0.18.5 — vérifier licences |
| `@hiseb/confetti` | Installé | Vérifier si hook useConfetti v1 est portable |

---

## Notes d'architecture

- La duplication `src/toolkits/` + `src/utils/` de la v1 est résolue en v2 :
  `features/[feature]/services/` = Supabase calls ; `features/[feature]/utils/` = logique pure
- `commandeToolkit2.jsx` (v1) ne doit pas être migré — c'est une évolution inachevée de `commandeToolkit.jsx`
- Le `NumberTicker` v1 existe en double (`components/animations/` et `components/ui/`) — garder un seul dans `shared/components/animations/` en v2
- Le layout dual-render de v1 est éliminé : `<MobileMainLayout /><DesktopMainLayout />` → layout unique responsive
