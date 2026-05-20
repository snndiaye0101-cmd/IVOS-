/**
 * ============================================
 * QHSE Reporting Page - Page Unifiée
 * Regroupe 3 sections : Tableau de Bord, Archives QHSE, Certificats
 * ============================================
 */

import React, { useState } from 'react';
import { BarChart2, FolderOpen, FileText } from 'lucide-react';
import AnalyticsDashboardPage from '../../reporting/pages/AnalyticsDashboardPage';
import ArchivesQHSEPage from './ArchivesQHSEPage';
import CertificatesPage from './CertificatesPage';

type TabType = 'dashboard' | 'archives' | 'certificates';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ElementType;
  description: string;
}

const tabs: Tab[] = [
  {
    id: 'dashboard',
    label: 'Tableau de Bord',
    icon: BarChart2,
    description: 'Graphiques et statistiques de tonnage',
  },
  {
    id: 'archives',
    label: 'Archives QHSE',
    icon: FolderOpen,
    description: 'Historique des documents (BSD, certificats, rapports)',
  },
  {
    id: 'certificates',
    label: 'Certificats',
    icon: FileText,
    description: 'Certificats de Destruction officiels',
  },
];

export default function QHSEReportingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  return (
    <>
      <div className="space-y-6">
        {/* Header avec onglets */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gradient-to-r from-[#1a5c3a] to-[#14472e] px-6 py-4">
            <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
              <BarChart2 className="h-7 w-7" />
              Reporting & Impact QHSE
            </h1>
            <p className="mt-1 text-sm text-green-100">
              Analyse, archivage et certification des opérations de gestion des déchets
            </p>
          </div>

          {/* Onglets */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex flex-1 items-center justify-center gap-3 px-6 py-4 font-semibold transition-all
                    ${
                      isActive
                        ? 'border-b-2 border-[#1a5c3a] bg-white text-[#1a5c3a]'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-[#1a5c3a]' : 'text-gray-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Description de l'onglet actif */}
          <div className="border-b border-blue-100 bg-blue-50 px-6 py-3">
            <p className="text-xs text-blue-700">
              {tabs.find((t) => t.id === activeTab)?.description}
            </p>
          </div>
        </div>

        {/* Contenu de l'onglet */}
        <div className="min-h-[600px]">
          {activeTab === 'dashboard' && (
            <>
              <AnalyticsDashboardPage />
            </>
          )}

          {activeTab === 'archives' && (
            <>
              <ArchivesQHSEPage />
            </>
          )}

          {activeTab === 'certificates' && (
            <>
              <CertificatesPage />
            </>
          )}
        </div>
      </div>
    </>
  );
}
