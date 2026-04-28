# 📘 Guide d'Intégration — Générateur de Données Fictives

Ce guide montre comment intégrer le générateur de données de test dans votre application IVOS.

---

## 🎯 Fichiers Créés

| Fichier | Type | Description |
|---------|------|-------------|
| `src/shared/utils/fictiveDataGenerator.ts` | Service | Fonctions de génération |
| `src/features/settings/pages/FictiveDataPanel.tsx` | Page | Interface complète d'administration |
| `src/shared/components/QuickTestButton.tsx` | Composant | Bouton flottant rapide |
| `GUIDE_GENERATEUR_DONNEES_FICTIVES.md` | Doc | Documentation complète |

---

## ⚡ Méthode 1 : Bouton Flottant Rapide (Recommandé pour Dev)

### Installation

Ajouter le bouton dans votre `DashboardLayout.tsx` :

```tsx
// src/layouts/DashboardLayout.tsx

import QuickTestButton from '../shared/components/QuickTestButton';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const currentUser = getCurrentUser();
  
  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Votre layout existant */}
      <nav>...</nav>
      <main>{children}</main>
      
      {/* Bouton de test (visible uniquement en dev ou pour Super Admin) */}
      {(process.env.NODE_ENV === 'development' || currentUser?.role === 'Directeur Général') && (
        <QuickTestButton />
      )}
      
    </div>
  );
}
```

### Utilisation

1. **Un bouton flottant apparaît en bas à droite** (icône éclair ⚡)
2. **Cliquer** pour ouvrir le menu
3. **Choisir** le type d'opération à créer :
   - ✅ **Opération Complète** : Workflow + Facture + Paiement
   - 📄 **Avec Facture Non Payée** : Workflow + Facture (test paiement)
   - 📋 **Opération En Cours** : Workflow incomplet (test saisie)
4. **La page se rafraîchit** automatiquement après création

---

## 🖥️ Méthode 2 : Page d'Administration (Recommandé pour Production)

### Installation

Ajouter la route dans votre système de navigation :

```tsx
// src/app/App.tsx ou votre router

import FictiveDataPanel from './features/settings/pages/FictiveDataPanel';

const routes = [
  // ... vos routes existantes
  
  {
    path: '/admin/test-data',
    element: <FictiveDataPanel />,
    // Réserver aux Super Admin uniquement
    roles: ['Directeur Général'],
  },
];
```

### Ajouter un lien dans le menu Settings

```tsx
// src/features/settings/pages/SettingsPage.tsx

import { Link } from 'react-router-dom';
import { Database } from 'lucide-react';

<div className="grid grid-cols-2 gap-4">
  
  {/* Vos settings existants */}
  <Link to="/settings/users">...</Link>
  <Link to="/settings/permissions">...</Link>
  
  {/* Nouveau lien */}
  {currentUser?.role === 'Directeur Général' && (
    <Link
      to="/admin/test-data"
      className="p-6 bg-white rounded-xl border-2 border-purple-200 hover:border-purple-300"
    >
      <Database className="w-8 h-8 text-purple-600 mb-3" />
      <h3 className="font-bold text-gray-900">Données de Test</h3>
      <p className="text-sm text-gray-600 mt-1">
        Générer des opérations fictives pour tester le système
      </p>
    </Link>
  )}
  
</div>
```

---

## 🔧 Méthode 3 : Console Navigateur (Tests Rapides)

### Setup

Le fichier `fictiveDataGenerator.ts` expose automatiquement les fonctions globalement.

### Utilisation

1. **Ouvrir la console** (F12 → Console)
2. **Taper les commandes** :

```javascript
// Créer 1 opération complète
createFictiveOperation()

// Créer 5 opérations variées
createMultipleFictiveOperations(5)

// Créer avec options personnalisées
createFictiveOperation({
  clientName: 'Total Sénégal',
  wasteType: 'Huiles usagées',
  quantity: 5000,
  completeWorkflow: true,
  generateInvoice: true,
  generatePayment: false, // Facture validée mais non payée
})

// Supprimer tout
clearAllFictiveData()
```

3. **Rafraîchir la page** (F5)

---

## 🎨 Méthode 4 : Bouton Personnalisé dans n'importe quelle page

### Exemple : Page Opérations

```tsx
// src/features/exploitation/pages/OperationsPage.tsx

import { Zap } from 'lucide-react';
import { createFictiveOperationComplete } from '../../shared/utils/fictiveDataGenerator';

export default function OperationsPage() {
  const [operations, setOperations] = useState([]);
  
  const handleCreateTest = () => {
    createFictiveOperationComplete({
      completeWorkflow: true,
      generateInvoice: true,
      generatePayment: true,
    });
    
    // Recharger les données
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1>Opérations En Cours</h1>
        
        {/* Bouton de test (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={handleCreateTest}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Zap className="w-4 h-4" />
            Créer Test
          </button>
        )}
      </div>
      
      {/* Liste des opérations */}
      ...
    </div>
  );
}
```

### Exemple : Page Factures

```tsx
// src/features/finances/pages/InvoicesPage.tsx

import { FileText } from 'lucide-react';
import { createFictiveOperationComplete } from '../../shared/utils/fictiveDataGenerator';

export default function InvoicesPage() {
  const handleCreateInvoiceTest = () => {
    createFictiveOperationComplete({
      completeWorkflow: true,
      generateInvoice: true,
      generatePayment: false, // Pas de paiement = facture "À payer"
    });
    
    setTimeout(() => window.location.reload(), 1000);
  };
  
  return (
    <div>
      {/* Header avec bouton test */}
      <div className="flex justify-between mb-6">
        <h1>Factures</h1>
        
        {process.env.NODE_ENV === 'development' && (
          <button onClick={handleCreateInvoiceTest}>
            <FileText className="w-4 h-4" />
            Créer Facture Test
          </button>
        )}
      </div>
      
      ...
    </div>
  );
}
```

