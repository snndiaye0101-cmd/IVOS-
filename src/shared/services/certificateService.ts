/**
 * Service de Gestion des Certificats de Destruction
 * Génération, validation, archivage et envoi
 */

import type {
  Certificate,
  CertificateGenerationParams,
  CertificateVerificationResult,
  CertificateSendParams,
} from '../types/certificate.types';

const STORAGE_KEY = 'ivos_certificates_v1';
const CERT_EVENT = 'ivos_certificates_change';

// Stockage localStorage
export function getCertificates(): Certificate[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveCertificates(certificates: Certificate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(certificates));

  // Dispatch event pour synchronisation
  window.dispatchEvent(new CustomEvent(CERT_EVENT));
}

// Générer un numéro de certificat unique
function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const certificates = getCertificates();
  const yearCertificates = certificates.filter(c => 
    c.certificateNumber.startsWith(`CERT-KIG-${year}-`)
  );
  
  const nextNumber = yearCertificates.length + 1;
  return `CERT-KIG-${year}-${String(nextNumber).padStart(4, '0')}`;
}

// Générer un code de vérification unique
function generateVerificationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Vérifier si un certificat peut être généré
 * Conditions : BSD 'cloturee' (Section 9) + Facture 'emise' ou payée
 */
export function canGenerateCertificate(operationId: string): {
  canGenerate: boolean;
  reason?: string;
} {
  const existing = getCertificates().find(c => c.operationId === operationId);
  if (existing) {
    return { canGenerate: false, reason: 'Un certificat est déjà généré pour cette opération' };
  }

  // Charger l'opération
  const operations = JSON.parse(localStorage.getItem('ivos_operations_v1') || '[]');
  const operation = operations.find((op: any) => op.id === operationId);
  
  if (!operation) {
    return { canGenerate: false, reason: 'Opération introuvable' };
  }
  
  // Vérifier statut BSD
  if (operation.status !== 'cloturee') {
    return { 
      canGenerate: false, 
      reason: 'L\'opération doit être clôturée avant génération du certificat' 
    };
  }
  
  const wasteQuantity =
    operation.bsdData?.wasteQuantity ??
    operation.bsdData?.poidsReel ??
    operation.quantiteEstimee ??
    0;

  if (!wasteQuantity || wasteQuantity <= 0) {
    return { 
      canGenerate: false, 
      reason: 'La quantité de déchets doit être strictement positive' 
    };
  }

  return { canGenerate: true };
}

/**
 * Générer un nouveau certificat
 */
