/**
 * ============================================
 * Service de Gestion des Sauvegardes
 * Centre unique pour exports, sauvegardes et restaurations
 * ============================================
 */

import JSZip from 'jszip';
import { getAllOperations } from '@/features/exploitation/services/operationService';
import { getCertificates } from './certificateService';
import { downloadCertificatePDF } from '@/features/qhse/components/CertificatePDF';
import { getInvestmentDocuments } from '@/features/investments/services/investmentService';

// Ce service gère la sauvegarde et la restauration des données (backups, restore points).

// Types
export interface BackupAction {
  id: string;
  date: string;
  user: string;
  type: 'export_qhse' | 'backup_manual' | 'backup_auto' | 'restore_local' | 'restore_cloud';
  status: 'success' | 'error' | 'pending';
  details: string;
}

export interface BackupMetadata {
  version: string;
  date: string;
  site: string;
  year: number;
  recordCount: {
    operations: number;
    certificates: number;
    users: number;
  };
}

const STORAGE_KEY_ACTIONS = 'ivos_backup_actions_v1';
const STORAGE_KEY_LAST_SYNC = 'ivos_last_cloud_sync_v1';

/**
 * Récupérer l'historique complet des actions de sauvegarde
 *
 * @returns {BackupAction[]} Liste des actions de backup triées par date décroissante
 * @example
 * const actions = getBackupActions();
 * console.log(`${actions.length} actions enregistrées`);
 */
