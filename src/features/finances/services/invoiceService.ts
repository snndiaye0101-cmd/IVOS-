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
import { loadBaseConfig, DEFAULT_BASE_CONFIG } from '../../settings/services/baseConfigStore';
import { loadSiteSettings } from '../../settings/services/siteConfigStore';
import { useAppContext } from '../../../shared/store/useAppContext';
import { syncRevenuesFromInvoices } from './revenueService';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { numberToFrenchWords } from './payrollPdfService';
import { cleanAmountToInteger, formatMontantFCFA, formatMonetaryValue, purgerEtFormatFCFA } from '@/shared/utils/formatAmount';

const STORAGE_KEY = 'ivos_invoices_v1';

let logoDataUrlCache: string | null | undefined;

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
const lignes: InvoiceLine[] = data.lignes.map((ligne, index) => {
    const quantite = Number.isFinite(ligne.quantite) ? ligne.quantite : 0;
    const prixUnitaireHT = cleanAmountToInteger(ligne.prixUnitaireHT);
    const totalHT = cleanAmountToInteger(ligne.totalHT ?? quantite * prixUnitaireHT);

    return {
      id: `line-${Date.now()}-${index}`,
      description: ligne.description,
      quantite,
      unite: ligne.unite,
      prixUnitaireHT,
      totalHT,
    };
  });
  
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
    updated.lignes = updates.lignes.map((ligne) => ({
      ...ligne,
      prixUnitaireHT: cleanAmountToInteger(ligne.prixUnitaireHT),
      totalHT: cleanAmountToInteger(ligne.totalHT),
    }));
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
    ? Math.max(0, Math.min(previousRemaining, cleanAmountToInteger(paidAmount)))
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

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const pageTopMargin = 12;
  const pageBottomMargin = 10;
  const headerHeight = 42;
  const footerBandHeight = 26;
  const headerTop = pageTopMargin;
  const contentWidth = pageWidth - margin * 2;
  const primary = [26, 54, 93];
  const slate = [113, 128, 150];
  const lightFill = [247, 250, 252];
  const darkText = [30, 41, 59];
  const mutedText = [90, 90, 90];

  let baseConfig = loadBaseConfig();
  try {
    const siteId = useAppContext.getState().currentSiteId;
    if (siteId) {
      const s = loadSiteSettings(siteId);
      baseConfig = { ...DEFAULT_BASE_CONFIG, ...(s.baseConfig || {}) };
    }
  } catch {
    baseConfig = loadBaseConfig();
  }

  const logoDataUrl = await getLogoDataUrl();
  const paymentDetails = invoice.paymentDetails;
  const verificationUrl = `https://ivos.sn/verify/invoice/${invoiceId}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    width: 115,
    margin: 1,
    color: { dark: '#1d4ed8', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
  const amountInWords = numberToFrenchWords(invoice.montantTTC);
  const invoiceReference = invoice.bsdReference
    ? `BSD : ${invoice.bsdReference}`
    : invoice.specialOperationId
      ? `Opération Spéciale : ${invoice.specialOperationId}`
      : 'Facture libre';

  const watermarkSize = contentWidth * 0.65;
  if (logoDataUrl) {
    try {
      const GStateClass = (doc as any).GState;
      if (GStateClass) {
        const watermarkState = new GStateClass({ opacity: 0.03 });
        doc.setGState(watermarkState);
      }
      doc.addImage(
        logoDataUrl,
        'JPEG',
        pageWidth / 2 - watermarkSize / 2,
        pageHeight / 2 - watermarkSize / 2,
        watermarkSize,
        watermarkSize,
        undefined,
        'FAST'
      );
      if ((doc as any).setGState) {
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
      }
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(72);
      doc.setTextColor(245, 245, 245);
      doc.text('IVOS', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        baseline: 'middle',
      });
    }
  }

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'JPEG', margin, headerTop + 4, 34, 20, undefined, 'FAST');
  }

  (doc as any).setFillColor(...(primary as any[]));
  doc.rect(0, headerTop, pageWidth, headerHeight, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('IVOS', margin + 40, headerTop + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Gestion des Déchets & Opérations', margin + 40, headerTop + 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('FACTURE', pageWidth - margin, headerTop + 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Tél : ${baseConfig.phone}`, pageWidth - margin, headerTop + 26, { align: 'right' });
  doc.text(baseConfig.email, pageWidth - margin, headerTop + 31, { align: 'right' });
  doc.text(baseConfig.address, pageWidth - margin, headerTop + 36, { align: 'right' });

  const infoBoxTop = headerTop + headerHeight + 8;
  const infoBoxHeight = 44;
  (doc as any).setFillColor(...(lightFill as any[]));
  doc.roundedRect(margin, infoBoxTop, contentWidth, infoBoxHeight, 2, 2, 'F');
  (doc as any).setDrawColor(...(primary as any[]));
  doc.setLineWidth(0.8);
  doc.line(margin + 10, infoBoxTop, margin + 10, infoBoxTop + infoBoxHeight);
  doc.setFont('helvetica', 'bold');
  (doc as any).setTextColor(...(primary as any[]));
  doc.text('FACTURE N°', margin + 12, infoBoxTop + 12);
  doc.setFont('helvetica', 'normal');
  (doc as any).setTextColor(...(darkText as any[]));
  doc.text(invoice.numeroFacture, margin + 12, infoBoxTop + 18);
  doc.text(`Date : ${new Date(invoice.date).toLocaleDateString('fr-FR')}`, margin + 12, infoBoxTop + 24);
  doc.setFont('helvetica', 'bold');
  (doc as any).setTextColor(...(primary as any[]));
  doc.text('Échéance', pageWidth - margin, infoBoxTop + 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  (doc as any).setTextColor(...(darkText as any[]));
  doc.text(new Date(invoice.dateEcheance).toLocaleDateString('fr-FR'), pageWidth - margin, infoBoxTop + 18, { align: 'right' });
  doc.text(invoiceReference, pageWidth - margin, infoBoxTop + 24, { align: 'right' });

  const clientTop = infoBoxTop + infoBoxHeight + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  (doc as any).setTextColor(...(primary as any[]));
  doc.text('CLIENT', margin, clientTop);
  let clientLineY = clientTop + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  (doc as any).setTextColor(...(darkText as any[]));
  doc.text(invoice.clientNom, margin, clientLineY);
  clientLineY += 6;
  if (invoice.clientAdresse) {
    doc.text(invoice.clientAdresse, margin, clientLineY);
    clientLineY += 6;
  }
  if (invoice.clientSiret) {
    doc.text(`SIRET : ${invoice.clientSiret}`, margin, clientLineY);
    clientLineY += 6;
  }

  let currentY = clientLineY + 10;
  const xDesignation = margin;
  const xQty = margin + contentWidth * 0.35;
  const xUnit = margin + contentWidth * 0.55;
  const xUnitPrice = margin + contentWidth * 0.72;
  const xTotal = pageWidth - margin;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  (doc as any).setFillColor(...(lightFill as any[]));
  doc.rect(margin, currentY - 4, contentWidth, 8, 'F');
  (doc as any).setTextColor(...(primary as any[]));
  doc.text('DÉSIGNATION', xDesignation, currentY);
  doc.text('QTÉ', xQty, currentY, { align: 'right' });
  doc.text('UNITÉ', xUnit, currentY, { align: 'right' });
  doc.text('PRIX UNITAIRE HT', xUnitPrice, currentY, { align: 'right' });
  doc.text('TOTAL HT', xTotal, currentY, { align: 'right' });
  doc.setDrawColor(216, 222, 233);
  doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);
  currentY += 10;

  doc.setFont('helvetica', 'normal');
  const descriptionWidth = xQty - xDesignation - 6;

  invoice.lignes.forEach((ligne, index) => {
    const descriptionLines = doc.splitTextToSize(String(ligne.description ?? '—'), descriptionWidth);
    const rowHeight = Math.max(6, descriptionLines.length * 5.5);
    const pageInnerBottom = pageHeight - footerBandHeight - 10;

    if (currentY + rowHeight > pageInnerBottom) {
      addFooter();
      doc.addPage();
      currentY = pageTopMargin + headerHeight + 10;
    }

    if (index % 2 === 0) {
      (doc as any).setFillColor(...(lightFill as any[]));
      doc.rect(margin, currentY - 4, contentWidth, rowHeight + 4, 'F');
    }

    (doc as any).setTextColor(...(darkText as any[]));
    doc.text(descriptionLines, xDesignation, currentY);
    doc.text(formatQty(ligne.quantite), xQty, currentY, { align: 'right' });
    doc.text(ligne.unite || '—', xUnit, currentY, { align: 'right' });
    doc.text(purgerEtFormatFCFA(ligne.prixUnitaireHT), xUnitPrice, currentY, { align: 'right' });
    doc.text(purgerEtFormatFCFA(ligne.totalHT), xTotal, currentY, { align: 'right' });
    doc.setDrawColor(233, 236, 239);
    doc.line(margin, currentY + rowHeight + 2, pageWidth - margin, currentY + rowHeight + 2);
    currentY += rowHeight + 4;
  });

  const sectionTop = currentY + 14;
  const leftCellWidth = contentWidth * 0.3;
  const rightCellWidth = contentWidth - leftCellWidth - 8;
  const qrSide = 30.5;
  const footerCellTop = sectionTop;
  const footerCellHeight = Math.max(qrSide + 24, 92);
  const leftCellX = margin;
  const rightCellX = margin + leftCellWidth + 8;
  const qrX = leftCellX + (leftCellWidth - qrSide) / 2;
  const qrY = footerCellTop + 10;

  doc.setFillColor(250, 250, 250);
  doc.rect(leftCellX, footerCellTop, leftCellWidth, footerCellHeight, 'F');
  doc.rect(rightCellX, footerCellTop, rightCellWidth, footerCellHeight, 'F');
  doc.setDrawColor(220, 224, 230);
  doc.rect(leftCellX, footerCellTop, leftCellWidth, footerCellHeight);
  doc.rect(rightCellX, footerCellTop, rightCellWidth, footerCellHeight);

  if (qrDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrX - 4, qrY - 4, qrSide + 8, qrSide + 8, 3, 3, 'F');
    doc.setDrawColor(220, 224, 230);
    doc.roundedRect(qrX - 4, qrY - 4, qrSide + 8, qrSide + 8, 3, 3);
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSide, qrSide, undefined, 'FAST');
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  (doc as any).setTextColor(...(darkText as any[]));
  doc.text('VÉRIFICATION', leftCellX + 4, footerCellTop + qrSide + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  (doc as any).setTextColor(...(mutedText as any[]));
  doc.text('Scannez ce QR code pour valider la facture sur IVOS.', leftCellX + 4, footerCellTop + qrSide + 24, {
    maxWidth: leftCellWidth - 8,
  });

  const totalsLabelX = rightCellX + 4;
  const totalsValueX = rightCellX + rightCellWidth - 4;
  let totalsY = footerCellTop + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  (doc as any).setTextColor(...(primary as any[]));
  doc.text('TOTALS FACTURE', totalsLabelX, totalsY);
  totalsY += 8;
  doc.setFont('helvetica', 'normal');
  (doc as any).setTextColor(...(darkText as any[]));
  doc.setFontSize(9);
  doc.text('Total HT', totalsLabelX, totalsY);
  doc.text(purgerEtFormatFCFA(invoice.montantHT), totalsValueX, totalsY, { align: 'right' });
  totalsY += 7;
  doc.text(`TVA (${invoice.tauxTVA}%)`, totalsLabelX, totalsY);
  doc.text(purgerEtFormatFCFA(invoice.montantTVA), totalsValueX, totalsY, { align: 'right' });
  totalsY += 7;
  doc.setDrawColor(210, 210, 210);
  doc.line(rightCellX + 4, totalsY, rightCellX + rightCellWidth - 4, totalsY);
  totalsY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setFillColor(236, 246, 255);
  doc.rect(rightCellX + 3, totalsY - 5, rightCellWidth - 6, 10, 'F');
  (doc as any).setTextColor(...(primary as any[]));
  doc.text('TOTAL TTC', totalsLabelX, totalsY);
  doc.text(purgerEtFormatFCFA(invoice.montantTTC), totalsValueX, totalsY, { align: 'right' });
  totalsY += 16;

  const arrestBoxTop = totalsY;
  const arrestBoxHeight = 28;
  doc.setFillColor(247, 250, 252);
  doc.setDrawColor(203, 213, 224);
  doc.setLineWidth(0.5);
  doc.roundedRect(rightCellX + 3, arrestBoxTop, rightCellWidth - 6, arrestBoxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  (doc as any).setTextColor(...(darkText as any[]));
  doc.text('Arrêtée la présente facture à la somme de :', rightCellX + 5, arrestBoxTop + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  (doc as any).setTextColor(...(mutedText as any[]));
  doc.text(`${amountInWords.charAt(0).toUpperCase() + amountInWords.slice(1)} (${purgerEtFormatFCFA(invoice.montantTTC)})`, rightCellX + 5, arrestBoxTop + 16, {
    maxWidth: rightCellWidth - 14,
  });

  function addFooter() {
    const footerTop = pageHeight - footerBandHeight;
    doc.setFillColor(26, 54, 93);
    doc.rect(0, footerTop, pageWidth, footerBandHeight, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    const footerText = 'IVOS SARL — Capital Social: 10 000 000 FCFA — NINEA: 008765432 2G3 — RC: SN.DKR.2017.B.1234   Immeuble Horizon, Les Mamelles, Dakar, Sénégal — Contact: contact@ivos.sn';
    doc.text(footerText, pageWidth / 2, footerTop + 10, {
      align: 'center',
      maxWidth: contentWidth,
    });
  }

  addFooter();
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
