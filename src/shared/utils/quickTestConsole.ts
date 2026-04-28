/**
 * ═══════════════════════════════════════════════════════════════════
 * 🚀 GÉNÉRATEUR DE DONNÉES FICTIVES — DÉMARRAGE RAPIDE
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Ce fichier contient tout le code nécessaire pour générer des données
 * de test complètes : Opérations → Factures → Paiements
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════
// 📋 COMMANDES RAPIDES (Copier-Coller dans la Console F12)
// ═══════════════════════════════════════════════════════════════════

/**
 * 1️⃣ CRÉER 1 OPÉRATION COMPLÈTE (Workflow + Facture + Paiement)
 */
function quickCreateComplete() {
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
  const operationId = `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  // OPÉRATION
  const operation = {
    id: operationId,
    numero,
    client: 'Total Sénégal',
    clientNom: 'Amadou Diallo',
    clientTelephone: '+221 77 123 45 67',
    clientAdresse: 'Zone Industrielle, Dakar',
    clientEmail: 'amadou.diallo@totalsenegal.com',
    typeDechet: 'Huiles usagées hydrocarbures',
    etatDechet: 'liquide',
    typeConditionnement: 'citerne',
    nombreColis: '1',
    quantiteKg: '2500',
    uniteComplementaire: '2.5 tonnes',
    vehicule: 'Camion Citerne 20m³',
    immatriculation: 'DK-1234-AB',
    chauffeur: 'Mamadou Ndiaye',
    dateDepart: now,
    observations: 'Collecte mensuelle programmée',
    status: 'cloturee',
    createdBy: 'sample_10',
    createdAt: now,
    updatedAt: now,
    bsdGeneratedAt: now,
    bsdData: {
      producteurNom: 'Total Sénégal',
      producteurAdresse: 'Zone Industrielle, Dakar',
      categorieDechet: 'Déchets Dangereux',
      codeDechet: '13-02-05',
      poidsReel: '2550',
      dateReception: now,
      destinataireNom: 'IVOS Centre de Traitement',
      modeTraitement: 'Valorisation énergétique',
      certification: `CER-${year}-${String(next).padStart(4, '0')}`,
      validatedAt: now,
      validatedBy: 'Agent Réception',
    },
  };
  
  operations.unshift(operation);
  localStorage.setItem('ivos_operations_v1', JSON.stringify(operations));
  window.dispatchEvent(new Event('ivos_operations_change'));
  
  // FACTURE
  const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const numeroOfficiel = `FAC-${year}-${String(invoices.length + 1).padStart(4, '0')}`;
  const montantHT = 500 * 2550; // 500 FCFA/kg × 2550 kg
  
  const invoice = {
    id: invoiceId,
    operationId: operationId,
    operationNumero: numero,
    numeroOfficiel,
    documentType: 'BSD',
    clientNom: 'Total Sénégal',
    clientAdresse: 'Zone Industrielle, Dakar',
    clientContact: '+221 77 123 45 67',
    prestationLabel: `Collecte et traitement Huiles usagées selon BSD N°${numero}`,
    categorieDechet: 'Déchets Dangereux',
    quantite: 2550,
    unite: 'kg',
    prixUnitaire: 500,
    montantHT,
    status: 'payee',
    siteCode: 'DKR',
    annee: year,
    createdAt: now,
    updatedAt: now,
    validatedAt: now,
    validatedBy: 'Samba (DG)',
  };
  
  invoices.unshift(invoice);
  localStorage.setItem('ivos_workflow_invoices_v1', JSON.stringify(invoices));
  window.dispatchEvent(new Event('ivos_invoice_change'));
  
  // PAIEMENT
  const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  
  const payment = {
    id: paymentId,
    invoiceId,
    invoiceNumero: numeroOfficiel,
    clientNom: 'Total Sénégal',
    montant: montantHT,
    method: 'virement',
    details: {
      referenceBancaire: `VIR-${year}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
      banqueEmettrice: 'CBAO Sénégal',
    },
    status: 'encaisse',
    dateCreation: now,
    dateValidation: now,
    dateEncaissement: now,
    saisiePar: 'Agent Finance',
    validePar: 'Samba (DG)',
    notes: 'Paiement test - Opération fictive',
  };
  
  payments.unshift(payment);
  localStorage.setItem('ivos_payments_v1', JSON.stringify(payments));
  window.dispatchEvent(new Event('ivos_payment_change'));
  
  console.log('✅ OPÉRATION COMPLÈTE CRÉÉE !');
  console.log('📋 Opération:', numero);
  console.log('💰 Facture:', numeroOfficiel, `(${montantHT.toLocaleString()} FCFA)`);
  console.log('💳 Paiement:', paymentId);
  console.log('👉 Rafraîchissez la page (F5)');
  
  return { operation, invoice, payment };
}

