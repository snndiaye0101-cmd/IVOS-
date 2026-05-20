/**
 * ============================================
 * Page Archives QHSE
 * Consultation et téléchargement des rapports VGP mensuels
 * ============================================
 */

import React, { useState, useEffect } from 'react';
import { FolderOpen, Download, FileText, Calendar, TrendingUp } from 'lucide-react';
import { getAllVGPReports } from '../../fleet/services/handlingEquipmentService';

export default function ArchivesQHSEPage() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
    const handleChange = () => loadReports();
    window.addEventListener('ivos_vgp_reports_change', handleChange);
    return () => window.removeEventListener('ivos_vgp_reports_change', handleChange);
  }, []);

  const loadReports = () => {
    const data = getAllVGPReports();
    // Trier par date décroissante
    data.sort(
      (a: any, b: any) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
    );
    setReports(data);
  };

  const handleDownload = (report: any) => {
    // Dans un vrai système, télécharger depuis le serveur/cloud
    // Ici simulation avec URL blob local
    if (report.pdfUrl) {
      const link = document.createElement('a');
      link.href = report.pdfUrl;
      link.download = report.fileName || `VGP_${report.reportMonth}.pdf`;
      link.click();
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'conforme') return 'text-green-700 bg-green-100';
    if (status === 'aRenouveler') return 'text-orange-700 bg-orange-100';
    return 'text-red-700 bg-red-100';
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <FolderOpen className="h-8 w-8 text-[#1a5c3a]" />
            Archives QHSE — Rapports VGP
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Historique des rapports mensuels de Vérification Générale Périodique des engins de
            manutention
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Rapports Archivés
                </p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{reports.length}</p>
              </div>
              <FileText className="h-10 w-10 text-gray-400" />
            </div>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  Dernier Rapport
                </p>
                <p className="mt-1 text-xl font-bold text-blue-900">
                  {reports.length > 0 ? reports[0].reportMonth : 'N/A'}
                </p>
              </div>
              <Calendar className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                  Génération Auto
                </p>
                <p className="mt-1 text-xl font-bold text-green-900">Activée</p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-600" />
            </div>
          </div>
        </div>

        {/* Liste des rapports */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-900">Historique des Rapports</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Cliquez sur un rapport pour le télécharger
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {reports.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                <FileText className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm font-semibold">Aucun rapport archivé</p>
                <p className="mt-1 text-xs">
                  Les rapports mensuels apparaîtront ici automatiquement
                </p>
              </div>
            ) : (
              reports.map((report, idx) => (
                <div
                  key={idx}
                  className="cursor-pointer px-6 py-4 transition-colors hover:bg-gray-50"
                  onClick={() => handleDownload(report)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {report.fileName || `VGP_${report.reportMonth}.pdf`}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Généré le{' '}
                          {new Date(report.reportDate).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
                          Statistiques
                        </p>
                        <div className="mt-1 flex gap-2">
                          <span className="inline-block rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                            Total: {report.stats?.total || 0}
                          </span>
                          <span className="inline-block rounded-lg bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                            ✓ {report.stats?.conforme || 0}
                          </span>
                          <span className="inline-block rounded-lg bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                            ⚠ {report.stats?.aRenouveler || 0}
                          </span>
                          <span className="inline-block rounded-lg bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                            ✗ {report.stats?.expire || 0}
                          </span>
                        </div>
                      </div>
                      <button className="rounded-xl bg-[#1a5c3a] p-3 text-white shadow-lg transition-colors hover:bg-[#14472e]">
                        <Download className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info automatisation */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-bold text-blue-900">Génération Automatique Activée</p>
              <p className="mt-1 text-xs text-blue-700">
                Les rapports VGP sont générés automatiquement le{' '}
                <span className="font-bold">1er de chaque mois</span> et archivés dans cette
                section. Un email est envoyé à l'administrateur (Samba) avec le rapport en pièce
                jointe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
