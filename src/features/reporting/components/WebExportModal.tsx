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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-2xl bg-white p-8">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-green-600" />
          <p className="mt-4 text-center text-gray-600">Génération du contenu...</p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Export pour Site Web</h2>
              <p className="text-sm text-gray-500">Contenu prêt pour publication sur ivos.sn</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(100vh-200px)] space-y-6 overflow-y-auto p-6">
          {/* Confidentialité Assurée */}
          <div className="flex items-start gap-3 rounded-xl border-2 border-green-200 bg-green-50 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">✅ Confidentialité respectée</p>
              <p className="text-sm text-green-700">
                Les noms de clients ont été automatiquement anonymisés. Seuls les secteurs
                d'activité apparaissent dans les statistiques publiques.
              </p>
            </div>
          </div>

          {/* Headline */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Titre Principal</label>
            <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
              <p className="text-xl font-bold text-gray-900">{content.headline}</p>
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Résumé Court (1-2 phrases)
            </label>
            <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
              <p className="leading-relaxed text-gray-700">{content.summary}</p>
            </div>
          </div>

          {/* Key Figures */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Chiffres Clés</label>
            <div className="space-y-2 rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
              {content.keyFigures.map((figure, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-600" />
                  <p className="text-sm text-gray-700">{figure}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Infographie Preview */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Infographie (Aperçu des données)
            </label>
            <div className="rounded-xl bg-gradient-to-br from-green-700 to-green-800 p-8 text-white">
              <div className="space-y-6 text-center">
                <div>
                  <p className="text-sm uppercase tracking-wider opacity-80">
                    {content.infographicData.period}
                  </p>
                  <h3 className="mt-2 text-5xl font-bold">{content.infographicData.mainNumber}</h3>
                  <p className="mt-1 text-lg opacity-90">{content.infographicData.mainLabel}</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {content.infographicData.subStats.map((stat, index) => (
                    <div key={index} className="rounded-lg bg-white/10 p-4">
                      <p className="text-3xl font-bold">{stat.value}</p>
                      <p className="mt-1 text-sm opacity-80">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <p className="text-sm opacity-70">{content.infographicData.brandingText}</p>
              </div>
            </div>

            <button
              onClick={handleDownloadImage}
              disabled={downloadingImage}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {downloadingImage ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
                  <span>Génération de l'image...</span>
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  <span>Télécharger l'Infographie PNG (1200x630)</span>
                </>
              )}
            </button>
          </div>

          {/* HTML Snippet */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Code HTML (pour intégration site web)
              </label>
              <button
                onClick={() => handleCopy('html')}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
              >
                {copiedItem === 'html' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copier HTML</span>
                  </>
                )}
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border-2 border-gray-700 bg-gray-900 p-4">
              <pre className="whitespace-pre-wrap font-mono text-xs text-green-400">
                {content.htmlSnippet}
              </pre>
            </div>
          </div>

          {/* Text for Social Media */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Texte pour Réseaux Sociaux
              </label>
              <button
                onClick={() => handleCopy('text')}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
              >
                {copiedItem === 'text' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    <span>Copier Texte</span>
                  </>
                )}
              </button>
            </div>
            <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                {content.textOnly}
              </pre>
            </div>
          </div>

          {/* Full Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Description Complète (Article de blog)
            </label>
            <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {content.fullDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 p-6">
          <button
            onClick={onClose}
            className="rounded-xl border-2 border-gray-300 px-6 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
