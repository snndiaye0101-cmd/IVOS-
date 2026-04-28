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
    description: 'Graphiques et statistiques de tonnage'
  },
  {
    id: 'archives',
    label: 'Archives QHSE',
    icon: FolderOpen,
    description: 'Historique des documents (BSD, certificats, rapports)'
  },
  {
    id: 'certificates',
    label: 'Certificats',
    icon: FileText,
    description: 'Certificats de Destruction officiels'
  }
];

export default function QHSEReportingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  return (
    <>
      <div className="space-y-6">
        {/* Header avec onglets */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#1a5c3a] to-[#14472e]">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <BarChart2 className="w-7 h-7" />
              Reporting & Impact QHSE
            </h1>
            <p className="text-sm text-green-100 mt-1">
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
                    flex-1 px-6 py-4 flex items-center justify-center gap-3 font-semibold transition-all
                    ${isActive 
                      ? 'bg-white text-[#1a5c3a] border-b-2 border-[#1a5c3a]' 
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#1a5c3a]' : 'text-gray-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Description de l'onglet actif */}
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
            <p className="text-xs text-blue-700">
              {tabs.find(t => t.id === activeTab)?.description}
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
