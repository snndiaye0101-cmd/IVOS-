# 🧪 Générateur de Données Fictives

Ce module permet de créer facilement des opérations de test complètes pour valider le système **Terrain → Comptabilité → Trésorerie**.

---

## 📦 Fichiers Créés

| Fichier | Description |
|---------|-------------|
| `src/shared/utils/fictiveDataGenerator.ts` | Script de génération avec fonctions exportables |
| `src/features/settings/pages/FictiveDataPanel.tsx` | Interface visuelle pour générer des données |

---

## 🚀 Utilisation Rapide

### **Méthode 1 : Interface Visuelle (Recommandé)**

1. **Ajouter la route dans votre système de navigation :**

```tsx
// Dans votre router ou menu de navigation
import FictiveDataPanel from './features/settings/pages/FictiveDataPanel';

// Ajouter une route (réservée aux Super Admin)
{
  path: '/admin/fictive-data',
  element: <FictiveDataPanel />,
  roles: ['Super Admin'],
}
```

2. **Accéder à l'interface :**
   - Naviguer vers `/admin/fictive-data`
   - Cliquer sur le bouton souhaité
   - La page se rafraîchit automatiquement

---

### **Méthode 2 : Console Navigateur**

1. **Ouvrir la console** (F12 → Console)

2. **Importer le script :**

```javascript
import { createFictiveOperationComplete } from './src/shared/utils/fictiveDataGenerator';
```

Ou si le module n'est pas encore importé :

```javascript
// Copier-coller directement le contenu du fichier fictiveDataGenerator.ts
// puis utiliser les fonctions globales :

createFictiveOperation();
```

3. **Commandes disponibles :**

```javascript
// Créer 1 opération complète (workflow + facture + paiement)
createFictiveOperation();

// Créer 1 opération avec options personnalisées
createFictiveOperation({
  clientName: 'Total Sénégal',
  wasteType: 'Huiles usagées',
  quantity: 3500,
  completeWorkflow: true,
  generateInvoice: true,
  generatePayment: true,
});

// Créer 5 opérations variées
createMultipleFictiveOperations(5);

// Créer 1 opération en cours (non terminée)
createFictiveOperation({
  completeWorkflow: false,
  generateInvoice: false,
  generatePayment: false,
});

// Supprimer toutes les données de test
clearAllFictiveData();
```

---

## 📋 Que Crée le Générateur ?

### **1. Opération Complète**

```javascript
{
  id: 'op-1713707123456-abc123',
  numero: 'BSD-2026-0042',
  client: 'Total Sénégal',
  typeDechet: 'Huiles usagées hydrocarbures',
  quantiteKg: '2500',
  status: 'cloturee',
  
  // 9 étapes du workflow remplies
  bsdData: {
    // Étape 1 - Producteur
    producteurNom: 'Total Sénégal',
    producteurAdresse: '...',
    
    // Étape 2 - Collecteur (AUTO)
    collecteurNom: 'IVOS',
    
    // Étape 3 - Dénomination
    categorieDechet: 'Déchets Dangereux',
    codeDechet: '13-02-05',
    
    // Étape 4 - Conditionnement
    nombreColis: '1',
    typeConditionnement: 'Citerne 20m³',
    
    // Étape 5 - Signature Producteur (AUTO)
    signatureProducteur: '...',
    
    // Étape 6 - Pesée
    poidsReel: '2550',
    
    // Étape 7 - Signature Chauffeur (AUTO)
    signatureChauffeur: '...',
    
    // Étape 8 - Réception
    dateReception: '...',
    destinataireNom: 'IVOS Centre',
    
    // Étape 9 - Traitement
    modeTraitement: 'Valorisation',
    certification: 'CER-2026-0042',
    
    // Validation finale
    validatedAt: '...',
  }
}
```

### **2. Facture Générée Automatiquement**

