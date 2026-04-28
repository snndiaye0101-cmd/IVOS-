# 🚀 GUIDE DE DÉMARRAGE RAPIDE

## Système Terrain-Comptabilité-Trésorerie

---

## ✅ Fichiers Créés

### Services (Backend Logic)
```
src/shared/services/
├── autoSaveService.ts          ✅ Auto-save temps réel avec indicateur
└── offlineService.ts            ✅ Mode hors-ligne IndexedDB

src/features/finances/services/
└── paymentService.ts            ✅ Gestion paiements (4 modes)

src/features/exploitation/services/
└── workflowService.ts           ✅ Workflow 9 étapes BSD
```

### Composants (UI)
```
src/shared/components/
├── AutoSaveIndicator.tsx        ✅ Indicateur sauvegarde (top-right)
└── WorkflowStepper.tsx          ✅ Progression workflow visuelle

src/features/finances/components/
├── PaymentForm.tsx              ✅ Formulaire saisie paiement
└── PaymentList.tsx              ✅ Liste paiements + actions
```

### Exemples d'Intégration
```
src/features/exploitation/components/
└── BSDFormIntegrated.tsx        ✅ Exemple BSD complet

src/features/finances/pages/
└── InvoicesPageIntegrated.tsx   ✅ Exemple facturation complète
```

### Documentation
```
SYSTEME_TERRAIN_COMPTA_TRESORERIE.md  ✅ Doc technique complète
GUIDE_DEMARRAGE.md                    ✅ Ce guide
```

---

## 🎯 Fonctionnalités Implémentées

### 1. ✅ Synchronisation Temps Réel
- Auto-save avec debounce (1.5s)
- Indicateur visuel : `💾 Enregistrement...` / `✅ Enregistré` / `❌ Erreur`
- Hook React `useAutoSave` prêt à l'emploi

### 2. ✅ Mode Hors-Ligne
- IndexedDB pour stockage local (chauffeurs tablette)
- File d'attente d'actions (create/update/delete)
- Synchronisation automatique au retour réseau
- Badge "X actions en attente"

### 3. ✅ Workflow 9 Étapes
- **Étapes 1-4** : Bureau (producteur, collecteur, déchet, conditionnement)
- **Étapes 5-7** : Chauffeur (signature producteur, pesée, signature chauffeur)
- **Étapes 8-9** : Réception (réception site, traitement)
- Gestion des permissions par rôle
- Progression visuelle 0-100%

### 4. ✅ Facturation Automatique
- Génération facture à la validation Étape 9
- Calcul automatique : Type Déchet × Unités de Facturation
- Numéro `FAC-2026-XXXX`
- Status : `À Valider` → `Validée` → `Envoyée` → `Payée`

### 5. ✅ Circuit d'Approbation
- Signature électronique Super Admin (Samba)
- Facture → Read-only après validation
- Déverrouillage Super Admin uniquement

### 6. ✅ Module de Paiement
- **4 Modes** : Virement, Chèque, Espèces, Autre
- Champs conditionnels par mode
- Workflow : `En Attente` → `Validé` → `Encaissé`
- Mise à jour automatique Dashboard Finance

---

## 🔧 Installation

### 1. Dépendances NPM

```bash
# Package idb pour IndexedDB (déjà installé)
npm install idb --legacy-peer-deps
```

### 2. Vérification TypeScript

```bash
npx tsc --noEmit
```

**Résultat attendu** : `No errors found` ✅

---

## 🎨 Intégration dans Votre Code

### A. BSDForm avec Auto-Save

**Remplacer dans** : `src/features/exploitation/components/BSDForm.tsx`

```tsx
import { useAutoSave } from '../../../shared/services/autoSaveService';
import AutoSaveIndicator from '../../../shared/components/AutoSaveIndicator';
import WorkflowStepper from '../../../shared/components/WorkflowStepper';

export default function BSDForm({ operation, user, onSave }: BSDFormProps) {
  const [form, setForm] = useState(operation.bsdData ?? { /* ... */ });

  // Auto-save
  const saveState = useAutoSave(
    `bsd-${operation.id}`,
    form,
    async (data) => onSave(data),
    { enabled: !isReadOnly }
  );

  return (
    <>
      <AutoSaveIndicator {...saveState} />
      
      <div className="flex gap-6">
        <div className="flex-1">
          {/* Formulaire BSD */}
        </div>
        
        <div className="w-80">
          <WorkflowStepper 
            bsdData={form}
            currentUserRole={user?.role || ''}
          />
        </div>
      </div>
    </>
  );
}
```

---

### B. Page Factures avec Paiements

**Créer ou modifier** : `src/features/finances/pages/InvoicesPage.tsx`

