# 🧾 Module de Gestion des Factures avec Intégration BSD

## 📋 Vue d'ensemble

Le module **InvoicesPage** est une page de gestion complète des factures intégrant les références BSD (Bordereaux de Suivi des Déchets). Ce module remplace l'ancien affichage du Dashboard Finance dans le menu Facturation.

---

## 🎯 Fonctionnalités Principales

### 1. ✅ Tableau de Gestion des Factures (Full-Width)

Le tableau affiche toutes les factures avec les colonnes suivantes :

| Colonne                | Type               | Description                                       |
| ---------------------- | ------------------ | ------------------------------------------------- |
| **N° Facture**         | String             | Format: FAC-2026-XXXX (auto-généré)               |
| **Référence BSD**      | String (cliquable) | Numéro du BSD lié (BSD-YYYYMM-XXXX)               |
| **Date**               | Date               | Date d'émission de la facture                     |
| **Client**             | String             | Nom du client + SIRET optionnel                   |
| **Montant HT**         | Number             | Montant Hors Taxe                                 |
| **Montant TTC**        | Number             | Montant Toutes Taxes Comprises                    |
| **Statut de Paiement** | Badge              | Non payé / Payé / En attente / Partiellement payé |
| **Mode de Règlement**  | String             | Virement / Chèque / Espèces / Carte / Prélèvement |
| **Actions**            | Boutons            | Télécharger PDF, Marquer payé, Supprimer          |

---

### 2. 🔗 Intégration BSD

- **Lien cliquable** : Cliquer sur le numéro de BSD ouvre le PDF du BSD correspondant dans un nouvel onglet
- **Génération automatique** : Lorsqu'un BSD atteint la Section 9 (signature finale), une facture est automatiquement générée
- **Référence croisée** : Chaque facture conserve la référence du BSD dans la base de données et le PDF

#### Automatisation (Section 9 complète)

```typescript
import { generateInvoiceFromBSD } from '../services/invoiceService';

// Après validation Section 9 d'un BSD
const invoice = generateInvoiceFromBSD(
  bsdId,
  prixUnitaireHT, // Prix à la tonne/m³
  18, // Taux TVA (%)
  userId
);
```

---

### 3. 🔍 Filtrage & Recherche

#### Barre de Recherche Globale

- Recherche par **numéro de facture** (FAC-2026-XXXX)
- Recherche par **numéro de BSD** (BSD-202604-XXXX)
- Recherche par **nom du client**

#### Filtres Avancés

- **Statut de paiement** : Payé / Non payé / En attente / Partiellement payé
- **Mode de règlement** : Virement / Chèque / Espèces / Carte / Prélèvement / Autre
- **Plage de dates** : Date début - Date fin
- **Client spécifique** : Filtrage par ID client

---

### 4. 📊 Statistiques en Temps Réel

Affichage de 4 cartes de synthèse :

| Carte              | Métrique             | Détails                         |
| ------------------ | -------------------- | ------------------------------- |
| **Total Factures** | Nombre + Montant TTC | Toutes les factures émises      |
| **Payées**         | Nombre + Montant TTC | Factures avec statut "Payé"     |
| **En Attente**     | Nombre + Montant TTC | Factures en cours de validation |
| **Non Payées**     | Nombre + Montant TTC | Factures impayées               |

---

### 5. 📄 Génération PDF Automatique

Chaque facture peut être téléchargée en PDF avec :

- **En-tête** : Logo et informations IVOS
- **Numéro de facture** : FAC-2026-XXXX
- **Référence BSD** : Encadré visible (si existe)
- **Informations client** : Nom, adresse, SIRET
- **Lignes de facturation** : Description, quantité, unité, prix unitaire, total HT
- **Totaux** : Total HT, TVA, Total TTC
- **Statut de paiement** : Couleur (vert si payé, rouge si non payé)
- **Notes** : Informations complémentaires

```typescript
import { generateInvoicePDF } from '../services/invoiceService';

// Télécharger le PDF d'une facture
generateInvoicePDF(invoiceId);
```

---

### 6. 🎨 Barre de Synthèse Fixe (Bottom Bar)

Barre fixée en bas d'écran affichant en temps réel :

| Métrique       | Description                       |
| -------------- | --------------------------------- |
| **Total TTC**  | Somme de toutes les factures      |
| **En Attente** | Montant en attente de validation  |
| **Payées**     | Montant total des factures payées |

**Design** : Dégradé indigo-blue avec texte blanc, toujours visible lors du défilement

