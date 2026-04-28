/**
 * Types pour la gestion des factures avec intégration BSD
 */

export type PaymentStatus = 'Non payé' | 'Payé' | 'Partiellement payé' | 'En attente';
export type PaymentMethod = 'Virement' | 'Chèque' | 'Espèces' | 'Carte' | 'Prélèvement' | 'Autre';
export type InvoiceType = 'BSD' | 'Facture libre' | 'Opération Spéciale';
export type InvoiceSource = 'BSD' | 'operation_speciale' | 'libre';

export interface PaymentDetails {
  banque?: string;
  transactionDate?: string;
  transactionId?: string;
  signedByOrReceiptRef?: string;
  chequeNumber?: string;
  issuingBank?: string;
  referenceLibre?: string;
}

export interface PaymentAttachment {
  fileName: string;
  mimeType: string;
  fileDataUrl: string;
  uploadedAt: string;
}

export interface InvoicePaymentEntry {
  id: string;
  amount: number;
  date: string;
  mode?: PaymentMethod;
  label: 'Acompte' | 'Règlement final' | 'Paiement';
}

/**
 * Interface principale pour une facture
 */
export interface Invoice {
  id: string;
  numeroFacture: string; // Format: FAC-2026-XXXX
  date: string; // ISO date
  dateEcheance: string; // Date d'échéance
  typeFacture: InvoiceType; // Type de facture
  
  // Client
  clientId: string;
  clientNom: string;
  clientAdresse?: string;
  clientSiret?: string;
  
  // Référence opération (BSD OU Projet)
  operationId?: string;
  bsdReference?: string; // Numéro du BSD lié (BSD-YYYYMM-XXXX)
  specialOperationId?: string; // Référence opération spéciale
  sourceModule?: InvoiceSource; // Origine de la facture
  
  // Montants
  montantHT: number; // Montant Hors Taxe
  tauxTVA: number; // Taux de TVA en % (ex: 18)
  montantTVA: number; // Montant TVA calculé
  montantTTC: number; // Montant Toutes Taxes Comprises
  
  // Paiement
  statutPaiement: PaymentStatus;
  modeReglement?: PaymentMethod;
  datePaiement?: string; // Date effective du paiement
  paymentDetails?: PaymentDetails;
  paymentAttachment?: PaymentAttachment;
  montantEncaisse?: number;
  soldeRestant?: number;
  payments?: InvoicePaymentEntry[];

  // Lignes de facturation
  lignes: InvoiceLine[];
  
  // Métadonnées
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

/**
 * Ligne de facture (prestations détaillées)
 */
export interface InvoiceLine {
  id: string;
  description: string; // Description de la prestation
  quantite: number;
  unite: string; // "tonne", "m³", "heure", "forfait", etc.
  prixUnitaireHT: number;
  totalHT: number; // quantite × prixUnitaireHT
}

/**
 * Données pour créer une nouvelle facture
 */
export interface NewInvoiceData {
  clientId: string;
  clientNom: string;
  clientAdresse?: string;
  clientSiret?: string;
  typeFacture?: InvoiceType;
  
  // Pour factures BSD
  operationId?: string;
  bsdReference?: string;

  // Pour opérations spéciales
  specialOperationId?: string;
  sourceModule?: InvoiceSource;
  
  dateEcheance: string;
  tauxTVA: number;
  lignes: Omit<InvoiceLine, 'id'>[];
  notes?: string;
  modeReglement?: PaymentMethod;
}

/**
 * Statistiques de facturation
 */
export interface InvoiceStats {
  totalFactures: number;
  totalMontantHT: number;
  totalMontantTTC: number;
  nombrePayees: number;
  montantPayes: number;
  nombreEnAttente: number;
  montantEnAttente: number;
  nombreNonPayees: number;
  montantNonPayes: number;
}

/**
 * Filtres pour recherche de factures
 */
export interface InvoiceFilters {
  search?: string; // Recherche par numéro facture ou BSD
  statutPaiement?: PaymentStatus;
  modeReglement?: PaymentMethod;
  dateDebut?: string;
  dateFin?: string;
  clientId?: string;
  sourceModule?: InvoiceSource; // Filtre par source
}
