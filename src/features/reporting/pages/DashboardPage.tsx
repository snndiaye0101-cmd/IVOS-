import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSite } from '../../../shared/contexts/SiteContext';
import { vehiclesStore } from '../../fleet/services/vehiclesStore';
import { driversStore } from '../../fleet/services/driversStore';
import { personnelStore } from '../../fleet/services/personnelStore';
import { clientsStore } from '../../clients/services/clientsStore';
import { carburantStore } from '../../fleet/services/carburantStore';
import { pneumatiqueStore } from '../../fleet/services/pneumatiqueStore';
import { claimsStore } from '../../fleet/services/claimsStore';
import { materielsStore } from '../../technique/services/materielsStore';
import type { Plein } from '../../fleet/services/carburantStore';
import type { Claim } from '../../fleet/types/claims.types';
import {
  getWorkflowInvoices,
  type WorkflowInvoice,
} from '../../finances/services/workflowInvoiceService';
import { getAllOperations } from '../../exploitation/services/operationService';
import {
  LayoutDashboard,
  Truck,
  Users,
  Building2,
  Fuel,
  CircleDot,
  AlertTriangle,
  Wrench,
  TrendingUp,
  Activity,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Receipt,
  Banknote,
  Wallet,
  ShieldAlert,
  Download,
  ClipboardList,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCleanAmount } from '@/shared/utils/formatAmount';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Payslip {
  id: number;
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  bonus: number;
  retenues: number;
  loanDeduction: number;
  net: number;
  month: string;
  status: string;
}

interface Expense {
  id: number;
  label: string;
  category: string;
  amount: number;
  date: string;
}

interface ExploitationOperation {
  numero: string;
  status: string;
  currentStep: number;
  documentType: string;
  createdAt?: string;
}

interface DashboardVehicle {
  registration: string;
  type?: string;
  status?: string;
  technicalControlExpiry?: string;
  insuranceExpiry?: string;
  brand?: string;
  model?: string;
}

