# Composants — Guide de refactoring v2

> **Design system** : Vibrant & Block-based + Micro-interactions (50–300ms)
> **Palette** : `bg-primary` rouge brand · `bg-secondary` cream · `bg-accent` miel · tokens sémantiques Tailwind exclusivement
> **Typographie** : Playfair Display SC (titres) · Karla (corps) · base 16px · line-height 1.5
> **Animation** : GSAP via `@/lib/animations` — ease-out entrée · ease-in sortie · exit 60–70% de la durée d'entrée
> **Accessibilité** : touch target ≥44px · aria-label sur icônes seules · 4.5:1 contrast · focus rings visibles

---

## Layouts

### MainLayout

**Rôle** : Conteneur racine de toutes les pages authentifiées. Navbars + `<Outlet />`.

**Refactoring v2** :
- Un seul fichier — supprimer le dual-render v1 (`<MobileMainLayout /><DesktopMainLayout />`)
- Structure `min-h-dvh` (pas `100vh`) pour compatibilité mobile
- `padding-bottom` dynamique sur le contenu pour compenser la barre de navigation fixe mobile
- Offset sticky navbar calculé via variable CSS `--navbar-height` référencée dans les pages

```jsx
<div className="min-h-dvh flex flex-col bg-background">
  <DesktopNavbar className="hidden lg:flex sticky top-0 z-40" />
  <main className="flex-1 overflow-y-auto pb-[var(--mobile-nav-height)] lg:pb-0">
    <Outlet />
  </main>
  <MobileNavbar className="lg:hidden fixed bottom-0 left-0 right-0 z-40" />
</div>
```

**UX rules** : `fixed-element-offset` · `scroll-behavior` · `viewport-units` · `safe-area-awareness`

---

### EmptyLayout

**Rôle** : Wraps les pages publiques (connexion, reset password). Pas de navbar.

**Refactoring v2** : Copie directe. Ajouter `min-h-dvh` + centrage vertical explicite via `flex items-center justify-center`.

---

### ErrorLayout

**Rôle** : Page d'erreur globale (route error boundary).

**Refactoring v2** : Ajouter un bouton "Retour à l'accueil" avec `useNavigate(-1)` en fallback. Message d'erreur avec cause + chemin de récupération (`error-clarity`).

---

## Navbars

### MobileNavbar

**Rôle** : Barre de navigation fixe en bas sur mobile (≤1024px). Max 5 items.

**Refactoring v2** :
- Fond `bg-card/95 backdrop-blur-sm border-t border-border` — séparation visuelle claire en dark mode
- Item actif : `text-primary` + indicateur `border-t-2 border-primary` — pas de couleur seule (`color-not-only`)
- Tous les items : icône Lucide + label texte obligatoire (`nav-label-icon`)
- `safe-area-pb` via `pb-[env(safe-area-inset-bottom)]` pour les appareils avec home indicator
- Touch target : chaque item `min-h-[56px] min-w-[56px]` — dépasse le minimum de 44px

**UX rules** : `bottom-nav-limit` (≤5) · `nav-state-active` · `safe-area-awareness` · `nav-label-icon`

---

### DesktopNavbar

**Rôle** : Sidebar ou top bar sur desktop (≥1024px). Navigation principale + actions utilisateur.

**Refactoring v2** :
- Sidebar collapsible (shadcn `<Sidebar>` avec `<SidebarProvider>` au niveau du layout) — `drawer-usage`
- Section navigation principale vs section utilisateur/paramètres bien séparées (`nav-hierarchy`)
- Lien actif : `bg-primary/10 text-primary font-medium` — indicateur visible sans couleur seule
- Icônes Lucide taille uniforme `size-5` — `icon-style-consistent`
- Badge de notification sur les items concernés (`tab-badge`)

**UX rules** : `adaptive-navigation` · `nav-hierarchy` · `destructive-nav-separation` · `nav-state-active`

---

## Shared

### CookiesAgreement

**Rôle** : Bannière de consentement cookies affichée au premier visit. Overlay + bannière animée.

**Refactoring v2** :
- Remplacer Framer Motion → GSAP : overlay `fadeIn()` · bannière `springSlideUp()` · sortie `contextSafe` + `slideOutDown(cb)`
- `role="dialog"` + `aria-modal="true"` + focus trapped sur les deux boutons
- Bouton "Accepter" = `<Button variant="default">` · "Refuser" = `<Button variant="outline">`
- Scrim à 50% d'opacité (`Light/Dark Mode: Scrim and modal legibility`)

