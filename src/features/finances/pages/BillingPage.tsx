import jsPDF from 'jspdf';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useContextSelector } from '../../../shared/contexts/ContextProvider';
import {
  FileText, Search, Eye, CheckCircle2, Send, DollarSign,
  BarChart3, Filter, Clock, XCircle, GitPullRequest, Download,
  ChevronRight, AlertTriangle,
} from 'lucide-react';
import {
  getWorkflowInvoices,
  updateInvoiceStatus,
  getInvoiceStats,
  markAllInvoiceNotifsRead,
  type WorkflowInvoice,
  type InvoiceStatus,
} from '../services/workflowInvoiceService';
import { useAuth } from '../../../shared/contexts/AuthContext';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  a_valider:  { label: 'À Valider',  color: 'bg-amber-100 text-amber-700 border-amber-300',   icon: Clock },
  validee:    { label: 'Validée',     color: 'bg-green-100 text-green-700 border-green-300',    icon: CheckCircle2 },
  envoyee:    { label: 'Envoyée',     color: 'bg-blue-100 text-blue-700 border-blue-300',       icon: Send },
  payee:      { label: 'Payée',       color: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: DollarSign },
  annulee:    { label: 'Annulée',     color: 'bg-gray-100 text-gray-500 border-gray-300',       icon: XCircle },
};

function formatMontant(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}