export function getBackupActions(): BackupAction[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ACTIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Enregistrer une nouvelle action de sauvegarde dans l'historique
 *
 * Limite automatiquement à 50 actions max. Déclenche un événement `ivos_backup_action_change`.
 *
 * @param {BackupAction['type']} type - Type d'action (export_qhse, backup_manual, backup_auto, restore_local, restore_cloud)
 * @param {BackupAction['status']} status - Statut de l'action (success, error, pending)
 * @param {string} details - Description détaillée de l'action
 * @param {string} [user='Admin'] - Utilisateur qui a effectué l'action
 * @returns {void}
 * @fires ivos_backup_action_change
 * @example
 * logBackupAction('export_qhse', 'success', 'Archive QHSE 2026 générée', 'John Doe');
 */
export function logBackupAction(
  type: BackupAction['type'],
  status: BackupAction['status'],
  details: string,
  user: string = 'Admin'
): void {
  const actions = getBackupActions();
  const newAction: BackupAction = {
    id: `action-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    date: new Date().toISOString(),
    user,
    type,
    status,
    details,
  };

  actions.unshift(newAction);

  // Garder seulement les 50 dernières actions
  const trimmed = actions.slice(0, 50);
  localStorage.setItem(STORAGE_KEY_ACTIONS, JSON.stringify(trimmed));

  // Notifier les autres composants
  window.dispatchEvent(new CustomEvent('ivos_backup_action_change'));
}

/**
 * Obtenir les N dernières actions de sauvegarde
 *
 * @param {number} [limit=10] - Nombre d'actions à retourner
 * @returns {BackupAction[]} Liste des actions récentes
 * @example
 * const last5 = getRecentActions(5);
 * last5.forEach(action => console.log(action.type, action.status));
 */
export function getRecentActions(limit: number = 10): BackupAction[] {
  const actions = getBackupActions();
  return actions.slice(0, limit);
}

/**
 * Obtenir les informations de la dernière synchronisation cloud
 *
 * @returns {{ date: string, status: 'synced' | 'error' | 'never' }} Métadonnées de sync
 * @example
 * const sync = getLastCloudSync();
 * if (sync.status === 'synced') {
 *   console.log(`Dernière sync: ${new Date(sync.date).toLocaleString()}`);
 * }
 */
export function getLastCloudSync(): { date: string; status: 'synced' | 'error' | 'never' } {
  try {
    const data = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
    return data ? JSON.parse(data) : { date: '', status: 'never' };
  } catch {
    return { date: '', status: 'never' };
  }
}

/**
 * Mettre à jour le statut de la dernière synchronisation cloud
 *
 * Enregistre automatiquement la date/heure et déclenche un événement.
 *
 * @param {'synced' | 'error'} status - Statut de la synchronisation
 * @returns {void}
 * @fires ivos_cloud_sync_change
 * @example
 * updateCloudSync('synced'); // Sync réussie
 * updateCloudSync('error');  // Erreur de sync
 */
export function updateCloudSync(status: 'synced' | 'error'): void {
  const syncData = {
    date: new Date().toISOString(),
    status,
  };
  localStorage.setItem(STORAGE_KEY_LAST_SYNC, JSON.stringify(syncData));
  window.dispatchEvent(new CustomEvent('ivos_cloud_sync_change'));
}

/**
 * Générer une sauvegarde complète au format JSON (simulation SQL)
 *
 * Exporte toutes les données localStorage dans un fichier JSON structuré.
 *
 * @param {string} siteName - Nom du site (ex: 'KIGNABOUR')
 * @param {number} year - Année de la sauvegarde
 * @returns {Blob} Blob JSON téléchargeable
 * @example
 * const backup = generateSQLBackup('KIGNABOUR', 2026);
 * // Blob de ~500KB-5MB selon les données
 */
export function generateSQLBackup(siteName: string, year: number): Blob {
  const data: Record<string, unknown> = {
    metadata: {
      version: '1.0.0',
      date: new Date().toISOString(),
      site: siteName,
      year,
      generator: 'IVOS Backup System',
    },
    operations: localStorage.getItem('ivos_operations_v1') || '[]',
    vehicles: localStorage.getItem('ivos_vehicles_v1') || '[]',
    personnel: localStorage.getItem('ivos_personnel_v1') || '[]',
    certificates: localStorage.getItem('ivos_certificates_v1') || '[]',
    invoices: localStorage.getItem('ivos_invoices_v1') || '[]',
    investmentProjects: localStorage.getItem('ivos_investment_projects_v1') || '[]',
    investmentExpenses: localStorage.getItem('ivos_investment_expenses_v1') || '[]',
    investmentDocuments: localStorage.getItem('ivos_investment_documents_v1') || '[]',
    // Ajouter toutes les autres clés localStorage pertinentes
  };

  const jsonString = JSON.stringify(data, null, 2);
  return new Blob([jsonString], { type: 'application/json' });
}

/**
 * Télécharger une sauvegarde SQL locale et logger l'action
 *
 * Génère un fichier JSON nommé `IVOS_Backup_[Site]_[Year]_[Date].json`.
 *
 * @param {string} siteName - Nom du site
 * @param {number} year - Année de sauvegarde
 * @returns {void}
 * @sideEffects Télécharge un fichier, log une action
 * @example
 * downloadSQLBackup('KIGNABOUR', 2026);
 * // Télécharge: IVOS_Backup_KIGNABOUR_2026_2026-04-21.json
 */
export function downloadSQLBackup(siteName: string, year: number): void {
  const blob = generateSQLBackup(siteName, year);
  const fileName = `IVOS_Backup_${siteName}_${year}_${new Date().toISOString().split('T')[0]}.json`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);

  logBackupAction('backup_manual', 'success', `Sauvegarde manuelle générée : ${fileName}`);
}

/**
 * Générer l'export Excel complet
 */
export function generateExcelExport(): void {
  // Simulation - en production, utiliser une lib comme xlsx ou SheetJS
  console.log('Génération export Excel...');

  logBackupAction('export_qhse', 'success', 'Export Excel complet généré');

  // Simuler le téléchargement
  setTimeout(() => {
    alert('Export Excel simulé - Intégrer SheetJS pour la vraie implémentation');
  }, 500);
}

/**
 * Structure de dossiers pour l'archive QHSE
 * Archive_QHSE_[Année]/[Nom_Client]/[Mois]/Documents.pdf
 */
interface QHSEArchiveStructure {
  [client: string]: {
    [month: string]: {
      bsds: QHSEArchiveBsd[];
      certificates: QHSEArchiveCertificate[];
    };
  };
}

interface QHSEArchiveBsd {
  id?: string | number;
  code?: string;
}

interface QHSEArchiveCertificate {
  certificateNumber: string;
}

interface QHSESourceCertificate {
  generatedAt: string;
  clientName?: string;
  certificateNumber: string;
}

interface QHSESourceOperation {
  id?: string | number;
  code?: string;
  status?: string;
  client?: string;
  bsdData?: {
    validatedAt?: string;
  };
}

interface QHSEInvestmentDocument {
  id?: string | number;
  uploadedAt: string;
  projectName?: string;
  fileName?: string;
  type?: string;
}

/**
 * Organiser les documents par client et par mois
 */
function organizeDocumentsByClientAndMonth(year: number): QHSEArchiveStructure {
  const structure: QHSEArchiveStructure = {};

  // 1. BSD finalisés de l'année
  const operations = getAllOperations() as QHSESourceOperation[];
  const yearBSDs = operations.filter((op) => {
    if (op.status !== 'cloturee' || !op.bsdData?.validatedAt) return false;
    const opYear = new Date(op.bsdData!.validatedAt!);
    return opYear.getFullYear() === year;
  });

  yearBSDs.forEach((op) => {
    const client = op.client || 'Client_Inconnu';
    const date = new Date(op.bsdData!.validatedAt!);
    const month = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    if (!structure[client]) structure[client] = {};
    if (!structure[client][month]) structure[client][month] = { bsds: [], certificates: [] };

    structure[client][month].bsds.push(op);
  });

  // 2. Certificats de l'année
  const certificates = getCertificates() as QHSESourceCertificate[];
  const yearCerts = certificates.filter((cert) => {
    const certYear = new Date(cert.generatedAt).getFullYear();
    return certYear === year;
  });

  yearCerts.forEach((cert) => {
    const client = cert.clientName || 'Client_Inconnu';
    const date = new Date(cert.generatedAt);
    const month = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    if (!structure[client]) structure[client] = {};
    if (!structure[client][month]) structure[client][month] = { bsds: [], certificates: [] };

    structure[client][month].certificates.push(cert);
  });

  return structure;
}

/**
 * Générer l'archive QHSE .zip
 */
export async function generateQHSEArchive(
  year: number,
  onProgress?: (percent: number, message: string) => void
): Promise<Blob> {
  const zip = new JSZip();

  onProgress?.(0, 'Organisation des documents...');

  const structure = organizeDocumentsByClientAndMonth(year);
  const investmentDocs = (getInvestmentDocuments() as QHSEInvestmentDocument[]).filter(
    (doc) => new Date(doc.uploadedAt).getFullYear() === year
  );
  const clients = Object.keys(structure);

  let processedCount = 0;
  const totalDocs =
    clients.reduce((sum, client) => {
      return (
        sum +
        Object.values(structure[client]).reduce(
          (s, month) => s + month.bsds.length + month.certificates.length,
          0
        )
      );
    }, 0) + investmentDocs.length;

  onProgress?.(10, `${totalDocs} documents trouvés`);

  // Créer la structure de dossiers
  for (const client of clients) {
    const clientFolder = zip.folder(client);
    if (!clientFolder) continue;

    for (const month of Object.keys(structure[client])) {
      const monthFolder = clientFolder.folder(month);
      if (!monthFolder) continue;

      const { bsds, certificates } = structure[client][month];

      // Ajouter les BSD (simulation - en production, générer le vrai PDF)
      for (const bsd of bsds) {
        const fileName = `BSD_${bsd.code || bsd.id}.pdf`;
        // Simuler un PDF (en production, utiliser le vrai générateur de BSD)
        const pdfContent = `BSD Simulé pour ${client} - ${bsd.code}`;
        monthFolder.file(fileName, pdfContent);

        processedCount++;
        const percent = 10 + Math.floor((processedCount / totalDocs) * 70);
        onProgress?.(percent, `Ajout BSD ${processedCount}/${totalDocs}`);
      }

      // Ajouter les certificats (simulation)
      for (const cert of certificates) {
        const fileName = `${cert.certificateNumber}.pdf`;
        // En production, utiliser downloadCertificatePDF(cert)
        const pdfContent = `Certificat Simulé - ${cert.certificateNumber}`;
        monthFolder.file(fileName, pdfContent);

        processedCount++;
        const percent = 10 + Math.floor((processedCount / totalDocs) * 70);
        onProgress?.(percent, `Ajout Certificat ${processedCount}/${totalDocs}`);
      }
    }
  }

  // Ajouter un README
  const archivesFolder = zip.folder('Archives');
  const investissementsFolder = archivesFolder?.folder('Investissements');

  if (investissementsFolder) {
    for (const doc of investmentDocs) {
      const projectFolderName = (doc.projectName || 'Projet_Inconnu').replace(
        /[^a-zA-Z0-9-_ ]/g,
        '_'
      );
      const projectFolder = investissementsFolder.folder(projectFolderName);
      if (!projectFolder) continue;

      const fileName = doc.fileName || `Investissement_${doc.id}.pdf`;
      const fileContent = `Document d'investissement (${doc.type}) - ${doc.projectName}`;
      projectFolder.file(fileName, fileContent);

      processedCount++;
      const percent = 10 + Math.floor((processedCount / totalDocs) * 70);
      onProgress?.(percent, `Ajout Investissement ${processedCount}/${totalDocs}`);
    }
  }

  // Ajouter un README
  const readme = `Archive QHSE IVOS - Année ${year}
Générée le : ${new Date().toLocaleString('fr-FR')}

Structure :
- Chaque client possède son dossier
- Les documents sont organisés par mois
- BSD finalisés et Certificats inclus
- Les investissements sont stockés sous Archives/Investissements/[Nom_du_Projet]

Total documents : ${totalDocs}
Total clients : ${clients.length}
Total documents investissements : ${investmentDocs.length}
`;
  zip.file('README.txt', readme);

  onProgress?.(85, "Compression de l'archive...");

  // Générer le zip
  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      const percent = 85 + Math.floor(metadata.percent * 0.15);
      onProgress?.(percent, `Compression ${Math.floor(metadata.percent)}%`);
    }
  );

  onProgress?.(100, 'Archive générée !');

  return blob;
}