/**
 * 2️⃣ CRÉER 5 OPÉRATIONS VARIÉES
 */
function quickCreate5() {
  const clients = ['Total Sénégal', 'SAR Sénégal', 'Shell Sénégal', 'Petrosen', 'Oryx Energies'];
  const wastes = ['Huiles usagées', 'Boues de forage', 'Déchets chimiques', 'Solvants usagés', 'Filtres usagés'];
  
  for (let i = 0; i < 5; i++) {
    const operations = JSON.parse(localStorage.getItem('ivos_operations_v1') || '[]');
    const counters = JSON.parse(localStorage.getItem('ivos_operations_counter_v1') || '{}');
    const year = new Date().getFullYear();
    const next = (counters[year] || 0) + 1;
    counters[year] = next;
    localStorage.setItem('ivos_operations_counter_v1', JSON.stringify(counters));
    
    const numero = `BSD-${year}-${String(next).padStart(4, '0')}`;
    const now = new Date().toISOString();
    const quantity = 1000 + Math.floor(Math.random() * 4000);
    
    operations.unshift({
      id: `op-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      numero,
      client: clients[i],
      clientNom: 'Contact Client',
      clientTelephone: '+221 77 123 45 67',
      typeDechet: wastes[i],
      etatDechet: 'liquide',
      typeConditionnement: 'citerne',
      quantiteKg: String(quantity),
      vehicule: 'Camion Citerne',
      immatriculation: `DK-${1000 + i}-AB`,
      chauffeur: 'Chauffeur',
      dateDepart: now,
      status: Math.random() > 0.5 ? 'cloturee' : 'en_cours',
      createdBy: 'sample_10',
      createdAt: now,
      updatedAt: now,
      bsdGeneratedAt: now,
    });
    
    localStorage.setItem('ivos_operations_v1', JSON.stringify(operations));
    
    // Pause 10ms pour timestamps différents
    const timestamp = Date.now();
    while (Date.now() - timestamp < 10) {}
  }
  
  window.dispatchEvent(new Event('ivos_operations_change'));
  
  console.log('✅ 5 OPÉRATIONS CRÉÉES !');
  console.log('👉 Rafraîchissez la page (F5)');
}

/**
 * 3️⃣ SUPPRIMER TOUT
 */
function quickDeleteAll() {
  if (confirm('⚠️ Supprimer TOUTES les opérations, factures et paiements ?')) {
    localStorage.removeItem('ivos_operations_v1');
    localStorage.removeItem('ivos_operations_counter_v1');
    localStorage.removeItem('ivos_workflow_invoices_v1');
    localStorage.removeItem('ivos_payments_v1');
    
    console.log('✅ TOUT SUPPRIMÉ !');
    console.log('👉 Rafraîchissez la page (F5)');
  }
}

/**
 * 4️⃣ STATISTIQUES
 */
function quickStats() {
  const operations = JSON.parse(localStorage.getItem('ivos_operations_v1') || '[]');
  const invoices = JSON.parse(localStorage.getItem('ivos_workflow_invoices_v1') || '[]');
  const payments = JSON.parse(localStorage.getItem('ivos_payments_v1') || '[]');
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 STATISTIQUES');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📋 Opérations : ${operations.length}`);
  console.log(`💰 Factures : ${invoices.length}`);
  console.log(`💳 Paiements : ${payments.length}`);
  console.log('═══════════════════════════════════════════════════════');
  
  if (operations.length > 0) {
    console.log('Dernière opération:', operations[0].numero);
  }
  
  return { operations: operations.length, invoices: invoices.length, payments: payments.length };
}

// ═══════════════════════════════════════════════════════════════════
// 🎯 EXPOSER LES FONCTIONS GLOBALEMENT
// ═══════════════════════════════════════════════════════════════════

window.quickCreateComplete = quickCreateComplete;
window.quickCreate5 = quickCreate5;
window.quickDeleteAll = quickDeleteAll;
window.quickStats = quickStats;

// ═══════════════════════════════════════════════════════════════════
// 🎉 MESSAGE D'AIDE
// ═══════════════════════════════════════════════════════════════════

console.clear();
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('🚀 GÉNÉRATEUR DE DONNÉES FICTIVES — PRÊT !');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('📋 COMMANDES DISPONIBLES :');
console.log('');
console.log('  quickCreateComplete()   → Créer 1 opération complète');
console.log('  quickCreate5()          → Créer 5 opérations variées');
console.log('  quickDeleteAll()        → Supprimer tout');
console.log('  quickStats()            → Voir statistiques');
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('💡 EXEMPLE :');
console.log('');
console.log('  quickCreateComplete()   // Créer 1 opération');
console.log('  // → Rafraîchir la page (F5)');
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('');

// Afficher stats initiales
quickStats();
