/**
 * ============================================
 * Page Sauvegardes - Centre de Gestion des Données
 * Export Excel, Sauvegardes SQL, Archives QHSE, Restauration, Journalisation
 * ============================================
 */

import { useContextSelector } from '../../../shared/contexts/ContextProvider';
import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCcw,
  Cloud,
  HardDrive,
  FileText,
  Archive,
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
  Clock,
  User,
  Activity,
  FolderArchive,
  Lock,
} from 'lucide-react';
import { resetYear, archiveYear } from '../../../shared/services/annualClosureService';
import Button from '../../../components/ui/Button';
import { toast } from 'sonner';
import {
  downloadSQLBackup,
  downloadQHSEArchive,
  getRecentActions,
  getLastCloudSync,
  triggerCloudSync,
  restoreFromFile,
  restoreFromCloud,
  generateExcelExport,
  type BackupAction,
} from '../../../shared/services/backupService';

export default function BackupsPage() {
  const { site, year } = useContextSelector();

  // États pour Reset Annuel
  const [confirmBackup, setConfirmBackup] = useState(false);
  const [securityPhrase, setSecurityPhrase] = useState('');
  const [loading, setLoading] = useState(false);

  // États pour Sauvegardes
  const [lastSync, setLastSync] = useState(getLastCloudSync());
  const [syncLoading, setSyncLoading] = useState(false);

  // États pour Export QHSE
  const [selectedYear, setSelectedYear] = useState(year);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // États pour Restauration
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreType, setRestoreType] = useState<'local' | 'cloud'>('local');
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États pour Journal
  const [actions, setActions] = useState<BackupAction[]>([]);

  const expectedPhrase = site ? `RESET ANNÉE ${site.name.toUpperCase()}` : '';
  const canReset = confirmBackup && securityPhrase.trim().toUpperCase() === expectedPhrase;

  // Charger les données
  useEffect(() => {
    loadActions();
    loadSyncStatus();

    const handleActionChange = () => loadActions();
    const handleSyncChange = () => loadSyncStatus();

    window.addEventListener('ivos_backup_action_change', handleActionChange);
    window.addEventListener('ivos_cloud_sync_change', handleSyncChange);

    return () => {
      window.removeEventListener('ivos_backup_action_change', handleActionChange);
      window.removeEventListener('ivos_cloud_sync_change', handleSyncChange);
    };
  }, []);

  const loadActions = () => {
    setActions(getRecentActions(10));
  };

  const loadSyncStatus = () => {
    setLastSync(getLastCloudSync());
  };

  // Reset Annuel
  const startNewYearReset = async () => {
    if (!site) return;
    setLoading(true);
    try {
      await archiveYear(site.code, year);
      await resetYear(site.code, year + 1);
      toast.success(`Nouvelle année démarrée pour ${site.name} (${year + 1}) !`);
      setConfirmBackup(false);
      setSecurityPhrase('');
    } catch (e) {
      toast.error('Erreur lors du reset annuel.');
    }
    setLoading(false);
  };

  // Export Excel
  const handleExcelExport = () => {
    generateExcelExport();
    toast.success('Export Excel généré avec succès !');
  };

  // Sauvegarde SQL Manuelle
  const handleManualBackup = () => {
    if (!site) return;
    downloadSQLBackup(site.name, year);
    toast.success('Sauvegarde SQL téléchargée !');
  };

  // Synchronisation Cloud
  const handleCloudSync = async () => {
    setSyncLoading(true);
    try {
      await triggerCloudSync();
      loadSyncStatus();
      toast.success('Synchronisation Cloud réussie !');
    } catch (error) {
      toast.error('Erreur de synchronisation Cloud');
    }
    setSyncLoading(false);
  };

  // Export QHSE Archive
  const handleQHSEExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportMessage('Préparation...');

    try {
      await downloadQHSEArchive(selectedYear, (percent, message) => {
        setExportProgress(percent);
        setExportMessage(message);
      });

      toast.success(`Archive QHSE ${selectedYear} générée avec succès !`);
    } catch (error) {
      toast.error("Erreur lors de la génération de l'archive QHSE");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportMessage('');
    }
  };

  // Restauration
  const openRestoreModal = (type: 'local' | 'cloud') => {
    setRestoreType(type);
    setRestorePassword('');
    setRestoreFile(null);
    setShowRestoreModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRestoreFile(file);
    }
  };

  const executeRestore = async () => {
    setRestoreLoading(true);

    try {
      let success = false;

      if (restoreType === 'local') {
        if (!restoreFile) {
          toast.error('Veuillez sélectionner un fichier');
          setRestoreLoading(false);
          return;
        }
        success = await restoreFromFile(restoreFile, restorePassword);
      } else {
        success = await restoreFromCloud(restorePassword);
      }

      if (success) {
        toast.success('Restauration effectuée avec succès ! Rechargement de la page...');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error('Échec de la restauration - Vérifiez le mot de passe');
      }
    } catch (error) {
      toast.error('Erreur lors de la restauration');
    } finally {
      setRestoreLoading(false);
    }
  };

  // UI Helpers
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'export_qhse':
        return <Archive className="h-4 w-4" />;
      case 'backup_manual':
        return <HardDrive className="h-4 w-4" />;
      case 'backup_auto':
        return <Cloud className="h-4 w-4" />;
      case 'restore_local':
        return <Upload className="h-4 w-4" />;
      case 'restore_cloud':
        return <Cloud className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'export_qhse':
        return 'Export QHSE';
      case 'backup_manual':
        return 'Sauvegarde Manuelle';
      case 'backup_auto':
        return 'Sync Cloud Auto';
      case 'restore_local':
        return 'Restauration Locale';
      case 'restore_cloud':
        return 'Restauration Cloud';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'success') {
      return (
        <span className="flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
          <CheckCircle className="h-3 w-3" />
          Succès
        </span>
      );
    } else if (status === 'error') {
      return (
        <span className="flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
          <X className="h-3 w-3" />
          Erreur
        </span>
      );
    } else {
      return (
        <span className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
          En cours
        </span>
      );
    }
  };

  // Générer les années disponibles
  const availableYears = Array.from({ length: 10 }, (_, i) => year - i);

  return (
    <>
      <div className="min-h-screen w-full space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10">
              <Database className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Centre de Gestion des Données</h1>
              <p className="mt-1 text-sm text-gray-300">
                Sauvegardes, Exports, Restaurations & Journalisation — Base de{' '}
                {site?.name || 'KIGNABOUR'}
              </p>
            </div>
          </div>
        </div>

        {/* Layout principal en grille */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Section Export Excel */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <FileText className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Export Excel Complet</h2>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Exporte toutes les données de l'année {year} dans un fichier Excel multi-onglets
            </p>
            <button
              onClick={handleExcelExport}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-md transition-colors hover:bg-blue-700"
            >
              <Download className="h-5 w-5" />
              Générer Export Excel
            </button>
          </div>

          {/* Section Gestion Sauvegardes Système */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Database className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">Gestion des Sauvegardes Système</h2>
            </div>

            {/* Mode SaaS */}
            <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-purple-600" />
                  <span className="font-bold text-purple-900">Mode SaaS (Automatique)</span>
                </div>
                <button
                  onClick={handleCloudSync}
                  disabled={syncLoading}
                  className="rounded-lg bg-purple-600 p-2 text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                >
                  <RefreshCcw className={`h-4 w-4 ${syncLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="text-xs text-purple-700">
                {lastSync.status === 'synced' && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Dernière sync : {new Date(lastSync.date).toLocaleString('fr-FR')}
                  </div>
                )}
                {lastSync.status === 'error' && (
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    Erreur lors de la dernière sync
                  </div>
                )}
                {lastSync.status === 'never' && (
                  <div className="text-gray-500">Aucune synchronisation effectuée</div>
                )}
              </div>
            </div>

            {/* Mode Local */}
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-green-600" />
                <span className="font-bold text-green-900">Mode Local (Manuel)</span>
              </div>
              <button
                onClick={handleManualBackup}
                className="mt-2 w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
              >
                Générer Sauvegarde Manuelle
              </button>
            </div>
          </div>

          {/* Section Export QHSE Archive */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <FolderArchive className="h-6 w-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">Export Archives QHSE (.ZIP)</h2>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Génère une archive structurée : Client / Mois / Documents.pdf
            </p>

            {/* Sélecteur d'année */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-gray-700">Année</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={isExporting}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Barre de progression */}
            {isExporting && (
              <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-orange-900">{exportMessage}</span>
                  <span className="text-sm font-bold text-orange-600">{exportProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-orange-200">
                  <div
                    className="h-full bg-orange-600 transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <button
              onClick={handleQHSEExport}
              disabled={isExporting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-3 font-bold text-white shadow-md transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Archive className="h-5 w-5" />
              {isExporting ? 'Génération en cours...' : 'Générer Archive PDF (.zip)'}
            </button>
          </div>

          {/* Section Restauration */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Upload className="h-6 w-6 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">Restauration Hybride</h2>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Restaurer les données depuis un fichier local ou depuis le Cloud
            </p>

            <div className="space-y-3">
              <button
                onClick={() => openRestoreModal('local')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-gray-100 px-4 py-3 font-semibold text-gray-900 transition-colors hover:bg-gray-200"
              >
                <HardDrive className="h-5 w-5" />
                Restaurer depuis un fichier local
              </button>

              <button
                onClick={() => openRestoreModal('cloud')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-purple-300 bg-purple-100 px-4 py-3 font-semibold text-purple-900 transition-colors hover:bg-purple-200"
              >
                <Cloud className="h-5 w-5" />
                Restaurer depuis le SaaS
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <p className="text-xs font-semibold text-red-700">
                  Toute restauration remplacera l'intégralité des données actuelles
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Journal des Actions - Full Width */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-bold text-gray-900">Journal des Actions</h2>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Historique des 10 dernières opérations de sauvegarde et restauration
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Date & Heure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Type d'Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Détails
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {actions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      <Activity className="mx-auto mb-3 h-12 w-12 opacity-30" />
                      <p className="text-sm font-semibold">Aucune action enregistrée</p>
                    </td>
                  </tr>
                ) : (
                  actions.map((action) => (
                    <tr key={action.id} className="transition-colors hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {new Date(action.date).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getActionIcon(action.type)}
                          <span className="text-sm font-semibold text-gray-900">
                            {getActionLabel(action.type)}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <User className="h-4 w-4 text-gray-400" />
                          {action.user}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{action.details}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {getStatusBadge(action.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section Reset Annuel */}
        <div className="rounded-2xl border-2 border-orange-300 bg-white p-8 shadow-lg">
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex items-center justify-center gap-3">
              <RefreshCcw className="h-7 w-7 text-orange-600" />
              <span className="text-2xl font-bold uppercase text-orange-700">
                Démarrer une Nouvelle Année
              </span>
            </div>

            <p className="mb-6 text-center font-semibold text-orange-900">
              Cette opération archivera toutes les données de l'année {year} pour{' '}
              <span className="font-black">{site?.name}</span>, puis réinitialisera les tables
              actives.
              <br />
              Les compteurs repartiront à zéro (ex: BSD-{site?.code}-{year + 1}-0001).
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confirm-backup"
                  checked={confirmBackup}
                  onChange={(e) => setConfirmBackup(e.target.checked)}
                  className="h-5 w-5 accent-orange-600"
                />
                <label htmlFor="confirm-backup" className="font-medium text-orange-800">
                  Je confirme avoir effectué une sauvegarde complète
                </label>
              </div>

              <input
                type="text"
                className="w-full rounded-lg border-2 border-orange-400 px-4 py-3 font-mono text-lg text-orange-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={expectedPhrase ? `Tapez : ${expectedPhrase}` : ''}
                value={securityPhrase}
                onChange={(e) => setSecurityPhrase(e.target.value)}
                disabled={!confirmBackup}
              />

              <Button
                variant="danger"
                className="flex w-full items-center justify-center gap-2 border-0 bg-orange-600 py-4 text-lg font-bold shadow-lg hover:bg-orange-700"
                onClick={startNewYearReset}
                disabled={!canReset || loading}
              >
                <RefreshCcw className="h-6 w-6" />
                Démarrer une Nouvelle Année
              </Button>

              <p className="text-center text-xs text-orange-700">
                Sécurité critique : Double validation obligatoire.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Restauration */}
      {showRestoreModal && (
        <>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 bg-red-50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-red-600" />
                  <h3 className="text-xl font-bold text-red-900">
                    Restauration {restoreType === 'local' ? 'Locale' : 'Cloud'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowRestoreModal(false)}
                  className="rounded-lg p-2 transition-colors hover:bg-red-100"
                  disabled={restoreLoading}
                >
                  <X className="h-5 w-5 text-red-600" />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 p-6">
                {/* Avertissement */}
                <div className="rounded-xl border-2 border-red-300 bg-red-100 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
                    <div>
                      <p className="mb-1 font-bold text-red-900">ATTENTION</p>
                      <p className="text-sm text-red-800">
                        La restauration remplacera l'intégralité des données actuelles par celles de
                        la sauvegarde. Cette action est irréversible.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sélection fichier (mode local uniquement) */}
                {restoreType === 'local' && (
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      Fichier de sauvegarde
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.zip"
                      onChange={handleFileSelect}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      disabled={restoreLoading}
                    />
                    {restoreFile && (
                      <p className="mt-1 text-xs text-gray-600">
                        Fichier sélectionné : {restoreFile.name}
                      </p>
                    )}
                  </div>
                )}

                {/* Mot de passe Super Admin */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    <Lock className="mr-1 inline h-4 w-4" />
                    Mot de passe Super Admin (Samba)
                  </label>
                  <input
                    type="password"
                    value={restorePassword}
                    onChange={(e) => setRestorePassword(e.target.value)}
                    placeholder="Mot de passe requis"
                    className="w-full rounded-lg border-2 border-red-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={restoreLoading}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                <button
                  onClick={() => setShowRestoreModal(false)}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                  disabled={restoreLoading}
                >
                  Annuler
                </button>
                <button
                  onClick={executeRestore}
                  disabled={
                    restoreLoading || !restorePassword || (restoreType === 'local' && !restoreFile)
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {restoreLoading ? (
                    <>
                      <RefreshCcw className="h-4 w-4 animate-spin" />
                      Restauration...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Restaurer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