---

## 🗂️ Structure des Fichiers

```
src/features/finances/
├── pages/
│   ├── FinancePage.tsx          # Dashboard Finance (route /finances)
│   └── InvoicesPage.tsx         # Page Facturation (route /billing) ✨ NOUVEAU
├── services/
│   └── invoiceService.ts        # Service de gestion des factures ✨ NOUVEAU
├── types/
│   ├── finance.types.ts         # Types généraux finance
│   └── invoice.types.ts         # Types factures avec BSD ✨ NOUVEAU
└── components/
    └── UniteFacturation.tsx     # Composant unités de facturation
```

---

## 🔧 Services Disponibles

### `invoiceService.ts`

#### Fonctions de Gestion

| Fonction                              | Description                  | Paramètres                                              |
| ------------------------------------- | ---------------------------- | ------------------------------------------------------- |
| `getAllInvoices()`                    | Récupère toutes les factures | -                                                       |
| `getInvoiceById(id)`                  | Récupère une facture par ID  | `id: string`                                            |
| `searchInvoices(filters)`             | Recherche avec filtres       | `filters: InvoiceFilters`                               |
| `createInvoice(data, userId)`         | Crée une nouvelle facture    | `data: NewInvoiceData, userId: string`                  |
| `updateInvoice(id, updates, userId)`  | Met à jour une facture       | `id: string, updates: Partial<Invoice>, userId: string` |
| `markInvoiceAsPaid(id, mode, userId)` | Marque comme payée           | `id: string, mode: PaymentMethod, userId: string`       |
| `deleteInvoice(id)`                   | Supprime une facture         | `id: string`                                            |
| `getInvoiceStats()`                   | Calcule les statistiques     | -                                                       |

#### Fonctions Automatisation

| Fonction                                                       | Description                                       | Usage                       |
| -------------------------------------------------------------- | ------------------------------------------------- | --------------------------- |
| `generateInvoiceFromBSD(bsdId, prixUnitaire, tauxTVA, userId)` | Génère auto une facture depuis un BSD (Section 9) | Appelé après validation BSD |
| `generateInvoicePDF(invoiceId)`                                | Génère et télécharge le PDF de facture            | Bouton "Télécharger PDF"    |
| `generateInvoiceNumber()`                                      | Génère numéro unique FAC-2026-XXXX                | Auto (interne)              |

---

## 🧪 Comment Tester

### 1. Créer des BSD de Test

```typescript
// Dans la console navigateur ou via l'interface BSD
import { createBSD } from '@/features/exploitation/services/bsdService';

const bsd = createBSD(
  {
    operationId: 'OP-2026-0001',
    client: 'Société ABC',
    typeDechet: 'Déchets dangereux',
    codeDechet: '13 05 02*',
    quantite: 5.5,
    unite: 'tonne',
    vehicule: 'VH-001',
    chauffeur: 'Jean Dupont',
  },
  'user-id-123'
);

// Marquer Section 9 comme complète
bsd.section9Complete = true;
```

### 2. Générer des Factures Automatiquement

```typescript
import { generateInvoiceFromBSD } from '@/features/finances/services/invoiceService';

// Génère facture depuis BSD
const invoice = generateInvoiceFromBSD(
  bsd.id,
  50000, // 50 000 FCFA par tonne
  18, // TVA 18%
  'user-id-123'
);
```

### 3. Tester la Recherche

1. Accéder à **http://localhost:3001/billing**
2. Utiliser la barre de recherche :
   - Taper `FAC-2026-0001` → Trouve la facture
   - Taper `BSD-202604-0001` → Trouve par référence BSD
   - Taper `Société ABC` → Trouve par client

### 4. Tester les Filtres

1. Cliquer sur "Filtres"
2. Sélectionner **Statut** : Non payé
3. Sélectionner **Mode** : Virement
4. Vérifier que seules les factures correspondantes s'affichent

### 5. Télécharger un PDF

1. Cliquer sur l'icône **Télécharger** (Download) dans la colonne Actions
2. Vérifier que le PDF contient :
   - Numéro de facture
   - Référence BSD (encadré gris)
   - Lignes de facturation
   - Totaux HT/TVA/TTC

---

## 📊 Données de Test

Voici un exemple de données de test pour localStorage :

