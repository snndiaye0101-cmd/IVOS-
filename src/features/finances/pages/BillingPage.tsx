import jsPDF from 'jspdf';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useContextSelector } from '../../../shared/contexts/ContextProvider';
import {
  FileText,
  Search,
  Eye,
  CheckCircle2,
  Send,
  DollarSign,
  BarChart3,
  Filter,
  Clock,
  XCircle,
  GitPullRequest,
  Download,
  ChevronRight,
  AlertTriangle,
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
import { formatMonetaryValue } from '@/shared/utils/formatAmount';

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  a_valider: {
    label: 'À Valider',
    color: 'bg-amber-100 text-amber-700 border-amber-300',
    icon: Clock,
  },
  validee: {
    label: 'Validée',
    color: 'bg-green-100 text-green-700 border-green-300',
    icon: CheckCircle2,
  },
  envoyee: { label: 'Envoyée', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: Send },
  payee: {
    label: 'Payée',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    icon: DollarSign,
  },
  annulee: { label: 'Annulée', color: 'bg-gray-100 text-gray-500 border-gray-300', icon: XCircle },
};

function formatMontant(n: number) {
  return formatMonetaryValue(n, 'FCFA');
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
    if (currentSite) list = list.filter((i) => i.siteCode === currentSite.code);
    if (filterStatus !== 'all') list = list.filter((i) => i.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
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
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    const primary = [26, 54, 93];
    const slate = [113, 128, 150];
    const lightFill = [247, 250, 252];
    const docLabel = inv.documentType === 'BSD' ? 'BSD' : 'DN';

    // Header
    (doc as any).setFillColor(...(primary as any[]));
    doc.rect(0, 0, pageWidth, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('FACTURE', 16, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Réf. : ${inv.id}`, 16, 26);
    doc.text(`Date : ${new Date(inv.createdAt).toLocaleDateString('fr-FR')}`, pageWidth - 16, 26, {
      align: 'right',
    });

    const sectionY = 42;
    doc.setFontSize(9);
    (doc as any).setFillColor(...(lightFill as any[]));
    doc.roundedRect(16, sectionY, pageWidth - 32, 40, 2, 2, 'F');
    (doc as any).setDrawColor(...(primary as any[]));
    doc.setLineWidth(0.7);
    doc.line(22, sectionY, 22, sectionY + 40);

    doc.setFont('helvetica', 'bold');
    (doc as any).setTextColor(...(primary as any[]));
    doc.text('Client', 20, sectionY + 10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(inv.clientNom, 20, sectionY + 16);
    if (inv.clientAdresse) doc.text(inv.clientAdresse, 20, sectionY + 22);
    if (inv.clientContact) doc.text(`Contact : ${inv.clientContact}`, 20, sectionY + 28);

    doc.setFont('helvetica', 'bold');
    (doc as any).setTextColor(...(primary as any[]));
    doc.text('Prestation', pageWidth / 2 + 10, sectionY + 10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(inv.prestationLabel, pageWidth / 2 + 10, sectionY + 16, {
      maxWidth: pageWidth / 2 - 26,
    });
    doc.text(`Catégorie : ${inv.categorieDechet}`, pageWidth / 2 + 10, sectionY + 22);
    doc.text(`Quantité : ${inv.quantite} ${inv.unite}`, pageWidth / 2 + 10, sectionY + 28);
    doc.text(
      `Prix unitaire : ${formatMontant(inv.prixUnitaire)} / ${inv.unite}`,
      pageWidth / 2 + 10,
      sectionY + 34
    );

    (doc as any).setFillColor(...(lightFill as any[]));
    doc.roundedRect(16, sectionY + 50, pageWidth - 32, 24, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    (doc as any).setTextColor(...(primary as any[]));
    doc.text(`MONTANT HT : ${formatMontant(inv.montantHT)}`, 20, sectionY + 66);

    doc.setFont('helvetica', 'normal');
    (doc as any).setTextColor(...(slate as [number, number, number]));
    doc.setFontSize(8.5);
    doc.text(
      `${docLabel} associé : N°${inv.numeroOfficiel} • Opération ${inv.operationNumero}`,
      16,
      pageWidth > 0 ? sectionY + 85 : sectionY + 85
    );
    doc.text(`Statut : ${STATUS_CONFIG[inv.status].label}`, 16, sectionY + 91);

    const footerTop = doc.internal.pageSize.getHeight() - 22;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(16, footerTop, pageWidth - 16, footerTop);
    doc.setFontSize(8);
    (doc as any).setTextColor(...(slate as any[]));
    doc.text('NINEA: 0000000 • RC: B 1234567 • Mamelles, Dakar', pageWidth / 2, footerTop + 6, {
      align: 'center',
    });
    doc.text(
      'Contact : contact@ivos-kignabour.sn • +221 33 000 00 00',
      pageWidth / 2,
      footerTop + 12,
      { align: 'center' }
    );

    doc.save(`Facture_${inv.clientNom.replace(/\s+/g, '_')}_${inv.numeroOfficiel}.pdf`);
    toast.success('PDF facture téléchargé');
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-2.5">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Facturation</h1>
              <p className="mt-0.5 text-sm text-blue-200">
                Factures générées automatiquement depuis le Workflow Operations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-2xl bg-gradient-to-b from-[#003366] to-blue-700" />
          <div className="flex items-center gap-3 pl-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <BarChart3 className="h-5 w-5 text-[#003366]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-2xl bg-gradient-to-b from-amber-500 to-amber-600" />
          <div className="flex items-center gap-3 pl-3">
            <div className="rounded-lg bg-amber-50 p-2">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">À Valider</p>
              <p className="text-xl font-bold text-amber-700">{stats.aValider}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-2xl bg-gradient-to-b from-green-500 to-green-600" />
          <div className="flex items-center gap-3 pl-3">
            <div className="rounded-lg bg-green-50 p-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Validées</p>
              <p className="text-xl font-bold text-green-700">{stats.validees}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-2xl bg-gradient-to-b from-emerald-500 to-emerald-600" />
          <div className="flex items-center gap-3 pl-3">
            <div className="rounded-lg bg-emerald-50 p-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Payées</p>
              <p className="text-xl font-bold text-emerald-700">{stats.payees}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-2xl bg-gradient-to-b from-[#003366] to-blue-600" />
          <div className="flex items-center gap-3 pl-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <DollarSign className="h-5 w-5 text-[#003366]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Montant Total</p>
              <p className="text-lg font-bold text-[#003366]">
                {formatMontant(stats.montantTotal)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par client, n° BSD/DN, catégorie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            {[
              { key: 'all' as const, label: 'Toutes', color: 'bg-blue-100 text-blue-700' },
              {
                key: 'a_valider' as const,
                label: 'À Valider',
                color: 'bg-amber-100 text-amber-700',
              },
              { key: 'validee' as const, label: 'Validées', color: 'bg-green-100 text-green-700' },
              { key: 'envoyee' as const, label: 'Envoyées', color: 'bg-blue-100 text-blue-700' },
              { key: 'payee' as const, label: 'Payées', color: 'bg-emerald-100 text-emerald-700' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
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
      <div className="overflow-hidden rounded-2xl bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a1a2e]">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-white">Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-white">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-white">
                  Prestation
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-white">
                  N° Document
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase text-white">
                  Quantité
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase text-white">
                  Montant HT
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase text-white">
                  Statut
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">
                    <DollarSign className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                    <p className="font-medium">Aucune facture</p>
                    <p className="mt-1 text-xs">
                      Les factures seront créées automatiquement à la clôture des opérations
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const sc = STATUS_CONFIG[inv.status];
                  const StatusIcon = sc.icon;
                  return (
                    <tr
                      key={inv.id}
                      className={`transition-colors ${inv.status === 'a_valider' ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-gray-50/50'}`}
                    >
                      <td className="px-4 py-3 text-gray-700">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          {new Date(inv.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-gray-800">{inv.clientNom}</p>
                          {inv.clientContact && (
                            <p className="text-xs text-gray-400">{inv.clientContact}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-gray-700">{inv.categorieDechet}</p>
                          <p className="mt-0.5 text-[10px] text-gray-400">{inv.prestationLabel}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-[#003366]">
                          {inv.numeroOfficiel}
                        </span>
                        <span
                          className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            inv.documentType === 'BSD'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {inv.documentType === 'BSD' ? 'BSD' : 'DN'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700">
                        {inv.quantite} {inv.unite}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-[#003366]">
                          {formatMontant(inv.montantHT)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${sc.color}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingInvoice(inv)}
                            className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                            title="Détails"
                          >
                            <Eye className="h-4 w-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(inv)}
                            className="rounded-lg p-1.5 transition-colors hover:bg-blue-50"
                            title="Télécharger PDF"
                          >
                            <Download className="h-4 w-4 text-blue-500" />
                          </button>
                          <button
                            onClick={() => {
                              window.location.href = '/exploitation';
                            }}
                            className="rounded-lg p-1.5 transition-colors hover:bg-indigo-50"
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
      {viewingInvoice &&
        (() => {
          const inv = viewingInvoice;
          const sc = STATUS_CONFIG[inv.status];
          const StatusIcon = sc.icon;
          const docLabel = inv.documentType === 'BSD' ? 'BSD' : 'DN';
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                {/* Modal Header */}
                <div className="sticky top-0 flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-[#003366] to-blue-800 p-5">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <DollarSign className="h-5 w-5" />
                    Facture — {inv.clientNom}
                  </h2>
                  <button
                    onClick={() => setViewingInvoice(null)}
                    className="rounded-lg p-1.5 transition-colors hover:bg-white/20"
                  >
                    <XCircle className="h-5 w-5 text-white" />
                  </button>
                </div>

                <div className="space-y-5 p-6">
                  {/* Status badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${sc.color}`}
                    >
                      <StatusIcon className="h-4 w-4" /> {sc.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      Créée le {new Date(inv.createdAt).toLocaleString('fr-FR')}
                    </span>
                  </div>

                  {/* Client info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Client
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-gray-800">{inv.clientNom}</p>
                      {inv.clientAdresse && (
                        <p className="mt-0.5 text-xs text-gray-500">{inv.clientAdresse}</p>
                      )}
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Contact
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-gray-800">
                        {inv.clientContact || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Operation link */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase text-blue-800">
                      <GitPullRequest className="h-3.5 w-3.5" /> Document Lié
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-blue-600">N° :</span>{' '}
                        <span className="font-mono font-bold">{inv.numeroOfficiel}</span>
                        <span
                          className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            inv.documentType === 'BSD'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {docLabel}
                        </span>
                      </div>
                      <div>
                        <span className="text-blue-600">Operation :</span>{' '}
                        <span className="font-mono font-bold">{inv.operationNumero}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setViewingInvoice(null);
                        window.location.href =
                          inv.documentType === 'BSD'
                            ? '/waste-forms'
                            : '/exploitation/delivery-notes';
                      }}
                      className="mt-3 flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                    >
                      <FileText className="h-3.5 w-3.5" /> Consulter le {docLabel} N°
                      {inv.numeroOfficiel}
                    </button>
                  </div>

                  {/* Prestation */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <h3 className="mb-2 text-xs font-bold uppercase text-amber-800">
                      Détail Prestation
                    </h3>
                    <p className="text-sm font-semibold text-gray-800">{inv.prestationLabel}</p>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-gray-400">
                          Catégorie
                        </p>
                        <p className="font-bold text-gray-800">{inv.categorieDechet}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-gray-400">
                          Quantité
                        </p>
                        <p className="font-bold text-gray-800">
                          {inv.quantite} {inv.unite}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-gray-400">
                          Prix Unitaire
                        </p>
                        <p className="font-bold text-gray-800">
                          {formatMontant(inv.prixUnitaire)} / {inv.unite}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="rounded-xl bg-[#003366] p-4 text-center text-white">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                      Montant Total HT
                    </p>
                    <p className="mt-1 text-3xl font-extrabold">{formatMontant(inv.montantHT)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {inv.status === 'a_valider' && (
                      <button
                        onClick={() => {
                          handleStatusChange(inv.id, 'validee');
                          setViewingInvoice({ ...inv, status: 'validee' });
                        }}
                        className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Valider la facture
                      </button>
                    )}
                    {inv.status === 'validee' && (
                      <button
                        onClick={() => {
                          handleStatusChange(inv.id, 'envoyee');
                          setViewingInvoice({ ...inv, status: 'envoyee' });
                        }}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700"
                      >
                        <Send className="h-4 w-4" /> Marquer comme envoyée
                      </button>
                    )}
                    {inv.status === 'envoyee' && (
                      <button
                        onClick={() => {
                          handleStatusChange(inv.id, 'payee');
                          setViewingInvoice({ ...inv, status: 'payee' });
                        }}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700"
                      >
                        <DollarSign className="h-4 w-4" /> Marquer comme payée
                      </button>
                    )}
                    {(inv.status === 'a_valider' || inv.status === 'validee') && (
                      <button
                        onClick={() => {
                          handleStatusChange(inv.id, 'annulee');
                          setViewingInvoice({ ...inv, status: 'annulee' });
                        }}
                        className="flex items-center gap-2 rounded-xl bg-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-300"
                      >
                        <XCircle className="h-4 w-4" /> Annuler
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadPDF(inv)}
                      className="ml-auto flex items-center gap-2 rounded-xl bg-[#003366] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-900"
                    >
                      <Download className="h-4 w-4" /> Télécharger PDF
                    </button>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setViewingInvoice(null)}
                      className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200"
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
