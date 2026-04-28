import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Edit3, Trash2, Search, Check, X, Receipt,
  ChevronDown, Users, Truck, DollarSign, TrendingDown,
  CalendarDays, Upload, Tag, FileText, AlertCircle,
  Fuel, Wrench, HardHat, Package, Building2, MoreHorizontal,
  RefreshCw, Lock,
} from 'lucide-react';
import { personnelStore, type PersonnelAgent } from '../../fleet/services/personnelStore';
import { vehiclesStore } from '../../fleet/services/vehiclesStore';
import { carburantStore } from '../../fleet/services/carburantStore';
import {
  type ExpenseCategory,
  type AffectationType,
  type Expense,
  STORAGE_KEY,
  CHANGE_EVENT,
  loadExpenses,
  saveExpenses,
} from '../services/globalExpensesService';

const CATEGORIES: { value: ExpenseCategory; label: string; icon: typeof Fuel; color: string; bg: string }[] = [
  { value: 'Carburant', label: 'Carburant', icon: Fuel, color: 'text-orange-700', bg: 'bg-orange-50' },
  { value: 'Carburant / Logistique', label: 'Carburant / Logistique', icon: Fuel, color: 'text-orange-800', bg: 'bg-orange-100' },
  { value: 'Assurance', label: 'Assurance', icon: Building2, color: 'text-indigo-700', bg: 'bg-indigo-50' },
  { value: 'Entretien Véhicule', label: 'Entretien Véhicule', icon: Wrench, color: 'text-blue-700', bg: 'bg-blue-50' },
  { value: 'EPI', label: 'EPI', icon: HardHat, color: 'text-amber-700', bg: 'bg-amber-50' },
  { value: 'Logistique', label: 'Logistique', icon: Package, color: 'text-purple-700', bg: 'bg-purple-50' },
  { value: 'Administratif', label: 'Administratif', icon: Building2, color: 'text-indigo-700', bg: 'bg-indigo-50' },
  { value: 'Autre', label: 'Autre', icon: MoreHorizontal, color: 'text-gray-700', bg: 'bg-gray-100' },
];

function catMeta(cat: ExpenseCategory) {
  return CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];
}

const SEED_EXPENSES: Expense[] = [
  { id: 1, label: 'Gasoil Camion Benne 01', category: 'Carburant', amount: 185000, date: '2026-04-10', affectationType: 'vehicle', affectationId: 'v1', affectationName: 'DK-1234-AB', createdAt: '2026-04-10T08:30:00' },
  { id: 2, label: 'Vidange complète', category: 'Entretien Véhicule', amount: 275000, date: '2026-04-08', affectationType: 'vehicle', affectationId: 'v2', affectationName: 'DK-5678-CD', createdAt: '2026-04-08T14:00:00' },
  { id: 3, label: 'Gants et casques chantier', category: 'EPI', amount: 120000, date: '2026-04-05', affectationType: 'employee', affectationId: 'ag3', affectationName: 'Ousmane Ndiaye', createdAt: '2026-04-05T10:00:00' },
  { id: 4, label: 'Transport matériel Touba', category: 'Logistique', amount: 350000, date: '2026-04-04', affectationType: 'none', affectationId: '', affectationName: '', createdAt: '2026-04-04T11:00:00' },
  { id: 5, label: 'Ramettes papier A4', category: 'Administratif', amount: 45000, date: '2026-04-02', affectationType: 'none', affectationId: '', affectationName: '', createdAt: '2026-04-02T09:00:00' },
  { id: 6, label: 'Gasoil Camion Citerne', category: 'Carburant', amount: 210000, date: '2026-03-28', affectationType: 'vehicle', affectationId: 'v3', affectationName: 'DK-9012-EF', createdAt: '2026-03-28T07:00:00' },
  { id: 7, label: 'Pneus avant remplacement', category: 'Entretien Véhicule', amount: 480000, date: '2026-03-20', affectationType: 'vehicle', affectationId: 'v1', affectationName: 'DK-1234-AB', createdAt: '2026-03-20T15:30:00' },
  { id: 8, label: 'Prime terrain équipe Nord', category: 'Autre', amount: 150000, date: '2026-03-15', affectationType: 'employee', affectationId: 'ag1', affectationName: 'Mamadou Diallo', createdAt: '2026-03-15T12:00:00' },
];

function _loadExpensesWithSeed(): Expense[] {
  const fromService = loadExpenses();
  if (fromService.length > 0) return fromService;
  saveExpenses(SEED_EXPENSES);
  return SEED_EXPENSES;
}