export function generateCertificate(params: CertificateGenerationParams): Certificate {
  const certificateNumber = generateCertificateNumber();
  const verificationCode = generateVerificationCode();
  const nowIso = new Date().toISOString();
  const finalTonnage = (params as any).finalTonnage ?? (params as any).wasteQuantity ?? 0;
  const bsdReference = (params as any).bsdReference ?? (params as any).operationCode ?? params.operationId;
  const treatmentDate = (params as any).treatmentDate ?? nowIso;
  const treatmentMethod = (params as any).treatmentMethod ?? 'Traitement spécialisé';
  const treatmentLocation = (params as any).treatmentLocation ?? (params as any).disposalSite ?? 'Centre de traitement IVOS';
  
  const certificate: Certificate = {
    id: `cert_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    certificateNumber,
    bsdReference,
    operationId: params.operationId,
    collectionDate: params.collectionDate,
    treatmentDate,
    wasteType: params.wasteType,
    finalTonnage,
    treatmentMethod,
    treatmentLocation,
    clientName: params.clientName,
    clientEmail: params.clientEmail,
    generatedAt: nowIso,
    generatedBy: params.generatedBy,
    status: 'generated',
    verificationCode,
    qrCodeData: `/certificate/verify/${verificationCode}`,
    ...(typeof (params as any).wasteQuantity === 'number' ? { wasteQuantity: (params as any).wasteQuantity } : {}),
    ...((params as any).wasteUnit ? { wasteUnit: (params as any).wasteUnit } : {}),
    ...((params as any).vehicleRegistration ? { vehicleRegistration: (params as any).vehicleRegistration } : {}),
    ...((params as any).operationCode ? { operationCode: (params as any).operationCode } : {}),
  };
  
  // Sauvegarder
  const certificates = getCertificates();
  certificates.push(certificate);
  saveCertificates(certificates);
  
  // Notifier
  console.log(`✅ Certificat généré : ${certificateNumber}`);
  
  return certificate;
}

/**
 * Générer automatiquement un certificat depuis une opération
 */
export function generateCertificateFromOperation(operationId: string, generatedBy: string): Certificate | null {
  // Vérifier si possible
  const check = canGenerateCertificate(operationId);
  if (!check.canGenerate) {
    console.error(`❌ Impossible de générer le certificat : ${check.reason}`);
    return null;
  }
  
  // Charger l'opération
  const operations = JSON.parse(localStorage.getItem('ivos_operations_v1') || '[]');
  const operation = operations.find((op: any) => op.id === operationId);
  
  if (!operation) return null;
  
  // Extraire les données
  const params: CertificateGenerationParams = {
    operationId: operation.id,
    bsdReference: operation.bsdNumber || operation.id,
    collectionDate: operation.dateCollecte || operation.createdAt,
    treatmentDate: operation.bsdData?.validatedAt || new Date().toISOString(),
    wasteType: operation.typeDechet || 'Déchets industriels',
    finalTonnage: operation.bsdData?.poidsReel || operation.quantiteEstimee || 0,
    treatmentMethod: operation.bsdData?.methodTraitement || 'Traitement spécialisé',
    treatmentLocation: operation.bsdData?.lieuTraitement || 'Centre de traitement IVOS',
    clientName: operation.nomClient || 'Client',
    clientEmail: operation.emailClient,
    generatedBy,
  };
  
  return generateCertificate(params);
}

/**
 * Récupérer un certificat par ID
 */
export function getCertificateById(id: string): Certificate | null {
  const certificates = getCertificates();
  return certificates.find(c => c.id === id) || null;
}

/**
 * Récupérer un certificat par numéro
 */
export function getCertificateByNumber(certificateNumber: string): Certificate | null {
  const certificates = getCertificates();
  return certificates.find(c => c.certificateNumber === certificateNumber) || null;
}

/**
 * Récupérer les certificats d'une opération
 */
export function getCertificatesByOperation(operationId: string): Certificate[] {
  const certificates = getCertificates();
  return certificates.filter(c => c.operationId === operationId);
}

/**
 * Vérifier un certificat par code de vérification
 */
export function verifyCertificate(verificationCode: string): CertificateVerificationResult {
  if (!verificationCode || !verificationCode.trim()) {
    return {
      isValid: false,
      message: 'Le code de vérification est requis.',
      error: 'Le code de vérification est requis.',
    };
  }

  const certificates = getCertificates();
  const certificate = certificates.find(c => c.verificationCode === verificationCode);
  
  if (!certificate) {
    return {
      isValid: false,
      message: 'Code de vérification invalide.',
      error: 'Certificat introuvable. Code de vérification invalide.',
    };
  }
  
  return {
    isValid: true,
    certificate,
    message: 'Certificat valide et vérifié.',
  };
}

/**
 * Marquer un certificat comme envoyé
 */
export function markCertificateAsSent(certificateId: string): void {
  const certificates = getCertificates();
  const certificate = certificates.find(c => c.id === certificateId);
  
  if (certificate) {
    certificate.status = 'sent';
    certificate.sentAt = new Date().toISOString();
    saveCertificates(certificates);
  }
}

/**
 * Marquer un certificat comme vérifié
 */
export function markCertificateAsVerified(certificateId: string): void {
  const certificates = getCertificates();
  const certificate = certificates.find(c => c.id === certificateId);
  
  if (certificate) {
    certificate.status = 'verified';
    certificate.verifiedAt = new Date().toISOString();
    saveCertificates(certificates);
  }
}

/**
 * Envoyer un certificat par email (simulation)
 */
export async function sendCertificate(params: CertificateSendParams): Promise<void> {
  const certificate = getCertificateById(params.certificateId);
  
  if (!certificate) {
    throw new Error('Certificat introuvable');
  }
  
  // Simulation d'envoi email
  console.log('📧 Envoi du certificat par email...');
  console.log(`Destinataire : ${params.recipientEmail}`);
  console.log(`Certificat : ${certificate.certificateNumber}`);
  console.log(`Inclure BSD : ${params.includeBSD ? 'Oui' : 'Non'}`);
  
  if (params.message) {
    console.log(`Message : ${params.message}`);
  }
  
  // Simuler délai d'envoi
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Marquer comme envoyé
  markCertificateAsSent(params.certificateId);
  
  console.log('✅ Certificat envoyé avec succès');
}

/**
 * Supprimer un certificat
 */
export function deleteCertificate(certificateId: string): void {
  const certificates = getCertificates();
  const filtered = certificates.filter(c => c.id !== certificateId);
  saveCertificates(filtered);
}

/**
 * Statistiques des certificats
 */
export function getCertificateStats(): {
  total: number;
  generated: number;
  sent: number;
  verified: number;
  thisMonth: number;
  thisYear: number;
} {
  const certificates = getCertificates();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  return {
    total: certificates.length,
    generated: certificates.filter(c => c.status === 'generated').length,
    sent: certificates.filter(c => c.status === 'sent').length,
    verified: certificates.filter(c => c.status === 'verified').length,
    thisMonth: certificates.filter(c => {
      const date = new Date(c.generatedAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length,
    thisYear: certificates.filter(c => {
      const date = new Date(c.generatedAt);
      return date.getFullYear() === currentYear;
    }).length,
  };
}
