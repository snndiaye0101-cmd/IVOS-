import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { personnelStore, PersonnelAgent } from '../../fleet/services/personnelStore';
import { congesStore, Conge, TypeAbsence, StatutValidation, EtatPresence, JourFerie, WeekendConfig } from '../services/congesStore';
import { pointageStore, Pointage } from '../services/pointageStore';
import { heuresStore, type WorkHoursRow } from '../services/heuresStore';
import { payrollSettingsStore } from '../../finances/services/payrollSettingsStore';
import { formatCleanAmount } from '@/shared/utils/formatAmount';
import Modal from '../../../components/ui/Modal';
import {
  Users, CalendarDays, PlusCircle, Search, Eye, Edit, Trash2,
  Clock, CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight,
  Shield, UserCheck, Briefcase, CalendarClock, Moon, Sun, Settings,
  Smartphone, Send, Calendar, MapPin, Navigation, ShieldAlert, LogIn, LogOut
} from 'lucide-react';

/* ═══════ CONSTANTS ═══════ */
const TYPES_ABSENCE: TypeAbsence[] = ['Congé annuel', 'Permission', 'Maladie', 'Récupération', 'Absence injustifiée'];
const STATUTS_VALIDATION: StatutValidation[] = ['En attente', 'Validé par direction', 'Refusé'];
const JOURS_SEMAINE = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const JOURS_GRID = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const ACCESS_POINTS = ['Tous les accès', 'Portail 1', 'Portail 2'] as const;

const TABS = [
  { id: 'planning', label: 'Planning', icon: CalendarDays },
  { id: 'conges', label: 'Congés & Absences', icon: CalendarClock },
  { id: 'pointage', label: 'Présence & Pointage', icon: MapPin },
  { id: 'heures', label: 'Gestion des Heures', icon: Clock },
  { id: 'calendrier', label: 'Réglages Calendrier', icon: Settings },
  { id: 'nuit', label: 'Équipe de Nuit', icon: Moon },
] as const;
type TabId = typeof TABS[number]['id'];

