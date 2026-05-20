/**
 * Page de Vérification de Certificat
 * Scan QR Code ou saisie manuelle du code de vérification
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  QrCode,
  CheckCircle,
  XCircle,
  Shield,
  Calendar,
  Package,
  MapPin,
  FileText,
  User,
  AlertCircle,
  Loader,
} from 'lucide-react';
import type { Certificate } from '@/shared/types/certificate.types';
import { verifyCertificate, markCertificateAsVerified } from '@/shared/services/certificateService';

export default function CertificateVerificationPage() {
  const { code } = useParams<{ code?: string }>();
  const [verificationCode, setVerificationCode] = useState(code || '');
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);

  useEffect(() => {
    if (code) {
      handleVerify(code);
    }
  }, [code]);

  const handleVerify = async (codeToVerify?: string) => {
    const finalCode = codeToVerify || verificationCode;

    if (!finalCode) {
      setError('Veuillez saisir un code de vérification');
      return;
    }

    setLoading(true);
    setError('');
    setIsValid(null);
    setCertificate(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800)); // Simulation

      const result = verifyCertificate(finalCode);

      if (result.isValid && result.certificate) {
        setIsValid(true);
        setCertificate(result.certificate);
        setHasVerified(true);

        // Marquer comme vérifié
        if (result.certificate.status !== 'verified') {
          markCertificateAsVerified(result.certificate.id);
        }
      } else {
        setIsValid(false);
        setError(result.error || 'Certificat invalide');
      }
    } catch (err) {
      setIsValid(false);
      setError('Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTonnage = (kg: number) => {
    return `${(kg / 1000).toFixed(2)} tonnes`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="mb-3 text-4xl font-bold text-gray-900">Vérification de Certificat</h1>
          <p className="text-lg text-gray-600">
            Vérifiez l'authenticité d'un Certificat de Destruction IVOS
          </p>
        </div>

        {/* Formulaire de vérification */}
        {!hasVerified && (
          <div className="rounded-2xl bg-white p-8 shadow-xl">
            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-medium text-gray-700">
                  Code de Vérification
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                  placeholder="Ex: 1ABC234D-XYZ789..."
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-lg focus:border-green-500 focus:ring-2 focus:ring-green-500"
                  disabled={loading}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Scannez le QR Code ou saisissez le code manuellement
                </p>
              </div>

              <button
                onClick={() => handleVerify()}
                disabled={loading || !verificationCode}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-green-600 to-green-700 py-4 text-lg font-semibold text-white transition-all hover:from-green-700 hover:to-green-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader className="h-6 w-6 animate-spin" />
                    <span>Vérification en cours...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="h-6 w-6" />
                    <span>Vérifier le Certificat</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Résultat : Invalide */}
        {isValid === false && (
          <div className="rounded-2xl border-4 border-red-500 bg-white p-8 shadow-xl">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="mb-3 text-3xl font-bold text-gray-900">Certificat Invalide</h2>
              <p className="mb-6 text-lg text-red-600">{error}</p>
              <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-1 h-6 w-6 flex-shrink-0 text-red-600" />
                  <div className="text-left">
                    <p className="mb-2 font-semibold text-gray-900">
                      Ce certificat ne peut pas être authentifié
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                      <li>Le code de vérification est incorrect</li>
                      <li>Le certificat n'existe pas dans notre système</li>
                      <li>Le document peut être un faux</li>
                    </ul>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setHasVerified(false);
                  setVerificationCode('');
                  setIsValid(null);
                  setError('');
                }}
                className="mt-6 rounded-xl bg-gray-600 px-8 py-3 text-white transition-colors hover:bg-gray-700"
              >
                Vérifier un autre certificat
              </button>
            </div>
          </div>
        )}

        {/* Résultat : Valide */}
        {isValid === true && certificate && (
          <div className="overflow-hidden rounded-2xl border-4 border-green-500 bg-white shadow-xl">
            {/* En-tête de validation */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-8 text-center text-white">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="mb-2 text-3xl font-bold">Certificat Authentique</h2>
              <p className="text-lg text-green-100">Ce certificat a été vérifié et est valide</p>
            </div>

            {/* Détails du certificat */}
            <div className="space-y-6 p-8">
              {/* Numéro de certificat */}
              <div className="border-b-2 border-gray-200 pb-6 text-center">
                <p className="mb-2 text-sm text-gray-600">Numéro de Certificat</p>
                <p className="text-3xl font-bold text-green-600">{certificate.certificateNumber}</p>
              </div>

              {/* Informations principales */}
              <div className="grid grid-cols-2 gap-6">
                <div className="rounded-xl bg-gray-50 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <p className="text-sm font-semibold text-gray-600">Référence BSD</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{certificate.bsdReference}</p>
                </div>

                <div className="rounded-xl bg-gray-50 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <User className="h-5 w-5 text-purple-600" />
                    <p className="text-sm font-semibold text-gray-600">Client</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{certificate.clientName}</p>
                </div>

                <div className="rounded-xl bg-gray-50 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <Package className="h-5 w-5 text-orange-600" />
                    <p className="text-sm font-semibold text-gray-600">Type de Déchet</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{certificate.wasteType}</p>
                </div>

                <div className="rounded-xl bg-gray-50 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <Package className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-semibold text-gray-600">Tonnage Traité</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatTonnage(certificate.finalTonnage)}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <p className="text-sm font-semibold text-gray-600">Date de Collecte</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatDate(certificate.collectionDate)}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-semibold text-gray-600">Date de Traitement</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatDate(certificate.treatmentDate)}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-red-600" />
                    <p className="text-sm font-semibold text-gray-600">Lieu de Traitement</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{certificate.treatmentLocation}</p>
                </div>

                <div className="rounded-xl bg-gray-50 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <Shield className="h-5 w-5 text-purple-600" />
                    <p className="text-sm font-semibold text-gray-600">Méthode de Traitement</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{certificate.treatmentMethod}</p>
                </div>
              </div>

              {/* Mention légale */}
              <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6">
                <div className="flex items-start gap-3">
                  <Shield className="mt-1 h-6 w-6 flex-shrink-0 text-green-600" />
                  <div>
                    <p className="mb-2 font-semibold text-gray-900">Certification Officielle</p>
                    <p className="text-sm leading-relaxed text-gray-700">
                      IVOS certifie que les déchets susmentionnés ont été collectés et traités
                      conformément aux réglementations environnementales en vigueur au Sénégal. Ce
                      certificat atteste de la prise en charge complète et de l'élimination conforme
                      des déchets dans le respect des normes QHSE.
                    </p>
                  </div>
                </div>
              </div>

              {/* Métadonnées */}
              <div className="border-t-2 border-gray-200 pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="mb-1 text-sm text-gray-600">Émis le</p>
                    <p className="font-semibold text-gray-900">
                      {formatDate(certificate.generatedAt)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm text-gray-600">Par</p>
                    <p className="font-semibold text-gray-900">{certificate.generatedBy}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm text-gray-600">Code de Vérification</p>
                    <p className="break-all font-mono text-xs text-gray-700">
                      {certificate.verificationCode}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-4 pt-6">
                <button
                  onClick={() => window.print()}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                >
                  Imprimer
                </button>
                <button
                  onClick={() => {
                    setHasVerified(false);
                    setVerificationCode('');
                    setIsValid(null);
                    setCertificate(null);
                  }}
                  className="rounded-xl bg-gray-600 px-6 py-3 text-white transition-colors hover:bg-gray-700"
                >
                  Vérifier un autre certificat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <h3 className="mb-4 text-xl font-bold text-gray-900">Comment vérifier un certificat ?</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                <span className="font-bold text-green-600">1</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Scannez le QR Code</p>
                <p className="text-sm text-gray-600">
                  Utilisez l'appareil photo de votre smartphone pour scanner le QR Code présent sur
                  le certificat
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                <span className="font-bold text-green-600">2</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Saisissez le code manuellement</p>
                <p className="text-sm text-gray-600">
                  Vous pouvez aussi saisir le code de vérification indiqué sous le QR Code
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                <span className="font-bold text-green-600">3</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Vérifiez l'authenticité</p>
                <p className="text-sm text-gray-600">
                  Le système vérifie instantanément si le certificat est authentique et affiche ses
                  détails
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
