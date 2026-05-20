/**
 * Panneau d'Administration — Générateur de Données Fictives
 * Interface visuelle pour créer des opérations de test
 */

import { useState } from 'react';
import { FileText, Trash2, CheckCircle, AlertCircle, Zap, Database } from 'lucide-react';
import {
  createFictiveOperationComplete,
  createMultipleFictiveOperations,
  clearAllFictiveData,
} from '@/shared/utils/fictiveDataGenerator';

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
    if (
      window.confirm(
        '⚠️ Supprimer TOUTES les opérations, factures et paiements ?\n\nCette action est irréversible et supprimera toutes les données de test.'
      )
    ) {
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
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8 rounded-2xl bg-white p-8 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600">
                <Database className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Générateur de Données Fictives</h1>
                <p className="mt-1 text-gray-600">
                  Créer des opérations de test pour valider le système complet
                </p>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div className="mb-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Opérations</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{operations.length}</p>
                </div>
                <FileText className="h-10 w-10 text-blue-500" />
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Factures</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{invoices.length}</p>
                </div>
                <FileText className="h-10 w-10 text-green-500" />
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paiements</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{payments.length}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mb-8 rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-xl font-bold text-gray-900">Actions Rapides</h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Créer 1 opération complète */}
              <button
                onClick={handleCreateSingle}
                disabled={generating}
                className="rounded-xl border-2 border-green-200 bg-green-50 p-6 text-left transition-all hover:border-green-300 hover:bg-green-100 disabled:opacity-50"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-green-500">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-bold text-gray-900">Opération Complète</h3>
                    <p className="text-sm leading-relaxed text-gray-600">
                      Crée 1 opération avec workflow 9 étapes + facture validée + paiement encaissé
                    </p>
                  </div>
                </div>
              </button>

              {/* Créer 1 opération en cours */}
              <button
                onClick={handleCreateInProgress}
                disabled={generating}
                className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6 text-left transition-all hover:border-blue-300 hover:bg-blue-100 disabled:opacity-50"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-bold text-gray-900">Opération En Cours</h3>
                    <p className="text-sm leading-relaxed text-gray-600">
                      Crée 1 opération non terminée (pour tester la saisie progressive)
                    </p>
                  </div>
                </div>
              </button>

              {/* Créer 5 opérations */}
              <button
                onClick={handleCreateMultiple}
                disabled={generating}
                className="rounded-xl border-2 border-purple-200 bg-purple-50 p-6 text-left transition-all hover:border-purple-300 hover:bg-purple-100 disabled:opacity-50"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-bold text-gray-900">5 Opérations Variées</h3>
                    <p className="text-sm leading-relaxed text-gray-600">
                      Crée 5 opérations avec différents clients, déchets et statuts
                    </p>
                  </div>
                </div>
              </button>

              {/* Supprimer tout */}
              <button
                onClick={handleClearAll}
                disabled={generating}
                className="rounded-xl border-2 border-red-200 bg-red-50 p-6 text-left transition-all hover:border-red-300 hover:bg-red-100 disabled:opacity-50"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-red-500">
                    <Trash2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-bold text-gray-900">Supprimer Tout</h3>
                    <p className="text-sm leading-relaxed text-gray-600">
                      ⚠️ Supprime toutes les opérations, factures et paiements
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Résultat dernière création */}
          {lastResult && (
            <div className="rounded-2xl border-2 border-green-200 bg-white p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <CheckCircle className="mt-1 h-6 w-6 flex-shrink-0 text-green-600" />
                <div>
                  <h3 className="mb-2 font-bold text-gray-900">✅ Opération créée avec succès !</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-700">
                      <span className="font-medium">Opération :</span>{' '}
                      {lastResult.operation?.numero}
                    </p>
                    {lastResult.invoice && (
                      <p className="text-gray-700">
                        <span className="font-medium">Facture :</span>{' '}
                        {lastResult.invoice.numeroOfficiel}
                      </p>
                    )}
                    {lastResult.payment && (
                      <p className="text-gray-700">
                        <span className="font-medium">Paiement :</span> {lastResult.payment.id}
                      </p>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    La page va se rafraîchir automatiquement...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Guide */}
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-8 text-white shadow-lg">
            <div className="flex items-start gap-4">
              <AlertCircle className="mt-1 h-6 w-6 flex-shrink-0" />
              <div>
                <h3 className="mb-2 font-bold">ℹ️ Guide d'utilisation</h3>
                <ul className="space-y-2 text-sm opacity-90">
                  <li>
                    • <strong>Opération Complète :</strong> Test du flux complet (BSD → Facture →
                    Paiement)
                  </li>
                  <li>
                    • <strong>Opération En Cours :</strong> Test de la saisie progressive (workflow
                    incomplet)
                  </li>
                  <li>
                    • <strong>5 Opérations :</strong> Génère des données variées pour tester les
                    filtres et listes
                  </li>
                  <li>
                    • <strong>Supprimer Tout :</strong> Nettoie toutes les données de test
                    (irréversible)
                  </li>
                </ul>
                <p className="mt-4 text-sm opacity-75">
                  💡 Après chaque création, la page se rafraîchit pour afficher les nouvelles
                  données.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