/* ═══════ BADGES ═══════ */
function presenceBadge(etat: EtatPresence, isNight?: boolean) {
  const map: Record<EtatPresence, { bg: string; dot: string; label: string }> = {
    'En service': { bg: 'bg-green-100 text-green-800', dot: 'bg-green-500', label: 'Service' },
    'En repos': { bg: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500', label: 'Repos' },
    'En congé': { bg: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500', label: 'Congé' },
    'Absence injustifiée': { bg: 'bg-red-100 text-red-800', dot: 'bg-red-500', label: 'Abs.' },
    'Maladie': { bg: 'bg-red-100 text-red-700', dot: 'bg-red-400', label: 'Maladie' },
    'Férié': { bg: 'bg-gray-200 text-gray-600', dot: 'bg-gray-400', label: 'Férié' },
    'Nuit': { bg: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-500', label: 'Nuit' },
  };
  const s = map[etat] || { bg: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', label: etat };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${s.bg}`}>
      {isNight && etat === 'En service' ? <Moon className="w-2.5 h-2.5" /> : <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
      {isNight && etat === 'En service' ? 'Nuit' : s.label}
    </span>
  );
}

function statutBadge(statut: StatutValidation) {
  const map: Record<string, string> = {
    'En attente': 'bg-yellow-100 text-yellow-800',
    'Validé par direction': 'bg-green-100 text-green-800',
    'Refusé': 'bg-red-100 text-red-800',
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${map[statut] || 'bg-gray-100 text-gray-600'}`}>{statut}</span>;
}

function typeBadge(t: TypeAbsence) {
  const map: Record<string, string> = {
    'Congé annuel': 'bg-orange-100 text-orange-800',
    'Permission': 'bg-blue-100 text-blue-800',
    'Maladie': 'bg-red-100 text-red-700',
    'Récupération': 'bg-teal-100 text-teal-800',
    'Absence injustifiée': 'bg-red-200 text-red-900',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[t] || 'bg-gray-100'}`}>{t}</span>;
}

/* ═══════ DATE HELPERS ═══════ */
function getWeekDates(weekOffset: number): string[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatWeekLabel(dates: string[]) {
  const s = new Date(dates[0]);
  const e = new Date(dates[6]);
  return `${s.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} — ${e.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
}

function formatFcfa(value: number) {
  return formatCleanAmount(Math.round(value), 'FCFA');
}

function formatHours(value: number) {
  return `${(Math.round(value * 100) / 100).toLocaleString('fr-FR')} h`;
}

/* ═══════ MAIN COMPONENT ═══════ */
export default function GRHPage() {
  const [agents, setAgents] = useState<PersonnelAgent[]>([]);
  const [conges, setConges] = useState<Conge[]>([]);
  const [feries, setFeries] = useState<JourFerie[]>([]);
  const [weekendCfg, setWeekendCfg] = useState<WeekendConfig>({ jours: [0, 6] });
  const [weekOffset, setWeekOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabId>('planning');
  const [showCongeModal, setShowCongeModal] = useState(false);
  const [editConge, setEditConge] = useState<Conge | null>(null);
  const [viewConge, setViewConge] = useState<Conge | null>(null);
  const [viewModal, setViewModal] = useState(false);
  const [showFerieModal, setShowFerieModal] = useState(false);
  const [pointages, setPointages] = useState<Pointage[]>([]);
  const [pointageSearch, setPointageSearch] = useState('');
  const [pointagePortalFilter, setPointagePortalFilter] = useState<(typeof ACCESS_POINTS)[number]>('Tous les accès');
  const [pointageStartDate, setPointageStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pointageEndDate, setPointageEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [heuresMonth, setHeuresMonth] = useState(() => heuresStore.currentMonth());
  const [heuresRows, setHeuresRows] = useState<WorkHoursRow[]>([]);
  const [payrollSettings, setPayrollSettings] = useState(() => payrollSettingsStore.load());

  const reload = useCallback(() => {
    setAgents(personnelStore.load());
    setConges(congesStore.loadConges());
    setFeries(congesStore.loadFeries());
    setWeekendCfg(congesStore.loadWeekends());
    setPointages(pointageStore.loadPointages());
    setHeuresRows(heuresStore.loadRows(heuresMonth));
  }, [heuresMonth]);

  useEffect(() => {
    setHeuresRows(heuresStore.loadRows(heuresMonth));
  }, [heuresMonth]);

  useEffect(() => {
    reload();
    const h = () => reload();
    const handlePayrollSettings = () => setPayrollSettings(payrollSettingsStore.load());
    window.addEventListener('personnel:updated', h);
    window.addEventListener('conges:updated', h);
    window.addEventListener('pointage:updated', h);
    window.addEventListener(heuresStore.eventName, h);
    window.addEventListener(payrollSettingsStore.eventName, handlePayrollSettings);
    return () => {
      window.removeEventListener('personnel:updated', h);
      window.removeEventListener('conges:updated', h);
      window.removeEventListener('pointage:updated', h);
      window.removeEventListener(heuresStore.eventName, h);
      window.removeEventListener(payrollSettingsStore.eventName, handlePayrollSettings);
    };
  }, [reload]);

  const payrollCountrySettings = payrollSettings.countries.SN || payrollSettingsStore.defaults.countries.SN;
  const nightRateLabel = `${Math.round(payrollCountrySettings.nightMajoration * 100)}%`;

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const today = new Date().toISOString().slice(0, 10);

  const filteredAgents = useMemo(() => {
    if (!search.trim()) return agents;
    const q = search.toLowerCase();
    return agents.filter(a =>
      a.firstName.toLowerCase().includes(q) || a.lastName.toLowerCase().includes(q) ||
      a.poste.toLowerCase().includes(q) || a.matricule.toLowerCase().includes(q)
    );
  }, [agents, search]);

  const nightAgents = useMemo(() => agents.filter(a => a.shiftNuit), [agents]);

  /* Stats */
  const stats = useMemo(() => {
    const absentsNow = conges.filter(c => c.statut !== 'Refusé' && today >= c.dateDebut && today <= c.dateFin);
    const injustifiees = conges.filter(c => c.typeAbsence === 'Absence injustifiée' && c.annee === '2026');
    return {
      total: agents.length,
      enService: agents.length - absentsNow.length,
      absents: absentsNow.length,
      injustifiees: injustifiees.reduce((s, c) => s + c.nbJours, 0),
      nuit: nightAgents.length,
    };
  }, [agents, conges, today, nightAgents]);

  const currentlyAbsent = useMemo(() => {
    return conges
      .filter(c => c.statut !== 'Refusé' && today >= c.dateDebut && today <= c.dateFin)
      .map(c => ({ ...c, solde: congesStore.getSoldeConges(c.employeId, '2026', conges) }));
  }, [conges, today]);

  const alertesPaie = useMemo(() => {
    return agents.map(a => ({ agent: a, jours: congesStore.getAbsencesInjustifiees(a.id, '2026', conges) })).filter(x => x.jours > 0);
  }, [agents, conges]);

  const pendingConges = useMemo(() => conges.filter(c => c.statut === 'En attente'), [conges]);

  function handleDeleteConge(id: number) {
    if (!window.confirm('Supprimer cette absence ?')) return;
    congesStore.removeConge(id);
    reload();
  }

  function handleValidation(id: number, statut: StatutValidation) {
    congesStore.updateConge(id, { statut });
    reload();
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white";
  const labelCls = "block text-[11px] font-semibold text-gray-500 uppercase mb-1";

  return (
    <div className="w-full min-h-screen">
      {/* ═══════ HEADER ═══════ */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 mb-6 text-white flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><Briefcase className="w-7 h-7" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestion des Ressources Humaines</h1>
            <p className="text-sm text-gray-300">Planning, congés, présences, équipe de nuit et connexion paie</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditConge(null); setShowCongeModal(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-sm transition-all shadow-md">
            <PlusCircle className="w-4 h-4" /> Gérer une Absence/Congé
          </button>
        </div>
      </div>

      {/* ═══════ STAT WIDGETS ═══════ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Effectif Total', value: stats.total, gradient: 'from-blue-500 to-blue-700', icon: <Users className="w-5 h-5" /> },
          { label: 'En service aujourd\'hui', value: stats.enService, gradient: 'from-green-500 to-green-700', icon: <UserCheck className="w-5 h-5" /> },
          { label: 'Absents aujourd\'hui', value: stats.absents, gradient: 'from-orange-500 to-orange-700', icon: <CalendarClock className="w-5 h-5" /> },
          { label: 'Équipe de Nuit', value: stats.nuit, gradient: 'from-indigo-500 to-indigo-700', icon: <Moon className="w-5 h-5" /> },
          { label: 'Abs. injustifiées', value: `${stats.injustifiees} j`, gradient: 'from-red-500 to-red-700', icon: <AlertTriangle className="w-5 h-5" /> },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white shrink-0`}>{c.icon}</div>
              <div><p className="text-xs text-gray-500">{c.label}</p><p className="text-xl font-bold text-gray-900">{c.value}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════ DEMANDES EN ATTENTE — WORKFLOW DIRECTION ═══════ */}
      {pendingConges.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl shadow-md mb-6 overflow-hidden">
          <div className="px-5 py-3 border-b border-yellow-100 flex items-center gap-2">
            <Send className="w-4 h-4 text-yellow-600" />
            <h2 className="text-sm font-bold text-yellow-800 uppercase">Demandes en attente de validation ({pendingConges.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                  <th className="px-4 py-2.5 text-left">Employé</th>
                  <th className="px-4 py-2.5 text-left">Type</th>
                  <th className="px-4 py-2.5 text-left">Du</th>
                  <th className="px-4 py-2.5 text-left">Au</th>
                  <th className="px-4 py-2.5 text-left">Jours</th>
                  <th className="px-4 py-2.5 text-left">Motif</th>
                  <th className="px-4 py-2.5 text-center">Décision</th>
                </tr>
              </thead>
              <tbody>
                {pendingConges.map((c, idx) => (
                  <tr key={c.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-yellow-50/50'} hover:bg-blue-50 transition-colors`}>
                    <td className="px-4 py-2.5 text-sm font-semibold">{c.employeNom}</td>
                    <td className="px-4 py-2.5">{typeBadge(c.typeAbsence)}</td>
                    <td className="px-4 py-2.5 text-sm">{c.dateDebut}</td>
                    <td className="px-4 py-2.5 text-sm">{c.dateFin}</td>
                    <td className="px-4 py-2.5 text-sm font-bold">{c.nbJours}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{c.motif || '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => handleValidation(c.id, 'Validé par direction')} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors">
                          <CheckCircle className="w-3.5 h-3.5" /> Valider
                        </button>
                        <button onClick={() => handleValidation(c.id, 'Refusé')} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors">
                          <XCircle className="w-3.5 h-3.5" /> Refuser
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════ TABS ═══════ */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${tab === t.id ? 'bg-white shadow-md text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════ TAB: PLANNING ═══════════════════════════════ */}
      {tab === 'planning' && (
        <>
          <div className="bg-white rounded-2xl shadow-md mb-6 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2"><CalendarDays className="w-4 h-4 text-blue-600" /> Planning Hebdomadaire</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm font-medium text-gray-600 min-w-[240px] text-center">{formatWeekLabel(weekDates)}</span>
                <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="ml-2 text-xs text-blue-600 hover:underline font-semibold">Aujourd'hui</button>}
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-50">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Filtrer par nom, poste, matricule…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="flex items-center gap-3 text-[10px] font-semibold flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> En service</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> En repos</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> En congé</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Absence / Maladie</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> Férié</span>
                <span className="flex items-center gap-1"><Moon className="w-2.5 h-2.5 text-indigo-500" /> Équipe de Nuit</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                    <th className="px-4 py-3 text-left min-w-[200px]">Collaborateur</th>
                    {weekDates.map((d, i) => {
                      const isFerie = congesStore.isFerie(d);
                      const isWe = congesStore.isWeekend(d);
                      return (
                        <th key={d} className={`px-2 py-3 text-center min-w-[100px] ${d === today ? 'bg-blue-800' : isFerie ? 'bg-gray-600' : isWe ? 'bg-gray-700' : ''}`}>
                          <div>{JOURS_GRID[i]}</div>
                          <div className="text-[10px] font-normal opacity-80">{formatDateShort(d)}</div>
                          {isFerie && <div className="text-[8px] opacity-60 mt-0.5">Férié</div>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map((a, idx) => (
                    <tr key={a.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${a.shiftNuit ? 'bg-gradient-to-br from-indigo-500 to-purple-700' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                            {(a.firstName[0] || '') + (a.lastName[0] || '')}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-900 leading-tight flex items-center gap-1">
                              {a.firstName} {a.lastName}
                              {a.shiftNuit && <Moon className="w-3 h-3 text-indigo-500" />}
                            </p>
                            <p className="text-[10px] text-gray-400">{a.poste || a.role}</p>
                          </div>
                        </div>
                      </td>
                      {weekDates.map(d => {
                        const etat = congesStore.getPresence(a.id, d, conges);
                        const isFerieDate = congesStore.isFerie(d);
                        const isWeDate = congesStore.isWeekend(d);
                        return (
                          <td key={d} className={`px-2 py-2.5 text-center ${d === today ? 'bg-blue-50/50' : isFerieDate ? 'bg-gray-100' : isWeDate ? 'bg-gray-50' : ''}`}>
                            {presenceBadge(etat, a.shiftNuit && etat === 'En service')}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {filteredAgents.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400">Aucun collaborateur trouvé</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Qui est absent + Alertes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2"><CalendarClock className="w-4 h-4 text-orange-600" /> Qui est en congé ?</h2>
              </div>
              {currentlyAbsent.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">Aucune absence en cours</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                        <th className="px-4 py-2.5 text-left">Employé</th>
                        <th className="px-4 py-2.5 text-left">Type</th>
                        <th className="px-4 py-2.5 text-left">Retour prévu</th>
                        <th className="px-4 py-2.5 text-left">Solde congés</th>
                        <th className="px-4 py-2.5 text-left">Remplaçant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentlyAbsent.map((c, idx) => (
                        <tr key={c.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                          <td className="px-4 py-2.5 text-sm font-semibold">{c.employeNom}</td>
                          <td className="px-4 py-2.5">{typeBadge(c.typeAbsence)}</td>
                          <td className="px-4 py-2.5 text-sm">{new Date(c.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-sm font-bold ${c.solde > 5 ? 'text-green-600' : c.solde > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {c.solde} / {congesStore.CONGE_ANNUEL_TOTAL} j
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-600">{c.remplacantNom || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /> Alertes Paie — Absences injustifiées</h2>
              </div>
              {alertesPaie.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">Aucune alerte</div>
              ) : (
                <div className="p-4 space-y-3">
                  {alertesPaie.map(x => (
                    <div key={x.agent.id} className="flex items-center justify-between bg-red-50 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">{x.agent.firstName[0]}{x.agent.lastName[0]}</div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{x.agent.firstName} {x.agent.lastName}</p>
                          <p className="text-[10px] text-gray-500">{x.agent.poste}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-700">{x.jours} jour(s)</p>
                        <p className="text-[10px] text-red-500">Déduction automatique</p>
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-gray-400 mt-2 px-1">Les jours d'absence injustifiée sont automatiquement signalés au module Paie & Retenues pour déduction.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════ TAB: CONGÉS ═══════════════════════════════ */}
      {tab === 'conges' && (
        <>
          {/* Historique */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-600" /> Historique des Congés & Absences</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                    <th className="px-4 py-3 text-left">Employé</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Du</th>
                    <th className="px-4 py-3 text-left">Au</th>
                    <th className="px-4 py-3 text-left">Jours</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                    <th className="px-4 py-3 text-left">Remplaçant</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {conges.map((c, idx) => (
                    <tr key={c.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                      <td className="px-4 py-3 text-sm font-semibold">{c.employeNom}</td>
                      <td className="px-4 py-3">{typeBadge(c.typeAbsence)}</td>
                      <td className="px-4 py-3 text-sm">{c.dateDebut}</td>
                      <td className="px-4 py-3 text-sm">{c.dateFin}</td>
                      <td className="px-4 py-3 text-sm font-bold">{c.nbJours}</td>
                      <td className="px-4 py-3">{statutBadge(c.statut)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.remplacantNom || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => { setViewConge(c); setViewModal(true); }} title="Voir" className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => { setEditConge(c); setShowCongeModal(true); }} title="Modifier" className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteConge(c.id)} title="Supprimer" className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {conges.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400">Aucun congé enregistré</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Solde congés */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2"><Shield className="w-4 h-4 text-teal-600" /> Compteur de Congés — Soldes 2026</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                    <th className="px-4 py-3 text-left">Collaborateur</th>
                    <th className="px-4 py-3 text-left">Poste</th>
                    <th className="px-4 py-3 text-center">Droits annuels</th>
                    <th className="px-4 py-3 text-center">Pris</th>
                    <th className="px-4 py-3 text-center">Solde restant</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a, idx) => {
                    const solde = congesStore.getSoldeConges(a.id, '2026', conges);
                    const pris = congesStore.CONGE_ANNUEL_TOTAL - solde;
                    return (
                      <tr key={a.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                        <td className="px-4 py-2.5 text-sm font-semibold">{a.firstName} {a.lastName}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">{a.poste || a.role}</td>
                        <td className="px-4 py-2.5 text-sm text-center">{congesStore.CONGE_ANNUEL_TOTAL} j</td>
                        <td className="px-4 py-2.5 text-sm text-center font-semibold">{pris} j</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-sm font-bold ${solde > 10 ? 'text-green-600' : solde > 0 ? 'text-yellow-600' : 'text-red-600'}`}>{solde} j</span>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1 max-w-[80px] mx-auto">
                            <div className={`h-1.5 rounded-full transition-all ${solde > 10 ? 'bg-green-500' : solde > 0 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.max(0, (solde / congesStore.CONGE_ANNUEL_TOTAL) * 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════ TAB: PRÉSENCE & POINTAGE ═══════════════════════════════ */}
      {tab === 'pointage' && (() => {
        const rangeStart = pointageStartDate <= pointageEndDate ? pointageStartDate : pointageEndDate;
        const rangeEnd = pointageEndDate >= pointageStartDate ? pointageEndDate : pointageStartDate;
        const normalizedQuery = pointageSearch.trim().toLowerCase();

        const filteredPointages = pointages.filter(p => {
          const inRange = p.date >= rangeStart && p.date <= rangeEnd;
          const matchesPortal = pointagePortalFilter === 'Tous les accès' ? true : p.portal === pointagePortalFilter;
          const matchesSearch = !normalizedQuery
            ? true
            : p.employeNom.toLowerCase().includes(normalizedQuery)
              || p.employeId.toLowerCase().includes(normalizedQuery)
              || (p.vehicleRegistration || '').toLowerCase().includes(normalizedQuery)
              || (p.portal || '').toLowerCase().includes(normalizedQuery);
          return inRange && matchesPortal && matchesSearch;
        });

        const todayPts = filteredPointages.filter(p => p.date === today);
        const onSite = todayPts.filter(p => !p.horsZone && !p.heureDepart);
        const retards = filteredPointages.filter(p => p.retard);
        const horsZone = filteredPointages.filter(p => p.horsZone);
        const departed = filteredPointages.filter(p => p.heureDepart);
        const transitVehicles = filteredPointages.filter(p => p.withVehicle).length;
        const sites = pointageStore.loadSites();
        return (
          <>
            {/* Stat widgets pointage */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Sur site maintenant', value: onSite.length, gradient: 'from-green-500 to-green-700', icon: <Navigation className="w-5 h-5" /> },
                { label: 'Passages période', value: filteredPointages.length, gradient: 'from-blue-500 to-blue-700', icon: <LogIn className="w-5 h-5" /> },
                { label: 'Retards (+15 min)', value: retards.length, gradient: 'from-red-500 to-red-700', icon: <Clock className="w-5 h-5" /> },
                { label: 'Véhicules transités', value: transitVehicles, gradient: 'from-orange-500 to-orange-700', icon: <ShieldAlert className="w-5 h-5" /> },
              ].map(c => (
                <div key={c.label} className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <div className="flex items-center gap-3 p-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white shrink-0`}>{c.icon}</div>
                    <div><p className="text-xs text-gray-500">{c.label}</p><p className="text-xl font-bold text-gray-900">{c.value}</p></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-md p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={pointageSearch}
                    onChange={e => setPointageSearch(e.target.value)}
                    placeholder="Rechercher un collaborateur, véhicule ou portail..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <select
                  value={pointagePortalFilter}
                  onChange={e => setPointagePortalFilter(e.target.value as (typeof ACCESS_POINTS)[number])}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {ACCESS_POINTS.map(portal => (
                    <option key={portal} value={portal}>{portal}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3 md:col-span-1">
                  <input
                    type="date"
                    value={pointageStartDate}
                    onChange={e => setPointageStartDate(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <input
                    type="date"
                    value={pointageEndDate}
                    onChange={e => setPointageEndDate(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span>Période: {rangeStart} → {rangeEnd}</span>
                <span>Point d'accès: {pointagePortalFilter}</span>
                <span>Personnes transitées: {filteredPointages.length}</span>
                <span>Véhicules transités: {transitVehicles}</span>
              </div>
            </div>

            {/* Alertes Hors Zone */}
            {horsZone.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl shadow-md mb-6 overflow-hidden">
                <div className="px-5 py-3 border-b border-red-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <h2 className="text-sm font-bold text-red-800 uppercase">Alertes Géofencing — Pointages hors zone</h2>
                </div>
                <div className="p-4 space-y-2">
                  {horsZone.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">{p.employeNom.split(' ').map(n => n[0]).join('')}</div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{p.employeNom}</p>
                          <p className="text-[10px] text-gray-500">Arrivée à {p.heureArrivee}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-700">{p.distanceArrivee}m</p>
                        <p className="text-[10px] text-red-500">du site le plus proche</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Qui est sur site ? */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2"><MapPin className="w-4 h-4 text-green-600" /> Qui est sur site ?</h2>
                <span className="text-xs text-gray-400">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                      <th className="px-4 py-3 text-left">Collaborateur</th>
                      <th className="px-4 py-3 text-center">Date</th>
                      <th className="px-4 py-3 text-center">Arrivée</th>
                      <th className="px-4 py-3 text-center">Départ</th>
                      <th className="px-4 py-3 text-center">Point d'Accès</th>
                      <th className="px-4 py-3 text-center">Shift prévu</th>
                      <th className="px-4 py-3 text-center">Retard</th>
                      <th className="px-4 py-3 text-center">Véhicule</th>
                      <th className="px-4 py-3 text-center">GPS</th>
                      <th className="px-4 py-3 text-center">Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPointages.length === 0 ? (
                      <tr><td colSpan={10} className="text-center py-8 text-gray-400">Aucun pointage sur la période sélectionnée</td></tr>
                    ) : (
                      filteredPointages.map((p, idx) => (
                        <tr key={p.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${p.isNuit ? 'bg-gradient-to-br from-indigo-500 to-purple-700' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                                {p.employeNom.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-900 flex items-center gap-1">
                                  {p.employeNom}
                                  {p.isNuit && <Moon className="w-3 h-3 text-indigo-500" />}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center text-sm text-gray-600">{p.date}</td>
                          <td className="px-4 py-2.5 text-center text-sm font-semibold text-green-700">{p.heureArrivee}</td>
                          <td className="px-4 py-2.5 text-center text-sm">
                            {p.heureDepart ? <span className="font-semibold text-blue-700">{p.heureDepart}</span> : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${p.portal ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-500'}`}>
                              {p.portal || 'Non renseigné'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-xs text-gray-600">{p.shiftDebut}–{p.shiftFin}</td>
                          <td className="px-4 py-2.5 text-center">
                            {p.retard ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                <Clock className="w-2.5 h-2.5" /> +{p.retardMinutes}min
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                                <CheckCircle className="w-2.5 h-2.5" /> OK
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center text-xs text-gray-600">
                            {p.withVehicle ? (p.vehicleRegistration || p.vehicleLabel || 'Oui') : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {p.horsZone ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                <ShieldAlert className="w-2.5 h-2.5" /> Hors zone
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                                <Navigation className="w-2.5 h-2.5" /> Sur site
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center text-xs font-semibold">{p.distanceArrivee}m</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mini-map visualisation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2"><Navigation className="w-4 h-4 text-blue-600" /> Vue Sites — Présence en temps réel</h2>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 gap-4">
                    {sites.map(site => {
                      const sitePts = filteredPointages.filter(p => {
                        const d = pointageStore.haversineDistance(p.latArrivee, p.lngArrivee, site.lat, site.lng);
                        return d <= site.rayon && !p.heureDepart;
                      });
                      return (
                        <div key={site.id} className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${sitePts.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`}>
                                {sitePts.length}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-800">{site.nom}</p>
                                <p className="text-[10px] text-gray-400">Rayon : {site.rayon}m — ({site.lat.toFixed(4)}, {site.lng.toFixed(4)})</p>
                              </div>
                            </div>
                          </div>
                          {sitePts.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {sitePts.map(p => (
                                <div key={p.id} className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg shadow-sm">
                                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[8px] font-bold">
                                    {p.employeNom.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <span className="text-[10px] font-semibold text-gray-700">{p.employeNom.split(' ')[0]}</span>
                                  <span className="text-[9px] text-gray-400">{p.heureArrivee}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">Aucun employé actuellement sur ce site</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Majorations fériés / weekends */}
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2"><Shield className="w-4 h-4 text-orange-600" /> Majorations Paie — Fériés & Weekends</h2>
                </div>
                <div className="p-5 space-y-4">
                  {(() => {
                    const fePts = filteredPointages.filter(p => p.isFerie || p.isWeekend);
                    if (fePts.length === 0) return (
                      <div className="text-center py-4 text-gray-400 text-sm">Aucun travail en jour férié ou weekend aujourd'hui</div>
                    );
                    return fePts.map(p => {
                      const ag = agents.find(a => a.id === p.employeId);
                      const hrs = p.heureDepart ? ((parseInt(p.heureDepart.split(':')[0]) * 60 + parseInt(p.heureDepart.split(':')[1])) - (parseInt(p.heureArrivee.split(':')[0]) * 60 + parseInt(p.heureArrivee.split(':')[1]))) / 60 : 0;
                      const maj = p.isFerie
                        ? pointageStore.calcMajorationFerie(ag?.salaireBase || 0, hrs)
                        : pointageStore.calcMajorationWeekend(ag?.salaireBase || 0, hrs);
                      return (
                        <div key={p.id} className="flex items-center justify-between bg-orange-50 rounded-xl p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">{p.employeNom.split(' ').map(n => n[0]).join('')}</div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{p.employeNom}</p>
                              <p className="text-[10px] text-gray-500">{p.isFerie ? 'Jour férié' : 'Weekend'} — {hrs > 0 ? `${hrs.toFixed(1)}h travaillées` : 'En cours…'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {hrs > 0 && <p className="text-sm font-bold text-orange-700">+{formatFcfa(maj)}</p>}
                            <p className="text-[10px] text-orange-500">{p.isFerie ? 'Majoration 100%' : 'Majoration 40%'}</p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700">
                    <strong>Convention Collective du Sénégal :</strong> Travail un jour férié = majoration de 100% du taux horaire. Travail le weekend = majoration de 40%.
                  </div>
                </div>
              </div>
            </div>

            {/* Retards du jour */}
            {retards.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2"><Clock className="w-4 h-4 text-red-600" /> Retards du Jour (seuil : +15 min)</h2>
                </div>
                <div className="p-4 space-y-2">
                  {retards.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-red-50 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold">{p.employeNom.split(' ').map(n => n[0]).join('')}</div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{p.employeNom}</p>
                          <p className="text-[10px] text-gray-500">Shift prévu : {p.shiftDebut} — Arrivée : {p.heureArrivee}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold">+{p.retardMinutes} min</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* ═══════════════════════════════ TAB: RÉGLAGES CALENDRIER ═══════════════════════════════ */}
      {tab === 'calendrier' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Jours Fériés */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2"><Calendar className="w-4 h-4 text-red-600" /> Jours Fériés & Fêtes</h2>
              <button onClick={() => setShowFerieModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors">
                <PlusCircle className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                    <th className="px-4 py-2.5 text-left">Nom</th>
                    <th className="px-4 py-2.5 text-left">Date</th>
                    <th className="px-4 py-2.5 text-left">Type</th>
                    <th className="px-4 py-2.5 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feries.map((f, idx) => (
                    <tr key={f.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                      <td className="px-4 py-2.5 text-sm font-semibold">{f.nom}</td>
                      <td className="px-4 py-2.5 text-sm">{new Date(f.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${f.recurrent ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {f.recurrent ? 'Annuel fixe' : 'Variable'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => { congesStore.removeFerie(f.id); reload(); }} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {feries.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-400">Aucun jour férié</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Weekends */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2"><Sun className="w-4 h-4 text-yellow-600" /> Configuration des Weekends</h2>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">Définissez les jours de repos hebdomadaires par défaut. Les jours sélectionnés apparaîtront grisés sur le planning.</p>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {JOURS_SEMAINE.map((j, i) => (
                  <button
                    key={j}
                    onClick={() => {
                      const newJours = weekendCfg.jours.includes(i) ? weekendCfg.jours.filter(d => d !== i) : [...weekendCfg.jours, i];
                      congesStore.saveWeekends({ jours: newJours });
                      reload();
                    }}
                    className={`p-3 rounded-xl text-sm font-bold text-center transition-all ${weekendCfg.jours.includes(i) ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {j}
                  </button>
                ))}
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span>Jours de repos actuels : <strong>{weekendCfg.jours.map(d => JOURS_SEMAINE[d]).join(', ') || 'Aucun'}</strong></span>
              </div>
              <p className="text-[10px] text-gray-400">Pour les chauffeurs en repos tournant, utilisez la gestion manuelle dans le planning via les badges de présence.</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ TAB: ÉQUIPE DE NUIT ═══════════════════════════════ */}
      {tab === 'nuit' && (
        <>
          <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2"><Moon className="w-4 h-4 text-indigo-600" /> Gestion du Travail de Nuit — Horaires Spécifiques</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                    <th className="px-4 py-3 text-left">Collaborateur</th>
                    <th className="px-4 py-3 text-left">Poste</th>
                    <th className="px-4 py-3 text-center">Shift de Nuit</th>
                    <th className="px-4 py-3 text-center">Début</th>
                    <th className="px-4 py-3 text-center">Fin</th>
                    <th className="px-4 py-3 text-center">Nombre de nuits</th>
                    <th className="px-4 py-3 text-right">Heures de nuit (total)</th>
                    <th className="px-4 py-3 text-center">Appliquer majoration ({nightRateLabel})</th>
                    <th className="px-4 py-3 text-right">Majoration nuit ({nightRateLabel})</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a, idx) => {
                    const heuresParNuit = a.shiftNuit ? congesStore.calcHeuresNuit(a.shiftNuitDebut, a.shiftNuitFin) : 0;
                    const nombreNuits = a.shiftNuit ? Math.max(0, Math.floor(a.nombreNuits || 0)) : 0;
                    const heuresNuitTotal = Math.round(heuresParNuit * nombreNuits * 100) / 100;
                    const majoration = (a.shiftNuit && a.appliquerMajorationNuit)
                      ? Math.round(heuresNuitTotal * (a.salaireBase / 173.33) * payrollCountrySettings.nightMajoration)
                      : 0;
                    return (
                      <tr key={a.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${a.shiftNuit ? 'bg-gradient-to-br from-indigo-500 to-purple-700' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                              {(a.firstName[0] || '') + (a.lastName[0] || '')}
                            </div>
                            <span className="text-sm font-semibold">{a.firstName} {a.lastName}</span>
                            {a.shiftNuit && <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">{a.poste || a.role}</td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => {
                              personnelStore.update(a.id, {
                                shiftNuit: !a.shiftNuit,
                                shiftNuitDebut: !a.shiftNuit ? '22:00' : '',
                                shiftNuitFin: !a.shiftNuit ? '06:00' : '',
                                nombreNuits: !a.shiftNuit ? Math.max(1, a.nombreNuits || 26) : 0,
                              });
                              reload();
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${a.shiftNuit ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                          >
                            {a.shiftNuit ? 'Oui' : 'Non'}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {a.shiftNuit ? (
                            <input type="time" value={a.shiftNuitDebut} onChange={e => { personnelStore.update(a.id, { shiftNuitDebut: e.target.value }); reload(); }} className="px-2 py-1 rounded-lg border border-gray-200 text-sm text-center w-24" />
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {a.shiftNuit ? (
                            <input type="time" value={a.shiftNuitFin} onChange={e => { personnelStore.update(a.id, { shiftNuitFin: e.target.value }); reload(); }} className="px-2 py-1 rounded-lg border border-gray-200 text-sm text-center w-24" />
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {a.shiftNuit ? (
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={a.nombreNuits ?? 0}
                              onChange={e => {
                                const next = Number.parseInt(e.target.value || '0', 10);
                                personnelStore.update(a.id, { nombreNuits: Number.isFinite(next) ? Math.max(0, next) : 0 });
                                reload();
                              }}
                              className="px-2 py-1 rounded-lg border border-gray-200 text-sm text-center w-24"
                              aria-label="Nombre de nuits"
                            />
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums">{a.shiftNuit ? `${heuresNuitTotal.toLocaleString('fr-FR')} h` : '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          {a.shiftNuit ? (
                            <button
                              type="button"
                              role="switch"
                              aria-checked={a.appliquerMajorationNuit}
                              onClick={() => {
                                personnelStore.update(a.id, { appliquerMajorationNuit: !a.appliquerMajorationNuit });
                                reload();
                              }}
                              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${a.appliquerMajorationNuit ? 'bg-blue-600' : 'bg-gray-300'}`}
                              title="Activer/Désactiver la majoration de nuit"
                            >
                              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${a.appliquerMajorationNuit ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {a.shiftNuit ? (
                            <span className={`text-sm font-bold tabular-nums ${majoration > 0 ? 'text-indigo-700' : 'text-gray-400'}`}>
                              {formatFcfa(majoration)}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {a.shiftNuit && (
                            <button onClick={() => { personnelStore.update(a.id, { shiftNuit: false, shiftNuitDebut: '', shiftNuitFin: '' }); reload(); }} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Retirer du shift de nuit">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Convention Sénégal */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <Moon className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-indigo-800 mb-1">Convention Collective — Travail de Nuit au Sénégal</h3>
                <ul className="text-xs text-indigo-700 space-y-1">
                  <li>Les heures de travail effectuées entre <strong>22h00 et 06h00</strong> sont considérées comme heures de nuit.</li>
                  <li>Majoration de <strong>{nightRateLabel}</strong> du taux horaire normal (paramétrable depuis le centre de contrôle paie).</li>
                  <li>Taux horaire calculé sur base mensuelle de <strong>173,33 heures</strong> (40h/semaine).</li>
                  <li>Les champs <strong>Début/Fin/Nombre de nuits</strong> sont synchronisés en temps réel avec l'onglet <strong>Gestion des Heures</strong>.</li>
                  <li>Les majorations actives sont automatiquement calculées et transmises au module <strong>Paie & Retenues</strong>.</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════ TAB: GESTION DES HEURES ═══════════════════════════════ */}
      {tab === 'heures' && (
        <div className="w-full bg-white rounded-2xl shadow-md overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-800 uppercase flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Gestion des Heures — HS & Nuits
              </h2>
              <p className="text-xs text-gray-500 mt-1">Pré-remplissage automatique via pointage et shifts, avec correction manuelle et bascules paie.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={heuresMonth}
                onChange={(e) => setHeuresMonth(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
              />
              <button
                type="button"
                onClick={() => setHeuresRows(heuresStore.loadRows(heuresMonth))}
                className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
              >
                Recalculer
              </button>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="min-w-[1700px] w-full">
              <thead>
                <tr className="bg-[#1a1a2e] text-white text-xs uppercase">
                  <th className="px-4 py-3 text-left">Collaborateur</th>
                  <th className="px-4 py-3 text-left">Shift de référence</th>
                  <th className="px-4 py-3 text-right">Heures travaillées</th>
                  <th className="px-4 py-3 text-right">Heures planifiées</th>
                  <th className="px-4 py-3 text-right">HS totales</th>
                  <th className="px-4 py-3 text-center">Début nuit</th>
                  <th className="px-4 py-3 text-center">Fin nuit</th>
                  <th className="px-4 py-3 text-center">HS 15% (h)</th>
                  <th className="px-4 py-3 text-center">HS 40% (h)</th>
                  <th className="px-4 py-3 text-center">HS 60% (h)</th>
                  <th className="px-4 py-3 text-center">Nuits</th>
                  <th className="px-4 py-3 text-right">Heures nuit</th>
                  <th className="px-4 py-3 text-center">Appliquer HS</th>
                  <th className="px-4 py-3 text-center">Appliquer majoration nuit</th>
                  <th className="px-4 py-3 text-right">Montant HS</th>
                  <th className="px-4 py-3 text-right">Montant nuit</th>
                  <th className="px-4 py-3 text-right">Impact paie</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {heuresRows.map((row, idx) => {
                  const tauxHoraire = row.baseSalary / 173.33;
                  const nightHoursComputed = Math.round((Math.max(0, row.nightsCount) * congesStore.calcHeuresNuit(row.shiftStart, row.shiftEnd)) * 100) / 100;
                  const hs15Amount = Math.round(row.hs15Hours * (tauxHoraire * (1 + payrollCountrySettings.overtime15)));
                  const hs40Amount = Math.round(row.hs40Hours * (tauxHoraire * (1 + payrollCountrySettings.overtime40)));
                  const hs60Amount = Math.round(row.hs60Hours * (tauxHoraire * (1 + payrollCountrySettings.overtime60)));
                  const hsTotalAmount = row.applyHS ? hs15Amount + hs40Amount + hs60Amount : 0;
                  const nightAmount = row.applyNight ? Math.round(nightHoursComputed * (tauxHoraire * payrollCountrySettings.nightMajoration)) : 0;
                  const total = hsTotalAmount + nightAmount;

                  return (
                    <tr key={`${row.employeeId}-${row.month}`} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900">{row.employeeName}</span>
                          <span className="text-[10px] text-gray-500">{row.employeeMatricule}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-700">{row.shiftReference}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-semibold tabular-nums">{formatHours(row.workedHours)}</td>
                      <td className="px-4 py-2.5 text-right text-sm tabular-nums">{formatHours(row.scheduledHours)}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums">{formatHours(row.overtimeHours)}</td>

                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="time"
                          value={row.shiftStart}
                          onChange={(e) => heuresStore.updateRow(row.employeeId, row.month, { shiftStart: e.target.value })}
                          className="px-2 py-1 rounded-lg border border-gray-200 text-sm text-center w-24"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="time"
                          value={row.shiftEnd}
                          onChange={(e) => heuresStore.updateRow(row.employeeId, row.month, { shiftEnd: e.target.value })}
                          className="px-2 py-1 rounded-lg border border-gray-200 text-sm text-center w-24"
                        />
                      </td>

                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="number"
                          min={0}
                          step={0.25}
                          value={row.hs15Hours}
                          onChange={(e) => heuresStore.updateRow(row.employeeId, row.month, { hs15Hours: Number(e.target.value || 0) })}
                          className="px-2 py-1 rounded-lg border border-gray-200 text-sm text-right w-24"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="number"
                          min={0}
                          step={0.25}
                          value={row.hs40Hours}
                          onChange={(e) => heuresStore.updateRow(row.employeeId, row.month, { hs40Hours: Number(e.target.value || 0) })}
                          className="px-2 py-1 rounded-lg border border-gray-200 text-sm text-right w-24"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="number"
                          min={0}
                          step={0.25}
                          value={row.hs60Hours}
                          onChange={(e) => heuresStore.updateRow(row.employeeId, row.month, { hs60Hours: Number(e.target.value || 0) })}
                          className="px-2 py-1 rounded-lg border border-gray-200 text-sm text-right w-24"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={row.nightsCount}
                          onChange={(e) => heuresStore.updateRow(row.employeeId, row.month, { nightsCount: Number(e.target.value || 0) })}
                          className="px-2 py-1 rounded-lg border border-gray-200 text-sm text-right w-20"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm font-semibold tabular-nums">{formatHours(nightHoursComputed)}</td>

                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={row.applyHS}
                          onClick={() => heuresStore.updateRow(row.employeeId, row.month, { applyHS: !row.applyHS })}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${row.applyHS ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${row.applyHS ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={row.applyNight}
                          onClick={() => heuresStore.updateRow(row.employeeId, row.month, { applyNight: !row.applyNight })}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${row.applyNight ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${row.applyNight ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </td>

                      <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums">{formatFcfa(hsTotalAmount)}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums">{formatFcfa(nightAmount)}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-extrabold text-indigo-700 tabular-nums">{formatFcfa(total)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => heuresStore.resetRow(row.employeeId, row.month)}
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                          title="Réinitialiser depuis le calcul automatique"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {heuresRows.length === 0 && (
                  <tr>
                    <td colSpan={18} className="text-center py-8 text-sm text-gray-400">Aucune donnée de pointage exploitable pour ce mois.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 border-t border-gray-100 bg-blue-50 text-xs text-blue-800">
            <strong>Règle automatique:</strong> HS {Math.round(payrollCountrySettings.overtime60 * 100)}% pour dimanches et fériés, sinon répartition HS {Math.round(payrollCountrySettings.overtime15 * 100)}% puis HS {Math.round(payrollCountrySettings.overtime40 * 100)}%. Base horaire = Salaire de base / 173,33.
          </div>
        </div>
      )}

      {/* ═══════ MODALS ═══════ */}
      {showCongeModal && (
        <CongeFormModal
          agents={agents}
          conge={editConge}
          onSave={(data) => {
            if (editConge) { congesStore.updateConge(editConge.id, data); }
            else { congesStore.addConge(data); }
            reload();
            setShowCongeModal(false);
            setEditConge(null);
          }}
          onClose={() => { setShowCongeModal(false); setEditConge(null); }}
        />
      )}

      {showFerieModal && (
        <FerieFormModal
          onSave={(data) => { congesStore.addFerie(data); reload(); setShowFerieModal(false); }}
          onClose={() => setShowFerieModal(false)}
        />
      )}

      <Modal isOpen={viewModal} onClose={() => setViewModal(false)} title={viewConge ? `Congé — ${viewConge.employeNom}` : ''} size="lg">
        {viewConge && (
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[10px] text-gray-400 uppercase">Employé</p><p className="text-sm font-semibold">{viewConge.employeNom}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase">Type</p>{typeBadge(viewConge.typeAbsence)}</div>
              <div><p className="text-[10px] text-gray-400 uppercase">Du</p><p className="text-sm">{viewConge.dateDebut}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase">Au</p><p className="text-sm">{viewConge.dateFin}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase">Nombre de jours</p><p className="text-sm font-bold">{viewConge.nbJours}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase">Statut</p>{statutBadge(viewConge.statut)}</div>
              <div><p className="text-[10px] text-gray-400 uppercase">Remplaçant</p><p className="text-sm">{viewConge.remplacantNom || '—'}</p></div>
            </div>
            {viewConge.motif && <div><p className="text-[10px] text-gray-400 uppercase mb-1">Motif</p><p className="text-sm bg-gray-50 rounded-xl p-3">{viewConge.motif}</p></div>}
            {viewConge.typeAbsence === 'Absence injustifiée' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Cette absence génère une alerte automatique dans le module <strong>Paie & Retenues</strong> pour déduction sur le salaire de {viewConge.employeNom}.</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ═══════ CONGE FORM MODAL ═══════ */
function CongeFormModal({ agents, conge, onSave, onClose }: {
  agents: PersonnelAgent[];
  conge: Conge | null;
  onSave: (data: Omit<Conge, 'id'>) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    employeId: conge?.employeId || '',
    typeAbsence: (conge?.typeAbsence || 'Congé annuel') as TypeAbsence,
    dateDebut: conge?.dateDebut || '',
    dateFin: conge?.dateFin || '',
    statut: (conge?.statut || 'En attente') as StatutValidation,
    remplacantId: conge?.remplacantId || '',
    motif: conge?.motif || '',
  });

  const selectedAgent = agents.find(a => a.id === f.employeId);
  const remplacant = agents.find(a => a.id === f.remplacantId);
  const nbJours = f.dateDebut && f.dateFin && f.dateFin >= f.dateDebut ? congesStore.diffDays(f.dateDebut, f.dateFin) : 0;

  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setF(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.employeId || !f.dateDebut || !f.dateFin) return;
    onSave({
      employeId: f.employeId,
      employeNom: selectedAgent ? `${selectedAgent.firstName} ${selectedAgent.lastName}` : '',
      typeAbsence: f.typeAbsence,
      dateDebut: f.dateDebut,
      dateFin: f.dateFin,
      nbJours,
      statut: f.statut,
      remplacantId: f.remplacantId,
      remplacantNom: remplacant ? `${remplacant.firstName} ${remplacant.lastName}` : '',
      motif: f.motif,
      annee: f.dateDebut.slice(0, 4),
    });
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white";
  const labelCls = "block text-[11px] font-semibold text-gray-500 uppercase mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-5 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{conge ? 'Modifier l\'absence' : 'Nouvelle Absence / Congé'}</h2>
            <p className="text-xs text-gray-300">Base de Kignabour</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><XCircle className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Employé</label>
              <select name="employeId" value={f.employeId} onChange={h} className={inputCls} required>
                <option value="">— Sélectionner —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName} — {a.poste || a.role}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Type d'absence</label>
              <select name="typeAbsence" value={f.typeAbsence} onChange={h} className={inputCls}>
                {TYPES_ABSENCE.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date de début</label>
              <input name="dateDebut" type="date" value={f.dateDebut} onChange={h} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Date de fin</label>
              <input name="dateFin" type="date" value={f.dateFin} onChange={h} className={inputCls} required />
            </div>
          </div>

          {nbJours > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="text-sm font-semibold text-blue-800">Durée calculée : <strong>{nbJours} jour(s)</strong></span>
            </div>
          )}

          {f.typeAbsence === 'Absence injustifiée' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Cette absence générera une <strong>déduction automatique</strong> dans le module Paie & Retenues.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Statut de validation</label>
              <select name="statut" value={f.statut} onChange={h} className={inputCls}>
                {STATUTS_VALIDATION.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Remplaçant (intérim)</label>
              <select name="remplacantId" value={f.remplacantId} onChange={h} className={inputCls}>
                <option value="">— Aucun —</option>
                {agents.filter(a => a.id !== f.employeId).map(a => <option key={a.id} value={a.id}>{a.firstName} {a.lastName} — {a.poste || a.role}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Motif / Commentaire</label>
            <textarea name="motif" value={f.motif} onChange={h} rows={2} className={`${inputCls} resize-none`} placeholder="Motif de l'absence…" />
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">Annuler</button>
          <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md">
            {conge ? 'Enregistrer' : 'Créer l\'absence'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ═══════ FERIE FORM MODAL ═══════ */
function FerieFormModal({ onSave, onClose }: {
  onSave: (data: Omit<JourFerie, 'id'>) => void;
  onClose: () => void;
}) {
  const [nom, setNom] = useState('');
  const [date, setDate] = useState('');
  const [recurrent, setRecurrent] = useState(true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom || !date) return;
    onSave({ nom, date, recurrent });
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white";
  const labelCls = "block text-[11px] font-semibold text-gray-500 uppercase mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-5 text-white flex items-center justify-between">
          <h2 className="text-lg font-bold">Ajouter un Jour Férié</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Nom du jour férié</label>
            <input value={nom} onChange={e => setNom(e.target.value)} className={inputCls} placeholder="Ex: Korité, Tabaski…" required />
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} required />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setRecurrent(!recurrent)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${recurrent ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {recurrent ? 'Annuel fixe (récurrent)' : 'Date variable'}
            </button>
            <span className="text-[10px] text-gray-400">{recurrent ? 'Revient chaque année à la même date' : 'Cette année uniquement'}</span>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">Annuler</button>
          <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md">Ajouter</button>
        </div>
      </form>
    </div>
  );
}