```typescript
// À exécuter dans la console navigateur
const sampleInvoices = [
  {
    id: 'inv-001',
    numeroFacture: 'FAC-2026-0001',
    date: '2026-04-15T10:00:00Z',
    dateEcheance: '2026-05-15T10:00:00Z',
    clientId: 'client-1',
    clientNom: 'Société ABC',
    clientSiret: '12345678901234',
    bsdReference: 'BSD-202604-0001',
    operationId: 'OP-2026-0001',
    montantHT: 275000,
    tauxTVA: 18,
    montantTVA: 49500,
    montantTTC: 324500,
    statutPaiement: 'Non payé',
    modeReglement: 'Virement',
    lignes: [
      {
        id: 'line-1',
        description: 'Gestion de déchets - Déchets dangereux (13 05 02*)',
        quantite: 5.5,
        unite: 'tonne',
        prixUnitaireHT: 50000,
        totalHT: 275000,
      },
    ],
    notes: 'Facture générée automatiquement suite à la validation du BSD BSD-202604-0001',
    createdAt: '2026-04-15T10:00:00Z',
    updatedAt: '2026-04-15T10:00:00Z',
    createdBy: 'user-123',
  },
  {
    id: 'inv-002',
    numeroFacture: 'FAC-2026-0002',
    date: '2026-04-18T14:30:00Z',
    dateEcheance: '2026-05-18T14:30:00Z',
    clientId: 'client-2',
    clientNom: 'Entreprise XYZ',
    clientSiret: '98765432109876',
    bsdReference: 'BSD-202604-0002',
    operationId: 'OP-2026-0002',
    montantHT: 180000,
    tauxTVA: 18,
    montantTVA: 32400,
    montantTTC: 212400,
    statutPaiement: 'Payé',
    modeReglement: 'Chèque',
    datePaiement: '2026-04-20T09:00:00Z',
    lignes: [
      {
        id: 'line-2',
        description: 'Gestion de déchets - Déchets non dangereux (20 03 01)',
        quantite: 3,
        unite: 'tonne',
        prixUnitaireHT: 60000,
        totalHT: 180000,
      },
    ],
    notes: 'Paiement reçu le 20/04/2026',
    createdAt: '2026-04-18T14:30:00Z',
    updatedAt: '2026-04-20T09:00:00Z',
    createdBy: 'user-123',
  },
];

localStorage.setItem('ivos_invoices_v1', JSON.stringify(sampleInvoices));
console.log('✅ Données de test chargées !');
```

---

## 🎨 Design & UX

### Fragments React

- Utilisation de `<>...</>` pour éviter les `<div>` inutiles
- Optimisation du rendu DOM

### Palette de Couleurs

- **Indigo** : Boutons principaux, en-têtes
- **Vert** : Factures payées, montants positifs
- **Rouge** : Factures non payées, alertes
- **Jaune** : Factures en attente
- **Bleu** : Liens BSD cliquables

### Responsive

- Tableau full-width avec scroll horizontal sur mobile
- Cartes statistiques en grille responsive (1 col mobile → 4 cols desktop)
- Barre de synthèse fixe adaptée mobile

---

## 🔗 Routes

| Route                | Composant          | Description                             |
| -------------------- | ------------------ | --------------------------------------- |
| `/billing`           | `InvoicesPage`     | Page de gestion des factures ✨ NOUVEAU |
| `/finances`          | `FinancePage`      | Dashboard Finance (vue d'ensemble)      |
| `/unite-facturation` | `UniteFacturation` | Configuration unités de facturation     |

---

## 🚀 Prochaines Étapes

### Phase 1 (Actuel) ✅

- [x] Créer types avec référence BSD
- [x] Créer service avec génération auto
- [x] Créer page InvoicesPage avec tableau
- [x] Intégrer filtres et recherche
- [x] Mettre à jour route /billing

### Phase 2 (À venir)

- [ ] Formulaire de création manuelle de factures
- [ ] Export Excel des factures
- [ ] Envoi email automatique des factures PDF
- [ ] Intégration système de paiement en ligne
- [ ] Rappels automatiques factures impayées
- [ ] Historique des modifications

### Phase 3 (Avancé)

- [ ] Factures récurrentes
- [ ] Devis avant facturation
- [ ] Multi-devises
- [ ] Tableau de bord analytique avancé

---

## 📞 Support

Pour toute question ou problème :

1. Vérifier les logs console (`F12` → Console)
2. Vérifier localStorage : `localStorage.getItem('ivos_invoices_v1')`
3. Vérifier que les BSD existent : `localStorage.getItem('ivos_bsd_v1')`

---

**Version** : 1.0.0  
**Date** : 21 avril 2026  
**Auteur** : Équipe IVOS
