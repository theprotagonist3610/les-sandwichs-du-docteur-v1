import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MiB (au lieu de 2 MiB par défaut)
        // Forcer la mise à jour immédiate du service worker
        skipWaiting: true,
        clientsClaim: true,
        // Nettoyer les anciens caches lors des mises à jour
        cleanupOutdatedCaches: true,
        // Forcer le navigateur à ne pas utiliser le cache HTTP pour les requêtes de précache
        sourcemap: false,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 heures
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        id: "/",
        name: "Les Sandwichs du Docteur",
        short_name: "Sandwichs Doc",
        description: "PWA de gestion pour sandwicherie healthy - Suivi des commandes, stock, comptabilité et statistiques",
        theme_color: "#a41624",
        background_color: "#ffe8c9",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "fr-FR",
        dir: "ltr",
        categories: ["business", "food", "productivity"],
        // PWABuilder Android (TWA) requirements
        prefer_related_applications: false,
        // Screenshots pour les stores
        screenshots: [
          {
            src: "screenshots/desktop-dashboard.png",
            sizes: "1920x1080",
            type: "image/png",
            form_factor: "wide",
            label: "Tableau de bord desktop"
          },
          {
            src: "screenshots/mobile-dashboard.png",
            sizes: "390x844",
            type: "image/png",
            form_factor: "narrow",
            label: "Tableau de bord mobile"
          }
        ],
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "apple-touch-icon-180x180.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any",
          },
        ],
        // Raccourcis pour accès rapide
        shortcuts: [
          {
            name: "Nouvelle commande",
            short_name: "Commande",
            description: "Créer une nouvelle commande",
            url: "/commandes?action=new",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Tableau de bord",
            short_name: "Dashboard",
            description: "Voir le tableau de bord",
            url: "/",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192" }]
          }
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["react-is", "recharts"],
  },
  build: {
    commonjsOptions: {
      include: [/react-is/, /node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ["recharts"],
          vendor: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
});