export default function BillingPage() {
  const { site: currentSite } = useContextSelector();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<WorkflowInvoice[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | InvoiceStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingInvoice, setViewingInvoice] = useState<WorkflowInvoice | null>(null);

  // Load invoices
  const reload = () => setInvoices(getWorkflowInvoices());

  useEffect(() => {
    reload();
    markAllInvoiceNotifsRead();
    const handler = () => reload();
    window.addEventListener('ivos_invoice_change', handler);
    return () => window.removeEventListener('ivos_invoice_change', handler);
  }, []);

  // Stats
  const stats = useMemo(() => getInvoiceStats(), [invoices]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = [...invoices];
    if (currentSite) list = list.filter(i => i.siteCode === currentSite.code);
    if (filterStatus !== 'all') list = list.filter(i => i.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i =>
        i.clientNom.toLowerCase().includes(q) ||
        i.numeroOfficiel.toLowerCase().includes(q) ||
        i.operationNumero.toLowerCase().includes(q) ||
        i.categorieDechet.toLowerCase().includes(q) ||
        i.prestationLabel.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [invoices, filterStatus, searchQuery, currentSite]);

  // Actions
  const handleStatusChange = (invoiceId: string, newStatus: InvoiceStatus) => {
    const result = updateInvoiceStatus(invoiceId, newStatus, user?.fullName);
    if (result) {
      reload();
      toast.success(`Facture ${result.numeroOfficiel} → ${STATUS_CONFIG[newStatus].label}`);
    }
  };

  const handleDownloadPDF = (inv: WorkflowInvoice) => {
    const doc = new jsPDF();
    const docLabel = inv.documentType === 'BSD' ? 'BSD' : 'DN';

    // Header
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('FACTURE', 20, 20);
    doc.setFontSize(11);
    doc.text(`Réf. : ${inv.id}`, 20, 30);
    doc.text(`Date : ${new Date(inv.createdAt).toLocaleDateString('fr-FR')}`, 120, 30);

    // Client
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.text('Client', 20, 55);
    doc.setFontSize(11);
    doc.text(inv.clientNom, 20, 63);
    if (inv.clientAdresse) doc.text(inv.clientAdresse, 20, 70);
    if (inv.clientContact) doc.text(`Contact : ${inv.clientContact}`, 20, 77);

    // Prestation
    doc.setFontSize(13);
    doc.text('Prestation', 20, 95);
    doc.setFontSize(11);
    doc.text(inv.prestationLabel, 20, 103);
    doc.text(`Catégorie : ${inv.categorieDechet}`, 20, 111);
    doc.text(`Quantité : ${inv.quantite} ${inv.unite}`, 20, 119);
    doc.text(`Prix unitaire : ${formatMontant(inv.prixUnitaire)} / ${inv.unite}`, 20, 127);

    // Total
    doc.setFillColor(245, 245, 245);
    doc.rect(15, 140, 180, 20, 'F');
    doc.setFontSize(15);
    doc.setTextColor(0, 51, 102);
    doc.text(`MONTANT HT : ${formatMontant(inv.montantHT)}`, 20, 153);

    // Lien opération
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text(`${docLabel} associé : N°${inv.numeroOfficiel} — Operation ${inv.operationNumero}`, 20, 175);
    doc.text(`Statut : ${STATUS_CONFIG[inv.status].label}`, 20, 182);

    doc.save(`Facture_${inv.clientNom.replace(/\s+/g, '_')}_${inv.numeroOfficiel}.pdf`);
    toast.success('PDF facture téléchargé');
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Facturation</h1>
              <p className="text-blue-200 text-sm mt-0.5">Factures générées automatiquement depuis le Workflow Operations</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#003366] to-blue-700 rounded-l-2xl" />
          <div className="flex items-center gap-3 pl-3">
            <div className="p-2 bg-blue-50 rounded-lg"><BarChart3 className="h-5 w-5 text-[#003366]" /></div>
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 to-amber-600 rounded-l-2xl" />
          <div className="flex items-center gap-3 pl-3">
            <div className="p-2 bg-amber-50 rounded-lg"><Clock className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-gray-500">À Valider</p>
              <p className="text-xl font-bold text-amber-700">{stats.aValider}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-500 to-green-600 rounded-l-2xl" />
          <div className="flex items-center gap-3 pl-3">
            <div className="p-2 bg-green-50 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Validées</p>
              <p className="text-xl font-bold text-green-700">{stats.validees}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-l-2xl" />
          <div className="flex items-center gap-3 pl-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><DollarSign className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Payées</p>
              <p className="text-xl font-bold text-emerald-700">{stats.payees}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#003366] to-blue-600 rounded-l-2xl" />
          <div className="flex items-center gap-3 pl-3">
            <div className="p-2 bg-blue-50 rounded-lg"><DollarSign className="h-5 w-5 text-[#003366]" /></div>
            <div>
              <p className="text-xs text-gray-500">Montant Total</p>
              <p className="text-lg font-bold text-[#003366]">{formatMontant(stats.montantTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par client, n° BSD/DN, catégorie..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-gray-400" />
            {([
              { key: 'all' as const, label: 'Toutes', color: 'bg-blue-100 text-blue-700' },
              { key: 'a_valider' as const, label: 'À Valider', color: 'bg-amber-100 text-amber-700' },
              { key: 'validee' as const, label: 'Validées', color: 'bg-green-100 text-green-700' },
              { key: 'envoyee' as const, label: 'Envoyées', color: 'bg-blue-100 text-blue-700' },
              { key: 'payee' as const, label: 'Payées', color: 'bg-emerald-100 text-emerald-700' },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === f.key ? f.color : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a1a2e]">
                <th className="text-left px-4 py-3 font-bold text-white text-xs uppercase">Date</th>
                <th className="text-left px-4 py-3 font-bold text-white text-xs uppercase">Client</th>
                <th className="text-left px-4 py-3 font-bold text-white text-xs uppercase">Prestation</th>
                <th className="text-left px-4 py-3 font-bold text-white text-xs uppercase">N° Document</th>
                <th className="text-right px-4 py-3 font-bold text-white text-xs uppercase">Quantité</th>
                <th className="text-right px-4 py-3 font-bold text-white text-xs uppercase">Montant HT</th>
                <th className="text-center px-4 py-3 font-bold text-white text-xs uppercase">Statut</th>
                <th className="text-right px-4 py-3 font-bold text-white text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Aucune facture</p>
                    <p className="text-xs mt-1">Les factures seront créées automatiquement à la clôture des opérations</p>
                  </td>
                </tr>
              ) : (
                filtered.map(inv => {
                  const sc = STATUS_CONFIG[inv.status];
                  const StatusIcon = sc.icon;
                  return (
                    <tr key={inv.id} className={`transition-colors ${inv.status === 'a_valider' ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-gray-50/50'}`}>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          {new Date(inv.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-gray-800">{inv.clientNom}</p>
                          {inv.clientContact && <p className="text-xs text-gray-400">{inv.clientContact}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-gray-700">{inv.categorieDechet}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{inv.prestationLabel}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-[#003366]">{inv.numeroOfficiel}</span>
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          inv.documentType === 'BSD' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>{inv.documentType === 'BSD' ? 'BSD' : 'DN'}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700">
                        {inv.quantite} {inv.unite}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-[#003366]">{formatMontant(inv.montantHT)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingInvoice(inv)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Détails"
                          >
                            <Eye className="h-4 w-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(inv)}
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Télécharger PDF"
                          >
                            <Download className="h-4 w-4 text-blue-500" />
                          </button>
                          <button
                            onClick={() => { window.location.href = '/exploitation'; }}
                            className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Voir Operation liée"
                          >
                            <GitPullRequest className="h-4 w-4 text-indigo-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {viewingInvoice && (() => {
        const inv = viewingInvoice;
        const sc = STATUS_CONFIG[inv.status];
        const StatusIcon = sc.icon;
        const docLabel = inv.documentType === 'BSD' ? 'BSD' : 'DN';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 p-5 rounded-t-2xl bg-gradient-to-r from-[#003366] to-blue-800 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Facture — {inv.clientNom}
                </h2>
                <button onClick={() => setViewingInvoice(null)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                  <XCircle className="h-5 w-5 text-white" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Status badge */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${sc.color}`}>
                    <StatusIcon className="h-4 w-4" /> {sc.label}
                  </span>
                  <span className="text-xs text-gray-400">Créée le {new Date(inv.createdAt).toLocaleString('fr-FR')}</span>
                </div>

                {/* Client info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Client</p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">{inv.clientNom}</p>
                    {inv.clientAdresse && <p className="text-xs text-gray-500 mt-0.5">{inv.clientAdresse}</p>}
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Contact</p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">{inv.clientContact || '—'}</p>
                  </div>
                </div>

                {/* Operation link */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-blue-800 uppercase mb-2 flex items-center gap-1.5">
                    <GitPullRequest className="h-3.5 w-3.5" /> Document Lié
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-blue-600">N° :</span>{' '}
                      <span className="font-bold font-mono">{inv.numeroOfficiel}</span>
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        inv.documentType === 'BSD' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>{docLabel}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">Operation :</span>{' '}
                      <span className="font-bold font-mono">{inv.operationNumero}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setViewingInvoice(null); window.location.href = inv.documentType === 'BSD' ? '/waste-forms' : '/exploitation/delivery-notes'; }}
                    className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" /> Consulter le {docLabel} N°{inv.numeroOfficiel}
                  </button>
                </div>

                {/* Prestation */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-amber-800 uppercase mb-2">Détail Prestation</h3>
                  <p className="text-sm font-semibold text-gray-800">{inv.prestationLabel}</p>
                  <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                    <div>
                      <p className="text-[10px] uppercase text-gray-400 font-semibold">Catégorie</p>
                      <p className="font-bold text-gray-800">{inv.categorieDechet}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-400 font-semibold">Quantité</p>
                      <p className="font-bold text-gray-800">{inv.quantite} {inv.unite}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-400 font-semibold">Prix Unitaire</p>
                      <p className="font-bold text-gray-800">{formatMontant(inv.prixUnitaire)} / {inv.unite}</p>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-[#003366] rounded-xl p-4 text-white text-center">
                  <p className="text-xs uppercase tracking-wider text-blue-200 font-semibold">Montant Total HT</p>
                  <p className="text-3xl font-extrabold mt-1">{formatMontant(inv.montantHT)}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {inv.status === 'a_valider' && (
                    <button
                      onClick={() => { handleStatusChange(inv.id, 'validee'); setViewingInvoice({ ...inv, status: 'validee' }); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-all"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Valider la facture
                    </button>
                  )}
                  {inv.status === 'validee' && (
                    <button
                      onClick={() => { handleStatusChange(inv.id, 'envoyee'); setViewingInvoice({ ...inv, status: 'envoyee' }); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all"
                    >
                      <Send className="h-4 w-4" /> Marquer comme envoyée
                    </button>
                  )}
                  {inv.status === 'envoyee' && (
                    <button
                      onClick={() => { handleStatusChange(inv.id, 'payee'); setViewingInvoice({ ...inv, status: 'payee' }); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all"
                    >
                      <DollarSign className="h-4 w-4" /> Marquer comme payée
                    </button>
                  )}
                  {(inv.status === 'a_valider' || inv.status === 'validee') && (
                    <button
                      onClick={() => { handleStatusChange(inv.id, 'annulee'); setViewingInvoice({ ...inv, status: 'annulee' }); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-sm font-medium transition-all"
                    >
                      <XCircle className="h-4 w-4" /> Annuler
                    </button>
                  )}
                  <button
                    onClick={() => handleDownloadPDF(inv)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#003366] hover:bg-blue-900 text-white rounded-xl text-sm font-bold transition-all ml-auto"
                  >
                    <Download className="h-4 w-4" /> Télécharger PDF
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setViewingInvoice(null)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-all"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
