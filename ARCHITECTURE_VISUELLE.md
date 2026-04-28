# 🏗️ ARCHITECTURE SYSTÈME — Vue d'Ensemble

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    SYSTÈME TERRAIN-COMPTABILITÉ-TRÉSORERIE                ║
║                          Architecture Complète                            ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────┐
│                          COUCHE PRÉSENTATION (UI)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │  BSDForm         │  │  InvoicesPage    │  │  FinancePage     │      │
│  │  Intégré         │  │  Intégré         │  │  Dashboard       │      │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤      │
│  │ • Auto-Save      │  │ • Liste Factures │  │ • KPIs Paiements │      │
│  │ • Workflow 9     │  │ • Paiements      │  │ • Graphiques     │      │
│  │ • Hors-ligne     │  │ • Validation     │  │ • Stats          │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│           │                     │                      │                 │
│           └─────────────────────┴──────────────────────┘                │
│                                 │                                        │
└─────────────────────────────────┼────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼────────────────────────────────────────┐
│                          COUCHE COMPOSANTS                               │
├─────────────────────────────────┼────────────────────────────────────────┤
│                                 │                                        │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐            │
│  │ AutoSave       │  │ Workflow       │  │ PaymentForm    │            │
│  │ Indicator      │  │ Stepper        │  │                │            │
│  ├────────────────┤  ├────────────────┤  ├────────────────┤            │
│  │ 💾 Saving...   │  │ [1][2][3]...   │  │ 4 Modes        │            │
│  │ ✅ Saved       │  │ Progress: 67%  │  │ Validation     │            │
│  │ ❌ Error       │  │ Étape 6/9      │  │ Form           │            │
│  └────────────────┘  └────────────────┘  └────────────────┘            │
│           │                   │                   │                     │
│  ┌────────────────────────────┴───────────────────┴──────────┐         │
│  │                      PaymentList                           │         │
│  │  • Filtres (Statut, Mode)                                │         │
│  │  • Actions (Valider, Encaisser, Rejeter)                 │         │
│  │  • Modal Détails                                         │         │
│  └───────────────────────────────────────────────────────────┘         │
│                                 │                                        │
└─────────────────────────────────┼────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼────────────────────────────────────────┐
│                          COUCHE SERVICES                                 │
├─────────────────────────────────┼────────────────────────────────────────┤
│                                 │                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   autoSaveService.ts                            │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • autoSave(key, data, saveFn, options)                         │   │
│  │ • forceSave(key, data, saveFn)                                 │   │
│  │ • useAutoSave() hook                                           │   │
│  │ • Event: ivos_autosave_status                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                 │                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   offlineService.ts                             │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • saveBSDDraft(operationId, data)                              │   │
│  │ • addPendingAction(action, entity, data)                       │   │
│  │ • syncAll() → auto au retour en ligne                          │   │
│  │ • Event: ivos_sync_complete                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                 │                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   paymentService.ts                             │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • createPayment(invoice, montant, method, details)             │   │
│  │ • validatePayment(paymentId, validator)                        │   │
│  │ • markAsEncaisse(paymentId)                                    │   │
│  │ • getPaymentStats()                                            │   │
│  │ • Event: ivos_payment_change                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                 │                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   workflowService.ts                            │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • getCurrentStep(data): 1-9                                    │   │
│  │ • getWorkflowProgress(data): 0-100%                            │   │
│  │ • canUserEditStep(step, role, status): boolean                 │   │
│  │ • isStepComplete(step, data): boolean                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                 │                                        │
└─────────────────────────────────┼────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼────────────────────────────────────────┐
│                          COUCHE STOCKAGE                                 │
├─────────────────────────────────┼────────────────────────────────────────┤
│                                 │                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │  localStorage    │  │  IndexedDB       │  │  Events          │      │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤      │
│  │ • Paiements      │  │ • BSD Drafts     │  │ • payment_change │      │
│  │ • Factures       │  │ • Actions Queue  │  │ • invoice_change │      │
│  │ • Opérations     │  │ • Sync Offline   │  │ • sync_complete  │      │
│  │ • Budget         │  │                  │  │ • autosave_status│      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│                                 │                                        │
└─────────────────────────────────┼────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          FLUX DE DONNÉES                                 │
└─────────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════════════
                              WORKFLOW COMPLET
════════════════════════════════════════════════════════════════════════════

1. CRÉATION BSD (Bureau)
   │
   ├─► Étape 1-4 : Saisie manuelle
   │   └─► autoSave → localStorage (debounce 1.5s)
   │
   └─► AutoSaveIndicator : "💾 Enregistrement..."

2. TERRAIN (Chauffeur Tablette)
   │
   ├─► Mode Hors-ligne détecté
   │   └─► Badge: "🔴 Hors ligne"
   │
   ├─► Étape 5 : Signature Producteur (AUTO)
   ├─► Étape 6 : Pesée (Manuel)
   │   └─► offlineService.saveBSDDraft()
   │   └─► IndexedDB: bsd-drafts
   │   └─► Badge: "🔴 Hors ligne - 1 en attente"
   │
   ├─► Étape 7 : Signature Chauffeur (AUTO)
   │   └─► Badge: "🔴 Hors ligne - 2 en attente"
   │
   └─► Retour en ligne
       └─► offlineService.syncAll() automatique
       └─► Badge: "🟢 En ligne - 0 en attente"
       └─► Event: ivos_sync_complete

3. RÉCEPTION
   │
   ├─► Étape 8 : Réception Site
   ├─► Étape 9 : Traitement Final
   │
   └─► Validation → Workflow 100%
       └─► Déclenche Facturation Automatique

