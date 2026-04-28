/**
 * Fonctions Helper pour Générer des Certificats en Mode Test
 * À exécuter dans la console F12 du navigateur
 */

// Fonction 1 : Générer un certificat depuis une opération existante
window.generateTestCertificate = async function(operationIndex = 0) {
  console.log('🔄 Génération d\'un certificat de test...');
  
  try {
    // Charger les opérations
    const operations = JSON.parse(localStorage.getItem('ivos_operations_v1') || '[]');
    const closedOps = operations.filter(op => op.status === 'cloturee');
    
    if (closedOps.length === 0) {
      console.error('❌ Aucune opération au statut "cloturee" trouvée');
      console.log('💡 Exécutez d\'abord : quickCreate5()');
      return null;
    }
    
    const operation = closedOps[operationIndex];
    console.log('📋 Opération sélectionnée :', operation.id);
    
    // Vérifier si la facture existe
    const invoices = JSON.parse(localStorage.getItem('ivos_invoices_v1') || '[]');
    const invoice = invoices.find(inv => inv.operationId === operation.id);
    
    if (!invoice || !['emise', 'envoyee', 'partiel', 'payee'].includes(invoice.status)) {
      console.error('❌ Facture non valide pour cette opération');
      console.log('💡 La facture doit être au minimum au statut "Émise"');
      return null;
    }
    
    // Importer le service
    const certificateService = await import('/src/shared/services/certificateService.ts');
    
    // Vérifier si possible
    const check = certificateService.canGenerateCertificate(operation.id);
    if (!check.canGenerate) {
      console.error('❌ Impossible de générer le certificat :', check.reason);
      return null;
    }
    
    // Générer le certificat
    const certificate = certificateService.generateCertificateFromOperation(
      operation.id,
      'Administrateur Test'
    );
    
    if (certificate) {
      console.log('✅ Certificat généré avec succès !');
      console.log('📜 Numéro :', certificate.certificateNumber);
      console.log('🔑 Code de vérification :', certificate.verificationCode);
      console.log('📊 Tonnage :', (certificate.finalTonnage / 1000).toFixed(2), 'tonnes');
      console.log('');
      console.log('🔗 Voir le certificat :');
      console.log('   /qhse/certificates');
      console.log('');
      console.log('🔍 Vérifier le certificat :');
      console.log('   /certificate/verify/' + certificate.verificationCode);
      
      return certificate;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la génération :', error);
    return null;
  }
};

// Fonction 2 : Générer plusieurs certificats
window.generateMultipleCertificates = async function(count = 3) {
  console.log(`🔄 Génération de ${count} certificats...`);
  
  const certificates = [];
  
  for (let i = 0; i < count; i++) {
    const cert = await window.generateTestCertificate(i);
    if (cert) {
      certificates.push(cert);
      await new Promise(resolve => setTimeout(resolve, 100)); // Pause entre chaque
    }
  }
  
  console.log('');
  console.log('✅ Certificats générés :', certificates.length);
  return certificates;
};

// Fonction 3 : Voir les statistiques des certificats
window.certificateStats = async function() {
  console.log('📊 Statistiques des Certificats');
  console.log('═══════════════════════════════════════');
  
  try {
    const certificateService = await import('/src/shared/services/certificateService.ts');
    const stats = certificateService.getCertificateStats();
    
    console.log('📜 Total :', stats.total);
    console.log('🆕 Générés :', stats.generated);
    console.log('📧 Envoyés :', stats.sent);
    console.log('✅ Vérifiés :', stats.verified);
    console.log('');
    console.log('📅 Ce mois :', stats.thisMonth);
    console.log('📅 Cette année :', stats.thisYear);
    
    return stats;
  } catch (error) {
    console.error('❌ Erreur :', error);
    return null;
  }
};

// Fonction 4 : Lister tous les certificats
window.listCertificates = async function() {
  console.log('📋 Liste des Certificats');
  console.log('═══════════════════════════════════════');
  
  try {
    const certificateService = await import('/src/shared/services/certificateService.ts');
    const certificates = certificateService.getCertificates();
    
    if (certificates.length === 0) {
      console.log('Aucun certificat trouvé');
      console.log('💡 Exécutez : generateTestCertificate()');
      return [];
    }
    
    certificates.forEach((cert, index) => {
      console.log('');
      console.log(`${index + 1}. ${cert.certificateNumber}`);
      console.log('   BSD :', cert.bsdReference);
      console.log('   Client :', cert.clientName);
      console.log('   Tonnage :', (cert.finalTonnage / 1000).toFixed(2), 't');
      console.log('   Statut :', cert.status);
      console.log('   Code :', cert.verificationCode);
    });
    
    return certificates;
  } catch (error) {
    console.error('❌ Erreur :', error);
    return [];
  }
};

// Fonction 5 : Vérifier un certificat
window.verifyCert = async function(code) {
  console.log('🔍 Vérification du certificat...');
  console.log('Code :', code);
  console.log('');
  
  try {
    const certificateService = await import('/src/shared/services/certificateService.ts');
    const result = certificateService.verifyCertificate(code);
    
    if (result.isValid && result.certificate) {
      console.log('✅ CERTIFICAT VALIDE');
      console.log('═══════════════════════════════════════');
      console.log('Numéro :', result.certificate.certificateNumber);
      console.log('BSD :', result.certificate.bsdReference);
      console.log('Client :', result.certificate.clientName);
      console.log('Déchet :', result.certificate.wasteType);
      console.log('Tonnage :', (result.certificate.finalTonnage / 1000).toFixed(2), 'tonnes');
      console.log('Émis le :', new Date(result.certificate.generatedAt).toLocaleDateString('fr-FR'));
      console.log('Par :', result.certificate.generatedBy);
    } else {
      console.log('❌ CERTIFICAT INVALIDE');
      console.log('Erreur :', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erreur :', error);
    return null;
  }
};

// Fonction 6 : Télécharger le PDF d'un certificat
window.downloadCertPDF = async function(certificateNumber) {
  console.log('📥 Téléchargement du PDF...');
  
  try {
    const certificateService = await import('/src/shared/services/certificateService.ts');
    const cert = certificateService.getCertificateByNumber(certificateNumber);
    
    if (!cert) {
      console.error('❌ Certificat introuvable :', certificateNumber);
      console.log('💡 Exécutez : listCertificates()');
      return;
    }
    
    const { downloadCertificatePDF } = await import('/src/features/qhse/components/CertificatePDF.tsx');
    await downloadCertificatePDF(cert);
    
    console.log('✅ PDF téléchargé !');
  } catch (error) {
    console.error('❌ Erreur :', error);
  }
};

// Fonction 7 : Supprimer tous les certificats (test uniquement)
window.clearAllCertificates = function() {
  if (confirm('⚠️ Supprimer TOUS les certificats ?')) {
    localStorage.removeItem('ivos_certificates_v1');
    console.log('✅ Tous les certificats ont été supprimés');
    window.dispatchEvent(new CustomEvent('certificates-updated'));
  }
};

// Fonction 8 : Guide d'utilisation
window.certificatesHelp = function() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     🧪 GUIDE DES CERTIFICATS - MODE TEST              ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('ÉTAPE 1 : Créer des opérations finalisées');
  console.log('──────────────────────────────────────────');
  console.log('  quickCreate5()');
  console.log('');
  console.log('ÉTAPE 2 : Générer un certificat');
  console.log('────────────────────────────────');
  console.log('  generateTestCertificate()        // Premier certificat');
  console.log('  generateTestCertificate(1)       // Deuxième certificat');
  console.log('  generateMultipleCertificates(5)  // 5 certificats');
  console.log('');
  console.log('ÉTAPE 3 : Consulter les certificats');
  console.log('────────────────────────────────────');
  console.log('  certificateStats()    // Statistiques');
  console.log('  listCertificates()    // Liste complète');
  console.log('');
  console.log('ÉTAPE 4 : Vérifier un certificat');
  console.log('─────────────────────────────────');
  console.log('  verifyCert("CODE")    // Code de vérification');
  console.log('');
  console.log('ÉTAPE 5 : Télécharger PDF');
  console.log('──────────────────────────');
  console.log('  downloadCertPDF("CERT-2026-0001")');
  console.log('');
  console.log('NETTOYAGE :');
  console.log('───────────');
  console.log('  clearAllCertificates()  // Supprimer tous');
  console.log('');
  console.log('ACCÈS WEB :');
  console.log('───────────');
  console.log('  Gestion : /qhse/certificates');
  console.log('  Vérification : /certificate/verify');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
};

// Message d'accueil
console.log('');
console.log('✅ Fonctions de test des certificats chargées !');
console.log('💡 Tapez : certificatesHelp()');
console.log('');
