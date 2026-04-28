import { Component, type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  Clock,
  Eye,
  FileCheck,
  Hourglass,
  MoreVertical,
  Pencil,
  Plus,
  Printer,
  ShieldAlert,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import {
  createManualRevenue,
  deleteRevenueEntry,
  getAllRevenues,
  getRevenueEventName,
  getRevenueStats,
  updateRevenueEntry,
  type RevenueEntry,
} from '../services/revenueService';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class RevenuesErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
            <p className="text-red-700 font-semibold text-sm">Une erreur est survenue dans le module Recettes</p>
            <p className="text-red-400 text-xs font-mono break-all">{this.state.message}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="mt-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              Reessayer
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function formatFCFA(value: number): string {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(value))} FCFA`;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString('fr-FR');
  const hour = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day} à ${hour}`;
}

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

type PayMode = 'Especes' | 'Wave' | 'Orange Money' | 'Virement' | 'Cheque' | 'Carte' | 'Autre';

interface FormMeta {
  chequeNum: string;
  banque: string;
  echeance: string;
  refVirement: string;
  telephone: string;
  idTransaction: string;
}

const EMPTY_META: FormMeta = {
  chequeNum: '',
  banque: '',
  echeance: '',
  refVirement: '',
  telephone: '',
  idTransaction: '',
};

const VALID_MODES: PayMode[] = ['Especes', 'Wave', 'Orange Money', 'Virement', 'Cheque', 'Carte', 'Autre'];

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors bg-white';
const labelCls = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1';
const iconBtnCls =
  'inline-flex items-center justify-center p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors';

function modeToLabel(mode: PayMode): string {
  if (mode === 'Especes') return 'Espèces';
  if (mode === 'Cheque') return 'Chèque';
  return mode;
}

function normalizeMode(mode: string): PayMode {
  if (mode === 'Espèces') return 'Especes';
  if (mode === 'Chèque') return 'Cheque';
  return VALID_MODES.includes(mode as PayMode) ? (mode as PayMode) : 'Especes';
}

