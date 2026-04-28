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
import {
  verifyCertificate,
  markCertificateAsVerified,
} from '@/shared/services/certificateService';

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
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulation
      
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Vérification de Certificat
          </h1>
          <p className="text-lg text-gray-600">
            Vérifiez l'authenticité d'un Certificat de Destruction IVOS
          </p>
        </div>
        
        {/* Formulaire de vérification */}
        {!hasVerified && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Code de Vérification
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                  placeholder="Ex: 1ABC234D-XYZ789..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={loading}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Scannez le QR Code ou saisissez le code manuellement
                </p>
              </div>
              
              <button
                onClick={() => handleVerify()}
                disabled={loading || !verificationCode}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold text-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader className="w-6 h-6 animate-spin" />
                    <span>Vérification en cours...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-6 h-6" />
                    <span>Vérifier le Certificat</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        
        {/* Résultat : Invalide */}
        {isValid === false && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border-4 border-red-500">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Certificat Invalide
              </h2>
              <p className="text-lg text-red-600 mb-6">{error}</p>
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 mb-2">
                      Ce certificat ne peut pas être authentifié
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
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
                className="mt-6 px-8 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
              >
                Vérifier un autre certificat
              </button>
            </div>
          </div>
        )}
        
        {/* Résultat : Valide */}
        {isValid === true && certificate && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-4 border-green-500">
            {/* En-tête de validation */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-8 text-white text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Certificat Authentique</h2>
              <p className="text-green-100 text-lg">
                Ce certificat a été vérifié et est valide
              </p>
            </div>
            
            {/* Détails du certificat */}
            <div className="p-8 space-y-6">
              {/* Numéro de certificat */}
              <div className="text-center pb-6 border-b-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Numéro de Certificat</p>
                <p className="text-3xl font-bold text-green-600">
                  {certificate.certificateNumber}
                </p>
              </div>
              
              {/* Informations principales */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-semibold text-gray-600">Référence BSD</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{certificate.bsdReference}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <User className="w-5 h-5 text-purple-600" />
                    <p className="text-sm font-semibold text-gray-600">Client</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{certificate.clientName}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="w-5 h-5 text-orange-600" />
                    <p className="text-sm font-semibold text-gray-600">Type de Déchet</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{certificate.wasteType}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-semibold text-gray-600">Tonnage Traité</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatTonnage(certificate.finalTonnage)}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-semibold text-gray-600">Date de Collecte</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatDate(certificate.collectionDate)}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-semibold text-gray-600">Date de Traitement</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatDate(certificate.treatmentDate)}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="w-5 h-5 text-red-600" />
                    <p className="text-sm font-semibold text-gray-600">Lieu de Traitement</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{certificate.treatmentLocation}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-5 h-5 text-purple-600" />
                    <p className="text-sm font-semibold text-gray-600">Méthode de Traitement</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{certificate.treatmentMethod}</p>
                </div>
              </div>
              
              {/* Mention légale */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Certification Officielle</p>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      IVOS certifie que les déchets susmentionnés ont été collectés et traités 
                      conformément aux réglementations environnementales en vigueur au Sénégal. 
                      Ce certificat atteste de la prise en charge complète et de l'élimination 
                      conforme des déchets dans le respect des normes QHSE.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Métadonnées */}
              <div className="pt-6 border-t-2 border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Émis le</p>
                    <p className="font-semibold text-gray-900">
                      {formatDate(certificate.generatedAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Par</p>
                    <p className="font-semibold text-gray-900">{certificate.generatedBy}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Code de Vérification</p>
                    <p className="font-mono text-xs text-gray-700 break-all">
                      {certificate.verificationCode}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-center gap-4 pt-6">
                <button
                  onClick={() => window.print()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
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
                  className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Vérifier un autre certificat
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Comment vérifier un certificat ?
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold">1</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Scannez le QR Code</p>
                <p className="text-gray-600 text-sm">
                  Utilisez l'appareil photo de votre smartphone pour scanner le QR Code présent sur le certificat
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Saisissez le code manuellement</p>
                <p className="text-gray-600 text-sm">
                  Vous pouvez aussi saisir le code de vérification indiqué sous le QR Code
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold">3</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Vérifiez l'authenticité</p>
                <p className="text-gray-600 text-sm">
                  Le système vérifie instantanément si le certificat est authentique et affiche ses détails
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
