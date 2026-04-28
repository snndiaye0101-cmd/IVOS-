# ⚡ DÉMARRAGE IMMÉDIAT — 30 Secondes

## 🎯 Test Ultra-Rapide (Méthode 1)

### **Fichier HTML Standalone**

1. **Ouvrir** `test-data-generator.html` dans votre navigateur
2. **Cliquer** sur "Opération Complète"
3. **Rafraîchir** votre application IVOS

✅ **C'est tout !** Une opération complète avec facture et paiement a été créée.

---

## 🔥 Ou via Console (Méthode 2)

### **1. Ouvrir votre application IVOS**
### **2. Ouvrir la console (F12)**
### **3. Copier-coller ce code :**

```javascript
// ═══════════════════════════════════════════════════════════════════
// CRÉER 1 OPÉRATION COMPLÈTE
// ═══════════════════════════════════════════════════════════════════

const operations = JSON.parse(localStorage.getItem('ivos_operations_v1') || '[]');
const invoices = JSON.parse(localStorage.getItem('ivos_workflow_invoices_v1') || '[]');
const payments = JSON.parse(localStorage.getItem('ivos_payments_v1') || '[]');

const counters = JSON.parse(localStorage.getItem('ivos_operations_counter_v1') || '{}');
const year = new Date().getFullYear();
const next = (counters[year] || 0) + 1;
counters[year] = next;
localStorage.setItem('ivos_operations_counter_v1', JSON.stringify(counters));

const numero = `BSD-${year}-${String(next).padStart(4, '0')}`;
const now = new Date().toISOString();
const opId = `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const quantity = 2500;

// OPÉRATION
const operation = {
  id: opId,
  numero,
  client: 'Total Sénégal',
  clientNom: 'Amadou Diallo',
  clientTelephone: '+221 77 123 45 67',
  clientAdresse: 'Zone Industrielle, Dakar',
  typeDechet: 'Huiles usagées hydrocarbures',
  etatDechet: 'liquide',
  typeConditionnement: 'citerne',
  nombreColis: '1',
  quantiteKg: '2500',
  vehicule: 'Camion Citerne 20m³',
  immatriculation: 'DK-1234-AB',
  chauffeur: 'Mamadou Ndiaye',
  dateDepart: now,
  status: 'cloturee',
  createdBy: 'sample_10',
  createdAt: now,
  updatedAt: now,
  bsdGeneratedAt: now,
  bsdData: { validatedAt: now, poidsReel: '2550' },
};

operations.unshift(operation);
localStorage.setItem('ivos_operations_v1', JSON.stringify(operations));

// FACTURE
const invId = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const numeroFac = `FAC-${year}-${String(invoices.length + 1).padStart(4, '0')}`;
const montantHT = 500 * 2550;

const invoice = {
  id: invId,
  missionId: opId,
  missionNumero: numero,
  numeroOfficiel: numeroFac,
  clientNom: 'Total Sénégal',
  quantite: 2550,
  unite: 'kg',
  prixUnitaire: 500,
  montantHT,
  status: 'payee',
  createdAt: now,
  validatedAt: now,
  validatedBy: 'Samba (DG)',
};

invoices.unshift(invoice);
localStorage.setItem('ivos_workflow_invoices_v1', JSON.stringify(invoices));

// PAIEMENT
const payId = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const payment = {
  id: payId,
  invoiceId: invId,
  invoiceNumero: numeroFac,
  clientNom: 'Total Sénégal',
  montant: montantHT,
  method: 'virement',
  details: {
    referenceBancaire: `VIR-${year}-12345`,
    banqueEmettrice: 'CBAO Sénégal',
  },
  status: 'encaisse',
  dateCreation: now,
  saisiePar: 'Agent Finance',
  validePar: 'Samba (DG)',
};

payments.unshift(payment);
localStorage.setItem('ivos_payments_v1', JSON.stringify(payments));

console.log('✅ OPÉRATION COMPLÈTE CRÉÉE !');
console.log('📋 Opération:', numero);
console.log('💰 Facture:', numeroFac, `(${montantHT.toLocaleString()} FCFA)`);
console.log('💳 Paiement:', payId);
console.log('👉 Rafraîchissez la page (F5)');
```

### **4. Rafraîchir la page (F5)**

---

## 📊 Vérification

Après avoir créé des données, vérifiez :

✅ **Page Opérations** → Nouvelle opération `BSD-2026-XXXX`  
✅ **Page Factures** → Nouvelle facture `FAC-2026-XXXX` (status: payee)  
✅ **Page Finances** → Nouveau paiement (status: encaisse)  
✅ **Dashboard Finance** → Total encaissé mis à jour  

---

## 🎯 Commandes Rapides Supplémentaires

### **Créer 5 opérations variées**

```javascript
for(let i = 0; i < 5; i++) {
  const operations = JSON.parse(localStorage.getItem('ivos_operations_v1') || '[]');
  const counters = JSON.parse(localStorage.getItem('ivos_operations_counter_v1') || '{}');
  const year = new Date().getFullYear();
  const next = (counters[year] || 0) + 1;
  counters[year] = next;
  localStorage.setItem('ivos_operations_counter_v1', JSON.stringify(counters));
  
  operations.unshift({
    id: `op-${Date.now()}-${i}`,
    numero: `BSD-${year}-${String(next).padStart(4, '0')}`,
    client: ['Total', 'SAR', 'Shell', 'Petrosen', 'Oryx'][i],
    typeDechet: 'Huiles usagées',
    quantiteKg: '2000',
    vehicule: 'Camion',
    chauffeur: 'Chauffeur',
    dateDepart: new Date().toISOString(),
    status: 'cloturee',
    createdBy: 'sample_10',
    createdAt: new Date().toISOString(),
    bsdGeneratedAt: new Date().toISOString(),
  });
  
  localStorage.setItem('ivos_operations_v1', JSON.stringify(operations));
}
console.log('✅ 5 opérations créées !');
```

---

### **Voir statistiques**

```javascript
const ops = JSON.parse(localStorage.getItem('ivos_operations_v1') || '[]');
const invs = JSON.parse(localStorage.getItem('ivos_workflow_invoices_v1') || '[]');
const pays = JSON.parse(localStorage.getItem('ivos_payments_v1') || '[]');

console.log('📊 STATISTIQUES');
console.log('📋 Opérations:', ops.length);
console.log('💰 Factures:', invs.length);
console.log('💳 Paiements:', pays.length);
```

---

### **Supprimer tout**

```javascript
if(confirm('Supprimer tout ?')) {
  localStorage.removeItem('ivos_operations_v1');
  localStorage.removeItem('ivos_operations_counter_v1');
  localStorage.removeItem('ivos_workflow_invoices_v1');
  localStorage.removeItem('ivos_payments_v1');
  console.log('✅ Tout supprimé !');
  location.reload();
}
```

---

## 🚀 Prêt !

**Vous pouvez maintenant tester le système complet en 30 secondes !**

Choisissez votre méthode préférée :
- 🎨 **Fichier HTML** : Interface visuelle, pas de code
- ⚡ **Console** : Ultra-rapide, copier-coller

**Bon test ! 🎉**
