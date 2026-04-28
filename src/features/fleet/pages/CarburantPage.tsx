import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Fuel, Plus, DollarSign, Gauge, AlertTriangle, TrendingUp,
  BarChart3, Droplets, Search, Trash2, Eye, EyeOff, ChevronDown,
  Truck, CreditCard, X, Bell, BellOff, CheckCircle2,
  Download, Calendar, Activity, Info, Archive, Edit3, Wallet,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { carburantStore, Plein } from '../services/carburantStore';
import { vehiclesStore } from '../services/vehiclesStore';
import { personalVehiclesStore } from '../services/personalVehiclesStore';
import { personnelStore } from '../services/personnelStore';
import { dotationStore } from '../services/dotationStore';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

// ─── Types ────────────────────────────────────────────────────

interface UnifiedVehicle {
  registration: string;
  brand: string;
  model: string;
  source: 'parc' | 'fonction';
  driver: string;
  fuelType: string;
  dotationMensuelle: number;
  carteCarburant: string;
}

type FuelLabel = 'Gazole' | 'Essence' | 'Super';
const FUEL_TYPES: FuelLabel[] = ['Gazole', 'Essence', 'Super'];

const MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/** Convertit "2025-01" en "Janvier 2025" */
function formatMoisFr(mois: string): string {
  const [y, m] = mois.split('-');
  const idx = parseInt(m, 10) - 1;
  return `${MOIS_FR[idx] ?? m} ${y}`;
}

function normalizeFuelType(vehFuelType: string): FuelLabel {
  const lower = (vehFuelType || '').toLowerCase();
  if (lower === 'diesel' || lower === 'gazole' || lower === 'gasoil') return 'Gazole';
  if (lower === 'essence') return 'Essence';
  if (lower === 'super') return 'Super';
  return 'Gazole';
}

function fuelBadge(type?: string) {
  if (!type) return null;
  const t = (type || '').toLowerCase();
  if (t === 'gazole' || t === 'diesel' || t === 'gasoil') {
    return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-black bg-blue-100 text-blue-700 border border-blue-200" title="Gazole">G</span>;
  }
  if (t === 'essence') {
    return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200" title="Essence">E</span>;
  }
  if (t === 'super') {
    return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200" title="Super">S</span>;
  }
  return <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold bg-gray-100 text-gray-500" title={type}>{(type || '?')[0]}</span>;
}

// ─── Monthly Archive with Snapshot ────────────────────────────
const ARCHIVE_KEY = 'ivos_carburant_archives_v1';

interface MonthlyArchive {
  mois: string;
  archivedAt: string;
  pleins: Plein[];
  snapshot?: {
    litresGazole: number;
    litresEssence: number;
    montantTotal: number;
    dotationsTotal: number;
  };
}

function loadArchives(): MonthlyArchive[] {
  try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]'); } catch { return []; }
}

function saveArchives(archives: MonthlyArchive[]) {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archives));
}

/** Archive previous months + build snapshot + archive card statements */
function archiveIfNeeded(pleins: Plein[], vehicleSourceMap?: Map<string, 'parc' | 'fonction'>): { archived: boolean } {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const archives = loadArchives();
  const prevMonthPleins = pleins.filter(p => p.date.slice(0, 7) < currentMonth);
  const monthsToArchive = [...new Set(prevMonthPleins.map(p => p.date.slice(0, 7)))];
  const archivedMonths = new Set(archives.map(a => a.mois));

  let didArchive = false;
  monthsToArchive.forEach(mois => {
    if (!archivedMonths.has(mois)) {
      const moisPleins = pleins.filter(p => p.date.startsWith(mois));

      // Snapshot
      const litresGazole = moisPleins
        .filter(p => normalizeFuelType(p.typeCarburant || '') === 'Gazole')
        .reduce((s, p) => s + p.litres, 0);
      const litresEssence = moisPleins
        .filter(p => normalizeFuelType(p.typeCarburant || '') === 'Essence')
        .reduce((s, p) => s + p.litres, 0);
      const montantTotal = moisPleins.reduce((s, p) => s + p.montant, 0);
      let dotationsTotal = 0;
      if (vehicleSourceMap) {
        vehicleSourceMap.forEach((src, reg) => {
          if (src === 'fonction') dotationsTotal += dotationStore.getEffective(reg, mois);
        });
      }

      archives.push({
        mois,
        archivedAt: now.toISOString(),
        pleins: moisPleins,
        snapshot: { litresGazole, litresEssence, montantTotal, dotationsTotal },
      });
      didArchive = true;

      // Archive card statements for véhicules de fonction
      if (vehicleSourceMap) {
        vehicleSourceMap.forEach((src, reg) => {
          if (src === 'fonction') {
            const depenses = moisPleins.filter(p => p.vehicule === reg).reduce((s, p) => s + p.montant, 0);
            dotationStore.archiveCarteMois(reg, mois, depenses);
          }
        });
      }
    }
  });

  if (didArchive) saveArchives(archives);
  return { archived: didArchive };
}

