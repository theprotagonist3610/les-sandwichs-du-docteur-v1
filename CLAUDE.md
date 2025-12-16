# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PWA de gestion pour sandwicherie axée sur l'alimentation saine et la prévention santé. Application web progressive permettant de superviser l'ensemble de l'activité d'une sandwicherie healthy avec interface responsive optimisée pour desktop et mobile.

## Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Environment Variables

Required variables in `.env` file:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Firebase (for push notifications)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

## Architecture

### Role-Based Routing System

The application uses a role-based routing architecture where routes are dynamically selected based on user role:

- **Vendeur**: Access to Dashboard and Commandes only (defined in `src/routes/vendeurRoutes.jsx`)
- **Superviseur/Admin**: Full access to all sections (defined in `src/routes/superviseurRoutes.jsx`)
- Routes are created using `createAppRouter(role)` function in `src/routes/Routes.jsx`
- Default development router uses "superviseur" role

Available routes for Superviseur/Admin:

- `/` - Dashboard
- `/commandes` - Orders management
- `/stock` - Inventory management
- `/statistiques` - Statistics and analytics
- `/comptabilite` - Accounting
- `/parametres` - Settings
- `/utilisateurs` - User management

### Responsive Layout System

Dual-layout architecture that renders different layouts simultaneously based on screen size:

- **MainLayout** (`src/layouts/MainLayout.jsx`) renders both `MobileMainLayout` and `DesktopMainLayout` components
- Each layout uses CSS `display: none/block` to show/hide based on `useBreakpoint` hook
- Breakpoint threshold: **1024px** (mobile: <1024px, desktop: ≥1024px)
- Desktop uses `DesktopNavbar` (sidebar), Mobile uses `MobileNavbar` (bottom navigation)
- Both layouts include 64px top padding (`pt-16`) to accommodate fixed navbar

### Key Custom Hook

**`useBreakpoint`** (`src/hooks/useBreakpoint.jsx`):

- Returns `{ isMobile: boolean, isDesktop: boolean }`
- Listens to both `resize` and `orientationchange` events
- Used throughout the app for responsive behavior

### Tech Stack Integration

- **Vite**: Build tool with React plugin and PWA plugin
- **React Router**: Client-side routing with `createBrowserRouter`
- **Tailwind CSS v4**: Utility-first styling with custom config via Vite plugin
- **Supabase**: PostgreSQL database with runtime caching (24h cache, NetworkFirst strategy)
- **Firebase**: Push notifications service
- **Framer Motion**: Animations library
- **Zustand**: State management (stores not yet implemented)
- **Zod**: Schema validation
- **Shadcn/ui** : Systeme de composants UI

### Path Aliases

Configured in both `vite.config.js` and `tsconfig.json`:

```javascript
'@' → './src'
'@/components' → './src/components'
'@/lib' → './src/lib'
'@/hooks' → './src/hooks'
// etc.
```

Use `@/` prefix for all imports instead of relative paths.

### PWA Configuration

- Auto-updating service worker with Workbox
- Manifest configured for standalone app experience
- Theme color: `#a41624`, Background: `#ffe8c9`
- Icons: 64x64, 192x192, 512x512 (regular + maskable)
- Caches all static assets and Supabase API calls

### File Conventions

- JSX/TSX mixed: Pages and components use `.jsx`, utilities use `.ts`
- Component organization: `src/components/` for reusable, `src/pages/` for routes
- Layouts in `src/layouts/`
- Styling utility: `cn()` function in `src/lib/utils.ts` for merging Tailwind classes

### ESLint Configuration

- Flat config format (eslint.config.js)
- React Hooks and React Refresh plugins enabled
- Custom rule: Unused vars allowed if uppercase or starting with underscore
- Ignores: `dist` directory

## Development Notes

- Services (Supabase, Firebase) and stores (Zustand) directories exist but are not yet implemented
- Admin accounts are created manually on the backend
- Application is in French language
- shadcn/ui components configured but not yet added (components.json exists)
