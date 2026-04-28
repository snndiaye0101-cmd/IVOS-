/**
 * Script de Génération de Données Fictives Complètes
 * Créer une opération BSD jusqu'à la facturation et le paiement
 * 
 * Utilisation :
 * 1. Ouvrir la console du navigateur (F12)
 * 2. Copier-coller ce script
 * 3. Exécuter : createFictiveOperationComplete()
 * 
 * Ou créer un bouton dans l'UI pour tester facilement
 */

interface FictiveOperationOptions {
  clientName?: string;
  wasteType?: string;
  quantity?: number;
  completeWorkflow?: boolean; // Si true, remplit toutes les 9 étapes
  generateInvoice?: boolean;   // Si true, crée la facture
  generatePayment?: boolean;   // Si true, crée un paiement
}

/**
 * Crée une opération fictive complète
 */
export function createFictiveOperationComplete(options: FictiveOperationOptions = {}): {
  operation: any;
  invoice?: any;
  payment?: any;
} {
  const {
    clientName = 'Total Sénégal',
    wasteType = 'Huiles usagées hydrocarbures',
    quantity = 2500,
    completeWorkflow = true,
    generateInvoice = true,
    generatePayment = true,
  } = options;

  // ══════════════════════════════════════════════════════════════
  // 1. CRÉER L'OPÉRATION
  // ══════════════════════════════════════════════════════════════

  const operations = JSON.parse(localStorage.getItem('ivos_operations_v1') || '[]');
  
  // Générer numéro
  const counters = JSON.parse(localStorage.getItem('ivos_operations_counter_v1') || '{}');
  const year = new Date().getFullYear();
  const next = (counters[year] || 0) + 1;
  counters[year] = next;
  localStorage.setItem('ivos_operations_counter_v1', JSON.stringify(counters));
  const numero = `BSD-${year}-${String(next).padStart(4, '0')}`;

  const operationId = `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  const operation = {
    id: operationId,
    numero,
    
    // Client
    client: clientName,
    clientNom: 'Amadou Diallo',
    clientTelephone: '+221 77 123 45 67',
    clientAdresse: 'Zone Industrielle, Dakar, Sénégal',
    clientEmail: 'amadou.diallo@totalsenegal.com',
    
    // Déchet
    typeDechet: wasteType,
    etatDechet: 'liquide',
    
    // Conditionnement
    typeConditionnement: 'citerne',
    nombreColis: '1',
    
    // Quantité
    quantiteKg: String(quantity),
    uniteComplementaire: `${(quantity / 1000).toFixed(2)} tonnes`,
    
    // Transport
    vehicule: 'Camion Citerne 20m³',
    immatriculation: 'DK-1234-AB',
    chauffeur: 'Mamadou Ndiaye',
    dateDepart: now,
    observations: 'Collecte mensuelle programmée - Client prioritaire',
    
    // Métadonnées
    status: completeWorkflow ? 'cloturee' : 'en_cours',
    createdBy: 'sample_10', // Admin user
    createdAt: now,
    updatedAt: now,
    bsdGeneratedAt: now,
  };

  // ══════════════════════════════════════════════════════════════
  // 2. REMPLIR LES 9 ÉTAPES DU WORKFLOW
  // ══════════════════════════════════════════════════════════════

  const bsdData: any = {};
  if (completeWorkflow) {
    Object.assign(bsdData, {
      // Étape 1 - Producteur
      producteurNom: clientName,
      producteurAdresse: 'Zone Industrielle, Dakar, Sénégal',
      producteurContact: '+221 77 123 45 67',
      producteurEmail: 'amadou.diallo@totalsenegal.com',
      referenceInterne: `REF-${Date.now()}`,
      
      // Étape 2 - Collecteur (AUTO)
      collecteurNom: 'IVOS — Sénégal Oilfield Services',
      collecteurAdresse: 'Dakar, Sénégal',
      collecteurContact: 'Agent Exploitation',
      
      // Étape 3 - Dénomination
      categorieDechet: 'Déchets Dangereux',
      codeDechet: '13-02-05',
      descriptionDechet: wasteType,
      origineDechet: 'Activités industrielles pétrolières',
      etatDechet: 'Liquide',
      
      // Étape 4 - Conditionnement
      nombreColis: '1',
      typeConditionnement: 'Citerne 20m³',
      volumeEstime: '18500',
      quantiteEstimee: String(quantity),
      
      // Étape 5 - Signature Producteur (AUTO)
      signatureProducteur: `Amadou Diallo (${new Date().toLocaleString('fr-FR')})`,
      dateSignatureProducteur: now,
      
      // Étape 6 - Pesée
      poidsReel: String(quantity + 50), // Légère différence avec estimation
      
      // Étape 7 - Signature Chauffeur (AUTO)
      signatureChauffeur: `Mamadou Ndiaye (${new Date().toLocaleString('fr-FR')})`,
      dateSignatureChauffeur: now,
      
      // Étape 8 - Réception
      dateReception: now,
      destinataireNom: 'IVOS Centre de Traitement',
      destinataireAdresse: 'Route de Rufisque, Dakar',
      destinationSite: 'Site IVOS Rufisque',
      
      // Étape 9 - Traitement
      modeTraitement: 'Valorisation énergétique',
      certification: 'Certificat de destruction N°CER-2026-' + String(next).padStart(4, '0'),
      
      // Validation finale
      validatedAt: now,
      validatedBy: 'Agent Réception',
    });
  }

  // Assigner bsdData à l'opération
  if (completeWorkflow) {
    (operation as any).bsdData = bsdData;
  }

  // Sauvegarder l'opération
  operations.unshift(operation);
  localStorage.setItem('ivos_operations_v1', JSON.stringify(operations));
  window.dispatchEvent(new Event('ivos_operations_change'));

  console.log('✅ Opération créée:', operation);

  const result: any = { operation };

  // ══════════════════════════════════════════════════════════════
  // 3. GÉNÉRER LA FACTURE (SI WORKFLOW COMPLET)
  // ══════════════════════════════════════════════════════════════

  if (generateInvoice && completeWorkflow) {
    const invoices = JSON.parse(localStorage.getItem('ivos_workflow_invoices_v1') || '[]');
    
    const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const numeroOfficiel = `FAC-${year}-${String(invoices.length + 1).padStart(4, '0')}`;
    
    // Calcul prix (exemple : 500 FCFA/kg pour huiles usagées)
    const prixUnitaire = 500;
    const quantite = quantity + 50; // Poids réel
    const montantHT = prixUnitaire * quantite;

    const invoice = {
      id: invoiceId,
      operationId: operationId,
      operationNumero: numero,
      numeroOfficiel,
      documentType: 'BSD',
      
      // Client
      clientNom: clientName,
      clientAdresse: 'Zone Industrielle, Dakar, Sénégal',
      clientContact: '+221 77 123 45 67',
      
      // Prestation
      prestationLabel: `Collecte et traitement ${wasteType} selon BSD N°${numero}`,
      categorieDechet: 'Déchets Dangereux',
      quantite,
      unite: 'kg',
      prixUnitaire,
      montantHT,
      
      // Méta
      status: 'validee', // Validée par Super Admin
      siteCode: 'DKR',
      annee: year,
      createdAt: now,
      updatedAt: now,
      validatedAt: now,
      validatedBy: 'Samba (DG)', // Super Admin
    };

    invoices.unshift(invoice);
    localStorage.setItem('ivos_workflow_invoices_v1', JSON.stringify(invoices));
    window.dispatchEvent(new Event('ivos_invoice_change'));

    console.log('✅ Facture créée:', invoice);
    result.invoice = invoice;

    // ══════════════════════════════════════════════════════════════
    // 4. CRÉER UN PAIEMENT (OPTIONNEL)
    // ══════════════════════════════════════════════════════════════

    if (generatePayment) {
      const payments = JSON.parse(localStorage.getItem('ivos_payments_v1') || '[]');
      
      const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      
      const payment = {
        id: paymentId,
        invoiceId,
        invoiceNumero: numeroOfficiel,
        clientNom: clientName,
        
        montant: montantHT,
        method: 'virement',
        details: {
          referenceBancaire: `VIR-${year}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
          banqueEmettrice: 'CBAO Sénégal',
        },
        
        status: 'encaisse', // Déjà encaissé pour test complet
        dateCreation: now,
        dateValidation: now,
        dateEncaissement: now,
        
        saisiePar: 'Agent Finance',
        validePar: 'Samba (DG)',
        
        notes: 'Paiement test - Opération fictive complète',
      };

      payments.unshift(payment);
      localStorage.setItem('ivos_payments_v1', JSON.stringify(payments));
      window.dispatchEvent(new Event('ivos_payment_change'));

      // Mettre à jour le statut de la facture en "payee"
      invoice.status = 'payee';
      localStorage.setItem('ivos_workflow_invoices_v1', JSON.stringify(invoices));
      window.dispatchEvent(new Event('ivos_invoice_change'));

      console.log('✅ Paiement créé:', payment);
      result.payment = payment;
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ OPÉRATION FICTIVE COMPLÈTE CRÉÉE');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 Opération:', numero);
  if (result.invoice) console.log('💰 Facture:', result.invoice.numeroOfficiel);
  if (result.payment) console.log('💳 Paiement:', result.payment.id);
  console.log('');
  console.log('👉 Rafraîchissez la page pour voir les données');
  console.log('═══════════════════════════════════════════════════════');

  return result;
}