```javascript
{
  id: 'INV-1713707123456-a1b2',
  missionId: 'op-1713707123456-abc123',
  missionNumero: 'BSD-2026-0042',
  numeroOfficiel: 'FAC-2026-0031',
  
  clientNom: 'Total Sénégal',
  
  // Calcul automatique
  quantite: 2550, // Poids réel (étape 6)
  unite: 'kg',
  prixUnitaire: 500,
  montantHT: 1275000, // 2550 × 500 = 1 275 000 FCFA
  
  status: 'validee', // Validée par Super Admin
  validatedBy: 'Samba (DG)',
}
```

### **3. Paiement Créé (Optionnel)**

```javascript
{
  id: 'PAY-1713707123456-XYZ789',
  invoiceId: 'INV-1713707123456-a1b2',
  invoiceNumero: 'FAC-2026-0031',
  
  montant: 1275000,
  method: 'virement',
  details: {
    referenceBancaire: 'VIR-2026-12345',
    banqueEmettrice: 'CBAO Sénégal',
  },
  
  status: 'encaisse',
  saisiePar: 'Agent Finance',
  validePar: 'Samba (DG)',
}
```

---

## 🎯 Cas d'Usage

### **Test 1 : Workflow Complet**

**Objectif :** Valider le flux complet de A à Z

```javascript
createFictiveOperation({
  completeWorkflow: true,
  generateInvoice: true,
  generatePayment: true,
});
```

**Résultat :**
- ✅ Opération créée avec 9 étapes remplies
- ✅ Facture générée automatiquement
- ✅ Paiement enregistré et encaissé
- ✅ Dashboard Finance mis à jour

---

### **Test 2 : Workflow Incomplet (Chauffeur sur terrain)**

**Objectif :** Tester la saisie progressive

```javascript
createFictiveOperation({
  completeWorkflow: false,
  generateInvoice: false,
  generatePayment: false,
});
```

**Résultat :**
- ✅ Opération créée avec étapes 1-4 (Bureau)
- ❌ Workflow incomplet (67% de progression)
- ❌ Pas de facture générée
- → Permet de tester la saisie des étapes 5-9

---

### **Test 3 : Données Variées pour Tests de Filtres**

**Objectif :** Tester les filtres et listes

```javascript
createMultipleFictiveOperations(10);
```

**Résultat :**
- ✅ 10 opérations avec différents clients
- ✅ Différents types de déchets
- ✅ Statuts variés (en_cours / cloturee)
- ✅ Certaines avec factures, d'autres sans
- → Permet de tester les filtres et la pagination

---

## 🧹 Nettoyage

### **Supprimer Toutes les Données de Test**

```javascript
clearAllFictiveData();
```

⚠️ **Attention :** Cette action est **irréversible** et supprime :
- Toutes les opérations
- Toutes les factures
- Tous les paiements

---

## 🔧 Personnalisation

### **Options Disponibles**

```typescript
interface FictiveOperationOptions {
  clientName?: string;          // Nom du client
  wasteType?: string;            // Type de déchet
  quantity?: number;             // Quantité en kg
  completeWorkflow?: boolean;    // Remplir les 9 étapes
  generateInvoice?: boolean;     // Créer la facture
  generatePayment?: boolean;     // Créer le paiement
}
```

### **Exemple Personnalisé**

```javascript
createFictiveOperation({
  clientName: 'SAR Sénégal',
  wasteType: 'Boues de forage',
  quantity: 15000,
  completeWorkflow: true,
  generateInvoice: true,
  generatePayment: false, // Facture validée mais non payée
});
```

---

## 📊 Données Générées

### **Clients Variés (rotation automatique)**
- Total Sénégal
- SAR Sénégal
- Shell Sénégal
- Petrosen
- Oryx Energies

### **Types de Déchets (rotation automatique)**
- Huiles usagées hydrocarbures
- Boues de forage
- Déchets chimiques
- Solvants usagés
- Filtres à huile usagés

### **Modes de Paiement (aléatoire)**
- Virement (avec référence bancaire)
- Chèque (avec numéro)
- Espèces (avec nom remettant)
- Autre (avec détails)

