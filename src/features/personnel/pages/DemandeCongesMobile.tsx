import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { personnelStore, PersonnelAgent } from '../../fleet/services/personnelStore';
import { congesStore, Conge, TypeAbsence } from '../services/congesStore';
import { pointageStore, Pointage } from '../services/pointageStore';
import {
  Send, Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Moon, ArrowLeft, User,
  MapPin, LogIn, LogOut, Navigation, ShieldAlert, Loader2
} from 'lucide-react';

const TYPES_ABSENCE: TypeAbsence[] = ['Congé annuel', 'Permission', 'Maladie', 'Récupération'];

/* ═══════ MOBILE SELF-SERVICE — DEMANDE DE CONGÉ & POINTAGE ═══════ */
export default function DemandeCongesMobile() {
  const [agents, setAgents] = useState<PersonnelAgent[]>([]);
  const [conges, setConges] = useState<Conge[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* Pointage GPS */
  const [todayPt, setTodayPt] = useState<Pointage | undefined>();
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMsg, setGpsMsg] = useState('');
  const [gpsError, setGpsError] = useState('');

  const reload = useCallback(() => {
    setAgents(personnelStore.load());
    setConges(congesStore.loadConges());
    if (selectedAgent) setTodayPt(pointageStore.getTodayPointage(selectedAgent));
  }, [selectedAgent]);

  useEffect(() => {
    reload();
    const h = () => reload();
    window.addEventListener('conges:updated', h);
    window.addEventListener('personnel:updated', h);
    window.addEventListener('pointage:updated', h);
    return () => { window.removeEventListener('conges:updated', h); window.removeEventListener('personnel:updated', h); window.removeEventListener('pointage:updated', h); };
  }, [reload]);

  const agent = agents.find(a => a.id === selectedAgent);
  const mesConges = useMemo(() => conges.filter(c => c.employeId === selectedAgent), [conges, selectedAgent]);
  const solde = useMemo(() => selectedAgent ? congesStore.getSoldeConges(selectedAgent, '2026', conges) : 0, [selectedAgent, conges]);

  /* ═══ GPS helpers ═══ */
  function getGPS(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Géolocalisation non supportée'));
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });
  }

  async function handleCheckIn() {
    if (!agent) return;
    setGpsLoading(true); setGpsMsg(''); setGpsError('');
    try {
      const pos = await getGPS();
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      const shiftDebut = agent.shiftNuit ? (agent.shiftNuitDebut || '22:00') : '08:00';
      const shiftFin = agent.shiftNuit ? (agent.shiftNuitFin || '06:00') : '17:00';
      const isFerie = congesStore.isFerie(new Date().toISOString().slice(0, 10));
      const isWeekend = congesStore.isWeekend(new Date().toISOString().slice(0, 10));
      const entry = pointageStore.checkIn(agent.id, `${agent.firstName} ${agent.lastName}`, lat, lng, shiftDebut, shiftFin, agent.shiftNuit, isFerie, isWeekend);
      setTodayPt(entry);
      setGpsMsg(entry.horsZone ? `Pointé à ${entry.heureArrivee} — Hors zone (${entry.distanceArrivee}m)` : `Pointé à ${entry.heureArrivee} — GPS OK (${entry.distanceArrivee}m)`);
    } catch (err: unknown) {
      setGpsError(err instanceof Error ? err.message : 'Erreur GPS, vérifiez les paramètres de localisation.');
    }
    setGpsLoading(false);
  }

  async function handleCheckOut() {
    if (!todayPt) return;
    setGpsLoading(true); setGpsMsg(''); setGpsError('');
    try {
      const pos = await getGPS();
      pointageStore.checkOut(todayPt.id, pos.coords.latitude, pos.coords.longitude);
      setTodayPt(pointageStore.getTodayPointage(selectedAgent));
      setGpsMsg('Départ enregistré — Bonne fin de journée !');
    } catch (err: unknown) {
      setGpsError(err instanceof Error ? err.message : 'Erreur GPS');
    }
    setGpsLoading(false);
  }

  /* Si aucun agent sélectionné : écran de login simplifié */
  if (!selectedAgent) {
    return (
      <div className="w-full min-h-screen flex flex-col">
        <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3"><User className="w-8 h-8" /></div>
          <h1 className="text-xl font-bold">Demande de Congé</h1>
          <p className="text-xs text-gray-300 mt-1">Interface employé — Self-Service</p>
        </div>
        <div className="flex-1 p-4">
          <p className="text-sm text-gray-600 mb-4 text-center">Sélectionnez votre profil pour accéder à votre espace personnel</p>
          <div className="space-y-2 max-w-md mx-auto">
            {agents.map(a => (
              <button key={a.id} onClick={() => setSelectedAgent(a.id)} className="w-full flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-blue-50 transition-all text-left">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {a.firstName[0]}{a.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{a.firstName} {a.lastName}</p>
                  <p className="text-[10px] text-gray-400">{a.poste || a.role} — {a.matricule}</p>
                </div>
                {a.shiftNuit && <Moon className="w-4 h-4 text-indigo-500 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* Écran principal agent */
  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* Mobile header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-4 text-white">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedAgent(''); setShowForm(false); setSubmitted(false); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
            {agent ? agent.firstName[0] + agent.lastName[0] : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{agent?.firstName} {agent?.lastName}</p>
            <p className="text-[10px] text-gray-300">{agent?.poste} — {agent?.matricule}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Solde */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Solde congés 2026</p>
          <div className="flex items-end gap-2">
            <span className={`text-3xl font-bold ${solde > 10 ? 'text-green-600' : solde > 0 ? 'text-yellow-600' : 'text-red-600'}`}>{solde}</span>
            <span className="text-sm text-gray-400 mb-1">/ {congesStore.CONGE_ANNUEL_TOTAL} jours</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
            <div className={`h-2 rounded-full transition-all ${solde > 10 ? 'bg-green-500' : solde > 0 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.max(0, (solde / congesStore.CONGE_ANNUEL_TOTAL) * 100)}%` }} />
          </div>
        </div>

        {/* ═══════ POINTAGE GPS ═══════ */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-gray-800 uppercase">Pointage GPS</h3>
          </div>
          <div className="p-4 space-y-3">
            {/* Statut du jour */}
            {todayPt ? (
              <div className={`rounded-xl p-3 flex items-center gap-3 ${todayPt.horsZone ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${todayPt.horsZone ? 'bg-red-500' : 'bg-green-500'} text-white`}>
                  {todayPt.horsZone ? <ShieldAlert className="w-5 h-5" /> : <Navigation className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${todayPt.horsZone ? 'text-red-800' : 'text-green-800'}`}>
                    Arrivée : {todayPt.heureArrivee} {todayPt.heureDepart ? `— Départ : ${todayPt.heureDepart}` : ''}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {todayPt.horsZone ? `Hors zone (${todayPt.distanceArrivee}m du site)` : `Sur site (${todayPt.distanceArrivee}m)`}
                    {todayPt.retard && <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-800 rounded-full text-[9px] font-bold">Retard +{todayPt.retardMinutes}min</span>}
                    {todayPt.isNuit && <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[9px] font-bold">Shift Nuit</span>}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-3 text-center text-sm text-gray-400">Aucun pointage aujourd'hui</div>
            )}

            {/* Boutons pointage */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCheckIn}
                disabled={gpsLoading || !!todayPt}
                className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md
                  ${todayPt ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
              >
                {gpsLoading && !todayPt ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-5 h-5" />}
                Arrivée
              </button>
              <button
                onClick={handleCheckOut}
                disabled={gpsLoading || !todayPt || !!todayPt?.heureDepart}
                className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md
                  ${!todayPt || todayPt?.heureDepart ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}
              >
                {gpsLoading && todayPt && !todayPt.heureDepart ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-5 h-5" />}
                Départ
              </button>
            </div>

            {gpsMsg && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-blue-600" /> {gpsMsg}
              </div>
            )}
            {gpsError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" /> {gpsError}
              </div>
            )}

            <p className="text-[9px] text-gray-400 text-center">Rayon de validation : 200m du site. Les retards (&gt;15 min) sont signalés automatiquement.</p>
          </div>
        </div>

        {/* Bouton Nouvelle Demande */}
        {!showForm && !submitted && (
          <button onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md">
            <Send className="w-4 h-4" /> Nouvelle demande de congé
          </button>
        )}

        {/* Confirmation */}
        {submitted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center animate-fadeIn">
            <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-green-800">Demande envoyée</h3>
            <p className="text-xs text-green-600 mt-1">Votre demande a été transmise à la Direction pour validation. Vous serez notifié du résultat.</p>
            <button onClick={() => { setSubmitted(false); reload(); }} className="mt-3 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">OK</button>
          </div>
        )}

        {/* Formulaire */}
        {showForm && !submitted && (
          <MobileCongeForm
            agent={agent!}
            onSubmit={(data) => {
              congesStore.addConge(data);
              setShowForm(false);
              setSubmitted(true);
              reload();
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Mes demandes */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-800 uppercase flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-indigo-600" /> Mes demandes</h3>
          </div>
          {mesConges.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-xs">Aucune demande</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {mesConges.map(c => (
                <div key={c.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${c.typeAbsence === 'Congé annuel' ? 'bg-orange-100 text-orange-800' : c.typeAbsence === 'Maladie' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'}`}>
                        {c.typeAbsence}
                      </span>
                      <span className="text-[10px] text-gray-400">{c.nbJours}j</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{c.dateDebut} → {c.dateFin}</p>
                  </div>
                  <div className="shrink-0">
                    {c.statut === 'En attente' && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-[10px] font-bold">
                        <Clock className="w-3 h-3" /> En attente
                      </span>
                    )}
                    {c.statut === 'Validé par direction' && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-[10px] font-bold">
                        <CheckCircle className="w-3 h-3" /> Validé
                      </span>
                    )}
                    {c.statut === 'Refusé' && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                        <XCircle className="w-3 h-3" /> Refusé
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════ MOBILE FORM ═══════ */
function MobileCongeForm({ agent, onSubmit, onCancel }: {
  agent: PersonnelAgent;
  onSubmit: (data: Omit<Conge, 'id'>) => void;
  onCancel: () => void;
}) {
  const [typeAbsence, setTypeAbsence] = useState<TypeAbsence>('Congé annuel');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [motif, setMotif] = useState('');

  const nbJours = dateDebut && dateFin && dateFin >= dateDebut ? congesStore.diffDays(dateDebut, dateFin) : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dateDebut || !dateFin) return;
    onSubmit({
      employeId: agent.id,
      employeNom: `${agent.firstName} ${agent.lastName}`,
      typeAbsence,
      dateDebut,
      dateFin,
      nbJours,
      statut: 'En attente',
      remplacantId: '',
      remplacantNom: '',
      motif,
      annee: dateDebut.slice(0, 4),
    });
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white";

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl shadow-md overflow-hidden animate-fadeIn">
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-4 text-white">
        <h3 className="text-sm font-bold">Nouvelle demande de congé</h3>
        <p className="text-[10px] text-gray-300">{agent.firstName} {agent.lastName}</p>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Type de congé</label>
          <select value={typeAbsence} onChange={e => setTypeAbsence(e.target.value as TypeAbsence)} className={inputCls}>
            {TYPES_ABSENCE.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Date de début</label>
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Date de fin</label>
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className={inputCls} required />
          </div>
        </div>

        {nbJours > 0 && (
          <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs font-semibold text-blue-800">Durée : <strong>{nbJours} jour(s)</strong></span>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Motif (optionnel)</label>
          <textarea value={motif} onChange={e => setMotif(e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Raison de la demande…" />
        </div>
      </div>
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl font-semibold hover:bg-gray-100 transition-colors">Annuler</button>
        <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-md flex items-center justify-center gap-2">
          <Send className="w-4 h-4" /> Envoyer
        </button>
      </div>
    </form>
  );
}
