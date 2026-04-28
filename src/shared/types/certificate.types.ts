/**
 * Types pour le système de Certificats de Destruction
 */

export type CertificateStatus = 'generated' | 'sent' | 'verified';

export interface Certificate {
  id: string; // CERT-2026-XXXX
  certificateNumber: string; // Numéro unique
  bsdReference: string; // Référence du BSD
  operationId: string; // ID de l'opération
  
  // Détails techniques
  collectionDate: string; // Date de collecte
  treatmentDate: string; // Date de traitement (Section 9)
  wasteType: string; // Type de déchet
  finalTonnage: number; // Tonnage final reçu (kg)
  treatmentMethod: string; // Méthode de traitement
  treatmentLocation: string; // Lieu de traitement
  
  // Client
  clientName: string;
  clientEmail?: string;
  
  // Métadonnées
  generatedAt: string;
  generatedBy: string;
  status: CertificateStatus;
  sentAt?: string;
  verifiedAt?: string;
  verificationCode: string; // Code unique pour QR Code
  
  // Documents
  pdfUrl?: string; // URL du PDF stocké
  qrCodeData?: string; // Data du QR Code
}

export interface CertificateGenerationParams {
  operationId: string;
  operationCode?: string;
  bsdReference: string;
  collectionDate: string;
  disposalSite?: string;
  treatmentDate: string;
  wasteType: string;
  wasteQuantity?: number;
  wasteUnit?: string;
  vehicleRegistration?: string;
  finalTonnage: number;
  treatmentMethod: string;
  treatmentLocation: string;
  clientName: string;
  clientEmail?: string;
  generatedBy: string;
}

export interface CertificateVerificationResult {
  isValid: boolean;
  certificate?: Certificate;
  message?: string;
  error?: string;
}

export interface CertificateSendParams {
  certificateId: string;
  recipientEmail: string;
  includeBSD: boolean;
  message?: string;
}
