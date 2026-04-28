# ♿ Guide d'Accessibilité WCAG 2.1

## Table des Matières

1. [Principes WCAG](#principes-wcag)
2. [Audit Checklist](#audit-checklist)
3. [Clavier Navigation](#clavier-navigation)
4. [Screen Readers](#screen-readers)
5. [Contraste Couleurs](#contraste-couleurs)
6. [ARIA Labels](#aria-labels)
7. [Tests Automatisés](#tests-automatisés)

---

## Principes WCAG

### 4 Principes fondamentaux (POUR)

1. **Perceptible** - L'information doit être présentée de manière perceptible
2. **Opérable** - Les composants doivent être utilisables
3. **Compréhensible** - L'information doit être compréhensible
4. **Robuste** - Le contenu doit être compatible avec les technologies d'assistance

### Niveaux de conformité

- **A** - Niveau minimum (objectif)
- **AA** - Recommandé pour applications professionnelles ✅ **CIBLE**
- **AAA** - Excellence (nice to have)

---

## Audit Checklist

### Niveau A (Critique)

- [ ] **1.1.1** Texte alternatif pour images
- [ ] **1.3.1** Structure sémantique (headings)
- [ ] **2.1.1** Toutes les fonctionnalités accessibles au clavier
- [ ] **2.4.1** Skip links (navigation rapide)
- [ ] **3.1.1** Langue de la page définie (`<html lang="fr">`)
- [ ] **4.1.1** HTML valide (pas d'IDs dupliqués)
- [ ] **4.1.2** ARIA labels sur composants interactifs

### Niveau AA (Recommandé)

- [ ] **1.4.3** Ratio de contraste ≥ 4.5:1 (texte normal)
- [ ] **1.4.3** Ratio de contraste ≥ 3:1 (texte large)
- [ ] **2.4.6** Headings et labels descriptifs
- [ ] **2.4.7** Focus visible sur éléments interactifs
- [ ] **3.2.3** Navigation cohérente
- [ ] **3.3.1** Messages d'erreur clairs
- [ ] **3.3.2** Labels explicites pour formulaires

---

## Clavier Navigation

### Composants interactifs

```typescript
/**
 * Bouton accessible au clavier
 */
function AccessibleButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Enter ou Space = activation
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      onClick={onClick}
      onKeyPress={handleKeyPress}
      className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label="Action button"
    >
      {children}
    </button>
  );
}
```

### Navigation au clavier

```typescript
/**
 * Liste navigable au clavier (Arrow Up/Down)
 */
function KeyboardNavigableList({ items }: { items: string[] }) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
    }
  };

  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-activedescendant={`item-${focusedIndex}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {items.map((item, index) => (
        <li
          key={index}
          id={`item-${index}`}
          role="option"
          aria-selected={index === focusedIndex}
          className={index === focusedIndex ? 'bg-blue-100' : ''}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
```

### Skip Links

```typescript
// src/layouts/DashboardLayout.tsx - Ajouter en haut

function DashboardLayout() {
  return (
    <>
      {/* Skip Links */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
      >
        Aller au contenu principal
      </a>
      
      <a
        href="#main-navigation"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-40 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
      >
        Aller à la navigation
      </a>

      <aside id="main-navigation" className="...">
        {/* Navigation */}
      </aside>

      <main id="main-content" className="...">
        {/* Contenu principal */}
      </main>
    </>
  );
}
```

---

## Screen Readers

### ARIA Labels

```typescript
/**
 * Modal accessible
 */
function AccessibleModal({ isOpen, onClose, title, children }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const titleId = `modal-title-${Date.now()}`;

  useEffect(() => {
    if (isOpen) {
      // Focus trap
      document.body.style.overflow = 'hidden';
      
      // Annoncer l'ouverture
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.textContent = `${title} ouvert`;
      document.body.appendChild(announcement);
      
      setTimeout(() => announcement.remove(), 1000);
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isOpen, title]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg p-6 max-w-lg w-full">
        <h2 id={titleId} className="text-2xl font-bold mb-4">
          {title}
        </h2>

        <button
          onClick={onClose}
          aria-label="Fermer la boîte de dialogue"
          className="absolute top-4 right-4"
        >
          <X className="w-6 h-6" />
        </button>

        {children}
      </div>
    </div>
  );
}
```

### Live Regions

```typescript
/**
 * Zone de notification accessible
 */
function AccessibleNotification({ message, type }: {
  message: string;
  type: 'success' | 'error' | 'info';
}) {
  return (
    <div
      role="status"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={`p-4 rounded ${
        type === 'success' ? 'bg-green-100' :
        type === 'error' ? 'bg-red-100' :
        'bg-blue-100'
      }`}
    >
      <p>{message}</p>
    </div>
  );
}
```

### Progress Bars

```typescript
/**
 * Barre de progression accessible
 */
function AccessibleProgressBar({ value, max = 100, label }: {
  value: number;
  max?: number;
  label: string;
}) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div>
      <label id="progress-label" className="mb-2 block">
        {label}
      </label>
      
      <div
        role="progressbar"
        aria-labelledby="progress-label"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={`${percentage}% terminé`}
        className="w-full bg-gray-200 rounded-full h-4 overflow-hidden"
      >
        <div
          className="bg-blue-600 h-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <span className="sr-only">{percentage}% terminé</span>
    </div>
  );
}
```

---

## Contraste Couleurs

### Palette Accessible

```typescript
/**
 * Palette de couleurs WCAG AA compliant
 */
const accessibleColors = {
  // Texte sur blanc (ratio ≥ 4.5:1)
  text: {
    primary: '#1a1a2e',      // 15.3:1 ✅
    secondary: '#374151',    // 11.2:1 ✅
    muted: '#6b7280',        // 4.6:1 ✅
  },
  
  // Backgrounds avec texte blanc (ratio ≥ 4.5:1)
  backgrounds: {
    blue: '#1e40af',         // 8.6:1 ✅
    green: '#047857',        // 5.9:1 ✅
    red: '#b91c1c',          // 7.3:1 ✅
    orange: '#c2410c',       // 6.1:1 ✅
    purple: '#7c3aed',       // 4.9:1 ✅
  },
  
  // Links (ratio ≥ 4.5:1 sur blanc)
  link: {
    default: '#2563eb',      // 6.2:1 ✅
    visited: '#7c3aed',      // 4.9:1 ✅
    hover: '#1e40af',        // 8.6:1 ✅
  },
};
```

### Vérification du contraste

```typescript
/**
 * Calculer le ratio de contraste WCAG
 */
function getContrastRatio(color1: string, color2: string): number {
  // Convertir hex en RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Calculer la luminance relative
  const getLuminance = (rgb: { r: number; g: number; b: number }) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      val /= 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Usage
const ratio = getContrastRatio('#1a1a2e', '#ffffff');
console.log(`Ratio: ${ratio.toFixed(1)}:1`);

if (ratio >= 4.5) {
  console.log('✅ WCAG AA compliant');
} else {
  console.log('❌ Contraste insuffisant');
}
```

### Tailwind Config avec couleurs accessibles

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Couleurs WCAG AA compliant
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',  // 4.5:1 sur blanc ✅
          600: '#2563eb',  // 6.2:1 ✅
          700: '#1d4ed8',  // 7.5:1 ✅
          800: '#1e40af',  // 8.6:1 ✅
          900: '#1e3a8a',  // 10.1:1 ✅
        },
      },
    },
  },
};
```

---

## ARIA Labels

### Formulaires

```typescript
/**
 * Formulaire accessible
 */
function AccessibleForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <form aria-labelledby="form-title">
      <h2 id="form-title" className="text-2xl font-bold mb-4">
        Nouvelle opération
      </h2>

      {/* Champ texte */}
      <div className="mb-4">
        <label htmlFor="client" className="block mb-2 font-medium">
          Client <span aria-label="requis" className="text-red-600">*</span>
        </label>
        <input
          id="client"
          type="text"
          required
          aria-required="true"
          aria-invalid={!!errors.client}
          aria-describedby={errors.client ? 'client-error' : undefined}
          className={`w-full px-3 py-2 border rounded ${
            errors.client ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.client && (
          <p id="client-error" role="alert" className="text-red-600 text-sm mt-1">
            {errors.client}
          </p>
        )}
      </div>

      {/* Select */}
      <div className="mb-4">
        <label htmlFor="vehicle" className="block mb-2 font-medium">
          Véhicule
        </label>
        <select
          id="vehicle"
          aria-label="Sélectionner un véhicule"
          className="w-full px-3 py-2 border border-gray-300 rounded"
        >
          <option value="">-- Sélectionner --</option>
          <option value="AA-123-BB">AA-123-BB</option>
          <option value="CC-456-DD">CC-456-DD</option>
        </select>
      </div>

      {/* Checkbox */}
      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            aria-describedby="terms-description"
            className="w-4 h-4"
          />
          <span>J'accepte les conditions</span>
        </label>
        <p id="terms-description" className="text-sm text-gray-600 ml-6">
          En cochant cette case, vous acceptez nos conditions d'utilisation
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Créer l'opération
      </button>
    </form>
  );
}
```

### Tables

```typescript
/**
 * Table accessible
 */
function AccessibleTable({ data }: { data: any[] }) {
  return (
    <table
      role="table"
      aria-label="Liste des opérations"
      className="w-full"
    >
      <caption className="sr-only">
        Liste des opérations avec statut et dates
      </caption>
      
      <thead>
        <tr>
          <th scope="col" className="px-4 py-2 text-left">Code BSD</th>
          <th scope="col" className="px-4 py-2 text-left">Client</th>
          <th scope="col" className="px-4 py-2 text-left">Statut</th>
          <th scope="col" className="px-4 py-2 text-left">Date</th>
        </tr>
      </thead>
      
      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
            <td className="px-4 py-2">{row.code}</td>
            <td className="px-4 py-2">{row.client}</td>
            <td className="px-4 py-2">
              <span
                className={`px-2 py-1 rounded ${
                  row.status === 'cloturee' ? 'bg-green-100 text-green-800' :
                  row.status === 'en_cours' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}
                aria-label={`Statut: ${row.status}`}
              >
                {row.status}
              </span>
            </td>
            <td className="px-4 py-2">
              <time dateTime={row.date}>
                {new Date(row.date).toLocaleDateString('fr-FR')}
              </time>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## Tests Automatisés

### Installer axe-core

```bash
npm install --save-dev @axe-core/react
```

### Intégration dans l'application

```typescript
// src/main.tsx - En développement seulement
if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

### Tests Jest avec jest-axe

```bash
npm install --save-dev jest-axe
```

```typescript
// src/components/__tests__/AccessibleButton.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import AccessibleButton from '../AccessibleButton';

expect.extend(toHaveNoViolations);

describe('AccessibleButton', () => {
  it('devrait être accessible', async () => {
    const { container } = render(
      <AccessibleButton onClick={() => {}}>
        Cliquez-moi
      </AccessibleButton>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Lighthouse CI

```bash
# Installer Lighthouse CI
npm install --save-dev @lhci/cli

# Lancer l'audit
npx lhci autorun --collect.url=http://localhost:5173
```

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": ["http://localhost:5173"]
    },
    "assert": {
      "assertions": {
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:performance": ["warn", { "minScore": 0.8 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }]
      }
    }
  }
}
```

---

## Checklist Finale

### Navigation

- [ ] Skip links présents
- [ ] Navigation cohérente
- [ ] Focus visible partout
- [ ] Tab order logique
- [ ] Pas de keyboard traps

### Contenu

- [ ] Headings hiérarchiques (h1 → h2 → h3)
- [ ] Langue définie (`<html lang="fr">`)
- [ ] Alt text sur images
- [ ] Labels sur formulaires
- [ ] Messages d'erreur clairs

### Couleurs

- [ ] Ratio ≥ 4.5:1 (texte normal)
- [ ] Ratio ≥ 3:1 (texte large)
- [ ] Information non basée uniquement sur la couleur
- [ ] Mode sombre accessible (optionnel)

### Screen Readers

- [ ] ARIA labels présents
- [ ] Live regions configurées
- [ ] Rôles ARIA corrects
- [ ] Annonces pertinentes

### Tests

- [ ] axe-core sans violations
- [ ] Lighthouse score ≥ 90
- [ ] Tests manuels NVDA/JAWS
- [ ] Tests clavier uniquement

---

**Dernière mise à jour** : 21 avril 2026  
**Auteur** : Équipe IVOS