```tsx
import { useState } from 'react';
import { getWorkflowInvoices } from '../services/workflowInvoiceService';
import { getPaymentStats } from '../services/paymentService';
import PaymentForm from '../components/PaymentForm';
import PaymentList from '../components/PaymentList';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState(getWorkflowInvoices());
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  
  const stats = getPaymentStats();

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KPI label="Total Encaissé" value={stats.montantEncaisse} />
        <KPI label="En Attente" value={stats.montantEnAttente} />
        {/* ... */}
      </div>

      {/* Liste Factures */}
      {invoices.map(invoice => (
        <div key={invoice.id}>
          {/* ... */}
          <button onClick={() => {
            setSelectedInvoice(invoice);
            setShowPaymentForm(true);
          }}>
            💳 Enregistrer Paiement
          </button>
        </div>
      ))}

      {/* Tous les Paiements */}
      <PaymentList 
        showActions={isSuperAdmin}
        currentUserRole={user?.role}
        currentUserName={user?.name}
      />

      {/* Modal Paiement */}
      {showPaymentForm && (
        <PaymentForm
          invoice={selectedInvoice}
          onClose={() => setShowPaymentForm(false)}
          onSuccess={() => {
            setShowPaymentForm(false);
            loadInvoices();
          }}
          currentUserName={user?.name}
        />
      )}
    </div>
  );
}
```

---

### C. Dashboard Finance - Ajout Statistiques Paiements

**Dans** : `src/features/finances/pages/FinancePage.tsx`

```tsx
import { getPaymentStats, getTotalEncaisse } from '../services/paymentService';

export default function FinancePage() {
  const paymentStats = getPaymentStats();
  const totalEncaisse = paymentStats.montantEncaisse;

  // Ajouter dans les KPIs
  <div className="grid grid-cols-4 gap-4">
    {/* KPI existants */}
    
    {/* Nouveau KPI */}
    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
      <div className="text-3xl font-bold">
        {totalEncaisse.toLocaleString('fr-FR')} FCFA
      </div>
      <div className="text-sm text-white/80">Total Encaissé</div>
      <div className="text-xs text-white/60 mt-1">
        {paymentStats.encaisses} paiements
      </div>
    </div>
  </div>

  // Ajouter section Paiements par Mode
  <div className="grid grid-cols-2 gap-4">
    {Object.entries(paymentStats.parMode).map(([mode, count]) => (
      <div key={mode} className="bg-white p-4 rounded-xl border">
        <div className="text-2xl font-bold">{count}</div>
        <div className="text-sm text-gray-600">
          {mode === 'virement' && '💳 Virement'}
          {mode === 'cheque' && '📝 Chèque'}
          {mode === 'especes' && '💵 Espèces'}
          {mode === 'autre' && '📄 Autre'}
        </div>
      </div>
    ))}
  </div>
}
```

---

## 📱 Utilisation Terrain (Chauffeur Tablette)

### Scénario : Collecte Hors-Ligne

1. **Avant départ** : Chauffeur reçoit BSD (Étapes 1-4 complètes)

2. **Sur terrain (hors réseau)** :
   ```
   - Activer Mode Avion (simulation)
   - Ouvrir BSD
   - Badge "🔴 Hors ligne - 0 en attente" affiché
   - Saisir Étape 6 : Poids Réel
   - Auto-save → IndexedDB
   - Badge "🔴 Hors ligne - 1 en attente"
   - Signer Étape 7
   - Badge "🔴 Hors ligne - 2 en attente"
   ```

3. **Retour au bureau (réseau rétabli)** :
   ```
   - Badge passe à "🟢 En ligne"
   - Synchronisation automatique
   - Event "ivos_sync_complete" déclenché
   - Badge "🟢 En ligne - 0 en attente"
   - Données visibles par Bureau et Réception
   ```

---

## 💰 Workflow Paiement Complet

### Exemple : Client ABC - 5M FCFA

```
1. Réception valide Étape 9 BSD
   ↓
2. Facturation automatique
   - Facture FAC-2026-0123
   - Status: À Valider
   - Montant: 5 000 000 FCFA
   ↓
3. Super Admin (Samba) signe
   - Status: Validée
   - Facture → Read-only
   ↓
4. Agent Finance enregistre paiement
   - Mode: Virement
   - Réf: VIR-2026-45678
   - Banque: CBAO
   - Status Paiement: En Attente
   ↓
5. Super Admin valide paiement
   - Status Paiement: Validé
   - Facture → Status: Payée
   ↓
6. Encaissement confirmé
   - Status Paiement: Encaissé
   - Dashboard Finance mis à jour
   - +5M FCFA dans "Total Encaissé"
```

---

## 🔐 Permissions par Rôle

| Rôle | BSD Workflow | Validation Facture | Paiement |
|------|--------------|-------------------|----------|
| **Directeur Général** | Tous | ✅ Signature | ✅ Validation |
| **Admin** | Bureau (1-4) | ❌ | Saisie uniquement |
| **Dir. Opérations** | Bureau + Réception | ❌ | Lecture |
| **Agent Exploitation** | Bureau (1-4) | ❌ | ❌ |
| **Chauffeur** | Terrain (5-7) | ❌ | ❌ |
| **Agent Réception** | Réception (8-9) | ❌ | ❌ |
| **Agent Finance** | ❌ | ❌ | Saisie uniquement |

---

## 🧪 Tests Recommandés

