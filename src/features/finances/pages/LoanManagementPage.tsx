import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, Edit3, Trash2, Search, Check, X, Banknote,
  CalendarDays, Clock, Users, ChevronDown, TrendingUp,
  AlertCircle, CheckCircle2, DollarSign,
} from 'lucide-react';
import { personnelStore, type PersonnelAgent } from '../../fleet/services/personnelStore';
import { formatCleanAmount } from '@/shared/utils/formatAmount';

// ─── Types & Storage ────────────────────────────────────────────────
type LoanStatus = 'En cours' | 'Soldé';

interface Loan {
  id: number;
  employeeId: string;
  employeeName: string;
  employeeMatricule: string;
  amount: number;
  duration: number;
  monthly: number;
  paidMonths: number;
  startDate: string;
  status: LoanStatus;
  createdAt: string;
}

const STORAGE_KEY = 'ivos_staff_loans_v1';
const CHANGE_EVENT = 'ivos_loans_change';

function loadLoans(): Loan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed) && parsed.length > 0) return parsed; }
  } catch { /* ignore */ }
  return SEED_LOANS;
}
function saveLoans(loans: Loan[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

// ─── Helpers ────────────────────────────────────────────────────────
function fmtPrice(n: number) { return formatCleanAmount(n, 'FCFA'); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
function formatInputPrice(value: string): string {
  const num = value.replace(/\D/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('fr-FR');
}
function parseInputPrice(value: string): number {
  return Number(value.replace(/\s/g, '').replace(/\./g, '')) || 0;
}

// ─── Seed ───────────────────────────────────────────────────────────
const SEED_LOANS: Loan[] = [
  { id: 1, employeeId: 'ag1', employeeName: 'Mamadou Diallo', employeeMatricule: 'IVOS-CH-001', amount: 2000000, duration: 20, monthly: 100000, paidMonths: 8, startDate: '2025-08-01', status: 'En cours', createdAt: '2025-08-01T09:00:00' },
  { id: 2, employeeId: 'ag2', employeeName: 'Fatou Sow', employeeMatricule: 'IVOS-AD-003', amount: 1500000, duration: 15, monthly: 100000, paidMonths: 15, startDate: '2025-01-01', status: 'Soldé', createdAt: '2025-01-01T09:00:00' },
  { id: 3, employeeId: 'ag3', employeeName: 'Ousmane Ndiaye', employeeMatricule: 'IVOS-OP-007', amount: 3000000, duration: 24, monthly: 125000, paidMonths: 5, startDate: '2025-11-01', status: 'En cours', createdAt: '2025-11-01T09:00:00' },
  { id: 4, employeeId: 'ag5', employeeName: 'Ibrahima Fall', employeeMatricule: 'IVOS-MC-002', amount: 800000, duration: 8, monthly: 100000, paidMonths: 3, startDate: '2026-01-15', status: 'En cours', createdAt: '2026-01-15T09:00:00' },
];

// Duration presets
const DURATIONS = [3, 6, 9, 12, 15, 18, 24, 30, 36];

// ─── Exported helper for Paie avec Retenues ─────────────────────────
export function getActiveLoansForEmployee(employeeId: string): Loan[] {
  return loadLoans().filter(l => l.employeeId === employeeId && l.status === 'En cours');
}
export function getMonthlyLoanDeduction(employeeId: string): number {
  return getActiveLoansForEmployee(employeeId).reduce((s, l) => s + l.monthly, 0);
}

// ─── Component ──────────────────────────────────────────────────────
export default function LoanManagementPage() {
  const [loans, setLoans] = useState<Loan[]>(loadLoans());
  const [agents, setAgents] = useState<PersonnelAgent[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | LoanStatus>('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editLoan, setEditLoan] = useState<Loan | null>(null);
  const [formEmployee, setFormEmployee] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDuration, setFormDuration] = useState('12');
  const [formStartDate, setFormStartDate] = useState('');

  // Delete confirm
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  useEffect(() => {
    setAgents(personnelStore.load());
    const h = () => setAgents(personnelStore.load());
    window.addEventListener('personnel:updated', h);
    return () => window.removeEventListener('personnel:updated', h);
  }, []);

  const reload = useCallback(() => setLoans(loadLoans()), []);
  useEffect(() => {
    const h = () => reload();
    window.addEventListener(CHANGE_EVENT, h);
    return () => window.removeEventListener(CHANGE_EVENT, h);
  }, [reload]);

  // ─── Computed ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = loans;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l => l.employeeName.toLowerCase().includes(q) || l.employeeMatricule.toLowerCase().includes(q));
    }
    if (statusFilter) list = list.filter(l => l.status === statusFilter);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [loans, search, statusFilter]);

  const stats = useMemo(() => {
    const active = loans.filter(l => l.status === 'En cours');
    const done = loans.filter(l => l.status === 'Soldé');
    const totalEncours = active.reduce((s, l) => s + (l.amount - l.paidMonths * l.monthly), 0);
    const totalMensualites = active.reduce((s, l) => s + l.monthly, 0);
    return { total: loans.length, active: active.length, done: done.length, totalEncours, totalMensualites };
  }, [loans]);

  // Real-time preview
  const previewMonthly = useMemo(() => {
    const amt = parseInputPrice(formAmount);
    const dur = Number(formDuration);
    return dur > 0 && amt > 0 ? Math.round(amt / dur) : 0;
  }, [formAmount, formDuration]);

  // ─── Modal handlers ────────────────────────────────────────────
  const openCreate = () => {
    setEditLoan(null);
    setFormEmployee('');
    setFormAmount('');
    setFormDuration('12');
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setShowModal(true);
  };
  const openEdit = (loan: Loan) => {
    setEditLoan(loan);
    setFormEmployee(loan.employeeId);
    setFormAmount(loan.amount.toLocaleString('fr-FR'));
    setFormDuration(String(loan.duration));
    setFormStartDate(loan.startDate);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditLoan(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInputPrice(formAmount);
    const duration = Number(formDuration);
    if (!formEmployee || amount <= 0 || duration <= 0 || !formStartDate) return;
    const agent = agents.find(a => a.id === formEmployee);
    const monthly = Math.round(amount / duration);

    if (editLoan) {
      const updated = loans.map(l =>
        l.id === editLoan.id ? {
          ...l,
          employeeId: formEmployee,
          employeeName: agent ? `${agent.firstName} ${agent.lastName}` : l.employeeName,
          employeeMatricule: agent?.matricule || l.employeeMatricule,
          amount, duration, monthly, startDate: formStartDate,
        } : l
      );
      setLoans(updated);
      saveLoans(updated);
    } else {
      const newLoan: Loan = {
        id: Date.now(),
        employeeId: formEmployee,
        employeeName: agent ? `${agent.firstName} ${agent.lastName}` : formEmployee,
        employeeMatricule: agent?.matricule || '',
        amount, duration, monthly,
        paidMonths: 0,
        startDate: formStartDate,
        status: 'En cours',
        createdAt: new Date().toISOString(),
      };
      const updated = [...loans, newLoan];
      setLoans(updated);
      saveLoans(updated);
    }
    closeModal();
  };

  const handleDelete = (id: number) => {
    const updated = loans.filter(l => l.id !== id);
    setLoans(updated);
    saveLoans(updated);
    setPendingDeleteId(null);
  };

  const toggleStatus = (loan: Loan) => {
    const newStatus: LoanStatus = loan.status === 'En cours' ? 'Soldé' : 'En cours';
    const updated = loans.map(l =>
      l.id === loan.id ? { ...l, status: newStatus, paidMonths: newStatus === 'Soldé' ? l.duration : l.paidMonths } : l
    );
    setLoans(updated);
    saveLoans(updated);
  };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-indigo-900 to-indigo-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
              <Banknote className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Gestion des Prêts</h1>
              <p className="text-indigo-200 text-sm mt-0.5">Prêts du personnel — Suivi & Remboursement</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#1a1a2e] hover:bg-gray-100 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" /> Nouveau Prêt
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Prêts Actifs', value: String(stats.active), icon: Clock, tc: 'text-amber-700', bg: 'bg-amber-50', color: 'from-amber-500 to-amber-600' },
          { label: 'Prêts Soldés', value: String(stats.done), icon: CheckCircle2, tc: 'text-green-700', bg: 'bg-green-50', color: 'from-green-500 to-green-600' },
          { label: 'Encours Total', value: fmtPrice(stats.totalEncours), icon: DollarSign, tc: 'text-blue-700', bg: 'bg-blue-50', color: 'from-blue-500 to-blue-600' },
          { label: 'Mensualités /mois', value: fmtPrice(stats.totalMensualites), icon: TrendingUp, tc: 'text-purple-700', bg: 'bg-purple-50', color: 'from-purple-500 to-purple-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${k.color} rounded-l-2xl`} />
            <div className="pl-3">
              <div className={`p-2 ${k.bg} rounded-lg w-fit mb-2`}>
                <k.icon className={`h-4 w-4 ${k.tc}`} />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{k.label}</p>
              <p className={`text-lg font-bold ${k.tc} mt-0.5`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par employé, matricule..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['', 'En cours', 'Soldé'] as const).map(s => (
            <button key={s || 'all'} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === s ? 'bg-[#1a1a2e] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {s || 'Tous'}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{filtered.length} prêt{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Employé</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Montant Total</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Mensualité</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Remboursement</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Début</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Statut</th>
                <th className="text-right px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-sm text-gray-400">Aucun prêt trouvé</td></tr>
              ) : filtered.map(loan => {
                const progressPct = loan.duration > 0 ? Math.min(Math.round((loan.paidMonths / loan.duration) * 100), 100) : 0;
                const remaining = loan.duration - loan.paidMonths;
                const isDeleting = pendingDeleteId === loan.id;

                return (
                  <tr key={loan.id} className="group hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{loan.employeeName}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{loan.employeeMatricule}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-800">{fmtPrice(loan.amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-indigo-700">{fmtPrice(loan.monthly)}</span>
                    </td>
                    <td className="px-6 py-4 min-w-[200px]">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-400 font-semibold">{loan.paidMonths}/{loan.duration} mois</span>
                            <span className={`text-[10px] font-bold ${progressPct === 100 ? 'text-green-600' : 'text-gray-500'}`}>{progressPct}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${progressPct === 100 ? 'bg-green-500' : progressPct >= 50 ? 'bg-indigo-500' : 'bg-amber-400'}`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                        {remaining > 0 && (
                          <span className="text-[9px] text-gray-400 whitespace-nowrap">{remaining} restant{remaining > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <CalendarDays className="h-3 w-3 text-gray-300" />
                        {fmtDate(loan.startDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(loan)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                          loan.status === 'En cours'
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                        title="Cliquer pour changer le statut"
                      >
                        {loan.status === 'Soldé' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {loan.status}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {isDeleting ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[10px] text-red-500 font-semibold mr-1">Supprimer ?</span>
                          <button onClick={() => handleDelete(loan.id)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"><Check className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setPendingDeleteId(null)} className="p-1.5 bg-gray-200 text-gray-500 rounded-lg hover:bg-gray-300 transition-colors"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(loan)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-indigo-100 hover:text-indigo-600 transition-colors" title="Modifier"><Edit3 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setPendingDeleteId(loan.id)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors" title="Supprimer"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-fadeIn" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="bg-gradient-to-r from-[#1a1a2e] to-indigo-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/15 rounded-lg"><Banknote className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-lg font-bold">{editLoan ? 'Modifier le Prêt' : 'Nouveau Prêt'}</h2>
                  <p className="text-indigo-200 text-xs">Lié à l'Annuaire du Personnel</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Employé — from Annuaire */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
                  Employé <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                  <select
                    value={formEmployee}
                    onChange={e => setFormEmployee(e.target.value)}
                    required
                    className="w-full pl-10 pr-8 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="">Sélectionner un employé...</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.firstName} {a.lastName} — {a.matricule} ({a.role})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Montant */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
                    Montant du Prêt (FCFA) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <input
                      type="text" inputMode="numeric"
                      value={formAmount}
                      onChange={e => setFormAmount(formatInputPrice(e.target.value))}
                      placeholder="0"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Durée */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
                    Durée (mois) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <select
                      value={formDuration}
                      onChange={e => setFormDuration(e.target.value)}
                      required
                      className="w-full pl-10 pr-8 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all cursor-pointer"
                    >
                      {DURATIONS.map(d => <option key={d} value={d}>{d} mois</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Date de début */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
                  Date de début <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={e => setFormStartDate(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Real-time preview */}
              <div className={`rounded-xl p-4 transition-all ${previewMonthly > 0 ? 'bg-indigo-50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className={`h-4 w-4 ${previewMonthly > 0 ? 'text-indigo-500' : 'text-gray-300'}`} />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Calcul Automatique</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Mensualité estimée</span>
                  <span className={`text-lg font-bold ${previewMonthly > 0 ? 'text-indigo-700' : 'text-gray-300'}`}>
                    {previewMonthly > 0 ? fmtPrice(previewMonthly) : '—'}
                  </span>
                </div>
                {previewMonthly > 0 && parseInputPrice(formAmount) > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    {fmtPrice(parseInputPrice(formAmount))} ÷ {formDuration} mois = {fmtPrice(previewMonthly)} / mois
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-[#1a1a2e] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#2a2a4e] transition-all shadow-sm hover:shadow-md active:scale-[0.97]"
                >
                  <Check className="h-4 w-4" /> {editLoan ? 'Enregistrer' : 'Créer le Prêt'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-100 text-gray-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all active:scale-[0.97]"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