---

## 🚦 Validation Automatique

Le générateur met à jour automatiquement les **events** :

```javascript
window.dispatchEvent(new Event('ivos_operations_change'));
window.dispatchEvent(new Event('ivos_invoice_change'));
window.dispatchEvent(new Event('ivos_payment_change'));
```

→ Les composants React qui écoutent ces événements se mettent à jour automatiquement.

---

## 📝 Exemple d'Intégration dans un Menu Admin

```tsx
// Dans votre DashboardLayout ou SettingsPage

import { Link } from 'react-router-dom';
import { Database } from 'lucide-react';

<Link
  to="/admin/fictive-data"
  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100"
>
  <Database className="w-5 h-5 text-blue-600" />
  <span>Données de Test</span>
</Link>
```

---

## ⚙️ Configuration Avancée

### **Ajouter un Bouton Rapide dans n'importe quelle page**

```tsx
import { createFictiveOperationComplete } from '@/shared/utils/fictiveDataGenerator';
import { Zap } from 'lucide-react';

function QuickTestButton() {
  const handleClick = () => {
    createFictiveOperationComplete();
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 flex items-center gap-2"
    >
      <Zap className="w-4 h-4" />
      Créer Test
    </button>
  );
}
```

---

## 🎓 Scénarios de Formation

### **Formation Chauffeur (Tablette Hors-ligne)**

1. Créer opération incomplète :
   ```javascript
   createFictiveOperation({ completeWorkflow: false });
   ```

2. Sur tablette en mode hors-ligne :
   - Remplir étapes 5-7
   - Vérifier IndexedDB
   - Reconnecter réseau
   - Vérifier synchronisation

---

### **Formation Agent Finance**

1. Créer opération avec facture validée :
   ```javascript
   createFictiveOperation({
     completeWorkflow: true,
     generateInvoice: true,
     generatePayment: false,
   });
   ```

2. Formation paiement :
   - Ouvrir la facture
   - Enregistrer paiement (4 modes)
   - Valider (Super Admin)
   - Vérifier dashboard

---

## 🐛 Dépannage

### **Les données n'apparaissent pas**

**Solution :** Rafraîchir la page (F5)

Le générateur crée les données dans `localStorage` mais les composants React ont besoin d'un refresh pour les charger.

---

### **Erreur "Cannot find module"**

**Solution :** Vérifier que les imports sont corrects :

```typescript
// ✅ Correct
import { createFictiveOperationComplete } from '../../shared/utils/fictiveDataGenerator';

// ❌ Incorrect
import { createFictiveOperation } from './fictiveDataGenerator';
```

---

### **Les numéros de factures se chevauchent**

**Solution :** Le générateur utilise des compteurs indépendants. C'est normal en environnement de test.

Pour réinitialiser les compteurs :

```javascript
localStorage.removeItem('ivos_operations_counter_v1');
```

---

## 📈 Statistiques

Le panneau d'administration affiche en temps réel :
- 📋 Nombre d'opérations
- 💰 Nombre de factures
- 💳 Nombre de paiements

---

## ✅ Checklist de Test

- [ ] Créer 1 opération complète
- [ ] Vérifier workflow 9 étapes (100%)
- [ ] Vérifier facture générée automatiquement
- [ ] Vérifier paiement enregistré
- [ ] Vérifier dashboard finance mis à jour
- [ ] Créer 1 opération en cours
- [ ] Vérifier workflow incomplet (67%)
- [ ] Compléter manuellement les étapes manquantes
- [ ] Créer 10 opérations variées
- [ ] Tester filtres par statut
- [ ] Tester filtres par client
- [ ] Supprimer toutes les données
- [ ] Vérifier que tout est bien supprimé

---

## 🎉 Prêt à Tester !

Le système est maintenant équipé d'un générateur de données complet pour valider le flux **Terrain → Comptabilité → Trésorerie**.

**Prochaine étape :** Intégrer le panneau dans votre interface et commencer les tests ! 🚀
