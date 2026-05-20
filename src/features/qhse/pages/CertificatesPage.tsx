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
  const filteredCertificates = certificates.filter((cert) => {
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
      console.error("Erreur lors de l'envoi:", error);
      alert("❌ Erreur lors de l'envoi du certificat");
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
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
            <Clock className="h-4 w-4" />
            Généré
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            <Mail className="h-4 w-4" />
            Envoyé
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
            <CheckCircle className="h-4 w-4" />
            Vérifié
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-b-4 border-green-600" />
          <p className="mt-4 text-lg font-medium text-gray-700">Chargement des certificats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="mx-auto max-w-[1920px] space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-600">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Certificats de Destruction</h1>
                <p className="mt-1 text-gray-600">Gestion et archivage des certificats officiels</p>
              </div>
            </div>

            <a
              href="/certificate/verify"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-white shadow-lg transition-all hover:from-purple-700 hover:to-purple-800"
            >
              <QrCode className="h-5 w-5" />
              <span>Vérifier un Certificat</span>
            </a>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-4 gap-6">
          <div className="rounded-2xl border-l-4 border-green-500 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <p className="mb-1 text-sm text-gray-600">Total Certificats</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="mt-2 text-xs text-gray-500">Ce mois : {stats.thisMonth}</p>
          </div>

          <div className="rounded-2xl border-l-4 border-blue-500 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="mb-1 text-sm text-gray-600">En Attente</p>
            <p className="text-3xl font-bold text-gray-900">{stats.generated}</p>
          </div>

          <div className="rounded-2xl border-l-4 border-purple-500 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                <Mail className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="mb-1 text-sm text-gray-600">Envoyés</p>
            <p className="text-3xl font-bold text-gray-900">{stats.sent}</p>
          </div>

          <div className="rounded-2xl border-l-4 border-orange-500 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                <CheckCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <p className="mb-1 text-sm text-gray-600">Vérifiés</p>
            <p className="text-3xl font-bold text-gray-900">{stats.verified}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par numéro, BSD, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 py-3 pl-12 pr-4 focus:border-green-500 focus:ring-2 focus:ring-green-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-500"
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
          <div className="rounded-2xl bg-white p-12 text-center shadow-lg">
            <AlertCircle className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-xl font-bold text-gray-900">Aucun Certificat</h3>
            <p className="mt-2 text-gray-600">
              {searchQuery || statusFilter !== 'all'
                ? 'Aucun certificat ne correspond à vos critères de recherche.'
                : 'Les certificats générés apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-2 border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Certificat
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">BSD</th>
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
                    <tr key={cert.id} className="transition-colors hover:bg-gray-50">
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
                        <div className="text-sm text-gray-700">{cert.wasteType}</div>
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
                            className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                            title="Télécharger PDF"
                          >
                            <Download className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleSendClick(cert)}
                            className="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-50"
                            title="Envoyer au client"
                          >
                            <Send className="h-5 w-5" />
                          </button>
                          <a
                            href={`/certificate/verify/${cert.verificationCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-purple-600 transition-colors hover:bg-purple-50"
                            title="Voir QR Code"
                          >
                            <QrCode className="h-5 w-5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900">Envoyer le Certificat</h2>
              <p className="mt-1 text-gray-600">{selectedCertificate.certificateNumber}</p>
            </div>

            <div className="space-y-6 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Email du destinataire *
                </label>
                <input
                  type="email"
                  value={sendEmail}
                  onChange={(e) => setSendEmail(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-500"
                  placeholder="client@example.com"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="includeBSD"
                  checked={includeBSD}
                  onChange={(e) => setIncludeBSD(e.target.checked)}
                  className="h-5 w-5 rounded text-green-600"
                />
                <label htmlFor="includeBSD" className="text-gray-700">
                  Inclure le BSD finalisé en pièce jointe
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Message personnalisé (optionnel)
                </label>
                <textarea
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-500"
                  placeholder="Ajouter un message..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 p-6">
              <button
                onClick={() => setShowSendModal(false)}
                disabled={sending}
                className="rounded-xl border-2 border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !sendEmail}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-6 py-2 text-white transition-all hover:from-green-700 hover:to-green-800 disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
                    <span>Envoi...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
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
