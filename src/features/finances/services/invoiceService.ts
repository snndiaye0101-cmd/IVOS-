/**
 * Service de gestion des factures avec intégration BSD et génération PDF automatique
 */

import type {
  Invoice,
  NewInvoiceData,
  InvoiceStats,
  InvoiceFilters,
  InvoiceLine,
  InvoicePaymentEntry,
} from '../types/invoice.types';
import { getAllBSD } from '../../exploitation/services/bsdService';
import { loadBaseConfig } from '../../settings/services/baseConfigStore';
import { syncRevenuesFromInvoices } from './revenueService';
import jsPDF from 'jspdf';

const STORAGE_KEY = 'ivos_invoices_v1';

let logoDataUrlCache: string | null | undefined;

function formatFCFA(amount: number): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const [intPart, decimalPart] = rounded.toFixed(2).split('.');
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decimalPart === '00' ? `${withSpaces} FCFA` : `${withSpaces},${decimalPart} FCFA`;
}

function formatQty(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

async function getLogoDataUrl(): Promise<string | null> {
  if (logoDataUrlCache !== undefined) return logoDataUrlCache;

  logoDataUrlCache = await new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = '/logo-ivos.jpg';
  });

  return logoDataUrlCache;
}

/**
 * Génère un numéro unique de facture
 * Format: FAC-2026-XXXX
 */
export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const all = getAllInvoices();
  
  // Compter les factures de l'année en cours
  const currentYearInvoices = all.filter(inv => 
    inv.numeroFacture.startsWith(`FAC-${year}-`)
  );
  
  const nextNumber = (currentYearInvoices.length + 1).toString().padStart(4, '0');
  return `FAC-${year}-${nextNumber}`;
}

/**
 * Calcule les montants TVA et TTC
 */
function calculateAmounts(lignes: InvoiceLine[], tauxTVA: number) {
  const montantHT = lignes.reduce((sum, ligne) => sum + ligne.totalHT, 0);
  const montantTVA = montantHT * (tauxTVA / 100);
  const montantTTC = montantHT + montantTVA;
  
  return { montantHT, montantTVA, montantTTC };
}

/**
 * Récupère toutes les factures
 */