/**
 * Créer plusieurs opérations fictives d'un coup
 */
export function createMultipleFictiveOperations(count: number = 5): void {
  const clients = [
    'Total Sénégal',
    'SAR Sénégal',
    'Shell Sénégal',
    'Petrosen',
    'Oryx Energies',
  ];

  const wasteTypes = [
    'Huiles usagées hydrocarbures',
    'Boues de forage',
    'Déchets chimiques',
    'Solvants usagés',
    'Filtres à huile usagés',
  ];

  const results = [];

  for (let i = 0; i < count; i++) {
    const result = createFictiveOperationComplete({
      clientName: clients[i % clients.length],
      wasteType: wasteTypes[i % wasteTypes.length],
      quantity: 1000 + Math.floor(Math.random() * 5000),
      completeWorkflow: Math.random() > 0.3, // 70% complètes
      generateInvoice: Math.random() > 0.2,  // 80% avec facture
      generatePayment: Math.random() > 0.4,  // 60% avec paiement
    });

    results.push(result);

    // Petit délai pour des numéros différents
    const timestamp = Date.now();
    while (Date.now() - timestamp < 10) {}
  }

  console.log(`✅ ${count} opérations fictives créées !`);
  console.log('👉 Rafraîchissez la page pour voir les données');
}

/**
 * Nettoyer toutes les données de test
 */