// ─── Helpers ────────────────────────────────────────────────────────
function fmtPrice(n: number) { return n.toLocaleString('fr-FR') + ' FCFA'; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
function formatInputPrice(value: string): string {
  const num = value.replace(/\D/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('fr-FR');
}
function parseInputPrice(value: string): number {
  return Number(value.replace(/\s/g, '').replace(/\./g, '')) || 0;
}

function getMonthOptions(expenses: Expense[]): { value: string; label: string }[] {
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const set = new Set(expenses.map(e => e.date.slice(0, 7)));
  return Array.from(set).sort().reverse().map(m => {
    const [y, mo] = m.split('-');
    return { value: m, label: `${months[Number(mo) - 1]} ${y}` };
  });
}

// ─── Component ──────────────────────────────────────────────────────
export default function GlobalExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>(_loadExpensesWithSeed);
  const [agents, setAgents] = useState<PersonnelAgent[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; registration: string }[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<'' | ExpenseCategory>('');
  const [monthFilter, setMonthFilter] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editExp, setEditExp] = useState<Expense | null>(null);
  const [fLabel, setFLabel] = useState('');
  const [fCategory, setFCategory] = useState<ExpenseCategory>('Carburant');
  const [fAmount, setFAmount] = useState('');
  const [fDate, setFDate] = useState('');
  const [fAffType, setFAffType] = useState<AffectationType>('none');
  const [fAffId, setFAffId] = useState('');
  const [fAttachment, setFAttachment] = useState('');

  // Delete confirm
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // Drag-drop ref
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setAgents(personnelStore.load());
    const h = () => setAgents(personnelStore.load());
    window.addEventListener('personnel:updated', h);
    return () => window.removeEventListener('personnel:updated', h);
  }, []);

  useEffect(() => {
    try {
      const v = vehiclesStore.load();
      setVehicles(v.map((veh: Record<string, string>) => ({ id: veh.id || veh.registration, registration: veh.registration || veh.immatriculation || 'N/A' })));
    } catch { /* no vehicles */ }
    const h = () => {
      try {
        const v = vehiclesStore.load();
        setVehicles(v.map((veh: Record<string, string>) => ({ id: veh.id || veh.registration, registration: veh.registration || veh.immatriculation || 'N/A' })));
      } catch { /* ignore */ }
    };
    window.addEventListener('fleetVehicles:updated', h);
    return () => window.removeEventListener('fleetVehicles:updated', h);
  }, []);

  useEffect(() => {
    const h = () => setExpenses(loadExpenses());
    window.addEventListener(CHANGE_EVENT, h);
    return () => window.removeEventListener(CHANGE_EVENT, h);
  }, []);

  // ─── Computed ──────────────────────────────────────────────────
  const monthOptions = useMemo(() => getMonthOptions(expenses), [expenses]);

  const filtered = useMemo(() => {
    let list = expenses;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.label.toLowerCase().includes(q) || e.affectationName.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
    }
    if (catFilter) list = list.filter(e => e.category === catFilter);
    if (monthFilter) list = list.filter(e => e.date.startsWith(monthFilter));
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, search, catFilter, monthFilter]);

  const stats = useMemo(() => {
    const now = new Date().toISOString().slice(0, 7);
    const thisMonth = expenses.filter(e => e.date.startsWith(now));
    const totalMonth = thisMonth.reduce((s, e) => s + e.amount, 0);
    const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);
    const totalAll = expenses.reduce((s, e) => s + e.amount, 0);
    // category breakdown for current month
    const byCat: Record<string, number> = {};
    thisMonth.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    const topCategory = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    return { count: filtered.length, totalMonth, totalFiltered, totalAll, topCategory };
  }, [expenses, filtered]);

  // ─── Affectation name resolver ─────────────────────────────────
  const getAffName = useCallback((type: AffectationType, id: string): string => {
    if (type === 'employee') {
      const a = agents.find(a => a.id === id);
      return a ? `${a.firstName} ${a.lastName}` : id;
    }
    if (type === 'vehicle') {
      const v = vehicles.find(v => v.id === id);
      return v ? v.registration : id;
    }
    return '';
  }, [agents, vehicles]);

  // ─── Modal handlers ────────────────────────────────────────────
  const openCreate = () => {
    setEditExp(null);
    setFLabel(''); setFCategory('Carburant'); setFAmount('');
    setFDate(new Date().toISOString().slice(0, 10));
    setFAffType('none'); setFAffId(''); setFAttachment('');
    setShowModal(true);
  };
  const openEdit = (exp: Expense) => {
    setEditExp(exp);
    setFLabel(exp.label); setFCategory(exp.category);
    setFAmount(exp.amount.toLocaleString('fr-FR'));
    setFDate(exp.date);
    setFAffType(exp.affectationType); setFAffId(exp.affectationId);
    setFAttachment(exp.attachment || '');
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditExp(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInputPrice(fAmount);
    if (!fLabel || amount <= 0 || !fDate) return;
    const affName = getAffName(fAffType, fAffId);

    if (editExp) {
      const updated = expenses.map(ex =>
        ex.id === editExp.id ? {
          ...ex, label: fLabel, category: fCategory, amount, date: fDate,
          affectationType: fAffType, affectationId: fAffId, affectationName: affName,
          attachment: fAttachment || undefined,
        } : ex
      );
      setExpenses(updated);
      saveExpenses(updated);
      // ←─ Sync bidirectionnel : si c'est une dépense carburant auto, mettre à jour le plein source
      if (editExp.fuelPleinId !== undefined) {
        try {
          carburantStore.update(editExp.fuelPleinId, {
            montant: amount,
            date: fDate,
          });
        } catch { /* ne pas bloquer */ }
      }
    } else {
      const newExp: Expense = {
        id: Date.now(), label: fLabel, category: fCategory, amount, date: fDate,
        affectationType: fAffType, affectationId: fAffId, affectationName: affName,
        attachment: fAttachment || undefined,
        createdAt: new Date().toISOString(),
      };
      const updated = [...expenses, newExp];
      setExpenses(updated);
      saveExpenses(updated);
    }
    closeModal();
  };

  const handleDelete = (id: number) => {
    const exp = expenses.find(e => e.id === id);
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    saveExpenses(updated);
    setPendingDeleteId(null);
    // Si la dépense est liée à un plein carburant, supprimer aussi le plein source
    if (exp?.fuelPleinId !== undefined) {
      try { carburantStore.remove(exp.fuelPleinId); } catch { /* ne pas bloquer */ }
    }
  };

  // File drop handler (stores filename only for demo)
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setFAttachment(file.name);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFAttachment(file.name);
  };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-red-900 to-red-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Suivi des Dépenses</h1>
              <p className="text-red-200 text-sm mt-0.5">Dépenses Globales — Catégorisées & Affectées</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white hover:bg-emerald-400 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" /> Nouvelle Dépense
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Cumul du Mois', value: fmtPrice(stats.totalMonth), icon: CalendarDays, tc: 'text-red-600', bg: 'bg-red-50', color: 'from-red-400 to-red-500' },
          { label: 'Nb Dépenses Affichées', value: String(stats.count), icon: FileText, tc: 'text-blue-700', bg: 'bg-blue-50', color: 'from-blue-500 to-blue-600' },
          { label: 'Total Affiché', value: fmtPrice(stats.totalFiltered), icon: DollarSign, tc: 'text-indigo-700', bg: 'bg-indigo-50', color: 'from-indigo-500 to-indigo-600' },
          { label: stats.topCategory ? `Top: ${stats.topCategory[0]}` : 'Top Catégorie', value: stats.topCategory ? fmtPrice(stats.topCategory[1]) : '—', icon: TrendingDown, tc: 'text-amber-700', bg: 'bg-amber-50', color: 'from-amber-400 to-amber-500' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${k.color} rounded-l-2xl`} />
            <div className="pl-3">
              <div className={`p-2 ${k.bg} rounded-lg w-fit mb-2`}>
                <k.icon className={`h-4 w-4 ${k.tc}`} />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{k.label}</p>
              <p className={`text-lg font-bold ${k.tc} mt-0.5 truncate`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par libellé, bénéficiaire, catégorie..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setCatFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${!catFilter ? 'bg-[#1a1a2e] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >Tous</button>
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCatFilter(c.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${catFilter === c.value ? 'bg-[#1a1a2e] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >{c.label}</button>
          ))}
        </div>
        {monthOptions.length > 0 && (
          <div className="relative">
            <select
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-400/20 cursor-pointer"
            >
              <option value="">Tous les mois</option>
              {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>
        )}
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{filtered.length} dépense{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Total Banner */}
      {filtered.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl px-6 py-3 flex items-center justify-between shadow-sm">
          <span className="text-sm text-gray-500 font-medium">Total de la sélection</span>
          <span className="text-lg font-bold text-red-700">{fmtPrice(stats.totalFiltered)}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Date</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Catégorie</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Libellé</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Bénéficiaire / Véhicule</th>
                <th className="text-right px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Montant</th>
                <th className="text-right px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-sm text-gray-400">Aucune dépense trouvée</td></tr>
              ) : filtered.map(exp => {
                const meta = catMeta(exp.category);
                const CatIcon = meta.icon;
                const isDeleting = pendingDeleteId === exp.id;

                return (
                  <tr key={exp.id} className="group hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <CalendarDays className="h-3 w-3 text-gray-300" />
                        {fmtDate(exp.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${meta.bg} ${meta.color}`}>
                        <CatIcon className="h-3 w-3" /> {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-800">{exp.label}</p>
                      {exp.isAutoSync && (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-50 text-orange-600 border border-orange-100">
                          <RefreshCw className="h-2.5 w-2.5" /> Auto-sync Hub Carburant
                        </span>
                      )}
                      {exp.attachment && (
                        <p className="text-[9px] text-gray-400 flex items-center gap-1 mt-0.5"><Upload className="h-2.5 w-2.5" />{exp.attachment}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {exp.affectationType !== 'none' ? (
                        <div className="flex items-center gap-1.5">
                          {exp.affectationType === 'employee' ? <Users className="h-3 w-3 text-indigo-400" /> : <Truck className="h-3 w-3 text-emerald-400" />}
                          <span className="text-xs text-gray-600">{exp.affectationName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-gray-900">{fmtPrice(exp.amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                      {isDeleting ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[10px] text-red-500 font-semibold mr-1">Supprimer ?</span>
                          <button onClick={() => handleDelete(exp.id)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"><Check className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setPendingDeleteId(null)} className="p-1.5 bg-gray-200 text-gray-500 rounded-lg hover:bg-gray-300 transition-colors"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(exp)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-indigo-100 hover:text-indigo-600 transition-colors" title={exp.isAutoSync ? 'Modifier (sync bidirectionnelle active)' : 'Modifier'}>
                            {exp.isAutoSync ? <Lock className="h-3.5 w-3.5 text-orange-400" /> : <Edit3 className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => setPendingDeleteId(exp.id)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors" title="Supprimer"><Trash2 className="h-3.5 w-3.5" /></button>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1a1a2e] to-red-900 px-6 py-4 text-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/15 rounded-lg"><Receipt className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-lg font-bold">{editExp ? 'Modifier la Dépense' : 'Nouvelle Dépense'}</h2>
                  <p className="text-red-200 text-xs">Formulaire détaillé avec affectation</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Libellé */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
                  Libellé <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                  <input
                    type="text" value={fLabel} onChange={e => setFLabel(e.target.value)}
                    placeholder="Ex: Gasoil Camion Benne, Vidange..."
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Catégorie */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
                    Catégorie <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={fCategory} onChange={e => setFCategory(e.target.value as ExpenseCategory)}
                      required
                      className="w-full pl-4 pr-8 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all cursor-pointer"
                    >
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                  </div>
                </div>

                {/* Montant */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
                    Montant (FCFA) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <input
                      type="text" inputMode="numeric"
                      value={fAmount} onChange={e => setFAmount(formatInputPrice(e.target.value))}
                      placeholder="0"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
                  Date <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                  <input
                    type="date" value={fDate} onChange={e => setFDate(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Affectation */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
                  Affectation (optionnel)
                </label>
                <div className="flex gap-2 mb-2">
                  {([['none', 'Aucune'], ['employee', 'Employé'], ['vehicle', 'Véhicule']] as const).map(([val, label]) => (
                    <button
                      key={val} type="button"
                      onClick={() => { setFAffType(val); setFAffId(''); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${fAffType === val ? 'bg-[#1a1a2e] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >{label}</button>
                  ))}
                </div>
                {fAffType === 'employee' && (
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <select
                      value={fAffId} onChange={e => setFAffId(e.target.value)}
                      className="w-full pl-10 pr-8 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="">Sélectionner un employé...</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName} — {a.matricule}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                  </div>
                )}
                {fAffType === 'vehicle' && (
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <select
                      value={fAffId} onChange={e => setFAffId(e.target.value)}
                      className="w-full pl-10 pr-8 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="">Sélectionner un véhicule...</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Pièce jointe — Drag & Drop */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
                  Pièce Jointe (optionnel)
                </label>
                <div
                  ref={dropRef}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  className={`relative rounded-xl border-2 border-dashed p-4 text-center transition-all cursor-pointer ${
                    dragOver ? 'border-red-400 bg-red-50' : fAttachment ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="file" onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                  />
                  {fAttachment ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">{fAttachment}</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setFAttachment(''); }} className="p-0.5 rounded bg-red-100 text-red-500 hover:bg-red-200 ml-2"><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-5 w-5 text-gray-300" />
                      <p className="text-xs text-gray-400">Glisser-déposer ou cliquer • PDF, JPG, PNG</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount preview */}
              {parseInputPrice(fAmount) > 0 && (
                <div className="bg-red-50 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Montant enregistré</span>
                  </div>
                  <span className="text-lg font-bold text-red-700">{fmtPrice(parseInputPrice(fAmount))}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-500 transition-all shadow-sm hover:shadow-md active:scale-[0.97]"
                >
                  <Check className="h-4 w-4" /> {editExp ? 'Enregistrer' : 'Ajouter la Dépense'}
                </button>
                <button
                  type="button" onClick={closeModal}
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
