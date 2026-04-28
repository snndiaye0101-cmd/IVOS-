# 🎯 Guide d'Optimisation Performance

## Table des Matières

1. [Analyse Bundle](#analyse-bundle)
2. [Code Splitting](#code-splitting)
3. [Lazy Loading](#lazy-loading)
4. [Optimisation Images](#optimisation-images)
5. [Caching Strategy](#caching-strategy)
6. [Performance Budget](#performance-budget)

---

## Analyse Bundle

### Générer le rapport de build

```bash
# Build avec analyse
npm run build

# Analyser la taille du bundle
npx vite-bundle-visualizer
```

### Commandes utiles

```bash
# Taille totale du build
du -sh dist/

# Top 10 fichiers les plus volumineux
find dist/ -type f -exec du -h {} \; | sort -rh | head -10

# Analyser les dépendances
npx depcheck
```

---

## Code Splitting

### 1. Route-based Splitting (déjà implémenté)

```typescript
// src/app/App.tsx
const SecuritySettings = lazy(() => import('@/features/settings/pages/SecuritySettings'));
const SystemConfigPage = lazy(() => import('@/features/settings/pages/SystemConfigPage'));
const BillingPage = lazy(() => import('@/features/finances/pages/BillingPage'));
```

**✅ Bonne pratique** : Lazy-load les pages rarement visitées

### 2. Component-based Splitting

```typescript
// Avant - Tout chargé en même temps
import { HeavyChart } from '@/components/HeavyChart';

// Après - Chargement à la demande
const HeavyChart = lazy(() => import('@/components/HeavyChart'));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowChart(true)}>Afficher stats</button>
      {showChart && (
        <Suspense fallback={<Spinner />}>
          <HeavyChart />
        </Suspense>
      )}
    </div>
  );
}
```

### 3. Library Splitting

```typescript
// Avant - Import tout JSZip
import JSZip from 'jszip';

// Après - Import seulement ce qui est nécessaire
// (Note: JSZip ne supporte pas le tree-shaking)
// Alternative: utiliser dynamic import
async function generateZip() {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  // ...
}
```

---

## Lazy Loading

### 1. Routes principales

```typescript
// src/app/App.tsx - À améliorer

// Pages rarement visitées → lazy load
const WasteFormsPage = lazy(() => import('@/features/waste-tracking/pages/WasteFormsPage'));
const ImpactReportPage = lazy(() => import('@/features/qhse/pages/ImpactReportPage'));
const LoanManagementPage = lazy(() => import('@/features/finances/pages/LoanManagementPage'));

// Pages fréquentes → eager load
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import VehiclesPage from '@/features/fleet/pages/VehiclesPage';
```

### 2. Composants lourds

```typescript
// PDF Generator (jspdf + canvas)
const CertificatePDF = lazy(() => import('@/features/qhse/components/CertificatePDF'));

// QR Code Generator
const QRCodeGenerator = lazy(() => import('@/components/QRCodeGenerator'));

// Excel Export (xlsx)
const ExcelExporter = lazy(() => import('@/components/ExcelExporter'));
```

### 3. Icônes

```typescript
// Avant - 1000+ icônes chargées
import * as LucideIcons from 'lucide-react';

// Après - Import individuel
import { Database, Download, Upload, FileText } from 'lucide-react';
```

---

## Optimisation Images

### 1. Format moderne

```bash
# Convertir en WebP (80% de réduction)
cwebp logo.png -q 80 -o logo.webp

# Avec fallback
<picture>
  <source srcset="logo.webp" type="image/webp">
  <img src="logo.png" alt="Logo">
</picture>
```

### 2. Lazy loading images

```typescript
// Utiliser loading="lazy"
<img src="large-image.png" alt="..." loading="lazy" />

// Avec Intersection Observer pour plus de contrôle
function LazyImage({ src, alt }: { src: string; alt: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={isVisible ? src : 'placeholder.png'}
      alt={alt}
      className={isVisible ? 'loaded' : 'loading'}
    />
  );
}
```

### 3. Compression

```bash
# Optimiser PNG
pngquant --quality=65-80 *.png

# Optimiser JPEG
jpegoptim --max=85 *.jpg

# SVG
svgo *.svg
```

---

## Caching Strategy

### 1. Service Worker (PWA)

```typescript
// vite.config.ts - Ajouter VitePWA
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24h
              },
            },
          },
        ],
      },
    }),
  ],
});
```

### 2. React Query Cache

```typescript
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

### 3. LocalStorage Cache avec TTL

```typescript
/**
 * Cache avec expiration
 */
interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

function setCache<T>(key: string, data: T, ttlMinutes: number = 60): void {
  const cached: CachedData<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMinutes * 60 * 1000,
  };
  localStorage.setItem(key, JSON.stringify(cached));
}

function getCache<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const cached: CachedData<T> = JSON.parse(item);
    const now = Date.now();

    // Vérifier expiration
    if (now - cached.timestamp > cached.ttl) {
      localStorage.removeItem(key);
      return null;
    }

    return cached.data;
  } catch {
    return null;
  }
}

// Usage
const operations = getCache<Operation[]>('operations');
if (!operations) {
  const fresh = await fetchOperations();
  setCache('operations', fresh, 30); // 30 min
}
```

---

## Performance Budget

### Objectifs cibles

| Métrique | Target | Max |
|----------|--------|-----|
| Bundle JS total | < 500 KB | 800 KB |
| Largest Chunk | < 200 KB | 300 KB |
| First Load JS | < 300 KB | 500 KB |
| Images totales | < 1 MB | 2 MB |
| Fonts | < 100 KB | 200 KB |

### Vérification

```bash
# Analyser le build
npm run build

# Bundle size check
ls -lh dist/assets/*.js | awk '{sum+=$5} END {print sum/1024 " KB"}'

# Lighthouse CI
npx lighthouse https://your-app.com --view
```

### Performance Metrics

```typescript
/**
 * Mesurer les Core Web Vitals
 */
function measureWebVitals() {
  // Largest Contentful Paint (LCP)
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // First Input Delay (FID)
  new PerformanceObserver((list) => {
    list.getEntries().forEach((entry: any) => {
      console.log('FID:', entry.processingStart - entry.startTime);
    });
  }).observe({ entryTypes: ['first-input'] });

  // Cumulative Layout Shift (CLS)
  let clsScore = 0;
  new PerformanceObserver((list) => {
    list.getEntries().forEach((entry: any) => {
      if (!entry.hadRecentInput) {
        clsScore += entry.value;
      }
    });
    console.log('CLS:', clsScore);
  }).observe({ entryTypes: ['layout-shift'] });
}

// Appeler au chargement
if (typeof window !== 'undefined') {
  measureWebVitals();
}
```

---

## Optimisations Vite

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    
    // Compression Gzip
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    
    // Compression Brotli (meilleur ratio)
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
  
  build: {
    // Code splitting manual
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select'],
          'utils-vendor': ['date-fns', 'clsx'],
          
          // Feature chunks
          'qhse': [
            './src/features/qhse/pages/CertificatesPage',
            './src/features/qhse/pages/ArchivesQHSEPage',
          ],
          'finances': [
            './src/features/finances/pages/FinancePage',
            './src/features/finances/pages/BillingPage',
          ],
        },
      },
    },
    
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Supprimer console.log en prod
        drop_debugger: true,
      },
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
  },
  
  // Optimisation des dépendances
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
    ],
    exclude: [
      'jszip', // Lazy load seulement quand nécessaire
    ],
  },
});
```

---

## Checklist Optimisation

### Phase 1 - Quick Wins

- [ ] Lazy load routes rarement visitées
- [ ] Lazy load composants lourds (PDF, Excel, Charts)
- [ ] Import individuel des icônes Lucide
- [ ] Compression Gzip/Brotli activée
- [ ] Drop console.log en production

### Phase 2 - Images & Assets

- [ ] Convertir en WebP
- [ ] Compression images (< 100KB par image)
- [ ] Lazy loading images
- [ ] Sprites SVG pour icônes
- [ ] Font subsetting

### Phase 3 - Caching

- [ ] Service Worker (PWA)
- [ ] React Query cache configuré
- [ ] LocalStorage avec TTL
- [ ] HTTP cache headers (CDN)

### Phase 4 - Monitoring

- [ ] Lighthouse CI intégré
- [ ] Bundle size tracking
- [ ] Core Web Vitals monitoring
- [ ] Performance alerts (> 500KB)

---

## Commandes NPM à ajouter

```json
{
  "scripts": {
    "analyze": "vite-bundle-visualizer",
    "lighthouse": "lighthouse http://localhost:5173 --view",
    "size-limit": "size-limit",
    "perf": "npm run build && npm run analyze"
  },
  "devDependencies": {
    "vite-bundle-visualizer": "^1.0.0",
    "lighthouse": "^11.0.0",
    "size-limit": "^11.0.0"
  }
}
```

---

**Dernière mise à jour** : 21 avril 2026  
**Auteur** : Équipe IVOS
