# TODO — Migration v1 → v2

> **Légende** : `[ ]` à faire · `[x]` fait · `[~]` partiel · `[!]` attention particulière
>
> **Règle animation** : tout remplacement Framer Motion → GSAP passe par `@/lib/animations`.
>
> **Règle Desktop/Mobile** : les variantes `DesktopXxx.jsx` / `MobileXxx.jsx` de v1 sont **fusionnées en un seul fichier** en v2. Utiliser `lg:hidden` / `hidden lg:block` (Tailwind). `useBreakpoint()` uniquement si la logique diffère, pas juste le layout.
>
> **Règle couleurs** : utiliser uniquement les tokens Tailwind (`bg-primary`, `text-foreground`, etc.), jamais de hex direct.
>
> **Rythme de commit** : un commit par section cochée en entier. Format : `feat(feature): migrer [section]`.
>
> **Fichiers v1** : si un fichier listé n'existe pas en v1, passer au suivant sans bloquer.

---

## 0. Prérequis

- [x] Scaffold v2 initialisé (package.json, vite.config, structure)
- [x] `gsap` + `@gsap/react` installés, `framer-motion` absent
- [x] Git initialisé, branche `v2`
- [x] `CLAUDE.md` créé
- [x] Copier `.env` depuis v1 → v2 (ne jamais committer)
- [x] Vérifier que `npm run dev` démarre sans erreur (page blanche OK à ce stade)

---

## 1. Fondations — à faire avant toute feature

### 1.1 Assets

- [x] Copier `v1/public/` → `v2/public/` (icônes PWA, backgrounds, sons, screenshots)
- [x] Copier `v1/src/assets/` → `v2/src/assets/` (logo-min.png, images, adresse_liste.js)

### 1.2 Constantes & Schémas

- [x] `v1/src/constants/livreurSyncConstants.js` → `src/constants/`
- [x] `v1/src/constants/outils.js` → `src/constants/`
- [x] `v1/src/schemas/userSchema.js` → `src/features/auth/schemas/`

### 1.3 DB offline (IndexedDB)

- [x] `v1/src/db/indexedDB.js` → `src/db/`
- [x] `v1/src/db/syncQueue.js` → `src/db/`
- [x] `v1/src/db/adressesDB.js` → `src/db/`

### 1.4 Stores globaux

Copier depuis `v1/src/store/` → `src/store/` (pas de modification nécessaire) :

- [x] `connectivityStore.js`
- [x] `cookieConsentStore.js`
- [x] `styleSettingsStore.js`
- [x] `soundSettingsStore.js`
- [x] `notificationSettingsStore.js`
- [x] `preferencesSettingsStore.js`

### 1.5 Auth — feature complète

**Composants** (`v1/src/components/auth/` → `src/features/auth/components/`) :

- [x] `PermissionGuard.jsx`
- [x] `ProtectedRoute.jsx`
- [x] `PublicRoute.jsx`
- [x] `WithPermission.jsx`

**Hooks** (`v1/src/hooks/` → `src/features/auth/hooks/`) :

- [x] `usePermissions.js`
- [x] `useUserPresence.jsx`

**Services** (`v1/src/services/` → `src/features/auth/services/`) :

- [x] `authService.js`
- [x] `userApprovalService.js`
- [x] `userService.js`

**Store** (`v1/src/store/` → `src/features/auth/store/`) :

- [x] `activeUserStore.js`

### 1.6 Layouts

- [x] `src/layouts/EmptyLayout.jsx` — copie directe depuis v1
- [x] `src/layouts/ErrorLayout.jsx` — copie directe depuis v1
- [x] `src/layouts/MainLayout.jsx` — **REFACTORISER** (ne pas copier) :
  - Supprimer le dual-render `<MobileMainLayout /><DesktopMainLayout />`
  - Un seul `<Outlet />` avec navbars masquées via Tailwind :
    ```jsx
    <MobileNavbar className="flex lg:hidden" />
    <DesktopNavbar className="hidden lg:flex" />
    <main>
      <Outlet />
    </main>
    ```

### 1.7 Routing