/**
 * Télécharger l'archive QHSE
 */
export async function downloadQHSEArchive(
  year: number,
  onProgress?: (percent: number, message: string) => void
): Promise<void> {
  try {
    const blob = await generateQHSEArchive(year, onProgress);

    const fileName = `Archives_IVOS_QHSE_${year}.zip`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);

    logBackupAction('export_qhse', 'success', `Archive QHSE ${year} générée : ${fileName}`);
  } catch (error) {
    console.error('Erreur génération archive:', error);
    logBackupAction('export_qhse', 'error', `Échec génération archive ${year}`);
    throw error;
  }
}

/**
 * Restaurer depuis un fichier local
 */
export async function restoreFromFile(file: File, password: string): Promise<boolean> {
  // ⚠️ SECURITY NOTE: This password check is NOT secure in production!
  // The password is hardcoded or in env vars, visible in browser bundle.
  // For production: Use Supabase Auth + backend verification
  const viteEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta.env as Record<string, string> | undefined)
      : undefined;
  const BACKUP_PASSWORD = viteEnv?.VITE_BACKUP_ADMIN_PASSWORD || 'SambaIVOS2026';

  if (password !== BACKUP_PASSWORD) {
    logBackupAction('restore_local', 'error', 'Mot de passe incorrect');
    return false;
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Valider la structure
    if (!data.metadata || !data.metadata.version) {
      throw new Error('Format de sauvegarde invalide');
    }

    // Restaurer les données (attention : écrase tout)
    Object.keys(data).forEach((key) => {
      if (key !== 'metadata') {
        localStorage.setItem(key, data[key]);
      }
    });

    // Recharger les événements
    window.dispatchEvent(new CustomEvent('ivos_data_restored'));

    logBackupAction('restore_local', 'success', `Restauration depuis ${file.name}`);
    return true;
  } catch (error) {
    console.error('Erreur restauration:', error);
    logBackupAction('restore_local', 'error', `Échec restauration : ${error}`);
    return false;
  }
}

