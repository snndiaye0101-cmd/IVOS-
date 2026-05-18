/**
 * Page de Gestion des Factures avec intégration BSD
 * Route: /billing
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText, Search, Filter, Download, Trash2, 
  CheckCircle, Clock, XCircle, Plus, Calendar,
  ExternalLink, AlertCircle, CreditCard, FileCheck, Tag, Paperclip, File, Eye
} from 'lucide-react';
import { formatCleanAmount } from '@/shared/utils/formatAmount';
import {
  searchInvoices,
  getInvoiceStats,
  generateInvoicePDF,
  markInvoiceAsPaid,
  deleteInvoice,
  createInvoice,
} from '../services/invoiceService';
import type {
  Invoice,
  InvoiceFilters,
  PaymentStatus,
  PaymentMethod,
  NewInvoiceData,
  InvoiceSource,
  PaymentDetails,
} from '../types/invoice.types';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { clientsStore } from '../../clients/services/clientsStore';
import CreateInvoiceModal from '../components/CreateInvoiceModal';
import { loadBaseConfig } from '../../settings/services/baseConfigStore';

export default function InvoicesPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const operationIdFilter = searchParams.get('operationId') ?? undefined;
  const invoiceIdFilter = searchParams.get('invoiceId') ?? undefined;
  
  // États
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<InvoiceSource | ''>('');
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('Virement');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({});
  const [paymentAttachment, setPaymentAttachment] = useState<Invoice['paymentAttachment']>();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const paymentFileInputRef = useRef<HTMLInputElement>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  
  // Données
  const stats = getInvoiceStats();
  const clients = clientsStore.load().filter(c => !c.archived);
  const baseConfig = loadBaseConfig();
  
  // Vérifier si l'utilisateur est Super Admin
  const isSuperAdmin = user?.role === 'Super Admin' || isAdmin;
  
  // Factures filtrées
  const filteredInvoices = useMemo(() => {
    const results = searchInvoices({
      ...filters,
      search: searchQuery,
      sourceModule: sourceFilter || undefined,
    });
    if (!operationIdFilter) return results;
    return results.filter(inv => inv.operationId === operationIdFilter);
  }, [searchQuery, filters, operationIdFilter, sourceFilter]);
  
  useEffect(() => {
    if (!invoiceIdFilter) return;
    const invoice = filteredInvoices.find((item) => item.id === invoiceIdFilter);
    if (invoice) setPreviewInvoice(invoice);
  }, [filteredInvoices, invoiceIdFilter]);

  // Handlers
  const handleDownloadPDF = (invoice: Invoice) => {
    generateInvoicePDF(invoice.id);
  };
  
  const handleMarkAsPaid = (invoice: Invoice) => {
    if (!user) return;

    setPaymentInvoice(invoice);
    setPaymentMode(invoice.modeReglement ?? 'Virement');
    setPaymentDetails(invoice.paymentDetails ?? {});
    setPaymentAttachment(invoice.paymentAttachment);
    const solde = invoice.soldeRestant ?? (invoice.montantTTC - (invoice.montantEncaisse ?? 0));
    setPaymentAmount(Math.max(0, Math.round(solde)).toString());
    setPaymentError('');
  };

  const closePaymentModal = () => {
    setPaymentInvoice(null);
    setPaymentError('');
  };

  const handlePaymentDetailChange = (key: keyof PaymentDetails, value: string) => {
    setPaymentDetails(prev => ({ ...prev, [key]: value }));
    if (paymentError) setPaymentError('');
  };

  const handleAttachmentUpload = (file: FileList | null) => {
    const selected = file?.[0];
    if (!selected) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentAttachment({
        fileName: selected.name,
        mimeType: selected.type || 'application/octet-stream',
        fileDataUrl: reader.result as string,
        uploadedAt: new Date().toISOString(),
      });
    };
    reader.readAsDataURL(selected);
  };

  const validatePaymentForm = (): boolean => {
    const amountNumeric = Number(paymentAmount.replace(/\s/g, '').replace(',', '.'));
    const remaining = paymentInvoice ? (paymentInvoice.soldeRestant ?? (paymentInvoice.montantTTC - (paymentInvoice.montantEncaisse ?? 0))) : 0;
    if (!Number.isFinite(amountNumeric) || amountNumeric <= 0) {
      setPaymentError('Veuillez saisir un montant de règlement valide.');
      return false;
    }
    if (amountNumeric > remaining) {
      setPaymentError('Le montant saisi dépasse le solde restant de la facture.');
      return false;
    }

    if (paymentMode === 'Virement') {
      if (!paymentDetails.banque?.trim() || !paymentDetails.transactionDate || !paymentDetails.transactionId?.trim()) {
        setPaymentError('Veuillez renseigner Banque, Date et ID Transaction pour un virement.');
        return false;
      }
    }
    if (paymentMode === 'Espèces') {
      if (!paymentDetails.signedByOrReceiptRef?.trim()) {
        setPaymentError('Veuillez renseigner le signataire ou la référence du reçu.');
        return false;
      }
    }
    if (paymentMode === 'Chèque') {
      if (!paymentDetails.chequeNumber?.trim() || !paymentDetails.issuingBank?.trim()) {
        setPaymentError('Veuillez renseigner le numéro de chèque et la banque émettrice.');
        return false;
      }
    }
    setPaymentError('');
    return true;
  };

  const submitPayment = () => {
    if (!user || !paymentInvoice) return;
    if (!validatePaymentForm()) return;

    const amountNumeric = Number(paymentAmount.replace(/\s/g, '').replace(',', '.'));

    markInvoiceAsPaid(
      paymentInvoice.id,
      paymentMode,
      user.id,
      paymentDetails,
      paymentAttachment,
      amountNumeric,
    );
    closePaymentModal();
    window.location.reload();
  };
  
  const handleDelete = (invoice: Invoice) => {
    if (confirm(`Confirmer la suppression de la facture ${invoice.numeroFacture} ?`)) {
      deleteInvoice(invoice.id);
      window.location.reload();
    }
  };
  
  const handleOpenBSD = (invoice: Invoice) => {
    if (!invoice.operationId) return;
    navigate(`/exploitation?bsd=${encodeURIComponent(invoice.operationId)}`);
  };
  
  // Handler création facture libre
  const handleCreateInvoice = (data: NewInvoiceData) => {
    if (!user) return;
    
    createInvoice(data, user.id);
    setShowCreateModal(false);
    window.location.reload(); // Refresh simple
  };
  
  // Formatage
  const formatCurrency = (amount: number) => {
    return formatCleanAmount(Math.round(amount), 'FCFA');
  };
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };
  
  const getStatusBadge = (status: PaymentStatus) => {
    const config = {
      'Payé': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'Non payé': { color: 'bg-red-100 text-red-800', icon: XCircle },
      'En attente': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'Partiellement payé': { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
    };
    const { color, icon: Icon } = config[status] || config['En attente'];
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        {status}
      </span>
    );
  };

  const getSourceBadge = (invoice: Invoice) => {
    const src = invoice.sourceModule ?? (invoice.bsdReference ? 'BSD' : invoice.specialOperationId ? 'operation_speciale' : 'libre');
    if (src === 'BSD') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <Tag className="w-3 h-3" /> BSD
        </span>
      );
    }
    if (src === 'operation_speciale') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <Tag className="w-3 h-3" /> Op. Spéciale
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
        <Tag className="w-3 h-3" /> Libre
      </span>
    );
  };

  const getInvoiceReference = (invoice: Invoice) => {
    if (invoice.bsdReference) return `BSD : ${invoice.bsdReference}`;
    if (invoice.specialOperationId) return `Opération Spéciale : ${invoice.specialOperationId}`;
    return 'Facture libre';
  };
  
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-6">
        {/* En-tête */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="w-full px-3 sm:px-4 lg:px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <FileText className="w-8 h-8 text-indigo-600" />
                  Gestion des Factures
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Suivi complet des factures avec références BSD
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {isSuperAdmin && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 transition-colors shadow-md"
                    title="Créer une facture libre (sans BSD)"
                  >
                    <FileCheck className="w-5 h-5" />
                    Créer Facture Libre
                  </button>
                )}
                
                <button
                  onClick={() => alert('Formulaire de création de facture automatique à partir d\'un BSD')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  Depuis un BSD
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Statistiques */}
        <div className="w-full px-3 sm:px-4 lg:px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Factures */}
            <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Factures</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalFactures}</p>
                  <p className="text-xs text-gray-600 mt-1">{formatCurrency(stats.totalMontantTTC)}</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>
            
            {/* Payées */}
            <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payées</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.nombrePayees}</p>
                  <p className="text-xs text-gray-600 mt-1">{formatCurrency(stats.montantPayes)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            {/* En Attente */}
            <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">En Attente</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.nombreEnAttente}</p>
                  <p className="text-xs text-gray-600 mt-1">{formatCurrency(stats.montantEnAttente)}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
            
            {/* Non Payées */}
            <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Non Payées</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{stats.nombreNonPayees}</p>
                  <p className="text-xs text-gray-600 mt-1">{formatCurrency(stats.montantNonPayes)}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Barre de recherche et filtres */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-100">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Recherche */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par N° facture, N° BSD ou client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              
              {/* Bouton filtres */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
                  showFilters 
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-5 h-5" />
                Filtres
              </button>
            </div>
            
            {/* Filtres avancés */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
                {/* Filtre source */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Source</label>
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value as InvoiceSource | '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Toutes les sources</option>
                    <option value="BSD">BSD</option>
                    <option value="operation_speciale">Opération Spéciale</option>
                    <option value="libre">Facture Libre</option>
                  </select>
                </div>

                {/* Filtre statut */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Statut de Paiement</label>
                  <select
                    value={filters.statutPaiement || ''}
                    onChange={(e) => setFilters({ ...filters, statutPaiement: e.target.value as PaymentStatus || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Tous</option>
                    <option value="Payé">Payé</option>
                    <option value="Non payé">Non payé</option>
                    <option value="En attente">En attente</option>
                    <option value="Partiellement payé">Partiellement payé</option>
                  </select>
                </div>
                
                {/* Filtre mode de règlement */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mode de Règlement</label>
                  <select
                    value={filters.modeReglement || ''}
                    onChange={(e) => setFilters({ ...filters, modeReglement: e.target.value as PaymentMethod || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Tous</option>
                    <option value="Virement">Virement</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Espèces">Espèces</option>
                    <option value="Carte">Carte</option>
                    <option value="Prélèvement">Prélèvement</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                
                {/* Réinitialiser */}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilters({});
                      setSearchQuery('');
                      setSourceFilter('');
                    }}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Bandeau filtre BSD actif */}
          {operationIdFilter && (
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl mb-4">
              <span className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Filtré par opération BSD — {filteredInvoices.length} facture(s) liée(s)
              </span>
              <button
                onClick={() => navigate('/billing')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
              >
                Voir toutes les factures
              </button>
            </div>
          )}

          {/* Tableau des factures */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed min-w-[1200px] xl:min-w-0">
                <colgroup>
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                  <col className="w-[11%]" />
                  <col className="w-[9%]" />
                  <col className="w-[16%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">N° Facture</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Source</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Référence</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Client</th>
                    <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider">Montant HT</th>
                    <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider">Montant TTC</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Mode Règlement</th>
                    <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm font-medium">Aucune facture trouvée</p>
                        <p className="text-xs text-gray-400 mt-1">Essayez de modifier vos critères de recherche</p>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((invoice, index) => (
                      <tr 
                        key={invoice.id}
                        className={`hover:bg-indigo-50/30 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        {/* N° Facture */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            <span className="font-semibold text-gray-900 text-sm">{invoice.numeroFacture}</span>
                          </div>
                        </td>

                        {/* Badge Source */}
                        <td className="px-4 py-3.5">
                          {getSourceBadge(invoice)}
                        </td>
                        
                        {/* Référence (BSD ou Op. Spéciale ou Libre) */}
                        <td className="px-4 py-3.5">
                          {invoice.bsdReference ? (
                            <button
                              onClick={() => handleOpenBSD(invoice)}
                              disabled={!invoice.operationId}
                              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-default"
                            >
                              {invoice.bsdReference}
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          ) : invoice.specialOperationId ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium border border-purple-100">
                              {invoice.notes?.match(/OP-\d{4}-\d{3}/)?.[0] ?? invoice.specialOperationId}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                              <FileCheck className="w-3 h-3" />
                              Facture Libre
                            </span>
                          )}
                        </td>
                        
                        {/* Date */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {formatDate(invoice.date)}
                          </div>
                        </td>
                        
                        {/* Client */}
                        <td className="px-4 py-3.5">
                          <div className="text-sm font-medium text-gray-900">{invoice.clientNom}</div>
                          {invoice.clientSiret && (
                            <div className="text-xs text-gray-500 mt-0.5">SIRET: {invoice.clientSiret}</div>
                          )}
                        </td>
                        
                        {/* Montant HT */}
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-sm font-semibold text-gray-700">
                            {formatCurrency(invoice.montantHT)}
                          </span>
                        </td>
                        
                        {/* Montant TTC */}
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(invoice.montantTTC)}
                          </span>
                        </td>
                        
                        {/* Statut */}
                        <td className="px-4 py-3.5">
                          {getStatusBadge(invoice.statutPaiement)}
                        </td>
                        
                        {/* Mode de règlement */}
                        <td className="px-4 py-3.5">
                          {invoice.modeReglement ? (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                              {invoice.modeReglement}
                              {invoice.paymentAttachment && (
                                <button
                                  onClick={() => window.open(invoice.paymentAttachment?.fileDataUrl, '_blank')}
                                  title={invoice.paymentAttachment.fileName}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs"
                                >
                                  <File className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">-</span>
                          )}
                        </td>
                        
                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-2">
                            {/* Télécharger PDF */}
                            <button
                              onClick={() => handleDownloadPDF(invoice)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Télécharger PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Prévisualiser */}
                            <button
                              onClick={() => setPreviewInvoice(invoice)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Prévisualiser"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            {/* Marquer comme payé */}
                            {invoice.statutPaiement !== 'Payé' && (
                              <button
                                onClick={() => handleMarkAsPaid(invoice)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Marquer comme payé"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            
                            {/* Supprimer */}
                            <button
                              onClick={() => handleDelete(invoice)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      {/* Barre de synthèse fixée en bas */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-blue-600 shadow-2xl border-t border-indigo-700 z-40">
        <div className="w-full px-3 sm:px-4 lg:px-6 py-3">
          <div className="grid grid-cols-3 gap-8">
            {/* Total */}
            <div className="text-center">
              <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide mb-1">Total TTC</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalMontantTTC)}</p>
      
      {/* Modal de création de facture libre */}
      <CreateInvoiceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateInvoice}
        clients={clients.map(c => ({
          id: c.id.toString(),
          name: c.name,
          siret: c.ninea,
          address: c.address,
        }))}
      />
            </div>
            
            {/* À Valider */}
            <div className="text-center border-x border-indigo-500/30">
              <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide mb-1">En Attente</p>
              <p className="text-2xl font-bold text-yellow-300">{formatCurrency(stats.montantEnAttente)}</p>
            </div>
            
            {/* Payées */}
            <div className="text-center">
              <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide mb-1">Payées</p>
              <p className="text-2xl font-bold text-green-300">{formatCurrency(stats.montantPayes)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal détails de paiement */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
              <h3 className="text-lg font-bold">Règlement de la facture {paymentInvoice.numeroFacture}</h3>
              <p className="text-xs text-indigo-100 mt-1">Client: {paymentInvoice.clientNom}</p>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Montant du règlement (FCFA)</label>
                  <input
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    inputMode="numeric"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Solde restant: {formatCurrency(paymentInvoice.soldeRestant ?? (paymentInvoice.montantTTC - (paymentInvoice.montantEncaisse ?? 0)))}
                  </p>
                </div>
                <div>

                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mode de Règlement (optionnel)</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Virement">Virement</option>
                    <option value="Espèces">Espèces</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Carte">Carte</option>
                    <option value="Prélèvement">Prélèvement</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Justificatif</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => paymentFileInputRef.current?.click()}
                      type="button"
                      className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Paperclip className="w-4 h-4" /> Upload
                    </button>
                    {paymentAttachment && (
                      <button
                        onClick={() => window.open(paymentAttachment.fileDataUrl, '_blank')}
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                        title={paymentAttachment.fileName}
                      >
                        <File className="w-4 h-4" /> Voir
                      </button>
                    )}
                  </div>
                  <input
                    ref={paymentFileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleAttachmentUpload(e.target.files)}
                  />
                  {paymentAttachment && (
                    <p className="text-xs text-gray-500 mt-1">{paymentAttachment.fileName}</p>
                  )}
                </div>
              </div>

              {paymentMode === 'Virement' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Banque</label>
                    <input
                      value={paymentDetails.banque ?? ''}
                      onChange={(e) => handlePaymentDetailChange('banque', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date Transaction</label>
                    <input
                      type="date"
                      value={paymentDetails.transactionDate ?? ''}
                      onChange={(e) => handlePaymentDetailChange('transactionDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">ID Transaction</label>
                    <input
                      value={paymentDetails.transactionId ?? ''}
                      onChange={(e) => handlePaymentDetailChange('transactionId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {paymentMode === 'Espèces' && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Signataire décharge / Référence reçu
                  </label>
                  <input
                    value={paymentDetails.signedByOrReceiptRef ?? ''}
                    onChange={(e) => handlePaymentDetailChange('signedByOrReceiptRef', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              {paymentMode === 'Chèque' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Numéro de chèque</label>
                    <input
                      value={paymentDetails.chequeNumber ?? ''}
                      onChange={(e) => handlePaymentDetailChange('chequeNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Banque émettrice</label>
                    <input
                      value={paymentDetails.issuingBank ?? ''}
                      onChange={(e) => handlePaymentDetailChange('issuingBank', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {(paymentMode === 'Carte' || paymentMode === 'Prélèvement' || paymentMode === 'Autre') && (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Référence complémentaire (optionnel)</label>
                  <input
                    value={paymentDetails.referenceLibre ?? ''}
                    onChange={(e) => handlePaymentDetailChange('referenceLibre', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              {paymentError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {paymentError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={submitPayment}
                  className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-semibold"
                >
                  Enregistrer le règlement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal prévisualisation facture */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto" onClick={() => setPreviewInvoice(null)}>
          <div className="w-full max-w-6xl mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden" style={{ fontFamily: 'Inter, Roboto, Montserrat, Arial, sans-serif' }}>
              <style>{`@page { size: A4; margin: 10mm 15mm 15mm 15mm; } body { margin-bottom: 10mm; }`}</style>
              <div style={{ position: 'absolute', top: '-10mm', left: '-15mm', right: '-15mm', height: '19px', backgroundColor: '#1a365d', textAlign: 'center', lineHeight: '19px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', zIndex: 9999 }}>
                <span style={{ color: '#ffffff', fontSize: '7.5pt', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', letterSpacing: '1px' }}>
                  IVOS LOGISTIQUE — FACTURE CERTIFIÉE
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm sm:text-base font-bold text-gray-800">Aperçu Facture — {previewInvoice.numeroFacture}</h3>
                <button onClick={() => setPreviewInvoice(null)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100">
                  Fermer
                </button>
              </div>

              <div className="p-4 sm:p-8">
                {/* Header logo + identité */}
                <div style={{ width: '100%', marginTop: '15px', marginBottom: '25px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ verticalAlign: 'top' }}>
                          <h1 style={{ fontSize: '26pt', fontWeight: 800, color: '#1a365d', margin: 0, lineHeight: 1.1 }}>
                            IVOS
                          </h1>
                          <p style={{ fontSize: '8.5pt', textTransform: 'uppercase', letterSpacing: '2px', color: '#4a5568', margin: '2px 0 0 0', fontWeight: 600 }}>
                            LOGISTIQUE & TRANSPORT INDUSTRIALISÉ
                          </p>
                        </td>
                        <td style={{ fontSize: '9pt', color: '#718096', lineHeight: 1.4, textAlign: 'right', verticalAlign: 'top' }}>
                          <strong>IVOS S.A.R.L.</strong><br />
                          Immeuble Horizon, Les Mamelles, Dakar
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-2xl font-black text-[#1a1a2e]">FACTURE</p>
                  <p className="text-sm font-semibold text-gray-700">N° {previewInvoice.numeroFacture}</p>
                  <p className="text-xs text-gray-500 mt-1">Date: {formatDate(previewInvoice.date)}</p>
                  <p className="text-xs text-gray-500">Échéance: {formatDate(previewInvoice.dateEcheance)}</p>
                </div>

                {/* Référence et client */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-5">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                    <p className="text-xs font-bold uppercase text-gray-500 mb-1">Référence</p>
                    <p className="text-sm font-semibold text-gray-800">{getInvoiceReference(previewInvoice)}</p>
                    <div className="mt-2">{getSourceBadge(previewInvoice)}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                    <p className="text-xs font-bold uppercase text-gray-500 mb-1">Client</p>
                    <p className="text-sm font-semibold text-gray-800">{previewInvoice.clientNom}</p>
                    {previewInvoice.clientAdresse && <p className="text-xs text-gray-600 mt-1">{previewInvoice.clientAdresse}</p>}
                    {previewInvoice.clientSiret && <p className="text-xs text-gray-500 mt-1">SIRET: {previewInvoice.clientSiret}</p>}
                  </div>
                </div>

                {/* Tableau lignes */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full table-fixed text-sm">
                    <colgroup>
                      <col className="w-[50%]" />
                      <col className="w-[10%]" />
                      <col className="w-[10%]" />
                      <col className="w-[15%]" />
                      <col className="w-[15%]" />
                    </colgroup>
                    <thead className="bg-blue-50/80 text-gray-700 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Désignation</th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide">Quantité</th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide">Unité</th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide">Prix Unitaire</th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide">Total HT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {previewInvoice.lignes.map((ligne) => (
                        <tr key={ligne.id}>
                          <td className="px-4 py-4 text-gray-800 break-words whitespace-normal">{ligne.description}</td>
                          <td className="px-4 py-4 text-right text-gray-700">{ligne.quantite}</td>
                          <td className="px-4 py-4 text-right text-gray-700">{ligne.unite}</td>
                          <td className="px-4 py-4 text-right text-gray-700">{formatCurrency(ligne.prixUnitaireHT)}</td>
                          <td className="px-4 py-4 text-right font-semibold text-gray-900">{formatCurrency(ligne.totalHT)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bas document: règlement + totaux séparés */}
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase text-gray-500 mb-2">Règlement</p>
                    <p className="text-sm text-gray-700">Statut: <span className="font-semibold">{previewInvoice.statutPaiement}</span></p>
                    <p className="text-sm text-gray-700 mt-1">Mode: <span className="font-semibold">{previewInvoice.modeReglement ?? 'Non défini'}</span></p>
                    {previewInvoice.modeReglement === 'Virement' && previewInvoice.paymentDetails && (
                      <p className="text-xs text-gray-600 mt-2">{previewInvoice.paymentDetails.banque ?? '—'} • {previewInvoice.paymentDetails.transactionId ?? '—'}</p>
                    )}
                    {previewInvoice.modeReglement === 'Chèque' && previewInvoice.paymentDetails && (
                      <p className="text-xs text-gray-600 mt-2">Chèque {previewInvoice.paymentDetails.chequeNumber ?? '—'} • {previewInvoice.paymentDetails.issuingBank ?? '—'}</p>
                    )}
                    {previewInvoice.modeReglement === 'Espèces' && previewInvoice.paymentDetails?.signedByOrReceiptRef && (
                      <p className="text-xs text-gray-600 mt-2">Décharge: {previewInvoice.paymentDetails.signedByOrReceiptRef}</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-[1fr_auto] gap-10 items-center">
                        <span className="text-gray-500">Total HT</span>
                        <span className="font-semibold text-gray-800 text-right">{formatCurrency(previewInvoice.montantHT)}</span>
                      </div>
                      <div className="grid grid-cols-[1fr_auto] gap-10 items-center">
                        <span className="text-gray-500">TVA ({previewInvoice.tauxTVA}%)</span>
                        <span className="text-gray-700 text-right">{formatCurrency(previewInvoice.montantTVA)}</span>
                      </div>
                      <div className="h-px bg-gray-200" />
                      <div className="grid grid-cols-[1fr_auto] gap-10 items-center text-base bg-blue-50 px-3 py-2 rounded-lg">
                        <span className="font-bold text-[#1a1a2e]">TOTAL TTC</span>
                        <span className="font-black text-[#1a1a2e] text-right">{formatCurrency(previewInvoice.montantTTC)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer contact + légal */}
                <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center space-y-1">
                  <p>Téléphone: {baseConfig.phone} • Email: {baseConfig.email}</p>
                  <p>{baseConfig.address} • Document généré automatiquement</p>
                </div>
              </div>
            </div>
            <div
              className="invoice-footer-bande-bleue"
              style={{
                position: 'fixed',
                bottom: '-15mm',
                left: '-15mm',
                right: '-15mm',
                height: '19px',
                backgroundColor: '#1a365d',
                color: '#ffffff',
                paddingTop: '4px',
                paddingBottom: '14px',
                paddingLeft: '20px',
                paddingRight: '20px',
                textAlign: 'center',
                fontSize: '7.5pt',
                lineHeight: 1.4,
                fontFamily: 'Arial, sans-serif',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
                zIndex: 9999,
              }}
            >
              IVOS SARL — Capital Social: 10 000 000 FCFA — NINEA: 008765432 2G3 — RC: SN.DKR.2017.B.1234<br />
              Immeuble Horizon, Les Mamelles, Dakar, Sénégal — Contact: contact@ivos.sn
            </div>
          </div>
        </div>
      )}
    </>
  );
}