interface AutoTableCarrier {
  lastAutoTable?: {
    finalY: number;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const FCFA = (n: number) => formatCleanAmount(n, 'FCFA');

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function loadPayslips(): Payslip[] {
  try {
    const r = localStorage.getItem('ivos_payslips_v1');
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
}
function loadExpenses(): Expense[] {
  try {
    const r = localStorage.getItem('ivos_global_expenses_v1');
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
}
function loadOperations(): ExploitationOperation[] {
  try {
    const next = localStorage.getItem('ivos_exploitation_operations_v3');
    const parsed = next ? (JSON.parse(next) as ExploitationOperation[]) : [];
    if (parsed.length > 0) return parsed;

    // Fallback to canonical exploitation operations service for continuity.
    return getAllOperations().map((op) => ({
      numero: op.numero,
      status: op.status === 'cloturee' ? 'completed' : 'in_progress',
      currentStep: op.status === 'cloturee' ? 5 : 3,
      documentType: 'BSD',
      createdAt: op.createdAt,
    }));
  } catch {
    try {
      return getAllOperations().map((op) => ({
        numero: op.numero,
        status: op.status === 'cloturee' ? 'completed' : 'in_progress',
        currentStep: op.status === 'cloturee' ? 5 : 3,
        documentType: 'BSD',
        createdAt: op.createdAt,
      }));
    } catch {
      return [];
    }
  }
}

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

// ── Component ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const { activeSite, formatMoney } = useSite();

  // ── Filtre temporel ──────────────────────────────────────────────────────────
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const currentKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const prevKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  useEffect(() => {
    const events = [
      'vehicles:updated',
      'fleetVehicles:updated',
      'drivers:updated',
      'personnel:updated',
      'clients:updated',
      'carburant:updated',
      'pneumatique:updated',
      'claims:updated',
      'materiels:updated',
      'ivos_payslips_change',
      'ivos_expenses_change',
      'ivos_invoice_change',
      'ivos_exploitation_change',
      'ivos_operations_change',
    ];
    events.forEach((e) => window.addEventListener(e, reload));
    return () => events.forEach((e) => window.removeEventListener(e, reload));
  }, [reload]);

  // ── Data aggregation ─────────────────────────────────────────────────────────
  const data = useMemo(() => {
    const vehicles = vehiclesStore.load() as DashboardVehicle[];
    const drivers = driversStore.load();
    const personnel = personnelStore.load();
    const clients = clientsStore.load();
    const carburant = carburantStore.load() as Plein[];
    const pneus = pneumatiqueStore.load();
    const claims = claimsStore.load() as Claim[];
    const materiels = materielsStore.load();
    const payslips = loadPayslips();
    const expenses = loadExpenses();
    const invoices: WorkflowInvoice[] = getWorkflowInvoices();
    const operations = loadOperations();

    const activeVehicles = vehicles.filter(
      (vehicle) =>
        vehicle.status === 'Actif' ||
        vehicle.status === 'Disponible' ||
        vehicle.status === 'En opération'
    ).length;
    const openClaims = claims.filter(
      (claim) => claim.status === 'Ouvert' || claim.status === 'En cours'
    ).length;

    // ── 1. Masse Salariale ─────────────────────────────────────────────────────
    const monthPayslips = payslips.filter((p) => p.month === currentKey);
    const totalBaseSalary = monthPayslips.reduce((s, p) => s + (p.baseSalary || 0), 0);
    const totalBonus = monthPayslips.reduce((s, p) => s + (p.bonus || 0), 0);
    const totalRetenues = monthPayslips.reduce((s, p) => s + (p.retenues || 0), 0);
    const masseSalariale = totalBaseSalary + totalBonus + totalRetenues;

    // ── 2. Facturation ─────────────────────────────────────────────────────────
    const monthInvoices = invoices.filter((inv) => inv.createdAt?.slice(0, 7) === currentKey);
    const totalFacture = monthInvoices.reduce((s, inv) => s + (inv.montantHT || 0), 0);
    const recouvrementEnCours = monthInvoices
      .filter((inv) => inv.status !== 'payee' && inv.status !== 'annulee')
      .reduce((s, inv) => s + (inv.montantHT || 0), 0);

    // ── 3. Dépenses Globales ───────────────────────────────────────────────────
    const monthExpenses = expenses.filter((e) => e.date?.slice(0, 7) === currentKey);
    const totalExpenses = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);

    const monthCarburant = carburant.filter((plein) => plein.date?.slice(0, 7) === currentKey);
    const carburantTotal = monthCarburant.reduce((sum, plein) => sum + (plein.montant || 0), 0);
    const prevMonthCarburant = carburant.filter((plein) => plein.date?.slice(0, 7) === prevKey);
    const carburantTotalPrev = prevMonthCarburant.reduce(
      (sum, plein) => sum + (plein.montant || 0),
      0
    );

    const depensesGlobales = totalExpenses + carburantTotal + masseSalariale;

    // ── 4. Marge Opérationnelle ────────────────────────────────────────────────
    const margeOperationnelle = totalFacture - (carburantTotal + masseSalariale);

    // ── 5. Ventilation Carburant ───────────────────────────────────────────────
    const vehicleTypeMap: Record<string, string> = {};
    vehicles.forEach((vehicle) => {
      vehicleTypeMap[vehicle.registration] = vehicle.type || '';
    });

    let carburantFonction = 0;
    let carburantParc = 0;
    monthCarburant.forEach((plein) => {
      const vType = vehicleTypeMap[plein.vehicule] || '';
      if (vType.toLowerCase().includes('fonction')) {
        carburantFonction += plein.montant || 0;
      } else {
        carburantParc += plein.montant || 0;
      }
    });

    // ── 6. Comparatif mensuel ──────────────────────────────────────────────────
    const carburantLitresCurrent = monthCarburant.reduce(
      (sum, plein) => sum + (plein.litres || 0),
      0
    );
    const carburantLitresPrev = prevMonthCarburant.reduce(
      (sum, plein) => sum + (plein.litres || 0),
      0
    );

    // ── 7. Top 3 énergivores ───────────────────────────────────────────────────
    const fuelByVehicle: Record<string, number> = {};
    monthCarburant.forEach((plein) => {
      fuelByVehicle[plein.vehicule] = (fuelByVehicle[plein.vehicule] || 0) + (plein.montant || 0);
    });
    const topFuelVehicles = Object.entries(fuelByVehicle)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([vehicule, montant]) => ({ vehicule, montant }));

    // ── 8. Operations ────────────────────────────────────────────────────────────
    const monthOperations = operations.filter((m) => m.createdAt?.slice(0, 7) === currentKey);
    const operationsRealisees = monthOperations.filter(
      (m) => m.currentStep >= 5 || m.status === 'completed'
    ).length;
    const operationsEnCours = monthOperations.filter(
      (m) => m.currentStep < 5 && m.status !== 'completed'
    ).length;
    const operationsTotal = monthOperations.length;

    // ── 9. Alertes Conformité ──────────────────────────────────────────────────
    const today = new Date();
    const in15Days = new Date();
    in15Days.setDate(today.getDate() + 15);

    const vehiculesEnAlerte = vehicles
      .filter((vehicle) => {
        const vtDate = vehicle.technicalControlExpiry
          ? new Date(vehicle.technicalControlExpiry)
          : null;
        const assDate = vehicle.insuranceExpiry ? new Date(vehicle.insuranceExpiry) : null;
        return (vtDate && vtDate <= in15Days) || (assDate && assDate <= in15Days);
      })
      .map((vehicle) => {
        const alerts: string[] = [];
        const vtDate = vehicle.technicalControlExpiry
          ? new Date(vehicle.technicalControlExpiry)
          : null;
        const assDate = vehicle.insuranceExpiry ? new Date(vehicle.insuranceExpiry) : null;
        if (vtDate && vtDate <= in15Days) {
          const j = Math.ceil((vtDate.getTime() - today.getTime()) / 86400000);
          alerts.push(j <= 0 ? 'VT Expirée' : `VT dans ${j}j`);
        }
        if (assDate && assDate <= in15Days) {
          const j = Math.ceil((assDate.getTime() - today.getTime()) / 86400000);
          alerts.push(j <= 0 ? 'Assurance Expirée' : `Assurance dans ${j}j`);
        }
        return {
          registration: vehicle.registration,
          brand: vehicle.brand || '',
          model: vehicle.model || '',
          alerts,
        };
      });

    // ── Charts data ────────────────────────────────────────────────────────────
    const barData = [
      {
        name: monthLabel(prevKey),
        Litres: Math.round(carburantLitresPrev),
        Coût: carburantTotalPrev,
      },
      {
        name: monthLabel(currentKey),
        Litres: Math.round(carburantLitresCurrent),
        Coût: carburantTotal,
      },
    ];

    const pieData = [
      { name: 'Véhicules de Fonction', value: carburantFonction },
      { name: 'Véhicules de Parc', value: carburantParc },
    ].filter((d) => d.value > 0);
    if (pieData.length === 0)
      pieData.push({ name: 'Véhicules de Parc', value: carburantTotal || 1 });

    // ── Inventory counts ───────────────────────────────────────────────────────
    const totalFuel = carburant.reduce((sum, plein) => sum + (plein.litres || 0), 0);

    return {
      vehicles: { total: vehicles.length, active: activeVehicles },
      drivers: { total: drivers.length },
      personnel: { total: personnel.length },
      clients: { total: clients.length },
      pneus: { total: pneus.length },
      claims: { total: claims.length, open: openClaims },
      materiels: { total: materiels.length },
      totalFuelLitres: Math.round(totalFuel),
      masseSalariale,
      totalBaseSalary,
      totalBonus,
      totalRetenues,
      totalFacture,
      recouvrementEnCours,
      depensesGlobales,
      carburantTotal,
      carburantTotalPrev,
      carburantFonction,
      carburantParc,
      carburantLitresCurrent,
      carburantLitresPrev,
      topFuelVehicles,
      operationsRealisees,
      operationsEnCours,
      operationsTotal,
      vehiculesEnAlerte,
      margeOperationnelle,
      barData,
      pieData,
    };
  }, [currentKey, prevKey]);

  // ── Variation carburant ──────────────────────────────────────────────────────
  const fuelVariation =
    data.carburantTotalPrev > 0
      ? (((data.carburantTotal - data.carburantTotalPrev) / data.carburantTotalPrev) * 100).toFixed(
          1
        )
      : null;

  // ── PDF Export ───────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Rapport Mensuel — ${monthLabel(currentKey)}`, 14, 18);
    doc.setFontSize(10);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} — IVOS`, 14, 26);

    let y = 34;
    autoTable(doc, {
      startY: y,
      head: [['Indicateur Financier', 'Montant (FCFA)']],
      body: [
        ['Masse Salariale', FCFA(data.masseSalariale)],
        ['  └ Salaires de base', FCFA(data.totalBaseSalary)],
        ['  └ Primes', FCFA(data.totalBonus)],
        ['  └ Cotisations / Retenues', FCFA(data.totalRetenues)],
        ['Total Facturé (CA)', FCFA(data.totalFacture)],
        ['Recouvrement en Cours', FCFA(data.recouvrementEnCours)],
        ['Dépenses Globales', FCFA(data.depensesGlobales)],
        ['Carburant', FCFA(data.carburantTotal)],
        ['Marge Opérationnelle', FCFA(data.margeOperationnelle)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [26, 26, 46] },
    });
    y = ((doc as unknown as AutoTableCarrier).lastAutoTable?.finalY || y) + 10;

    autoTable(doc, {
      startY: y,
      head: [['Carburant', 'Litres', 'Coût (FCFA)']],
      body: [
        [
          'Mois en cours',
          data.carburantLitresCurrent.toLocaleString('fr-FR'),
          FCFA(data.carburantTotal),
        ],
        [
          'Mois précédent',
          data.carburantLitresPrev.toLocaleString('fr-FR'),
          FCFA(data.carburantTotalPrev),
        ],
        ['Véhicules de Fonction', '—', FCFA(data.carburantFonction)],
        ['Véhicules de Parc', '—', FCFA(data.carburantParc)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [26, 26, 46] },
    });
    y = ((doc as unknown as AutoTableCarrier).lastAutoTable?.finalY || y) + 10;

    if (data.topFuelVehicles.length) {
      autoTable(doc, {
        startY: y,
        head: [['Rang', 'Véhicule', 'Coût Carburant (FCFA)']],
        body: data.topFuelVehicles.map((v, i) => [`#${i + 1}`, v.vehicule, FCFA(v.montant)]),
        theme: 'grid',
        headStyles: { fillColor: [26, 26, 46] },
      });
      y = ((doc as unknown as AutoTableCarrier).lastAutoTable?.finalY || y) + 10;
    }

    doc.text(`Opérations clôturées : ${data.operationsRealisees} / ${data.operationsTotal}`, 14, y);
    y += 8;

    if (data.vehiculesEnAlerte.length) {
      autoTable(doc, {
        startY: y,
        head: [['Véhicule', 'Marque / Modèle', 'Alertes']],
        body: data.vehiculesEnAlerte.map((v) => [
          v.registration,
          `${v.brand} ${v.model}`,
          v.alerts.join(', '),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38] },
      });
    }

    doc.save(`IVOS_Rapport_${currentKey}.pdf`);
  };

  // ── Date display ─────────────────────────────────────────────────────────────
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ── Month selector options ───────────────────────────────────────────────────
  const years = [2024, 2025, 2026, 2027];
  const monthOptions = [
    { v: 1, l: 'Janvier' },
    { v: 2, l: 'Février' },
    { v: 3, l: 'Mars' },
    { v: 4, l: 'Avril' },
    { v: 5, l: 'Mai' },
    { v: 6, l: 'Juin' },
    { v: 7, l: 'Juillet' },
    { v: 8, l: 'Août' },
    { v: 9, l: 'Septembre' },
    { v: 10, l: 'Octobre' },
    { v: 11, l: 'Novembre' },
    { v: 12, l: 'Décembre' },
  ];

  // ── Inventory stats (quick row) ─────────────────────────────────────────────
  const inventoryStats = [
    {
      label: 'Véhicules',
      value: data.vehicles.total,
      sub: `${data.vehicles.active} actifs`,
      gradient: 'from-blue-500 to-blue-700',
      icon: <Truck className="h-5 w-5" />,
    },
    {
      label: 'Chauffeurs',
      value: data.drivers.total,
      sub: 'Enregistrés',
      gradient: 'from-indigo-500 to-indigo-700',
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: 'Clients',
      value: data.clients.total,
      sub: 'Partenaires',
      gradient: 'from-green-500 to-green-700',
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      label: 'Personnel',
      value: data.personnel.total,
      sub: 'Agents',
      gradient: 'from-purple-500 to-purple-700',
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: 'Carburant',
      value: `${data.totalFuelLitres.toLocaleString('fr-FR')} L`,
      sub: 'Cumul global',
      gradient: 'from-amber-500 to-orange-600',
      icon: <Fuel className="h-5 w-5" />,
    },
    {
      label: 'Sinistres',
      value: data.claims.open,
      sub: `/ ${data.claims.total} total`,
      gradient: 'from-red-500 to-red-700',
      icon: <AlertTriangle className="h-5 w-5" />,
    },
  ];

  return (
    <div className="min-h-screen w-full pb-10">
      {/* ═══ HEADER ═══ */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 text-white">
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10">
              <LayoutDashboard className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Tableau de Bord IVOS</h1>
              <p className="text-sm text-gray-300">
                Centre de décision en temps réel — {monthLabel(currentKey)}
                {activeSite ? ` · ${activeSite.name}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Sélecteur de période */}
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
              <Calendar className="h-4 w-4 text-gray-300" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="cursor-pointer border-none bg-transparent text-sm text-white outline-none"
              >
                {monthOptions.map((m) => (
                  <option key={m.v} value={m.v} className="text-gray-900">
                    {m.l}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="cursor-pointer border-none bg-transparent text-sm text-white outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y} className="text-gray-900">
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {/* Date + Statut */}
            <div className="hidden text-right md:block">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Calendar className="h-4 w-4" />
                <span className="capitalize">{dateStr}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-end gap-1.5">
                <Activity className="h-3.5 w-3.5 text-green-400" />
                <span className="text-xs font-semibold text-green-400">Système opérationnel</span>
              </div>
            </div>
            {/* Export PDF */}
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              <Download className="h-4 w-4" />
              📥 Exporter le Rapport Mensuel
            </button>
          </div>
        </div>
      </div>

      {/* ═══ BANDEAU INVENTAIRE RAPIDE ═══ */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {inventoryStats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-xl bg-white p-3.5 shadow transition-shadow hover:shadow-md"
          >
            <div
              className={`h-10 w-10 rounded-lg bg-gradient-to-br ${s.gradient} flex shrink-0 items-center justify-center text-white`}
            >
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight text-gray-900">{s.value}</p>
              <p className="truncate text-[11px] text-gray-500">
                {s.label} — {s.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ SECTION 1 — WIDGETS FINANCIERS ═══ */}
      <SectionTitle
        icon={<DollarSign className="h-5 w-5" />}
        title="Indicateurs Financiers — Mois en Cours"
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <WidgetCard
          icon={<Users className="h-6 w-6" />}
          gradient="from-indigo-500 to-indigo-700"
          label="Masse Salariale"
          value={FCFA(data.masseSalariale)}
          sub={`Base ${FCFA(data.totalBaseSalary)} · Primes ${FCFA(data.totalBonus)} · Cotis. ${FCFA(data.totalRetenues)}`}
        />
        <WidgetCard
          icon={<Receipt className="h-6 w-6" />}
          gradient="from-green-500 to-green-700"
          label="Total Facturé"
          value={FCFA(data.totalFacture)}
          sub="Chiffre d'affaires du mois"
        />
        <WidgetCard
          icon={<Banknote className="h-6 w-6" />}
          gradient="from-amber-500 to-amber-700"
          label="Recouvrement en Cours"
          value={FCFA(data.recouvrementEnCours)}
          sub="Factures impayées"
          danger={data.recouvrementEnCours > 0}
        />
        <WidgetCard
          icon={<Wallet className="h-6 w-6" />}
          gradient="from-red-500 to-red-700"
          label="Dépenses Globales"
          value={FCFA(data.depensesGlobales)}
          sub="Carburant + Salaires + Charges"
        />
        <div
          className={`overflow-hidden rounded-2xl shadow-md ${data.margeOperationnelle >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-red-500 to-red-700'} text-white`}
        >
          <div className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xl font-extrabold leading-tight">{FCFA(data.margeOperationnelle)}</p>
            <p className="mt-1 text-xs font-semibold opacity-90">Marge Opérationnelle</p>
            <p className="mt-0.5 text-[11px] opacity-70">CA - (Carburant + Masse Salariale)</p>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 2 — CARBURANT & GRAPHIQUES ═══ */}
      <SectionTitle
        icon={<Fuel className="h-5 w-5" />}
        title="Analyse du Carburant & Comparaisons"
      />

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Comparatif Mensuel — Bar Chart */}
        <div className="rounded-2xl bg-white p-5 shadow-md">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#1a1a2e]">
            📊 Comparatif Mensuel
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.barData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number, name: string) =>
                    name === 'Coût' ? FCFA(v) : `${v.toLocaleString('fr-FR')} L`
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Litres" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Coût" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {fuelVariation && (
            <div
              className={`mt-3 flex items-center justify-center gap-1 text-sm font-semibold ${Number(fuelVariation) <= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {Number(fuelVariation) <= 0 ? (
                <ArrowDownRight className="h-4 w-4" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
              {fuelVariation}% vs mois précédent
            </div>
          )}
        </div>

        {/* Répartition Donut Chart */}
        <div className="rounded-2xl bg-white p-5 shadow-md">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#1a1a2e]">
            🍩 Répartition Coût Carburant
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name.split(' ').pop()}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {data.pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => FCFA(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-6 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-blue-500" /> Fonction :{' '}
              {FCFA(data.carburantFonction)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-amber-500" /> Parc :{' '}
              {FCFA(data.carburantParc)}
            </span>
          </div>
        </div>

        {/* Top 3 Énergivores */}
        <div className="rounded-2xl bg-white p-5 shadow-md">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#1a1a2e]">
            🔥 Top 3 Véhicules Énergivores
          </h3>
          {data.topFuelVehicles.length === 0 ? (
            <p className="mt-12 text-center text-sm text-gray-400">
              Aucune donnée carburant ce mois
            </p>
          ) : (
            <div className="mt-2 space-y-4">
              {data.topFuelVehicles.map((v, i) => {
                const colors = ['bg-red-500', 'bg-amber-500', 'bg-yellow-500'];
                const maxVal = data.topFuelVehicles[0]?.montant || 1;
                const pct = Math.round((v.montant / maxVal) * 100);
                return (
                  <div key={v.vehicule}>
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-7 w-7 rounded-full ${colors[i]} flex items-center justify-center text-xs font-bold text-white`}
                        >
                          #{i + 1}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">{v.vehicule}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{FCFA(v.montant)}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-gray-100">
                      <div
                        className={`h-2.5 rounded-full ${colors[i]} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ SECTION 3 — OPÉRATIONS & CONFORMITÉ ═══ */}
      <SectionTitle
        icon={<ClipboardList className="h-5 w-5" />}
        title="Alertes Conformité & Opérations"
      />

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Activités — Operations */}
        <div className="rounded-2xl bg-white p-5 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#1a1a2e]">
              Activités — Opérations
            </h3>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-xs text-gray-500">{monthLabel(currentKey)}</span>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-green-50 p-3 text-center">
              <p className="text-2xl font-extrabold text-green-700">{data.operationsRealisees}</p>
              <p className="mt-0.5 text-[11px] font-medium text-green-600">Clôturées</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-center">
              <p className="text-2xl font-extrabold text-amber-700">{data.operationsEnCours}</p>
              <p className="mt-0.5 text-[11px] font-medium text-amber-600">En cours</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-2xl font-extrabold text-gray-700">{data.operationsTotal}</p>
              <p className="mt-0.5 text-[11px] font-medium text-gray-500">Total</p>
            </div>
          </div>

          {data.operationsTotal > 0 && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>Progression</span>
                <span>{Math.round((data.operationsRealisees / data.operationsTotal) * 100)}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-100">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-600 transition-all"
                  style={{
                    width: `${Math.min(100, (data.operationsRealisees / data.operationsTotal) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tableau d'Urgence — Conformité */}
        <div className="rounded-2xl bg-white p-5 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#1a1a2e]">
              ⚠️ Tableau d'Urgence — Échéances ≤ 15 jours
            </h3>
            {data.vehiculesEnAlerte.length > 0 && (
              <span className="animate-pulse rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                {data.vehiculesEnAlerte.length} alerte{data.vehiculesEnAlerte.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {data.vehiculesEnAlerte.length === 0 ? (
            <div className="py-10 text-center">
              <ShieldAlert className="mx-auto mb-2 h-10 w-10 text-green-400" />
              <p className="text-sm font-medium text-green-600">
                Tous les véhicules sont conformes
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Aucune VT ni assurance n'expire sous 15 jours
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#1a1a2e] text-xs uppercase text-white">
                    <th className="rounded-tl-lg px-4 py-2.5 text-left">Immatriculation</th>
                    <th className="px-4 py-2.5 text-left">Véhicule</th>
                    <th className="rounded-tr-lg px-4 py-2.5 text-left">Alertes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vehiculesEnAlerte.map((v, idx) => (
                    <tr key={v.registration} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">
                        {v.registration}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">
                        {v.brand} {v.model}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {v.alerts.map((a) => (
                            <span
                              key={a}
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                a.includes('Expirée')
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ═══ SECTION 4 — TABLEAU RÉCAPITULATIF MODULES ═══ */}
      <SectionTitle icon={<Activity className="h-5 w-5" />} title="État des Modules" />

      <div className="overflow-hidden rounded-2xl bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-[#1a1a2e] text-xs uppercase text-white">
                <th className="px-4 py-3 text-left">Module</th>
                <th className="px-4 py-3 text-left">Éléments</th>
                <th className="px-4 py-3 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  module: 'Flotte',
                  count: data.vehicles.total,
                  status: data.vehicles.active > 0 ? `${data.vehicles.active} actifs` : 'Vide',
                  ok: data.vehicles.active > 0,
                },
                {
                  module: 'Chauffeurs',
                  count: data.drivers.total,
                  status: data.drivers.total > 0 ? 'Actif' : 'Vide',
                  ok: data.drivers.total > 0,
                },
                {
                  module: 'Clients',
                  count: data.clients.total,
                  status: data.clients.total > 0 ? 'Actif' : 'Vide',
                  ok: data.clients.total > 0,
                },
                {
                  module: 'Carburant',
                  count: `${data.totalFuelLitres.toLocaleString('fr-FR')} L`,
                  status: data.totalFuelLitres > 0 ? 'Approvisionné' : 'Vide',
                  ok: data.totalFuelLitres > 0,
                },
                {
                  module: 'Pneumatiques',
                  count: data.pneus.total,
                  status: data.pneus.total > 0 ? 'En stock' : 'Vide',
                  ok: data.pneus.total > 0,
                },
                {
                  module: 'Sinistres',
                  count: data.claims.total,
                  status: data.claims.open > 0 ? `${data.claims.open} ouvert(s)` : 'Aucun ouvert',
                  ok: data.claims.open === 0,
                },
                {
                  module: 'Matériels',
                  count: data.materiels.total,
                  status: data.materiels.total > 0 ? 'Inventorié' : 'Vide',
                  ok: data.materiels.total > 0,
                },
              ].map((r, idx) => (
                <tr
                  key={r.module}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} transition-colors hover:bg-blue-50`}
                >
                  <td className="px-4 py-3 text-sm font-semibold">{r.module}</td>
                  <td className="px-4 py-3 text-sm">{r.count}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.ok ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-4 mt-2 flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a1a2e] text-white">
        {icon}
      </div>
      <h2 className="text-base font-bold uppercase tracking-wide text-[#1a1a2e]">{title}</h2>
    </div>
  );
}

function WidgetCard({
  icon,
  gradient,
  label,
  value,
  sub,
  danger,
}: {
  icon: React.ReactNode;
  gradient: string;
  label: string;
  value: string;
  sub: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl bg-white shadow-md transition-shadow hover:shadow-lg ${danger ? 'ring-2 ring-amber-400' : ''}`}
    >
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <div
            className={`h-11 w-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}
          >
            {icon}
          </div>
        </div>
        <p className="text-lg font-extrabold leading-tight text-gray-900">{value}</p>
        <p className="mt-1 text-xs font-semibold text-[#1a1a2e]">{label}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-gray-400">{sub}</p>
      </div>
    </div>
  );
}
