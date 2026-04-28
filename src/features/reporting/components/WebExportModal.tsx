/**
 * Modal d'Exportation Web
 * Interface pour générer et exporter le contenu pour le site web
 */

import { useState } from 'react';
import { X, Copy, Download, CheckCircle, Globe, Share2 } from 'lucide-react';
import type { ImpactMetrics } from '@/shared/services/dataAnalyticsService';
import type { WebExportContent } from '@/shared/services/webExportService';
import {
  generateWebExportContent,
  downloadInfographic,
  copyHtmlToClipboard,
  copyTextToClipboard,
} from '@/shared/services/webExportService';

interface WebExportModalProps {
  metrics: ImpactMetrics;
  onClose: () => void;
}

export default function WebExportModal({ metrics, onClose }: WebExportModalProps) {
  const [content, setContent] = useState<WebExportContent | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [downloadingImage, setDownloadingImage] = useState(false);

  // Générer le contenu au montage
  useState(() => {
    const generated = generateWebExportContent(metrics);
    setContent(generated);
  });

  if (!content) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto" />
          <p className="text-center mt-4 text-gray-600">Génération du contenu...</p>
        </div>
      </div>
    );
  }

  const handleCopy = async (type: 'html' | 'text') => {
    try {
      if (type === 'html') {
        await copyHtmlToClipboard(content);
      } else {
        await copyTextToClipboard(content);
      }
      setCopiedItem(type);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownloadImage = async () => {
    try {
      setDownloadingImage(true);
      await downloadInfographic(metrics);
    } catch (error) {
      console.error('Failed to download image:', error);
    } finally {
      setDownloadingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Export pour Site Web</h2>
              <p className="text-sm text-gray-500">Contenu prêt pour publication sur ivos.sn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Confidentialité Assurée */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900">
                ✅ Confidentialité respectée
              </p>
              <p className="text-sm text-green-700">
                Les noms de clients ont été automatiquement anonymisés. Seuls les secteurs d'activité apparaissent dans les statistiques publiques.
              </p>
            </div>
          </div>

          {/* Headline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre Principal
            </label>
            <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
              <p className="text-xl font-bold text-gray-900">{content.headline}</p>
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Résumé Court (1-2 phrases)
            </label>
            <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
              <p className="text-gray-700 leading-relaxed">{content.summary}</p>
            </div>
          </div>

          {/* Key Figures */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chiffres Clés
            </label>
            <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 space-y-2">
              {content.keyFigures.map((figure, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full" />
                  <p className="text-sm text-gray-700">{figure}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Infographie Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Infographie (Aperçu des données)
            </label>
            <div className="bg-gradient-to-br from-green-700 to-green-800 rounded-xl p-8 text-white">
              <div className="text-center space-y-6">
                <div>
                  <p className="text-sm opacity-80 uppercase tracking-wider">
                    {content.infographicData.period}
                  </p>
                  <h3 className="text-5xl font-bold mt-2">
                    {content.infographicData.mainNumber}
                  </h3>
                  <p className="text-lg opacity-90 mt-1">
                    {content.infographicData.mainLabel}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {content.infographicData.subStats.map((stat, index) => (
                    <div key={index} className="bg-white/10 rounded-lg p-4">
                      <p className="text-3xl font-bold">{stat.value}</p>
                      <p className="text-sm opacity-80 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <p className="text-sm opacity-70">
                  {content.infographicData.brandingText}
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadImage}
              disabled={downloadingImage}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {downloadingImage ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Génération de l'image...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Télécharger l'Infographie PNG (1200x630)</span>
                </>
              )}
            </button>
          </div>

          {/* HTML Snippet */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Code HTML (pour intégration site web)
              </label>
              <button
                onClick={() => handleCopy('html')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copiedItem === 'html' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copier HTML</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border-2 border-gray-700 overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                {content.htmlSnippet}
              </pre>
            </div>
          </div>

          {/* Text for Social Media */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Texte pour Réseaux Sociaux
              </label>
              <button
                onClick={() => handleCopy('text')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copiedItem === 'text' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Copier Texte</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                {content.textOnly}
              </pre>
            </div>
          </div>

          {/* Full Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description Complète (Article de blog)
            </label>
            <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {content.fullDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