- [x] `v1/src/routes/Routes.jsx` → `src/routes/Routes.jsx` (adapter imports features)
- [x] `v1/src/routes/vendeurRoutes.jsx` → `src/routes/` (adapter imports)
- [x] `v1/src/routes/superviseurRoutes.jsx` → `src/routes/` (adapter imports)

> **Checkpoint section 1** : `npm run dev` → page de connexion visible, pas d'erreur console.
> `git commit -m "feat(fondations): migrer auth, layouts, routing, stores globaux"`

---

## 2. Shared — composants transversaux

### 2.1 shared/components/ui (shadcn)

Copier depuis `v1/src/components/ui/` → `src/shared/components/ui/` :

- [x] `accordion.tsx`
- [x] `alert-dialog.tsx`
- [x] `alert.tsx`
- [x] `avatar.tsx`
- [x] `badge.tsx`
- [x] `button.tsx`
- [x] `calendar.tsx`
- [x] `card.tsx`
- [x] `checkbox.tsx`
- [x] `dialog.tsx`
- [x] `dropdown-menu.tsx`
- [x] `input.tsx`
- [x] `input-group.tsx`
- [x] `label.tsx`
- [x] `popover.tsx`
- [x] `progress.tsx`
- [x] `radio-group.tsx`
- [x] `scroll-area.tsx`
- [x] `select.tsx`
- [x] `separator.tsx`
- [x] `sheet.tsx`
- [x] `simple-scroll-area.jsx`
- [x] `slider.tsx`
- [x] `sonner.tsx`
- [x] `switch.tsx`
- [x] `table.tsx`
- [x] `tabs.tsx`
- [x] `textarea.tsx`
- [x] `border-beam.jsx` — réécriture GSAP (`animateBorderBeamFull` / `animateBorderBeamEdge`)
- [x] `number-ticker.jsx` — réécrit avec `countUp()` GSAP dans `src/shared/components/animations/NumberTicker.jsx`

> `v1/src/components/animations/NumberTicker.jsx` et `v1/src/components/ui/number-ticker.jsx` sont des doublons — n'en garder qu'un en v2.

### 2.2 shared/components/navbars

- [x] `v1/src/components/navbars/DesktopNavbar.jsx` → `src/shared/components/navbars/`
- [x] `v1/src/components/navbars/MobileNavbar.jsx` → `src/shared/components/navbars/`

### 2.3 shared/components/animations

- [x] `NumberTicker.jsx` — réécrire avec `countUp()` de GSAP :

  ```jsx
  import { useRef, useEffect } from "react";
  import { countUp } from "@/lib/animations";

  export default function NumberTicker({
    value,
    delay = 0,
    className = "",
    decimalPlaces = 0,
  }) {
    const ref = useRef(null);
    useEffect(() => {
      if (!ref.current) return;
      const cleanup = countUp(ref.current, value, { delay, decimalPlaces });
      return () => cleanup?.kill?.();
    }, [value, delay, decimalPlaces]);
    return (
      <span ref={ref} className={className}>
        0
      </span>
    );
  }
  ```

### 2.4 shared/hooks — restants

Copier depuis `v1/src/hooks/` → `src/shared/hooks/` :

- [x] `usePWAInstall.js`
- [x] `usePWAUpdate.js`
- [x] `useConfetti.js`
- [x] `useVibration.js`
- [x] `useAudioAutoplay.js`
- [x] `useAudioPlayer.js`
- [x] `useBorderBeam.jsx`

### 2.5 shared/utils

- [x] `v1/src/utils/permissions.js` → `src/shared/utils/permissions.js`
- [x] `v1/src/utils/notificationToolkit.jsx` → `src/shared/utils/notificationToolkit.jsx`

### 2.6 shared/components/form

- [x] `v1/src/components/form/PhoneTaker.jsx` → `src/shared/components/form/`

> **Checkpoint section 2** : composants shadcn visibles dans une page test, NumberTicker animé, navbars responsive OK.
> `git commit -m "feat(shared): migrer composants UI, navbars, hooks, utils"`

---

## 3. Features — priorité haute

### 3.1 commandes

