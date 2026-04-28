import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Shield, Search, UserPlus, LogIn, LogOut, Camera, Users, X,
  AlertTriangle, Clock, QrCode, ChevronDown, User, Building2, Eye, MapPin,
  CarFront, Bike, Truck
} from 'lucide-react';
import { toast } from 'sonner';
import { pointageStore, type Pointage, type PointageVehicleInfo } from '../services/pointageStore';
import { personnelStore, type PersonnelAgent } from '../../fleet/services/personnelStore';
import { vehiclesStore } from '../../fleet/services/vehiclesStore';
import { visiteurStore, type Visiteur } from '../services/visiteurStore';
import { verifyQRPayload } from '../services/badgeService';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { authStore } from '../../../shared/services/authStore';

/* ═══════ TYPES PORTAILS ═══════ */
type Portal = 'Portail 1' | 'Portail 2';
const PORTALS: Portal[] = ['Portail 1', 'Portail 2'];
type EmployeeVehicleMode = 'fleet' | 'other';
type VisitorTransportType = '' | 'Voiture' | 'Moto' | 'Camion' | 'Pied' | 'Autre';
const VISITOR_TRANSPORTS: VisitorTransportType[] = ['Voiture', 'Moto', 'Camion', 'Pied'];

interface FleetVehicleOption {
  id: string;
  label: string;
  registration: string;
}

/* ═══════ SONS ═══════ */
const playBeep = (success: boolean) => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = success ? 880 : 300;
    osc.type = success ? 'sine' : 'square';
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + (success ? 0.15 : 0.4));
  } catch { /* audio non supporté */ }
};

/* ═══════ GPS ═══════ */
function getGPS(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: 14.7645, lng: -17.3660 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: 14.7645, lng: -17.3660 }),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}

