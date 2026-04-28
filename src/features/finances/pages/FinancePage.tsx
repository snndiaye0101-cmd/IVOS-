import { useContextSelector } from '../../../shared/contexts/ContextProvider';
import { YearProvider } from '../../../shared/contexts/YearContext';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, AlertTriangle,
  Users, Wrench, Fuel, Truck, PieChart as PieIcon,
  ArrowRight, Lock, ExternalLink, Clock, FileText,
  ChevronUp, ChevronDown, Receipt, CreditCard, Banknote,
  BarChart3, Activity, CheckCircle2, Target,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid, AreaChart, Area,
} from 'recharts';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { getWorkflowInvoices, getInvoiceStats, type WorkflowInvoice } from '../services/workflowInvoiceService';
import { getAnnualBudget } from '../../../shared/services/budgetService';
import { getCapexTotalByYear } from '../../investments/services/investmentService';

// ─── Data helpers ───────────────────────────────────────────────────
const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

interface FuelAlloc { totalCost: number; date: string }
interface MaintPlan { estimatedCost: number; scheduledDate: string; status: string }

function loadFuel(): FuelAlloc[] {
  try { return JSON.parse(localStorage.getItem('ivos_fuel_allocations_v1') || '[]'); } catch { return []; }
}
function loadMaintenance(): MaintPlan[] {
  try { return JSON.parse(localStorage.getItem('ivos_maintenance_plans_v1') || '[]'); } catch { return []; }
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} K`;
  return n.toLocaleString('fr-FR');
}
function fmtFull(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}
function pctDelta(current: number, prev: number): { pct: string; up: boolean } {
  if (prev === 0) return { pct: current > 0 ? '+100' : '0', up: current > 0 };
  const d = ((current - prev) / Math.abs(prev)) * 100;
  return { pct: (d >= 0 ? '+' : '') + d.toFixed(1), up: d >= 0 };
}
function ageDays(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

const PIE_COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

// Budget prévisionnel annuel (maintenant récupéré dynamiquement)
const MONTHLY_SALARY_ESTIMATE = 4_500_000;
const MONTHLY_BTP = 1_200_000;

const DG_FONCTIONS = ['Directeur Général', 'Directeur des Opérations'];

function isDG(user: { role: string; fonction: string } | null): boolean {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  return DG_FONCTIONS.some(f => user.fonction?.toLowerCase().includes(f.toLowerCase()));
}

// Custom chart tooltip
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs font-bold text-gray-600 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-bold text-gray-800">{fmtFull(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Page Inner ─────────────────────────────────────────────────────
function FinancePageInner() {
  const { site, year } = useContextSelector();
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentYear = year || new Date().getFullYear();
  const userIsDG = isDG(user);

  const [invoices, setInvoices] = useState<WorkflowInvoice[]>([]);
  const [capexTotal, setCapexTotal] = useState<number>(0);
  const [fuel, setFuel] = useState<FuelAlloc[]>([]);
  const [maint, setMaint] = useState<MaintPlan[]>([]);
  const [annualBudget, setAnnualBudget] = useState<number>(getAnnualBudget());

  const reload = useCallback(() => {
    setInvoices(getWorkflowInvoices());
    setCapexTotal(getCapexTotalByYear(currentYear));
    setFuel(loadFuel());
    setMaint(loadMaintenance());
  }, [currentYear]);

  useEffect(() => {
    reload();
    const h = () => reload();
    const hBudget = () => setAnnualBudget(getAnnualBudget());
    window.addEventListener('ivos_invoice_change', h);
    window.addEventListener('ivos_budget_updated', hBudget);
    return () => {
      window.removeEventListener('ivos_invoice_change', h);
      window.removeEventListener('ivos_budget_updated', hBudget);
    };
  }, [reload]);

  // ─── Current Year Computations ─────────────────────────────────
  const yearInvoices = useMemo(() =>
    invoices.filter(i => i.annee === currentYear && (site ? i.siteCode === site.code : true)),
    [invoices, currentYear, site]
  );
  const ca = useMemo(() => yearInvoices.reduce((s, i) => s + i.montantHT, 0), [yearInvoices]);

  const yearFuel = useMemo(() => fuel.filter(f => f.date?.startsWith(String(currentYear))), [fuel, currentYear]);
  const yearMaint = useMemo(() => maint.filter(m => m.scheduledDate?.startsWith(String(currentYear)) && m.status !== 'Annulé'), [maint, currentYear]);

  const totalFuel = useMemo(() => yearFuel.reduce((s, f) => s + (f.totalCost || 0), 0), [yearFuel]);
  const totalMaint = useMemo(() => yearMaint.reduce((s, m) => s + (m.estimatedCost || 0), 0), [yearMaint]);
  const monthsElapsed = Math.min(new Date().getMonth() + 1, 12);
  const totalSalary = MONTHLY_SALARY_ESTIMATE * monthsElapsed;
  const totalBTP = MONTHLY_BTP * monthsElapsed;
  const totalCharges = totalMaint + totalFuel + totalSalary + totalBTP;
  const margeBrute = ca - totalCharges;
  const paidCA = yearInvoices.filter(i => i.status === 'payee').reduce((s, i) => s + i.montantHT, 0);
  const tresorerieNette = paidCA - totalCharges;
  const budgetPct = annualBudget > 0 ? Math.min(Math.round((totalCharges / annualBudget) * 100), 100) : 0;
  const capexBudgetPct = annualBudget > 0 ? Math.min(Math.round((capexTotal / annualBudget) * 100), 100) : 0;
  const capexShareOfSpend = (totalCharges + capexTotal) > 0 ? Math.round((capexTotal / (totalCharges + capexTotal)) * 100) : 0;

  // ─── Previous Year (N-1) for YoY ──────────────────────────────
  const prevYear = currentYear - 1;
  const prevInvoices = useMemo(() => invoices.filter(i => i.annee === prevYear && (site ? i.siteCode === site.code : true)), [invoices, prevYear, site]);
  const prevCA = useMemo(() => prevInvoices.reduce((s, i) => s + i.montantHT, 0), [prevInvoices]);
  const prevFuel = useMemo(() => fuel.filter(f => f.date?.startsWith(String(prevYear))).reduce((s, f) => s + (f.totalCost || 0), 0), [fuel, prevYear]);
  const prevMaint = useMemo(() => maint.filter(m => m.scheduledDate?.startsWith(String(prevYear)) && m.status !== 'Annulé').reduce((s, m) => s + (m.estimatedCost || 0), 0), [maint, prevYear]);
  const prevCharges = prevFuel + prevMaint + MONTHLY_SALARY_ESTIMATE * 12 + MONTHLY_BTP * 12;
  const prevMarge = prevCA - prevCharges;

  // ─── Taux de Recouvrement ──────────────────────────────────────
  const totalFacture = yearInvoices.length;
  const totalPaid = yearInvoices.filter(i => i.status === 'payee').length;
  const recouvrementPct = totalFacture > 0 ? Math.round((totalPaid / totalFacture) * 100) : 0;

  // ─── Monthly chart data ────────────────────────────────────────
  const monthlyData = useMemo(() => {
    return MOIS.map((m, idx) => {
      const mStr = String(idx + 1).padStart(2, '0');
      const prefix = `${currentYear}-${mStr}`;
      const rev = yearInvoices.filter(i => i.createdAt.startsWith(prefix)).reduce((s, i) => s + i.montantHT, 0);
      const fuelM = yearFuel.filter(f => f.date?.startsWith(prefix)).reduce((s, f) => s + (f.totalCost || 0), 0);
      const maintM = yearMaint.filter(x => x.scheduledDate?.startsWith(prefix)).reduce((s, x) => s + (x.estimatedCost || 0), 0);
      const dep = fuelM + maintM + MONTHLY_SALARY_ESTIMATE + MONTHLY_BTP;
      return { name: m, Revenus: rev, Dépenses: dep, Marge: rev - dep };
    });
  }, [yearInvoices, yearFuel, yearMaint, currentYear]);

  // ─── Cumulative trend data ─────────────────────────────────────
  const cumulData = useMemo(() => {
    let cumRev = 0, cumDep = 0;
    return monthlyData.map(d => {
      cumRev += d.Revenus;
      cumDep += d.Dépenses;
      return { name: d.name, 'CA Cumulé': cumRev, 'Charges Cumulées': cumDep };
    });
  }, [monthlyData]);

  // ─── Pie chart data ────────────────────────────────────────────
  const pieData = useMemo(() => [
    { name: 'Maintenance', value: totalMaint },
    { name: 'Carburant', value: totalFuel },
    { name: 'Personnel', value: totalSalary },
    { name: 'Sous-traitance', value: totalBTP },
    { name: 'Divers', value: Math.max(0, totalCharges * 0.02) },
  ].filter(d => d.value > 0), [totalMaint, totalFuel, totalSalary, totalBTP, totalCharges]);

  // ─── Top 5 Clients ────────────────────────────────────────────
  const topClients = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of yearInvoices) {
      map.set(inv.clientNom, (map.get(inv.clientNom) || 0) + inv.montantHT);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total], idx) => ({ rank: idx + 1, name, total }));
  }, [yearInvoices]);

  // ─── Créances by aging brackets ────────────────────────────────
  const unpaidInvoices = useMemo(() =>
    yearInvoices
      .filter(i => i.status !== 'payee' && i.status !== 'annulee')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [yearInvoices]
  );
  const agingBrackets = useMemo(() => {
    const b = { lt30: 0, r3060: 0, r6090: 0, gt90: 0 };
    for (const inv of unpaidInvoices) {
      const d = ageDays(inv.createdAt);
      if (d <= 30) b.lt30 += inv.montantHT;
      else if (d <= 60) b.r3060 += inv.montantHT;
      else if (d <= 90) b.r6090 += inv.montantHT;
      else b.gt90 += inv.montantHT;
    }
    return b;
  }, [unpaidInvoices]);
  const totalUnpaid = agingBrackets.lt30 + agingBrackets.r3060 + agingBrackets.r6090 + agingBrackets.gt90;

  function ageLabel(dateStr: string) {
    const days = ageDays(dateStr);
    if (days <= 30) return { label: '< 30j', color: 'text-green-700 bg-green-50' };
    if (days <= 60) return { label: '30-60j', color: 'text-amber-700 bg-amber-50' };
    if (days <= 90) return { label: '60-90j', color: 'text-orange-700 bg-orange-50' };
    return { label: '> 90j', color: 'text-red-700 bg-red-50' };
  }

  const invStats = getInvoiceStats();

  // ─── KPI deltas ────────────────────────────────────────────────
  const caD = pctDelta(ca, prevCA);
  const chargesD = pctDelta(totalCharges, prevCharges);
  const margeD = pctDelta(margeBrute, prevMarge);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-indigo-900 to-indigo-800 rounded-2xl p-6 text-white shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard Finance</h1>
              <p className="text-indigo-200 text-sm mt-0.5">Vue générale — Exercice {currentYear}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/finances/billing')} className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#1a1a2e] hover:bg-gray-100 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.97]">
              <FileText className="h-4 w-4" /> Facturation
            </button>
            {userIsDG && (
              <button className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 rounded-xl text-sm font-semibold border border-amber-400/30 transition-all active:scale-[0.97]">
                <Lock className="h-4 w-4" /> Clôture d'Exercice
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Scrollable Content ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 space-y-6 py-4">
      
      {/* ─── KPI Cards with YoY ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Chiffre d'Affaires", value: ca, icon: DollarSign, color: 'from-blue-500 to-blue-600', tc: 'text-blue-700', bg: 'bg-blue-50', delta: caD, deltaGoodUp: true },
          { label: 'Total Charges (OPEX)', value: totalCharges, icon: TrendingDown, color: 'from-red-500 to-red-600', tc: 'text-red-700', bg: 'bg-red-50', delta: chargesD, deltaGoodUp: false },
          { label: 'Marge Brute', value: margeBrute, icon: TrendingUp, color: margeBrute >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600', tc: margeBrute >= 0 ? 'text-green-700' : 'text-red-700', bg: margeBrute >= 0 ? 'bg-green-50' : 'bg-red-50', delta: margeD, deltaGoodUp: true },
          { label: 'Trésorerie Nette', value: tresorerieNette, icon: Wallet, color: tresorerieNette >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-orange-500 to-orange-600', tc: tresorerieNette >= 0 ? 'text-emerald-700' : 'text-orange-700', bg: tresorerieNette >= 0 ? 'bg-emerald-50' : 'bg-orange-50' },
        ].map(k => {
          const isGood = k.delta ? (k.deltaGoodUp ? k.delta.up : !k.delta.up) : undefined;
          return (
            <div key={k.label} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${k.color} rounded-l-2xl`} />
              <div className="pl-3">
                <div className="flex items-center justify-between mb-1">
                  <div className={`p-2 ${k.bg} rounded-lg`}>
                    <k.icon className={`h-5 w-5 ${k.tc}`} />
                  </div>
                  {k.delta && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isGood ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {k.delta.up ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {k.delta.pct}%
                    </div>
                  )}
                </div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mt-2">{k.label}</p>
                <p className={`text-lg font-bold ${k.tc} mt-0.5`}>{fmtFull(k.value)}</p>
                {k.delta && <p className="text-[9px] text-gray-400 mt-0.5">vs N-1 ({prevYear})</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Secondary KPI strip ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="p-2 bg-indigo-50 rounded-lg"><Receipt className="h-4 w-4 text-indigo-600" /></div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Factures Émises</p>
            <p className="text-base font-bold text-gray-800">{totalFacture}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="p-2 bg-green-50 rounded-lg"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Taux Recouvrement</p>
            <p className={`text-base font-bold ${recouvrementPct >= 70 ? 'text-green-700' : recouvrementPct >= 40 ? 'text-amber-700' : 'text-red-700'}`}>{recouvrementPct}%</p>
          </div>
        </div>
        <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="p-2 bg-amber-50 rounded-lg"><Clock className="h-4 w-4 text-amber-600" /></div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Encours Impayés</p>
            <p className="text-base font-bold text-amber-700">{fmtFull(totalUnpaid)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="p-2 bg-purple-50 rounded-lg"><Target className="h-4 w-4 text-purple-600" /></div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Budget Consommé</p>
            <p className={`text-base font-bold ${budgetPct >= 90 ? 'text-red-700' : budgetPct >= 70 ? 'text-amber-700' : 'text-green-700'}`}>{budgetPct}%</p>
          </div>
        </div>
        <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="p-2 bg-cyan-50 rounded-lg"><Wallet className="h-4 w-4 text-cyan-600" /></div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Investissements (CAPEX)</p>
            <p className="text-base font-bold text-cyan-700">{fmtFull(capexTotal)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">Suivi des investissements</p>
              <h2 className="text-lg font-bold text-slate-900 mt-1">CAPEX séparé des charges opérationnelles</h2>
            </div>
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
              OPEX et CAPEX isolés
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Charges OPEX', value: totalCharges, tone: 'text-red-700', bg: 'bg-red-50', subtitle: 'Carburant, maintenance, salaires' },
              { label: 'Investissements CAPEX', value: capexTotal, tone: 'text-cyan-700', bg: 'bg-cyan-50', subtitle: 'Projets infra & machines' },
              { label: 'Total dépenses', value: totalCharges + capexTotal, tone: 'text-slate-700', bg: 'bg-slate-100', subtitle: 'Vision consolidée' },
            ].map(item => (
              <div key={item.label} className={`rounded-2xl border border-slate-200 p-4 ${item.bg}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className={`mt-2 text-xl font-bold ${item.tone}`}>{fmtFull(item.value)}</p>
                <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">Capex monitor</p>
          <h2 className="text-lg font-bold text-slate-900 mt-1">Poids des investissements</h2>
          <div className="mt-5 space-y-4 text-sm">
            <div>
              <div className="flex items-center justify-between mb-1 text-slate-600">
                <span>Part CAPEX dans les dépenses</span>
                <span className="font-semibold">{capexShareOfSpend}%</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100">
                <div className="h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${capexShareOfSpend}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1 text-slate-600">
                <span>Consommation CAPEX / budget annuel</span>
                <span className="font-semibold">{capexBudgetPct}%</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100">
                <div className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width: `${capexBudgetPct}%` }} />
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-600">
              <p className="font-semibold text-slate-900">Impact trésorerie après CAPEX</p>
              <p className="mt-1">{fmtFull(tresorerieNette - capexTotal)}</p>
              <p className="mt-1 text-xs">Les investissements restent catégorisés en CAPEX et ne sont pas fusionnés avec l'OPEX.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Charts Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart — Revenus vs Dépenses */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-500" /> Revenus vs Dépenses — Mensuel
          </h2>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={monthlyData} barGap={6} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <RTooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }} />
              <Bar dataKey="Revenus" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Dépenses" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart — Répartition des Charges */}
        <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-indigo-500" /> Répartition des Charges
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={105} innerRadius={65} paddingAngle={3} strokeWidth={2} stroke="#fff"
              >
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <RTooltip formatter={(v: number) => fmtFull(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-gray-600">{d.name}</span>
                </div>
                <span className="font-bold text-gray-800">{totalCharges > 0 ? ((d.value / totalCharges) * 100).toFixed(0) : 0}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Cumulative Trend ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-500" /> Évolution Cumulée — CA vs Charges
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={cumulData}>
            <defs>
              <linearGradient id="gradCA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCharges" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <RTooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: '13px' }} />
            <Area type="monotone" dataKey="CA Cumulé" stroke="#4f46e5" strokeWidth={2.5} fill="url(#gradCA)" />
            <Area type="monotone" dataKey="Charges Cumulées" stroke="#ef4444" strokeWidth={2} fill="url(#gradCharges)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ─── Budget Control ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Contrôle Budgétaire — {currentYear}
        </h2>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">
            <span className="font-bold text-gray-800">{fmtFull(totalCharges)}</span> dépensés sur <span className="font-bold">{fmtFull(annualBudget)}</span> budgétés
          </div>
          <span className={`text-sm font-bold px-2 py-0.5 rounded-md ${budgetPct >= 90 ? 'bg-red-50 text-red-600' : budgetPct >= 70 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
            {budgetPct}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${budgetPct >= 90 ? 'bg-gradient-to-r from-red-500 to-red-600' : budgetPct >= 70 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-green-400 to-green-500'}`}
            style={{ width: `${budgetPct}%` }}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Maintenance', value: totalMaint, icon: Wrench, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Carburant', value: totalFuel, icon: Fuel, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Personnel', value: totalSalary, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', restricted: true },
            { label: 'Sous-traitance', value: totalBTP, icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map(c => {
            const share = totalCharges > 0 ? Math.round((c.value / totalCharges) * 100) : 0;
            return (
              <div key={c.label} className="bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${c.bg}`}><c.icon className={`h-3.5 w-3.5 ${c.color}`} /></div>
                  <p className="text-[10px] uppercase text-gray-400 font-semibold flex-1">{c.label}</p>
                  <span className="text-[9px] font-bold text-gray-400">{share}%</span>
                </div>
                <p className="text-sm font-bold text-gray-800">
                  {c.restricted && !userIsDG ? '••••••••' : fmtFull(c.value)}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1.5">
                  <div className={`h-full rounded-full ${c.bg.replace('bg-', 'bg-')}`} style={{ width: `${share}%`, backgroundColor: c.color.replace('text-', '').includes('indigo') ? '#4f46e5' : c.color.includes('amber') ? '#f59e0b' : c.color.includes('emerald') ? '#10b981' : '#8b5cf6' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Créances & Top Clients Row ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Encours Clients with aging bar */}
        <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" /> Encours Clients
            </h2>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
              {fmtFull(totalUnpaid)}
            </span>
          </div>
          {/* Aging summary bar */}
          {totalUnpaid > 0 && (
            <div className="mb-4">
              <div className="flex rounded-xl overflow-hidden h-3">
                {[
                  { val: agingBrackets.lt30, color: 'bg-green-400' },
                  { val: agingBrackets.r3060, color: 'bg-amber-400' },
                  { val: agingBrackets.r6090, color: 'bg-orange-400' },
                  { val: agingBrackets.gt90, color: 'bg-red-400' },
                ].map((b, i) => {
                  const w = totalUnpaid > 0 ? (b.val / totalUnpaid) * 100 : 0;
                  return w > 0 ? <div key={i} className={`${b.color} transition-all`} style={{ width: `${w}%` }} /> : null;
                })}
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[9px] text-gray-400 font-semibold">
                {[
                  { label: '< 30j', val: agingBrackets.lt30, color: 'text-green-600' },
                  { label: '30-60j', val: agingBrackets.r3060, color: 'text-amber-600' },
                  { label: '60-90j', val: agingBrackets.r6090, color: 'text-orange-600' },
                  { label: '> 90j', val: agingBrackets.gt90, color: 'text-red-600' },
                ].map(b => (
                  <span key={b.label} className={b.val > 0 ? b.color : ''}>{b.label}: {fmt(b.val)}</span>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {unpaidInvoices.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucune créance en cours</p>
            ) : unpaidInvoices.slice(0, 8).map(inv => {
              const age = ageLabel(inv.createdAt);
              return (
                <div key={inv.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${age.color}`}>{age.label}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{inv.clientNom}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{inv.numeroOfficiel}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-800">{fmtFull(inv.montantHT)}</p>
                    <p className="text-[10px] text-gray-400">{new Date(inv.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {unpaidInvoices.length > 0 && (
            <button onClick={() => navigate('/finances/billing')} className="mt-3 text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline">
              Voir toutes les factures <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Top 5 Clients + Dettes */}
        <div className="space-y-4">
          {/* Top 5 Clients */}
          <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" /> Top 5 Clients par CA
            </h2>
            {topClients.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucune donnée</p>
            ) : (
              <div className="space-y-2">
                {topClients.map(c => {
                  const pct = ca > 0 ? Math.round((c.total / ca) * 100) : 0;
                  return (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-300 w-5 text-center">#{c.rank}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm font-medium text-gray-700 truncate mr-2">{c.name}</p>
                          <p className="text-xs font-bold text-gray-800 shrink-0">{fmtFull(c.total)}</p>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 shrink-0">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dettes Fournisseurs */}
          <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" /> Dettes Fournisseurs
              </h2>
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                {fmtFull(totalMaint + totalBTP + totalFuel)}
              </span>
            </div>
            <div className="space-y-2">
              {[
                { name: 'Maintenance Véhicules', amount: totalMaint, icon: Wrench, color: 'bg-indigo-50 text-indigo-700' },
                { name: 'Sous-traitance BTP', amount: totalBTP, icon: Truck, color: 'bg-purple-50 text-purple-700' },
                { name: 'Stations Carburant', amount: totalFuel, icon: Fuel, color: 'bg-amber-50 text-amber-700' },
              ].map(d => (
                <div key={d.name} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${d.color}`}><d.icon className="h-3.5 w-3.5" /></div>
                    <p className="text-sm font-medium text-gray-700">{d.name}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-800">{fmtFull(d.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Invoice Summary ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-500" /> Synthèse Facturation
          </h2>
          <button onClick={() => navigate('/finances/billing')} className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:underline">
            Module Facturation <ExternalLink className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: invStats.total, bg: 'bg-indigo-50', tc: 'text-indigo-700' },
            { label: 'À Valider', value: invStats.aValider, bg: 'bg-amber-50', tc: 'text-amber-700' },
            { label: 'Validées', value: invStats.validees, bg: 'bg-blue-50', tc: 'text-blue-700' },
            { label: 'Envoyées', value: invStats.envoyees, bg: 'bg-purple-50', tc: 'text-purple-700' },
            { label: 'Payées', value: invStats.payees, bg: 'bg-green-50', tc: 'text-green-700' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center hover:scale-[1.02] transition-transform`}>
              <p className="text-[10px] uppercase font-semibold text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.tc}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Quick Navigation ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Facturation', desc: 'Gestion des factures', icon: FileText, route: '/finances/billing', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
          { label: 'Dépenses Globales', desc: 'Suivi des charges', icon: CreditCard, route: '/finances/global-expenses', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
          { label: 'Prêts', desc: 'Gestion des prêts', icon: Banknote, route: '/finances/loans', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: 'Unité Facturation', desc: 'Tarifs & unités', icon: Receipt, route: '/unite-facturation', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
        ].map(nav => (
          <button key={nav.label} onClick={() => navigate(nav.route)} className={`bg-white rounded-xl px-4 py-3.5 shadow-sm border ${nav.border} flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all text-left group`}>
            <div className={`p-2 ${nav.bg} rounded-lg group-hover:scale-110 transition-transform`}>
              <nav.icon className={`h-4 w-4 ${nav.color}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">{nav.label}</p>
              <p className="text-[10px] text-gray-400">{nav.desc}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-gray-300 ml-auto group-hover:text-gray-500 transition-colors" />
          </button>
        ))}
      </div>

      {/* ─── Restricted: DG section ─────────────────────────────── */}
      {userIsDG && (
        <div className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 rounded-2xl p-5 shadow-sm border border-dashed border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-gray-100 rounded-lg"><Lock className="h-3.5 w-3.5 text-gray-500" /></div>
            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Zone Restreinte — Direction Générale</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-shadow">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Masse Salariale ({monthsElapsed} mois)</p>
              <p className="text-lg font-bold text-gray-800 mt-1">{fmtFull(totalSalary)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{fmtFull(MONTHLY_SALARY_ESTIMATE)} / mois</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-shadow">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Budget Restant</p>
              <p className={`text-lg font-bold mt-1 ${annualBudget - totalCharges >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {fmtFull(annualBudget - totalCharges)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">sur {fmtFull(annualBudget)} annuel</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-shadow">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Ratio Charges / CA</p>
              <p className={`text-lg font-bold mt-1 ${ca > 0 && totalCharges / ca > 0.8 ? 'text-red-700' : 'text-emerald-700'}`}>
                {ca > 0 ? ((totalCharges / ca) * 100).toFixed(1) : '0'}%
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Objectif : &lt; 80%</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-shadow">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Rentabilité Nette</p>
              <p className={`text-lg font-bold mt-1 ${margeBrute >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {ca > 0 ? ((margeBrute / ca) * 100).toFixed(1) : '0'}%
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Marge / CA</p>
            </div>
          </div>
        </div>
      )}
      
      </div>
    </div>
  );
}

export default function FinancePage() {
  return (
    <YearProvider>
      <FinancePageInner />
    </YearProvider>
  );
}