**Animation** : `springSlideUp` entrée · `slideOutDown` sortie (200ms, plus rapide que l'entrée)
**UX rules** : `modal-escape` · `escape-routes` · `sheet-dismiss-confirm`

---

### NumberTicker

**Rôle** : Chiffre animé qui compte de 0 à `value`. Utilisé dans les widgets de stats.

**Refactoring v2** :
- Réécriture complète avec `countUp()` de GSAP (ScrollTrigger)
- Un seul composant dans `shared/components/animations/` — supprimer le doublon v1
- `font-variant-numeric: tabular-nums` sur le span pour éviter le layout shift (`number-tabular`)
- Prop `prefix`/`suffix` pour les symboles monétaires (XOF, %, etc.)

**Animation** : `countUp(ref, value, { delay, decimalPlaces })` + cleanup `.kill()` au démontage
**UX rules** : `number-tabular` · `reduced-motion` (désactiver l'animation si `prefers-reduced-motion`)

---

## commandes

### CommandeCard

**Rôle** : Carte d'affichage d'une commande dans GestionDesCommandes et CommandesEnAttente. Supporte vue grille et vue liste via prop.

**Refactoring v2** :
- Prop `variant="grid" | "list"` — un seul composant au lieu de deux
- `<Card>` shadcn avec `bg-card text-card-foreground` + `shadow-sm hover:shadow-md` transition 200ms
- Badge de statut : `<Badge>` avec variant sémantique (`default` = en cours · `secondary` = livrée · `destructive` = annulée) + icône Lucide associée (`color-not-only`)
- Boutons d'action : `min-h-[44px] min-w-[44px]` · `aria-label` explicite sur chaque icône
- Skeleton loading : `<Skeleton className="h-24 w-full" />` pendant le chargement initial

**Animation** :
- Vue grille : `fadeInUp()` + `applyHoverLift(el, 4)` · sortie `exitFadeOut()`
- Vue liste : `fadeInLeft()` · sortie `slideOutRight()`
- Liste en cascade : `staggerFadeInUp(items, { stagger: 0.04 })`

**UX rules** : `touch-target-size` · `color-not-only` · `progressive-loading` · `state-clarity`

---

### CommandeHeader

**Rôle** : En-tête d'une page commande individuelle. Numéro, statut, actions rapides.

**Refactoring v2** :
- Sticky avec `sticky top-0 z-20 bg-background/95 backdrop-blur-sm`
- Titre `<h1>` avec hiérarchie correcte · statut en `<Badge>` à droite
- Boutons d'action groupés dans un `<div role="group">` pour la navigation clavier

**Animation** : `fadeInDown()` à l'entrée — 300ms ease-out
**UX rules** : `fixed-element-offset` · `heading-hierarchy` · `keyboard-nav`

---

### CommandeDetailsSection · CommandeInfoSection · CommandeLivraisonSection · CommandePaiementSection · CommandeHistorySection

**Rôle** : Sections d'une commande individuelle — détails, infos client, livraison, paiement, historique.

**Refactoring v2** (pattern commun) :
- Chaque section = `<Card>` avec titre `<h2 className="text-lg font-semibold">` — hiérarchie `h1 > h2` respectée
- Lignes de données : `<dl>` + `<dt>` + `<dd>` pour accessibilité screen reader
- Séparateurs via `<Separator />` shadcn — visible en light ET dark mode
- `CommandeHistorySection` : timeline verticale avec `border-l-2 border-border` + points de statut colorés

**UX rules** : `heading-hierarchy` · `color-not-only` · `whitespace-balance`

---

### ConfirmDialog

**Rôle** : Modale de confirmation pour actions destructives (annulation, suppression).

**Refactoring v2** :
- `<AlertDialog>` shadcn (sémantique correcte pour les confirmations destructives)
- `<AlertDialogAction>` avec `variant="destructive"` → `bg-destructive text-destructive-foreground`
- Action destructive visuellement séparée du bouton "Annuler" (`destructive-emphasis`)
- Focus automatique sur "Annuler" à l'ouverture (safer default)

**UX rules** : `confirmation-dialogs` · `destructive-emphasis` · `modal-escape` · `escape-routes`

---

### AddItemModal

**Rôle** : Modale pour ajouter un produit à une commande existante.

**Refactoring v2** :
- `<Dialog>` shadcn + `<DialogContent>` avec `max-h-[90dvh] overflow-y-auto`
- Recherche de produit avec `useDeferredValue` (pas de filtre à chaque frappe — `debounce-throttle`)
- Résultats en liste avec `<Command>` shadcn pour la recherche accessible
- Bouton de validation désactivé (`disabled` + opacity 0.5) tant qu'aucun item sélectionné

**UX rules** : `modal-escape` · `loading-buttons` · `inline-validation` · `debounce-throttle`

---

### AdresseSelector

**Rôle** : Sélecteur d'adresse dans le formulaire de commande.

**Refactoring v2** :
- `<Popover>` + `<Command>` shadcn — pattern combobox accessible
- Recherche locale filtrée avec `useDeferredValue`
- Empty state : "Aucune adresse trouvée — créer une nouvelle adresse ?" avec lien d'action (`empty-states`)
- Label visible (`<Label>`) associé au trigger via `htmlFor`

**UX rules** : `form-labels` · `empty-states` · `keyboard-nav` · `search-accessible`

---

## panneauDeVente

### PointDeVenteSelector

**Rôle** : Sélection du point de vente actif. Affiché une fois au démarrage de la session POS.

**Refactoring v2** :
- `<Select>` shadcn si ≤10 options · `<Command>` + `<Popover>` si plus
- Sélection persistée dans `pointDeVenteStore` (Zustand + persist)
- Animation d'entrée : `springScaleIn()` — feedback distinctif pour une action de démarrage de session

**UX rules** : `form-labels` · `state-preservation`

---

### CartItem

**Rôle** : Ligne de produit dans le panier POS. Quantité ajustable, suppression.

**Refactoring v2** :
- Layout flex avec image/nom/prix alignés sur une grille de 4 colonnes
- Boutons `+`/`-` : `min-h-[44px] min-w-[44px]` avec `aria-label="Augmenter la quantité de [nom]"`
- Swipe-to-delete sur mobile : indicateur de swipe visible (`swipe-clarity`) avec icône poubelle
- Prix en `font-variant-numeric: tabular-nums` (`number-tabular`)

**Animation** : `fadeInLeft()` à l'entrée · sortie `slideOutLeft()` à la suppression (200ms)
**UX rules** : `touch-target-size` · `aria-labels` · `swipe-clarity` · `number-tabular`

---

### CartSummary

**Rôle** : Récapitulatif du panier — total, promo appliquée, bouton de paiement.

**Refactoring v2** :
- Section sticky en bas du panneau panier sur mobile : `sticky bottom-0 bg-card border-t border-border`
- Total mis en avant : `text-2xl font-bold text-primary tabular-nums`
- `<Button size="lg" className="w-full min-h-[52px]">` — large, facilement tappable
- État de loading sur le bouton pendant la validation (`loading-buttons`)

**Animation** : `fadeIn()` à l'apparition du premier item · `fadeOut()` au vidage du panier
**UX rules** : `loading-buttons` · `touch-target-size` · `number-tabular`

---

### CartTotals

**Rôle** : Détail des lignes de calcul (sous-total, remise, total TTC).

**Refactoring v2** :
- `<dl>` avec `<dt>` label et `<dd>` montant — lisible par les screen readers
- Ligne de remise en `text-accent font-medium` si active, masquée sinon (pas de ligne vide)
- Tous les montants en `tabular-nums` (`number-tabular`)

**UX rules** : `number-tabular` · `whitespace-balance`

---

### PromoInput

**Rôle** : Champ de saisie et validation d'un code promotionnel.

**Refactoring v2** :
- `<Input>` + `<Button>` dans un `<InputGroup>` shadcn — label visible (`<Label>`)
- État validé : bordure `border-green-500` + icône `Check` + message inline vert
- État invalide : bordure `border-destructive` + message d'erreur sous le champ (`error-placement`)
- Bouton désactivé pendant la vérification + spinner (`loading-buttons`)

**UX rules** : `input-labels` · `error-placement` · `loading-buttons` · `inline-validation` · `success-feedback`

---

### CategoryTabs

**Rôle** : Onglets de filtrage des menus par catégorie dans le catalogue POS.

**Refactoring v2** :
- `<Tabs>` shadcn — rôles ARIA natifs (`role="tablist"` / `role="tab"`)
- Scroll horizontal sur mobile (`overflow-x-auto scrollbar-none`) — pas de horizontal scroll sur la page (`horizontal-scroll`)
- Tab active : `bg-primary text-primary-foreground` · inactives : `text-muted-foreground`
- Icône optionnelle par catégorie — Lucide, stroke-width uniforme 1.5

**UX rules** : `keyboard-nav` · `nav-state-active` · `horizontal-scroll`

---

### MenuCard (catalog POS)

**Rôle** : Carte produit dans le catalogue POS. Tap pour ajouter au panier.

**Refactoring v2** :
- Fond `bg-card` · image en `aspect-square` avec `object-cover` — `image-dimension` pour éviter CLS
- Prix en bas à droite en `font-bold tabular-nums text-primary`
- Variante "indisponible" : overlay `bg-background/60` + texte "Épuisé" — `disabled-states`
- Badge quantité en overlay si l'item est déjà dans le panier : `<Badge className="absolute top-2 right-2">`

**Animation** : `scaleInTight()` entrée · `applyTapPress(el, 0.97)` sur le press · feedback 80ms
**UX rules** : `tap-delay` (touch-action: manipulation) · `press-feedback` · `disabled-states` · `image-dimension`

---

### MenuCatalog

**Rôle** : Grille de tous les menus filtrés par catégorie. Réorganisation animée au changement de filtre.

**Refactoring v2** :
- CSS Grid responsive : `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3`
- Virtualization si >50 items (react-virtual ou CSS `content-visibility: auto`) — `virtualize-lists`
- Skeleton grid pendant le chargement initial : 8 cartes `<Skeleton>` — `progressive-loading`
- Empty state si aucun résultat : illustration + "Aucun menu dans cette catégorie" (`empty-states`)

**Animation** : `captureFlip()` avant le filtre · `animateFlip()` après — réorganisation fluide sans CLS
**UX rules** : `content-jumping` · `empty-states` · `progressive-loading` · `virtualize-lists`

---

### QuantityDialog

**Rôle** : Modale de saisie de quantité pour un produit.

**Refactoring v2** :
- `<Dialog>` shadcn + input `type="number"` avec `min="1"` + `inputMode="numeric"` (clavier numérique mobile)
- Boutons `+`/`-` flanquant l'input : `min-h-[52px] min-w-[52px]` — large pour le tactile
- Valider au tap sur "Ajouter" ET à l'appui sur Entrée (`keyboard-nav`)

**Animation** : `scaleIn()` ouverture modale · `scaleOut()` fermeture
**UX rules** : `input-type-keyboard` · `touch-target-size` · `keyboard-nav`

---

### SandwichPersonnaliseDialog

**Rôle** : Modale de personnalisation d'un sandwich (ingrédients, suppléments).

**Refactoring v2** :
- `<Sheet>` shadcn (bottom sheet sur mobile, dialog centré sur desktop) — plus naturel qu'une modale plein écran
- Sections accordion `<Accordion>` pour "Ingrédients de base" / "Suppléments" — `progressive-disclosure`
- Récapitulatif sticky en bas avec prix dynamique mis à jour à chaque sélection
- `sheet-dismiss-confirm` si des modifications sont en cours

**Animation** : `springSlideUp()` ouverture bottom sheet · `slideOutDown()` fermeture
**UX rules** : `progressive-disclosure` · `sheet-dismiss-confirm` · `modal-escape` · `number-tabular`

---

### ClientInfo

**Rôle** : Affichage/saisie des informations client dans le POS (nom, téléphone).

**Refactoring v2** :
- Mode affichage compact + toggle "Modifier" → expansion en form inline
- `<Input type="tel">` avec `inputMode="tel"` + `PhoneTaker` pour la saisie guidée
- Label visible au-dessus de chaque champ — pas de placeholder-only (`input-labels`)

**UX rules** : `input-labels` · `input-type-keyboard` · `autofill-support`

---

### OrderTypeSelector

**Rôle** : Sélection du type de commande (sur place / emporter / livraison).

**Refactoring v2** :
- `<RadioGroup>` shadcn avec grande zone de tap (pas juste le radio bouton)
- Chaque option : icône Lucide + libellé + description courte si nécessaire
- Sélection active : `bg-primary/10 border-primary border-2 rounded-lg` — feedback visuel clair

**UX rules** : `touch-target-size` · `form-labels` · `state-clarity`

---

### PaymentPanel

**Rôle** : Panneau de sélection du mode de paiement et de saisie du montant reçu.

**Refactoring v2** :
- Modes de paiement en grille de boutons larges : `min-h-[60px]` avec icône + label
- Saisie du montant : `<Input type="number" inputMode="decimal">` — clavier numérique
- Rendu de monnaie calculé en temps réel et affiché en `text-2xl text-primary tabular-nums`
- Bouton "Valider" désactivé tant que le montant saisi < total dû (`loading-buttons`)

**UX rules** : `touch-target-size` · `number-tabular` · `input-type-keyboard` · `loading-buttons`

---

### PaymentConfirmation

**Rôle** : Écran de confirmation après paiement. Animation de succès en 5 étapes staggerées.

**Refactoring v2** :
- Plein écran temporaire avant retour auto (3s) ou action utilisateur
- 5 éléments animés en séquence : fond → icône succès → titre → résumé → actions
- Icône de succès avec `springScaleIn()` — rebond elastic (`spring-physics`)
- Bouton "Nouvelle commande" comme CTA principal unique (`primary-action`)

**Animation** : `animateConfirmationScreen({ container, icon, message, card, actions })` — timeline GSAP
**UX rules** : `success-feedback` · `primary-action` · `spring-physics`

---

## menus

### MenuCard (gestion)

**Rôle** : Carte de menu dans la page de gestion. Affiche photo, nom, prix, catégorie, statut.

**Refactoring v2** :
- `<Card>` shadcn avec image `aspect-[4/3]` + overlay de statut si inactif
- Actions (modifier, activer/désactiver, supprimer) dans un `<DropdownMenu>` — icône `MoreVertical` avec `aria-label="Actions pour [nom]"`
- Badge de catégorie en `<Badge variant="outline">` — couleur de catégorie optionnelle mais avec texte (`color-not-only`)
- Prix en `tabular-nums font-bold`

**Animation** : `fadeInUp()` entrée · `applyHoverLift(el, 4)` hover · `slideOutDown()` suppression
**UX rules** : `aria-labels` · `color-not-only` · `confirmation-dialogs` (avant suppression)

---

### MenuDialog

**Rôle** : Modale de création/édition d'un menu.

**Refactoring v2** :
- `<Dialog>` shadcn avec `ScrollArea` pour les formulaires longs
- Tabs internes si besoin : "Informations" / "Ingrédients" / "Disponibilité" — `progressive-disclosure`
- Upload photo : zone de drop + preview immédiate + indicateur de progression
- Badges d'ingrédients avec bouton ×  : `<Badge>` + `applyTapPress()` sur ajout · `scaleInSmall()` apparition · `exitScaleOut()` suppression
- `sheet-dismiss-confirm` si le formulaire a été modifié

**Animation** : badges `scaleInSmall()` et `exitScaleOut()`
**UX rules** : `progressive-disclosure` · `sheet-dismiss-confirm` · `submit-feedback` · `error-placement`

---

### MenuStats

**Rôle** : Statistiques globales des menus (total, actifs, par catégorie, top ventes).

**Refactoring v2** :
- Layout **Bento Grid** : cartes de tailles variées (`col-span-1` / `col-span-2`) — recommandé par le design system pour les dashboards
- `<NumberTicker>` pour les chiffres principaux — `countUp()` GSAP au scroll
- Graphique barres horizontales pour le top ventes (Recharts `<BarChart horizontal>`) avec légende
- Skeleton shimmer pendant le chargement

**Animation** : `staggerFadeInUp(statCards)` entrée · `staggerScaleIn(categoryBadges)` pour les badges par type
**UX rules** : `progressive-loading` · `legend-visible` · `chart-type` · `number-tabular`

---

## dashboard

### StatsWidget · VentesWidget · ComptaWidget · StockWidget

**Rôle** : Widgets numériques de KPIs. Chiffre principal + tendance + sous-titre.

**Refactoring v2** (pattern commun pour les 4) :
- Bento Grid : widget simple = `col-span-1` · widget avec graphique = `col-span-2`
- `<NumberTicker>` pour le chiffre principal
- Indicateur de tendance : flèche `TrendingUp` / `TrendingDown` Lucide + valeur en `text-green-600` / `text-destructive` — toujours accompagnée d'un label texte (`color-not-only`)
- Skeleton : `<Skeleton className="h-20 w-full" />` pendant le fetch

**Animation** : `staggerFadeInUp(widgets, { stagger: 0.05 })` au montage du dashboard
**UX rules** : `progressive-loading` · `color-not-only` · `number-tabular`

---

### TodayWidget

**Rôle** : Résumé de la journée en cours — commandes, CA, tâches.

**Refactoring v2** :
- Section hero du dashboard (`col-span-2 row-span-2` dans le Bento)
- Heure actuelle mise à jour chaque minute (pas chaque seconde pour éviter les re-renders)
- Progression journalière via `<Progress>` shadcn avec label accessible

**UX rules** : `main-thread-budget` (mise à jour 1/min) · `number-tabular`

---

### TaskWidget

**Rôle** : Liste des tâches en cours et à faire.

**Refactoring v2** :
- Checklist avec `<Checkbox>` shadcn + label cliquable sur toute la largeur (touch target)
- Tâche cochée : `line-through text-muted-foreground opacity-60` — transition 150ms
- `undo-support` : toast "Tâche supprimée — Annuler" après suppression (`undo-support`)

**UX rules** : `touch-target-size` · `undo-support` · `success-feedback`

---

### DashboardCarousel

**Rôle** : Carousel de widgets ou d'alertes sur le dashboard mobile.

**Refactoring v2** :
- `scroll-snap-type: x mandatory` + `scroll-snap-align: start` CSS natif — pas de lib externe
- Indicateurs de pagination (dots) cliquables + accessibles (`aria-label="Aller au slide N"`)
- Swipe horizontal sans conflit avec le scroll vertical de la page (`gesture-conflicts`)

**UX rules** : `gesture-conflicts` · `swipe-clarity` · `safe-area-awareness`

---

### MetricsComparison

**Rôle** : Graphique de comparaison de métriques (période N vs période N-1).

**Refactoring v2** :
- Recharts `<AreaChart>` ou `<BarChart>` responsive avec `<ResponsiveContainer width="100%">`
- Légende interactive : cliquer pour masquer/afficher une série (`legend-interactive`)
- Tooltips accessibles au clavier (`tooltip-keyboard`)
- Palette : `var(--chart-1)` à `var(--chart-7)` — tokens CSS définis dans index.css

**UX rules** : `legend-visible` · `responsive-chart` · `legend-interactive` · `axis-labels`

---

### DistributionWidget · UsersWidget · ClotureWidget

**Rôle** : Widgets d'état opérationnel — tournées, utilisateurs connectés, clôture de caisse.

**Refactoring v2** (pattern commun) :
- Badge de statut coloré + icône + libellé — jamais couleur seule (`color-not-only`)
- Bouton d'action rapide (ex: "Clôturer" pour ClotureWidget) en bas du widget avec feedback de loading
- Lien vers la page détaillée depuis le widget — deep linking

**UX rules** : `color-not-only` · `deep-linking` · `loading-buttons`

---

## comptabilite

### DepenseForm · EncaissementForm

**Rôle** : Formulaires de saisie de dépenses et d'encaissements.

**Refactoring v2** :
- `<form onSubmit={handleSubmit}>` (pas de bouton onClick seul) — `keyboard-nav`
- Labels visibles sur tous les champs (`input-labels`)
- Validation inline au blur (pas à la frappe) — `inline-validation`
- Erreur placée sous le champ concerné en `text-sm text-destructive` — `error-placement`
- Montant : `<Input type="number" inputMode="decimal">` + `tabular-nums`
- Date : `<Calendar>` shadcn dans un `<Popover>` — label visible + valeur formatée dans le trigger
- Bouton submit désactivé + spinner pendant la mutation (`loading-buttons`)
- Toast de succès auto-dismiss 4s après soumission (`submit-feedback`)

**UX rules** : `input-labels` · `inline-validation` · `error-placement` · `loading-buttons` · `submit-feedback`

---

### DepensesList · EncaissementsList

**Rôle** : Listes paginées ou virtualisées de transactions.

**Refactoring v2** :
- `<Table>` shadcn avec `<TableHead>` + `aria-sort` sur colonnes triables (`sortable-table`)
- Virtualisation si >50 lignes
- Empty state : "Aucune dépense pour cette période — Ajouter la première ?" (`empty-states`)
- Filtres de période avec debounce sur la recherche texte

**UX rules** : `sortable-table` · `empty-states` · `virtualize-lists` · `debounce-throttle`

---

### BudgetView · PrevisionView · RevenuView · CaisseView

**Rôle** : Vues analytiques — résumé budgétaire, prévisions, revenus, état de caisse.

**Refactoring v2** (pattern commun) :
- En-tête `<h1>` + sous-titre avec la période concernée — hiérarchie correcte
- Sections séparées par `<Separator />` avec titres `<h2>` — `heading-hierarchy`
- Graphiques Recharts : `<BarChart>` ou `<LineChart>` selon le type de données (`chart-type`)
- Données chiffrées en `tabular-nums`
- Export CSV via bouton discret (icône `Download` + label) — `export-option`

**UX rules** : `chart-type` · `number-tabular` · `heading-hierarchy` · `export-option`

---

### ClotureJournaliereView

**Rôle** : Vue de clôture journalière — validation du CA, des dépenses, de la caisse.

**Refactoring v2** :
- Étapes multiples visibles : `<Progress>` ou steps indicator discret en haut — `multi-step-progress`
- Chaque étape validée : icône `CheckCircle` vert + label "Validé" — `success-feedback`
- Bouton "Clôturer la journée" = action destructive → `<AlertDialog>` de confirmation avant soumission
- `sheet-dismiss-confirm` si navigation hors de la page avant clôture

**UX rules** : `multi-step-progress` · `confirmation-dialogs` · `destructive-emphasis` · `sheet-dismiss-confirm`

---

## backDay

### BackDayBandeau

**Rôle** : Bandeau d'en-tête de la page BackDay — date sélectionnée, résumé rapide.

**Refactoring v2** :
- Fond `bg-card border-b border-border` · date en `text-xl font-semibold`
- Navigation de date (précédent/suivant) : boutons `ChevronLeft` / `ChevronRight` avec `aria-label`
- Indicateur de journée clôturée vs ouverte : badge coloré + icône

**UX rules** : `aria-labels` · `color-not-only`

---

### CalendrierBackDay

**Rôle** : Calendrier de sélection des journées à consulter.

**Refactoring v2** :
- `<Calendar>` shadcn avec `modifiers` pour marquer les journées clôturées (point vert) vs ouvertes
- Navigation mois par mois avec boutons accessibles
- Journée sélectionnée : `bg-primary text-primary-foreground`

**UX rules** : `keyboard-nav` · `color-not-only` · `nav-state-active`

---

### OngletCommandes

**Rôle** : Onglet de liste des commandes d'une journée passée. Animé à l'entrée.

**Refactoring v2** :
- `<Tabs>` shadcn pour switcher entre les onglets BackDay
- Liste de commandes avec même `CommandeCard` que partout — cohérence
- Filtrage par statut via `<Select>` en haut de liste

**Animation** : `staggerFadeInUp(commandeItems, { stagger: 0.04 })` à l'ouverture de l'onglet · sortie `exitFadeOut()`
**UX rules** : `nav-state-active` · `state-preservation` (scroll position au retour d'onglet)

---

## distribution

### DistributionLeafletMap

**Rôle** : Carte Leaflet interactive des zones de distribution et des tournées.

**Refactoring v2** :
- Lazy-load de `react-leaflet` (code splitting — `bundle-splitting`)
- Skeleton rectangulaire pendant le chargement de la carte (`progressive-loading`)
- Contrôles accessibles : zoom +/- avec `aria-label` · légende textuelle en plus des couleurs (`color-not-only`)
- `touch-action: pan-y` sur le conteneur pour éviter les conflits de scroll (`gesture-conflicts`)

**UX rules** : `bundle-splitting` · `progressive-loading` · `gesture-conflicts` · `color-not-only`

---

### ZoneMapPicker

**Rôle** : Outil de dessin de zones sur une carte (polygones).

**Refactoring v2** :
- Instructions visibles et persistantes au-dessus de la carte — `progressive-disclosure`
- Bouton "Terminer la zone" toujours visible (pas juste double-clic) — `gesture-alternative`
- Confirmation avant suppression d'une zone existante — `confirmation-dialogs`

**UX rules** : `gesture-alternative` · `confirmation-dialogs` · `escape-routes`

---

## livreurs

### LivreurCard

**Rôle** : Carte d'un livreur — nom, photo, zone, statut de synchronisation.

**Refactoring v2** :
- `<Card>` avec `<Avatar>` shadcn pour la photo (fallback initiales si pas de photo)
- Badge de statut sync : `<Badge variant="outline">` icône `Wifi` / `WifiOff` + libellé — `color-not-only`
- Actions inline au hover desktop / `<DropdownMenu>` sur mobile

**Animation** : `fadeInUp()` entrée · `applyHoverLift(el, 3)` hover desktop
**UX rules** : `color-not-only` · `hover-vs-tap`

---

### LivreurForm

**Rôle** : Formulaire de création/édition d'un livreur.

**Refactoring v2** :
- `PhoneTaker` réutilisé pour le téléphone — `input-type-keyboard`
- Upload photo avec preview + bouton de suppression accessible
- Validation Zod avec messages d'erreur précis sous chaque champ — `error-clarity`

**UX rules** : `input-labels` · `error-clarity` · `error-placement` · `submit-feedback`

---

### LivreurList

**Rôle** : Liste de tous les livreurs avec recherche et filtres.

**Refactoring v2** :
- Barre de recherche en `<Input>` avec icône `Search` intégrée + `useDeferredValue` — `debounce-throttle`
- Empty state personnalisé : "Aucun livreur — Ajouter le premier" avec `<Button>` CTA direct (`empty-states`)
- Virtualisation si liste longue

**UX rules** : `debounce-throttle` · `empty-states` · `search-accessible`

---

### LivreurStats

**Rôle** : Statistiques par livreur — livraisons, zones couvertes, performance.

**Refactoring v2** :
- `<NumberTicker>` pour les métriques clés
- Graphique Recharts `<RadarChart>` pour les performances multi-critères
- Comparaison entre livreurs via `<BarChart>` groupé

**UX rules** : `chart-type` · `legend-visible` · `number-tabular`

---

## adresses

### AdresseCard

**Rôle** : Carte d'une adresse de livraison — nom, rue, quartier, GPS.

**Refactoring v2** :
- `<Card>` avec icône `MapPin` Lucide + nom en `font-semibold` + adresse en `text-muted-foreground`
- Bouton "Copier les coordonnées GPS" avec feedback de clipboard (`success-feedback`)
- Badge de statut sync (offline-first)

**UX rules** : `success-feedback` · `aria-labels`

---

### AdresseForm · AdresseInForm

**Rôle** : Formulaire de création/édition d'adresse. `AdresseInForm` = version inline embarquable.

**Refactoring v2** :
- Champs groupés logiquement : "Localisation" (rue, quartier) · "Contact" (nom, téléphone) — `field-grouping`
- `AdresseInForm` : version compacte sans `<Card>` wrapper — utilisée directement dans `AdresseSelector`
- Validation coordonnées GPS : affichage cartographique miniature pour confirmation visuelle

**UX rules** : `field-grouping` · `input-labels` · `inline-validation`

---

### FindAdresse

**Rôle** : Recherche d'adresse existante par nom ou quartier.

**Refactoring v2** :
- `<Command>` shadcn — liste filtrée accessible, navigation clavier complète
- `useDeferredValue` pour la recherche (`debounce-throttle`)
- Résultats groupés par quartier — hiérarchie visuelle via `<CommandGroup>`

**UX rules** : `search-accessible` · `keyboard-nav` · `debounce-throttle`

---

## promotions

### PromotionTemplateCard · PromotionInstanceCard

**Rôle** : Cartes de templates et d'instances de promotions.

**Refactoring v2** :
- Template : `<Card>` avec badge de type promo · bouton "Activer une instance" comme CTA primaire (`primary-action`)
- Instance : badge "Active" / "Expirée" + dates en `tabular-nums` + compte à rebours si applicable
- `ActivationDialog` accessible via `<Dialog>` avec confirmation avant activation

**UX rules** : `primary-action` · `color-not-only` · `confirmation-dialogs`

---

### PromotionStats

**Rôle** : Dashboard des statistiques promotionnelles.

**Refactoring v2** :
- `<NumberTicker>` pour le taux d'utilisation et le gain généré
- Graphique temporel `<LineChart>` pour les activations dans le temps
- Empty state si aucune promo active — `empty-states`

**UX rules** : `empty-states` · `legend-visible` · `number-tabular`

---

## settings (parametres)

### SettingGroup

**Rôle** : Conteneur d'un groupe de réglages (ex: "Notifications sonores").

**Refactoring v2** :
- `<fieldset>` + `<legend>` sémantique — accessible screen reader
- `<Separator />` shadcn entre les groupes
- Titre du groupe en `text-sm font-semibold text-muted-foreground uppercase tracking-wider`

**UX rules** : `field-grouping` · `heading-hierarchy`

---

### Toggle

**Rôle** : Interrupteur on/off pour un réglage.

**Refactoring v2** :
- `<Switch>` shadcn (sémantique `role="switch"` + `aria-checked`) — pas de `<div>` cliquable custom
- Label cliquable sur toute la largeur de la ligne (`touch-target-size`)
- Description sous le label en `text-sm text-muted-foreground` — `progressive-disclosure`

**UX rules** : `touch-target-size` · `aria-labels` · `disabled-states`

---

### VolumeSlider

**Rôle** : Slider de volume pour les sons.

**Refactoring v2** :
- `<Slider>` shadcn — accessible clavier (flèches, Home, End)
- Preview sonore au relâchement du slider (`press-feedback`)
- Label + valeur affichée numériquement en `tabular-nums` à côté du slider

**UX rules** : `keyboard-nav` · `press-feedback` · `number-tabular`

---

### SoundPicker · VibrationPatternPicker

**Rôle** : Sélection d'une sonnerie ou d'un pattern de vibration parmi une liste.

**Refactoring v2** :
- `<RadioGroup>` shadcn — chaque option est une ligne avec icône `Play` + nom + bouton test (`aria-label`)
- Lecture du son / vibration au tap sur la ligne — feedback immédiat 100ms (`tap-feedback-speed`)

**UX rules** : `touch-target-size` · `tap-feedback-speed` · `aria-labels`

---

## profil

### EditProfileDialog · ChangePasswordDialog · UploadPhotoDialog

**Rôle** : Modales d'édition du profil utilisateur.

**Refactoring v2** (pattern commun) :
- `<Dialog>` shadcn avec focus automatique sur le premier champ à l'ouverture (`focus-management`)
- `ChangePasswordDialog` : champs mot de passe avec `<Input type="password">` + toggle show/hide (`password-toggle`)
- `UploadPhotoDialog` : zone de drop + preview + barre de progression d'upload
- `sheet-dismiss-confirm` si modifications non sauvegardées

**UX rules** : `password-toggle` · `focus-management` · `sheet-dismiss-confirm` · `submit-feedback`

---

## payments

### FeeXpayButton · KKiaPayButton

**Rôle** : Boutons d'initiation de paiement mobile (FeeXpay, KKiaPay).

**Refactoring v2** :
- `<Button>` shadcn avec logo officiel du prestataire + libellé texte — pas de logo seul (`aria-labels`)
- État loading pendant l'initiation : spinner + texte "Paiement en cours..." (`loading-buttons`)
- État d'erreur avec message de récupération : "Paiement échoué — Réessayer" (`error-recovery`)

**UX rules** : `loading-buttons` · `error-recovery` · `aria-labels` · `timeout-feedback`

---

### PaymentProviderCard

**Rôle** : Carte de sélection d'un prestataire de paiement.

**Refactoring v2** :
- `<Card>` cliquable avec `role="radio"` + état sélectionné : `ring-2 ring-primary`
- Logo SVG officiel + nom + description courte
- Touch target couvre toute la carte (`touch-target-size`)

**UX rules** : `touch-target-size` · `state-clarity`

---

### TransactionHistoryTable

**Rôle** : Tableau de l'historique des transactions de paiement.

**Refactoring v2** :
- `<Table>` shadcn avec `aria-sort` sur colonnes triables — `sortable-table`
- Montants en `tabular-nums` — `number-tabular`
- Statut avec badge icône + texte — `color-not-only`
- Export CSV (`export-option`)
- Virtualisation si >50 lignes (`virtualize-lists`)

**UX rules** : `sortable-table` · `number-tabular` · `color-not-only` · `export-option`

---

## shared/form

### PhoneTaker

**Rôle** : Composant de saisie de numéro de téléphone avec validation libphonenumber-js.

**Refactoring v2** :
- `<Input type="tel" inputMode="tel" autoComplete="tel">` — `input-type-keyboard` + `autofill-support`
- Sélecteur d'indicatif pays en `<Select>` shadcn avant le champ
- Indicateur de validation inline (coche verte / croix rouge) au blur — `inline-validation`
- Message d'erreur précis : "Numéro invalide pour le Bénin (+229)" — `error-clarity`

**UX rules** : `input-type-keyboard` · `autofill-support` · `inline-validation` · `error-clarity`

---

## auth

### ProtectedRoute · PublicRoute

**Rôle** : Gardes de route pour les pages authentifiées vs publiques.

**Refactoring v2** :
- Copie directe — pas de logique UI, pas d'animation
- `ProtectedRoute` redirige vers `/connexion` en gardant le `redirect` en query param pour retour post-login

---

### PermissionGuard · WithPermission

**Rôle** : Affichage conditionnel selon le rôle (`vendeur` / `superviseur` / `admin`).

**Refactoring v2** :
- Copie directe de la logique
- `PermissionGuard` : fallback prop pour afficher un composant alternatif au lieu de `null` — meilleure UX (`empty-nav-state`)

**UX rules** : `empty-nav-state`

---

## Récapitulatif des patterns transversaux

| Pattern | Composants concernés | Outil |
|---|---|---|
| Skeleton loading | Toutes les listes et widgets | `<Skeleton>` shadcn |
| Empty state | Listes, widgets, catalogues | Illustration + CTA |
| Confirmation destructive | Suppression, clôture, annulation | `<AlertDialog>` shadcn |
| Montants & chiffres | Partout | `tabular-nums` + `<NumberTicker>` |
| Actions icon-only | Partout | `aria-label` obligatoire |
| États de loading | Boutons async | `disabled` + spinner |
| Couleurs de statut | Badges, indicateurs | Token sémantique + icône |
| Formulaires | Tous les forms | Label visible + erreur sous le champ |
| Touch targets | Tous les éléments interactifs | `min-h-[44px] min-w-[44px]` |