function getPleinsForMonth(pleins: Plein[], mois: string): Plein[] {
  const current = pleins.filter(p => p.date.startsWith(mois));
  if (current.length > 0) return current;
  const archives = loadArchives();
  const arch = archives.find(a => a.mois === mois);
  return arch ? arch.pleins : [];
}

// ─── Constants ────────────────────────────────────────────────
const STATIONS = ['Cuve interne', 'Station partenaire', 'Station extérieure', 'Citerne mobile'];
const today = () => new Date().toISOString().slice(0, 10);

type HubTab = 'dashboard' | 'pleins' | 'dotations';

// ─── Skeleton ─────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ivos-card p-5 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-2 w-16" />
        </div>
      ))}
    </div>
  );
}

// ─── Horizontal Progress ──────────────────────────────────────
function HProgressBar({ value, max, color = 'bg-blue-500', label, suffix = '' }: {
  value: number; max: number; color?: string; label: string; suffix?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 font-medium">{label}</span>
          <span className="text-gray-500">{value.toLocaleString()}{suffix} / {max.toLocaleString()}{suffix}</span>
        </div>
      )}
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HUB CARBURANT — Main Component
// ═══════════════════════════════════════════════════════════════
export default function CarburantPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HubTab>('dashboard');
  const [pleins, setPleins] = useState<Plein[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [personalVehicles, setPersonalVehicles] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const vehicleSourceMapRef = useRef<Map<string, 'parc' | 'fonction'>>(new Map());

  const reload = useCallback(() => {
    let allPleins = carburantStore.load();
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Archive previous months + snapshot, then purge old pleins (reset auto)
    const { archived } = archiveIfNeeded(allPleins, vehicleSourceMapRef.current);
    if (archived) {
      allPleins = allPleins.filter(p => p.date.slice(0, 7) >= currentMonth);
      carburantStore.save(allPleins);
    }

    setPleins(allPleins);
    setVehicles(vehiclesStore.load());
    setPersonalVehicles(personalVehiclesStore.load());
    setAgents(personnelStore.load());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { reload(); setLoading(false); }, 600);
    const h = () => reload();
    window.addEventListener('carburant:updated', h);
    window.addEventListener('fleetVehicles:updated', h);
    window.addEventListener('personalVehicles:updated', h);
    window.addEventListener('personnel:updated', h);
    window.addEventListener('dotation:updated', h);
    return () => {
      clearTimeout(t);
      window.removeEventListener('carburant:updated', h);
      window.removeEventListener('fleetVehicles:updated', h);
      window.removeEventListener('personalVehicles:updated', h);
      window.removeEventListener('personnel:updated', h);
      window.removeEventListener('dotation:updated', h);
    };
  }, [reload]);

  // ─── Unified vehicle list ──────────────────────────────────
  const allVehicles: UnifiedVehicle[] = useMemo(() => {
    const mois = new Date().toISOString().slice(0, 7);
    return [
      ...vehicles.map((v: any) => ({
        registration: v.registration || v.immatriculation || '',
        brand: v.brand || v.marque || '',
        model: v.model || v.modele || '',
        source: 'parc' as const,
        driver: v.assignedDriver || '',
        fuelType: v.fuelType || 'Diesel',
        dotationMensuelle: dotationStore.getEffective(v.registration || v.immatriculation || '', mois),
        carteCarburant: dotationStore.getCarte(v.registration || v.immatriculation || '')?.numeroCarte || '',
      })),
      ...personalVehicles.map((v: any) => ({
        registration: v.registration || v.immatriculation || '',
        brand: v.brand || v.marque || '',
        model: v.model || v.modele || '',
        source: 'fonction' as const,
        driver: v.agentName || '',
        fuelType: v.fuelType || 'Essence',
        dotationMensuelle: dotationStore.getEffective(v.registration || v.immatriculation || '', mois),
        carteCarburant: dotationStore.getCarte(v.registration || v.immatriculation || '')?.numeroCarte || '',
      })),
    ];
  }, [vehicles, personalVehicles]);

  const vehicleSourceMap = useMemo(() => {
    const map = new Map<string, 'parc' | 'fonction'>();
    allVehicles.forEach(v => { if (v.registration) map.set(v.registration, v.source); });
    vehicleSourceMapRef.current = map;
    if (map.size > 0) archiveIfNeeded(pleins, map);
    return map;
  }, [allVehicles, pleins]);

  const vehicleFuelMap = useMemo(() => {
    const map = new Map<string, FuelLabel>();
    allVehicles.forEach(v => { if (v.registration) map.set(v.registration, normalizeFuelType(v.fuelType)); });
    return map;
  }, [allVehicles]);

  function handleDelete(id: number) {
    if (!window.confirm('Supprimer ce plein ?')) return;
    carburantStore.remove(id);
    reload();
  }

  const TABS: { id: HubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'pleins', label: 'Pleins du mois', icon: <Fuel className="w-4 h-4" /> },
    { id: 'dotations', label: 'Dotations', icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full min-h-screen">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="ivos-page-header mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Fuel className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Hub Carburant</h1>
              <p className="text-xs sm:text-sm text-gray-400 font-medium mt-0.5">Pilotage, exploitation parc & administration des dotations</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="ivos-btn-primary !rounded-2xl"
          >
            <Plus className="w-4 h-4" /> Nouveau Plein
          </button>
        </div>
      </div>

      {/* ── Tab Navigation ──────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-white text-[#1a1a2e] shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────── */}
      {loading ? (
        <SkeletonCards />
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <DashboardTab pleins={pleins} allVehicles={allVehicles} vehicleSourceMap={vehicleSourceMap} />
          )}
          {activeTab === 'pleins' && (
            <PleinsTab pleins={pleins} vehicleSourceMap={vehicleSourceMap} onDelete={handleDelete} />
          )}
          {activeTab === 'dotations' && (
            <DotationsTab pleins={pleins} allVehicles={allVehicles} />
          )}
        </>
      )}

      {/* ── Modal: Nouveau Plein ────────────────────────────── */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reload(); }} title="Nouveau Plein" size="lg">
        <PleinForm pleins={pleins} allVehicles={allVehicles} agents={agents} vehicleFuelMap={vehicleFuelMap} onDone={() => { setShowModal(false); reload(); }} />
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — DASHBOARD (Pilotage & Comparaison)
// ═══════════════════════════════════════════════════════════════
function DashboardTab({ pleins, allVehicles, vehicleSourceMap }: {
  pleins: Plein[];
  allVehicles: UnifiedVehicle[];
  vehicleSourceMap: Map<string, 'parc' | 'fonction'>;
}) {
  const [detailMois, setDetailMois] = useState<string | null>(null);
  const currentMonth = new Date().toISOString().slice(0, 7);

  // ── Current month stats ──
  const currentStats = useMemo(() => {
    const src = pleins.filter(p => p.date.startsWith(currentMonth));
    const montant = src.reduce((s, p) => s + p.montant, 0);
    const litres = src.reduce((s, p) => s + p.litres, 0);
    const litresGazole = src
      .filter(p => normalizeFuelType(p.typeCarburant || '') === 'Gazole')
      .reduce((s, p) => s + p.litres, 0);
    const litresEssence = src
      .filter(p => normalizeFuelType(p.typeCarburant || '') === 'Essence')
      .reduce((s, p) => s + p.litres, 0);

    const fonctionVehs = allVehicles.filter(v => v.source === 'fonction');
    const totalDotation = fonctionVehs.reduce((s, v) => s + v.dotationMensuelle, 0);
    const depensesCarte = src
      .filter(p => vehicleSourceMap.get(p.vehicule) === 'fonction')
      .reduce((s, p) => s + p.montant, 0);
    const tauxUtilisation = totalDotation > 0 ? (depensesCarte / totalDotation) * 100 : 0;

    const nbPleins = src.length;
    const coutMoyenParLitre = litres > 0 ? montant / litres : 0;

    return { montant, litres, litresGazole, litresEssence, tauxUtilisation, depensesCarte, totalDotation, nbPleins, coutMoyenParLitre };
  }, [pleins, currentMonth, allVehicles, vehicleSourceMap]);

  // ── Previous month stats (from archives or current data) ──
  const prevStats = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const prevMonth = d.toISOString().slice(0, 7);
    const archives = loadArchives();
    const archive = archives.find(a => a.mois === prevMonth);

    if (archive?.snapshot) {
      return {
        mois: prevMonth,
        montant: archive.snapshot.montantTotal,
        litresGazole: archive.snapshot.litresGazole,
        litresEssence: archive.snapshot.litresEssence,
        exists: true,
      };
    }
    return { mois: prevMonth, montant: 0, litresGazole: 0, litresEssence: 0, exists: false };
  }, []);

  // ── Annual history (12 months) ──
  const annualHistory = useMemo(() => {
    const archives = loadArchives();
    const map: Record<string, { montant: number; litres: number; nbPleins: number }> = {};

    archives.forEach(a => {
      map[a.mois] = {
        montant: a.snapshot?.montantTotal ?? a.pleins.reduce((s, p) => s + p.montant, 0),
        litres: a.pleins.reduce((s, p) => s + p.litres, 0),
        nbPleins: a.pleins.length,
      };
    });

    const currentPleins = pleins.filter(p => p.date.startsWith(currentMonth));
    if (currentPleins.length > 0 || !map[currentMonth]) {
      map[currentMonth] = {
        montant: currentPleins.reduce((s, p) => s + p.montant, 0),
        litres: currentPleins.reduce((s, p) => s + p.litres, 0),
        nbPleins: currentPleins.length,
      };
    }

    return Object.entries(map)
      .map(([mois, d]) => ({ mois, ...d }))
      .sort((a, b) => b.mois.localeCompare(a.mois))
      .slice(0, 12);
  }, [pleins, currentMonth]);

  function trendIndicator(current: number, previous: number) {
    if (previous === 0) return null;
    const pct = ((current - previous) / previous) * 100;
    const isUp = pct > 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${isUp ? 'text-red-600' : 'text-green-600'}`}>
        {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {isUp ? '+' : ''}{pct.toFixed(1)}%
      </span>
    );
  }

  const detailPleins = useMemo(() => {
    if (!detailMois) return [];
    return getPleinsForMonth(pleins, detailMois);
  }, [detailMois, pleins]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="ivos-kpi">
          <div className="flex items-center gap-2 mb-3"><div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><DollarSign className="w-4.5 h-4.5 text-blue-600" /></div><p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Montant Total</p></div>
          <div className="flex items-baseline gap-2"><p className="text-2xl font-extrabold text-gray-900">{currentStats.montant.toLocaleString()}</p><span className="text-xs font-semibold text-gray-400">F</span></div>
          <div className="mt-1">{prevStats.exists && trendIndicator(currentStats.montant, prevStats.montant)}</div>
        </div>
        <div className="ivos-kpi">
          <div className="flex items-center gap-2 mb-3"><div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center"><Droplets className="w-4.5 h-4.5 text-emerald-600" /></div><p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Volume Total</p></div>
          <div className="flex items-baseline gap-2"><p className="text-2xl font-extrabold text-gray-900">{currentStats.litres.toLocaleString()}</p><span className="text-xs font-semibold text-gray-400">L</span></div>
          <div className="mt-1">{prevStats.exists && trendIndicator(currentStats.litres, prevStats.litresGazole + prevStats.litresEssence)}</div>
        </div>
        <div className="ivos-kpi">
          <div className="flex items-center gap-2 mb-3"><div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center"><Fuel className="w-4.5 h-4.5 text-amber-600" /></div><p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Nb Pleins</p></div>
          <p className="text-2xl font-extrabold text-gray-900">{currentStats.nbPleins}</p>
        </div>
        <div className="ivos-kpi">
          <div className="flex items-center gap-2 mb-3"><div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center"><Activity className="w-4.5 h-4.5 text-rose-600" /></div><p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Coût Moyen / L</p></div>
          <div className="flex items-baseline gap-2"><p className="text-2xl font-extrabold text-gray-900">{currentStats.coutMoyenParLitre.toFixed(0)}</p><span className="text-xs font-semibold text-gray-400">F/L</span></div>
        </div>
        <div className="ivos-kpi col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-3"><div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center"><CreditCard className="w-4.5 h-4.5 text-violet-600" /></div><p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Dotations</p></div>
          <p className="text-2xl font-extrabold text-gray-900">{currentStats.tauxUtilisation.toFixed(0)}<span className="text-sm text-gray-400 ml-0.5">%</span></p>
          <div className="mt-2 relative"><div className="h-1.5 bg-gray-100/80 rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700" style={{ width: `${Math.min(currentStats.tauxUtilisation, 100)}%` }} /></div></div>
          <p className="text-[10px] text-gray-400 mt-1">{currentStats.depensesCarte.toLocaleString()} / {currentStats.totalDotation.toLocaleString()} F</p>
        </div>
      </div>

      <div className="ivos-card p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-amber-600" /> Historique Annuel</h3>
        {annualHistory.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl">
            <table className="ivos-table">
              <thead><tr><th>Mois</th><th className="text-right">Montant Total (FCFA)</th><th className="text-right">Volume (L)</th><th className="text-right">Nb Pleins</th><th className="w-40">Répartition</th><th className="text-center w-24">Détail</th></tr></thead>
              <tbody>
                {annualHistory.map((row, idx) => (
                  <tr key={row.mois} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50 cursor-pointer transition-colors`} onClick={() => setDetailMois(row.mois)}>
                    <td className="px-4 py-3 font-semibold text-gray-800">{formatMoisFr(row.mois)}{row.mois === currentMonth && (<span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">En cours</span>)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{row.montant.toLocaleString()} F</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.litres.toLocaleString()} L</td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.nbPleins}</td>
                    <td className="px-4 py-3"><div className="h-2 bg-gray-100 rounded-full overflow-hidden w-full" title={`${row.litres.toLocaleString()} L`}><div className={`h-full rounded-full transition-all duration-500 ${row.mois === currentMonth ? 'bg-blue-500' : 'bg-emerald-400'}`} style={{ width: `${(row.litres / Math.max(...annualHistory.map(r => r.litres), 1)) * 100}%` }} /></div></td>
                    <td className="px-4 py-3 text-center"><button className="text-blue-600 hover:text-blue-800 text-xs font-medium inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Voir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (<p className="text-sm text-gray-400 text-center py-6">Aucune donnée historique disponible</p>)}
      </div>

      <Modal isOpen={!!detailMois} onClose={() => setDetailMois(null)} title={`Détail des pleins — ${detailMois ? formatMoisFr(detailMois) : ''}`} size="lg">
        {detailMois && <MonthDetailView mois={detailMois} pleins={detailPleins} />}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — PLEINS DU MOIS (Journal & Anomalies)
// ═══════════════════════════════════════════════════════════════
function PleinsTab({ pleins, vehicleSourceMap, onDelete }: {
  pleins: Plein[];
  vehicleSourceMap: Map<string, 'parc' | 'fonction'>;
  onDelete: (id: number) => void;
}) {
  const [search, setSearch] = useState('');
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false);

  const filtered = useMemo(() => {
    const sorted = [...pleins].sort((a, b) => b.date.localeCompare(a.date));
    let result = sorted;
    if (showAnomaliesOnly) {
      result = result.filter(p => p.anomalie);
    }
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(p =>
      p.vehicule.toLowerCase().includes(q) ||
      p.chauffeur.toLowerCase().includes(q) ||
      p.station.toLowerCase().includes(q) ||
      p.date.includes(q)
    );
  }, [pleins, search, showAnomaliesOnly]);

  const anomaliesCount = useMemo(() => pleins.filter(p => p.anomalie).length, [pleins]);

  return (
    <div className="ivos-card p-0 overflow-hidden">
      <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Rechercher un plein..." value={search} onChange={e => setSearch(e.target.value)} className="ivos-input pl-10 w-full" />
        </div>
        <div className="flex items-center gap-4">
          {anomaliesCount > 0 && (
            <button onClick={() => setShowAnomaliesOnly(s => !s)} className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg ${showAnomaliesOnly ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
              <AlertTriangle className="w-4 h-4" /> {anomaliesCount} Anomalie{anomaliesCount > 1 ? 's' : ''}
            </button>
          )}
          <button className="text-sm text-gray-500 hover:text-gray-700">{filtered.length} / {pleins.length} affichés</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="ivos-table">
          <thead>
            <tr><th>Date</th><th>Véhicule</th><th>Chauffeur</th><th className="text-right">Km</th><th className="text-right">Litres</th><th className="text-right">Montant</th><th className="text-right">Conso (L/100)</th><th>Station</th><th className="text-center">Alerte</th><th className="text-center">Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td className="font-medium">{p.date}</td>
                <td>
                  <div className="flex items-center gap-2">
                    {fuelBadge(p.typeCarburant)}
                    <span className="font-semibold">{p.vehicule}</span>
                    {vehicleSourceMap.get(p.vehicule) === 'fonction' && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-700 rounded-full">Fonction</span>}
                  </div>
                </td>
                <td>{p.chauffeur}</td>
                <td className="text-right font-mono text-xs">{p.kmActuel.toLocaleString()}</td>
                <td className="text-right font-semibold">{p.litres} L</td>
                <td className="text-right">{p.montant.toLocaleString()} F</td>
                <td className="text-right">
                  {p.consoL100 !== undefined
                    ? <span className={`font-bold ${p.anomalie ? 'text-red-600' : 'text-green-700'}`}>{p.consoL100.toFixed(1)}</span>
                    : <span className="text-gray-400">&mdash;</span>}
                </td>
                <td>{p.station}</td>
                <td className="text-center">
                  {p.anomalie && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">Anormale</span>}
                </td>
                <td className="text-center">
                  <button onClick={() => onDelete(p.id)} className="text-gray-400 hover:text-red-600 p-1 rounded-full"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">
                <Fuel className="w-8 h-8 mx-auto mb-2" />
                Aucun plein trouvé pour ce mois.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — DOTATIONS (Véhicules de fonction)
// ═══════════════════════════════════════════════════════════════
function DotationsTab({ pleins, allVehicles }: {
  pleins: Plein[];
  allVehicles: UnifiedVehicle[];
}) {
  const [editingDotation, setEditingDotation] = useState<UnifiedVehicle | null>(null);
  const [editingCarte, setEditingCarte] = useState<UnifiedVehicle | null>(null);

  const vehsFonction = useMemo(() => {
    const mois = new Date().toISOString().slice(0, 7);
    return allVehicles
      .filter(v => v.source === 'fonction')
      .map(v => {
        const depenses = pleins
          .filter(p => p.vehicule === v.registration && p.date.startsWith(mois))
          .reduce((s, p) => s + p.montant, 0);
        const dotation = v.dotationMensuelle;
        const balance = dotation - depenses;
        return { ...v, depenses, balance };
      });
  }, [allVehicles, pleins]);

  const handleDotationSave = (reg: string, newDotation: number) => {
    dotationStore.setDefault(reg, newDotation);
    setEditingDotation(null);
    window.dispatchEvent(new CustomEvent('dotation:updated'));
  };

  const handleCarteSave = (reg: string, newCarte: string, _newPlafond: number) => {
    // Note: CarteCarburant currently doesn't support plafond field
    // If plafond is needed, extend CarteCarburant interface and update dotationStore.setCarte()
    dotationStore.setCarte(reg, newCarte);
    setEditingCarte(null);
    window.dispatchEvent(new CustomEvent('dotation:updated'));
  };

  return (
    <div className="space-y-6">
      <div className="ivos-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><CreditCard className="w-4 h-4 text-violet-600" /> Gestion des Dotations Carburant</h3>
            <p className="text-xs text-gray-500 mt-1">Suivi des budgets pour les véhicules de fonction.</p>
          </div>
          <button className="ivos-btn-secondary !text-xs" onClick={() => window.dispatchEvent(new CustomEvent('dotation:updated'))}>
            Actualiser
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl">
          <table className="ivos-table">
            <thead><tr><th>Véhicule</th><th>Collaborateur</th><th>Carte Carburant</th><th className="text-right">Dotation Mensuelle</th><th className="text-right">Dépenses (mois)</th><th className="w-48">Utilisation</th><th className="text-center">Actions</th></tr></thead>
            <tbody>
              {vehsFonction.map(v => (
                <tr key={v.registration}>
                  <td className="font-semibold">{v.registration}</td>
                  <td>{v.driver}</td>
                  <td>
                    {editingCarte?.registration === v.registration ? (
                      <EditCarteForm vehicle={v} onSave={handleCarteSave} onCancel={() => setEditingCarte(null)} />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{v.carteCarburant || 'N/A'}</span>
                        <button onClick={() => setEditingCarte(v)} className="text-gray-400 hover:text-blue-600"><Edit3 className="w-3 h-3" /></button>
                      </div>
                    )}
                  </td>
                  <td className="text-right">
                    {editingDotation?.registration === v.registration ? (
                      <EditDotationForm vehicle={v} onSave={handleDotationSave} onCancel={() => setEditingDotation(null)} />
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold">{v.dotationMensuelle.toLocaleString()} F</span>
                        <button onClick={() => setEditingDotation(v)} className="text-gray-400 hover:text-blue-600"><Edit3 className="w-3 h-3" /></button>
                      </div>
                    )}
                  </td>
                  <td className="text-right font-medium">{v.depenses.toLocaleString()} F</td>
                  <td><HProgressBar value={v.depenses} max={v.dotationMensuelle} color="bg-violet-500" label="" suffix=" F" /></td>
                  <td className="text-center">
                    <button className="text-blue-600 hover:text-blue-800 text-xs font-medium inline-flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Historique</button>
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

function EditDotationForm({ vehicle, onSave, onCancel }: { vehicle: UnifiedVehicle; onSave: (reg: string, val: number) => void; onCancel: () => void; }) {
  const [val, setVal] = useState(vehicle.dotationMensuelle);
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(vehicle.registration, val); }} className="flex items-center gap-1">
      <input type="number" value={val} onChange={e => setVal(Number(e.target.value))} className="ivos-input !py-1 !text-right w-28" />
      <button type="submit" className="text-green-600 p-1"><CheckCircle2 className="w-4 h-4" /></button>
      <button type="button" onClick={onCancel} className="text-red-600 p-1"><X className="w-4 h-4" /></button>
    </form>
  );
}

function EditCarteForm({ vehicle, onSave, onCancel }: { vehicle: UnifiedVehicle; onSave: (reg: string, carte: string, plafond: number) => void; onCancel: () => void; }) {
  const [carte, setCarte] = useState(vehicle.carteCarburant);
  // TODO: If plafond is needed, extend CarteCarburant interface to include it
  const [plafond, setPlafond] = useState(0);
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(vehicle.registration, carte, plafond); }} className="flex items-center gap-1">
      <input type="text" value={carte} onChange={e => setCarte(e.target.value)} placeholder="N° Carte" className="ivos-input !py-1 w-24" />
      <input type="number" value={plafond} onChange={e => setPlafond(Number(e.target.value))} placeholder="Plafond" className="ivos-input !py-1 w-24" />
      <button type="submit" className="text-green-600 p-1"><CheckCircle2 className="w-4 h-4" /></button>
      <button type="button" onClick={onCancel} className="text-red-600 p-1"><X className="w-4 h-4" /></button>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — FORMULAIRE NOUVEAU PLEIN
// ═══════════════════════════════════════════════════════════════
function PleinForm({ pleins, allVehicles, agents, vehicleFuelMap, onDone }: {
  pleins: Plein[];
  allVehicles: UnifiedVehicle[];
  agents: any[];
  vehicleFuelMap: Map<string, FuelLabel>;
  onDone: () => void;
}) {
  const [f, setF] = useState({
    date: today(),
    vehicule: '',
    chauffeur: '',
    kmActuel: '',
    litres: '',
    montant: '',
    station: STATIONS[0],
    pieceJointe: '',
  });
  const [kmError, setKmError] = useState('');

  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setF(prev => ({ ...prev, [name]: value }));
    if (name === 'kmActuel' && f.vehicule) {
      validateKm(f.vehicule, Number(value));
    }
    if (name === 'vehicule') {
      if (f.kmActuel) validateKm(value, Number(f.kmActuel));
      // Auto-fill driver if available
      const v = allVehicles.find(v => v.registration === value);
      if (v?.driver) setF(prev => ({ ...prev, chauffeur: v.driver }));
    }
  };

  function validateKm(veh: string, km: number) {
    const vehPleins = pleins.filter(p => p.vehicule === veh).sort((a, b) => b.kmActuel - a.kmActuel);
    if (vehPleins.length > 0 && km <= vehPleins[0].kmActuel) {
      setKmError('Le km doit être supérieur au dernier relevé (' + vehPleins[0].kmActuel.toLocaleString() + ' km)');
    } else {
      setKmError('');
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setF(prev => ({ ...prev, pieceJointe: reader.result as string }));
      reader.readAsDataURL(file);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (kmError) return;
    carburantStore.add({
      date: f.date,
      vehicule: f.vehicule,
      chauffeur: f.chauffeur,
      kmActuel: Number(f.kmActuel),
      litres: Number(f.litres),
      montant: Number(f.montant),
      station: f.station,
      pieceJointe: f.pieceJointe || undefined,
      typeCarburant: vehicleFuelMap.get(f.vehicule) || 'Gazole',
    });
    onDone();
  }

  const vehicleOptions = allVehicles.map(v => ({
    value: v.registration,
    label: `${v.registration} (${v.brand} ${v.model})`
  }));

  const chauffeurOptions = agents
    .filter(a => a.role === 'Chauffeurs' || a.role === 'Opérateurs' || a.role === 'Agent')
    .map(a => ({ value: `${a.firstName} ${a.lastName}`, label: `${a.firstName} ${a.lastName} (${a.matricule})` }));

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <Input label="Date" name="date" value={f.date} onChange={h} type="date" required />
      <Select label="Véhicule" name="vehicule" value={f.vehicule} onChange={h} options={vehicleOptions} required />
      <Select label="Chauffeur" name="chauffeur" value={f.chauffeur} onChange={h} options={chauffeurOptions} required />
      <div>
        <Input label="Kilométrage Actuel" name="kmActuel" value={f.kmActuel} onChange={h} type="number" required />
        {kmError && <p className="text-xs text-red-600 mt-1">{kmError}</p>}
      </div>
      <Input label="Volume (Litres)" name="litres" value={f.litres} onChange={h} type="number" step="0.01" required />
      <Input label="Montant (FCFA)" name="montant" value={f.montant} onChange={h} type="number" required />
      <Select label="Station / Source" name="station" value={f.station} onChange={h} options={STATIONS.map(s => ({ value: s, label: s }))} required />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pièce jointe (ticket / bon)</label>
        <input type="file" accept="image/*,.pdf" onChange={handleFile} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
      </div>
      <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
        <button type="button" onClick={onDone} className="ivos-btn-secondary">Annuler</button>
        <button type="submit" className="ivos-btn-primary" disabled={!!kmError}>Enregistrer le Plein</button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — VUE DÉTAIL MOIS (Modal)
// ═══════════════════════════════════════════════════════════════
function MonthDetailView({ mois, pleins }: { mois: string; pleins: Plein[] }) {
  const stats = useMemo(() => {
    const montant = pleins.reduce((s, p) => s + p.montant, 0);
    const litres = pleins.reduce((s, p) => s + p.litres, 0);
    return { montant, litres, nbPleins: pleins.length };
  }, [pleins]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Montant Total</p><p className="text-lg font-bold">{stats.montant.toLocaleString()} F</p></div>
        <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Volume Total</p><p className="text-lg font-bold">{stats.litres.toLocaleString()} L</p></div>
        <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Nb Pleins</p><p className="text-lg font-bold">{stats.nbPleins}</p></div>
      </div>
      <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
        <table className="ivos-table">
          <thead className="sticky top-0 bg-gray-50">
            <tr><th>Date</th><th>Véhicule</th><th>Chauffeur</th><th className="text-right">Montant</th><th className="text-right">Litres</th></tr>
          </thead>
          <tbody>
            {pleins.map(p => (
              <tr key={p.id}>
                <td>{p.date}</td>
                <td className="font-semibold">{p.vehicule}</td>
                <td>{p.chauffeur}</td>
                <td className="text-right">{p.montant.toLocaleString()} F</td>
                <td className="text-right font-medium">{p.litres} L</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ... (rest of the file)