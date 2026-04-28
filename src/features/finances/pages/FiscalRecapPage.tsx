import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';
import payrollRules from '../config/payrollRules.json';
import { personnelStore } from '../../fleet/services/personnelStore';
import { payrollSettingsStore } from '../services/payrollSettingsStore';
import { computeFiscalRecap, type FiscalReportingSlip } from '../services/fiscalReportingService';
import {
  exportFiscalMonthlyStatementsByOrganism,
  exportFiscalRecapToComptableExcel,
  exportFiscalRecapToExcel,
  exportFiscalRecapToPdf,
} from '../services/fiscalRecapExportService';
import { Link } from 'react-router-dom';

const PAYSLIPS_KEY = 'ivos_payslips_v1';
const PAYSLIPS_EVENT = 'ivos_payslips_change';

type PayrollRulesFile = typeof payrollRules;

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(month: string) {
  const [year, rawMonth] = month.split('-');
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return `${months[Math.max(0, Number(rawMonth) - 1)]} ${year}`;
}

function fmtPrice(value: number, currency: string) {
  return `${Math.round(value).toLocaleString('fr-FR')} ${currency}`;
}

function loadPayslips(): FiscalReportingSlip[] {
  try {
    const raw = localStorage.getItem(PAYSLIPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => ({
      employeeId: row.employeeId || '',
      baseSalary: Number(row.baseSalary || 0),
      surSalary: Number(row.surSalary || 0),
      primeTransport: Number(row.primeTransport || 0),
      primePanier: Number(row.primePanier || 0),
      primeAnciennete: Number(row.primeAnciennete || 0),
      retenues: Number(row.retenues || 0),
      loanDeduction: Number(row.loanDeduction || 0),
      automaticTaxEnabled: row.automaticTaxEnabled ?? true,
      countryCode: row.countryCode || (payrollRules as PayrollRulesFile).defaultCountry,
      month: row.month || currentMonth(),
    }));
  } catch {
    return [];
  }
}

function getRule(countryCode: string) {
  const rules = payrollRules as PayrollRulesFile;
  const countryKey = (countryCode in rules.countries ? countryCode : rules.defaultCountry) as keyof PayrollRulesFile['countries'];
  const defaultCountryKey = rules.defaultCountry as keyof PayrollRulesFile['countries'];
  const selected = rules.countries[countryKey] || rules.countries[defaultCountryKey];
  const settings = payrollSettingsStore.load();
  const configured = settings.countries[countryKey] || settings.countries[defaultCountryKey];
  return {
    code: countryKey,
    label: selected.label,
    currency: selected.currency,
    workedUnitLabel: selected.workedUnitLabel,
    defaultWorkedUnits: selected.defaultWorkedUnits,
    employer: selected.employer,
    rates: {
      ipresGeneral: configured.ipresGeneral,
      ipresGeneralEmployer: configured.ipresGeneralEmployer,
      ipresCadre: configured.ipresCadre,
      ipresCadreEmployer: configured.ipresCadreEmployer,
      cssAccidentTravail: configured.cssAccidentTravail,
      cssPrestationsFamiliales: configured.cssPrestationsFamiliales,
      ipm: configured.ipm,
      ipresGeneralCap: configured.ipresGeneralCap,
      ipresCadreCap: configured.ipresCadreCap,
      transportExemptCap: configured.transportExemptCap,
      housingExemptCap: configured.housingExemptCap,
      ir: selected.taxRates.ir,
      cfce: configured.cfce,
      tfpEmployer: configured.tfpEmployer,
    },
    taxBrackets: configured.irBrackets,
    ratesHistory: configured.fiscalHistory.rateTimeline.map((entry) => ({
      startDate: entry.startDate,
      endDate: entry.endDate,
      value: entry.value,
    })),
    taxBracketsHistory: configured.fiscalHistory.bracketTimeline.map((entry) => ({
      startDate: entry.startDate,
      endDate: entry.endDate,
      value: entry.value,
    })),
  };
}

