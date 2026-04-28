export type InvestmentDocumentType = 'Contrat signé' | 'Plan technique' | 'Photo site' | 'Facture' | 'Autre';

export interface InvestmentInstallment {
  id: string;
  /** Libellé de l'échéance (ex: Acompte 1, Gros œuvre…) */
  libelle: string;
  /** Montant direct de l'acompte en FCFA */
  montant: number;
  /** Date prévisionnelle de décaissement */
  datePrevisionnelle: string;
  /** Vrai si l'acompte a déjà été décaissé → intégré en CAPEX */
  decaisse: boolean;
}

export interface InvestmentProject {
  id: string;
  codeProjet: string;
  nomProjet: string;
  prestataire: string;
  budgetTotal: number;
  /** Date de signature du contrat */
  dateDebut: string;
  dateLivraison: string;
  acomptesPrevus: InvestmentInstallment[];
  description?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface InvestmentDocument {
  id: string;
  projectId: string;
  projectName: string;
  type: InvestmentDocumentType;
  fileName: string;
  archivePath: string;
  uploadedAt: string;
  uploadedBy: string;
  size?: number;
  previewDataUrl?: string;
}

export type InvestmentPaymentStatus = 'Brouillon' | 'Bon a payer' | 'Paye';

export interface InvestmentExpense {
  id: string;
  projectId: string;
  projectName: string;
  acompteId?: string;
  factureFournisseur: string;
  montant: number;
  dateFacture: string;
  description?: string;
  categorieFinance: 'Investissements (CAPEX)';
  statutPaiement: InvestmentPaymentStatus;
  preuveVisuelleDocumentId?: string;
  qhseConforme: boolean;
  superAdminValide: boolean;
  superAdminBy?: string;
  superAdminAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface NewInvestmentProjectData {
  nomProjet: string;
  prestataire: string;
  budgetTotal: number;
  dateDebut: string;
  dateLivraison: string;
  acomptesPrevus: Array<{
    libelle: string;
    montant: number;
    datePrevisionnelle: string;
    decaisse: boolean;
  }>;
  description?: string;
}

export interface NewInvestmentExpenseData {
  projectId: string;
  projectName: string;
  acompteId?: string;
  factureFournisseur: string;
  montant: number;
  dateFacture: string;
  description?: string;
}
