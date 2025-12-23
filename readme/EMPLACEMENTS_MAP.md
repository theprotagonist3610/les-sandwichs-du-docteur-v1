# Composants de Cartographie des Emplacements

Ce document décrit les composants de visualisation cartographique pour les emplacements de la sandwicherie.

## Architecture

### Composants Principaux

1. **EmplacementsMapWrapper** - Composant principal avec switch entre types de cartes
2. **EmplacementsMap** - Carte SVG simple (schématique)
3. **EmplacementsLeafletMap** - Carte interactive avec relief (OpenStreetMap)

## Types de Cartes

### 1. Carte Simple (SVG)
Carte schématique personnalisée avec représentation visuelle simplifiée :
- Fond avec points décoratifs
- Positionnement relatif des emplacements
- Cercles concentriques autour de la base (2km, 5km, 10km, 20km)
- Lignes connectrices animées avec distances calculées
- Adaptatif et léger (pas de dépendances externes lourdes)

**Idéal pour** : Vue d'ensemble rapide, petites distances (<50km), performance optimale

### 2. Carte Relief (Leaflet + OpenStreetMap)
Carte interactive avec fond de carte géographique réel :
- Carte OpenStreetMap avec relief et rues
- Zoom et pan interactifs
- Marqueurs personnalisés par type d'emplacement
- Cercles de distance autour de la base
- Popups avec statistiques détaillées
- Scrollable et zoomable à l'infini

**Idéal pour** : Navigation précise, grandes distances (>50km), contexte géographique réel

## Fonctionnalités Communes

### Filtres par Type
- **Tout** : Affiche tous les emplacements
- **Base** : Affiche uniquement la base principale
- **Stand** : Affiche uniquement les stands
- **Kiosque** : Affiche uniquement les kiosques
- **Boutique** : Affiche uniquement les boutiques

### Options Interactives

#### Votre position
- Checkbox pour activer la géolocalisation en temps réel
- Affiche un marqueur à la position de l'utilisateur
- Calcule et affiche les distances entre l'utilisateur et tous les emplacements
- Lignes bleues avec distances en km

#### Échelle de distance
- Checkbox pour afficher/masquer les cercles concentriques
- Cercles autour de la base : 2km, 5km, 10km, 20km
- Labels de distance sur chaque cercle

#### Non situés
- Liste déroulante des emplacements sans coordonnées GPS
- Affiche le nombre d'emplacements non géolocalisés
- Détails : nom, icône, type

### Statistiques des Emplacements
- Ventes
- Livraisons
- Chiffre d'affaires (CA)
- Panneau affiché au-dessus de chaque emplacement (carte simple)
- Popup cliquable (carte relief)

### Calcul des Distances
- Utilise la formule de Haversine pour calculer les distances réelles
- Précision au dixième de kilomètre (ex: 2.5 km)
- Distances affichées sur les lignes connectrices

## Utilisation

```jsx
import EmplacementsMapWrapper from "@/components/map/EmplacementsMapWrapper";

// Desktop
<EmplacementsMapWrapper viewBox="0 0 1200 600" height="600" isMobile={false} />

// Mobile
<EmplacementsMapWrapper viewBox="0 0 340 400" height="400" isMobile={true} />
```

## Styles et Couleurs

### Par Type d'Emplacement

**Carte Simple (SVG)**
- Base: Bleu clair (#93c5fd)
- Stand: Vert clair (#86efac)
- Kiosque: Jaune (#fcd34d)
- Boutique: Violet clair (#d8b4fe)

**Carte Relief (Leaflet)**
- Base: Bleu (#3b82f6)
- Stand: Vert (#22c55e)
- Kiosque: Jaune (#eab308)
- Boutique: Violet (#a855f7)

### Par Statut
- Actif: Couleur pleine avec pulsation
- Inactif: Gris clair (#d1d5db)
- Fermé temporairement: Gris clair avec opacité réduite

## Responsive Design

- **Mobile** (<1024px) :
  - Taille réduite des icônes et textes
  - Viewbox ajusté : 340x400
  - Boutons et labels plus compacts

- **Desktop** (≥1024px) :
  - Taille normale
  - Viewbox : 1200x600
  - Plus d'espace pour les détails

## Dépendances

- `leaflet` : Bibliothèque de cartographie interactive
- `react-leaflet` : Intégration React pour Leaflet
- `lucide-react` : Icônes
- `sonner` : Toast notifications
- shadcn/ui : Composants UI (Card, Checkbox, Label, Button)

## Notes Techniques

### Performance
- La carte SVG est plus légère et plus rapide
- La carte Leaflet charge les tuiles à la demande
- Les emplacements sans coordonnées sont filtrés automatiquement

### Géolocalisation
- Utilise `navigator.geolocation.watchPosition()`
- Mise à jour en temps réel de la position
- Gestion des erreurs avec toast
- Cleanup automatique au démontage

### Formule de Haversine
Calcul précis des distances sur une sphère (Terre) :
```js
const R = 6371; // Rayon de la Terre en km
const dLat = (lat2 - lat1) * (Math.PI / 180);
const dLng = (lng2 - lng1) * (Math.PI / 180);
const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
          Math.sin(dLng/2) * Math.sin(dLng/2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
const distance = R * c;
```

## Intégration

Le wrapper est utilisé dans :
- `/dashboard` → Vue Map (Desktop & Mobile)
- `/outils/emplacements` → Emplacements Map (Desktop & Mobile)

Tous les composants utilisent automatiquement le système de double vue.
