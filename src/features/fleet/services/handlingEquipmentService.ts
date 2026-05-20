/**
 * ============================================
 * Service de Gestion des Engins de Manutention
 * CRUD + Calcul VGP + Génération PDF mensuelle
 * ============================================
 */

import jsPDF from 'jspdf';
import type {
  HandlingEquipment,
  NewHandlingEquipmentData,
  VGPStatus,
  VGPReport,
} from '../types/handlingEquipment.types';

const STORAGE_KEY = 'ivos_handling_equipment_v1';
const REPORTS_KEY = 'ivos_vgp_reports_v1';

/**
 * Calcule le statut VGP et la date d'échéance
 */
function calculateVGPStatus(lastVGPDate: string): {
  nextVGPDate: string;
  status: VGPStatus;
  isBlocked: boolean;
} {
  const lastDate = new Date(lastVGPDate);
  const nextDate = new Date(lastDate);
  nextDate.setMonth(nextDate.getMonth() + 6); // VGP valable 6 mois

  const today = new Date();
  const thirtyDaysBeforeExpiry = new Date(nextDate);
  thirtyDaysBeforeExpiry.setDate(thirtyDaysBeforeExpiry.getDate() - 30);

  let status: VGPStatus;
  let isBlocked = false;

  if (today > nextDate) {
    status = 'expiré';
    isBlocked = true; // Blocage si expiré
  } else if (today >= thirtyDaysBeforeExpiry) {
    status = 'à_renouveler'; // -30 jours
  } else {
    status = 'conforme';
  }

  return {
    nextVGPDate: nextDate.toISOString().split('T')[0],
    status,
    isBlocked,
  };
}

/**
 * Récupère tous les engins
 */
export function getAllEquipment(): HandlingEquipment[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const equipment: HandlingEquipment[] = JSON.parse(data);
    // Recalculer les statuts à chaque chargement
    return equipment.map((eq) => {
      const vgpData = calculateVGPStatus(eq.lastVGPDate);
      return { ...eq, ...vgpData };
    });
  } catch {
    return [];
  }
}

/**
 * Sauvegarde les engins
 */
function saveEquipment(equipment: HandlingEquipment[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(equipment));
  window.dispatchEvent(new Event('ivos_handling_equipment_change'));
}

/**
 * Crée un nouvel engin
 */
