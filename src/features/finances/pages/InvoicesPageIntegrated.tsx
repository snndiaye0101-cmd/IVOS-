/**
 * Exemple d'Intégration - Module Facturation avec Paiements
 * InvoicesPageIntegrated.tsx
 *
 * Démontre :
 * - Liste des factures avec statuts
 * - Formulaire de paiement
 * - Validation Super Admin
 * - Statistiques paiements
 */

import React, { useState, useEffect } from 'react';
import { formatCleanAmount } from '../../../shared/utils/formatAmount';
import {
  DollarSign,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Send,
  Lock,
  Unlock,
} from 'lucide-react';

// Services
import {
  getWorkflowInvoices,
  updateInvoiceStatus,
  type WorkflowInvoice,
  type InvoiceStatus,
} from '../../finances/services/workflowInvoiceService';
import {
  getPaymentsByInvoice,
  getPaymentStats,
  type Payment,
} from '../../finances/services/paymentService';

// Composants
import PaymentForm from '../../finances/components/PaymentForm';
import PaymentList from '../../finances/components/PaymentList';
import { useAuth } from '@/shared/contexts/AuthContext';

export default function InvoicesPageIntegrated() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<WorkflowInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<WorkflowInvoice | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');

  const isSuperAdmin = user?.role === 'Directeur Général' || user?.role === 'Admin';
  const formatCurrency = (value: number) => formatCleanAmount(value, 'FCFA');

  // ══════════════════════════════════════════════════════════════
  // DATA LOADING
  // ══════════════════════════════════════════════════════════════

  const loadInvoices = () => {
    let data = getWorkflowInvoices();
    if (filter !== 'all') {
      data = data.filter((i) => i.status === filter);
    }
    setInvoices(data);
  };

  useEffect(() => {
    loadInvoices();

    const handler = () => loadInvoices();
    window.addEventListener('ivos_invoice_change', handler);
    window.addEventListener('ivos_payment_change', handler);

    return () => {
      window.removeEventListener('ivos_invoice_change', handler);
      window.removeEventListener('ivos_payment_change', handler);
    };
  }, [filter]);

  // ══════════════════════════════════════════════════════════════
  // ACTIONS
  // ══════════════════════════════════════════════════════════════

  const handleValidate = (invoice: WorkflowInvoice) => {
    if (!isSuperAdmin) {
      alert('Seul le Super Admin peut valider les factures.');
      return;
    }

    if (window.confirm(`Valider la facture ${invoice.numeroOfficiel} ?`)) {
      updateInvoiceStatus(invoice.id, 'validee', user?.fullName);
      loadInvoices();
    }
  };

  const handleSend = (invoice: WorkflowInvoice) => {
    if (invoice.status !== 'validee') {
      alert('La facture doit être validée avant envoi.');
      return;
    }

    if (window.confirm(`Marquer la facture ${invoice.numeroOfficiel} comme envoyée ?`)) {
      updateInvoiceStatus(invoice.id, 'envoyee');
      loadInvoices();
    }
  };

  const handleOpenPaymentForm = (invoice: WorkflowInvoice) => {
    if (invoice.status === 'a_valider') {
      alert("La facture doit d'abord être validée par le Super Admin.");
      return;
    }

    setSelectedInvoice(invoice);
    setShowPaymentForm(true);
  };

  // ══════════════════════════════════════════════════════════════
  // STATISTICS
  // ══════════════════════════════════════════════════════════════

  const paymentStats = getPaymentStats();

  const totalInvoiced = invoices
    .filter((i) => i.status !== 'annulee')
    .reduce((s, i) => s + i.montantHT, 0);

  const totalPaid = invoices
    .filter((i) => i.status === 'payee')
    .reduce((s, i) => s + i.montantHT, 0);

  const totalPending = totalInvoiced - totalPaid;

  // ══════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ══════════════════════════════════════════════════════════════

  const getStatusBadge = (status: InvoiceStatus) => {
    const badges: Record<
      InvoiceStatus,
      { label: string; bg: string; color: string; icon: React.ReactNode }
    > = {
      a_valider: {
        label: 'À Valider',
        bg: 'bg-yellow-100',
        color: 'text-yellow-800',
        icon: <Clock className="h-3.5 w-3.5" />,
      },
      validee: {
        label: 'Validée',
        bg: 'bg-blue-100',
        color: 'text-blue-800',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      },
      envoyee: {
        label: 'Envoyée',
        bg: 'bg-purple-100',
        color: 'text-purple-800',
        icon: <Send className="h-3.5 w-3.5" />,
      },
      payee: {
        label: 'Payée',
        bg: 'bg-green-100',
        color: 'text-green-800',
        icon: <DollarSign className="h-3.5 w-3.5" />,
      },
      annulee: {
        label: 'Annulée',
        bg: 'bg-red-100',
        color: 'text-red-800',
        icon: <XCircle className="h-3.5 w-3.5" />,
      },
    };

    const badge = badges[status];

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${badge.bg} ${badge.color}`}
      >
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <>
      <div className="w-full max-w-none space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">Gestion des Factures & Paiements</h1>
              <p className="text-blue-100">Système complet de facturation et trésorerie</p>
            </div>
            <FileText className="h-16 w-16 text-white/30" />
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            label="Total Facturé"
            value={formatCurrency(totalInvoiced)}
            icon={FileText}
            color="blue"
          />
          <StatCard
            label="Total Encaissé"
            value={formatCurrency(paymentStats.montantEncaisse)}
            icon={DollarSign}
            color="green"
          />
          <StatCard
            label="En Attente"
            value={formatCurrency(totalPending)}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            label="Paiements"
            value={`${paymentStats.total}`}
            icon={CheckCircle2}
            color="purple"
            subtitle={`${paymentStats.encaisses} encaissés`}
          />
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-600">Filtrer:</span>
            {[
              { value: 'all', label: 'Toutes' },
              { value: 'a_valider', label: 'À Valider' },
              { value: 'validee', label: 'Validées' },
              { value: 'envoyee', label: 'Envoyées' },
              { value: 'payee', label: 'Payées' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value as InvoiceStatus | 'all')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  filter === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices List */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-md">
          <div className="border-b bg-gray-50 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-900">Factures ({invoices.length})</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {invoices.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p className="font-medium">Aucune facture trouvée</p>
              </div>
            ) : (
              invoices.map((invoice) => {
                const payments = getPaymentsByInvoice(invoice.id);
                const hasPayments = payments.length > 0;

                return (
                  <div key={invoice.id} className="px-6 py-4 transition hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Invoice Details */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-blue-600">
                            {invoice.numeroOfficiel}
                          </span>
                          {getStatusBadge(invoice.status)}
                          {invoice.status === 'validee' && (
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                              🔒 Read-only
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          <div>
                            <span className="text-gray-500">Client:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {invoice.clientNom}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Montant:</span>
                            <span className="ml-2 font-bold text-green-600">
                              {formatCurrency(invoice.montantHT)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">BSD:</span>
                            <span className="ml-2 text-gray-700">{invoice.operationNumero}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Date:</span>
                            <span className="ml-2 text-gray-700">
                              {new Date(invoice.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                          {invoice.prestationLabel}
                        </div>

                        {hasPayments && (
                          <div className="flex items-center gap-2 text-xs">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-green-700">
                              {payments.length} paiement{payments.length > 1 ? 's' : ''} enregistré
                              {payments.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col gap-2">
                        {/* Validation (Super Admin only) */}
                        {invoice.status === 'a_valider' && isSuperAdmin && (
                          <button
                            onClick={() => handleValidate(invoice)}
                            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-green-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Valider
                          </button>
                        )}

                        {/* Send */}
                        {invoice.status === 'validee' && (
                          <button
                            onClick={() => handleSend(invoice)}
                            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-purple-700"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Marquer Envoyée
                          </button>
                        )}

                        {/* Add Payment */}
                        {(invoice.status === 'validee' || invoice.status === 'envoyee') && (
                          <button
                            onClick={() => handleOpenPaymentForm(invoice)}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            Enregistrer Paiement
                          </button>
                        )}

                        {/* View Details */}
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Détails
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* All Payments List */}
        <div>
          <h2 className="mb-4 text-xl font-bold text-gray-900">Tous les Paiements</h2>
          <PaymentList
            showActions={isSuperAdmin}
            currentUserRole={user?.role}
            currentUserName={user?.fullName}
          />
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && selectedInvoice && (
        <PaymentForm
          invoice={selectedInvoice}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedInvoice(null);
          }}
          onSuccess={() => {
            setShowPaymentForm(false);
            setSelectedInvoice(null);
            loadInvoices();
          }}
          currentUserName={user?.fullName || ''}
        />
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && !showPaymentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">
                Facture {selectedInvoice.numeroOfficiel}
              </h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-lg p-2 transition hover:bg-white/10"
              >
                <XCircle className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Status & Amount */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedInvoice.status)}
                <div className="text-right">
                  <div className="text-sm text-gray-500">Montant Total</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedInvoice.montantHT)}
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div className="border-t pt-4">
                <h4 className="mb-3 font-semibold text-gray-900">Informations Client</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Nom:</span> {selectedInvoice.clientNom}
                  </div>
                  <div>
                    <span className="text-gray-500">Adresse:</span>{' '}
                    {selectedInvoice.clientAdresse || '—'}
                  </div>
                  <div>
                    <span className="text-gray-500">Contact:</span>{' '}
                    {selectedInvoice.clientContact || '—'}
                  </div>
                </div>
              </div>

              {/* Prestation */}
              <div className="border-t pt-4">
                <h4 className="mb-3 font-semibold text-gray-900">Prestation</h4>
                <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
                  {selectedInvoice.prestationLabel}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Quantité:</span>
                    <div className="font-semibold">
                      {selectedInvoice.quantite} {selectedInvoice.unite}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Prix Unitaire:</span>
                    <div className="font-semibold">
                      {formatCleanAmount(selectedInvoice.prixUnitaire, 'FCFA')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Catégorie:</span>
                    <div className="font-semibold">{selectedInvoice.categorieDechet}</div>
                  </div>
                </div>
              </div>

              {/* Payments */}
              <div className="border-t pt-4">
                <h4 className="mb-3 font-semibold text-gray-900">Paiements Associés</h4>
                <PaymentList invoiceId={selectedInvoice.id} />
              </div>
            </div>

            <div className="flex justify-end border-t px-6 py-4">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-lg bg-gray-600 px-6 py-2 font-semibold text-white transition hover:bg-gray-700"
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

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════

interface StatCardProps {
  label: string;
  value: string;
  icon: React.FC<{ className?: string }>;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  subtitle?: string;
}

function StatCard({ label, value, icon: Icon, color, subtitle }: StatCardProps) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-6 text-white shadow-lg`}>
      <div className="mb-3 flex items-center justify-between">
        <Icon className="h-8 w-8 text-white/80" />
      </div>
      <div className="mb-1 text-2xl font-bold">{value}</div>
      <div className="text-sm text-white/80">{label}</div>
      {subtitle && <div className="mt-1 text-xs text-white/60">{subtitle}</div>}
    </div>
  );
}