export function clearAllFictiveData(): void {
  if (window.confirm('⚠️ Supprimer toutes les opérations, factures et paiements ? Cette action est irréversible.')) {
    localStorage.removeItem('ivos_operations_v1');
    localStorage.removeItem('ivos_operations_counter_v1');
    localStorage.removeItem('ivos_workflow_invoices_v1');
    localStorage.removeItem('ivos_payments_v1');
    
    console.log('✅ Toutes les données ont été supprimées');
    console.log('👉 Rafraîchissez la page');
  }
}

// ══════════════════════════════════════════════════════════════
// EXPOSER LES FONCTIONS GLOBALEMENT (POUR CONSOLE)
// ══════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  (window as any).createFictiveOperation = createFictiveOperationComplete;
  (window as any).createMultipleFictiveOperations = createMultipleFictiveOperations;
  (window as any).clearAllFictiveData = clearAllFictiveData;
  
  console.log('');
  console.log('🚀 Script de génération de données fictives chargé !');
  console.log('');
  console.log('Commandes disponibles :');
  console.log('  createFictiveOperation()           → Créer 1 opération complète');
  console.log('  createMultipleFictiveOperations(5) → Créer 5 opérations');
  console.log('  clearAllFictiveData()              → Supprimer tout');
  console.log('');
}

export default createFictiveOperationComplete;