export function getAllInvoices(): Invoice[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Sauvegarde les factures
 */
function saveInvoices(invoices: Invoice[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  window.dispatchEvent(new Event('ivos_invoice_change'));
  syncRevenuesFromInvoices();
}

/**
 * Récupère une facture par ID
 */
export function getInvoiceById(id: string): Invoice | null {
  const all = getAllInvoices();
  return all.find(inv => inv.id === id) || null;
}

/**
 * Recherche des factures avec filtres
 */
export function searchInvoices(filters: InvoiceFilters): Invoice[] {
  let invoices = getAllInvoices();
  
  // Recherche par numéro de facture ou BSD
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    invoices = invoices.filter(inv => 
      inv.numeroFacture.toLowerCase().includes(searchLower) ||
      (inv.bsdReference && inv.bsdReference.toLowerCase().includes(searchLower)) ||
      inv.clientNom.toLowerCase().includes(searchLower)
    );
  }
  
  // Filtre par statut de paiement
  if (filters.statutPaiement) {
    invoices = invoices.filter(inv => inv.statutPaiement === filters.statutPaiement);
  }
  
  // Filtre par mode de règlement
  if (filters.modeReglement) {
    invoices = invoices.filter(inv => inv.modeReglement === filters.modeReglement);
  }
  
  // Filtre par date
  if (filters.dateDebut) {
    invoices = invoices.filter(inv => inv.date >= filters.dateDebut!);
  }
  if (filters.dateFin) {
    invoices = invoices.filter(inv => inv.date <= filters.dateFin!);
  }
  
  // Filtre par client
  if (filters.clientId) {
    invoices = invoices.filter(inv => inv.clientId === filters.clientId);
  }

  // Filtre par source
  if (filters.sourceModule) {
    const src = filters.sourceModule;
    invoices = invoices.filter(inv => (inv.sourceModule ?? 'BSD') === src);
  }
  
  // Trier par date décroissante
  return invoices.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Crée une nouvelle facture
 */
export function createInvoice(data: NewInvoiceData, userId: string): Invoice {
  const all = getAllInvoices();
  const now = new Date().toISOString();
  
  // Créer les lignes avec IDs
  const lignes: InvoiceLine[] = data.lignes.map((ligne, index) => ({
    id: `line-${Date.now()}-${index}`,
    ...ligne,
  }));
  
  // Calculer les montants
  const { montantHT, montantTVA, montantTTC } = calculateAmounts(lignes, data.tauxTVA);
  
  const typeFacture = data.typeFacture || (data.bsdReference ? 'BSD' : data.specialOperationId ? 'Opération Spéciale' : 'Facture libre');
  const sourceModule = data.sourceModule ?? (data.bsdReference ? 'BSD' : data.specialOperationId ? 'operation_speciale' : 'libre');
  
  const newInvoice: Invoice = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    numeroFacture: generateInvoiceNumber(),
    date: now,
    dateEcheance: data.dateEcheance,
    typeFacture,
    clientId: data.clientId,
    clientNom: data.clientNom,
    clientAdresse: data.clientAdresse,
    clientSiret: data.clientSiret,
    operationId: data.operationId,
    bsdReference: data.bsdReference,
    specialOperationId: data.specialOperationId,
    sourceModule,

    montantHT,
    tauxTVA: data.tauxTVA,
    montantTVA,
    montantTTC,
    statutPaiement: 'Non payé',
    modeReglement: data.modeReglement,
    montantEncaisse: 0,
    soldeRestant: montantTTC,
    payments: [],
    lignes,
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  };
  
  all.push(newInvoice);
  saveInvoices(all);
  
  return newInvoice;
}

/**
 * Met à jour une facture existante
 */
export function updateInvoice(id: string, updates: Partial<Invoice>, userId: string): Invoice | null {
  const all = getAllInvoices();
  const index = all.findIndex(inv => inv.id === id);
  
  if (index === -1) return null;
  
  const updated: Invoice = {
    ...all[index],
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  };
  
  // Recalculer les montants si les lignes ont changé
  if (updates.lignes) {
    const amounts = calculateAmounts(updated.lignes, updated.tauxTVA);
    updated.montantHT = amounts.montantHT;
    updated.montantTVA = amounts.montantTVA;
    updated.montantTTC = amounts.montantTTC;
  }
  
  all[index] = updated;
  saveInvoices(all);
  
  return updated;
}

/**
 * Marque une facture comme payée
 */
export function markInvoiceAsPaid(
  id: string,
  modeReglement: Invoice['modeReglement'],
  userId: string,
  paymentDetails?: Invoice['paymentDetails'],
  paymentAttachment?: Invoice['paymentAttachment'],
  paidAmount?: number,
): Invoice | null {
  const invoice = getInvoiceById(id);
  if (!invoice) return null;

  const previousEncaisse = invoice.montantEncaisse ?? 0;
  const previousRemaining = Math.max(0, invoice.montantTTC - previousEncaisse);
  const normalizedAmount = Number.isFinite(paidAmount)
    ? Math.max(0, Math.min(previousRemaining, Number(paidAmount)))
    : previousRemaining;

  const nextEncaisse = Math.max(0, previousEncaisse + normalizedAmount);
  const nextRemaining = Math.max(0, invoice.montantTTC - nextEncaisse);
  const finalStatus: Invoice['statutPaiement'] = nextRemaining <= 0 ? 'Payé' : 'Partiellement payé';

  const paymentEntry: InvoicePaymentEntry = {
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    amount: normalizedAmount,
    date: new Date().toISOString(),
    mode: modeReglement,
    label: nextRemaining > 0 ? 'Acompte' : previousEncaisse > 0 ? 'Règlement final' : 'Paiement',
  };

  const payments = [...(invoice.payments || []), paymentEntry];

  return updateInvoice(id, {
    statutPaiement: finalStatus,
    modeReglement,
    datePaiement: finalStatus === 'Payé' ? paymentEntry.date : invoice.datePaiement,
    paymentDetails,
    paymentAttachment,
    montantEncaisse: nextEncaisse,
    soldeRestant: nextRemaining,
    payments,
  }, userId);
}

/**
 * Supprime une facture (soft delete)
 */
export function deleteInvoice(id: string): boolean {
  const all = getAllInvoices();
  const filtered = all.filter(inv => inv.id !== id);
  
  if (filtered.length === all.length) return false;
  
  saveInvoices(filtered);
  return true;
}

/**
 * Calcule les statistiques de facturation
 */
export function getInvoiceStats(): InvoiceStats {
  const invoices = getAllInvoices();
  
  const payees = invoices.filter(inv => inv.statutPaiement === 'Payé');
  const enAttente = invoices.filter(inv => inv.statutPaiement === 'En attente' || inv.statutPaiement === 'Partiellement payé');
  const nonPayees = invoices.filter(inv => inv.statutPaiement === 'Non payé');
  
  return {
    totalFactures: invoices.length,
    totalMontantHT: invoices.reduce((sum, inv) => sum + inv.montantHT, 0),
    totalMontantTTC: invoices.reduce((sum, inv) => sum + inv.montantTTC, 0),
    nombrePayees: payees.length,
    montantPayes: payees.reduce((sum, inv) => sum + inv.montantTTC, 0),
    nombreEnAttente: enAttente.length,
    montantEnAttente: enAttente.reduce((sum, inv) => sum + (inv.soldeRestant ?? inv.montantTTC), 0),
    nombreNonPayees: nonPayees.length,
    montantNonPayes: nonPayees.reduce((sum, inv) => sum + inv.montantTTC, 0),
  };
}

/**
 * Génère automatiquement une facture à partir d'un BSD (Section 9 complète)
 * Cette fonction est appelée lorsqu'un BSD est finalisé (section9Complete = true)
 */
export function generateInvoiceFromBSD(
  bsdId: string,
  prixUnitaireHT: number, // Prix à la tonne/m³
  tauxTVA: number = 18,
  userId: string
): Invoice | null {
  const allBSD = getAllBSD();
  const bsd = allBSD.find(b => b.id === bsdId);
  
  if (!bsd || !bsd.section9Complete) {
    console.error('BSD non trouvé ou section 9 non complète');
    return null;
  }
  
  // Vérifier si une facture n'existe pas déjà pour ce BSD
  const existing = getAllInvoices().find(inv => inv.bsdReference === bsd.numeroBSDS);
  if (existing) {
    console.warn('Une facture existe déjà pour ce BSD');
    return existing;
  }
  
  // Créer la ligne de facturation
  const totalHT = bsd.quantite * prixUnitaireHT;
  
  const invoiceData: NewInvoiceData = {
    clientId: bsd.client,
    clientNom: bsd.client,
    bsdReference: bsd.numeroBSDS,
    operationId: bsd.operationId,
    dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 jours
    tauxTVA,
    lignes: [
      {
        description: `Gestion de déchets - ${bsd.typeDechet} (${bsd.codeDechet})`,
        quantite: bsd.quantite,
        unite: bsd.unite,
        prixUnitaireHT,
        totalHT,
      }
    ],
    notes: `Facture générée automatiquement suite à la validation du BSD ${bsd.numeroBSDS}`,
  };
  
  return createInvoice(invoiceData, userId);
}

/**
 * Génère le PDF d'une facture avec le numéro de BSD intégré
 */
export async function generateInvoicePDF(invoiceId: string): Promise<void> {
  const invoice = getInvoiceById(invoiceId);
  if (!invoice) {
    console.error('Facture non trouvée');
    return;
  }
  
  const doc = new jsPDF();
  const baseConfig = loadBaseConfig();
  const logoDataUrl = await getLogoDataUrl();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const paymentDetails = invoice.paymentDetails;
  
  // En-tête (logo + identité)
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'JPEG', 16, 10, 40, 20, undefined, 'FAST');
  }
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', pageWidth - 16, 22, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(baseConfig.baseName || 'IVOS', 62, 16);
  doc.text('Gestion des Déchets & Opérations', 62, 21);
  doc.text(`Tél: ${baseConfig.phone}`, 62, 26);
  doc.text(baseConfig.address, 62, 31);

  doc.setDrawColor(220, 220, 220);
  doc.line(16, 40, pageWidth - 16, 40);
  
  // Numéro de facture
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° ${invoice.numeroFacture}`, 20, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Date : ${new Date(invoice.date).toLocaleDateString('fr-FR')}`, 20, 56);
  doc.text(`Échéance : ${new Date(invoice.dateEcheance).toLocaleDateString('fr-FR')}`, 20, 62);
  
  // Référence opération
  const ref = invoice.bsdReference
    ? `BSD : ${invoice.bsdReference}`
    : invoice.specialOperationId
      ? `Opération Spéciale : ${invoice.specialOperationId}`
      : 'Facture libre';

  if (ref) {
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 68, 170, 8, 'F');
    doc.text(`Référence : ${ref}`, 22, 73.5);
    doc.setFont('helvetica', 'normal');
  }
  
  // Client
  const clientY = 86;
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT', 120, clientY);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.clientNom, 120, clientY + 6);
  if (invoice.clientAdresse) {
    doc.text(invoice.clientAdresse, 120, clientY + 12);
  }
  if (invoice.clientSiret) {
    doc.text(`SIRET : ${invoice.clientSiret}`, 120, clientY + 18);
  }
  
  // Lignes de facturation
  let currentY = clientY + 32;
  const xDesignation = 20;
  const xQty = 115;
  const xUnit = 130;
  const xUnitPrice = 160;
  const xTotal = 190;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(245, 248, 252);
  doc.rect(20, currentY - 4, 170, 8, 'F');
  doc.text('DÉSIGNATION', xDesignation, currentY);
  doc.text('QTÉ', xQty, currentY, { align: 'right' });
  doc.text('UNITÉ', xUnit, currentY, { align: 'right' });
  doc.text('PRIX UNITAIRE HT', xUnitPrice, currentY, { align: 'right' });
  doc.text('TOTAL HT', xTotal, currentY, { align: 'right' });
  
  doc.line(20, currentY + 2, 190, currentY + 2);
  currentY += 9;
  
  doc.setFont('helvetica', 'normal');
  invoice.lignes.forEach(ligne => {
    doc.text(ligne.description, xDesignation, currentY, { maxWidth: 84 });
    doc.text(formatQty(ligne.quantite), xQty, currentY, { align: 'right' });
    doc.text(ligne.unite, xUnit, currentY, { align: 'right' });
    doc.text(formatFCFA(ligne.prixUnitaireHT), xUnitPrice, currentY, { align: 'right' });
    doc.text(formatFCFA(ligne.totalHT), xTotal, currentY, { align: 'right' });
    doc.setDrawColor(235, 235, 235);
    doc.line(20, currentY + 2.5, 190, currentY + 2.5);
    currentY += 9;
  });

  // Zones séparées : règlement (gauche) / totaux (droite)
  const sectionsY = currentY + 8;

  // Bloc règlement
  const paymentBoxX = 20;
  const paymentBoxY = sectionsY;
  const paymentBoxW = 102;
  const paymentBoxH = 34;
  doc.setFillColor(250, 250, 250);
  doc.rect(paymentBoxX, paymentBoxY, paymentBoxW, paymentBoxH, 'F');
  doc.setDrawColor(228, 228, 228);
  doc.rect(paymentBoxX, paymentBoxY, paymentBoxW, paymentBoxH);

  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.setFont('helvetica', 'bold');
  doc.text('RÈGLEMENT', paymentBoxX + 3, paymentBoxY + 5.5);

  doc.setFont('helvetica', 'normal');
  const statusColor: [number, number, number] = invoice.statutPaiement === 'Payé' ? [34, 197, 94] : [239, 68, 68];
  doc.setTextColor(...statusColor);
  doc.text(`Statut : ${invoice.statutPaiement}`, paymentBoxX + 3, paymentBoxY + 11.5);

  doc.setTextColor(60, 60, 60);
  doc.text(`Mode : ${invoice.modeReglement ?? 'Non défini'}`, paymentBoxX + 3, paymentBoxY + 17.5);
  if (invoice.modeReglement === 'Virement' && paymentDetails) {
    const txt = `${paymentDetails.banque ?? '—'} / ${paymentDetails.transactionId ?? '—'}`;
    doc.text(txt, paymentBoxX + 3, paymentBoxY + 23.5, { maxWidth: paymentBoxW - 6 });
  } else if (invoice.modeReglement === 'Chèque' && paymentDetails) {
    const txt = `Chèque ${paymentDetails.chequeNumber ?? '—'} - ${paymentDetails.issuingBank ?? '—'}`;
    doc.text(txt, paymentBoxX + 3, paymentBoxY + 23.5, { maxWidth: paymentBoxW - 6 });
  } else if (invoice.modeReglement === 'Espèces' && paymentDetails?.signedByOrReceiptRef) {
    doc.text(`Décharge : ${paymentDetails.signedByOrReceiptRef}`, paymentBoxX + 3, paymentBoxY + 23.5, { maxWidth: paymentBoxW - 6 });
  }

  // Bloc totaux (espacement renforcé label / montant)
  const totalsBoxX = 116;
  const totalsBoxY = sectionsY;
  const totalsBoxW = 74;
  const totalsBoxH = 36;
  const totalsLabelX = totalsBoxX + 5;
  const totalsValueX = totalsBoxX + totalsBoxW - 5;
  let totalsLineY = totalsBoxY + 8;

  doc.setFillColor(250, 250, 250);
  doc.rect(totalsBoxX, totalsBoxY, totalsBoxW, totalsBoxH, 'F');
  doc.setDrawColor(228, 228, 228);
  doc.rect(totalsBoxX, totalsBoxY, totalsBoxW, totalsBoxH);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9.5);
  doc.text('Total HT', totalsLabelX, totalsLineY);
  doc.text(formatFCFA(invoice.montantHT), totalsValueX, totalsLineY, { align: 'right' });
  totalsLineY += 7;

  doc.text(`TVA (${invoice.tauxTVA}%)`, totalsLabelX, totalsLineY);
  doc.text(formatFCFA(invoice.montantTVA), totalsValueX, totalsLineY, { align: 'right' });
  totalsLineY += 6;

  doc.setDrawColor(210, 210, 210);
  doc.line(totalsBoxX + 4, totalsLineY, totalsBoxX + totalsBoxW - 4, totalsLineY);
  totalsLineY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setFillColor(236, 246, 255);
  doc.rect(totalsBoxX + 2, totalsLineY - 4.5, totalsBoxW - 4, 7.5, 'F');
  doc.text('TOTAL TTC', totalsLabelX, totalsLineY);
  doc.text(formatFCFA(invoice.montantTTC), totalsValueX, totalsLineY, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  const notesY = sectionsY + Math.max(paymentBoxH, totalsBoxH) + 8;
  
  // Notes
  if (invoice.notes) {
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Notes :', 20, notesY);
    doc.text(invoice.notes, 20, notesY + 5, { maxWidth: 170 });
  }

  // Footer (infos légales + contact)
  doc.setTextColor(90, 90, 90);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.line(16, pageHeight - 18, pageWidth - 16, pageHeight - 18);
  doc.text(`Téléphone : ${baseConfig.phone} • Email : ${baseConfig.email}`, pageWidth / 2, pageHeight - 11, { align: 'center' });
  doc.text(`${baseConfig.address} • Document généré automatiquement - IVOS`, pageWidth / 2, pageHeight - 6, { align: 'center' });
  
  // Télécharger le PDF
  doc.save(`${invoice.numeroFacture}.pdf`);
}

/**
 * Récupère l'URL du PDF d'un BSD (à adapter selon votre stockage)
 */
export function getBSDPdfUrl(bsdReference: string): string {
  // À adapter selon votre système de stockage de PDF
  // Pour le moment, génère une URL fictive
  return `/api/bsd/${bsdReference}/pdf`;
}
