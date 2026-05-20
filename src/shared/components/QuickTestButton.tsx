/**
 * Bouton Flottant — Création Rapide de Données de Test
 * À ajouter dans n'importe quelle page pour tester rapidement
 *
 * Usage :
 * import QuickTestButton from '@/shared/components/QuickTestButton';
 *
 * <QuickTestButton />
 */

import { useState } from 'react';
import { Zap, X, CheckCircle, FileText, Database } from 'lucide-react';
import { createFictiveOperationComplete } from '../utils/fictiveDataGenerator';

export default function QuickTestButton() {
  const [showMenu, setShowMenu] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  const handleCreate = async (type: 'complete' | 'incomplete' | 'invoice-only') => {
    setCreating(true);
    setMessage('');

    try {
      const result = createFictiveOperationComplete({
        completeWorkflow: type !== 'incomplete',
        generateInvoice: type === 'complete' || type === 'invoice-only',
        generatePayment: type === 'complete',
      });

      setMessage(`✅ ${result.operation.numero} créé !`);

      // Refresh page après 1.5s
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Erreur création:', error);
      setMessage('❌ Erreur lors de la création');
      setCreating(false);
    }
  };

  return (
    <>
      {/* Menu déroulant */}
      {showMenu && (
        <div className="animate-in slide-in-from-bottom-4 fixed bottom-20 right-6 z-50 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Database className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900">Test Rapide</h3>
            </div>
            <button
              onClick={() => setShowMenu(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-4 rounded-lg p-3 text-sm font-medium ${
                message.includes('✅')
                  ? 'border border-green-200 bg-green-50 text-green-700'
                  : 'border border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {message}
            </div>
          )}

          {/* Options */}
          <div className="space-y-2">
            <button
              onClick={() => handleCreate('complete')}
              disabled={creating}
              className="w-full rounded-lg border border-green-200 bg-green-50 p-3 text-left transition-all hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Opération Complète</p>
                  <p className="text-xs text-gray-600">Workflow + Facture + Paiement</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleCreate('invoice-only')}
              disabled={creating}
              className="w-full rounded-lg border border-blue-200 bg-blue-50 p-3 text-left transition-all hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 flex-shrink-0 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Avec Facture Non Payée</p>
                  <p className="text-xs text-gray-600">Workflow + Facture (sans paiement)</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleCreate('incomplete')}
              disabled={creating}
              className="w-full rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-left transition-all hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 flex-shrink-0 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Opération En Cours</p>
                  <p className="text-xs text-gray-600">Workflow incomplet (67%)</p>
                </div>
              </div>
            </button>
          </div>

          {/* Info */}
          <p className="mt-4 text-center text-xs text-gray-500">
            La page se rafraîchira automatiquement
          </p>
        </div>
      )}

      {/* Bouton flottant */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={creating}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all ${
          showMenu
            ? 'bg-gray-600 hover:bg-gray-700'
            : 'bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {creating ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : showMenu ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Zap className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Overlay */}
      {showMenu && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowMenu(false)} />
      )}
    </>
  );
}