---

## 🚦 Configuration des Permissions

### Restreindre l'accès aux Super Admin uniquement

```tsx
// src/shared/utils/roleGuard.ts

export function canAccessTestDataGenerator(user: User | null): boolean {
  // En dev : accessible à tous
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // En prod : Super Admin uniquement
  return user?.role === 'Directeur Général';
}
```

### Utilisation

```tsx
import { canAccessTestDataGenerator } from '../shared/utils/roleGuard';

export default function SomePage() {
  const currentUser = getCurrentUser();
  
  return (
    <div>
      {canAccessTestDataGenerator(currentUser) && (
        <QuickTestButton />
      )}
    </div>
  );
}
```

---

## 📊 Événements Déclenchés

Le générateur déclenche automatiquement les événements suivants :

```typescript
// Après création d'opération
window.dispatchEvent(new Event('ivos_operations_change'));

// Après création de facture
window.dispatchEvent(new Event('ivos_invoice_change'));

// Après création de paiement
window.dispatchEvent(new Event('ivos_payment_change'));
```

### Écouter les événements dans vos composants

```tsx
useEffect(() => {
  const handleOperationsChange = () => {
    // Recharger les données
    loadOperations();
  };
  
  window.addEventListener('ivos_operations_change', handleOperationsChange);
  
  return () => {
    window.removeEventListener('ivos_operations_change', handleOperationsChange);
  };
}, []);
```

---

## 🎯 Scénarios de Test

### Test 1 : Workflow Complet (Opération → Facture → Paiement)

```javascript
createFictiveOperation({
  completeWorkflow: true,
  generateInvoice: true,
  generatePayment: true,
});
```

**Valide :**
- ✅ Création d'opération
- ✅ Workflow 9 étapes (100%)
- ✅ Génération automatique de facture
- ✅ Calcul montant (quantité × prix unitaire)
- ✅ Validation facture par Super Admin
- ✅ Enregistrement paiement
- ✅ Validation paiement
- ✅ Mise à jour dashboard finance

---

### Test 2 : Facture Non Payée

```javascript
createFictiveOperation({
  completeWorkflow: true,
  generateInvoice: true,
  generatePayment: false,
});
```

**Valide :**
- ✅ Workflow complet
- ✅ Facture générée et validée
- ❌ Pas de paiement → Status "envoyee"
- → Permet de tester l'enregistrement manuel de paiements

---

### Test 3 : Opération Incomplète (Chauffeur sur terrain)

```javascript
createFictiveOperation({
  completeWorkflow: false,
  generateInvoice: false,
  generatePayment: false,
});
```

**Valide :**
- ✅ Opération créée (étapes 1-4)
- ⏳ Workflow à 44% (4/9 étapes)
- ❌ Pas de facture
- → Permet de tester la saisie progressive des étapes 5-9

---

### Test 4 : Données en Masse (Filtres & Pagination)

```javascript
createMultipleFictiveOperations(20);
```

**Valide :**
- ✅ 20 opérations variées
- ✅ Différents clients
- ✅ Différents types de déchets
- ✅ Statuts mixtes (en_cours + cloturee)
- → Permet de tester les filtres, recherche, pagination

---

## 🧹 Nettoyage

### Supprimer toutes les données de test

```javascript
// Via console
clearAllFictiveData();

// Via code
import { clearAllFictiveData } from './shared/utils/fictiveDataGenerator';

clearAllFictiveData();
```

### Supprimer manuellement via localStorage

```javascript
localStorage.removeItem('ivos_operations_v1');
localStorage.removeItem('ivos_operations_counter_v1');
localStorage.removeItem('ivos_workflow_invoices_v1');
localStorage.removeItem('ivos_payments_v1');
```

---

## 🎓 Formation Équipe

### Pour les Développeurs

1. **Installer le bouton flottant** dans `DashboardLayout`
2. **Tester les 3 types** d'opérations
3. **Vérifier** les events et la synchronisation
4. **Valider** les calculs de montants

### Pour les Testeurs QA

1. **Accéder** à `/admin/test-data`
2. **Créer** 10 opérations variées
3. **Tester** tous les filtres
4. **Valider** le workflow complet
5. **Nettoyer** les données après tests

### Pour les Formateurs

1. **Créer** des opérations de démonstration
2. **Montrer** le workflow complet
3. **Expliquer** chaque étape
4. **Nettoyer** après la formation

---

## 📝 Checklist d'Intégration

- [ ] Copier les 4 fichiers créés
- [ ] Ajouter QuickTestButton dans DashboardLayout (dev only)
- [ ] Ajouter route `/admin/test-data` (Super Admin only)
- [ ] Ajouter lien dans menu Settings
- [ ] Tester création d'1 opération complète
- [ ] Vérifier events déclenchés
- [ ] Tester création de 5 opérations
- [ ] Tester filtres avec données variées
- [ ] Tester nettoyage de données
- [ ] Documenter pour l'équipe

---

## 🚀 Prêt à l'Emploi

Le générateur est maintenant prêt à être utilisé ! Choisissez la méthode d'intégration qui convient le mieux à votre workflow :

- **Dev** : Bouton flottant rapide
- **Prod** : Page d'administration sécurisée
- **Tests** : Console navigateur
- **Custom** : Boutons personnalisés

**Bon test ! 🎉**
