import type { Invoice, PaymentMethod } from '../types/invoice.types';

const REVENUES_KEY = 'ivos_revenues_v1';
const INVOICES_KEY = 'ivos_invoices_v1';
const REVENUES_EVENT = 'ivos_revenues_change';

type RevenueStatus = 'encaisse' | 'en_attente';
export type RevenueSource = 'Facture' | 'Saisie manuelle';

export interface RevenueEntry {
  id: string;
  date: string;
  created_at: string;
  client: string;
  libelle: string;
  source: RevenueSource;
  mode: string;
  montant: number;
  status: RevenueStatus;
  invoiceId?: string;
  invoiceNumber?: string;
  invoicePaymentId?: string;
  /** JSON metadata: cheque details, wire ref, mobile money IDs, etc. */
  metadata?: Record<string, string>;
}

export interface ManualRevenueInput {
  date: string;
  client: string;
  libelle: string;
  mode: string;
  montant: number;
  status?: RevenueStatus;
  metadata?: Record<string, string>;
}

function loadRevenuesRaw(): RevenueEntry[] {
  try {
    const raw = localStorage.getItem(REVENUES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<RevenueEntry & { createdAt?: string }>;
    return parsed.map((entry) => ({
      ...entry,
      created_at: entry.created_at || entry.createdAt || entry.date || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

function saveRevenues(entries: RevenueEntry[]): void {
  localStorage.setItem(REVENUES_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(REVENUES_EVENT));
}

function loadInvoices(): Invoice[] {
  try {
    return JSON.parse(localStorage.getItem(INVOICES_KEY) || '[]') as Invoice[];
  } catch {
    return [];
  }
}

function toModeLabel(mode?: PaymentMethod): string {
  if (!mode) return 'Non renseigné';
  return mode;
}

function buildInvoiceRevenueLine(
  invoice: Invoice,
  payment: NonNullable<Invoice['payments']>[number]
): RevenueEntry {
  const isAcompte = payment.label === 'Acompte';
  const lineLabel = isAcompte
    ? `Facture N°${invoice.numeroFacture} - Acompte`
    : `Facture N°${invoice.numeroFacture}`;

  return {
    id: `rev-inv-${invoice.id}-${payment.id}`,
    date: payment.date,
    created_at: payment.date || new Date().toISOString(),
    client: invoice.clientNom,
    libelle: lineLabel,
    source: 'Facture',
    mode: toModeLabel(payment.mode || invoice.modeReglement),
    montant: payment.amount,
    status: 'encaisse',
    invoiceId: invoice.id,
    invoiceNumber: invoice.numeroFacture,
    invoicePaymentId: payment.id,
  };
}

export function syncRevenuesFromInvoices(): RevenueEntry[] {
  const current = loadRevenuesRaw();
  const invoices = loadInvoices();

  const manual = current.filter((line) => line.source === 'Saisie manuelle');
  const invoiceSynced: RevenueEntry[] = [];

  invoices.forEach((invoice) => {
    if (!Array.isArray(invoice.payments) || invoice.payments.length === 0) {
      if (invoice.statutPaiement === 'Payé' && invoice.datePaiement) {
        invoiceSynced.push({
          id: `rev-inv-legacy-${invoice.id}`,
          date: invoice.datePaiement,
          created_at: invoice.datePaiement,
          client: invoice.clientNom,
          libelle: `Facture N°${invoice.numeroFacture}`,
          source: 'Facture',
          mode: toModeLabel(invoice.modeReglement),
          montant: invoice.montantTTC,
          status: 'encaisse',
          invoiceId: invoice.id,
          invoiceNumber: invoice.numeroFacture,
          invoicePaymentId: `legacy-${invoice.id}`,
        });
      }
      return;
    }

    invoice.payments.forEach((payment) => {
      if (payment.amount <= 0) return;
      invoiceSynced.push(buildInvoiceRevenueLine(invoice, payment));
    });
  });

  const merged = [...manual, ...invoiceSynced].sort((a, b) => b.date.localeCompare(a.date));
  saveRevenues(merged);
  return merged;
}

/**
 * Pure read — no side-effects. Safe to call during React renders.
 * Invoice-syncing happens automatically in invoiceService.saveInvoices().
 */
export function getAllRevenues(): RevenueEntry[] {
  return loadRevenuesRaw();
}

export function createManualRevenue(data: ManualRevenueInput): RevenueEntry {
  const synced = loadRevenuesRaw();
  const entry: RevenueEntry = {
    id: `rev-manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: data.date,
    created_at: new Date().toISOString(),
    client: data.client.trim(),
    libelle: data.libelle.trim(),
    source: 'Saisie manuelle',
    mode: data.mode.trim() || 'Non renseigné',
    montant: Math.max(0, Math.round(data.montant)),
    status: data.status || 'encaisse',
    ...(data.metadata && Object.keys(data.metadata).length > 0 ? { metadata: data.metadata } : {}),
  };

  const updated = [
    entry,
    ...synced.filter((line) => line.source === 'Saisie manuelle'),
    ...synced.filter((line) => line.source === 'Facture'),
  ].sort((a, b) => b.date.localeCompare(a.date));

  saveRevenues(updated);
  return entry;
}

/**
 * Patch an existing revenue entry in-place (status, date, mode, metadata).
 * Pure mutation — does not trigger invoice sync.
 */
export function updateRevenueEntry(
  id: string,
  patch: Partial<
    Pick<RevenueEntry, 'status' | 'date' | 'mode' | 'metadata' | 'client' | 'libelle' | 'montant'>
  >
): RevenueEntry | null {
  const entries = loadRevenuesRaw();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const updated: RevenueEntry = { ...entries[idx], ...patch };
  entries[idx] = updated;
  saveRevenues(entries);
  return updated;
}

export function deleteRevenueEntry(id: string): boolean {
  const entries = loadRevenuesRaw();
  const filtered = entries.filter((entry) => entry.id !== id);
  if (filtered.length === entries.length) return false;
  saveRevenues(filtered);
  return true;
}

export function getRevenueStats(referenceMonth = new Date().toISOString().slice(0, 7)) {
  const lines = loadRevenuesRaw(); // pure read — no sync dispatch
  const recettesDuMois = lines
    .filter((line) => line.date.slice(0, 7) === referenceMonth)
    .reduce((sum, line) => sum + line.montant, 0);

  const enAttenteEncaissement = lines
    .filter((line) => line.status === 'en_attente')
    .reduce((sum, line) => sum + line.montant, 0);

  const totalEncaisse = lines
    .filter((line) => line.status === 'encaisse')
    .reduce((sum, line) => sum + line.montant, 0);

  return {
    recettesDuMois,
    enAttenteEncaissement,
    totalEncaisse,
  };
}

export function getRevenueEventName(): string {
  return REVENUES_EVENT;
}
