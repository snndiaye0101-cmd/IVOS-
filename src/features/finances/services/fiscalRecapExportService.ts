import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { FiscalRecap } from './fiscalReportingService';

function formatAmount(value: number) {
  return Math.round(value).toLocaleString('fr-FR');
}

function safeMonth(month: string) {
  return month.replace(/[^0-9A-Za-z-]/g, '-');
}

function formatRate(value: number | null) {
  return value == null ? 'Barème' : `${(value * 100).toFixed(2)}%`;
}

function getCurrencyByCountry(countryCode: string) {
  return countryCode === 'GN' ? 'GNF' : 'FCFA';
}

function getComptableAccounts(countryCode: string, label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes('ipres') || normalized.includes('cnps retraite') || normalized.includes('inps')) {
    return countryCode === 'CI'
      ? { charge: '641100', organisme: '431100' }
      : { charge: '641100', organisme: '431100' };
  }
  if (normalized.includes('css') || normalized.includes('cnps prestations')) {
    return countryCode === 'CI'
      ? { charge: '645200', organisme: '431200' }
      : { charge: '645200', organisme: '431200' };
  }
  if (normalized.includes('ipm') || normalized.includes('sante')) {
    return { charge: '645300', organisme: '431300' };
  }
  if (normalized.includes('its') || normalized.includes('irpp') || normalized === 'ir' || normalized.includes('rts')) {
    return { charge: '641410', organisme: '442100' };
  }
  if (normalized.includes('tfp')) {
    return { charge: '645900', organisme: '447100' };
  }
  return { charge: '641490', organisme: '447000' };
}

export function exportFiscalRecapToExcel(recap: FiscalRecap) {
  const ws = XLSX.utils.json_to_sheet(
    recap.rows.map((row) => ({
      Organisme: row.label,
      Salarial: Math.round(row.salarial),
      Patronal: Math.round(row.patronal),
      Total: Math.round(row.total),
    }))
  );

  XLSX.utils.sheet_add_aoa(ws, [
    ['Pays', recap.countryCode, 'Mois', recap.month],
    ['Fiches', recap.slipCount, 'Total dû', Math.round(recap.grandTotal)],
  ], { origin: 'F1' });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Recap Fiscal');
  const detailSheet = XLSX.utils.json_to_sheet(
    recap.detailRows.map((row) => ({
      Organisme: row.label,
      'Base salariale': Math.round(row.baseSalarial),
      'Taux salarial': formatRate(row.tauxSalarial),
      Salarial: Math.round(row.salarial),
      'Base patronale': Math.round(row.basePatronal),
      'Taux patronal': formatRate(row.tauxPatronal),
      Patronal: Math.round(row.patronal),
    }))
  );
  XLSX.utils.book_append_sheet(wb, detailSheet, 'Detail Organismes');
  XLSX.writeFile(wb, `recap-fiscal-${recap.countryCode.toLowerCase()}-${safeMonth(recap.month)}.xlsx`);
}

