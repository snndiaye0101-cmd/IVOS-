/**
 * Page de Gestion des Certificats de Destruction
 * Liste, génération, envoi et archivage
 */

import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Send,
  CheckCircle,
  Clock,
  Mail,
  Search,
  Filter,
  Plus,
  Eye,
  QrCode,
  AlertCircle,
  TrendingUp,
  Calendar,
  Package,
} from 'lucide-react';
import type { Certificate } from '@/shared/types/certificate.types';
import {
  getCertificates,
  getCertificateStats,
  sendCertificate,
  deleteCertificate,
} from '@/shared/services/certificateService';
import { downloadCertificatePDF } from '../components/CertificatePDF';

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [includeBSD, setIncludeBSD] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Charger les certificats
  useEffect(() => {
    loadCertificates();
    
    // Écouter les mises à jour
    const handleUpdate = () => loadCertificates();
    window.addEventListener('certificates-updated', handleUpdate);
    
    return () => {
      window.removeEventListener('certificates-updated', handleUpdate);
    };
  }, []);
  
  const loadCertificates = () => {
    setLoading(true);
    const loaded = getCertificates();
    // Trier par date (plus récent en premier)
    loaded.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    setCertificates(loaded);
    setLoading(false);
  };
  
  // Filtrer les certificats
  const filteredCertificates = certificates.filter(cert => {
    // Filtre par statut
    if (statusFilter !== 'all' && cert.status !== statusFilter) {
      return false;
    }
    
    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        cert.certificateNumber.toLowerCase().includes(query) ||
        cert.bsdReference.toLowerCase().includes(query) ||
        cert.clientName.toLowerCase().includes(query) ||
        cert.wasteType.toLowerCase().includes(query)
      );
    }
    
    return true;
  });
  
  // Statistiques
  const stats = getCertificateStats();
  
  // Télécharger PDF
  const handleDownload = async (certificate: Certificate) => {
    try {
      await downloadCertificatePDF(certificate);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors de la génération du PDF');
    }
  };
  
  // Ouvrir modal d'envoi
  const handleSendClick = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setSendEmail(certificate.clientEmail || '');
    setShowSendModal(true);
  };
  
  // Envoyer le certificat
  const handleSend = async () => {
    if (!selectedCertificate || !sendEmail) return;
    
    setSending(true);
    
    try {
      await sendCertificate({
        certificateId: selectedCertificate.id,
        recipientEmail: sendEmail,
        includeBSD,
        message: sendMessage || undefined,
      });
      
      alert('✅ Certificat envoyé avec succès !');
      setShowSendModal(false);
      loadCertificates();
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      alert('❌ Erreur lors de l\'envoi du certificat');
    } finally {
      setSending(false);
    }
  };
  
  // Formatage
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };
  
  const formatTonnage = (kg: number) => {
    return `${(kg / 1000).toFixed(2)} t`;
  };
  
  const getStatusBadge = (status: Certificate['status']) => {
    switch (status) {
      case 'generated':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            Généré
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            <Mail className="w-4 h-4" />
            Envoyé
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Vérifié
          </span>
        );
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto" />
          <p className="mt-4 text-lg font-medium text-gray-700">Chargement des certificats...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-[1920px] mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Certificats de Destruction</h1>
                <p className="text-gray-600 mt-1">Gestion et archivage des certificats officiels</p>
              </div>
            </div>
            
            <a
              href="/certificate/verify"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg"
            >
              <QrCode className="w-5 h-5" />
              <span>Vérifier un Certificat</span>
            </a>
          </div>
        </div>
        
        {/* Statistiques */}
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Certificats</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-2">Ce mois : {stats.thisMonth}</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">En Attente</p>
            <p className="text-3xl font-bold text-gray-900">{stats.generated}</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Envoyés</p>
            <p className="text-3xl font-bold text-gray-900">{stats.sent}</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Vérifiés</p>
            <p className="text-3xl font-bold text-gray-900">{stats.verified}</p>
          </div>
        </div>
        
        {/* Filtres */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par numéro, BSD, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="generated">Générés</option>
              <option value="sent">Envoyés</option>
              <option value="verified">Vérifiés</option>
            </select>
          </div>
        </div>
        
        {/* Liste des certificats */}
        {filteredCertificates.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto" />
            <h3 className="text-xl font-bold text-gray-900 mt-4">Aucun Certificat</h3>
            <p className="text-gray-600 mt-2">
              {searchQuery || statusFilter !== 'all'
                ? 'Aucun certificat ne correspond à vos critères de recherche.'
                : 'Les certificats générés apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Certificat
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      BSD
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Client
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Déchet
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Tonnage
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Statut
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCertificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{cert.certificateNumber}</div>
                        <div className="text-sm text-gray-500">
                          Code: {cert.verificationCode.substring(0, 12)}...
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900">{cert.bsdReference}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900">{cert.clientName}</div>
                        {cert.clientEmail && (
                          <div className="text-sm text-gray-500">{cert.clientEmail}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-700 text-sm">{cert.wasteType}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {formatTonnage(cert.finalTonnage)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-700">{formatDate(cert.generatedAt)}</div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(cert.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownload(cert)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Télécharger PDF"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleSendClick(cert)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Envoyer au client"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                          <a
                            href={`/certificate/verify/${cert.verificationCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Voir QR Code"
                          >
                            <QrCode className="w-5 h-5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal d'envoi */}
      {showSendModal && selectedCertificate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Envoyer le Certificat</h2>
              <p className="text-gray-600 mt-1">{selectedCertificate.certificateNumber}</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email du destinataire *
                </label>
                <input
                  type="email"
                  value={sendEmail}
                  onChange={(e) => setSendEmail(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="client@example.com"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="includeBSD"
                  checked={includeBSD}
                  onChange={(e) => setIncludeBSD(e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded"
                />
                <label htmlFor="includeBSD" className="text-gray-700">
                  Inclure le BSD finalisé en pièce jointe
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message personnalisé (optionnel)
                </label>
                <textarea
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Ajouter un message..."
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSendModal(false)}
                disabled={sending}
                className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !sendEmail}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span>Envoi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Envoyer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