### Test 1 : Auto-Save

```bash
1. Ouvrir un BSD
2. Modifier un champ
3. Attendre 1.5s
4. Vérifier badge "💾 Enregistrement en cours..."
5. Badge devient "✅ Modifications enregistrées"
6. Actualiser la page
7. Vérifier que la modification est sauvegardée
```

### Test 2 : Hors-Ligne

```bash
1. Ouvrir BSD
2. F12 → Network → Offline
3. Modifier un champ
4. Vérifier badge "🔴 Hors ligne - 1 en attente"
5. Retour Online
6. Vérifier synchronisation automatique
7. Console : "✅ Synchronisation terminée: 1 actions"
```

### Test 3 : Paiement

```bash
1. Créer une facture (via validation BSD)
2. Super Admin valide facture
3. Cliquer "Enregistrer Paiement"
4. Remplir formulaire Virement
5. Sauvegarder
6. Vérifier dans PaymentList : Status "En Attente"
7. Super Admin valide paiement
8. Vérifier facture : Status "Payée"
9. Dashboard Finance : montant ajouté
```

---

## 📊 Données de Test

### Insérer des Paiements de Test

```typescript
import { createPayment } from './src/features/finances/services/paymentService';

// Paiement Virement
createPayment(
  'invoice-123',
  'FAC-2026-0001',
  'Client ABC',
  5000000,
  'virement',
  {
    referenceBancaire: 'VIR-2026-12345',
    banqueEmettrice: 'CBAO'
  },
  'Jean Dupont',
  'Paiement partiel'
);

// Paiement Espèces
createPayment(
  'invoice-456',
  'FAC-2026-0002',
  'Client XYZ',
  2500000,
  'especes',
  {
    nomRemettant: 'Marie Martin'
  },
  'Jean Dupont'
);
```

---

## 🐛 Dépannage

### Problème : Auto-save ne fonctionne pas

**Solution** :
```tsx
// Vérifier que enabled=true
const saveState = useAutoSave(
  key,
  data,
  saveFn,
  { enabled: true } // ← Important
);
```

### Problème : IndexedDB vide après refresh

**Solution** :
```typescript
// Vérifier initialisation
import { offlineService } from './offlineService';

// Dans App.tsx ou main.tsx
useEffect(() => {
  offlineService.init();
}, []);
```

### Problème : Paiements ne s'affichent pas

**Solution** :
```tsx
// Vérifier event listener
useEffect(() => {
  const handler = () => loadPayments();
  window.addEventListener('ivos_payment_change', handler);
  return () => window.removeEventListener('ivos_payment_change', handler);
}, []);
```

---

## 🚀 Prochaines Étapes (Optionnel)

### Phase 2 : Supabase Realtime

Remplacer `localStorage` par Supabase pour sync multi-utilisateurs temps réel.

```typescript
// supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

// Écouter changements
supabase
  .channel('bsd-changes')
  .on('postgres_changes', { 
    event: 'UPDATE', 
    schema: 'public', 
    table: 'operations' 
  }, (payload) => {
    console.log('BSD mis à jour:', payload);
    // Recharger données
  })
  .subscribe();
```

### Phase 2 : Signature Électronique

```tsx
import SignatureCanvas from 'react-signature-canvas';

<SignatureCanvas
  onEnd={() => {
    const signature = canvas.toDataURL();
    updateField('signatureChauffeur', signature);
  }}
/>
```

### Phase 3 : Notifications Push

```typescript
// notificationService.ts
export function sendPushNotification(userId: string, message: string) {
  // Firebase Cloud Messaging ou OneSignal
}

// Déclencher après validation paiement
validatePayment(paymentId, validatorName).then(() => {
  sendPushNotification(
    agentFinanceId,
    `💰 Paiement validé pour ${invoice.clientNom}`
  );
});
```

---

## 📚 Ressources

- **Documentation Complète** : `SYSTEME_TERRAIN_COMPTA_TRESORERIE.md`
- **Exemple BSD** : `src/features/exploitation/components/BSDFormIntegrated.tsx`
- **Exemple Factures** : `src/features/finances/pages/InvoicesPageIntegrated.tsx`

---

## ✅ Checklist de Déploiement

- [ ] `npm install idb --legacy-peer-deps`
- [ ] `npx tsc --noEmit` → 0 erreurs
- [ ] Intégrer `AutoSaveIndicator` dans BSDForm
- [ ] Intégrer `WorkflowStepper` dans BSDForm
- [ ] Ajouter `PaymentForm` dans page Factures
- [ ] Ajouter statistiques paiements dans Dashboard Finance
- [ ] Tester auto-save (modifier champ, attendre 1.5s)
- [ ] Tester hors-ligne (F12 → Network → Offline)
- [ ] Tester paiement complet (création → validation → encaissement)
- [ ] Vérifier permissions par rôle
- [ ] Former équipe (chauffeurs, agents finance, Super Admin)

---

**Système opérationnel ! 🎉**

Pour toute question, consulter `SYSTEME_TERRAIN_COMPTA_TRESORERIE.md`