4. FACTURATION
   │
   ├─► createInvoiceFromWorkflow()
   │   └─► Calcul: Type Déchet × Unités
   │   └─► Numéro: FAC-2026-XXXX
   │   └─► Status: À Valider
   │
   └─► Notification: "💰 Nouvelle facture à valider"
       └─► Event: ivos_invoice_change

5. VALIDATION FACTURE (Super Admin)
   │
   ├─► Signature électronique
   │   └─► Status: Validée
   │   └─► Read-only: true
   │
   └─► Event: ivos_invoice_change

6. SAISIE PAIEMENT (Agent Finance)
   │
   ├─► PaymentForm
   │   ├─► Mode: Virement / Chèque / Espèces / Autre
   │   ├─► Montant
   │   └─► Détails spécifiques
   │
   └─► createPayment()
       └─► Status: En Attente
       └─► Event: ivos_payment_change

7. VALIDATION PAIEMENT (Super Admin)
   │
   ├─► validatePayment()
   │   └─► Status: Validé
   │   └─► Facture → Status: Payée
   │
   └─► Event: ivos_payment_change + ivos_invoice_change

8. ENCAISSEMENT
   │
   ├─► markAsEncaisse()
   │   └─► Status: Encaissé
   │
   └─► Dashboard Finance mis à jour automatiquement
       └─► Total Encaissé + Stats

════════════════════════════════════════════════════════════════════════════
                            ÉVÉNEMENTS SYSTÈME
════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│ Event: ivos_autosave_status                                     │
├─────────────────────────────────────────────────────────────────┤
│ Déclenché par: autoSaveService                                  │
│ Payload: { key, state: { status, lastSaved, error } }          │
│ Écouté par: AutoSaveIndicator                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Event: ivos_sync_complete                                       │
├─────────────────────────────────────────────────────────────────┤
│ Déclenché par: offlineService.syncAll()                        │
│ Payload: { syncedCount: number }                               │
│ Écouté par: BSDForm, Dashboard                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Event: ivos_invoice_change                                      │
├─────────────────────────────────────────────────────────────────┤
│ Déclenché par: workflowInvoiceService                          │
│ Payload: (none)                                                 │
│ Écouté par: InvoicesPage, FinancePage                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Event: ivos_payment_change                                      │
├─────────────────────────────────────────────────────────────────┤
│ Déclenché par: paymentService                                  │
│ Payload: (none)                                                 │
│ Écouté par: PaymentList, InvoicesPage, FinancePage            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Event: ivos_budget_updated                                      │
├─────────────────────────────────────────────────────────────────┤
│ Déclenché par: budgetService                                   │
│ Payload: { detail: BudgetConfig }                              │
│ Écouté par: FinancePage                                        │
└─────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════════════
                          PERMISSIONS & SÉCURITÉ
════════════════════════════════════════════════════════════════════════════

┌─────────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Rôle                │ Workflow │ Factures │ Paiement │ Dashboard│
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Directeur Général   │ ✅ Tous  │ ✅ Sign  │ ✅ Valid │ ✅ Full  │
│ Admin               │ ✅ 1-4   │ 📖 Read  │ ✏️ Saisie│ ✅ Full  │
│ Dir. Opérations     │ ✅ 1-4,8-9│ 📖 Read │ 📖 Read  │ ✅ Full  │
│ Agent Exploitation  │ ✅ 1-4   │ ❌       │ ❌       │ ❌       │
│ Chauffeur           │ ✅ 5-7   │ ❌       │ ❌       │ ❌       │
│ Agent Réception     │ ✅ 8-9   │ ❌       │ ❌       │ ❌       │
│ Agent Finance       │ ❌       │ 📖 Read  │ ✏️ Saisie│ 📖 Read  │
└─────────────────────┴──────────┴──────────┴──────────┴──────────┘

Légende:
✅ = Accès complet
✏️ = Création/Modification
📖 = Lecture seule
❌ = Aucun accès

════════════════════════════════════════════════════════════════════════════
                            STOCKAGE DONNÉES
════════════════════════════════════════════════════════════════════════════

localStorage (Format JSON):
├── ivos_payments_v1           → Payment[]
├── ivos_workflow_invoices_v1  → WorkflowInvoice[]
├── ivos_operations_v1         → Operation[]
└── ivos_budget_annual_v1      → BudgetConfig

IndexedDB (ivos-offline-db):
├── Store: bsd-drafts
│   └── { id, operationId, data, createdAt, updatedAt, synced }
│
└── Store: pending-actions
    └── { id, action, entity, data, timestamp, synced }

════════════════════════════════════════════════════════════════════════════
                          DÉPENDANCES EXTERNES
════════════════════════════════════════════════════════════════════════════

Production:
├── idb                     → IndexedDB wrapper
├── react                   → UI Framework
├── lucide-react           → Icons
└── tailwindcss            → Styling

Optionnelles (Phase 2):
├── @supabase/supabase-js  → Real-time sync
├── react-signature-canvas → Signature électronique
└── firebase               → Push notifications

════════════════════════════════════════════════════════════════════════════
                          PERFORMANCES
════════════════════════════════════════════════════════════════════════════

Auto-Save:
├── Debounce: 1.5s
├── Force Save: < 100ms
└── IndexedDB Write: < 50ms

Offline Sync:
├── Batch Size: Illimité
├── Retry: Automatique (online event)
└── Cleanup: 7 jours

Events:
├── Propagation: Synchrone
├── Listeners: Multi-instances
└── Memory: Auto cleanup (unmount)

════════════════════════════════════════════════════════════════════════════
```
