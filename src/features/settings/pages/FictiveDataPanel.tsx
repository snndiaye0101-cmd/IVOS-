/**
 * Panneau d'Administration — Générateur de Données Fictives
 * Interface visuelle pour créer des opérations de test
 */

import { useState } from 'react';
import { FileText, Trash2, CheckCircle, AlertCircle, Zap, Database } from 'lucide-react';
import { createFictiveOperationComplete, createMultipleFictiveOperations, clearAllFictiveData } from '@/shared/utils/fictiveDataGenerator';

export default function FictiveDataPanel() {
  const [generating, setGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  // ══════════════════════════════════════════════════════════════
  // Créer 1 opération complète
  // ══════════════════════════════════════════════════════════════

  const handleCreateSingle = async () => {
    setGenerating(true);
    try {
      const result = createFictiveOperationComplete({
        completeWorkflow: true,
        generateInvoice: true,
        generatePayment: true,
      });
      setLastResult(result);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Erreur création:', error);
      alert('Erreur lors de la création');
    } finally {
      setGenerating(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // Créer plusieurs opérations
  // ══════════════════════════════════════════════════════════════

  const handleCreateMultiple = async () => {
    setGenerating(true);
    try {
      createMultipleFictiveOperations(5);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Erreur création:', error);
      alert('Erreur lors de la création');
    } finally {
      setGenerating(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // Créer 1 opération en cours (non terminée)
  // ══════════════════════════════════════════════════════════════

  const handleCreateInProgress = async () => {
    setGenerating(true);
    try {
      const result = createFictiveOperationComplete({
        completeWorkflow: false,
        generateInvoice: false,
        generatePayment: false,
      });
      setLastResult(result);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Erreur création:', error);
      alert('Erreur lors de la création');
    } finally {
      setGenerating(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // Supprimer toutes les données
  // ══════════════════════════════════════════════════════════════

  const handleClearAll = () => {
    if (window.confirm('⚠️ Supprimer TOUTES les opérations, factures et paiements ?\n\nCette action est irréversible et supprimera toutes les données de test.')) {
      clearAllFictiveData();
      setTimeout(() => window.location.reload(), 500);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // Statistiques actuelles
  // ══════════════════════════════════════════════════════════════

  const operations = JSON.parse(localStorage.getItem('ivos_operations_v1') || '[]');
  const invoices = JSON.parse(localStorage.getItem('ivos_workflow_invoices_v1') || '[]');
  const payments = JSON.parse(localStorage.getItem('ivos_payments_v1') || '[]');

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <div className="max-w-5xl mx-auto">
          
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <Database className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Générateur de Données Fictives</h1>
                <p className="text-gray-600 mt-1">Créer des opérations de test pour valider le système complet</p>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Opérations</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{operations.length}</p>
                </div>
                <FileText className="w-10 h-10 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Factures</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{invoices.length}</p>
                </div>
                <FileText className="w-10 h-10 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paiements</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{payments.length}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Actions Rapides</h2>

            <div className="grid grid-cols-2 gap-4">
              
              {/* Créer 1 opération complète */}
              <button
                onClick={handleCreateSingle}
                disabled={generating}
                className="p-6 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-all text-left disabled:opacity-50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Opération Complète</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Crée 1 opération avec workflow 9 étapes + facture validée + paiement encaissé
                    </p>
                  </div>
                </div>
              </button>

              {/* Créer 1 opération en cours */}
              <button
                onClick={handleCreateInProgress}
                disabled={generating}
                className="p-6 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all text-left disabled:opacity-50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Opération En Cours</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Crée 1 opération non terminée (pour tester la saisie progressive)
                    </p>
                  </div>
                </div>
              </button>

              {/* Créer 5 opérations */}
              <button
                onClick={handleCreateMultiple}
                disabled={generating}
                className="p-6 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300 transition-all text-left disabled:opacity-50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">5 Opérations Variées</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Crée 5 opérations avec différents clients, déchets et statuts
                    </p>
                  </div>
                </div>
              </button>

              {/* Supprimer tout */}
              <button
                onClick={handleClearAll}
                disabled={generating}
                className="p-6 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all text-left disabled:opacity-50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Supprimer Tout</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      ⚠️ Supprime toutes les opérations, factures et paiements
                    </p>
                  </div>
                </div>
              </button>

            </div>
          </div>

          {/* Résultat dernière création */}
          {lastResult && (
            <div className="bg-white rounded-2xl shadow-sm p-8 border-2 border-green-200">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">✅ Opération créée avec succès !</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-700">
                      <span className="font-medium">Opération :</span> {lastResult.operation?.numero}
                    </p>
                    {lastResult.invoice && (
                      <p className="text-gray-700">
                        <span className="font-medium">Facture :</span> {lastResult.invoice.numeroOfficiel}
                      </p>
                    )}
                    {lastResult.payment && (
                      <p className="text-gray-700">
                        <span className="font-medium">Paiement :</span> {lastResult.payment.id}
                      </p>
                    )}
                  </div>
                  <p className="text-gray-600 mt-3 text-sm">
                    La page va se rafraîchir automatiquement...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Guide */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-8 text-white">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold mb-2">ℹ️ Guide d'utilisation</h3>
                <ul className="space-y-2 text-sm opacity-90">
                  <li>• <strong>Opération Complète :</strong> Test du flux complet (BSD → Facture → Paiement)</li>
                  <li>• <strong>Opération En Cours :</strong> Test de la saisie progressive (workflow incomplet)</li>
                  <li>• <strong>5 Opérations :</strong> Génère des données variées pour tester les filtres et listes</li>
                  <li>• <strong>Supprimer Tout :</strong> Nettoie toutes les données de test (irréversible)</li>
                </ul>
                <p className="mt-4 text-sm opacity-75">
                  💡 Après chaque création, la page se rafraîchit pour afficher les nouvelles données.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
