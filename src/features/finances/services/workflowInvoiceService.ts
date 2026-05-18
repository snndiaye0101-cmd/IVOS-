// ============================================
// Service Facturation Automatique — Liaison Workflow → Factures
// Crée un brouillon de facture à la clôture d'une operation (Étape 6)
// ============================================
import { findUniteFacturationByType } from '../components/uniteFacturationService';
import { formatCleanAmount } from '../../../shared/utils/formatAmount';

// Minimal local type representing a closed operation passed to createInvoiceFromWorkflow
interface ExploitationOperation {
  id: string;
  numero: string;
  numeroOfficiel?: string;
  documentType: 'BSD' | 'DELIVERY_NOTE';
  clientOrigin: string;
  clientDestination: string;
  siteCode: string;
  annee: number;
  weighingData?: { poidsReel?: number };
  bsdData?: {
    categorieDechet?: string;
    descriptionDechet?: string;
    volumeEstime?: number;
    quantiteEstimee?: number;
    producteurNom?: string;
    producteurAdresse?: string;
    producteurContact?: string;
    destinataireNom?: string;
  };
  deliveryNoteData?: {
    description?: string;
    quantite?: number;
    unite?: string;
    clientNom?: string;
    clientAdresse?: string;
    clientContact?: string;
  };
}

const INVOICES_KEY = 'ivos_workflow_invoices_v1';
const INVOICE_NOTIF_KEY = 'ivos_invoice_notifications_v1';

// ---- Types ----

export type InvoiceStatus = 'a_valider' | 'validee' | 'envoyee' | 'payee' | 'annulee';

export interface WorkflowInvoice {
  id: string;
  operationId: string;
  operationNumero: string;
  numeroOfficiel: string;
  documentType: 'BSD' | 'DELIVERY_NOTE';

  // Client
  clientNom: string;
  clientAdresse: string;
  clientContact: string;

  // Prestation
  prestationLabel: string;
  categorieDechet: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  montantHT: number;

  // Méta
  status: InvoiceStatus;
  siteCode: string;
  annee: number;
  createdAt: string;
  updatedAt: string;
  validatedAt?: string;
  validatedBy?: string;
}

