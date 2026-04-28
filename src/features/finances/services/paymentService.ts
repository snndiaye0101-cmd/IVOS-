/**
 * Service de Gestion des Paiements
 * Gère les 4 modes de règlement : Virement, Chèque, Espèces, Autre
 * Lie les paiements aux factures et met à jour le Dashboard Finance
 */

const PAYMENTS_KEY = 'ivos_payments_v1';

export type PaymentMethod = 'virement' | 'cheque' | 'especes' | 'autre';
export type PaymentStatus = 'en_attente' | 'valide' | 'encaisse' | 'rejete';

export interface PaymentDetails {
  // Virement
  referenceBancaire?: string;
  banqueEmettrice?: string;

  // Chèque
  numeroCheque?: string;
  banqueCheque?: string;

  // Espèces
  nomRemettant?: string;

  // Autre
  autreDetails?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumero: string;
  clientNom: string;

  montant: number;
  method: PaymentMethod;
  details: PaymentDetails;

  status: PaymentStatus;
  dateCreation: string;
  dateValidation?: string;
  dateEncaissement?: string;

  saisiePar: string; // Nom de la personne qui a enregistré le paiement
  validePar?: string;

  notes?: string;
}

/**
 * Charge tous les paiements
 */
export function loadPayments(): Payment[] {
  try {
    return JSON.parse(localStorage.getItem(PAYMENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Sauvegarde les paiements
 */
function savePayments(payments: Payment[]): void {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
  window.dispatchEvent(new Event('ivos_payment_change'));
}

/**
 * Crée un nouveau paiement
 */
export function createPayment(
  invoiceId: string,
  invoiceNumero: string,
  clientNom: string,
  montant: number,
  method: PaymentMethod,
  details: PaymentDetails,
  saisirPar: string,
  notes?: string
): Payment {
  const payments = loadPayments();

  const payment: Payment = {
    id: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    invoiceId,
    invoiceNumero,
    clientNom,
    montant,
    method,
    details,
    status: 'en_attente',
    dateCreation: new Date().toISOString(),
    saisiePar: saisirPar,
    notes,
  };

  payments.unshift(payment);
  savePayments(payments);

  return payment;
}

/**
 * Valide un paiement (par Super Admin uniquement)
 */
export function validatePayment(paymentId: string, validatorName: string): Payment | null {
  const payments = loadPayments();
  const payment = payments.find(p => p.id === paymentId);

  if (!payment) return null;

  payment.status = 'valide';
  payment.dateValidation = new Date().toISOString();
  payment.validePar = validatorName;

  savePayments(payments);

  // Mettre à jour la facture associée
  updateInvoicePaymentStatus(payment.invoiceId, 'payee');

  return payment;
}

/**
 * Marque un paiement comme encaissé
 */
export function markPaymentAsEncaisse(paymentId: string): Payment | null {
  const payments = loadPayments();
  const payment = payments.find(p => p.id === paymentId);

  if (!payment) return null;

  payment.status = 'encaisse';
  payment.dateEncaissement = new Date().toISOString();

  savePayments(payments);

  return payment;
}

/**
 * Rejette un paiement
 */
export function rejectPayment(paymentId: string, reason?: string): Payment | null {
  const payments = loadPayments();
  const payment = payments.find(p => p.id === paymentId);

  if (!payment) return null;

  payment.status = 'rejete';
  payment.notes = reason ? `${payment.notes || ''}\nRejet: ${reason}` : payment.notes;

  savePayments(payments);

  return payment;
}

/**
 * Récupère les paiements d'une facture
 */
export function getPaymentsByInvoice(invoiceId: string): Payment[] {
  const payments = loadPayments();
  return payments.filter(p => p.invoiceId === invoiceId);
}

/**
 * Récupère tous les paiements avec filtres
 */
export function getPayments(filters?: {
  status?: PaymentStatus;
  method?: PaymentMethod;
  dateDebut?: string;
  dateFin?: string;
}): Payment[] {
  let payments = loadPayments();

  if (filters?.status) {
    payments = payments.filter(p => p.status === filters.status);
  }

  if (filters?.method) {
    payments = payments.filter(p => p.method === filters.method);
  }

  if (filters?.dateDebut) {
    payments = payments.filter(p => p.dateCreation >= filters.dateDebut!);
  }

  if (filters?.dateFin) {
    payments = payments.filter(p => p.dateCreation <= filters.dateFin!);
  }

  return payments;
}

/**
 * Calcule le total des paiements encaissés
 */
export function getTotalEncaisse(filters?: { dateDebut?: string; dateFin?: string }): number {
  const payments = getPayments({ ...filters, status: 'encaisse' });
  return payments.reduce((sum, p) => sum + p.montant, 0);
}

/**
 * Statistiques des paiements
 */
export function getPaymentStats() {
  const payments = loadPayments();

  return {
    total: payments.length,
    enAttente: payments.filter(p => p.status === 'en_attente').length,
    valides: payments.filter(p => p.status === 'valide').length,
    encaisses: payments.filter(p => p.status === 'encaisse').length,
    rejetes: payments.filter(p => p.status === 'rejete').length,
    
    montantTotal: payments.reduce((s, p) => s + p.montant, 0),
    montantEncaisse: payments.filter(p => p.status === 'encaisse').reduce((s, p) => s + p.montant, 0),
    montantEnAttente: payments.filter(p => p.status === 'en_attente').reduce((s, p) => s + p.montant, 0),

    parMode: {
      virement: payments.filter(p => p.method === 'virement').length,
      cheque: payments.filter(p => p.method === 'cheque').length,
      especes: payments.filter(p => p.method === 'especes').length,
      autre: payments.filter(p => p.method === 'autre').length,
    },
  };
}

/**
 * Formate le libellé du mode de paiement
 */
export function formatPaymentMethod(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    virement: '💳 Virement Bancaire',
    cheque: '📝 Chèque',
    especes: '💵 Espèces',
    autre: '📄 Autre',
  };
  return labels[method] || method;
}

/**
 * Formate le détail du paiement
 */
export function formatPaymentDetails(payment: Payment): string {
  switch (payment.method) {
    case 'virement':
      return `Réf: ${payment.details.referenceBancaire} - ${payment.details.banqueEmettrice}`;
    
    case 'cheque':
      return `Chèque N°${payment.details.numeroCheque} - ${payment.details.banqueCheque}`;
    
    case 'especes':
      return `Remis par: ${payment.details.nomRemettant}`;
    
    case 'autre':
      return payment.details.autreDetails || '—';
    
    default:
      return '—';
  }
}

/**
 * Met à jour le statut de paiement d'une facture (appel vers workflowInvoiceService)
 */
function updateInvoicePaymentStatus(invoiceId: string, newStatus: 'payee'): void {
  try {
    interface StoredInvoiceStatus {
      id: string;
      status?: string;
      updatedAt?: string;
    }

    const invoices = JSON.parse(localStorage.getItem('ivos_workflow_invoices_v1') || '[]') as StoredInvoiceStatus[];
    const invoice = invoices.find((item) => item.id === invoiceId);
    
    if (invoice) {
      invoice.status = newStatus;
      invoice.updatedAt = new Date().toISOString();
      localStorage.setItem('ivos_workflow_invoices_v1', JSON.stringify(invoices));
      window.dispatchEvent(new Event('ivos_invoice_change'));
    }
  } catch (error) {
    console.error('Erreur mise à jour statut facture:', error);
  }
}