**Composants** (`v1/src/components/commande/` → `src/features/commandes/components/`) :

- [x] `CommandeHeader.jsx` — motion → fadeInDown() GSAP
- [x] `CommandeDetailsSection.jsx`
- [x] `CommandeHistorySection.jsx`
- [x] `CommandeInfoSection.jsx`
- [x] `CommandeLivraisonSection.jsx`
- [x] `CommandePaiementSection.jsx` — bug `reduction` corrigé
- [x] `ConfirmDialog.jsx`
- [x] `AddItemModal.jsx`
- [x] `AdresseSelector.jsx`
- [x] `index.js`

**Composant partagé commandes** (`v1/src/components/commandes/`) :

- [x] `CommandeCard.jsx` → `src/features/commandes/components/` — motion → fadeInUp/fadeInLeft/applyHoverLift GSAP

**Hooks** (`v1/src/hooks/` → `src/features/commandes/hooks/`) :

- [x] `useCommandeCache.js`
- [x] `useCommandeEditor.js`
- [x] `useCommandeInsights.js`
- [x] `useCommandeNotifications.js` — stub (commandeToolkit2 non migré)
- [x] `useCommandeRefresh.js`

**Services** (`v1/src/toolkits/commandeToolkit.jsx` → `src/features/commandes/services/`) :

- [x] `commandeService.js` (schema doc — code réel dans utils/commandeToolkit.js)

**Stores** (`v1/src/store/` → `src/features/commandes/store/`) :

- [x] `commandeEditorStore.js`
- [x] `commandeRefreshStore.js`

**Utils** (`v1/src/utils/` → `src/features/commandes/utils/`) :

- [x] `commandeToolkit.js` (cache IndexedDB + CRUD Supabase + utils purs)
- [x] `commandeHistoryToolkit.js`
- [x] `backDaysToolkit.js`
- [x] `commandeToolkit2.jsx` — **NE PAS migrer** ✓

**Pages** (`v1/src/pages/commandes/` → `src/features/commandes/pages/`) :

- [x] `Commandes.jsx` (re-export GestionDesCommandes)
- [x] `GestionDesCommandes.jsx` — fusion Desktop+Mobile, framer-motion → GSAP, responsive Tailwind
- [x] `CommandesEnAttente.jsx` — fusion Desktop+Mobile, framer-motion → GSAP
- [x] `Commande.jsx` — fusion Desktop (3 colonnes) + Mobile (Tabs) dans un seul fichier

> **Checkpoint 3.1** : créer une commande test → la commande apparaît dans GestionDesCommandes, les animations GSAP jouent, pas d'import framer-motion détecté.
> `git commit -m "feat(commandes): migrer feature commandes"`

### 3.2 panneauDeVente

**Store** (`v1/src/store/` → `src/features/panneauDeVente/store/`) :

- [ ] `cartStore.js`
- [ ] `pointDeVenteStore.js`

**Hooks** (`v1/src/hooks/` → `src/features/panneauDeVente/hooks/`) :

- [x] `usePanneauDeVente.jsx`

