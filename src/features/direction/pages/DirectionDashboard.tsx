import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, DollarSign, Fuel, ShieldAlert, ClipboardList,
  Download, Calendar, AlertTriangle, Truck, Users, Banknote, Receipt,
  Wallet, ArrowUpRight, ArrowDownRight, Activity, ChevronDown
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { vehiclesStore } from '../../fleet/services/vehiclesStore';
import { carburantStore, type Plein } from '../../fleet/services/carburantStore';
import { personnelStore } from '../../fleet/services/personnelStore';
import { getWorkflowInvoices, type WorkflowInvoice } from '../../finances/services/workflowInvoiceService';
import { getAllOperations } from '../../exploitation/services/operationService';

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
  siteCode?: string;
  createdAt?: string;
}

interface Vehicle {
  id: string;
  registration: string;
  brand: string;
  model: string;
  type: string;
  status: string;
  insuranceExpiry: string;
  technicalControlExpiry: string;
  fuelRecords?: { totalCost: number; date: string }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const FCFA = (n: number) =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA';

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function loadPayslips(): Payslip[] {
  try {
    const raw = localStorage.getItem('ivos_payslips_v1');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem('ivos_global_expenses_v1');
    return raw ? JSON.parse(raw) : [];
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
    return getAllOperations().map(op => ({
      numero: op.numero,
      status: op.status === 'cloturee' ? 'completed' : 'in_progress',
      currentStep: op.status === 'cloturee' ? 5 : 3,
      documentType: 'BSD',
      createdAt: op.createdAt,
    }));
  } catch {
    try {
      return getAllOperations().map(op => ({
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

// ── Color palette ──────────────────────────────────────────────────────────────

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

// ── Component ──────────────────────────────────────────────────────────────────

export default function DirectionDashboard() {
  const [, setTick] = useState(0);
  const reload = useCallback(() => setTick(t => t + 1), []);

  // ── Filtre temporel ──────────────────────────────────────────────────────────
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const currentKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const prevKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  // ── Live reload ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const events = [
      'fleetVehicles:updated', 'carburant:updated', 'personnel:updated',
      'ivos_payslips_change', 'ivos_expenses_change', 'ivos_invoice_change',
      'ivos_exploitation_change', 'ivos_operations_change',
    ];
    events.forEach(e => window.addEventListener(e, reload));
    return () => events.forEach(e => window.removeEventListener(e, reload));
  }, [reload]);

  // ── Data aggregation ─────────────────────────────────────────────────────────
  const data = useMemo(() => {
    const vehicles: Vehicle[] = vehiclesStore.load();
    const carburant: Plein[] = carburantStore.load();
    const personnel: any[] = personnelStore.load();
    const payslips = loadPayslips();
    const expenses = loadExpenses();
    const invoices: WorkflowInvoice[] = getWorkflowInvoices();
    const operations = loadOperations();

    // ── 1. Masse Salariale (mois sélectionné) ─────────────────────────────────
    const monthPayslips = payslips.filter(p => p.month === currentKey);
    const totalBaseSalary = monthPayslips.reduce((s, p) => s + (p.baseSalary || 0), 0);
    const totalBonus = monthPayslips.reduce((s, p) => s + (p.bonus || 0), 0);
    const totalRetenues = monthPayslips.reduce((s, p) => s + (p.retenues || 0), 0);
    const masseSalariale = totalBaseSalary + totalBonus + totalRetenues;

    // ── 2. Facturation ─────────────────────────────────────────────────────────
    const monthInvoices = invoices.filter(inv => {
      const d = inv.createdAt?.slice(0, 7);
      return d === currentKey;
    });
    const totalFacture = monthInvoices.reduce((s, inv) => s + (inv.montantHT || 0), 0);
    const recouvrementEnCours = monthInvoices
      .filter(inv => inv.status !== 'payee' && inv.status !== 'annulee')
      .reduce((s, inv) => s + (inv.montantHT || 0), 0);

    // ── 3. Dépenses Globales ───────────────────────────────────────────────────
    const monthExpenses = expenses.filter(e => e.date?.slice(0, 7) === currentKey);
    const totalExpenses = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const depenseCarburantExpenses = monthExpenses
      .filter(e => e.category === 'Carburant')
      .reduce((s, e) => s + (e.amount || 0), 0);

    // Carburant from fuel store (montant)
    const monthCarburant = carburant.filter(p => p.date?.slice(0, 7) === currentKey);
    const carburantTotal = monthCarburant.reduce((s, p) => s + (p.montant || 0), 0);
    const prevMonthCarburant = carburant.filter(p => p.date?.slice(0, 7) === prevKey);
    const carburantTotalPrev = prevMonthCarburant.reduce((s, p) => s + (p.montant || 0), 0);

    const depensesGlobales = totalExpenses + carburantTotal + masseSalariale;

    // ── 4. Ventilation Carburant : Fonction vs Parc ────────────────────────────
    const vehicleTypeMap: Record<string, string> = {};
    vehicles.forEach(v => {
      vehicleTypeMap[v.registration] = v.type;
    });

    let carburantFonction = 0;
    let carburantParc = 0;
    monthCarburant.forEach(p => {
      const vType = vehicleTypeMap[p.vehicule] || '';
      if (vType.toLowerCase().includes('fonction')) {
        carburantFonction += p.montant || 0;
      } else {
        carburantParc += p.montant || 0;
      }
    });

    // ── 5. Comparatif Mensuel Carburant ────────────────────────────────────────
    const carburantLitresCurrent = monthCarburant.reduce((s, p) => s + (p.litres || 0), 0);
    const carburantLitresPrev = prevMonthCarburant.reduce((s, p) => s + (p.litres || 0), 0);

    // ── 6. Top 3 Véhicules Énergivores ─────────────────────────────────────────
    const fuelByVehicle: Record<string, number> = {};
    monthCarburant.forEach(p => {
      fuelByVehicle[p.vehicule] = (fuelByVehicle[p.vehicule] || 0) + (p.montant || 0);
    });
    const topFuelVehicles = Object.entries(fuelByVehicle)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([vehicule, montant]) => ({ vehicule, montant }));

    // ── 7. Operations réalisées ──────────────────────────────────────────────────
    const monthOperations = operations.filter(m => {
      const d = m.createdAt?.slice(0, 7);
      return d === currentKey;
    });
    const operationsRealisees = monthOperations.filter(
      m => m.currentStep >= 5 || m.status === 'completed'
    ).length;
    const operationsTotal = monthOperations.length;

    // ── 8. Véhicules Conformité (expiration ≤ 15 jours) ───────────────────────
    const today = new Date();
    const in15Days = new Date();
    in15Days.setDate(today.getDate() + 15);

    const vehiculesEnAlerte = vehicles.filter(v => {
      const vtDate = v.technicalControlExpiry ? new Date(v.technicalControlExpiry) : null;
      const assDate = v.insuranceExpiry ? new Date(v.insuranceExpiry) : null;
      return (vtDate && vtDate <= in15Days) || (assDate && assDate <= in15Days);
    }).map(v => {
      const alerts: string[] = [];
      const vtDate = v.technicalControlExpiry ? new Date(v.technicalControlExpiry) : null;
      const assDate = v.insuranceExpiry ? new Date(v.insuranceExpiry) : null;
      if (vtDate && vtDate <= in15Days) {
        const j = Math.ceil((vtDate.getTime() - today.getTime()) / 86400000);
        alerts.push(j <= 0 ? 'VT Expirée' : `VT dans ${j}j`);
      }
      if (assDate && assDate <= in15Days) {
        const j = Math.ceil((assDate.getTime() - today.getTime()) / 86400000);
        alerts.push(j <= 0 ? 'Assurance Expirée' : `Assurance dans ${j}j`);
      }
      return { registration: v.registration, brand: v.brand, model: v.model, alerts };
    });

    // ── 9. Marge Opérationnelle ────────────────────────────────────────────────
    const chiffreAffaires = totalFacture;
    const margeOperationnelle = chiffreAffaires - (carburantTotal + masseSalariale);

    // ── 10. Comparatif Barres (consommation L + coût) ──────────────────────────
    const barData = [
      {
        name: monthLabel(prevKey),
        'Litres': Math.round(carburantLitresPrev),
        'Coût (FCFA)': carburantTotalPrev,
      },
      {
        name: monthLabel(currentKey),
        'Litres': Math.round(carburantLitresCurrent),
        'Coût (FCFA)': carburantTotal,
      },
    ];

    // ── 11. Pie chart data ─────────────────────────────────────────────────────
    const pieData = [
      { name: 'Véhicules de Fonction', value: carburantFonction },
      { name: 'Véhicules de Parc', value: carburantParc },
    ].filter(d => d.value > 0);

    if (pieData.length === 0) {
      pieData.push({ name: 'Véhicules de Parc', value: carburantTotal || 1 });
    }

    // ── Expenses breakdown by category ─────────────────────────────────────────
    const expenseByCategory: Record<string, number> = {};
    monthExpenses.forEach(e => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + (e.amount || 0);
    });

    return {
      masseSalariale, totalBaseSalary, totalBonus, totalRetenues,
      totalFacture, recouvrementEnCours,
      depensesGlobales, carburantTotal, carburantTotalPrev,
      carburantFonction, carburantParc,
      carburantLitresCurrent, carburantLitresPrev,
      topFuelVehicles,
      operationsRealisees, operationsTotal,
      vehiculesEnAlerte,
      margeOperationnelle, chiffreAffaires,
      barData, pieData, expenseByCategory,
      personnelCount: personnel.length,
      vehiclesCount: vehicles.length,
    };
  }, [currentKey, prevKey]);

  // ── Variation helpers ────────────────────────────────────────────────────────
  const fuelVariation = data.carburantTotalPrev > 0
    ? ((data.carburantTotal - data.carburantTotalPrev) / data.carburantTotalPrev * 100).toFixed(1)
    : null;

  // ── PDF Export ───────────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF();
    const title = `Rapport Direction — ${monthLabel(currentKey)}`;
    doc.setFontSize(16);
    doc.text(title, 14, 18);
    doc.setFontSize(10);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 26);

    let y = 34;

    // Indicateurs Financiers
    autoTable(doc, {
      startY: y,
      head: [['Indicateur', 'Montant (FCFA)']],
      body: [
        ['Masse Salariale (Salaires + Primes + Cotisations)', data.masseSalariale.toLocaleString('fr-FR')],
        ['  └ Salaires de base', data.totalBaseSalary.toLocaleString('fr-FR')],
        ['  └ Primes', data.totalBonus.toLocaleString('fr-FR')],
        ['  └ Cotisations / Retenues', data.totalRetenues.toLocaleString('fr-FR')],
        ['Total Facturé', data.totalFacture.toLocaleString('fr-FR')],
        ['Recouvrement en Cours (Impayés)', data.recouvrementEnCours.toLocaleString('fr-FR')],
        ['Dépenses Globales', data.depensesGlobales.toLocaleString('fr-FR')],
        ['Carburant Total', data.carburantTotal.toLocaleString('fr-FR')],
        ['Marge Opérationnelle', data.margeOperationnelle.toLocaleString('fr-FR')],
      ],
      theme: 'grid',
      headStyles: { fillColor: [26, 26, 46] },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Carburant
    autoTable(doc, {
      startY: y,
      head: [['Carburant', 'Litres', 'Coût (FCFA)']],
      body: [
        ['Mois en cours', data.carburantLitresCurrent.toLocaleString('fr-FR'), data.carburantTotal.toLocaleString('fr-FR')],
        ['Mois précédent', data.carburantLitresPrev.toLocaleString('fr-FR'), data.carburantTotalPrev.toLocaleString('fr-FR')],
        ['Véhicules de Fonction', '—', data.carburantFonction.toLocaleString('fr-FR')],
        ['Véhicules de Parc', '—', data.carburantParc.toLocaleString('fr-FR')],
      ],
      theme: 'grid',
      headStyles: { fillColor: [26, 26, 46] },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Top 3 Énergivores
    if (data.topFuelVehicles.length) {
      autoTable(doc, {
        startY: y,
        head: [['Rang', 'Véhicule', 'Coût Carburant (FCFA)']],
        body: data.topFuelVehicles.map((v, i) => [
          `#${i + 1}`, v.vehicule, v.montant.toLocaleString('fr-FR'),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [26, 26, 46] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // Operations
    doc.text(`Opérations réalisées : ${data.operationsRealisees} / ${data.operationsTotal}`, 14, y);
    y += 8;

    // Alertes Conformité
    if (data.vehiculesEnAlerte.length) {
      autoTable(doc, {
        startY: y,
        head: [['Véhicule', 'Marque / Modèle', 'Alertes']],
        body: data.vehiculesEnAlerte.map(v => [
          v.registration, `${v.brand} ${v.model}`, v.alerts.join(', '),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38] },
      });
    }

    doc.save(`Rapport_Direction_${currentKey}.pdf`);
  };

  // ── Month selector options ───────────────────────────────────────────────────
  const years = [2024, 2025, 2026, 2027];
  const months = [
    { v: 1, l: 'Janvier' }, { v: 2, l: 'Février' }, { v: 3, l: 'Mars' },
    { v: 4, l: 'Avril' }, { v: 5, l: 'Mai' }, { v: 6, l: 'Juin' },
    { v: 7, l: 'Juillet' }, { v: 8, l: 'Août' }, { v: 9, l: 'Septembre' },
    { v: 10, l: 'Octobre' }, { v: 11, l: 'Novembre' }, { v: 12, l: 'Décembre' },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen pb-10">

      {/* ═══ HEADER ═══ */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard de Direction</h1>
              <p className="text-sm text-gray-300">
                Vue consolidée — {monthLabel(currentKey)}
              </p>
            </div>
          </div>

          {/* Filtre temporel + Export */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-gray-300" />
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-white text-sm border-none outline-none cursor-pointer"
              >
                {months.map(m => (
                  <option key={m.v} value={m.v} className="text-gray-900">{m.l}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-white text-sm border-none outline-none cursor-pointer"
              >
                {years.map(y => (
                  <option key={y} value={y} className="text-gray-900">{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              📥 Télécharger Rapport PDF
            </button>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 1 — WIDGETS FINANCIERS ═══ */}
      <SectionTitle icon={<DollarSign className="w-5 h-5" />} title="Indicateurs Financiers — Mois en Cours" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {/* Masse Salariale */}
        <WidgetCard
          icon={<Users className="w-6 h-6" />}
          gradient="from-indigo-500 to-indigo-700"
          label="Masse Salariale"
          value={FCFA(data.masseSalariale)}
          sub={`Salaires ${FCFA(data.totalBaseSalary)} · Primes ${FCFA(data.totalBonus)} · Cotisations ${FCFA(data.totalRetenues)}`}
        />

        {/* Total Facturé */}
        <WidgetCard
          icon={<Receipt className="w-6 h-6" />}
          gradient="from-green-500 to-green-700"
          label="Total Facturé"
          value={FCFA(data.totalFacture)}
          sub={`CA du mois`}
        />

        {/* Recouvrement en Cours */}
        <WidgetCard
          icon={<Banknote className="w-6 h-6" />}
          gradient="from-amber-500 to-amber-700"
          label="Recouvrement en Cours"
          value={FCFA(data.recouvrementEnCours)}
          sub="Factures impayées"
          danger={data.recouvrementEnCours > 0}
        />

        {/* Dépenses Globales */}
        <WidgetCard
          icon={<Wallet className="w-6 h-6" />}
          gradient="from-red-500 to-red-700"
          label="Dépenses Globales"
          value={FCFA(data.depensesGlobales)}
          sub={`Carburant + Salaires + Charges`}
        />
      </div>

      {/* ═══ SECTION 2 — CARBURANT & GRAPHIQUES ═══ */}
      <SectionTitle icon={<Fuel className="w-5 h-5" />} title="Analyse du Carburant" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">

        {/* Ventilation Pie Chart */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h3 className="text-sm font-bold text-[#1a1a2e] uppercase tracking-wide mb-4">
            Ventilation Coût Carburant
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {data.pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => FCFA(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Fonction : {FCFA(data.carburantFonction)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Parc : {FCFA(data.carburantParc)}
            </span>
          </div>
        </div>

        {/* Comparatif Mensuel Bar Chart */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h3 className="text-sm font-bold text-[#1a1a2e] uppercase tracking-wide mb-4">
            Comparatif Mensuel — Consommation
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.barData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number, name: string) =>
                  name.includes('FCFA') ? FCFA(v) : `${v.toLocaleString('fr-FR')} L`
                } />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Litres" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Coût (FCFA)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {fuelVariation && (
            <div className={`flex items-center justify-center gap-1 mt-3 text-sm font-semibold ${
              Number(fuelVariation) <= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {Number(fuelVariation) <= 0
                ? <ArrowDownRight className="w-4 h-4" />
                : <ArrowUpRight className="w-4 h-4" />
              }
              {fuelVariation}% vs mois précédent
            </div>
          )}
        </div>

        {/* Top 3 Véhicules les plus énergivores */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h3 className="text-sm font-bold text-[#1a1a2e] uppercase tracking-wide mb-4">
            🔥 Top 3 Véhicules Énergivores
          </h3>
          {data.topFuelVehicles.length === 0 ? (
            <p className="text-sm text-gray-400 mt-8 text-center">Aucune donnée carburant ce mois</p>
          ) : (
            <div className="space-y-3">
              {data.topFuelVehicles.map((v, i) => {
                const colors = ['bg-red-500', 'bg-amber-500', 'bg-yellow-500'];
                const maxVal = data.topFuelVehicles[0]?.montant || 1;
                const pct = Math.round((v.montant / maxVal) * 100);
                return (
                  <div key={v.vehicule} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-full ${colors[i]} text-white text-xs font-bold flex items-center justify-center`}>
                          #{i + 1}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">{v.vehicule}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{FCFA(v.montant)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${colors[i]}`}
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
      <SectionTitle icon={<ClipboardList className="w-5 h-5" />} title="Suivi des Opérations & Conformité" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">

        {/* Operations réalisées */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#1a1a2e] uppercase tracking-wide">
              Activité — Opérations
            </h3>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">Mois en cours</span>
            </div>
          </div>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-4xl font-extrabold text-[#1a1a2e]">{data.operationsRealisees}</p>
              <p className="text-sm text-gray-500 mt-1">opérations réalisées</p>
            </div>
            <div className="pb-1">
              <p className="text-lg font-bold text-gray-400">/ {data.operationsTotal}</p>
              <p className="text-xs text-gray-400">total créées</p>
            </div>
          </div>
          {data.operationsTotal > 0 && (
            <div className="mt-4">
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                  style={{ width: `${Math.min(100, (data.operationsRealisees / data.operationsTotal) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-right">
                {Math.round((data.operationsRealisees / data.operationsTotal) * 100)}% de réalisation
              </p>
            </div>
          )}
        </div>

        {/* Véhicules en alerte conformité */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#1a1a2e] uppercase tracking-wide">
              ⚠️ Sécurité — Conformité Véhicules
            </h3>
            {data.vehiculesEnAlerte.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                {data.vehiculesEnAlerte.length} alerte{data.vehiculesEnAlerte.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {data.vehiculesEnAlerte.length === 0 ? (
            <div className="text-center py-8">
              <ShieldAlert className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-green-600 font-medium">Tous les véhicules sont conformes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                    <th className="px-4 py-2.5 text-left rounded-tl-lg">Immatriculation</th>
                    <th className="px-4 py-2.5 text-left">Véhicule</th>
                    <th className="px-4 py-2.5 text-left rounded-tr-lg">Alertes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vehiculesEnAlerte.map((v, idx) => (
                    <tr key={v.registration} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-sm font-semibold text-gray-900">{v.registration}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{v.brand} {v.model}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {v.alerts.map(a => (
                            <span
                              key={a}
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
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

      {/* ═══ SECTION 4 — MARGE OPÉRATIONNELLE ═══ */}
      <SectionTitle icon={<TrendingUp className="w-5 h-5" />} title="Indicateur de Rentabilité" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MargeCard
          label="Chiffre d'Affaires"
          value={data.chiffreAffaires}
          icon={<Receipt className="w-5 h-5" />}
          color="text-green-700 bg-green-50"
        />
        <MargeCard
          label="Coûts (Carburant + Salaires)"
          value={data.carburantTotal + data.masseSalariale}
          icon={<Wallet className="w-5 h-5" />}
          color="text-red-700 bg-red-50"
        />
        <div className={`rounded-2xl shadow-md p-5 ${
          data.margeOperationnelle >= 0 ? 'bg-gradient-to-br from-green-500 to-green-700' : 'bg-gradient-to-br from-red-500 to-red-700'
        } text-white`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-90">Marge Opérationnelle</span>
          </div>
          <p className="text-3xl font-extrabold">{FCFA(data.margeOperationnelle)}</p>
          <p className="text-xs mt-1 opacity-80">CA - (Carburant + Masse Salariale)</p>
        </div>
      </div>

      {/* ═══ SECTION 5 — DÉPENSES PAR CATÉGORIE ═══ */}
      {Object.keys(data.expenseByCategory).length > 0 && (
        <>
          <SectionTitle icon={<DollarSign className="w-5 h-5" />} title="Répartition des Dépenses par Catégorie" />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
            {Object.entries(data.expenseByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount], i) => (
              <div key={cat} className="bg-white rounded-xl shadow p-4 text-center hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white bg-gradient-to-br ${
                  ['from-blue-500 to-blue-700', 'from-amber-500 to-amber-600', 'from-emerald-500 to-emerald-600',
                   'from-purple-500 to-purple-600', 'from-cyan-500 to-cyan-600', 'from-rose-500 to-rose-600'][i % 6]
                }`}>
                  <DollarSign className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-gray-500 truncate">{cat}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{FCFA(amount)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 mt-2">
      <div className="w-8 h-8 rounded-lg bg-[#1a1a2e] text-white flex items-center justify-center">{icon}</div>
      <h2 className="text-base font-bold text-[#1a1a2e] uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function WidgetCard({
  icon, gradient, label, value, sub, danger,
}: {
  icon: React.ReactNode;
  gradient: string;
  label: string;
  value: string;
  sub: string;
  danger?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow ${danger ? 'ring-2 ring-amber-400' : ''}`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
            {icon}
          </div>
        </div>
        <p className="text-lg font-extrabold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs font-semibold text-[#1a1a2e] mt-1">{label}</p>
        <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{sub}</p>
      </div>
    </div>
  );
}

function MargeCard({
  label, value, icon, color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`rounded-2xl shadow-md p-5 ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-extrabold">{FCFA(value)}</p>
    </div>
  );
}