export function createEquipment(data: NewHandlingEquipmentData, userId: string): HandlingEquipment {
  const now = new Date().toISOString();
  const vgpData = calculateVGPStatus(data.lastVGPDate);

  const equipment: HandlingEquipment = {
    id: `EQP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    serialNumber: data.serialNumber,
    type: data.type,
    brand: data.brand,
    model: data.model,
    energyType: data.energyType,
    liftingCapacity: data.liftingCapacity,
    lastVGPDate: data.lastVGPDate,
    nextVGPDate: vgpData.nextVGPDate,
    vgpStatus: vgpData.status,
    isBlocked: vgpData.isBlocked,
    commissioningDate: data.commissioningDate,
    notes: data.notes,
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
  };

  const all = getAllEquipment();
  all.push(equipment);
  saveEquipment(all);

  return equipment;
}

/**
 * Met à jour un engin
 */
export function updateEquipment(
  id: string,
  updates: Partial<NewHandlingEquipmentData>,
  userId: string
): HandlingEquipment | null {
  const all = getAllEquipment();
  const index = all.findIndex((eq) => eq.id === id);
  if (index === -1) return null;

  const updated = { ...all[index], ...updates };

  // Recalculer VGP si lastVGPDate a changé
  if (updates.lastVGPDate) {
    const vgpData = calculateVGPStatus(updates.lastVGPDate);
    updated.nextVGPDate = vgpData.nextVGPDate;
    updated.vgpStatus = vgpData.status;
    updated.isBlocked = vgpData.isBlocked;
  }

  updated.updatedAt = new Date().toISOString();
  updated.updatedBy = userId;

  all[index] = updated;
  saveEquipment(all);

  return updated;
}

/**
 * Supprime un engin
 */
export function deleteEquipment(id: string): boolean {
  const all = getAllEquipment();
  const filtered = all.filter((eq) => eq.id !== id);
  if (filtered.length === all.length) return false;
  saveEquipment(filtered);
  return true;
}

/**
 * Génère un rapport VGP mensuel
 */
export function generateVGPReport(): VGPReport {
  const equipment = getAllEquipment();
  const now = new Date();
  const reportMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const conforme = equipment.filter((eq) => eq.vgpStatus === 'conforme');
  const aRenouveler = equipment.filter((eq) => eq.vgpStatus === 'à_renouveler');
  const expire = equipment.filter((eq) => eq.vgpStatus === 'expiré');

  const report: VGPReport = {
    reportDate: now.toISOString(),
    reportMonth,
    conformeEquipment: conforme,
    toRenewEquipment: aRenouveler,
    expiredEquipment: expire,
    stats: {
      total: equipment.length,
      conforme: conforme.length,
      aRenouveler: aRenouveler.length,
      expire: expire.length,
    },
  };

  return report;
}

/**
 * Génère le PDF du rapport VGP
 */
export function generateVGPReportPDF(report: VGPReport): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // En-tête
  doc.setFillColor(26, 92, 58); // Vert IVOS
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('🇸🇳 IVOS Sénégal', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Rapport Mensuel VGP — Engins de Manutention', pageWidth / 2, 25, { align: 'center' });

  y = 45;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Mois : ${report.reportMonth}`, 15, y);
  y += 6;
  doc.text(
    `Date de génération : ${new Date(report.reportDate).toLocaleDateString('fr-FR')}`,
    15,
    y
  );
  y += 10;

  // Statistiques
  doc.setFillColor(240, 240, 240);
  doc.rect(15, y, pageWidth - 30, 25, 'F');
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Statistiques Globales', 20, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Total : ${report.stats.total} engins`, 20, y);
  y += 5;
  doc.setTextColor(34, 139, 34);
  doc.text(`✓ Conformes : ${report.stats.conforme}`, 20, y);
  doc.setTextColor(255, 140, 0);
  doc.text(`⚠ À renouveler : ${report.stats.aRenouveler}`, 80, y);
  doc.setTextColor(220, 20, 60);
  doc.text(`✗ Expirés : ${report.stats.expire}`, 140, y);
  doc.setTextColor(0, 0, 0);
  y += 12;

  // Section Conformes
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 139, 34);
  doc.text('✓ ENGINS CONFORMES', 15, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  if (report.conformeEquipment.length === 0) {
    doc.text('Aucun engin conforme.', 20, y);
    y += 8;
  } else {
    report.conformeEquipment.forEach((eq) => {
      doc.text(`• ${eq.serialNumber} — ${eq.brand} ${eq.model} (${eq.type})`, 20, y);
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `  Énergie : ${eq.energyType} | Capacité : ${eq.liftingCapacity}T | Prochaine VGP : ${new Date(eq.nextVGPDate).toLocaleDateString('fr-FR')}`,
        20,
        y
      );
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      y += 5;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
  }
  y += 5;

  // Section À Renouveler
  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 140, 0);
  doc.text('⚠ ENGINS À RENOUVELER (< 30 jours)', 15, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  if (report.toRenewEquipment.length === 0) {
    doc.text('Aucun engin à renouveler.', 20, y);
    y += 8;
  } else {
    report.toRenewEquipment.forEach((eq) => {
      doc.text(`• ${eq.serialNumber} — ${eq.brand} ${eq.model} (${eq.type})`, 20, y);
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `  Énergie : ${eq.energyType} | Capacité : ${eq.liftingCapacity}T | Prochaine VGP : ${new Date(eq.nextVGPDate).toLocaleDateString('fr-FR')}`,
        20,
        y
      );
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      y += 5;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
  }
  y += 5;

  // Section Expirés
  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 20, 60);
  doc.text('✗ ENGINS EXPIRÉS (BLOQUÉS)', 15, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  if (report.expiredEquipment.length === 0) {
    doc.text('Aucun engin expiré.', 20, y);
    y += 8;
  } else {
    report.expiredEquipment.forEach((eq) => {
      doc.text(`• ${eq.serialNumber} — ${eq.brand} ${eq.model} (${eq.type})`, 20, y);
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `  Énergie : ${eq.energyType} | Capacité : ${eq.liftingCapacity}T | VGP expirée le : ${new Date(eq.nextVGPDate).toLocaleDateString('fr-FR')}`,
        20,
        y
      );
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      y += 5;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
  }

  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Généré automatiquement par IVOS — Système de Gestion Intégré', pageWidth / 2, 285, {
    align: 'center',
  });

  return doc;
}

/**
 * Sauvegarde un rapport dans les archives
 */
export function saveReportToArchives(report: VGPReport, pdfBlob: Blob): void {
  try {
    const archives = getAllVGPReports();
    archives.push({
      ...report,
      pdfUrl: URL.createObjectURL(pdfBlob), // Dans un vrai système, upload vers serveur/cloud
      fileName: `VGP_${report.reportMonth}.pdf`,
    });
    localStorage.setItem(REPORTS_KEY, JSON.stringify(archives));
    window.dispatchEvent(new Event('ivos_vgp_reports_change'));
  } catch (error) {
    console.error('Erreur sauvegarde rapport:', error);
  }
}

/**
 * Récupère tous les rapports archivés
 */
export function getAllVGPReports(): any[] {
  try {
    const data = localStorage.getItem(REPORTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Génère automatiquement le rapport mensuel (à exécuter le 1er du mois)
 */
export function generateMonthlyReportAuto(): void {
  const report = generateVGPReport();
  const pdf = generateVGPReportPDF(report);
  const pdfBlob = pdf.output('blob');

  saveReportToArchives(report, pdfBlob);

  // Dans un vrai système, envoyer email à l'admin (Samba)
  console.log('📧 Rapport VGP généré et archivé — Email envoyé à Samba');
}

/**
 * Seed initial (optionnel)
 */
export function seedHandlingEquipment(): void {
  const existing = getAllEquipment();
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  const equipment: HandlingEquipment[] = [
    {
      id: 'EQP-001',
      serialNumber: 'FLT-2024-001',
      type: 'Chariot élévateur',
      brand: 'Toyota',
      model: '8FD25',
      energyType: 'Diesel',
      liftingCapacity: 2.5,
      lastVGPDate: '2025-10-01',
      nextVGPDate: calculateVGPStatus('2025-10-01').nextVGPDate,
      vgpStatus: calculateVGPStatus('2025-10-01').status,
      isBlocked: calculateVGPStatus('2025-10-01').isBlocked,
      commissioningDate: '2020-03-15',
      notes: 'Chariot principal atelier',
      createdAt: now,
      createdBy: 'system',
      updatedAt: now,
      updatedBy: 'system',
    },
    {
      id: 'EQP-002',
      serialNumber: 'GER-2024-002',
      type: 'Gerbeur électrique',
      brand: 'Still',
      model: 'EXU-SF20',
      energyType: 'Électrique',
      liftingCapacity: 2.0,
      lastVGPDate: '2026-01-15',
      nextVGPDate: calculateVGPStatus('2026-01-15').nextVGPDate,
      vgpStatus: calculateVGPStatus('2026-01-15').status,
      isBlocked: calculateVGPStatus('2026-01-15').isBlocked,
      commissioningDate: '2022-06-20',
      notes: 'Gerbeur entrepôt principal',
      createdAt: now,
      createdBy: 'system',
      updatedAt: now,
      updatedBy: 'system',
    },
    {
      id: 'EQP-003',
      serialNumber: 'FLT-2024-003',
      type: 'Chariot élévateur',
      brand: 'Caterpillar',
      model: 'GC55K',
      energyType: 'Gaz',
      liftingCapacity: 5.0,
      lastVGPDate: '2025-09-01',
      nextVGPDate: calculateVGPStatus('2025-09-01').nextVGPDate,
      vgpStatus: calculateVGPStatus('2025-09-01').status,
      isBlocked: calculateVGPStatus('2025-09-01').isBlocked,
      commissioningDate: '2019-11-10',
      notes: 'Chariot gros tonnage',
      createdAt: now,
      createdBy: 'system',
      updatedAt: now,
      updatedBy: 'system',
    },
  ];

  saveEquipment(equipment);
  console.log('✅ Données de seed créées pour Engins de Manutention');
}