**cart/** (`v1/src/components/panneauDeVente/cart/` → `src/features/panneauDeVente/cart/`) :

- [x] `CartItem.jsx` — motion → fadeInLeft() GSAP
- [x] `CartSummary.jsx` — AnimatePresence → fadeIn()/fadeOut() GSAP
- [x] `CartTotals.jsx`
- [x] `PromoInput.jsx`
- [x] `index.js`

**catalog/** (`v1/src/components/panneauDeVente/catalog/` → `src/features/panneauDeVente/catalog/`) :

- [x] `CategoryTabs.jsx`
- [x] `MenuCard.jsx` — motion → scaleInTight() + applyTapPress() GSAP
- [x] `MenuCatalog.jsx` — motion layout + popLayout → captureFlip()/animateFlip() GSAP
- [x] `QuantityDialog.jsx`
- [x] `SandwichPersonnaliseDialog.jsx`
- [x] `index.js`

**client/** (`v1/src/components/panneauDeVente/client/` → `src/features/panneauDeVente/client/`) :

- [x] `ClientInfo.jsx`
- [x] `OrderTypeSelector.jsx`
- [x] `index.js`

**payment/** (`v1/src/components/panneauDeVente/payment/` → `src/features/panneauDeVente/payment/`) :

- [x] `PaymentPanel.jsx`
- [x] `PaymentConfirmation.jsx` — 5 motion.div → animateConfirmationScreen() GSAP
- [x] `index.js`

**Composant sélecteur** :

- [x] `PointDeVenteSelector.jsx` → motion → springScaleIn() GSAP

**Pages** (`v1/src/pages/commandes/` → `src/features/panneauDeVente/pages/`) :

- [x] `PanneauDeVente.jsx` — fusion Desktop+Mobile responsive, framer-motion → GSAP

> **Checkpoint 3.2** : parcourir le catalog POS → `MenuCatalog` filtre avec animation Flip, `PaymentConfirmation` joue les 5 étapes, panier persisté après refresh.
> `git commit -m "feat(panneauDeVente): migrer feature POS"`

### 3.3 menus

**Composants** (`v1/src/components/menus/` → `src/features/menus/components/`) :

- [x] `MenuCard.jsx` — motion → fadeInUp() + applyHoverLift() GSAP
- [x] `MenuDialog.jsx` — AnimatePresence badges → scaleInSmall() + exitScaleOut() GSAP
- [x] `MenuStats.jsx` — stagger → staggerFadeInUp() + staggerScaleIn() GSAP

**Hooks** (`v1/src/hooks/` → `src/features/menus/hooks/`) :

- [x] `useMenus.jsx`

**Services** (`v1/src/toolkits/menuToolkit.jsx` → `src/features/menus/services/`) :

- [x] `menuService.js` (Supabase calls)

**Utils** (`v1/src/utils/menuToolkit.jsx` → `src/features/menus/utils/`) :

- [x] `menuToolkit.js` (proxy vers menuService)

**Pages** :

- [x] `Menu.jsx` — fusion Desktop+Mobile responsive, framer-motion → staggerFadeInUp() GSAP

> **Checkpoint 3.3** : liste de menus visible, filtrage avec animation stagger, dialog d'édition s'ouvre/ferme correctement.
> `git commit -m "feat(menus): migrer feature menus"`

---

## 4. Features — priorité moyenne

### 4.1 dashboard

- [x] Composants dashboard → `src/features/dashboard/components/` (11 widgets)
- [x] Hooks `useInsights.js`, `useEmplacementMetrics.jsx` → `src/features/dashboard/hooks/`
- [x] Pages Dashboard + sous-pages → `src/features/dashboard/pages/`
- [x] Utils `taskToolkit.js` → `src/features/dashboard/utils/`

### 4.2 comptabilite

- [x] Composants comptabilite + rapports → `src/features/comptabilite/components/`
- [x] Hooks → `src/features/comptabilite/hooks/`
- [x] Store → `src/features/comptabilite/store/`
- [x] Services (comptabiliteService, dayClosureService, rapportService) → `src/features/comptabilite/services/`
- [x] Utils (comptabiliteToolkit, dayClosureToolkit, rapportToolkit) → `src/features/comptabilite/utils/`
- [x] Pages Comptabilite + sous-pages + Rapports → `src/features/comptabilite/pages/`

### 4.3 distribution

- [x] Composants distribution + map → `src/features/distribution/components/`
- [x] Hooks (useDistributeurs, useDistributionMap, useTournees, useZones) → hooks/
- [x] Utils distributionToolkit → utils/
- [x] Pages Distribution → pages/

### 4.4 backDay

- [x] Composants backDay → `src/features/backDay/components/`
- [x] `OngletCommandes.jsx` — AnimatePresence supprimé, framer-motion retiré
- [x] Hook useBackDay → hooks/
- [x] Page BackDay → pages/

### 4.5 stock

- [x] Hook useStock → `src/features/stock/hooks/`
- [x] Utils stockToolkit → utils/
- [x] Pages Stock → pages/

### 4.6 livreurs

- [x] Composants livreur → `src/features/livreurs/components/`
- [x] Hooks (useLivreursLocal, useLivreursSync) → hooks/
- [x] Services (livreurService, adressesSyncService) → services/
- [x] Utils livreurToolkit → utils/
- [x] Pages Livreurs → pages/

### 4.7 adresses

- [x] Composants adresse → `src/features/adresses/components/`
- [x] Hooks (useAdressesLocal, useAdressesSync) → hooks/
- [x] Service adresseService → services/
- [x] Utils adresseToolkit → utils/
- [x] Pages Adresse → pages/

### 4.8 promotions

- [x] Composants promotions → `src/features/promotions/components/`
- [x] Hooks (usePromotionInstances, usePromotionTemplates) → hooks/
- [x] Service promotionService → services/
- [x] Utils promotionToolkit → utils/
- [x] Page Promotions → pages/

### 4.9 insights

- [x] Hooks (useFinanceInsights, useProductionInsights) → `src/features/insights/hooks/`
- [x] Utils insightsToolkit/ (arborescence complète) → utils/
- [x] Pages Insights + Statistiques → pages/

### 4.10 parametres

- [x] Composants settings → `src/features/parametres/components/`
- [x] Pages Parametres + sous-pages → `src/features/parametres/pages/`

> **Checkpoint section 4** : navigation entre dashboard, comptabilité, distribution, paramètres sans erreur console. `npm run build` passe.
> `git commit -m "feat(features): migrer features priorité moyenne"`

---

## 5. Features — priorité basse

### 5.1 profil

- [x] Composants profil → `src/features/profil/components/`
- [x] Pages Profil + sous-pages → `src/features/profil/pages/`

### 5.2 utilisateurs

- [x] Composants users → `src/features/utilisateurs/components/`
- [x] Pages Utilisateurs + sous-pages → `src/features/utilisateurs/pages/`

### 5.3 outils (pages conteneurs)

- [x] Outils, Emplacements, Evenements, Fournisseurs, Messagerie, MoyensDePaiement, TachesRecurrentes, Livraisons → `src/features/outils/pages/`

### 5.4 payments (prestataires)

- [x] Composants payments → `src/features/outils/components/payments/`
- [x] Hooks usePaymentProviders, usePaymentTransactions → `src/features/outils/hooks/`
- [x] Utils paymentToolkit → `src/features/outils/utils/`
- [x] Service whatsappService → `src/features/outils/services/`

### 5.5 productions

- [x] Composants productions → `src/features/outils/components/productions/`
- [x] Hook useProductions → `src/features/outils/hooks/`
- [x] Utils productionToolkit → `src/features/outils/utils/`
- [x] Page Productions → `src/features/outils/pages/`

### 5.6 statistiques

- [x] Statistiques.jsx — déjà migré en 4.9 insights

> **Checkpoint section 5** : toutes les routes résolues sans 404, `npm run build` sans erreur TS/lint.
> `git commit -m "feat(features): migrer features priorité basse"`

---

## 6. Pages connexion (auth publique)

- [x] `Connexion.jsx` → `src/features/auth/pages/`
- [x] `Login.jsx` + Desktop/Mobile → `src/features/auth/pages/`
- [x] `Register.jsx` + Desktop/Mobile → `src/features/auth/pages/`
- [x] `ForgotPassword.jsx` + Desktop/Mobile → `src/features/auth/pages/`
- [x] `ResetPassword.jsx` + Desktop/Mobile → `src/features/auth/pages/`

---

## 7. CookiesAgreement

- [x] `CookiesAgreement.jsx` → `src/shared/components/CookiesAgreement.jsx`
  - motion+AnimatePresence → GSAP `fadeIn`/`springSlideUp`/`slideOutDown`/`exitFadeOut` via `contextSafe`
  - `role="dialog"` + `aria-modal="true"` + `aria-label` ajoutés
  - Boutons `min-h-[44px]` (touch target) · Refuser = `border` outline style
  - Câblage App.jsx : à faire au premier `npm run dev`

---

## 8. NotFound

- [x] `v1/src/pages/NotFound.jsx` → `src/pages/NotFound.jsx`

---

## 9. Vérification finale

- [ ] `npm run build` sans erreur — en attente (pages Desktop/Mobile non fusionnées dans sections 4-6)
- [~] `npm run lint` — 13 erreurs `no-empty` corrigées · reste ~320 warnings pré-existants v1 (React Compiler)
- [x] Aucun import `framer-motion` ou `motion` dans `src/` — ✅ vérifié 0 fichier
- [x] Aucun `import gsap from "gsap"` direct — ✅ seul `lib/animations.js` (source unique autorisée)
- [x] Aucun import `@/components/` ancien — ✅ vérifié 0 fichier
- [x] Aucun import `@/config/supabase` ancien — ✅ vérifié 0 fichier
- [x] Aucun import `@/hooks/` ancien — ✅ vérifié 0 fichier
- [x] Aucun import `@/services/` ancien — ✅ vérifié 0 fichier
- [x] Aucun import `@/utils/` ancien — ✅ vérifié 0 fichier
- [ ] Tester sur mobile (≤1024px) et desktop (≥1024px) — un seul Outlet rendu
- [ ] Tester le mode dark/light
- [ ] Tester PWA : `npm run preview` + install prompt
- [ ] Vérifier IndexedDB offline (déconnecter réseau, créer commande)

---

## Additionnel

### A. Qualité du code

- [ ] Supprimer tous les `.gitkeep` des dossiers non-vides après migration
- [ ] Passer les `toolkits/` en `services/` partout (renommage systématique)
- [ ] Unifier les types de retour des services Supabase (pattern `{ data, error }` cohérent)
- [ ] Supprimer les commentaires JSDoc redondants (v1 en avait sur chaque fonction triviale)

### B. TypeScript ⚠️ POST-MIGRATION UNIQUEMENT

> Ne pas traiter pendant la migration — c'est du scope creep qui bloque l'avancement.
> À faire uniquement une fois la section 9 (Vérification finale) complète.

- [ ] Ajouter un `tsconfig.json` complet pour support `.tsx` strict dans `shared/components/ui/`
- [ ] Typer les stores Zustand (interfaces pour les états principaux)
- [ ] Typer les retours des hooks data (interface `Commande`, `Menu`, etc.)

### C. Performance

- [ ] Lazy-load les features lourdes dans les routes (React.lazy + Suspense) :
  - `insights`, `comptabilite`, `distribution`, `backDay`
- [ ] Vérifier les re-renders du router (s'assurer que `createAppRouter` n'est pas recréé inutilement)
- [ ] Auditer les bundle sizes : `npm run build -- --report`

### D. Animations — vérifications

- [ ] Vérifier que `ScrollTrigger` est bien tué au démontage dans tous les `countUp()`
- [ ] Vérifier que `applyHoverLift` et `applyTapPress` retournent bien leur cleanup
- [ ] Tester `captureFlip/animateFlip` sur MenuCatalog avec filtrage rapide
- [ ] S'assurer que les animations de sortie (`exitSlideDown`) ne bloquent pas l'UX si l'élément est démonté avant la fin

### E. PWA & Mobile

- [ ] Mettre à jour les screenshots PWA (manifest) si l'UI change significativement
- [ ] Tester le Service Worker en production (`npm run preview`)
- [ ] Vérifier la stratégie `NetworkFirst` Supabase cache (24h)
- [ ] Tester les notifications push Firebase sur Android

### F. Sécurité

- [ ] Vérifier que `.env` n'est jamais committé (`.gitignore` déjà configuré)
- [ ] S'assurer que les `VITE_` vars ne contiennent pas de secrets côté serveur
- [ ] Vérifier les RLS Supabase après migration (les calls API sont inchangés)

### G. Documentation

- [ ] Mettre à jour `CLAUDE.md` si des décisions d'architecture changent en cours de migration
- [ ] Cocher les items de `MIGRATION.md` au fur et à mesure
- [ ] Ajouter un `README.md` une fois la migration terminée

### H. Build Android (TWA)

- [ ] Mettre à jour le domaine dans `vite.config.js` manifest avant build
- [ ] Tester `npm run android:init` → `android:build` sur la v2
- [ ] Vérifier signature APK et `assetlinks.json`
