import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, Edit3, Trash2, Search, Check, X, Printer, Mail,
  ChevronDown, Users, DollarSign, TrendingUp, FileText,
  CheckCircle2, Clock, Shield, AlertCircle,
} from 'lucide-react';
import { computeFiscalParts, personnelStore, type PersonnelAgent } from '../../fleet/services/personnelStore';
import { heuresStore } from '../../personnel/services/heuresStore';
import { getMonthlyLoanDeduction } from '../pages/LoanManagementPage';
import { useAuth } from '../../../shared/contexts/AuthContext';
import payrollRules from '../config/payrollRules.json';
import { computePayroll, generatePayrollPdf, type PayrollCountryRule } from '../services/payrollPdfService';
import { archivePayslipToEmployeeDossier } from '../../personnel/services/documentStore';
import { savePayrollDraft, lockPayrollDraft } from '../services/payrollDraftService';
import { payrollSettingsStore, type PayrollCountrySettings, type PayrollSettings } from '../services/payrollSettingsStore';
import { computeFiscalRecap } from '../services/fiscalReportingService';
import { Link } from 'react-router-dom';
import { exportFiscalRecapToExcel, exportFiscalRecapToPdf } from '../services/fiscalRecapExportService';

// ─── Types & Storage ────────────────────────────────────────────────
type PayslipStatus = 'Brouillon' | 'Validé' | 'Payé';

interface VariableElement {
  id: string;
  label: string;
  kind: 'gain' | 'retenue';
  amount: number;
  details?: {
    quantity: number;
    unitLabel: string;
    baseRate: number;
    multiplier: number;
  };
}

interface Payslip {
  id: number;
  employeeId: string;
  employeeName: string;
  employeeMatricule: string;
  baseSalaryLabel: string;
  baseSalary: number;
  surSalaryLabel: string;
  surSalary: number;
  primeTransportLabel: string;
  primeTransport: number;
  primePanierLabel: string;
  primePanier: number;
  primeAncienneteLabel: string;
  primeAnciennete: number;
  bonus: number;
  retenuesLabel: string;
  retenues: number;
  loanDeduction: number;
  net: number;
  workedUnits: number;
  leaveAcquired: number;
  leaveTaken: number;
  countryCode: string;
  month: string;        // "2026-04"
  status: PayslipStatus;
  locked?: boolean;
  automaticTaxEnabled?: boolean;
  createdAt: string;
  validatedBy?: string;
  variableElements?: VariableElement[];
}

interface PayrollRulesFile {
  defaultCountry: string;
  countries: Record<string, {
    label: string;
    currency: string;
    workedUnitLabel: string;
    defaultWorkedUnits: number;
    employer: {
      companyName: string;
      address: string;
      ninea: string;
      ipres: string;
      css: string;
    };
    socialRates: {
      ipresGeneral: number;
      ipresCadre: number;
      cssAccidentTravail: number;
      cssPrestationsFamiliales: number;
      ipm: number;
    };
    taxRates: {
      ir: number;
      cfce: number;
      tfp?: number;
    };
  }>;
}

const RULES = payrollRules as PayrollRulesFile;

const STORAGE_KEY = 'ivos_payslips_v1';
const CHANGE_EVENT = 'ivos_payslips_change';
const AUTO_IDS = {
  hs15: 'auto_hs_15',
  hs40: 'auto_hs_40',
  hs60: 'auto_hs_60',
  night35: 'auto_night_majoration_35',
} as const;

function isAutoCompensationId(id: string) {
  return Object.values(AUTO_IDS).includes(id as (typeof AUTO_IDS)[keyof typeof AUTO_IDS]);
}

// Base salaries per role (FCFA)
const BASE_SALARY_MAP: Record<string, number> = {
  'Chauffeurs': 350000,
  'Administratif': 450000,
  'Opérateurs': 300000,
  'Mécaniciens': 400000,
};
const DEFAULT_BASE_SALARY = 300000;

function getBaseSalary(role: string): number {
  return BASE_SALARY_MAP[role] || DEFAULT_BASE_SALARY;
}

const SEED_PAYSLIPS: Payslip[] = [
  { id: 1, employeeId: 'ag1', employeeName: 'Mamadou Diallo', employeeMatricule: 'IVOS-CH-001', baseSalaryLabel: 'Salaire de base', baseSalary: 350000, surSalaryLabel: 'Sursalaire', surSalary: 0, primeTransportLabel: 'Prime transport', primeTransport: 40000, primePanierLabel: 'Prime panier', primePanier: 20000, primeAncienneteLabel: 'Prime ancienneté', primeAnciennete: 15000, bonus: 75000, retenuesLabel: 'Retenues diverses', retenues: 100000, loanDeduction: 100000, net: 325000, workedUnits: 173.33, leaveAcquired: 2.5, leaveTaken: 1, countryCode: 'SN', month: '2026-04', status: 'Brouillon', locked: false, createdAt: '2026-04-01T09:00:00', variableElements: [] },
  { id: 2, employeeId: 'ag2', employeeName: 'Fatou Sow', employeeMatricule: 'IVOS-AD-003', baseSalaryLabel: 'Salaire de base', baseSalary: 450000, surSalaryLabel: 'Sursalaire', surSalary: 0, primeTransportLabel: 'Prime transport', primeTransport: 25000, primePanierLabel: 'Prime panier', primePanier: 15000, primeAncienneteLabel: 'Prime ancienneté', primeAnciennete: 10000, bonus: 50000, retenuesLabel: 'Retenues diverses', retenues: 100000, loanDeduction: 100000, net: 400000, workedUnits: 173.33, leaveAcquired: 2.5, leaveTaken: 0, countryCode: 'SN', month: '2026-04', status: 'Validé', locked: true, createdAt: '2026-04-01T09:00:00', variableElements: [] },
  { id: 3, employeeId: 'ag3', employeeName: 'Ousmane Ndiaye', employeeMatricule: 'IVOS-OP-007', baseSalaryLabel: 'Salaire de base', baseSalary: 300000, surSalaryLabel: 'Sursalaire', surSalary: 20000, primeTransportLabel: 'Prime transport', primeTransport: 50000, primePanierLabel: 'Prime panier', primePanier: 30000, primeAncienneteLabel: 'Prime ancienneté', primeAnciennete: 0, bonus: 100000, retenuesLabel: 'Retenues diverses', retenues: 125000, loanDeduction: 125000, net: 275000, workedUnits: 173.33, leaveAcquired: 2.5, leaveTaken: 2, countryCode: 'SN', month: '2026-04', status: 'Payé', locked: true, createdAt: '2026-04-01T09:00:00', validatedBy: 'Admin DG', variableElements: [] },
  { id: 4, employeeId: 'ag5', employeeName: 'Ibrahima Fall', employeeMatricule: 'IVOS-MC-002', baseSalaryLabel: 'Salaire de base', baseSalary: 400000, surSalaryLabel: 'Sursalaire', surSalary: 10000, primeTransportLabel: 'Prime transport', primeTransport: 30000, primePanierLabel: 'Prime panier', primePanier: 20000, primeAncienneteLabel: 'Prime ancienneté', primeAnciennete: 0, bonus: 60000, retenuesLabel: 'Retenues diverses', retenues: 100000, loanDeduction: 100000, net: 360000, workedUnits: 173.33, leaveAcquired: 2.5, leaveTaken: 0, countryCode: 'SN', month: '2026-03', status: 'Payé', locked: true, createdAt: '2026-03-01T09:00:00', validatedBy: 'Admin DG', variableElements: [] },
];