export interface InvoiceNotification {
  id: string;
  invoiceId: string;
  invoiceNumero: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ---- Storage helpers ----

function loadInvoices(): WorkflowInvoice[] {
  try { return JSON.parse(localStorage.getItem(INVOICES_KEY) || '[]'); }
  catch { return []; }
}

function saveInvoices(invoices: WorkflowInvoice[]) {
  localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
  window.dispatchEvent(new Event('ivos_invoice_change'));
}

function loadNotifs(): InvoiceNotification[] {
  try { return JSON.parse(localStorage.getItem(INVOICE_NOTIF_KEY) || '[]'); }
  catch { return []; }
}

function saveNotifs(notifs: InvoiceNotification[]) {
  localStorage.setItem(INVOICE_NOTIF_KEY, JSON.stringify(notifs));
  window.dispatchEvent(new Event('ivos_invoice_notif_change'));
}

// ---- Tarif lookup ----

// Fallback tarif map (FCFA/kg) used when no UniteFacturation config matches
const TARIF_FALLBACK: Record<string, number> = {
  'DASRI': 2500,
  'Déchets Dangereux': 1800,
  'Boues pétrolières': 1200,
  'Produits pharmaceutiques': 2000,
};

function resolvePricing(operation: ExploitationOperation): { prixUnitaire: number; unite: string; quantite: number; categorieDechet: string } {
  const realWeight = operation.weighingData?.poidsReel ?? 0;

  if (operation.documentType === 'BSD' && operation.bsdData) {
    const cat = operation.bsdData.categorieDechet || operation.bsdData.descriptionDechet || 'Déchet';
    // Try unité de facturation config first
    const uf = findUniteFacturationByType(cat);
    if (uf) {
      // Convert weight to match unit (kg→tonne if needed)
      const qty = uf.unit === 'Tonne' ? realWeight / 1000
        : uf.unit === 'kg' ? realWeight
        : uf.unit === 'm³' ? (operation.bsdData.volumeEstime || realWeight / 1000)
        : realWeight;
      return { prixUnitaire: uf.price, unite: uf.unit, quantite: Math.round(qty * 100) / 100, categorieDechet: cat };
    }
    // Fallback
    const tarif = TARIF_FALLBACK[cat] ?? 1500;
    return { prixUnitaire: tarif, unite: 'kg', quantite: realWeight, categorieDechet: cat };
  }

  if (operation.documentType === 'DELIVERY_NOTE' && operation.deliveryNoteData) {
    const desc = operation.deliveryNoteData.description || 'Livraison';
    const qty = operation.deliveryNoteData.quantite || realWeight;
    const unite = operation.deliveryNoteData.unite || 'kg';
    const uf = findUniteFacturationByType(desc);
    const prix = uf?.price ?? 1500;
    return { prixUnitaire: prix, unite, quantite: qty, categorieDechet: desc };
  }

  return { prixUnitaire: 0, unite: 'kg', quantite: realWeight, categorieDechet: 'Non spécifié' };
}

// ---- Public API ----

/**
 * Crée un brouillon de facture depuis une operation clôturée (appelé par submitCollecteTerrain)
 */
export function createInvoiceFromWorkflow(operation: ExploitationOperation): WorkflowInvoice {
  const invoices = loadInvoices();

  // Éviter les doublons pour la même operation
  const existing = invoices.find(i => i.operationId === operation.id);
  if (existing) return existing;

  const { prixUnitaire, unite, quantite, categorieDechet } = resolvePricing(operation);
  const montantHT = Math.round(prixUnitaire * quantite);

  // Client info
  let clientNom = operation.clientOrigin;
  let clientAdresse = '';
  let clientContact = '';
  if (operation.documentType === 'BSD' && operation.bsdData) {
    clientNom = operation.bsdData.producteurNom || operation.clientOrigin;
    clientAdresse = operation.bsdData.producteurAdresse || '';
    clientContact = operation.bsdData.producteurContact || '';
  } else if (operation.documentType === 'DELIVERY_NOTE' && operation.deliveryNoteData) {
    clientNom = operation.deliveryNoteData.clientNom || operation.clientOrigin;
    clientAdresse = operation.deliveryNoteData.clientAdresse || '';
    clientContact = operation.deliveryNoteData.clientContact || '';
  }

  const docLabel = operation.documentType === 'BSD' ? 'BSD' : 'DN';
  const now = new Date().toISOString();

  const invoice: WorkflowInvoice = {
    id: `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    operationId: operation.id,
    operationNumero: operation.numero,
    numeroOfficiel: operation.numeroOfficiel || operation.numero,
    documentType: operation.documentType,
    clientNom,
    clientAdresse,
    clientContact,
    prestationLabel: `Prestation effectuée selon ${docLabel} N°${operation.numeroOfficiel || operation.numero}`,
    categorieDechet,
    quantite,
    unite,
    prixUnitaire,
    montantHT,
    status: 'a_valider',
    siteCode: operation.siteCode,
    annee: operation.annee,
    createdAt: now,
    updatedAt: now,
  };

  invoices.unshift(invoice);
  saveInvoices(invoices);

  // Notification financière
  addInvoiceNotification(
    invoice.id,
    invoice.numeroOfficiel,
    `💰 Nouvelle facture à valider : ${clientNom} — ${formatCleanAmount(montantHT, 'FCFA')} (${docLabel} N°${invoice.numeroOfficiel})`
  );

  return invoice;
}

/**
 * Récupère toutes les factures workflow
 */
export function getWorkflowInvoices(): WorkflowInvoice[] {
  return loadInvoices();
}

/**
 * Met à jour le statut d'une facture
 */
export function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus, validatedBy?: string): WorkflowInvoice | null {
  const invoices = loadInvoices();
  const invoice = invoices.find(i => i.id === invoiceId);
  if (!invoice) return null;
  invoice.status = status;
  invoice.updatedAt = new Date().toISOString();
  if (status === 'validee' && validatedBy) {
    invoice.validatedAt = new Date().toISOString();
    invoice.validatedBy = validatedBy;
  }
  saveInvoices(invoices);
  return invoice;
}

/**
 * Statistiques factures
 */
export function getInvoiceStats() {
  const invoices = loadInvoices();
  return {
    total: invoices.length,
    aValider: invoices.filter(i => i.status === 'a_valider').length,
    validees: invoices.filter(i => i.status === 'validee').length,
    envoyees: invoices.filter(i => i.status === 'envoyee').length,
    payees: invoices.filter(i => i.status === 'payee').length,
    montantTotal: invoices.reduce((s, i) => s + i.montantHT, 0),
    montantAValider: invoices.filter(i => i.status === 'a_valider').reduce((s, i) => s + i.montantHT, 0),
  };
}

// ---- Notifications ----

function addInvoiceNotification(invoiceId: string, invoiceNumero: string, message: string) {
  const notifs = loadNotifs();
  notifs.unshift({
    id: `inv_notif_${Date.now()}`,
    invoiceId,
    invoiceNumero,
    message,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  saveNotifs(notifs);
}

export function getInvoiceNotifications(): InvoiceNotification[] {
  return loadNotifs();
}

export function getUnreadInvoiceCount(): number {
  return loadNotifs().filter(n => !n.isRead).length;
}

export function markInvoiceNotifRead(notifId: string) {
  const notifs = loadNotifs();
  const n = notifs.find(x => x.id === notifId);
  if (n) { n.isRead = true; saveNotifs(notifs); }
}

export function markAllInvoiceNotifsRead() {
  const notifs = loadNotifs();
  notifs.forEach(n => { n.isRead = true; });
  saveNotifs(notifs);
}
