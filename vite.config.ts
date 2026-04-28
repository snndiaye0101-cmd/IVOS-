// ============================================
// Configuration Vite pour IVOS
// ============================================

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const plugins = [
  react(),

  // Configuration PWA pour usage mobile
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
    manifest: {
      name: 'IVOS Fleet Management',
      short_name: 'IVOS',
      description: 'Application de gestion de flotte et workflow',
      theme_color: '#0f172a',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: 'icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: 'icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      // Stratégie de cache pour mode offline
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'supabase-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 // 24 heures
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        }
      ]
    }
  }),
]

// Optionally add Sentry plugin when auth token is available in the environment
if (process.env.SENTRY_AUTH_TOKEN) {
  plugins.push(
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: process.env.VITE_APP_VERSION,
    })
  )
}
  
  // Alias pour imports propres
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@styles': path.resolve(__dirname, './src/styles')
    }
  },
  
  // Configuration du serveur de développement
  server: {
    port: 3000,
    host: true, // Pour accès depuis mobile en local
    open: true
  },
  
  // Configuration build optimisée (fusionnée)
  build: {
    outDir: 'dist',
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: true,
    chunkSizeWarningLimit: 500, // Target performance budget
    rollupOptions: {
      output: {
        // Code-splitting manuel pour optimisation bundle
        manualChunks: {
          // React core (163 KB)
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Supabase
          'supabase-vendor': ['@supabase/supabase-js'],
          
          // Charts (411 KB → chunk séparé)
          'charts-vendor': ['recharts'],
          
          // PDF generation (151 KB → chunk séparé)
          'pdf-vendor': ['jspdf', 'jspdf-autotable'],
          
          // Maps (lazy load uniquement si utilisé)
          'maps-vendor': ['leaflet', 'react-leaflet'],
          
          // UI Framework (Shadcn/Radix)
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-accordion',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-switch',
            '@radix-ui/react-avatar',
            '@radix-ui/react-label',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-alert-dialog'
          ],
          
          // Form libraries
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          
          // State management
          'state-vendor': ['zustand', '@tanstack/react-query'],
          
          // Utilities
          'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge', 'class-variance-authority'],
        },
        
        // Nommage des chunks pour cache busting
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  
  // Nettoyage automatique pour la production
  esbuild: {
    drop: ['console', 'debugger'],
  },

  // Optimisation des dépendances
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js']
  }
})
