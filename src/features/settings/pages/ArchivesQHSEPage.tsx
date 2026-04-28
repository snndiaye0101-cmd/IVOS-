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
    data.sort((a: any, b: any) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-[#1a5c3a]" />
            Archives QHSE — Rapports VGP
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Historique des rapports mensuels de Vérification Générale Périodique des engins de manutention
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Rapports Archivés</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{reports.length}</p>
              </div>
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
          </div>
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Dernier Rapport</p>
                <p className="text-xl font-bold text-blue-900 mt-1">
                  {reports.length > 0 ? reports[0].reportMonth : 'N/A'}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <div className="bg-green-50 rounded-2xl border border-green-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Génération Auto</p>
                <p className="text-xl font-bold text-green-900 mt-1">Activée</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-600" />
            </div>
          </div>
        </div>

        {/* Liste des rapports */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">Historique des Rapports</h2>
            <p className="text-xs text-gray-500 mt-0.5">Cliquez sur un rapport pour le télécharger</p>
          </div>
          <div className="divide-y divide-gray-100">
            {reports.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">Aucun rapport archivé</p>
                <p className="text-xs mt-1">Les rapports mensuels apparaîtront ici automatiquement</p>
              </div>
            ) : (
              reports.map((report, idx) => (
                <div key={idx} className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleDownload(report)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{report.fileName || `VGP_${report.reportMonth}.pdf`}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Généré le {new Date(report.reportDate).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Statistiques</p>
                        <div className="flex gap-2 mt-1">
                          <span className="inline-block px-2 py-1 rounded-lg bg-gray-100 text-xs font-semibold text-gray-700">
                            Total: {report.stats?.total || 0}
                          </span>
                          <span className="inline-block px-2 py-1 rounded-lg bg-green-100 text-xs font-semibold text-green-700">
                            ✓ {report.stats?.conforme || 0}
                          </span>
                          <span className="inline-block px-2 py-1 rounded-lg bg-orange-100 text-xs font-semibold text-orange-700">
                            ⚠ {report.stats?.aRenouveler || 0}
                          </span>
                          <span className="inline-block px-2 py-1 rounded-lg bg-red-100 text-xs font-semibold text-red-700">
                            ✗ {report.stats?.expire || 0}
                          </span>
                        </div>
                      </div>
                      <button className="p-3 rounded-xl bg-[#1a5c3a] hover:bg-[#14472e] text-white transition-colors shadow-lg">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info automatisation */}
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-blue-900">Génération Automatique Activée</p>
              <p className="text-xs text-blue-700 mt-1">
                Les rapports VGP sont générés automatiquement le <span className="font-bold">1er de chaque mois</span> et archivés dans cette section.
                Un email est envoyé à l'administrateur (Samba) avec le rapport en pièce jointe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