export default function FiscalRecapPage() {
  const rules = payrollRules as PayrollRulesFile;
  const [selectedCountry, setSelectedCountry] = useState(rules.defaultCountry);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [slips, setSlips] = useState<FiscalReportingSlip[]>(() => loadPayslips());
  const [agents, setAgents] = useState(() => personnelStore.load());

  useEffect(() => {
    const reload = () => {
      setSlips(loadPayslips());
      setAgents(personnelStore.load());
    };
    reload();
    window.addEventListener(PAYSLIPS_EVENT, reload);
    window.addEventListener('personnel:updated', reload);
    window.addEventListener(payrollSettingsStore.eventName, reload);
    return () => {
      window.removeEventListener(PAYSLIPS_EVENT, reload);
      window.removeEventListener('personnel:updated', reload);
      window.removeEventListener(payrollSettingsStore.eventName, reload);
    };
  }, []);

  const availableMonths = useMemo(() => {
    const months = new Set(slips.map((slip) => slip.month));
    const values = Array.from(months).sort().reverse();
    return values.length > 0 ? values : [currentMonth()];
  }, [slips]);

  useEffect(() => {
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const rule = useMemo(() => getRule(selectedCountry), [selectedCountry]);
  const recap = useMemo(() => computeFiscalRecap({
    slips,
    agents,
    rule,
    month: selectedMonth,
    countryCode: selectedCountry,
  }), [agents, rule, selectedCountry, selectedMonth, slips]);

  return (
    <div className="w-full space-y-6">
      <div className="bg-gradient-to-r from-[#10233f] via-[#14365f] to-[#0f766e] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Récapitulatif Fiscal</h1>
              <p className="text-cyan-100 text-sm mt-0.5">Synthèse dédiée des montants dus aux organismes fiscaux et sociaux par pays et par mois.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/finances/salary-deductions" className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold border border-white/15 transition-colors">
              Retour à la paie
            </Link>
            <button type="button" onClick={() => exportFiscalRecapToPdf(recap)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#10233f] text-sm font-bold shadow-sm hover:bg-slate-100 transition-colors">
              <FileText className="h-4 w-4" /> Export PDF
            </button>
            <button type="button" onClick={() => exportFiscalRecapToExcel(recap)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold shadow-sm hover:bg-emerald-600 transition-colors">
              <FileSpreadsheet className="h-4 w-4" /> Export Excel
            </button>
            <button type="button" onClick={() => exportFiscalRecapToComptableExcel(recap)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0b4f3d] text-white text-sm font-bold shadow-sm hover:bg-[#0a4436] transition-colors">
              <FileSpreadsheet className="h-4 w-4" /> Excel comptable
            </button>
            <button type="button" onClick={() => exportFiscalMonthlyStatementsByOrganism(recap)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 text-white text-sm font-bold shadow-sm hover:bg-cyan-600 transition-colors">
              <FileText className="h-4 w-4" /> Bordereaux organismes
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">Pays</label>
            <select value={selectedCountry} onChange={(event) => setSelectedCountry(event.target.value)} className="appearance-none w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-8 text-sm text-gray-800">
              {Object.entries(rules.countries).map(([code, country]) => (
                <option key={code} value={code}>{country.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-[38px] h-4 w-4 text-gray-400" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">Mois</label>
            <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm text-gray-800">
              {availableMonths.map((month) => (
                <option key={month} value={month}>{monthLabel(month)}</option>
              ))}
            </select>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Total dû</p>
              <p className="text-lg font-bold text-slate-900">{fmtPrice(recap.grandTotal, rule.currency)}</p>
            </div>
            <Download className="h-5 w-5 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Pays</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{rule.label}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Fiches intégrées</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{recap.slipCount.toLocaleString('fr-FR')}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">Salarial</p>
          <p className="text-lg font-bold text-blue-900 mt-1">{fmtPrice(recap.salarialTotal, rule.currency)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">Patronal</p>
          <p className="text-lg font-bold text-emerald-900 mt-1">{fmtPrice(recap.patronalTotal, rule.currency)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Ventilation des organismes</h2>
            <p className="text-sm text-gray-500 mt-1">Pleine largeur, séparateurs de milliers, alignement à droite et libellés sans slash.</p>
          </div>
          <span className="text-xs font-semibold text-gray-500">{monthLabel(selectedMonth)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Organisme</th>
                <th className="px-5 py-3 text-right text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Salarial</th>
                <th className="px-5 py-3 text-right text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Patronal</th>
                <th className="px-5 py-3 text-right text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {recap.rows.map((row) => (
                <tr key={row.label} className="border-t border-gray-100">
                  <td className="px-5 py-3 font-semibold text-slate-900">{row.label}</td>
                  <td className="px-5 py-3 text-right text-slate-700 tabular-nums">{fmtPrice(row.salarial, rule.currency)}</td>
                  <td className="px-5 py-3 text-right text-slate-700 tabular-nums">{fmtPrice(row.patronal, rule.currency)}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900 tabular-nums">{fmtPrice(row.total, rule.currency)}</td>
                </tr>
              ))}
              {recap.rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">Aucune fiche de paie disponible pour ce périmètre.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td className="px-5 py-3 font-bold text-slate-900">Total global</td>
                <td className="px-5 py-3 text-right font-bold text-slate-900 tabular-nums">{fmtPrice(recap.salarialTotal, rule.currency)}</td>
                <td className="px-5 py-3 text-right font-bold text-slate-900 tabular-nums">{fmtPrice(recap.patronalTotal, rule.currency)}</td>
                <td className="px-5 py-3 text-right font-black text-emerald-800 tabular-nums">{fmtPrice(recap.grandTotal, rule.currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Détail Technique par Organisme</h2>
            <p className="text-sm text-gray-500 mt-1">Assiettes, taux et montants cumulés par ligne technique pour {rule.label.toLowerCase()}.</p>
          </div>
          <span className="text-xs font-semibold text-gray-500">{recap.detailRows.length} ligne(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-emerald-50">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">Organisme</th>
                <th className="px-5 py-3 text-right text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">Base sal.</th>
                <th className="px-5 py-3 text-right text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">Taux sal.</th>
                <th className="px-5 py-3 text-right text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">Salarial</th>
                <th className="px-5 py-3 text-right text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">Base pat.</th>
                <th className="px-5 py-3 text-right text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">Taux pat.</th>
                <th className="px-5 py-3 text-right text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">Patronal</th>
              </tr>
            </thead>
            <tbody>
              {recap.detailRows.map((row) => (
                <tr key={row.label} className="border-t border-gray-100">
                  <td className="px-5 py-3 font-semibold text-slate-900">{row.label}</td>
                  <td className="px-5 py-3 text-right text-slate-700 tabular-nums">{fmtPrice(row.baseSalarial, rule.currency)}</td>
                  <td className="px-5 py-3 text-right text-slate-700 tabular-nums">{row.tauxSalarial == null ? 'Barème' : `${(row.tauxSalarial * 100).toFixed(2)}%`}</td>
                  <td className="px-5 py-3 text-right text-slate-700 tabular-nums">{fmtPrice(row.salarial, rule.currency)}</td>
                  <td className="px-5 py-3 text-right text-slate-700 tabular-nums">{fmtPrice(row.basePatronal, rule.currency)}</td>
                  <td className="px-5 py-3 text-right text-slate-700 tabular-nums">{row.tauxPatronal == null ? 'Barème' : `${(row.tauxPatronal * 100).toFixed(2)}%`}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900 tabular-nums">{fmtPrice(row.patronal, rule.currency)}</td>
                </tr>
              ))}
              {recap.detailRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">Aucun détail technique disponible pour ce périmètre.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}