/**
 * ============================================
 * Archives QHSE - Version Optimisée
 * Historique complet : BSD finalisés, Certificats, Rapports VGP
 * Full-width, Full-height, Filtres avancés
 * ============================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderOpen, Download, FileText, Calendar, TrendingUp, 
  Search, Filter, X, CheckCircle, Award, ClipboardCheck 
} from 'lucide-react';
import { getAllVGPReports } from '../../fleet/services/handlingEquipmentService';
import { getCertificates } from '@/shared/services/certificateService';
import { getAllOperations } from '@/features/exploitation/services/operationService';
import { getInvestmentDocuments } from '../../investments/services/investmentService';

type DocumentType = 'all' | 'vgp' | 'bsd' | 'certificate' | 'investment';

interface ArchiveDocument {
  id: string;
  type: 'vgp' | 'bsd' | 'certificate' | 'investment';
  title: string;
  date: string;
  client?: string;
  fileName?: string;
  status?: string;
  archivePath?: string;
  metadata?: any;
}

export default function ArchivesQHSEPage() {
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<DocumentType>('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadAllDocuments();
    
    // Écouter les changements
    const handleChange = () => loadAllDocuments();
    window.addEventListener('ivos_vgp_reports_change', handleChange);
    window.addEventListener('certificates-updated', handleChange);
    window.addEventListener('ivos_operation_change', handleChange);
    window.addEventListener('qhse-documents:updated', handleChange);
    
    return () => {
      window.removeEventListener('ivos_vgp_reports_change', handleChange);
      window.removeEventListener('certificates-updated', handleChange);
      window.removeEventListener('ivos_operation_change', handleChange);
      window.removeEventListener('qhse-documents:updated', handleChange);
    };
  }, []);

  const loadAllDocuments = () => {
    setLoading(true);
    const allDocs: ArchiveDocument[] = [];

    // 1. Rapports VGP
    const vgpReports = getAllVGPReports();
    vgpReports.forEach(report => {
      allDocs.push({
        id: `vgp-${report.reportMonth}`,
        type: 'vgp',
        title: `Rapport VGP ${report.reportMonth}`,
        date: report.reportDate,
        fileName: report.fileName || `VGP_${report.reportMonth}.pdf`,
        status: 'archivé',
        metadata: report
      });
    });

    // 2. BSD Finalisés
    const operations = getAllOperations();
    const finalizedBSDs = operations.filter(op => 
      op.status === 'cloturee' && op.bsdData?.validatedAt
    );
    finalizedBSDs.forEach(op => {
      allDocs.push({
        id: `bsd-${op.id}`,
        type: 'bsd',
        title: `BSD ${op.numero || op.id}`,
        date: op.bsdData?.validatedAt || op.createdAt,
        client: op.client,
        status: 'finalisé',
        metadata: op
      });
    });

    // 3. Certificats
    const certificates = getCertificates();
    certificates.forEach(cert => {
      allDocs.push({
        id: `cert-${cert.id}`,
        type: 'certificate',
        title: `Certificat ${cert.certificateNumber}`,
        date: cert.generatedAt,
        client: cert.clientName,
        fileName: `${cert.certificateNumber}.pdf`,
        status: cert.status,
        metadata: cert
      });
    });

    // 4. Archives investissements
    const investmentDocs = getInvestmentDocuments();
    investmentDocs.forEach(doc => {
      allDocs.push({
        id: `investment-${doc.id}`,
        type: 'investment',
        title: `${doc.type} - ${doc.projectName}`,
        date: doc.uploadedAt,
        client: doc.projectName,
        fileName: doc.fileName,
        status: 'archivé',
        archivePath: doc.archivePath,
        metadata: doc,
      });
    });

    // Trier par date décroissante
    allDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setDocuments(allDocs);
    setLoading(false);
  };

  // Liste des clients uniques
  const uniqueClients = useMemo(() => {
    const clients = new Set<string>();
    documents.forEach(doc => {
      if (doc.client) clients.add(doc.client);
    });
    return Array.from(clients).sort();
  }, [documents]);

  // Documents filtrés
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Filtre par type
    if (filterType !== 'all') {
      filtered = filtered.filter(doc => doc.type === filterType);
    }

    // Filtre par client
    if (filterClient !== 'all') {
      filtered = filtered.filter(doc => doc.client === filterClient);
    }

    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.client?.toLowerCase().includes(query) ||
        doc.fileName?.toLowerCase().includes(query)
      );
    }

    // Filtre par date
    if (filterDateStart) {
      filtered = filtered.filter(doc => 
        new Date(doc.date) >= new Date(filterDateStart)
      );
    }
    if (filterDateEnd) {
      filtered = filtered.filter(doc => 
        new Date(doc.date) <= new Date(filterDateEnd)
      );
    }

    return filtered;
  }, [documents, filterType, filterClient, searchQuery, filterDateStart, filterDateEnd]);

  // Stats
  const stats = useMemo(() => ({
    total: documents.length,
    vgp: documents.filter(d => d.type === 'vgp').length,
    bsd: documents.filter(d => d.type === 'bsd').length,
    certificates: documents.filter(d => d.type === 'certificate').length,
    investment: documents.filter(d => d.type === 'investment').length,
  }), [documents]);

  const handleDownload = (doc: ArchiveDocument) => {
    if (doc.type === 'vgp' && doc.metadata?.pdfUrl) {
      const link = document.createElement('a');
      link.href = doc.metadata.pdfUrl;
      link.download = doc.fileName || 'document.pdf';
      link.click();
    } else if (doc.type === 'certificate') {
      // Utiliser la fonction de download du certificat
      console.log('Télécharger certificat:', doc.metadata);
    } else if (doc.type === 'bsd') {
      // Générer PDF du BSD
      console.log('Télécharger BSD:', doc.metadata);
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'vgp':
        return <ClipboardCheck className="w-6 h-6 text-blue-600" />;
      case 'bsd':
        return <FileText className="w-6 h-6 text-purple-600" />;
      case 'certificate':
        return <Award className="w-6 h-6 text-green-600" />;
      case 'investment':
        return <FolderOpen className="w-6 h-6 text-indigo-600" />;
      default:
        return <FileText className="w-6 h-6 text-gray-600" />;
    }
  };

  const getDocumentColor = (type: string) => {
    switch (type) {
      case 'vgp':
        return 'bg-blue-100 border-blue-200';
      case 'bsd':
        return 'bg-purple-100 border-purple-200';
      case 'certificate':
        return 'bg-green-100 border-green-200';
      case 'investment':
        return 'bg-indigo-100 border-indigo-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const colors: Record<string, string> = {
      'archivé': 'bg-gray-100 text-gray-700',
      'finalisé': 'bg-green-100 text-green-700',
      'generated': 'bg-blue-100 text-blue-700',
      'sent': 'bg-purple-100 text-purple-700',
      'verified': 'bg-orange-100 text-orange-700',
      'Valide': 'bg-green-100 text-green-700',
      'Expiré': 'bg-red-100 text-red-700',
      'En attente': 'bg-yellow-100 text-yellow-700',
      'Non conforme': 'bg-red-100 text-red-700',
    };

    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
        {status === 'generated' ? 'Généré' : status === 'sent' ? 'Envoyé' : status === 'verified' ? 'Vérifié' : status}
      </span>
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterClient('all');
    setFilterDateStart('');
    setFilterDateEnd('');
  };

  const activeFiltersCount = [
    filterType !== 'all',
    filterClient !== 'all',
    searchQuery.trim() !== '',
    filterDateStart !== '',
    filterDateEnd !== ''
  ].filter(Boolean).length;

  return (
    <>
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Total Documents</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <FolderOpen className="w-10 h-10 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-2xl border-2 border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-700 uppercase">Rapports VGP</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{stats.vgp}</p>
              </div>
              <ClipboardCheck className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-2xl border-2 border-purple-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-purple-700 uppercase">BSD Finalisés</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{stats.bsd}</p>
              </div>
              <FileText className="w-10 h-10 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-green-50 rounded-2xl border-2 border-green-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-green-700 uppercase">Certificats</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{stats.certificates}</p>
              </div>
              <Award className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <div className="bg-indigo-50 rounded-2xl border-2 border-indigo-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-700 uppercase">Archives Investissements</p>
                <p className="text-3xl font-bold text-indigo-900 mt-1">{stats.investment}</p>
              </div>
              <FolderOpen className="w-10 h-10 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Barre de filtres */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Recherche */}
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par titre, client, fichier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5c3a] focus:border-transparent"
                />
              </div>
            </div>

            {/* Type de document */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as DocumentType)}
              className="px-4 py-2 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]"
            >
              <option value="all">Tous les types</option>
              <option value="vgp">Rapports VGP</option>
              <option value="bsd">BSD Finalisés</option>
              <option value="certificate">Certificats</option>
              <option value="investment">Archives Investissements</option>
            </select>

            {/* Client */}
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]"
            >
              <option value="all">Tous les clients</option>
              {uniqueClients.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>

            {/* Toggle filtres avancés */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 flex items-center gap-2 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtres {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </button>

            {/* Clear filters */}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded-xl font-semibold text-red-700 flex items-center gap-2 transition-colors"
              >
                <X className="w-4 h-4" />
                Réinitialiser
              </button>
            )}
          </div>

          {/* Filtres avancés */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Date de début</label>
                <input
                  type="date"
                  value={filterDateStart}
                  onChange={(e) => setFilterDateStart(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Date de fin</label>
                <input
                  type="date"
                  value={filterDateEnd}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Liste des documents - Full width */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Documents Archivés ({filteredDocuments.length})
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Cliquez sur un document pour le télécharger
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-[calc(100vh-500px)] overflow-y-auto">
            {loading ? (
              <div className="px-6 py-12 text-center text-gray-400">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a5c3a] mx-auto mb-3"></div>
                <p className="text-sm font-semibold">Chargement...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">Aucun document trouvé</p>
                <p className="text-xs mt-1">Essayez de modifier les filtres</p>
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleDownload(doc)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl ${getDocumentColor(doc.type)} flex items-center justify-center shrink-0`}>
                        {getDocumentIcon(doc.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900">{doc.title}</p>
                          {getStatusBadge(doc.status)}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(doc.date).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          {doc.client && (
                            <p className="text-xs text-gray-500">
                              Client : <span className="font-semibold">{doc.client}</span>
                            </p>
                          )}
                        </div>
                        {doc.archivePath && (
                          <p className="mt-1 text-xs text-indigo-600">
                            Arborescence : {doc.archivePath}
                          </p>
                        )}
                      </div>
                    </div>
                    <button className="p-3 rounded-xl bg-[#1a5c3a] hover:bg-[#14472e] text-white transition-colors shadow-lg">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
