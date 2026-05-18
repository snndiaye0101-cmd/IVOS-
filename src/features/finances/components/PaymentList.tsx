/**
 * PaymentList
 * Liste des paiements avec filtres et actions
 */

import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle2, Clock, XCircle, Eye, Filter } from 'lucide-react';
import { formatCleanAmount } from '../../../shared/utils/formatAmount';
import {
  loadPayments,
  formatPaymentMethod,
  formatPaymentDetails,
  validatePayment,
  markPaymentAsEncaisse,
  rejectPayment,
  type Payment,
  type PaymentStatus,
  type PaymentMethod,
} from '../services/paymentService';

interface PaymentListProps {
  invoiceId?: string; // Si fourni, filtre par facture
  showActions?: boolean; // Afficher les boutons d'action
  currentUserRole?: string;
  currentUserName?: string;
}

export default function PaymentList({
  invoiceId,
  showActions = false,
  currentUserRole,
  currentUserName,
}: PaymentListProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'all'>('all');
  const [filterMethod, setFilterMethod] = useState<PaymentMethod | 'all'>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const loadData = () => {
    let data = loadPayments();
    if (invoiceId) {
      data = data.filter(p => p.invoiceId === invoiceId);
    }
    if (filterStatus !== 'all') {
      data = data.filter(p => p.status === filterStatus);
    }
    if (filterMethod !== 'all') {
      data = data.filter(p => p.method === filterMethod);
    }
    setPayments(data);
  };

  useEffect(() => {
    loadData();

    const handler = () => loadData();
    window.addEventListener('ivos_payment_change', handler);
    return () => window.removeEventListener('ivos_payment_change', handler);
  }, [invoiceId, filterStatus, filterMethod]);

  const handleValidate = (paymentId: string) => {
    if (!currentUserName) return;
    validatePayment(paymentId, currentUserName);
    loadData();
  };

  const handleEncaisse = (paymentId: string) => {
    markPaymentAsEncaisse(paymentId);
    loadData();
  };

  const handleReject = (paymentId: string) => {
    const reason = window.prompt('Raison du rejet (optionnel):');
    rejectPayment(paymentId, reason || undefined);
    loadData();
  };

  const getStatusBadge = (status: PaymentStatus) => {
    const badges: Record<PaymentStatus, { label: string; bg: string; color: string }> = {
      en_attente: { label: 'En Attente', bg: 'bg-yellow-100', color: 'text-yellow-800' },
      valide: { label: 'Validé', bg: 'bg-blue-100', color: 'text-blue-800' },
      encaisse: { label: 'Encaissé', bg: 'bg-green-100', color: 'text-green-800' },
      rejete: { label: 'Rejeté', bg: 'bg-red-100', color: 'text-red-800' },
    };
    const badge = badges[status];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const isSuperAdmin = currentUserRole === 'Directeur Général' || currentUserRole === 'Admin';

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">
                {invoiceId ? 'Paiements de cette Facture' : 'Liste des Paiements'}
              </h3>
            </div>
            <span className="text-sm font-semibold text-gray-600">
              {payments.length} paiement{payments.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Filters */}
          {!invoiceId && (
            <div className="flex gap-3 mt-4">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as PaymentStatus | 'all')}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-green-400 outline-none"
              >
                <option value="all">Tous les statuts</option>
                <option value="en_attente">En Attente</option>
                <option value="valide">Validé</option>
                <option value="encaisse">Encaissé</option>
                <option value="rejete">Rejeté</option>
              </select>

              <select
                value={filterMethod}
                onChange={e => setFilterMethod(e.target.value as PaymentMethod | 'all')}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-green-400 outline-none"
              >
                <option value="all">Tous les modes</option>
                <option value="virement">Virement</option>
                <option value="cheque">Chèque</option>
                <option value="especes">Espèces</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          )}
        </div>

        {/* List */}
        <div className="divide-y divide-gray-100">
          {payments.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Aucun paiement enregistré</p>
            </div>
          ) : (
            payments.map(payment => (
              <div key={payment.id} className="px-6 py-4 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-xs font-bold text-gray-500">
                        {payment.id}
                      </span>
                      {getStatusBadge(payment.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Facture:</span>
                        <span className="ml-2 font-semibold text-gray-900">
                          {payment.invoiceNumero}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Client:</span>
                        <span className="ml-2 font-semibold text-gray-900">
                          {payment.clientNom}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Mode:</span>
                        <span className="ml-2 font-medium text-gray-700">
                          {formatPaymentMethod(payment.method)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Montant:</span>
                        <span className="ml-2 font-bold text-green-600">
                          {formatCleanAmount(payment.montant, 'FCFA')}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Détails:</span>
                        <span className="ml-2 text-gray-700 text-xs">
                          {formatPaymentDetails(payment)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Saisi par:</span>
                        <span className="ml-2 text-gray-700">{payment.saisiePar}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <span className="ml-2 text-gray-700">
                          {new Date(payment.dateCreation).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    {payment.notes && (
                      <div className="mt-2 text-xs text-gray-600 italic bg-gray-50 px-3 py-2 rounded-lg">
                        Note: {payment.notes}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {showActions && (
                    <div className="flex flex-col gap-2">
                      {payment.status === 'en_attente' && isSuperAdmin && (
                        <>
                          <button
                            onClick={() => handleValidate(payment.id)}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Valider
                          </button>
                          <button
                            onClick={() => handleReject(payment.id)}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition flex items-center gap-2"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Rejeter
                          </button>
                        </>
                      )}

                      {payment.status === 'valide' && isSuperAdmin && (
                        <button
                          onClick={() => handleEncaisse(payment.id)}
                          className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition flex items-center gap-2"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Marquer Encaissé
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedPayment(payment)}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition flex items-center gap-2"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Détails
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Détails */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-green-600 to-emerald-600">
              <h3 className="text-lg font-bold text-white">Détails du Paiement</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-600">ID:</span>
                  <p className="font-mono text-xs">{selectedPayment.id}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Statut:</span>
                  <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold text-gray-600">Facture:</span>
                  <p>{selectedPayment.invoiceNumero}</p>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold text-gray-600">Client:</span>
                  <p>{selectedPayment.clientNom}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Montant:</span>
                  <p className="text-lg font-bold text-green-600">
                    {formatCleanAmount(selectedPayment.montant, 'FCFA')}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Mode:</span>
                  <p>{formatPaymentMethod(selectedPayment.method)}</p>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold text-gray-600">Détails:</span>
                  <p className="text-xs bg-gray-50 px-3 py-2 rounded-lg mt-1">
                    {formatPaymentDetails(selectedPayment)}
                  </p>
                </div>
                {selectedPayment.notes && (
                  <div className="col-span-2">
                    <span className="font-semibold text-gray-600">Notes:</span>
                    <p className="text-xs bg-gray-50 px-3 py-2 rounded-lg mt-1 italic">
                      {selectedPayment.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-6 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-700 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