/* ═══════ QR CODE GENERATION (pour badges) ═══════ */
function generateQRDataUrl(text: string): string {
  // Simple QR placeholder — en production, utiliser une lib QR
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="white"/>
    <text x="50" y="55" text-anchor="middle" font-size="8" fill="#1a1a2e" font-family="monospace">${text}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/* ═══════ COMPOSANT PRINCIPAL ═══════ */
export default function BornePointagePage() {
  const { user } = useAuth();
  const vigileId = user?.id || 'vigile-1';
  const vigileNom = user?.fullName || 'Vigile de garde';

  // State
  const [agents, setAgents] = useState<PersonnelAgent[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicleOption[]>([]);
  const [pointages, setPointages] = useState<Pointage[]>([]);
  const [allTodayPointages, setAllTodayPointages] = useState<Pointage[]>([]);
  const [visiteurs, setVisiteurs] = useState<Visiteur[]>([]);
  const [mode, setMode] = useState<'scanner' | 'manual' | 'visitor' | 'registry'>('scanner');
  const [scanResult, setScanResult] = useState<{ agent: PersonnelAgent; isOnSite: boolean; pointage?: Pointage } | null>(null);
  const [scanFeedback, setScanFeedback] = useState<'success' | 'error' | null>(null);
  const [manualSearch, setManualSearch] = useState('');
  const [visitorForm, setVisitorForm] = useState({ nom: '', motif: '', societe: '', employeVisiteId: '', transportType: '' as VisitorTransportType, immatriculation: '' });
  const [showPeopleSurSite, setShowPeopleSurSite] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cameraActive, setCameraActive] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  // NOUVEL ÉTAT : Portail sélectionné pour l'affectation
  const [selectedPortal, setSelectedPortal] = useState<Portal | ''>('');
  const [vehicleSelection, setVehicleSelection] = useState({
    enabled: false,
    mode: '' as EmployeeVehicleMode | '',
    fleetVehicleId: '',
    otherRegistration: '',
  });

  // Breakpoints opérationnels (mobile/tablette/poste fixe)
  const touchTargetClass = 'min-h-[56px] sm:min-h-[64px] md:min-h-[72px]';
  const controlTextClass = 'text-base sm:text-lg md:text-xl font-bold';
  const nameDisplayClass = 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl';
  const subtitleDisplayClass = 'text-base sm:text-lg md:text-xl';
  const operationalScannerSizeClass = 'h-[360px] sm:h-[400px] md:h-[440px] lg:h-[480px]';
  const listRowClass = 'min-h-[64px] sm:min-h-[72px]';
  const visitorCardSizeClass = 'min-h-[65vh] sm:min-h-[67vh] md:min-h-[70vh]';

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Data loading
  const reload = useCallback(() => {
    setAgents(personnelStore.load().filter(a => a.statut === 'Actif'));
    setFleetVehicles(
      vehiclesStore.load().map((vehicle: Record<string, unknown>, index: number) => {
        const registration = String(
          vehicle.registration || vehicle.immatriculation || vehicle.plateNumber || vehicle.numeroImmatriculation || `PARC-${index + 1}`
        ).trim();
        const brand = String(vehicle.brand || vehicle.marque || '').trim();
        const model = String(vehicle.model || vehicle.modele || '').trim();
        const id = String(vehicle.id || registration || `fleet-${index}`);
        const details = [brand, model].filter(Boolean).join(' ');
        return {
          id,
          registration,
          label: [registration, details].filter(Boolean).join(' · '),
        };
      })
    );

    const today = new Date().toISOString().slice(0, 10);
    const todayAll = pointageStore.loadPointages().filter(p => p.date === today);
    setAllTodayPointages(todayAll);
    setPointages(todayAll.filter(p => p.heureArrivee && !p.heureDepart));

    setVisiteurs(visiteurStore.getTodayVisiteurs());
  }, []);

  useEffect(() => {
    reload();
    const handler = () => reload();
    window.addEventListener('pointage:updated', handler);
    window.addEventListener('personnel:updated', handler);
    window.addEventListener('visiteurs:updated', handler);
    window.addEventListener('fleetVehicles:updated', handler);
    return () => {
      window.removeEventListener('pointage:updated', handler);
      window.removeEventListener('personnel:updated', handler);
      window.removeEventListener('visiteurs:updated', handler);
      window.removeEventListener('fleetVehicles:updated', handler);
    };
  }, [reload]);

  // Auto-focus scanner input
  useEffect(() => {
    if (mode === 'scanner' && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [mode]);

  // Compteurs
  const employesSurSite = useMemo(() => {
    return pointages;
  }, [pointages]);

  const visiteursSurSite = useMemo(() => visiteurStore.getVisiteursSurSite(), [visiteurs]);
  const totalSurSite = employesSurSite.length + visiteursSurSite.length;
  const selectedFleetVehicle = useMemo(
    () => fleetVehicles.find(vehicle => vehicle.id === vehicleSelection.fleetVehicleId),
    [fleetVehicles, vehicleSelection.fleetVehicleId]
  );

  const resetAccessOptions = useCallback(() => {
    setSelectedPortal('');
    setVehicleSelection({ enabled: false, mode: '', fleetVehicleId: '', otherRegistration: '' });
  }, []);

  // NOUVEAU : Liste de présence dynamique pour les portails
  const activePortals = useMemo(() => {
    const status: Record<Portal, { agentName: string; pointage: Pointage } | null> = {
      'Portail 1': null,
      'Portail 2': null,
    };

    for (const portal of PORTALS) {
      const portalCheckins = allTodayPointages
        .filter(p => p.portal === portal && p.heureArrivee && !p.heureDepart)
        .sort((a, b) => (b.heureArrivee || '').localeCompare(a.heureArrivee || ''));

      if (portalCheckins.length > 0) {
        const lastCheckin = portalCheckins[0];
        status[portal] = { agentName: lastCheckin.employeNom || 'Agent inconnu', pointage: lastCheckin };
      }
    }
    return status;
  }, [allTodayPointages]);

  // Trouver agent par ID (QR scan)
  const findAgentById = useCallback((id: string): PersonnelAgent | undefined => {
    return agents.find(a => a.id === id || a.matricule === id);
  }, [agents]);

  const isAgentBlockedFromSite = useCallback((agent: PersonnelAgent) => {
    return authStore.isSiteAccessBlocked(agent.email, `${agent.firstName} ${agent.lastName}`);
  }, []);

  const resolveVehiclePayload = useCallback((): PointageVehicleInfo | undefined | null => {
    if (!vehicleSelection.enabled) return undefined;

    if (!vehicleSelection.mode) {
      toast.error('Sélectionnez le type de véhicule utilisé.');
      playBeep(false);
      return null;
    }

    if (vehicleSelection.mode === 'fleet') {
      if (!selectedFleetVehicle) {
        toast.error('Sélectionnez un véhicule du parc.');
        playBeep(false);
        return null;
      }

      return {
        mode: 'fleet',
        vehicleId: selectedFleetVehicle.id,
        registration: selectedFleetVehicle.registration,
        label: selectedFleetVehicle.label,
      };
    }

    const registration = vehicleSelection.otherRegistration.trim().toUpperCase();
    if (!registration) {
      toast.error('Renseignez l\'immatriculation du véhicule.');
      playBeep(false);
      return null;
    }

    return {
      mode: 'other',
      registration,
      label: registration,
    };
  }, [selectedFleetVehicle, vehicleSelection]);

  const renderAccessControls = (agent: PersonnelAgent, isOnSite: boolean) => {
    return (
      <div className="w-full max-w-3xl space-y-5 mb-5">
        <div className="bg-gray-800/70 p-5 rounded-2xl border border-white/20">
          <label className="block text-lg font-black text-amber-300 mb-3 tracking-wide">
            {isOnSite ? 'Point d\'accès de sortie' : (agent.role === 'Agent de sécurité' ? 'Poste d\'affectation' : 'Point d\'accès d\'entrée')}
          </label>
          <select
            required
            value={selectedPortal}
            onChange={(e) => setSelectedPortal(e.target.value as Portal)}
            className={`w-full border-2 border-gray-500 rounded-2xl px-5 py-4 bg-gray-900 text-white focus:outline-none focus:border-amber-400 ${touchTargetClass} ${controlTextClass}`}
          >
            <option value="">-- Sélectionnez un portail --</option>
            {PORTALS.map(portal => {
              const portalInfo = activePortals[portal];
              const isPresent = Boolean(portalInfo && !portalInfo.pointage.heureDepart);
              const label = agent.role === 'Agent de sécurité'
                ? `${portal} ${isPresent ? `(Occupé par ${portalInfo?.agentName})` : '(Disponible)'}`
                : `${portal} ${portalInfo ? `(Vigile: ${portalInfo.agentName})` : '(Sans vigile affecté)'}`;
              return (
                <option key={portal} value={portal} disabled={agent.role === 'Agent de sécurité' && !isOnSite ? isPresent : false}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <div className="bg-white/10 p-5 rounded-2xl border border-white/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-black text-cyan-200">Flux véhicule</p>
              <p className="text-sm text-gray-300">Déclarez le véhicule utilisé pour ce passage.</p>
            </div>
            <label className={`inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-white ${touchTargetClass} ${controlTextClass}`}>
              <input
                type="checkbox"
                checked={vehicleSelection.enabled}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setVehicleSelection(selection => ({
                    enabled,
                    mode: enabled ? selection.mode : '',
                    fleetVehicleId: enabled ? selection.fleetVehicleId : '',
                    otherRegistration: enabled ? selection.otherRegistration : '',
                  }));
                }}
                className="h-5 w-5 rounded border-white/20 bg-transparent text-cyan-500 focus:ring-cyan-400"
              />
              Avec véhicule ?
            </label>
          </div>

          {vehicleSelection.enabled && (
            <div className="mt-4 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setVehicleSelection(selection => ({ ...selection, mode: 'fleet', otherRegistration: '' }))}
                  className={`rounded-2xl border px-5 py-4 text-left transition-all ${vehicleSelection.mode === 'fleet' ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100' : 'border-white/10 bg-white/5 text-gray-300 hover:border-cyan-500/40'}`}
                >
                  <p className="text-base font-black">Véhicule de Fonction / Parc</p>
                  <p className="text-sm text-gray-300">Liste synchronisée avec le module Flotte.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setVehicleSelection(selection => ({ ...selection, mode: 'other', fleetVehicleId: '' }))}
                  className={`rounded-2xl border px-5 py-4 text-left transition-all ${vehicleSelection.mode === 'other' ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100' : 'border-white/10 bg-white/5 text-gray-300 hover:border-cyan-500/40'}`}
                >
                  <p className="text-base font-black">Autre véhicule</p>
                  <p className="text-sm text-gray-300">Saisie libre de l'immatriculation.</p>
                </button>
              </div>

              {vehicleSelection.mode === 'fleet' && (
                <div>
                  <label className="mb-2 block text-base font-bold text-gray-200">Véhicule du parc</label>
                  <select
                    value={vehicleSelection.fleetVehicleId}
                    onChange={(event) => setVehicleSelection(selection => ({ ...selection, fleetVehicleId: event.target.value }))}
                    className={`w-full rounded-2xl border border-white/20 bg-gray-900 px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${touchTargetClass} ${controlTextClass}`}
                  >
                    <option value="">-- Sélectionner un véhicule --</option>
                    {fleetVehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {vehicleSelection.mode === 'other' && (
                <div>
                  <label className="mb-2 block text-base font-bold text-gray-200">Immatriculation</label>
                  <input
                    type="text"
                    value={vehicleSelection.otherRegistration}
                    onChange={(event) => setVehicleSelection(selection => ({ ...selection, otherRegistration: event.target.value.toUpperCase() }))}
                    placeholder="DK-1234-AA"
                    className={`w-full rounded-2xl border border-white/20 bg-gray-900 px-5 py-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${touchTargetClass} ${controlTextClass}`}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Traitement du scan QR
  const handleScan = useCallback(async (scannedValue: string) => {
    const trimmed = scannedValue.trim();
    if (!trimmed) return;

    // Try signed QR first, fallback to plain ID
    let agent: PersonnelAgent | undefined;
    const qr = await verifyQRPayload(trimmed);
    if (qr.valid) {
      agent = findAgentById(qr.employeId);
    } else {
      // Fallback: plain agent ID or matricule
      agent = findAgentById(trimmed);
    }

    if (!agent) {
      playBeep(false);
      setScanFeedback('error');
      toast.error(qr.employeId && !qr.valid ? 'QR Code invalide — Signature non vérifiée' : 'QR Code non reconnu — Utilisez la recherche manuelle');
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        setScanFeedback(null);
      }, 3000);
      return;
    }

    if (isAgentBlockedFromSite(agent)) {
      playBeep(false);
      setScanFeedback('error');
      toast.error('Accès site bloqué : badge et pointage désactivés pour cet agent.');
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        setScanFeedback(null);
      }, 3000);
      return;
    }

    const todayPointage = pointageStore.getTodayPointage(agent.id);
    const isOnSite = !!(todayPointage && todayPointage.heureArrivee && !todayPointage.heureDepart);
    setSelectedPortal((todayPointage?.portal as Portal | undefined) || '');

    playBeep(true);
    setScanResult({ agent, isOnSite, pointage: todayPointage });
    setScanFeedback('success');

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setScanResult(null);
      setScanFeedback(null);
      setScanInput('');
      resetAccessOptions();
      if (scanInputRef.current) scanInputRef.current.focus();
    }, 5000);
  }, [findAgentById, isAgentBlockedFromSite, resetAccessOptions]);

  // Entrée employé
  const handleEntree = useCallback(async (agent: PersonnelAgent) => {
    const isSecurity = agent.role === 'Agent de sécurité';
    if (!selectedPortal) {
      toast.error(isSecurity ? "Veuillez sélectionner un poste d'affectation." : "Veuillez sélectionner un point d'accès.");
      playBeep(false);
      return;
    }

    const vehicle = resolveVehiclePayload();
    if (vehicle === null) return;

    const gps = await getGPS();
    const shift = agent.shiftNuit
      ? { debut: agent.shiftNuitDebut || '22:00', fin: agent.shiftNuitFin || '06:00' }
      : { debut: '08:00', fin: '17:00' };

    pointageStore.checkIn(
      agent.id, `${agent.firstName} ${agent.lastName}`,
      gps.lat, gps.lng,
      shift.debut, shift.fin,
      agent.shiftNuit, false, false,
      { portal: selectedPortal, vehicle: vehicle || undefined }
    );
    toast.success(`✅ ENTRÉE — ${agent.firstName} ${agent.lastName}`);
    playBeep(true);
    setScanResult(null);
    setScanFeedback(null);
    resetAccessOptions();
    reload();
  }, [reload, resetAccessOptions, resolveVehiclePayload, selectedPortal]);

  // Sortie employé
  const handleSortie = useCallback(async (pointage: Pointage) => {
    if (!selectedPortal) {
      toast.error('Veuillez sélectionner un point d\'accès pour la sortie.');
      playBeep(false);
      return;
    }
    const gps = await getGPS();
    pointageStore.checkOut(pointage.id, gps.lat, gps.lng, { portal: selectedPortal });
    toast.success(`🚪 SORTIE — ${pointage.employeNom}`);
    playBeep(true);
    setScanResult(null);
    setScanFeedback(null);
    resetAccessOptions();
    reload();
  }, [reload, resetAccessOptions, selectedPortal]);

  // Pointage manuel
  const handleManualPointage = useCallback((agent: PersonnelAgent) => {
    if (isAgentBlockedFromSite(agent)) {
      playBeep(false);
      toast.error('Accès site bloqué : badge et pointage désactivés pour cet agent.');
      return;
    }
    const todayPointage = pointageStore.getTodayPointage(agent.id);
    const isOnSite = !!(todayPointage && todayPointage.heureArrivee && !todayPointage.heureDepart);
    resetAccessOptions();
    setSelectedPortal((todayPointage?.portal as Portal | undefined) || '');
    setScanResult({ agent, isOnSite, pointage: todayPointage });
  }, [isAgentBlockedFromSite, resetAccessOptions]);

  // Ajout visiteur
  const handleAddVisiteur = useCallback(() => {
    if (!visitorForm.nom.trim()) {
      toast.error('Nom du visiteur requis');
      return;
    }
    if (visitorForm.transportType && !visitorForm.immatriculation.trim()) {
      toast.error('L\'immatriculation est obligatoire pour un visiteur motorisé.');
      return;
    }
    const employeVisite = agents.find(a => a.id === visitorForm.employeVisiteId);
    visiteurStore.add({
      nom: visitorForm.nom.trim(),
      motif: visitorForm.motif.trim(),
      societe: visitorForm.societe.trim(),
      transportType: visitorForm.transportType,
      immatriculation: visitorForm.immatriculation.trim().toUpperCase(),
      employeVisite: employeVisite ? `${employeVisite.firstName} ${employeVisite.lastName}` : '',
      employeVisiteId: visitorForm.employeVisiteId,
      heureEntree: new Date().toTimeString().slice(0, 5),
      heureSortie: '',
      date: new Date().toISOString().slice(0, 10),
      vigileId,
      vigileNom,
      surSite: true,
    });
    toast.success(`✅ Visiteur enregistré : ${visitorForm.nom}`);
    playBeep(true);
    setVisitorForm({ nom: '', motif: '', societe: '', employeVisiteId: '', transportType: '', immatriculation: '' });
    setMode('scanner');
    reload();
  }, [visitorForm, agents, vigileId, vigileNom, reload]);

  // Sortie visiteur
  const handleSortieVisiteur = useCallback((id: number) => {
    visiteurStore.sortieVisiteur(id);
    toast.success('🚪 Visiteur sorti');
    reload();
  }, [reload]);

  // Filtrage recherche manuelle
  const filteredAgents = useMemo(() => {
    if (!manualSearch.trim()) return agents;
    const q = manualSearch.toLowerCase();
    return agents.filter(a =>
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
      a.matricule.toLowerCase().includes(q) ||
      a.poste.toLowerCase().includes(q)
    );
  }, [agents, manualSearch]);

  // Initiales avatar
  const getInitials = (firstName: string, lastName: string) =>
    `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();

  // Scan input handler (scanners QR envoient les données + Enter)
  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan(scanInput);
      setScanInput('');
    }
  };

  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-[#0a0a1a] text-white select-none">
      {/* ═══════ HEADER — Compteur Sur Site ═══════ */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo + Titre */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight">Borne de Pointage</h1>
              <p className="text-xs text-gray-400">Poste de Garde — IVOS</p>
            </div>
          </div>

          {/* Compteur Central */}
          <button
            onClick={() => setShowPeopleSurSite(true)}
            className="flex items-center gap-3 px-5 py-2.5 bg-white/10 hover:bg-white/15 rounded-2xl transition-all border border-white/10 active:scale-95"
          >
            <Users className="h-5 w-5 text-emerald-400" />
            <div className="text-center">
              <span className="text-2xl font-black tabular-nums">{totalSurSite}</span>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Sur site</p>
            </div>
          </button>

          {/* Horloge */}
          <div className="text-right">
            <p className="text-xl font-black tabular-nums tracking-wider">
              {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-[10px] text-gray-400 uppercase">
              {currentTime.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>

        {/* Onglets mode */}
        <div className="border-t border-white/10 px-4 py-2 sm:px-6">
          <div className="mx-auto flex w-full max-w-3xl justify-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-sm">
              {([
                { key: 'scanner', label: 'Scanner', icon: QrCode },
                { key: 'manual', label: 'Recherche', icon: Search },
                { key: 'visitor', label: 'Visiteur', icon: UserPlus },
                { key: 'registry', label: 'Registre', icon: Eye },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setMode(tab.key); setScanResult(null); setScanFeedback(null); resetAccessOptions(); }}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all sm:px-4 sm:text-base ${
                    mode === tab.key
                      ? 'bg-white/12 text-white shadow-[0_10px_24px_rgba(16,185,129,0.12)] ring-1 ring-emerald-400/40'
                      : 'text-gray-400 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="border-b border-white/10 bg-[#0f172fcc] backdrop-blur-xl">
        <div className="mx-auto grid w-full max-w-6xl gap-3 px-4 py-4 sm:grid-cols-2 sm:px-6 lg:px-8">
          {PORTALS.map(portal => {
            const portalInfo = activePortals[portal];
            const occupied = Boolean(portalInfo);
            return (
              <div key={portal} className={`rounded-3xl border px-6 py-5 shadow-xl ${occupied ? 'border-emerald-300 bg-gradient-to-r from-emerald-900/80 to-emerald-700/60' : 'border-slate-300/60 bg-gradient-to-r from-slate-900/80 to-slate-700/60'}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.25em] text-white/80">{portal}</p>
                    <p className={`mt-2 text-3xl font-black tracking-tight ${occupied ? 'text-emerald-100' : 'text-white'}`}>
                      {portalInfo?.agentName || 'Libre'}
                    </p>
                  </div>
                  <div className={`rounded-full px-4 py-1.5 text-sm font-black uppercase ${occupied ? 'bg-emerald-200 text-emerald-900' : 'bg-white text-slate-900'}`}>
                    {occupied ? 'Occupé' : 'Disponible'}
                  </div>
                </div>
                <p className="mt-3 text-base font-semibold text-white/80">
                  {occupied ? `En poste depuis ${portalInfo?.pointage.heureArrivee}` : 'Aucun agent affecté actuellement.'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════ CONTENU PRINCIPAL ═══════ */}
      <main className="w-full p-4 sm:p-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">

        {/* ─── MODE SCANNER ─── */}
        {mode === 'scanner' && (
          <div className="flex flex-col items-center gap-6">
            {/* Zone de scan */}
            <div className={`mx-auto w-full max-w-[500px] rounded-[28px] border border-white/10 bg-white/5 p-3 shadow-md backdrop-blur-sm ${
              scanFeedback === 'success' ? 'shadow-[0_0_50px_rgba(16,185,129,0.18)]' :
              scanFeedback === 'error' ? 'shadow-[0_0_50px_rgba(239,68,68,0.18)]' :
              'shadow-[0_18px_45px_rgba(15,23,42,0.22)]'
            }`}>
              <div className={`relative ${operationalScannerSizeClass} w-full rounded-3xl overflow-hidden border-4 transition-all duration-300 ${
                scanFeedback === 'success' ? 'border-emerald-500 shadow-[0_0_60px_rgba(16,185,129,0.3)]' :
                scanFeedback === 'error' ? 'border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.3)]' :
                'border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.05)]'
              }`}>
                {/* Fond caméra simulé */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center">
                  {!scanResult ? (
                    <>
                      {/* Grille de scan animée */}
                      <div className="relative w-48 h-48 mb-6">
                        <div className="absolute inset-0 border-2 border-dashed border-white/20 rounded-2xl" />
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                        {/* Ligne de scan animée */}
                        <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse top-1/2" />
                      </div>
                      <Camera className="h-8 w-8 text-gray-500 mb-3" />
                      <p className="text-gray-400 text-sm text-center px-4">Présentez le QR Code devant la caméra</p>
                      <p className="text-gray-600 text-xs mt-1">ou scannez avec le lecteur de badge</p>
                    </>
                  ) : (
                    /* Résultat du scan */
                    <div className="flex h-full flex-col items-center justify-center text-center p-8 animate-fadeIn">
                      {/* Avatar */}
                      {scanResult.agent.photo ? (
                        <img
                          src={scanResult.agent.photo}
                          alt={`${scanResult.agent.firstName} ${scanResult.agent.lastName}`}
                          className="w-28 h-28 rounded-full object-cover border-4 border-emerald-400 shadow-xl mb-4"
                        />
                      ) : (
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-3xl font-black border-4 border-emerald-400 shadow-xl mb-4">
                          {getInitials(scanResult.agent.firstName, scanResult.agent.lastName)}
                        </div>
                      )}
                      <h2 className={`${nameDisplayClass} font-black mb-2 leading-tight`}>
                        {scanResult.agent.firstName} {scanResult.agent.lastName}
                      </h2>
                      <p className={`text-gray-300 mb-1 font-semibold ${subtitleDisplayClass}`}>{scanResult.agent.poste}</p>
                      <p className="text-gray-400 text-sm sm:text-base md:text-lg mb-6 font-semibold">{scanResult.agent.matricule}</p>

                      {renderAccessControls(scanResult.agent, scanResult.isOnSite)}

                      {/* Statut + Bouton action */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`w-3 h-3 rounded-full ${scanResult.isOnSite ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                        <span className={`text-sm font-semibold ${scanResult.isOnSite ? 'text-emerald-400' : 'text-gray-400'}`}>
                          {scanResult.isOnSite ? 'Actuellement sur site' : 'Hors site'}
                        </span>
                      </div>

                      {scanResult.isOnSite && scanResult.pointage ? (
                        <button
                          onClick={() => handleSortie(scanResult.pointage!)}
                          className={`w-full max-w-2xl py-6 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white uppercase tracking-wider shadow-lg shadow-red-900/40 transition-all active:scale-95 ${touchTargetClass} text-2xl sm:text-3xl md:text-4xl font-black`}
                        >
                          <div className="flex items-center justify-center gap-3">
                            <LogOut className="h-8 w-8" />
                            SORTIE
                          </div>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEntree(scanResult.agent)}
                          className={`w-full max-w-2xl py-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white uppercase tracking-wider shadow-lg shadow-emerald-900/40 transition-all active:scale-95 ${touchTargetClass} text-2xl sm:text-3xl md:text-4xl font-black`}
                        >
                          <div className="flex items-center justify-center gap-3">
                            <LogIn className="h-8 w-8" />
                            ENTRÉE
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="max-w-[500px] text-center text-sm text-gray-400">
              Module de scan compact pour un pointage rapide, avec une zone recentree et detachee du fond pour un meilleur confort visuel sur poste fixe.
            </div>

            {/* Input caché pour QR scanner (les lecteurs de code-barre envoient du texte + Enter) */}
            <input
              ref={scanInputRef}
              type="text"
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              onKeyDown={handleScanKeyDown}
              className="sr-only"
              aria-label="QR Code Scanner Input"
              autoFocus
            />

            {/* Simuler des scans pour la démo */}
            <div className="w-full max-w-lg">
              <p className="text-xs text-gray-600 text-center mb-3">Simulation — Cliquer pour scanner un badge :</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {agents.slice(0, 8).map(a => (
                  <button
                    key={a.id}
                    onClick={() => handleScan(a.id)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 active:scale-95"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] flex items-center justify-center text-xs font-bold">
                      {getInitials(a.firstName, a.lastName)}
                    </div>
                    <span className="text-[10px] text-gray-400 truncate w-full text-center">{a.firstName}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── MODE RECHERCHE MANUELLE ─── */}
        {mode === 'manual' && (
          <div className="space-y-4">
            {scanResult && (
              <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Employé sélectionné</p>
                    <h2 className="mt-2 text-2xl font-black text-white">{scanResult.agent.firstName} {scanResult.agent.lastName}</h2>
                    <p className="text-sm text-gray-300">{scanResult.agent.poste} · {scanResult.agent.matricule}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setScanResult(null); resetAccessOptions(); }}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-white/10"
                  >
                    Annuler
                  </button>
                </div>

                <div className="mt-5">
                  {renderAccessControls(scanResult.agent, scanResult.isOnSite)}
                </div>

                <div className="flex flex-wrap gap-3">
                  {scanResult.isOnSite && scanResult.pointage ? (
                    <button
                      type="button"
                      onClick={() => handleSortie(scanResult.pointage!)}
                      className={`rounded-2xl bg-red-600 px-6 py-4 uppercase tracking-wider text-white shadow-lg shadow-red-900/30 transition-all hover:bg-red-700 ${touchTargetClass} text-lg sm:text-xl md:text-2xl font-black`}
                    >
                      Sortie
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEntree(scanResult.agent)}
                      className={`rounded-2xl bg-emerald-600 px-6 py-4 uppercase tracking-wider text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-700 ${touchTargetClass} text-lg sm:text-xl md:text-2xl font-black`}
                    >
                      Entrée
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-500" />
              <input
                type="text"
                placeholder="Rechercher un employé par nom ou matricule..."
                value={manualSearch}
                onChange={e => setManualSearch(e.target.value)}
                className={`w-full pl-14 pr-4 py-5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 ${touchTargetClass} text-lg sm:text-xl md:text-2xl`}
                autoFocus
              />
              {manualSearch && (
                <button onClick={() => setManualSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              )}
            </div>

            {/* Liste des employés */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {filteredAgents.map(agent => {
                const todayPointage = pointageStore.getTodayPointage(agent.id);
                const isOnSite = !!(todayPointage && todayPointage.heureArrivee && !todayPointage.heureDepart);
                return (
                  <button
                    key={agent.id}
                    onClick={() => handleManualPointage(agent)}
                    className={`w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 active:scale-[0.98] ${listRowClass}`}
                  >
                    {/* Avatar */}
                    {agent.photo ? (
                      <img src={agent.photo} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white/10" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] flex items-center justify-center text-lg font-bold shrink-0">
                        {getInitials(agent.firstName, agent.lastName)}
                      </div>
                    )}
                    {/* Info */}
                    <div className="flex-1 text-left">
                      <p className="font-bold text-base sm:text-lg md:text-xl">{agent.firstName} {agent.lastName}</p>
                      <p className="text-xs sm:text-sm md:text-base text-gray-400">{agent.poste} · {agent.matricule}</p>
                    </div>
                    {/* Statut + Action */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className={`w-3 h-3 rounded-full ${isOnSite ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                      <div className={`px-5 py-3 rounded-xl font-bold text-sm sm:text-base md:text-lg uppercase tracking-wider ${
                        isOnSite
                          ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                          : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {isOnSite ? 'Sortie' : 'Entrée'}
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredAgents.length === 0 && (
                <div className="text-center py-16">
                  <Search className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun employé trouvé</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── MODE VISITEUR ─── */}
        {mode === 'visitor' && (
          <div className="max-w-5xl mx-auto space-y-5">
            <div className={`bg-white/5 rounded-3xl p-8 sm:p-10 md:p-12 border border-white/10 ${visitorCardSizeClass} flex flex-col`}>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black">Nouveau Visiteur</h2>
                  <p className="text-base sm:text-lg md:text-xl text-gray-300">Enregistrement rapide</p>
                </div>
              </div>

              <div className="flex-1 space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <label className="block text-xl sm:text-2xl md:text-3xl font-black text-gray-100 mb-3">
                      <User className="inline h-5 w-5 sm:h-6 sm:w-6 mr-2 -mt-1" />
                      Nom du visiteur *
                    </label>
                    <input
                      type="text"
                      value={visitorForm.nom}
                      onChange={e => setVisitorForm(f => ({ ...f, nom: e.target.value }))}
                      placeholder="Nom complet"
                      className={`w-full px-5 py-5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${touchTargetClass} text-xl sm:text-2xl md:text-3xl font-semibold`}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xl sm:text-2xl md:text-3xl font-black text-gray-100 mb-3">
                      <Building2 className="inline h-5 w-5 sm:h-6 sm:w-6 mr-2 -mt-1" />
                      Entreprise
                    </label>
                    <input
                      type="text"
                      value={visitorForm.societe}
                      onChange={e => setVisitorForm(f => ({ ...f, societe: e.target.value }))}
                      placeholder="Nom de la société"
                      className={`w-full px-5 py-5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${touchTargetClass} text-xl sm:text-2xl md:text-3xl font-semibold`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xl sm:text-2xl md:text-3xl font-black text-gray-100 mb-3">
                    Motif de visite
                  </label>
                  <input
                    type="text"
                    value={visitorForm.motif}
                    onChange={e => setVisitorForm(f => ({ ...f, motif: e.target.value }))}
                    placeholder="Objet de la visite"
                    className={`w-full px-5 py-5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${touchTargetClass} text-xl sm:text-2xl md:text-3xl font-semibold`}
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <label className="block text-xl sm:text-2xl md:text-3xl font-black text-gray-100 mb-3">
                      Moyen de transport
                    </label>
                    <div className="relative">
                      <select
                        value={visitorForm.transportType}
                        onChange={e => setVisitorForm(f => ({
                          ...f,
                          transportType: e.target.value as VisitorTransportType,
                          immatriculation: e.target.value === 'Pied' ? '' : f.immatriculation,
                        }))}
                        className={`w-full px-5 py-5 bg-white/5 border border-white/10 rounded-2xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${touchTargetClass} text-xl sm:text-2xl md:text-3xl font-semibold`}
                      >
                        <option value="" className="text-gray-900 bg-white">— Sélectionner —</option>
                        {VISITOR_TRANSPORTS.map(transport => (
                          <option key={transport} value={transport} className="text-gray-900 bg-white">
                            {transport}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xl sm:text-2xl md:text-3xl font-black text-gray-100 mb-3">
                      <Users className="inline h-5 w-5 sm:h-6 sm:w-6 mr-2 -mt-1" />
                      Employé à visiter
                    </label>
                    <div className="relative">
                      <select
                        value={visitorForm.employeVisiteId}
                        onChange={e => setVisitorForm(f => ({ ...f, employeVisiteId: e.target.value }))}
                        className={`w-full px-5 py-5 bg-white/5 border border-white/10 rounded-2xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${touchTargetClass} text-xl sm:text-2xl md:text-3xl font-semibold`}
                      >
                        <option value="" className="text-gray-900 bg-white">— Sélectionner —</option>
                        {agents.map(a => (
                          <option key={a.id} value={a.id} className="text-gray-900 bg-white">
                            {a.firstName} {a.lastName} — {a.poste}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {visitorForm.transportType && visitorForm.transportType !== 'Pied' && (
                  <div>
                    <label className="block text-xl sm:text-2xl md:text-3xl font-black text-amber-200 mb-3">
                      Immatriculation *
                    </label>
                    <input
                      type="text"
                      value={visitorForm.immatriculation}
                      onChange={e => setVisitorForm(f => ({ ...f, immatriculation: e.target.value.toUpperCase() }))}
                      placeholder="DK-1234-AA"
                      className={`w-full px-6 py-6 bg-amber-500/10 border-2 border-amber-400/60 rounded-2xl text-white placeholder:text-amber-200/60 focus:outline-none focus:ring-2 focus:ring-amber-500/70 ${touchTargetClass} text-2xl sm:text-3xl md:text-4xl font-black tracking-wide`}
                    />
                  </div>
                )}
              </div>

              {/* Bouton valider */}
              <button
                onClick={handleAddVisiteur}
                disabled={!visitorForm.nom.trim()}
                className={`w-full mt-8 py-6 rounded-3xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white uppercase tracking-wider shadow-[0_24px_40px_rgba(16,185,129,0.35)] transition-all active:scale-95 ${touchTargetClass} text-2xl sm:text-3xl md:text-4xl font-black`}
              >
                ENREGISTRER L'ENTRÉE
              </button>
            </div>

            {/* Visiteurs du jour */}
            {visiteurs.length > 0 && (
              <div className="bg-white/5 rounded-3xl p-5 border border-white/10">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">
                  Visiteurs aujourd'hui ({visiteurs.length})
                </h3>
                <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                  {visiteurs.map(v => (
                    <div key={v.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <User className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{v.nom}</p>
                          <p className="text-xs text-gray-500">
                            {v.societe && `${v.societe} · `}
                            {v.motif && `${v.motif} · `}
                            {v.transportType && `${v.transportType}${v.immatriculation ? ` (${v.immatriculation})` : ''} · `}
                            {v.heureEntree}{v.heureSortie ? ` → ${v.heureSortie}` : ''}
                          </p>
                        </div>
                      </div>
                      {v.surSite && (
                        <button
                          onClick={() => handleSortieVisiteur(v.id)}
                          className={`px-4 py-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 font-bold uppercase hover:bg-red-600/30 active:scale-95 transition-all ${touchTargetClass} text-xs sm:text-sm md:text-base`}
                        >
                          Sortie
                        </button>
                      )}
                      {!v.surSite && (
                        <span className="text-xs text-gray-500 font-medium">Sorti(e)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── MODE REGISTRE ─── */}
        {mode === 'registry' && (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black text-emerald-400 tabular-nums">{employesSurSite.length}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Employés</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black text-amber-400 tabular-nums">{visiteursSurSite.length}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Visiteurs</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black text-blue-400 tabular-nums">{totalSurSite}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Total site</p>
              </div>
            </div>

            {/* Employés sur site */}
            <div className="bg-white/5 rounded-3xl p-5 border border-white/10">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Employés sur site ({employesSurSite.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[40vh] overflow-y-auto">
                {employesSurSite.map(p => {
                  const agent = agents.find(a => a.id === p.employeId);
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                      {agent?.photo ? (
                        <img src={agent.photo} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/30" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {agent ? getInitials(agent.firstName, agent.lastName) : '??'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{p.employeNom}</p>
                        <p className="text-[10px] text-gray-500">
                          Entrée {p.heureArrivee}
                          {p.portal && (
                            <span className="ml-2 px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-[9px] font-bold">{p.portal}</span>
                          )}
                          {p.vehicleRegistration && (
                            <span className="ml-2 px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full text-[9px] font-bold">{p.vehicleRegistration}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {employesSurSite.length === 0 && (
                  <div className="col-span-full text-center py-8">
                    <Users className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Aucun employé sur site</p>
                  </div>
                )}
              </div>
            </div>

            {/* Visiteurs sur site */}
            {visiteursSurSite.length > 0 && (
              <div className="bg-white/5 rounded-3xl p-5 border border-white/10">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  Visiteurs sur site ({visiteursSurSite.length})
                </h3>
                <div className="space-y-2">
                  {visiteursSurSite.map(v => (
                    <div key={v.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <User className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{v.nom}</p>
                          <p className="text-[10px] text-gray-500">{v.societe} · Entrée {v.heureEntree}</p>
                          {v.motif && (
                            <p className="text-[10px] text-gray-400">{v.motif}</p>
                          )}
                          {v.transportType && (
                            <p className="text-[10px] text-amber-300">{v.transportType} {v.immatriculation ? `· ${v.immatriculation}` : ''}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleSortieVisiteur(v.id)}
                        className={`px-4 py-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 font-bold uppercase hover:bg-red-600/30 active:scale-95 transition-all ${touchTargetClass} text-xs sm:text-sm md:text-base`}
                      >
                        Sortie
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Journal du jour */}
            <div className="bg-white/5 rounded-3xl p-5 border border-white/10">
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Journal des passages
              </h3>
              <div className="space-y-1.5 max-h-[30vh] overflow-y-auto">
                {[...allTodayPointages].reverse().map(p => (
                  <div key={p.id} className={`flex items-center gap-3 px-3 py-2.5 bg-white/[0.03] rounded-xl text-sm ${listRowClass}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${!p.heureDepart ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                    <span className="text-gray-500 tabular-nums text-xs sm:text-sm md:text-base w-12 sm:w-16">{p.heureArrivee}</span>
                    <span className="font-medium text-sm sm:text-base md:text-lg flex-1 truncate">{p.employeNom}</span>
                    <div className="flex items-center gap-2">
                      {p.portal && (
                        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-blue-300">{p.portal}</span>
                      )}
                      {p.vehicleRegistration && (
                        <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-cyan-300">{p.vehicleRegistration}</span>
                      )}
                      {p.retard && (
                        <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold">
                          +{p.retardMinutes}min
                        </span>
                      )}
                      {p.horsZone && (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                      )}
                      {p.heureDepart ? (
                        <span className="text-gray-500 tabular-nums text-xs sm:text-sm">→ {p.heureDepart}</span>
                      ) : (
                        <span className="text-emerald-500 text-[10px] sm:text-xs font-bold">EN COURS</span>
                      )}
                    </div>
                  </div>
                ))}
                {allTodayPointages.length === 0 && (
                  <p className="text-center text-gray-600 py-6 text-sm">Aucun passage enregistré aujourd'hui</p>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* ═══════ MODAL — Personnes sur site ═══════ */}
      {showPeopleSurSite && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowPeopleSurSite(false)}>
          <div className="w-full sm:max-w-xl bg-[#12122a] rounded-t-3xl sm:rounded-3xl border border-white/10 max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Users className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Personnes sur site</h2>
                  <p className="text-xs text-gray-400">{totalSurSite} personnes · {currentTime.toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <button onClick={() => setShowPeopleSurSite(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[65vh] space-y-4">
              {/* Employés */}
              <div>
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                  Employés ({employesSurSite.length})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {employesSurSite.map(p => {
                    const agent = agents.find(a => a.id === p.employeId);
                    return (
                      <div key={p.id} className="flex items-center gap-2.5 p-2.5 bg-white/5 rounded-xl">
                        {agent?.photo ? (
                          <img src={agent.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {agent ? getInitials(agent.firstName, agent.lastName) : '??'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{p.employeNom}</p>
                          <p className="text-[10px] text-gray-500">
                            {p.heureArrivee}
                            {p.portal ? ` · ${p.portal}` : ''}
                            {p.vehicleRegistration ? ` · ${p.vehicleRegistration}` : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Visiteurs */}
              {visiteursSurSite.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                    Visiteurs ({visiteursSurSite.length})
                  </h3>
                  <div className="space-y-2">
                    {visiteursSurSite.map(v => (
                      <div key={v.id} className="flex items-center gap-2.5 p-2.5 bg-white/5 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{v.nom}</p>
                          <p className="text-[10px] text-gray-500">
                            {v.societe} · {v.heureEntree}
                            {v.motif ? ` · ${v.motif}` : ''}
                            {v.transportType ? ` · ${v.transportType}` : ''}
                            {v.immatriculation ? ` · ${v.immatriculation}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ FOOTER VIGILE ═══════ */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#0a0a1a]/90 backdrop-blur-md border-t border-white/5 px-4 py-2">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-300">{vigileNom}</p>
              <p className="text-[10px] text-gray-600">Vigile en service</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-gray-600" />
            <span className="text-[10px] text-gray-600">Dépôt Kignabour · GPS actif</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