/**
 * Restaurer depuis le cloud (simulation)
 */
export async function restoreFromCloud(password: string): Promise<boolean> {
  const SUPER_ADMIN_PASSWORD = 'SambaIVOS2026';

  if (password !== SUPER_ADMIN_PASSWORD) {
    logBackupAction('restore_cloud', 'error', 'Mot de passe incorrect');
    return false;
  }

  try {
    // Simuler un appel API
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // En production : appeler l'API Cloud
    // const response = await fetch('/api/backups/latest');
    // const data = await response.json();

    logBackupAction('restore_cloud', 'success', 'Restauration Cloud effectuée');
    return true;
  } catch (error) {
    console.error('Erreur restauration cloud:', error);
    logBackupAction('restore_cloud', 'error', `Échec restauration Cloud : ${error}`);
    return false;
  }
}

/**
 * Simuler une synchronisation Cloud auto
 */
export async function triggerCloudSync(): Promise<void> {
  try {
    // Simuler un appel API
    await new Promise((resolve) => setTimeout(resolve, 1500));

    updateCloudSync('synced');
    logBackupAction('backup_auto', 'success', 'Synchronisation Cloud automatique');
  } catch (error) {
    updateCloudSync('error');
    logBackupAction('backup_auto', 'error', 'Échec synchronisation Cloud');
  }
}
