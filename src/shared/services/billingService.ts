// src/shared/services/billingService.ts
export type Invoice = {
  id: string;
  clientId: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
};

export function generateInvoice(invoice: Invoice) {
  // TODO: Générer la facture côté backend ou PDF
  console.log('[Facturation] Génération facture', invoice);
}

export function payInvoice(invoiceId: string) {
  // TODO: Marquer la facture comme payée
  console.log('[Facturation] Paiement reçu', invoiceId);
}

export function sendReminder(invoiceId: string) {
  // TODO: Envoyer un rappel (email/SMS)
  console.log('[Facturation] Rappel envoyé', invoiceId);
}