function RevenuesInner() {
  const [lines, setLines] = useState<RevenueEntry[]>(() => getAllRevenues());

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<RevenueEntry | null>(null);

  const [date, setDate] = useState(todayInput);
  const [client, setClient] = useState('');
  const [libelle, setLibelle] = useState('');
  const [mode, setMode] = useState<PayMode>('Especes');
  const [montant, setMontant] = useState('');
  const [status, setStatus] = useState<'encaisse' | 'en_attente'>('encaisse');
  const [meta, setMeta] = useState<FormMeta>(EMPTY_META);
  const [formError, setFormError] = useState('');
  const [showDecharge, setShowDecharge] = useState(false);

  const [confirmTarget, setConfirmTarget] = useState<RevenueEntry | null>(null);
  const [confirmDate, setConfirmDate] = useState(todayInput);
  const [confirmMode, setConfirmMode] = useState<PayMode>('Especes');
  const [confirmMeta, setConfirmMeta] = useState<FormMeta>(EMPTY_META);
  const [confirmError, setConfirmError] = useState('');
  const [confirmDone, setConfirmDone] = useState(false);

  const [previewTarget, setPreviewTarget] = useState<RevenueEntry | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<RevenueEntry | null>(null);

  const [authTarget, setAuthTarget] = useState<RevenueEntry | null>(null);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setLines(getAllRevenues());
    const evt = getRevenueEventName();
    window.addEventListener('ivos_invoice_change', refresh);
    window.addEventListener(evt, refresh);
    return () => {
      window.removeEventListener('ivos_invoice_change', refresh);
      window.removeEventListener(evt, refresh);
    };
  }, []);

  useEffect(() => {
    const onWindowClick = () => setOpenActionMenuId(null);
    window.addEventListener('click', onWindowClick);
    return () => window.removeEventListener('click', onWindowClick);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenActionMenuId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    setMeta(EMPTY_META);
    setFormError('');
    setShowDecharge(false);
  }, [mode]);

  const stats = useMemo(() => getRevenueStats(), [lines]);

  const setMetaField = (key: keyof FormMeta, value: string) => {
    setMeta((prev) => ({ ...prev, [key]: value }));
  };

  const validateMetaByMode = (targetMode: PayMode, targetMeta: FormMeta): string | null => {
    if (targetMode === 'Cheque') {
      if (!targetMeta.chequeNum.trim()) return 'Numero de cheque requis';
      if (!targetMeta.banque.trim()) return 'Banque requise';
      if (!targetMeta.echeance) return "Date d'echeance requise";
    }
    if (targetMode === 'Virement') {
      if (!targetMeta.refVirement.trim()) return 'Reference / code de transaction requis';
    }
    if (targetMode === 'Wave' || targetMode === 'Orange Money') {
      if (!targetMeta.telephone.trim()) return 'Telephone emetteur requis';
      if (!targetMeta.idTransaction.trim()) return 'ID Transaction requis';
    }
    return null;
  };

  const extractMetadataByMode = (targetMode: PayMode, targetMeta: FormMeta): Record<string, string> => {
    const metadata: Record<string, string> = {};
    if (targetMode === 'Cheque') {
      metadata.chequeNum = targetMeta.chequeNum;
      metadata.banque = targetMeta.banque;
      metadata.echeance = targetMeta.echeance;
    } else if (targetMode === 'Virement') {
      metadata.refVirement = targetMeta.refVirement;
    } else if (targetMode === 'Wave' || targetMode === 'Orange Money') {
      metadata.telephone = targetMeta.telephone;
      metadata.idTransaction = targetMeta.idTransaction;
    }
    return metadata;
  };

  const resetBaseFields = () => {
    setDate(todayInput());
    setClient('');
    setLibelle('');
    setMontant('');
    setStatus('encaisse');
    setMode('Especes');
    setMeta(EMPTY_META);
    setFormError('');
  };

  const closeForm = () => {
    setShowForm(false);
    setShowDecharge(false);
    setEditTarget(null);
    setFormMode('create');
    resetBaseFields();
  };

  const populateFormForEdit = (line: RevenueEntry) => {
    setDate(new Date(line.date).toISOString().slice(0, 10));
    setClient(line.client);
    setLibelle(line.libelle);
    setMode(normalizeMode(line.mode));
    setMontant(String(Math.round(line.montant)));
    setStatus(line.status);
    setMeta({
      ...EMPTY_META,
      chequeNum: line.metadata?.chequeNum || '',
      banque: line.metadata?.banque || '',
      echeance: line.metadata?.echeance || '',
      refVirement: line.metadata?.refVirement || '',
      telephone: line.metadata?.telephone || '',
      idTransaction: line.metadata?.idTransaction || '',
    });
  };

  const openCreateForm = () => {
    closeForm();
    setFormMode('create');
    setShowForm(true);
  };

  const openEditForm = (line: RevenueEntry, isAuthorized = false) => {
    if (line.source === 'Facture') {
      setFormError('Une recette issue de facture ne peut pas etre modifiee depuis ce tableau.');
      setShowForm(true);
      return;
    }

    if (line.status === 'encaisse' && !isAuthorized) {
      setAuthTarget(line);
      setAuthCode('');
      setAuthError('');
      return;
    }

    setFormMode('edit');
    setEditTarget(line);
    populateFormForEdit(line);
    setShowForm(true);
    setShowDecharge(false);
    setFormError('');
  };

  const handleSave = () => {
    const amount = Number(montant.replace(/\s/g, '').replace(',', '.'));
    if (!date || !client.trim() || !libelle.trim() || !Number.isFinite(amount) || amount <= 0) {
      setFormError('Veuillez remplir tous les champs obligatoires (date, client, libelle, montant > 0).');
      return;
    }

    const metaError = validateMetaByMode(mode, meta);
    if (metaError) {
      setFormError(metaError);
      return;
    }

    const metadata = extractMetadataByMode(mode, meta);
    const modeLabel = modeToLabel(mode);
    const effectiveDate = new Date(`${date}T00:00:00`).toISOString();

    setFormError('');

    if (formMode === 'create') {
      createManualRevenue({
        date: effectiveDate,
        client,
        libelle,
        mode: modeLabel,
        montant: amount,
        status,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      setLines(getAllRevenues());
      resetBaseFields();

      if (mode === 'Especes') {
        setShowDecharge(true);
        return;
      }

      closeForm();
      return;
    }

    if (!editTarget) return;

    const updated = updateRevenueEntry(editTarget.id, {
      date: effectiveDate,
      client: client.trim(),
      libelle: libelle.trim(),
      mode: modeLabel,
      montant: Math.round(amount),
      status,
      metadata,
    });

    if (!updated) {
      setFormError('Impossible de modifier cette recette.');
      return;
    }

    setLines((prev) => prev.map((line) => (line.id === editTarget.id ? updated : line)));
    closeForm();
  };

  const openConfirm = (line: RevenueEntry) => {
    const selectedMode = normalizeMode(line.mode);

    setConfirmTarget(line);
    setConfirmDate(todayInput());
    setConfirmMode(selectedMode);
    setConfirmMeta({
      ...EMPTY_META,
      chequeNum: line.metadata?.chequeNum || '',
      banque: line.metadata?.banque || '',
      echeance: line.metadata?.echeance || '',
      refVirement: line.metadata?.refVirement || '',
      telephone: line.metadata?.telephone || '',
      idTransaction: line.metadata?.idTransaction || '',
    });
    setConfirmError('');
    setConfirmDone(false);
  };

  const closeConfirm = () => {
    setConfirmTarget(null);
    setConfirmMeta(EMPTY_META);
    setConfirmError('');
    setConfirmDone(false);
  };

  const confirmEncaissement = () => {
    if (!confirmTarget) return;

    const metaError = validateMetaByMode(confirmMode, confirmMeta);
    if (metaError) {
      setConfirmError(metaError);
      return;
    }

    const effectiveDate = new Date(`${confirmDate}T00:00:00`).toISOString();
    const metadata = extractMetadataByMode(confirmMode, confirmMeta);
    const modeLabel = modeToLabel(confirmMode);

    const patch = {
      status: 'encaisse' as const,
      date: effectiveDate,
      mode: modeLabel,
      metadata,
    };

    setLines((prev) => prev.map((line) => (line.id === confirmTarget.id ? { ...line, ...patch } : line)));
    updateRevenueEntry(confirmTarget.id, patch);

    if (confirmMode === 'Especes') {
      setConfirmDone(true);
      return;
    }

    closeConfirm();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const ok = deleteRevenueEntry(deleteTarget.id);
    if (ok) {
      setLines((prev) => prev.filter((line) => line.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const submitSpecialAuth = () => {
    if (!authTarget) return;
    const configuredCode = localStorage.getItem('ivos_revenue_edit_auth_code') || 'ADMIN-RECETTES';
    if (authCode.trim() !== configuredCode) {
      setAuthError('Code invalide.');
      return;
    }

    const target = authTarget;
    setAuthTarget(null);
    setAuthCode('');
    setAuthError('');
    openEditForm(target, true);
  };

  const showManualCheque = mode === 'Cheque';
  const showManualVirement = mode === 'Virement';
  const showManualMobile = mode === 'Wave' || mode === 'Orange Money';
  const showConfirmCheque = confirmMode === 'Cheque';
  const showConfirmVirement = confirmMode === 'Virement';
  const showConfirmMobile = confirmMode === 'Wave' || confirmMode === 'Orange Money';

  return (
    <>
      <div className="w-full">
        <div className="w-full max-w-none space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Recettes</h1>
                <p className="text-sm text-gray-500 mt-1">Suivi, controle et tracabilite des encaissements</p>
              </div>
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Ajouter une recette manuelle
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className={labelCls}>Recettes du mois</p>
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-700 mt-2 tabular-nums">{formatFCFA(stats.recettesDuMois)}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className={labelCls}>En attente d'encaissement</p>
                <Hourglass className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-700 mt-2 tabular-nums">{formatFCFA(stats.enAttenteEncaissement)}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className={labelCls}>Total encaisse</p>
                <BadgeCheck className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-700 mt-2 tabular-nums">{formatFCFA(stats.totalEncaisse)}</p>
            </div>
          </div>

          {showForm && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-5 animate-form-field-in">
              <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3">
                {formMode === 'edit' ? 'Modifier une recette' : 'Nouvelle recette manuelle'}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                </div>
                <div className="lg:col-span-2">
                  <label className={labelCls}>Client</label>
                  <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Nom du client" className={inputCls} />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className={labelCls}>Libelle</label>
                  <input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Objet du reglement" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Mode de paiement</label>
                  <select value={mode} onChange={(e) => setMode(e.target.value as PayMode)} className={inputCls}>
                    <option value="Especes">Especes</option>
                    <option value="Wave">Wave Mobile Money</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="Virement">Virement bancaire</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Carte">Carte bancaire</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Montant (FCFA)</label>
                  <input value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="Ex : 750000" inputMode="numeric" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Statut</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as 'encaisse' | 'en_attente')} className={inputCls}>
                    <option value="encaisse">Encaisse</option>
                    <option value="en_attente">En attente</option>
                  </select>
                </div>
              </div>

              {showManualCheque && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-dashed border-gray-200 pt-4 animate-form-field-in">
                  <div className="sm:col-span-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Informations cheque</span>
                  </div>
                  <div>
                    <label className={labelCls}>Numero de cheque *</label>
                    <input value={meta.chequeNum} onChange={(e) => setMetaField('chequeNum', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Banque *</label>
                    <input value={meta.banque} onChange={(e) => setMetaField('banque', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Date d'echeance *</label>
                    <input type="date" value={meta.echeance} onChange={(e) => setMetaField('echeance', e.target.value)} className={inputCls} />
                  </div>
                </div>
              )}

              {showManualVirement && (
                <div className="border-t border-dashed border-gray-200 pt-4 space-y-3 animate-form-field-in">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Informations virement</span>
                  <div className="max-w-sm">
                    <label className={labelCls}>Reference / code transaction *</label>
                    <input value={meta.refVirement} onChange={(e) => setMetaField('refVirement', e.target.value)} className={inputCls} />
                  </div>
                </div>
              )}

              {showManualMobile && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-dashed border-gray-200 pt-4 animate-form-field-in">
                  <div className="sm:col-span-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600">Informations {mode}</span>
                  </div>
                  <div>
                    <label className={labelCls}>Telephone emetteur *</label>
                    <input value={meta.telephone} onChange={(e) => setMetaField('telephone', e.target.value)} inputMode="tel" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>ID Transaction *</label>
                    <input value={meta.idTransaction} onChange={(e) => setMetaField('idTransaction', e.target.value)} className={inputCls} />
                  </div>
                </div>
              )}

              {formError && (
                <p className="text-sm text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg border border-red-200">{formError}</p>
              )}

              {showDecharge && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 animate-form-field-in">
                  <FileCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-800 font-medium flex-1">
                    Recette enregistree. Pensez a faire signer la decharge de remise en especes.
                  </p>
                  <button type="button" onClick={closeForm} className="text-emerald-700 text-xs font-semibold hover:underline flex-shrink-0">
                    Fermer
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2.5 rounded-lg bg-[#1a1a2e] text-white text-sm font-semibold hover:bg-[#2a2a4e] transition-colors"
                >
                  {formMode === 'edit' ? 'Enregistrer les modifications' : mode === 'Especes' ? 'Enregistrer & Generer decharge' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="w-[16%] px-5 py-3 text-left text-[11px] tracking-wide uppercase text-gray-500 font-bold">Enregistre le</th>
                    <th className="w-[18%] px-5 py-3 text-left text-[11px] tracking-wide uppercase text-gray-500 font-bold">Client</th>
                    <th className="w-[28%] px-5 py-3 text-left text-[11px] tracking-wide uppercase text-gray-500 font-bold">Libelle</th>
                    <th className="w-[12%] px-5 py-3 text-left text-[11px] tracking-wide uppercase text-gray-500 font-bold">Source</th>
                    <th className="w-[10%] px-5 py-3 text-left text-[11px] tracking-wide uppercase text-gray-500 font-bold">Mode</th>
                    <th className="w-[9%] px-5 py-3 text-left text-[11px] tracking-wide uppercase text-gray-500 font-bold">Statut</th>
                    <th className="w-[10%] px-5 py-3 text-right text-[11px] tracking-wide uppercase text-gray-500 font-bold">Montant</th>
                    <th className="w-[7%] px-5 py-3 text-center text-[11px] tracking-wide uppercase text-gray-500 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">Aucune recette disponible</td>
                    </tr>
                  ) : (
                    lines.map((line) => (
                      <tr key={line.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDateTime(line.created_at || line.date)}</td>
                        <td className="px-5 py-3 text-sm text-gray-800 font-medium">{line.client}</td>
                        <td className="px-5 py-3 text-sm text-gray-700">{line.libelle}</td>
                        <td className="px-5 py-3 text-sm">
                          {line.source === 'Facture' && line.invoiceId ? (
                            <Link
                              to={`/billing?invoiceId=${encodeURIComponent(line.invoiceId)}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 hover:bg-indigo-100 transition-colors"
                            >
                              Facture <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200">
                              Saisie manuelle
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700">{line.mode}</td>
                        <td className="px-5 py-3 text-sm">
                          {line.status === 'encaisse' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                              <Check className="w-3 h-3" /> Encaisse
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openConfirm(line)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 hover:bg-amber-100 transition-colors"
                            >
                              <Clock className="w-3 h-3" /> En attente
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right tabular-nums whitespace-nowrap">{formatFCFA(line.montant)}</td>
                        <td className="px-5 py-3 text-sm">
                          <div className="relative flex items-center justify-center">
                            <button
                              type="button"
                              title="Actions"
                              aria-haspopup="menu"
                              aria-expanded={openActionMenuId === line.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenuId((prev) => (prev === line.id ? null : line.id));
                              }}
                              className={iconBtnCls}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openActionMenuId === line.id && (
                              <div
                                role="menu"
                                className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-gray-200 bg-white shadow-lg py-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setPreviewTarget(line);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  APERCU
                                </button>

                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    openEditForm(line);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                                  title={line.status === 'encaisse' ? 'Modifier (autorisation requise)' : 'Modifier'}
                                >
                                  <Pencil className="w-4 h-4" />
                                  MODIFIER
                                </button>

                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setDeleteTarget(line);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 inline-flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  SUPPRIMER
                                </button>
                              </div>
                            )}
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

      {confirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeConfirm();
          }}
        >
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-form-field-in overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Confirmer l'encaissement</h3>
              <button type="button" onClick={closeConfirm} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <p className={labelCls}>Client</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{confirmTarget.client}</p>
                </div>
                <div>
                  <p className={labelCls}>Montant</p>
                  <p className="text-sm font-bold text-gray-900 tabular-nums">{formatFCFA(confirmTarget.montant)}</p>
                </div>
                <div className="col-span-2">
                  <p className={labelCls}>Libelle</p>
                  <p className="text-sm text-gray-700">{confirmTarget.libelle}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date effective de reception</label>
                  <input type="date" value={confirmDate} onChange={(e) => setConfirmDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Mode de paiement</label>
                  <select
                    value={confirmMode}
                    onChange={(e) => {
                      setConfirmMode(e.target.value as PayMode);
                      setConfirmMeta(EMPTY_META);
                      setConfirmError('');
                    }}
                    className={inputCls}
                  >
                    <option value="Especes">Especes</option>
                    <option value="Wave">Wave Mobile Money</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="Virement">Virement bancaire</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Carte">Carte bancaire</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              {showConfirmCheque && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-dashed border-gray-200 pt-4 animate-form-field-in">
                  <div className="sm:col-span-3 text-[11px] font-bold uppercase tracking-wider text-indigo-600">Informations cheque</div>
                  <div>
                    <label className={labelCls}>Numero de cheque *</label>
                    <input value={confirmMeta.chequeNum} onChange={(e) => setConfirmMeta((p) => ({ ...p, chequeNum: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Banque *</label>
                    <input value={confirmMeta.banque} onChange={(e) => setConfirmMeta((p) => ({ ...p, banque: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Echeance *</label>
                    <input type="date" value={confirmMeta.echeance} onChange={(e) => setConfirmMeta((p) => ({ ...p, echeance: e.target.value }))} className={inputCls} />
                  </div>
                </div>
              )}

              {showConfirmVirement && (
                <div className="border-t border-dashed border-gray-200 pt-4 space-y-3 animate-form-field-in">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Informations virement</div>
                  <div>
                    <label className={labelCls}>Reference / code transaction *</label>
                    <input value={confirmMeta.refVirement} onChange={(e) => setConfirmMeta((p) => ({ ...p, refVirement: e.target.value }))} className={inputCls} />
                  </div>
                </div>
              )}

              {showConfirmMobile && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-dashed border-gray-200 pt-4 animate-form-field-in">
                  <div className="sm:col-span-2 text-[11px] font-bold uppercase tracking-wider text-orange-600">Informations {confirmMode}</div>
                  <div>
                    <label className={labelCls}>Telephone emetteur *</label>
                    <input value={confirmMeta.telephone} onChange={(e) => setConfirmMeta((p) => ({ ...p, telephone: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>ID Transaction *</label>
                    <input value={confirmMeta.idTransaction} onChange={(e) => setConfirmMeta((p) => ({ ...p, idTransaction: e.target.value }))} className={inputCls} />
                  </div>
                </div>
              )}

              {confirmError && (
                <p className="text-sm text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg border border-red-200">{confirmError}</p>
              )}

              {confirmDone && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 animate-form-field-in">
                  <FileCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-emerald-800 font-medium">Encaissement confirme. Imprimez la decharge especes.</p>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-400 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimer la decharge
                    </button>
                  </div>
                </div>
              )}
            </div>

            {!confirmDone && (
              <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                <button type="button" onClick={closeConfirm} className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 font-medium hover:bg-white transition-colors">
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmEncaissement}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Confirmer l'encaissement
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {previewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setPreviewTarget(null)}>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Apercu recette</h3>
              <button type="button" onClick={() => setPreviewTarget(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className={labelCls}>Heure d'enregistrement</p>
                  <p className="text-gray-800 font-semibold">{formatDateTime(previewTarget.created_at || previewTarget.date)}</p>
                </div>
                <div>
                  <p className={labelCls}>Date comptable</p>
                  <p className="text-gray-800 font-semibold">{new Date(previewTarget.date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <p className={labelCls}>Client</p>
                  <p className="text-gray-800">{previewTarget.client}</p>
                </div>
                <div>
                  <p className={labelCls}>Montant</p>
                  <p className="text-gray-900 font-bold tabular-nums">{formatFCFA(previewTarget.montant)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className={labelCls}>Libelle</p>
                  <p className="text-gray-800">{previewTarget.libelle}</p>
                </div>
                <div>
                  <p className={labelCls}>Mode de paiement</p>
                  <p className="text-gray-800">{previewTarget.mode}</p>
                </div>
                <div>
                  <p className={labelCls}>Statut</p>
                  <p className="text-gray-800">{previewTarget.status === 'encaisse' ? 'Encaisse' : 'En attente'}</p>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className={`${labelCls} mb-2`}>Justificatifs / metadata</p>
                {previewTarget.metadata && Object.keys(previewTarget.metadata).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {Object.entries(previewTarget.metadata).map(([k, v]) => (
                      <div key={k} className="px-2.5 py-2 rounded-lg bg-white border border-gray-200">
                        <p className="font-semibold text-gray-500 uppercase tracking-wide">{k}</p>
                        <p className="text-gray-800 mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Aucun justificatif ajoute.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Confirmation de suppression</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700">Etes-vous sur de vouloir supprimer cette recette ?</p>
              <p className="text-xs text-gray-500 mt-2">{deleteTarget.client} - {deleteTarget.libelle}</p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 font-medium hover:bg-white transition-colors">
                Annuler
              </button>
              <button type="button" onClick={confirmDelete} className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {authTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setAuthTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-gray-900">Autorisation speciale requise</h3>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-gray-700">Cette recette est deja encaissee. Entrez le code d'autorisation pour la modifier.</p>
              <div>
                <label className={labelCls}>Code d'autorisation</label>
                <input value={authCode} onChange={(e) => setAuthCode(e.target.value)} className={inputCls} placeholder="Ex : ADMIN-RECETTES" />
              </div>
              {authError && <p className="text-sm text-red-600">{authError}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button type="button" onClick={() => setAuthTarget(null)} className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 font-medium hover:bg-white transition-colors">
                Annuler
              </button>
              <button type="button" onClick={submitSpecialAuth} className="px-4 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors">
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function RevenuesPage() {
  return (
    <RevenuesErrorBoundary>
      <RevenuesInner />
    </RevenuesErrorBoundary>
  );
}