export function exportFiscalRecapToComptableExcel(recap: FiscalRecap) {
  const [year, month] = recap.month.split('-');
  const accountingDate = `${year}-${month}-01`;
  const piece = `FISC-${recap.countryCode}-${safeMonth(recap.month)}`;

  const rows: Array<Record<string, string | number>> = [];

  for (const row of recap.rows) {
    if (row.total <= 0) continue;
    const accounts = getComptableAccounts(recap.countryCode, row.label);

    if (row.salarial > 0) {
      rows.push({
        Date: accountingDate,
        Journal: 'OD',
        Piece: piece,
        Compte: accounts.charge,
        Libelle: `${row.label} part salariale`,
        Debit: Math.round(row.salarial),
        Credit: 0,
        Pays: recap.countryCode,
        Mois: recap.month,
      });
      rows.push({
        Date: accountingDate,
        Journal: 'OD',
        Piece: piece,
        Compte: accounts.organisme,
        Libelle: `${row.label} part salariale`,
        Debit: 0,
        Credit: Math.round(row.salarial),
        Pays: recap.countryCode,
        Mois: recap.month,
      });
    }

    if (row.patronal > 0) {
      rows.push({
        Date: accountingDate,
        Journal: 'OD',
        Piece: piece,
        Compte: accounts.charge,
        Libelle: `${row.label} part patronale`,
        Debit: Math.round(row.patronal),
        Credit: 0,
        Pays: recap.countryCode,
        Mois: recap.month,
      });
      rows.push({
        Date: accountingDate,
        Journal: 'OD',
        Piece: piece,
        Compte: accounts.organisme,
        Libelle: `${row.label} part patronale`,
        Debit: 0,
        Credit: Math.round(row.patronal),
        Pays: recap.countryCode,
        Mois: recap.month,
      });
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.sheet_add_aoa(ws, [
    ['Pays', recap.countryCode, 'Mois', recap.month],
    ['Total debit', Math.round(recap.grandTotal), 'Total credit', Math.round(recap.grandTotal)],
  ], { origin: 'L1' });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ecritures Comptables');
  XLSX.writeFile(wb, `recap-fiscal-comptable-${recap.countryCode.toLowerCase()}-${safeMonth(recap.month)}.xlsx`);
}

export function exportFiscalRecapToPdf(recap: FiscalRecap) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 28;
  const currency = getCurrencyByCountry(recap.countryCode);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(31, 41, 55);
  doc.text('Récapitulatif Fiscal', margin, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 100, 115);
  doc.text(`Pays: ${recap.countryCode}    Mois: ${recap.month}    Fiches: ${recap.slipCount}`, margin, 54);
  doc.text(`Total salarial: ${formatAmount(recap.salarialTotal)} ${currency}`, margin, 72);
  doc.text(`Total patronal: ${formatAmount(recap.patronalTotal)} ${currency}`, margin + 180, 72);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total dû: ${formatAmount(recap.grandTotal)} ${currency}`, pageWidth - margin, 72, { align: 'right' });

  autoTable(doc, {
    startY: 92,
    margin: { left: margin, right: margin },
    head: [['Organisme', 'Salarial', 'Patronal', 'Total']],
    body: recap.rows.map((row) => [
      row.label,
      `${formatAmount(row.salarial)} ${currency}`,
      `${formatAmount(row.patronal)} ${currency}`,
      `${formatAmount(row.total)} ${currency}`,
    ]),
    styles: {
      fontSize: 10,
      cellPadding: 6,
      lineColor: [220, 226, 232],
      lineWidth: 0.2,
      halign: 'right',
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 220 },
      1: { cellWidth: 95 },
      2: { cellWidth: 95 },
      3: { cellWidth: 95 },
    },
  });

  const footerY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 120) + 18;
  autoTable(doc, {
    startY: footerY + 16,
    margin: { left: margin, right: margin },
    head: [['Organisme', 'Base sal.', 'Taux sal.', 'Salarial', 'Base pat.', 'Taux pat.', 'Patronal']],
    body: recap.detailRows.map((row) => [
      row.label,
      `${formatAmount(row.baseSalarial)} ${currency}`,
      formatRate(row.tauxSalarial),
      `${formatAmount(row.salarial)} ${currency}`,
      `${formatAmount(row.basePatronal)} ${currency}`,
      formatRate(row.tauxPatronal),
      `${formatAmount(row.patronal)} ${currency}`,
    ]),
    styles: {
      fontSize: 9,
      cellPadding: 5,
      lineColor: [220, 226, 232],
      lineWidth: 0.2,
      halign: 'right',
    },
    headStyles: {
      fillColor: [236, 253, 245],
      textColor: [6, 78, 59],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 124 },
      1: { cellWidth: 72 },
      2: { cellWidth: 52 },
      3: { cellWidth: 72 },
      4: { cellWidth: 72 },
      5: { cellWidth: 52 },
      6: { cellWidth: 72 },
    },
  });

  const totalY = (((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY) || (footerY + 16)) + 18;
  doc.setDrawColor(200, 210, 220);
  doc.line(margin, totalY, pageWidth - margin, totalY);
  doc.setFont('helvetica', 'bold');
  doc.text('Total global', margin, totalY + 18);
  doc.text(`${formatAmount(recap.grandTotal)} ${currency}`, pageWidth - margin, totalY + 18, { align: 'right' });

  doc.save(`recap-fiscal-${recap.countryCode.toLowerCase()}-${safeMonth(recap.month)}.pdf`);
}

export function exportFiscalMonthlyStatementsByOrganism(recap: FiscalRecap) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 28;
  const pageWidth = doc.internal.pageSize.getWidth();

  const activeRows = recap.rows.filter((row) => row.total > 0);
  activeRows.forEach((row, index) => {
    if (index > 0) doc.addPage();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(31, 41, 55);
    doc.text('Bordereau Mensuel Organisme', margin, 36);

    doc.setFontSize(13);
    doc.setTextColor(15, 118, 110);
    doc.text(row.label, margin, 58);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(90, 100, 115);
    doc.text(`Pays: ${recap.countryCode}    Mois: ${recap.month}`, margin, 76);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text(`Salarial: ${formatAmount(row.salarial)} FCFA`, margin, 98);
    doc.text(`Patronal: ${formatAmount(row.patronal)} FCFA`, margin + 190, 98);
    doc.text(`Total: ${formatAmount(row.total)} FCFA`, pageWidth - margin, 98, { align: 'right' });

    const detailRows = recap.detailRows.filter((detail) => {
      const prefix = row.label.toLowerCase().split(' ')[0];
      return detail.label.toLowerCase().includes(prefix);
    });

    autoTable(doc, {
      startY: 116,
      margin: { left: margin, right: margin },
      head: [['Organisme', 'Base sal.', 'Taux sal.', 'Salarial', 'Base pat.', 'Taux pat.', 'Patronal']],
      body: (detailRows.length > 0 ? detailRows : [{
        label: row.label,
        baseSalarial: 0,
        tauxSalarial: null,
        salarial: row.salarial,
        basePatronal: 0,
        tauxPatronal: null,
        patronal: row.patronal,
      }]).map((detail) => [
        detail.label,
        `${formatAmount(detail.baseSalarial)} FCFA`,
        formatRate(detail.tauxSalarial),
        `${formatAmount(detail.salarial)} FCFA`,
        `${formatAmount(detail.basePatronal)} FCFA`,
        formatRate(detail.tauxPatronal),
        `${formatAmount(detail.patronal)} FCFA`,
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 5,
        lineColor: [220, 226, 232],
        lineWidth: 0.2,
        halign: 'right',
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 124 },
        1: { cellWidth: 72 },
        2: { cellWidth: 52 },
        3: { cellWidth: 72 },
        4: { cellWidth: 72 },
        5: { cellWidth: 52 },
        6: { cellWidth: 72 },
      },
    });
  });

  doc.save(`bordereaux-organismes-${recap.countryCode.toLowerCase()}-${safeMonth(recap.month)}.pdf`);
}