function loadPayslips(): Payslip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((row: Partial<Payslip>) => {
          const legacyBonus = Number(row.bonus || 0);
          const primeTransport = Number(row.primeTransport ?? legacyBonus);
          const primePanier = Number(row.primePanier ?? 0);
          const primeAnciennete = Number(row.primeAnciennete ?? 0);
          return {
            id: Number(row.id || Date.now()),
            employeeId: row.employeeId || '',
            employeeName: row.employeeName || '',
            employeeMatricule: row.employeeMatricule || '',
            baseSalaryLabel: row.baseSalaryLabel || 'Salaire de base',
            baseSalary: Number(row.baseSalary || 0),
            surSalaryLabel: row.surSalaryLabel || 'Sursalaire',
            surSalary: Number(row.surSalary || 0),
            primeTransportLabel: row.primeTransportLabel || 'Prime transport',
            primeTransport,
            primePanierLabel: row.primePanierLabel || 'Prime panier',
            primePanier,
            primeAncienneteLabel: row.primeAncienneteLabel || 'Prime ancienneté',
            primeAnciennete,
            bonus: Number(row.bonus ?? (primeTransport + primePanier + primeAnciennete)),
            retenuesLabel: row.retenuesLabel || 'Retenues diverses',
            retenues: Number(row.retenues || 0),
            loanDeduction: Number(row.loanDeduction || 0),
            net: Number(row.net || 0),
            workedUnits: Number(row.workedUnits || 173.33),
            leaveAcquired: Number(row.leaveAcquired || 2.5),
            leaveTaken: Number(row.leaveTaken || 0),
            countryCode: row.countryCode || RULES.defaultCountry,
            month: row.month || currentMonth(),
            status: (row.status as PayslipStatus) || 'Brouillon',
            locked: Boolean(row.locked || row.status === 'Validé' || row.status === 'Payé'),
            automaticTaxEnabled: row.automaticTaxEnabled ?? true,
            createdAt: row.createdAt || new Date().toISOString(),
            validatedBy: row.validatedBy,
            variableElements: Array.isArray(row.variableElements) ? row.variableElements as VariableElement[] : [],
          };
        });
      }
    }
  } catch { /* ignore */ }
  return SEED_PAYSLIPS;
}
function savePayslips(list: Payslip[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

// ─── Helpers ────────────────────────────────────────────────────────
function fmtPrice(n: number) { return n.toLocaleString('fr-FR') + ' FCFA'; }
function formatInputPrice(value: string): string {
  const num = value.replace(/\D/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('fr-FR');
}
function parseInputPrice(value: string): number {
  return Number(value.replace(/\s/g, '').replace(/\./g, '')) || 0;
}

const DG_FONCTIONS = ['Directeur Général', 'Directeur Administratif', 'Directeur Financier', 'Directeur des Opérations'];
function canValidate(user: { role: string; fonction: string } | null): boolean {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  return DG_FONCTIONS.some(f => user.fonction?.toLowerCase().includes(f.toLowerCase()));
}

function canEditDraft(user: { role: string; fonction: string } | null): boolean {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  const fonction = (user.fonction || '').toLowerCase();
  return fonction.includes('rh') || fonction.includes('ressources humaines') || fonction.includes('responsable rh');
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(m: string): string {
  const [y, mo] = m.split('-');
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return `${months[Number(mo) - 1]} ${y}`;
}

function getRoleCategory(role: string): string {
  if (role.includes('Admin')) return 'Administration';
  if (role.includes('Chauffeur') || role.includes('Opérateur') || role.includes('Helper')) return 'Exploitation';
  if (role.includes('Mécanicien')) return 'Technique';
  if (role.includes('sécurité') || role.includes('Sécurité')) return 'Sécurité';
  return 'Personnel';
}

function inferQualification(role: string): 'Ouvrier' | 'Agent de Maîtrise' | 'Cadre' {
  const lower = role.toLowerCase();
  if (lower.includes('administratif') || lower.includes('responsable') || lower.includes('directeur') || lower.includes('comptable')) {
    return 'Cadre';
  }
  if (lower.includes('sécurité') || lower.includes('mécanicien') || lower.includes('opérateur')) {
    return 'Agent de Maîtrise';
  }
  return 'Ouvrier';
}

function inferIrParts(agent: PersonnelAgent | undefined): number {
  if (!agent) return 1;
  const custom = Number(agent.taxParts);
  if (Number.isFinite(custom) && custom > 0) return custom;
  return computeFiscalParts({ spouses: agent.spouses, children: agent.children });
}

function resolveIrParts(agent: PersonnelAgent | undefined, useFiscalParts: boolean): number {
  if (!useFiscalParts) return 1;
  return inferIrParts(agent);
}

function isCadreRole(agent: PersonnelAgent | undefined): boolean {
  if (!agent) return false;
  if (agent.fiscalStatus) return agent.fiscalStatus === 'Cadre';
  const lowerRole = agent.role.toLowerCase();
  return lowerRole.includes('responsable') || lowerRole.includes('administratif') || lowerRole.includes('directeur') || lowerRole.includes('comptable');
}

function getRule(countryCode: string, settings: PayrollSettings): PayrollCountryRule {
  const selected = RULES.countries[countryCode] || RULES.countries[RULES.defaultCountry];
  const configured = settings.countries[countryCode] || settings.countries[RULES.defaultCountry];
  return {
    code: countryCode,
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

function computeAutomaticCompensations(agent: PersonnelAgent | undefined, month: string, settings: PayrollCountrySettings) {
  if (!agent) {
    return {
      baseRate: 0,
      hs15Amount: 0,
      hs40Amount: 0,
      hs60Amount: 0,
      nightAmount: 0,
      variableElements: [] as VariableElement[],
    };
  }

  const row = heuresStore.getRow(agent.id, month);
  const baseRate = agent.salaireBase / 173.33;
  if (!row) {
    return {
      baseRate,
      hs15Amount: 0,
      hs40Amount: 0,
      hs60Amount: 0,
      nightAmount: 0,
      variableElements: [] as VariableElement[],
    };
  }

  const hs15Amount = row.applyHS ? Math.round(row.hs15Hours * baseRate * (1 + settings.overtime15)) : 0;
  const hs40Amount = row.applyHS ? Math.round(row.hs40Hours * baseRate * (1 + settings.overtime40)) : 0;
  const hs60Amount = row.applyHS ? Math.round(row.hs60Hours * baseRate * (1 + settings.overtime60)) : 0;
  const nightAmount = row.applyNight ? Math.round(row.nightHours * baseRate * settings.nightMajoration) : 0;

  const variableElements: VariableElement[] = [];

  if (hs15Amount > 0) {
    variableElements.push({
      id: AUTO_IDS.hs15,
      label: 'Heures supplémentaires 15%',
      kind: 'gain',
      amount: hs15Amount,
      details: { quantity: row.hs15Hours, unitLabel: 'h', baseRate, multiplier: 1 + settings.overtime15 },
    });
  }
  if (hs40Amount > 0) {
    variableElements.push({
      id: AUTO_IDS.hs40,
      label: 'Heures supplémentaires 40%',
      kind: 'gain',
      amount: hs40Amount,
      details: { quantity: row.hs40Hours, unitLabel: 'h', baseRate, multiplier: 1 + settings.overtime40 },
    });
  }
  if (hs60Amount > 0) {
    variableElements.push({
      id: AUTO_IDS.hs60,
      label: 'Heures supplémentaires 60%',
      kind: 'gain',
      amount: hs60Amount,
      details: { quantity: row.hs60Hours, unitLabel: 'h', baseRate, multiplier: 1 + settings.overtime60 },
    });
  }
  if (nightAmount > 0) {
    variableElements.push({
      id: AUTO_IDS.night35,
      label: `Majoration de Nuit (${Math.round(settings.nightMajoration * 100)}%)`,
      kind: 'gain',
      amount: nightAmount,
      details: { quantity: row.nightHours || row.nightsCount, unitLabel: row.nightHours > 0 ? 'h' : 'nuit(s)', baseRate, multiplier: settings.nightMajoration },
    });
  }

  return {
    baseRate,
    hs15Amount,
    hs40Amount,
    hs60Amount,
    nightAmount,
    variableElements,
  };
}

// ─── Component ──────────────────────────────────────────────────────
export default function SalaryManagement() {
  const { user } = useAuth();
  const canEdit = canEditDraft(user);
  const [payslips, setPayslips] = useState<Payslip[]>(loadPayslips());
  const [agents, setAgents] = useState<PersonnelAgent[]>([]);
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings>(() => payrollSettingsStore.load());
  const [selectedCountry, setSelectedCountry] = useState<string>(RULES.defaultCountry);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | PayslipStatus>('');
  const [monthFilter, setMonthFilter] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editSlip, setEditSlip] = useState<Payslip | null>(null);
  const [formEmployee, setFormEmployee] = useState('');
  const [formBaseSalary, setFormBaseSalary] = useState('');
  const [formBaseSalaryLabel, setFormBaseSalaryLabel] = useState('Salaire de base');
  const [formSurSalaryLabel, setFormSurSalaryLabel] = useState('Sursalaire');
  const [formSurSalary, setFormSurSalary] = useState('');
  const [formPrimeTransportLabel, setFormPrimeTransportLabel] = useState('Prime transport');
  const [formPrimeTransport, setFormPrimeTransport] = useState('');
  const [formPrimePanierLabel, setFormPrimePanierLabel] = useState('Prime panier');
  const [formPrimePanier, setFormPrimePanier] = useState('');
  const [formPrimeAncienneteLabel, setFormPrimeAncienneteLabel] = useState('Prime ancienneté');
  const [formPrimeAnciennete, setFormPrimeAnciennete] = useState('');
  const [formRetenuesLabel, setFormRetenuesLabel] = useState('Retenues diverses');
  const [formRetenues, setFormRetenues] = useState('');
  const [formVariableElements, setFormVariableElements] = useState<VariableElement[]>([]);
  const [formWorkedUnits, setFormWorkedUnits] = useState('');
  const [formLeaveAcquired, setFormLeaveAcquired] = useState('2.5');
  const [formLeaveTaken, setFormLeaveTaken] = useState('0');
  const [formMonth, setFormMonth] = useState(currentMonth());
  const [formAutoFiscal, setFormAutoFiscal] = useState(true);

  // Preview / Delete
  const [previewSlip, setPreviewSlip] = useState<Payslip | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  useEffect(() => {
    setAgents(personnelStore.load());
    const h = () => setAgents(personnelStore.load());
    window.addEventListener('personnel:updated', h);
    return () => window.removeEventListener('personnel:updated', h);
  }, []);

  useEffect(() => {
    const h = () => setPayslips(loadPayslips());
    window.addEventListener(CHANGE_EVENT, h);
    window.addEventListener('ivos_loans_change', h); // reload if loans change
    return () => { window.removeEventListener(CHANGE_EVENT, h); window.removeEventListener('ivos_loans_change', h); };
  }, []);

  useEffect(() => {
    const h = () => setPayrollSettings(payrollSettingsStore.load());
    window.addEventListener(payrollSettingsStore.eventName, h);
    return () => window.removeEventListener(payrollSettingsStore.eventName, h);
  }, []);

  // ─── Computed ──────────────────────────────────────────────────
  const availableMonths = useMemo(() => {
    const set = new Set(payslips.map(p => p.month));
    return Array.from(set).sort().reverse();
  }, [payslips]);

  const filtered = useMemo(() => {
    let list = payslips;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.employeeName.toLowerCase().includes(q) || p.employeeMatricule.toLowerCase().includes(q));
    }
    if (statusFilter) list = list.filter(p => p.status === statusFilter);
    if (monthFilter) list = list.filter(p => p.month === monthFilter);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [payslips, search, statusFilter, monthFilter]);

  const stats = useMemo(() => {
    const thisMonth = payslips.filter(p => p.month === currentMonth());
    const totalBrut = thisMonth.reduce((s, p) => s + p.baseSalary + p.bonus, 0);
    const totalRetenues = thisMonth.reduce((s, p) => s + p.retenues, 0);
    const totalNet = thisMonth.reduce((s, p) => s + p.net, 0);
    const paidCount = thisMonth.filter(p => p.status === 'Payé').length;
    return { total: thisMonth.length, totalBrut, totalRetenues, totalNet, paidCount };
  }, [payslips]);
  const reportingMonth = monthFilter || currentMonth();

  // ─── Employee Select → auto-fill ──────────────────────────────
  const selectedAgent = useMemo(() => agents.find(a => a.id === formEmployee), [agents, formEmployee]);
  const countrySettings = useMemo(
    () => payrollSettings.countries[selectedCountry] || payrollSettingsStore.defaults.countries.SN,
    [payrollSettings, selectedCountry]
  );
  const autoCompensations = useMemo(
    () => computeAutomaticCompensations(selectedAgent, formMonth, countrySettings),
    [countrySettings, formMonth, selectedAgent]
  );
  const autoCompensationTotal = autoCompensations.variableElements.reduce((sum, item) => sum + item.amount, 0);
  const baseSalary = useMemo(() => parseInputPrice(formBaseSalary), [formBaseSalary]);
  const activeRule = useMemo(() => getRule(selectedCountry, payrollSettings), [payrollSettings, selectedCountry]);
  const loanDeduction = useMemo(() => formEmployee ? getMonthlyLoanDeduction(formEmployee) : 0, [formEmployee]);
  const surSalaryNum = useMemo(() => parseInputPrice(formSurSalary), [formSurSalary]);
  const primeTransportNum = useMemo(() => parseInputPrice(formPrimeTransport), [formPrimeTransport]);
  const primePanierNum = useMemo(() => parseInputPrice(formPrimePanier), [formPrimePanier]);
  const primeAncienneteNum = useMemo(() => parseInputPrice(formPrimeAnciennete), [formPrimeAnciennete]);
  const variableGainTotal = useMemo(
    () => formVariableElements
      .filter(v => v.kind === 'gain' && !isAutoCompensationId(v.id))
      .reduce((sum, v) => sum + v.amount, 0),
    [formVariableElements]
  );
  const variableRetentionTotal = useMemo(
    () => formVariableElements.filter(v => v.kind === 'retenue').reduce((sum, v) => sum + v.amount, 0),
    [formVariableElements]
  );
  const manualRetenuesNum = useMemo(() => {
    const manual = parseInputPrice(formRetenues);
    const baseline = manual > 0 ? manual : loanDeduction;
    return baseline + variableRetentionTotal;
  }, [formRetenues, loanDeduction, variableRetentionTotal]);
  const workedUnitsNum = useMemo(() => Number(formWorkedUnits.replace(',', '.')) || activeRule.defaultWorkedUnits, [activeRule.defaultWorkedUnits, formWorkedUnits]);
  const leaveAcquiredNum = useMemo(() => Number(formLeaveAcquired.replace(',', '.')) || 0, [formLeaveAcquired]);
  const leaveTakenNum = useMemo(() => Number(formLeaveTaken.replace(',', '.')) || 0, [formLeaveTaken]);
  const effectiveAutoFiscal = payrollSettings.automation.globalAutoFiscal && formAutoFiscal;

  useEffect(() => {
    if (!selectedAgent) return;
    if (formBaseSalary.trim().length > 0) return;
    setFormBaseSalary(getBaseSalary(selectedAgent.role).toLocaleString('fr-FR'));
  }, [selectedAgent, formBaseSalary]);

  useEffect(() => {
    if (!selectedAgent || editSlip) return;
    setFormAutoFiscal(selectedAgent.automaticTaxCalculation ?? true);
  }, [editSlip, selectedAgent]);

  const payrollPreview = useMemo(() => {
    const irParts = resolveIrParts(selectedAgent, payrollSettings.automation.useFiscalParts);
    return computePayroll({
      baseSalary,
      surSalary: surSalaryNum + variableGainTotal + autoCompensationTotal,
      primeTransport: primeTransportNum,
      primePanier: primePanierNum,
      primeAnciennete: primeAncienneteNum,
      manualRetenues: manualRetenuesNum,
      loanDeduction,
      cadre: isCadreRole(selectedAgent),
      irParts,
      autoFiscal: effectiveAutoFiscal,
      useTransportExemptCap: payrollSettings.automation.useTransportExemptCap,
      calculationDate: `${formMonth}-01`,
    }, activeRule);
  }, [activeRule, autoCompensationTotal, baseSalary, effectiveAutoFiscal, loanDeduction, manualRetenuesNum, payrollSettings.automation.useFiscalParts, payrollSettings.automation.useTransportExemptCap, primeAncienneteNum, primePanierNum, primeTransportNum, selectedAgent, surSalaryNum, variableGainTotal]);

  const previewNet = payrollPreview.net;
  const fiscalRecap = useMemo(() => computeFiscalRecap({
    slips: payslips,
    agents,
    rule: activeRule,
    month: reportingMonth,
    countryCode: selectedCountry,
    automation: {
      useFiscalParts: payrollSettings.automation.useFiscalParts,
      useTransportExemptCap: payrollSettings.automation.useTransportExemptCap,
    },
  }), [activeRule, agents, payslips, payrollSettings.automation.useFiscalParts, payrollSettings.automation.useTransportExemptCap, reportingMonth, selectedCountry]);

  // ─── Modal handlers ────────────────────────────────────────────
  const openCreate = () => {
    if (!canEdit) return;
    setEditSlip(null);
    setFormEmployee('');
    setFormBaseSalary('');
    setFormBaseSalaryLabel('Salaire de base');
    setFormSurSalaryLabel('Sursalaire');
    setFormSurSalary('');
    setFormPrimeTransportLabel('Prime transport');
    setFormPrimeTransport('');
    setFormPrimePanierLabel('Prime panier');
    setFormPrimePanier('');
    setFormPrimeAncienneteLabel('Prime ancienneté');
    setFormPrimeAnciennete('');
    setFormRetenuesLabel('Retenues diverses');
    setFormRetenues('');
    setFormVariableElements([]);
    const defaultRule = getRule(selectedCountry, payrollSettings);
    setFormWorkedUnits(String(defaultRule.defaultWorkedUnits));
    setFormLeaveAcquired('2.5');
    setFormLeaveTaken('0');
    setFormMonth(currentMonth());
    setFormAutoFiscal(payrollSettings.automation.globalAutoFiscal);
    setShowModal(true);
  };
  const openEdit = (slip: Payslip) => {
    if (!canEdit || slip.locked || slip.status !== 'Brouillon') return;
    const agent = agents.find((item) => item.id === slip.employeeId);
    setEditSlip(slip);
    setSelectedCountry(slip.countryCode || RULES.defaultCountry);
    setFormEmployee(slip.employeeId);
    setFormBaseSalary(slip.baseSalary > 0 ? slip.baseSalary.toLocaleString('fr-FR') : '');
    setFormBaseSalaryLabel(slip.baseSalaryLabel || 'Salaire de base');
    setFormSurSalaryLabel(slip.surSalaryLabel || 'Sursalaire');
    setFormSurSalary(slip.surSalary > 0 ? slip.surSalary.toLocaleString('fr-FR') : '');
    setFormPrimeTransportLabel(slip.primeTransportLabel || 'Prime transport');
    setFormPrimeTransport(slip.primeTransport > 0 ? slip.primeTransport.toLocaleString('fr-FR') : '');
    setFormPrimePanierLabel(slip.primePanierLabel || 'Prime panier');
    setFormPrimePanier(slip.primePanier > 0 ? slip.primePanier.toLocaleString('fr-FR') : '');
    setFormPrimeAncienneteLabel(slip.primeAncienneteLabel || 'Prime ancienneté');
    setFormPrimeAnciennete(slip.primeAnciennete > 0 ? slip.primeAnciennete.toLocaleString('fr-FR') : '');
    setFormRetenuesLabel(slip.retenuesLabel || 'Retenues diverses');
    setFormRetenues(slip.retenues > 0 ? slip.retenues.toLocaleString('fr-FR') : '');
    setFormVariableElements((slip.variableElements || []).filter(v => !isAutoCompensationId(v.id)));
    setFormWorkedUnits((slip.workedUnits || getRule(slip.countryCode || RULES.defaultCountry, payrollSettings).defaultWorkedUnits).toLocaleString('fr-FR'));
    setFormLeaveAcquired((slip.leaveAcquired || 0).toLocaleString('fr-FR'));
    setFormLeaveTaken((slip.leaveTaken || 0).toLocaleString('fr-FR'));
    setFormMonth(slip.month);
    setFormAutoFiscal(slip.automaticTaxEnabled ?? agent?.automaticTaxCalculation ?? true);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditSlip(null); };

  const formatPercent = (value: number) => (value * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  const formatAmount = (value: number) => Number.isFinite(value) ? Math.round(value).toLocaleString('fr-FR') : '';

  const updateCountryPercent = useCallback((key: keyof PayrollCountrySettings, rawValue: string) => {
    payrollSettingsStore.updateCountry(selectedCountry, { [key]: Math.max(0, Number(rawValue.replace(',', '.')) || 0) / 100 } as Partial<PayrollCountrySettings>);
  }, [selectedCountry]);

  const updateCountryAmount = useCallback((key: keyof PayrollCountrySettings, rawValue: string) => {
    const clean = rawValue.replace(/\s/g, '');
    const value = clean === '' ? Number.POSITIVE_INFINITY : Math.max(0, Number(clean.replace(',', '.')) || 0);
    payrollSettingsStore.updateCountry(selectedCountry, { [key]: value } as Partial<PayrollCountrySettings>);
  }, [selectedCountry]);

  const updateIrBracket = useCallback((index: number, field: 'upTo' | 'rate', rawValue: string) => {
    const next = [...countrySettings.irBrackets];
    next[index] = {
      ...next[index],
      [field]: field === 'rate'
        ? Math.max(0, Number(rawValue.replace(',', '.')) || 0) / 100
        : (rawValue.trim() === '' ? Number.POSITIVE_INFINITY : Math.max(0, Number(rawValue.replace(/\s/g, '')) || 0)),
    };
    payrollSettingsStore.updateCountry(selectedCountry, { irBrackets: next });
  }, [countrySettings.irBrackets, selectedCountry]);

  const addIrBracket = useCallback(() => {
    const finiteBrackets = countrySettings.irBrackets.filter((bracket) => Number.isFinite(bracket.upTo));
    const lastFinite = finiteBrackets[finiteBrackets.length - 1];
    const next = [...countrySettings.irBrackets];
    next.splice(Math.max(0, next.length - 1), 0, {
      upTo: Number.isFinite(lastFinite?.upTo) ? lastFinite.upTo + 500000 : 1000000,
      rate: lastFinite?.rate ?? 0.1,
    });
    payrollSettingsStore.updateCountry(selectedCountry, { irBrackets: next });
  }, [countrySettings.irBrackets, selectedCountry]);

  const removeIrBracket = useCallback((index: number) => {
    if (countrySettings.irBrackets.length <= 1) return;
    payrollSettingsStore.updateCountry(selectedCountry, {
      irBrackets: countrySettings.irBrackets.filter((_, bracketIndex) => bracketIndex !== index),
    });
  }, [countrySettings.irBrackets, selectedCountry]);

  const buildSlipDraft = (status: PayslipStatus): Payslip | null => {
    if (!formEmployee || !formMonth) return null;
    const agent = agents.find(a => a.id === formEmployee);
    if (!agent) return null;

    const bonus = surSalaryNum + primeTransportNum + primePanierNum + primeAncienneteNum + variableGainTotal + autoCompensationTotal;
    const finalRetenues = payrollPreview.totalCotisations;
    const computedVariableElements = [
      ...formVariableElements.filter(v => !isAutoCompensationId(v.id)),
      ...autoCompensations.variableElements,
    ];
    const base: Payslip = {
      id: editSlip?.id ?? Date.now(),
      employeeId: formEmployee,
      employeeName: `${agent.firstName} ${agent.lastName}`,
      employeeMatricule: agent.matricule || '',
      baseSalaryLabel: formBaseSalaryLabel,
      baseSalary,
      surSalaryLabel: formSurSalaryLabel,
      surSalary: surSalaryNum + variableGainTotal + autoCompensationTotal,
      primeTransportLabel: formPrimeTransportLabel,
      primeTransport: primeTransportNum,
      primePanierLabel: formPrimePanierLabel,
      primePanier: primePanierNum,
      primeAncienneteLabel: formPrimeAncienneteLabel,
      primeAnciennete: primeAncienneteNum,
      bonus,
      retenuesLabel: formRetenuesLabel,
      retenues: finalRetenues,
      loanDeduction,
      net: payrollPreview.net,
      workedUnits: workedUnitsNum,
      leaveAcquired: leaveAcquiredNum,
      leaveTaken: leaveTakenNum,
      countryCode: selectedCountry,
      month: formMonth,
      status,
      locked: status !== 'Brouillon',
      automaticTaxEnabled: effectiveAutoFiscal,
      createdAt: editSlip?.createdAt || new Date().toISOString(),
      validatedBy: status === 'Brouillon' ? undefined : (user?.fullName || 'Responsable RH'),
      variableElements: computedVariableElements,
    };

    return base;
  };

  const persistDraft = async (nextSlip: Payslip, lock: boolean) => {
    const updated = editSlip
      ? payslips.map(p => (p.id === editSlip.id ? nextSlip : p))
      : [...payslips, nextSlip];
    setPayslips(updated);
    savePayslips(updated);

    const payload = {
      id: String(nextSlip.id),
      employeeId: nextSlip.employeeId,
      month: nextSlip.month,
      status: nextSlip.status,
      locked: lock,
      data: nextSlip as unknown as Record<string, unknown>,
      updatedBy: user?.fullName || 'Système IVOS',
    };

    if (lock) await lockPayrollDraft(payload);
    else await savePayrollDraft(payload);
    return nextSlip;
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    const draft = buildSlipDraft('Brouillon');
    if (!draft) return;
    await persistDraft(draft, false);
    closeModal();
  };

  const handleValidateAndGenerate = async () => {
    if (!canEdit) return;
    const finalSlip = buildSlipDraft('Validé');
    if (!finalSlip) return;
    const persisted = await persistDraft(finalSlip, true);
    handlePrint(persisted);
    closeModal();
  };

  const handleDelete = (id: number) => {
    const updated = payslips.filter(p => p.id !== id);
    setPayslips(updated);
    savePayslips(updated);
    setPendingDeleteId(null);
  };

  const changeStatus = async (slip: Payslip, newStatus: PayslipStatus) => {
    if (newStatus === 'Payé' && !canValidate(user)) return;
    if (newStatus === 'Validé' && !canEdit) return;

    const updated = payslips.map(p =>
      p.id === slip.id
        ? {
            ...p,
            status: newStatus,
            locked: newStatus !== 'Brouillon',
            ...(newStatus === 'Payé' ? { validatedBy: user?.fullName || 'DG' } : {}),
          }
        : p
    );
    setPayslips(updated);
    savePayslips(updated);

    const updatedSlip = updated.find(p => p.id === slip.id);
    if (!updatedSlip) return;
    const payload = {
      id: String(updatedSlip.id),
      employeeId: updatedSlip.employeeId,
      month: updatedSlip.month,
      status: updatedSlip.status,
      locked: Boolean(updatedSlip.locked),
      data: updatedSlip as unknown as Record<string, unknown>,
      updatedBy: user?.fullName || 'Système IVOS',
    };
    if (newStatus === 'Brouillon') await savePayrollDraft(payload);
    else await lockPayrollDraft(payload);
  };

  const handlePrint = useCallback((slip: Payslip) => {
    const rule = getRule(slip.countryCode || selectedCountry, payrollSettingsStore.load());
    const agent = agents.find(a => a.id === slip.employeeId);
    const qualification = inferQualification(agent?.role || '');
    const irParts = resolveIrParts(agent, payrollSettingsStore.load().automation.useFiscalParts);
    const slipYear = slip.month.slice(0, 4);
    const sameYearEmployeeSlips = payslips.filter(p => p.employeeId === slip.employeeId && p.month.startsWith(`${slipYear}-`));
    const computation = computePayroll({
      baseSalary: slip.baseSalary,
      surSalary: slip.surSalary,
      primeTransport: slip.primeTransport,
      primePanier: slip.primePanier,
      primeAnciennete: slip.primeAnciennete,
      manualRetenues: Math.max(0, slip.retenues - slip.loanDeduction),
      loanDeduction: slip.loanDeduction,
      cadre: isCadreRole(agent),
      irParts,
      autoFiscal: slip.automaticTaxEnabled ?? true,
      useTransportExemptCap: payrollSettingsStore.load().automation.useTransportExemptCap,
      calculationDate: `${slip.month}-01`,
    }, rule);

    const annualCumulative = sameYearEmployeeSlips.reduce(
      (acc, current) => {
        const currentComputation = computePayroll({
          baseSalary: current.baseSalary,
          surSalary: current.surSalary,
          primeTransport: current.primeTransport,
          primePanier: current.primePanier,
          primeAnciennete: current.primeAnciennete,
          manualRetenues: Math.max(0, current.retenues - current.loanDeduction),
          loanDeduction: current.loanDeduction,
          cadre: isCadreRole(agent),
          irParts,
          autoFiscal: current.automaticTaxEnabled ?? true,
          useTransportExemptCap: payrollSettingsStore.load().automation.useTransportExemptCap,
          calculationDate: `${current.month}-01`,
        }, rule);
        return {
          brutImposable: acc.brutImposable + currentComputation.brutImposable,
          irVerse: acc.irVerse + currentComputation.ir,
          netPaye: acc.netPaye + current.net,
        };
      },
      { brutImposable: 0, irVerse: 0, netPaye: 0 }
    );

    const detailedAdjustments = (slip.variableElements || [])
      .filter((v) => v.kind === 'gain' && v.details && isAutoCompensationId(v.id) && v.amount > 0)
      .map((v) => ({
        label: v.label,
        quantity: v.details!.quantity,
        unitLabel: v.details!.unitLabel,
        baseRate: v.details!.baseRate,
        multiplier: v.details!.multiplier,
        amount: v.amount,
      }));

    void generatePayrollPdf({
      rule,
      employee: {
        fullName: slip.employeeName,
        matricule: slip.employeeMatricule,
        role: agent?.poste || agent?.role || '—',
        qualification: `${qualification} - ${getRoleCategory(agent?.role || '')}`,
        hireDate: agent?.hireDate ? new Date(agent.hireDate).toLocaleDateString('fr-FR') : '—',
        socialSecurityNumber: agent?.idNumber || '—',
        irParts,
      },
      period: {
        monthLabel: monthLabel(slip.month),
        workedUnits: slip.workedUnits || rule.defaultWorkedUnits,
        workedUnitLabel: rule.workedUnitLabel,
      },
      computation,
      annualCumulative,
      leave: {
        acquis: slip.leaveAcquired,
        pris: slip.leaveTaken,
        solde: slip.leaveAcquired - slip.leaveTaken,
      },
      detailedAdjustments,
      generatedBy: user?.fullName || 'Système IVOS',
    }, {
      onGenerated: ({ fileName, dataUrl, fileSize }) => {
        archivePayslipToEmployeeDossier({
          employeeId: slip.employeeId,
          employeeName: slip.employeeName,
          fileName,
          dataUrl,
          fileSize,
          uploadedBy: user?.id || 'system',
        });
      },
    });
  }, [agents, payslips, selectedCountry, user?.fullName]);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-emerald-900 to-emerald-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Paie avec Retenues</h1>
              <p className="text-emerald-200 text-sm mt-0.5">Gestion des fiches de paie — Connecté à l'Annuaire & Prêts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                className="appearance-none rounded-xl border border-white/20 bg-white/10 py-2.5 pl-3 pr-8 text-xs font-semibold text-white outline-none transition-all hover:bg-white/15"
                title="Pays de paie"
              >
                {Object.entries(RULES.countries).map(([code, country]) => (
                  <option key={code} value={code} className="text-gray-900">{country.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-100" />
            </div>
            <button
              onClick={openCreate}
              disabled={!canEdit}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#1a1a2e] hover:bg-gray-100 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" /> Générer Fiche de Paie
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Paramètres Fiscaux & Patronaux</h2>
            <p className="text-sm text-gray-500 mt-1">Référentiel Sénégal des retenues salariales, charges patronales, barème IR et switch maître de calcul automatique.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 bg-gray-50">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Calcul fiscal automatique global</p>
              <p className="text-xs text-gray-500 mt-1">Quand désactivé, toutes les fiches passent en retenues manuelles libres.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={payrollSettings.automation.globalAutoFiscal}
              onClick={() => payrollSettingsStore.updateAutomation({ globalAutoFiscal: !payrollSettings.automation.globalAutoFiscal })}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${payrollSettings.automation.globalAutoFiscal ? 'bg-emerald-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${payrollSettings.automation.globalAutoFiscal ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">IPRES Salarial</p>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Régime général %</label>
                  <input type="number" min={0} step="0.01" value={formatPercent(countrySettings.ipresGeneral)} onChange={e => updateCountryPercent('ipresGeneral', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Cadre %</label>
                  <input type="number" min={0} step="0.01" value={formatPercent(countrySettings.ipresCadre)} onChange={e => updateCountryPercent('ipresCadre', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right" />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Charges Patronales</p>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">IPRES général %</label>
                  <input type="number" min={0} step="0.01" value={formatPercent(countrySettings.ipresGeneralEmployer)} onChange={e => updateCountryPercent('ipresGeneralEmployer', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">IPRES cadre %</label>
                  <input type="number" min={0} step="0.01" value={formatPercent(countrySettings.ipresCadreEmployer)} onChange={e => updateCountryPercent('ipresCadreEmployer', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Prestations familiales %</label>
                  <input type="number" min={0} step="0.01" value={formatPercent(countrySettings.cssPrestationsFamiliales)} onChange={e => updateCountryPercent('cssPrestationsFamiliales', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Accident du travail %</label>
                  <input type="number" min={0} step="0.01" value={formatPercent(countrySettings.cssAccidentTravail)} onChange={e => updateCountryPercent('cssAccidentTravail', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right" />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Retenues Fiscales</p>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">IPM %</label>
                  <input type="number" min={0} step="0.01" value={formatPercent(countrySettings.ipm)} onChange={e => updateCountryPercent('ipm', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">CFCE %</label>
                  <input type="number" min={0} step="0.01" value={formatPercent(countrySettings.cfce)} onChange={e => updateCountryPercent('cfce', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Plafond IPRES général</label>
                  <input type="text" inputMode="numeric" value={formatAmount(countrySettings.ipresGeneralCap)} onChange={e => updateCountryAmount('ipresGeneralCap', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Plafond IPRES cadre</label>
                  <input type="text" inputMode="numeric" value={formatAmount(countrySettings.ipresCadreCap)} onChange={e => updateCountryAmount('ipresCadreCap', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right" />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Exonérations & Majorations</p>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Transport exonéré max</label>
                  <input type="text" inputMode="numeric" value={formatAmount(countrySettings.transportExemptCap)} onChange={e => updateCountryAmount('transportExemptCap', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">HS 15 %</label>
                    <input type="number" min={0} step="0.01" value={formatPercent(countrySettings.overtime15)} onChange={e => updateCountryPercent('overtime15', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">HS 40 %</label>
                    <input type="number" min={0} step="0.01" value={formatPercent(countrySettings.overtime40)} onChange={e => updateCountryPercent('overtime40', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">HS 60 %</label>
                    <input type="number" min={0} step="0.01" value={formatPercent(countrySettings.overtime60)} onChange={e => updateCountryPercent('overtime60', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Nuit %</label>
                    <input type="number" min={0} step="0.01" value={formatPercent(countrySettings.nightMajoration)} onChange={e => updateCountryPercent('nightMajoration', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Barème IR</p>
                <p className="text-xs text-gray-500 mt-1">Plafonds annuels par part. La dernière tranche peut rester ouverte.</p>
              </div>
              <button type="button" onClick={addIrBracket} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">Ajouter tranche</button>
            </div>
            <div className="space-y-2">
              {countrySettings.irBrackets.map((bracket, index) => (
                <div key={`ir-${index}`} className="grid grid-cols-[1fr_110px_auto] gap-2 items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={Number.isFinite(bracket.upTo) ? Math.round(bracket.upTo).toLocaleString('fr-FR') : ''}
                    onChange={e => updateIrBracket(index, 'upTo', e.target.value)}
                    placeholder="Plafond annuel"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formatPercent(bracket.rate)}
                    onChange={e => updateIrBracket(index, 'rate', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-right"
                  />
                  <button type="button" onClick={() => removeIrBracket(index)} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold">Supprimer</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Récapitulatif Fiscal</h2>
            <p className="text-sm text-gray-500 mt-1">Montants cumulés dus pour {monthLabel(reportingMonth)} sur {activeRule.label.toLowerCase()}.</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Link to="/finances/fiscal-recap" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              <FileText className="h-4 w-4" /> Ouvrir la page dédiée
            </Link>
            <button type="button" onClick={() => exportFiscalRecapToPdf(fiscalRecap)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              <Printer className="h-4 w-4" /> PDF
            </button>
            <button type="button" onClick={() => exportFiscalRecapToExcel(fiscalRecap)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
              <FileText className="h-4 w-4" /> Excel
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-right">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Salarial</p>
              <p className="text-lg font-bold text-slate-800">{fmtPrice(fiscalRecap.salarialTotal)}</p>
            </div>
            <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold">Patronal</p>
              <p className="text-lg font-bold text-blue-800">{fmtPrice(fiscalRecap.patronalTotal)}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">Total dû</p>
              <p className="text-lg font-bold text-emerald-800">{fmtPrice(fiscalRecap.grandTotal)}</p>
            </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Organisme</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Salarial</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Patronal</th>
                <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {fiscalRecap.rows.map((row) => (
                <tr key={row.label} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.label}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{fmtPrice(row.salarial)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{fmtPrice(row.patronal)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{fmtPrice(row.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td className="px-4 py-3 font-bold text-slate-900">Total global</td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">{fmtPrice(fiscalRecap.salarialTotal)}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">{fmtPrice(fiscalRecap.patronalTotal)}</td>
                <td className="px-4 py-3 text-right font-black text-emerald-800">{fmtPrice(fiscalRecap.grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <span>{fiscalRecap.slipCount} fiche(s) intégrée(s) dans ce cumul.</span>
          <span>Format pleine largeur, montants alignés à droite, séparateurs de milliers et libellé CFCE / VRS préservé.</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: `Fiches ${monthLabel(currentMonth()).split(' ')[0]}`, value: String(stats.total), icon: FileText, tc: 'text-blue-700', bg: 'bg-blue-50', color: 'from-blue-500 to-blue-600' },
          { label: 'Masse Salariale Brute', value: fmtPrice(stats.totalBrut), icon: TrendingUp, tc: 'text-indigo-700', bg: 'bg-indigo-50', color: 'from-indigo-500 to-indigo-600' },
          { label: 'Total Retenues', value: fmtPrice(stats.totalRetenues), icon: AlertCircle, tc: 'text-red-600', bg: 'bg-red-50', color: 'from-red-400 to-red-500' },
          { label: 'Net à Payer Global', value: fmtPrice(stats.totalNet), icon: DollarSign, tc: 'text-emerald-700', bg: 'bg-emerald-50', color: 'from-emerald-500 to-emerald-600' },
          { label: 'Fiches Payées', value: `${stats.paidCount}/${stats.total}`, icon: CheckCircle2, tc: 'text-green-700', bg: 'bg-green-50', color: 'from-green-500 to-green-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${k.color} rounded-l-2xl`} />
            <div className="pl-3">
              <div className={`p-1.5 ${k.bg} rounded-lg w-fit mb-1.5`}>
                <k.icon className={`h-3.5 w-3.5 ${k.tc}`} />
              </div>
              <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">{k.label}</p>
              <p className={`text-base font-bold ${k.tc} mt-0.5 truncate`}>{k.value}</p>
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
            placeholder="Rechercher par employé, matricule..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['', 'Brouillon', 'Validé', 'Payé'] as const).map(s => (
            <button key={s || 'all'} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === s ? 'bg-[#1a1a2e] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {s || 'Tous'}
            </button>
          ))}
        </div>
        {availableMonths.length > 0 && (
          <div className="relative">
            <select
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              <option value="">Tous les mois</option>
              {availableMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>
        )}
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{filtered.length} fiche{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Employé</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Salaire de Base</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Primes</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Retenues</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Net à Payer</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Mois</th>
                <th className="text-left px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Statut</th>
                <th className="text-right px-6 py-3.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-sm text-gray-400">Aucune fiche de paie trouvée</td></tr>
              ) : filtered.map(slip => {
                const isDeleting = pendingDeleteId === slip.id;
                return (
                  <tr key={slip.id} className="group hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{slip.employeeName}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{slip.employeeMatricule}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{fmtPrice(slip.baseSalary)}</td>
                    <td className="px-6 py-4 text-sm text-emerald-600 font-medium">+{fmtPrice(slip.bonus)}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-red-500">-{fmtPrice(slip.retenues)}</span>
                      {slip.loanDeduction > 0 && (
                        <p className="text-[9px] text-gray-400 mt-0.5">dont prêt: {fmtPrice(slip.loanDeduction)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900">{fmtPrice(slip.net)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500">{monthLabel(slip.month)}</span>
                    </td>
                    <td className="px-6 py-4">
                      {slip.status === 'Brouillon' ? (
                        <button
                          onClick={() => changeStatus(slip, 'Validé')}
                          disabled={!canEdit}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                            canEdit
                              ? 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 cursor-pointer'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-70'
                          }`}
                          title={canEdit ? 'Cliquer pour valider' : 'Seul un Admin ou Responsable RH peut valider'}
                        >
                          <Clock className="h-3 w-3" /> Brouillon
                        </button>
                      ) : slip.status === 'Validé' ? (
                        <button
                          onClick={() => changeStatus(slip, 'Payé')}
                          disabled={!canValidate(user)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                            canValidate(user)
                              ? 'bg-blue-50 text-blue-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer'
                              : 'bg-blue-50 text-blue-700 cursor-not-allowed opacity-70'
                          }`}
                          title={canValidate(user) ? 'Cliquer pour marquer Payé (DG/DAF)' : 'Seul le DG ou DAF peut valider'}
                        >
                          <Shield className="h-3 w-3" /> Validé
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Payé
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isDeleting ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[10px] text-red-500 font-semibold mr-1">Supprimer ?</span>
                          <button onClick={() => handleDelete(slip.id)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"><Check className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setPendingDeleteId(null)} className="p-1.5 bg-gray-200 text-gray-500 rounded-lg hover:bg-gray-300 transition-colors"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handlePrint(slip)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-emerald-100 hover:text-emerald-600 transition-colors" title="Imprimer le Bulletin"><Printer className="h-3.5 w-3.5" /></button>
                          <button onClick={() => { /* mailto link */ window.location.href = `mailto:?subject=Bulletin de Paie - ${slip.employeeName}&body=Veuillez trouver ci-joint le bulletin de paie de ${slip.employeeName} pour ${monthLabel(slip.month)}.`; }} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors" title="Envoyer par Email"><Mail className="h-3.5 w-3.5" /></button>
                          {slip.status === 'Brouillon' && canEdit && (
                            <button onClick={() => openEdit(slip)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-indigo-100 hover:text-indigo-600 transition-colors" title="Modifier"><Edit3 className="h-3.5 w-3.5" /></button>
                          )}
                          {slip.status === 'Brouillon' && (
                            <button onClick={() => setPendingDeleteId(slip.id)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors" title="Supprimer"><Trash2 className="h-3.5 w-3.5" /></button>
                          )}
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

      {/* ─── Modal Création / Modification ─────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[92vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1a1a2e] to-emerald-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/15 rounded-lg"><FileText className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-lg font-bold">{editSlip ? 'Modifier la Fiche' : 'Nouvelle Fiche de Paie'}</h2>
                  <p className="text-emerald-200 text-xs">Connecté à l'Annuaire & Gestion des Prêts</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveDraft} className="p-6 space-y-4 overflow-y-auto max-h-[calc(92vh-72px)]">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700 flex items-center justify-between gap-3">
                <span>BROUILLON: les montants restent modifiables tant que la fiche n'est pas validée.</span>
                {!canEdit && (
                  <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold whitespace-nowrap">Lecture seule</span>
                )}
              </div>
              {/* Employé — from Annuaire */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
                  Employé <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                  <select
                    value={formEmployee}
                    onChange={e => { setFormEmployee(e.target.value); setFormRetenues(''); setFormBaseSalary(''); }}
                    required
                    disabled={!canEdit}
                    className="w-full pl-10 pr-8 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">Sélectionner un employé...</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.firstName} {a.lastName} — {a.matricule} ({a.role})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                </div>
              </div>

              {/* Editable Draft Lines */}
              {selectedAgent && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Ligne principale editable</span>
                    <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-lg">{selectedAgent.role}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={formBaseSalaryLabel}
                      onChange={e => setFormBaseSalaryLabel(e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 bg-white rounded-lg text-sm text-gray-800 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formBaseSalary}
                      onChange={e => setFormBaseSalary(formatInputPrice(e.target.value))}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 bg-white rounded-lg text-sm text-gray-800 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>
                </div>
              )}

              {selectedAgent && (
                <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Calcul Fiscal Automatique</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Employé: {selectedAgent.automaticTaxCalculation === false ? 'manuel' : 'automatique'} · Global: {payrollSettings.automation.globalAutoFiscal ? 'activé' : 'désactivé'}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={effectiveAutoFiscal}
                      onClick={() => setFormAutoFiscal(value => !value)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${effectiveAutoFiscal ? 'bg-emerald-600' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${effectiveAutoFiscal ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-right">
                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] uppercase text-gray-400 font-semibold">Statut</p>
                      <p className="text-sm font-bold text-gray-800">{selectedAgent.fiscalStatus || 'Non-Cadre'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] uppercase text-gray-400 font-semibold">Catégorie</p>
                      <p className="text-sm font-bold text-gray-800">{selectedAgent.fiscalCategory || selectedAgent.role}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] uppercase text-blue-500 font-semibold">Parts fiscales</p>
                      <p className="text-sm font-bold text-blue-700">{resolveIrParts(selectedAgent, payrollSettings.automation.useFiscalParts).toLocaleString('fr-FR')}</p>
                    </div>
                  </div>
                  {!payrollSettings.automation.globalAutoFiscal && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 font-medium">
                      Le calcul fiscal automatique global est désactivé. Les retenues de cette fiche restent entièrement manuelles.
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
                    Pays de paie
                  </label>
                  <div className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800">
                    {activeRule.label}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
                    Mois <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="month"
                    value={formMonth}
                    onChange={e => setFormMonth(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3 space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Gains fixes</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    value={formSurSalaryLabel}
                    onChange={e => setFormSurSalaryLabel(e.target.value)}
                    disabled={!canEdit}
                    className="w-full mb-1.5 px-3 py-1.5 bg-gray-50 rounded-lg text-xs text-gray-700 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formSurSalary}
                    onChange={e => setFormSurSalary(formatInputPrice(e.target.value))}
                    disabled={!canEdit}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formPrimeTransportLabel}
                    onChange={e => setFormPrimeTransportLabel(e.target.value)}
                    disabled={!canEdit}
                    className="w-full mb-1.5 px-3 py-1.5 bg-gray-50 rounded-lg text-xs text-gray-700 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formPrimeTransport}
                    onChange={e => setFormPrimeTransport(formatInputPrice(e.target.value))}
                    disabled={!canEdit}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formPrimePanierLabel}
                    onChange={e => setFormPrimePanierLabel(e.target.value)}
                    disabled={!canEdit}
                    className="w-full mb-1.5 px-3 py-1.5 bg-gray-50 rounded-lg text-xs text-gray-700 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formPrimePanier}
                    onChange={e => setFormPrimePanier(formatInputPrice(e.target.value))}
                    disabled={!canEdit}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formPrimeAncienneteLabel}
                    onChange={e => setFormPrimeAncienneteLabel(e.target.value)}
                    disabled={!canEdit}
                    className="w-full mb-1.5 px-3 py-1.5 bg-gray-50 rounded-lg text-xs text-gray-700 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formPrimeAnciennete}
                    onChange={e => setFormPrimeAnciennete(formatInputPrice(e.target.value))}
                    disabled={!canEdit}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
                    Temps travaillé ({activeRule.workedUnitLabel.toLowerCase()})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formWorkedUnits}
                    onChange={e => setFormWorkedUnits(e.target.value)}
                    placeholder={String(activeRule.defaultWorkedUnits)}
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">Congés acquis (jours)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formLeaveAcquired}
                    onChange={e => setFormLeaveAcquired(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">Congés pris (jours)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formLeaveTaken}
                    onChange={e => setFormLeaveTaken(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Éléments variables (Brouillon)</p>
                  <button
                    type="button"
                    onClick={() => setFormVariableElements(prev => [...prev, { id: `${Date.now()}`, label: 'Nouvel élément', amount: 0, kind: 'gain' }])}
                    disabled={!canEdit}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-50 text-emerald-700 disabled:opacity-50"
                  >
                    Ajouter
                  </button>
                </div>
                {formVariableElements.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucun élément variable ajouté.</p>
                ) : (
                  <div className="space-y-2">
                    {formVariableElements.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                        <input
                          type="text"
                          value={item.label}
                          onChange={e => setFormVariableElements(prev => prev.map((v, i) => i === index ? { ...v, label: e.target.value } : v))}
                          disabled={!canEdit}
                          className="md:col-span-5 px-3 py-2 bg-gray-50 rounded-lg text-xs disabled:bg-gray-100 disabled:text-gray-500"
                        />
                        <select
                          value={item.kind}
                          onChange={e => setFormVariableElements(prev => prev.map((v, i) => i === index ? { ...v, kind: e.target.value as 'gain' | 'retenue' } : v))}
                          disabled={!canEdit}
                          className="md:col-span-3 px-2 py-2 bg-gray-50 rounded-lg text-xs disabled:bg-gray-100 disabled:text-gray-500"
                        >
                          <option value="gain">Gain</option>
                          <option value="retenue">Retenue</option>
                        </select>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={item.amount > 0 ? item.amount.toLocaleString('fr-FR') : ''}
                          onChange={e => setFormVariableElements(prev => prev.map((v, i) => i === index ? { ...v, amount: parseInputPrice(e.target.value) } : v))}
                          disabled={!canEdit}
                          placeholder="0"
                          className="md:col-span-3 px-3 py-2 bg-gray-50 rounded-lg text-xs disabled:bg-gray-100 disabled:text-gray-500"
                        />
                        <button
                          type="button"
                          onClick={() => setFormVariableElements(prev => prev.filter((_, i) => i !== index))}
                          disabled={!canEdit}
                          className="md:col-span-1 px-2 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold disabled:opacity-50"
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                  <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold">Gains variables: {fmtPrice(variableGainTotal)}</span>
                  <span className="px-2 py-1 rounded-md bg-red-50 text-red-700 font-semibold">Retenues variables: {fmtPrice(variableRetentionTotal)}</span>
                </div>
                {autoCompensations.variableElements.length > 0 && (
                  <div className="pt-2 border-t border-dashed border-gray-200 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-blue-500 font-semibold">Automatismes actifs</p>
                    {autoCompensations.variableElements.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-bold text-blue-700">{fmtPrice(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Retenues */}
              <div>
                <input
                  type="text"
                  value={effectiveAutoFiscal ? 'Retenues manuelles complémentaires' : formRetenuesLabel}
                  onChange={e => setFormRetenuesLabel(e.target.value)}
                  disabled={!canEdit}
                  className="w-full mb-1.5 px-3 py-1.5 bg-gray-50 rounded-lg text-xs text-gray-700 disabled:bg-gray-100 disabled:text-gray-500"
                />
                {loanDeduction > 0 && (
                  <p className="text-[10px] text-red-400 mb-1.5">Prêt en cours : {fmtPrice(loanDeduction)} /mois (pré-rempli)</p>
                )}
                <div className="relative">
                  <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-300" />
                  <input
                    type="text" inputMode="numeric"
                    value={formRetenues || (loanDeduction > 0 ? loanDeduction.toLocaleString('fr-FR') : '')}
                    onChange={e => setFormRetenues(formatInputPrice(e.target.value))}
                    disabled={!canEdit}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2.5 bg-red-50/50 rounded-xl text-sm text-red-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:bg-white transition-all disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              {/* Live Net preview */}
              <div className={`rounded-xl p-4 transition-all ${baseSalary > 0 ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className={`h-4 w-4 ${baseSalary > 0 ? 'text-emerald-500' : 'text-gray-300'}`} />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Calcul hybride — Net à Payer</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-gray-600">Brut: {fmtPrice(payrollPreview.brut)} | Retenues: {fmtPrice(payrollPreview.totalCotisations)} | Patronal: {fmtPrice(payrollPreview.totalPatronal)}</span>
                  <span className="text-xs text-gray-500">Temps de travail: {workedUnitsNum.toLocaleString('fr-FR')} {activeRule.workedUnitLabel.toLowerCase()} · Solde congés: {(leaveAcquiredNum - leaveTakenNum).toLocaleString('fr-FR')} j</span>
                  <span className="text-xs text-gray-500">Mode fiscal: {effectiveAutoFiscal ? 'automatique' : 'manuel'} · Nuit: {Math.round(countrySettings.nightMajoration * 100)}% · CFCE: {formatPercent(countrySettings.cfce)}% · Plafond IPRES: {formatAmount(selectedAgent && isCadreRole(selectedAgent) ? countrySettings.ipresCadreCap : countrySettings.ipresGeneralCap)} FCFA</span>
                </div>
                <div className="flex items-center justify-end">
                  <span className={`text-xl font-bold ${previewNet > 0 ? 'text-emerald-700' : 'text-gray-300'}`}>
                    {baseSalary > 0 ? fmtPrice(previewNet) : '—'}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!canEdit}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#1a1a2e] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#2a2a4e] transition-all shadow-sm hover:shadow-md active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Check className="h-4 w-4" /> Enregistrer le Brouillon
                </button>
                <button
                  type="button"
                  onClick={handleValidateAndGenerate}
                  disabled={!canEdit}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md active:scale-[0.97] disabled:opacity-60"
                >
                  <Printer className="h-4 w-4" /> Valider et Générer
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

      {/* ─── Modal Aperçu Impression ─────────────────────────────── */}
      {previewSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPreviewSlip(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#1a1a2e] to-emerald-900 px-6 py-4 text-white">
              <h2 className="text-lg font-bold">Aperçu — Bulletin de Paie</h2>
              <p className="text-emerald-200 text-xs">{monthLabel(previewSlip.month)}</p>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Employé</span>
                <span className="text-sm font-semibold text-gray-800">{previewSlip.employeeName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Salaire de Base</span>
                <span className="text-sm text-gray-700">{fmtPrice(previewSlip.baseSalary)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Primes</span>
                <span className="text-sm text-emerald-600">+{fmtPrice(previewSlip.bonus)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Retenues</span>
                <span className="text-sm font-semibold text-red-500">-{fmtPrice(previewSlip.retenues)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-800">Net à Payer</span>
                <span className="text-lg font-bold text-emerald-700">{fmtPrice(previewSlip.net)}</span>
              </div>
              {previewSlip.validatedBy && (
                <p className="text-[10px] text-gray-400 pt-1">Validé par: {previewSlip.validatedBy}</p>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { handlePrint(previewSlip); setPreviewSlip(null); }}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1a1a2e] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-[#2a2a4e] transition-all"
              >
                <Printer className="h-4 w-4" /> Imprimer
              </button>
              <button
                onClick={() => setPreviewSlip(null)}
                className="flex-1 bg-gray-100 text-gray-600 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
