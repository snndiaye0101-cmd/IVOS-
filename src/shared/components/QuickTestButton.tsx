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
        <div className="fixed bottom-20 right-6 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-80 z-50 animate-in slide-in-from-bottom-4">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Database className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900">Test Rapide</h3>
            </div>
            <button
              onClick={() => setShowMenu(false)}
              className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
              message.includes('✅') 
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* Options */}
          <div className="space-y-2">
            
            <button
              onClick={() => handleCreate('complete')}
              disabled={creating}
              className="w-full p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Opération Complète</p>
                  <p className="text-xs text-gray-600">Workflow + Facture + Paiement</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleCreate('invoice-only')}
              disabled={creating}
              className="w-full p-3 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Avec Facture Non Payée</p>
                  <p className="text-xs text-gray-600">Workflow + Facture (sans paiement)</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleCreate('incomplete')}
              disabled={creating}
              className="w-full p-3 rounded-lg bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Opération En Cours</p>
                  <p className="text-xs text-gray-600">Workflow incomplet (67%)</p>
                </div>
              </div>
            </button>

          </div>

          {/* Info */}
          <p className="text-xs text-gray-500 mt-4 text-center">
            La page se rafraîchira automatiquement
          </p>
        </div>
      )}

      {/* Bouton flottant */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={creating}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50 transition-all ${
          showMenu 
            ? 'bg-gray-600 hover:bg-gray-700' 
            : 'bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {creating ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : showMenu ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Zap className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Overlay */}
      {showMenu && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
}
