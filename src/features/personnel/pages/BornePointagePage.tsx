import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Shield,
  Search,
  UserPlus,
  LogIn,
  LogOut,
  Camera,
  Users,
  X,
  AlertTriangle,
  Clock,
  QrCode,
  ChevronDown,
  User,
  Building2,
  Eye,
  MapPin,
  CarFront,
  Bike,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  pointageStore,
  type Pointage,
  type PointageVehicleInfo,
  type TerminalConfig,
  type OfflinePointageAction,
} from '../services/pointageStore';
import { usePortals, type Portal } from '../services/portalsService';
import { useAttendanceRealtime } from '../hooks/useAttendanceRealtime';
import { personnelStore, type PersonnelAgent } from '../../fleet/services/personnelStore';
import { vehiclesStore } from '../../fleet/services/vehiclesStore';
import { visiteurStore, type Visiteur } from '../services/visiteurStore';
import { verifyQRPayload } from '../services/badgeService';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useSite } from '../../../shared/contexts/SiteContext';
import { authStore } from '../../../shared/services/authStore';

/* ═══════ TYPES PORTAILS ═══════ */
type EmployeeVehicleMode = 'fleet' | 'other';
type VisitorTransportType = '' | 'Voiture' | 'Moto' | 'Camion' | 'Pied' | 'Autre';
const VISITOR_TRANSPORTS: VisitorTransportType[] = ['Voiture', 'Moto', 'Camion', 'Pied', 'Autre'];

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
  } catch {
    /* audio non supporté */
  }
};

/* ═══════ GPS ═══════ */
function getGPS(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: 14.7645, lng: -17.366 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: 14.7645, lng: -17.366 }),
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
  const siteCtx = useSite();
  const vigileId = user?.id || 'vigile-1';
  const vigileNom = user?.fullName || 'Vigile de garde';

  // State
  const [agents, setAgents] = useState<PersonnelAgent[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicleOption[]>([]);
  const [pointages, setPointages] = useState<Pointage[]>([]);
  const [allTodayPointages, setAllTodayPointages] = useState<Pointage[]>([]);
  const [visiteurs, setVisiteurs] = useState<Visiteur[]>([]);
  const [availablePortals, setAvailablePortals] = useState<Portal[]>([]);
  const [mode, setMode] = useState<'scanner' | 'manual' | 'visitor' | 'registry'>('scanner');
  const [scanResult, setScanResult] = useState<{
    agent: PersonnelAgent;
    isOnSite: boolean;
    pointage?: Pointage;
  } | null>(null);
  const [scanFeedback, setScanFeedback] = useState<'success' | 'error' | null>(null);
  const [manualSearch, setManualSearch] = useState('');
  const [visitorForm, setVisitorForm] = useState({
    nom: '',
    motif: '',
    societe: '',
    employeVisiteId: '',
    transportType: '' as VisitorTransportType,
    immatriculation: '',
  });
  const [showPeopleSurSite, setShowPeopleSurSite] = useState(false);
  const [terminalConfig, setTerminalConfig] = useState<TerminalConfig>({
    terminalId: 'TERMINAL_1',
    terminalName: 'Borne 1',
    updatedAt: new Date().toISOString(),
  });
  const [pendingActions, setPendingActions] = useState<OfflinePointageAction[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cameraActive, setCameraActive] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  // NOUVEL ÉTAT : Portail sélectionné pour l'affectation
  const [selectedPortal, setSelectedPortal] = useState<Portal | null>(null);
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
    setAgents(personnelStore.load().filter((a) => a.statut === 'Actif'));
    setFleetVehicles(
      vehiclesStore.load().map((vehicle: any, index: number) => {
        const registration = String(
          vehicle.registration ||
            vehicle.immatriculation ||
            vehicle.plateNumber ||
            vehicle.numeroImmatriculation ||
            `PARC-${index + 1}`
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
    const todayAll = pointageStore.loadPointages().filter((p) => p.date === today);
    setAllTodayPointages(todayAll);
    setPointages(todayAll.filter((p) => p.heureArrivee && !p.heureDepart));

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

  useEffect(() => {
    setTerminalConfig(pointageStore.loadTerminalConfig());
    setPendingActions(pointageStore.loadOfflineQueue());

    const refreshOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) {
        const flushed = pointageStore.flushOfflineQueue();
        if (flushed.length > 0) {
          toast.success('Connexion restaurée, la file de pointage a été synchronisée.');
          setPendingActions(pointageStore.loadOfflineQueue());
        }
      }
    };

    const storageHandler = (event: StorageEvent) => {
      if (
        event.key === 'ivos_pointage_v1' ||
        event.key === 'ivos_pointage_terminal_config_v1' ||
        event.key === 'ivos_pointage_queue_v1'
      ) {
        reload();
        setTerminalConfig(pointageStore.loadTerminalConfig());
        setPendingActions(pointageStore.loadOfflineQueue());
      }
    };

    const broadcastChannel =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ivos-pointage-sync') : null;
    const broadcastHandler = () => {
      reload();
      setTerminalConfig(pointageStore.loadTerminalConfig());
      setPendingActions(pointageStore.loadOfflineQueue());
    };

    window.addEventListener('online', refreshOnlineStatus);
    window.addEventListener('offline', refreshOnlineStatus);
    window.addEventListener('storage', storageHandler);
    broadcastChannel?.addEventListener('message', broadcastHandler);

    return () => {
      window.removeEventListener('online', refreshOnlineStatus);
      window.removeEventListener('offline', refreshOnlineStatus);
      window.removeEventListener('storage', storageHandler);
      broadcastChannel?.removeEventListener('message', broadcastHandler);
      broadcastChannel?.close();
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
    () => fleetVehicles.find((vehicle) => vehicle.id === vehicleSelection.fleetVehicleId),
    [fleetVehicles, vehicleSelection.fleetVehicleId]
  );

  const pendingCount = useMemo(
    () => pendingActions.filter((action) => action.status === 'pending').length,
    [pendingActions]
  );

  const resetAccessOptions = useCallback(() => {
    setSelectedPortal(null);
    setVehicleSelection({ enabled: false, mode: '', fleetVehicleId: '', otherRegistration: '' });
  }, []);

  const siteId = useSite()?.viewSite?.id || '';
  const { data: portals = [] } = usePortals(siteId);
  useAttendanceRealtime(siteId);

  useEffect(() => {
    // Bridge fetched portals into local availablePortals state used across this component
    setAvailablePortals(portals as Portal[]);
    if (!selectedPortal && portals && portals.length > 0) setSelectedPortal(portals[0] as Portal);
  }, [portals]);

  const handleTerminalChange = useCallback(
    (portalId: string) => {
      const selected = (portals || []).find((p) => p.id === portalId) as Portal | undefined;
      if (!selected) return;
      const nextConfig: TerminalConfig = {
        terminalId: (selected as any).terminal_id || (selected as any).terminalId,
        terminalName: (selected as any).name,
        updatedAt: new Date().toISOString(),
      };
      setTerminalConfig(nextConfig);
      pointageStore.saveTerminalConfig(nextConfig);
      setSelectedPortal(selected as any);
    },
    [portals]
  );

  // NOUVEAU : Liste de présence dynamique pour les portails (clé = portal.id)
  const activePortals = useMemo(() => {
    const status: Record<string, { agentName: string; pointage: Pointage } | null> = {};
    for (const p of availablePortals) status[p.id] = null;

    for (const portal of availablePortals) {
      const portalCheckins = allTodayPointages
        .filter(
          (pt) =>
            (pt.portalId && pt.portalId === portal.id) ||
            (pt.terminalId &&
              (pt.terminalId === (portal as any).terminal_id ||
                pt.terminalId === (portal as any).terminalId)) ||
            (pt.portal && pt.portal === portal.name)
        )
        .filter((p) => p.heureArrivee && !p.heureDepart)
        .sort((a, b) => (b.heureArrivee || '').localeCompare(a.heureArrivee || ''));

      if (portalCheckins.length > 0) {
        const lastCheckin = portalCheckins[0];
        status[portal.id] = {
          agentName: lastCheckin.employeNom || 'Agent inconnu',
          pointage: lastCheckin,
        };
      }
    }

    return status;
  }, [allTodayPointages, availablePortals]);

  // Trouver agent par ID (QR scan)
  const findAgentById = useCallback(
    (id: string): PersonnelAgent | undefined => {
      return agents.find((a) => a.id === id || a.matricule === id);
    },
    [agents]
  );

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
      toast.error("Renseignez l'immatriculation du véhicule.");
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
      <div className="mb-5 w-full max-w-3xl space-y-5">
        <div className="rounded-2xl border border-white/20 bg-gray-800/70 p-5">
          <label className="mb-3 block text-lg font-black tracking-wide text-amber-300">
            {isOnSite
              ? "Point d'accès de sortie"
              : agent.role === 'Agent de sécurité'
                ? "Poste d'affectation"
                : "Point d'accès d'entrée"}
          </label>
          <select
            required
            value={selectedPortal?.id || ''}
            onChange={(e) => {
              const portal = availablePortals.find((p) => p.id === e.target.value) || null;
              setSelectedPortal(portal);
            }}
            className={`w-full rounded-2xl border-2 border-gray-500 bg-gray-900 px-5 py-4 text-white focus:border-amber-400 focus:outline-none ${touchTargetClass} ${controlTextClass}`}
          >
            <option value="">-- Sélectionnez un portail --</option>
            {availablePortals.map((portal) => {
              const portalInfo = activePortals[portal.id];
              const isPresent = Boolean(portalInfo && !portalInfo.pointage.heureDepart);
              const label =
                agent.role === 'Agent de sécurité'
                  ? `${portal.name} ${isPresent ? `(Occupé par ${portalInfo?.agentName})` : '(Disponible)'}`
                  : `${portal.name} ${portalInfo ? `(Vigile: ${portalInfo.agentName})` : '(Sans vigile affecté)'}`;
              return (
                <option
                  key={portal.id}
                  value={portal.id}
                  disabled={agent.role === 'Agent de sécurité' && !isOnSite ? isPresent : false}
                >
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-black text-cyan-200">Flux véhicule</p>
              <p className="text-sm text-gray-300">Déclarez le véhicule utilisé pour ce passage.</p>
            </div>
            <label
              className={`inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-white ${touchTargetClass} ${controlTextClass}`}
            >
              <input
                type="checkbox"
                checked={vehicleSelection.enabled}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setVehicleSelection((selection) => ({
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
                  onClick={() =>
                    setVehicleSelection((selection) => ({
                      ...selection,
                      mode: 'fleet',
                      otherRegistration: '',
                    }))
                  }
                  className={`rounded-2xl border px-5 py-4 text-left transition-all ${vehicleSelection.mode === 'fleet' ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100' : 'border-white/10 bg-white/5 text-gray-300 hover:border-cyan-500/40'}`}
                >
                  <p className="text-base font-black">Véhicule de Fonction / Parc</p>
                  <p className="text-sm text-gray-300">Liste synchronisée avec le module Flotte.</p>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setVehicleSelection((selection) => ({
                      ...selection,
                      mode: 'other',
                      fleetVehicleId: '',
                    }))
                  }
                  className={`rounded-2xl border px-5 py-4 text-left transition-all ${vehicleSelection.mode === 'other' ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100' : 'border-white/10 bg-white/5 text-gray-300 hover:border-cyan-500/40'}`}
                >
                  <p className="text-base font-black">Autre véhicule</p>
                  <p className="text-sm text-gray-300">Saisie libre de l'immatriculation.</p>
                </button>
              </div>

              {vehicleSelection.mode === 'fleet' && (
                <div>
                  <label className="mb-2 block text-base font-bold text-gray-200">
                    Véhicule du parc
                  </label>
                  <select
                    value={vehicleSelection.fleetVehicleId}
                    onChange={(event) =>
                      setVehicleSelection((selection) => ({
                        ...selection,
                        fleetVehicleId: event.target.value,
                      }))
                    }
                    className={`w-full rounded-2xl border border-white/20 bg-gray-900 px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${touchTargetClass} ${controlTextClass}`}
                  >
                    <option value="">-- Sélectionner un véhicule --</option>
                    {fleetVehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {vehicleSelection.mode === 'other' && (
                <div>
                  <label className="mb-2 block text-base font-bold text-gray-200">
                    Immatriculation
                  </label>
                  <input
                    type="text"
                    value={vehicleSelection.otherRegistration}
                    onChange={(event) =>
                      setVehicleSelection((selection) => ({
                        ...selection,
                        otherRegistration: event.target.value.toUpperCase(),
                      }))
                    }
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
  const handleScan = useCallback(
    async (scannedValue: string) => {
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
        toast.error(
          qr.employeId && !qr.valid
            ? 'QR Code invalide — Signature non vérifiée'
            : 'QR Code non reconnu — Utilisez la recherche manuelle'
        );
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
      const isOnSite = !!(
        todayPointage &&
        todayPointage.heureArrivee &&
        !todayPointage.heureDepart
      );
      {
        const match =
          availablePortals.find(
            (p) =>
              p.id === todayPointage?.portalId ||
              (todayPointage?.terminalId &&
                ((p as any).terminal_id === todayPointage.terminalId ||
                  (p as any).terminalId === todayPointage.terminalId)) ||
              p.name === todayPointage?.portal
          ) || null;
        setSelectedPortal(match);
      }

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
    },
    [findAgentById, isAgentBlockedFromSite, resetAccessOptions, availablePortals]
  );

  // Entrée employé
  const handleEntree = useCallback(
    async (agent: PersonnelAgent) => {
      const isSecurity = agent.role === 'Agent de sécurité';
      if (!selectedPortal) {
        toast.error(
          isSecurity
            ? "Veuillez sélectionner un poste d'affectation."
            : "Veuillez sélectionner un point d'accès."
        );
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
        agent.id,
        `${agent.firstName} ${agent.lastName}`,
        gps.lat,
        gps.lng,
        shift.debut,
        shift.fin,
        agent.shiftNuit,
        false,
        false,
        {
          portal: selectedPortal,
          portalId: selectedPortal?.id,
          vehicle: vehicle || undefined,
          terminalConfig,
        }
      );
      toast.success(`✅ ENTRÉE — ${agent.firstName} ${agent.lastName}`);
      playBeep(true);
      setScanResult(null);
      setScanFeedback(null);
      resetAccessOptions();
      reload();
    },
    [reload, resetAccessOptions, resolveVehiclePayload, selectedPortal]
  );

  // Sortie employé
  const handleSortie = useCallback(
    async (pointage: Pointage) => {
      if (!selectedPortal) {
        toast.error("Veuillez sélectionner un point d'accès pour la sortie.");
        playBeep(false);
        return;
      }
      const gps = await getGPS();
      pointageStore.checkOut(pointage.id, gps.lat, gps.lng, {
        portal: selectedPortal,
        portalId: selectedPortal?.id,
        terminalConfig,
      });
      toast.success(`🚪 SORTIE — ${pointage.employeNom}`);
      playBeep(true);
      setScanResult(null);
      setScanFeedback(null);
      resetAccessOptions();
      reload();
    },
    [reload, resetAccessOptions, selectedPortal]
  );

  // Pointage manuel
  const handleManualPointage = useCallback(
    (agent: PersonnelAgent) => {
      if (isAgentBlockedFromSite(agent)) {
        playBeep(false);
        toast.error('Accès site bloqué : badge et pointage désactivés pour cet agent.');
        return;
      }
      const todayPointage = pointageStore.getTodayPointage(agent.id);
      const isOnSite = !!(
        todayPointage &&
        todayPointage.heureArrivee &&
        !todayPointage.heureDepart
      );
      resetAccessOptions();
      {
        const match =
          availablePortals.find(
            (p) =>
              p.id === todayPointage?.portalId ||
              (todayPointage?.terminalId &&
                ((p as any).terminal_id === todayPointage.terminalId ||
                  (p as any).terminalId === todayPointage.terminalId)) ||
              p.name === todayPointage?.portal
          ) || null;
        setSelectedPortal(match);
      }
      setScanResult({ agent, isOnSite, pointage: todayPointage });
    },
    [isAgentBlockedFromSite, resetAccessOptions, availablePortals]
  );

  // Ajout visiteur
  const handleAddVisiteur = useCallback(() => {
    if (!visitorForm.nom.trim()) {
      toast.error('Nom du visiteur requis');
      return;
    }
    if (visitorForm.transportType && !visitorForm.immatriculation.trim()) {
      toast.error("L'immatriculation est obligatoire pour un visiteur motorisé.");
      return;
    }
    const employeVisite = agents.find((a) => a.id === visitorForm.employeVisiteId);
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
    setVisitorForm({
      nom: '',
      motif: '',
      societe: '',
      employeVisiteId: '',
      transportType: '',
      immatriculation: '',
    });
    setMode('scanner');
    reload();
  }, [visitorForm, agents, vigileId, vigileNom, reload]);

  // Sortie visiteur
  const handleSortieVisiteur = useCallback(
    (id: number) => {
      visiteurStore.sortieVisiteur(id);
      toast.success('🚪 Visiteur sorti');
      reload();
    },
    [reload]
  );

  // Filtrage recherche manuelle
  const filteredAgents = useMemo(() => {
    if (!manualSearch.trim()) return agents;
    const q = manualSearch.toLowerCase();
    return agents.filter(
      (a) =>
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
    <div className="min-h-screen w-screen select-none overflow-x-hidden bg-[#0a0a1a] text-white">
      {/* ═══════ HEADER — Compteur Sur Site ═══════ */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo + Titre */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
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
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-5 py-2.5 transition-all hover:bg-white/15 active:scale-95"
          >
            <Users className="h-5 w-5 text-emerald-400" />
            <div className="text-center">
              <span className="text-2xl font-black tabular-nums">{totalSurSite}</span>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Sur site</p>
            </div>
          </button>

          {/* Horloge */}
          <div className="space-y-2 text-right">
            <p className="text-xl font-black tabular-nums tracking-wider">
              {currentTime.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
            <p className="text-[10px] uppercase text-gray-400">
              {currentTime.toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </p>
            <div className="inline-flex flex-wrap items-center justify-end gap-2 text-xs text-white/80">
              <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                {terminalConfig.terminalName}
              </div>
              <div
                className={`rounded-full px-3 py-1 ${isOnline ? 'border border-emerald-400/10 bg-emerald-500/15 text-emerald-200' : 'border border-red-400/10 bg-red-500/10 text-red-300'}`}
              >
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </div>
              {pendingCount > 0 && (
                <div className="rounded-full border border-amber-300/10 bg-amber-500/15 px-3 py-1 text-amber-200">
                  {pendingCount} action{pendingCount > 1 ? 's' : ''} en attente
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Onglets mode */}
        <div className="border-t border-white/10 px-4 py-2 sm:px-6">
          <div className="mx-auto flex w-full max-w-3xl justify-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-sm">
              {(
                [
                  { key: 'scanner', label: 'Scanner', icon: QrCode },
                  { key: 'manual', label: 'Recherche', icon: Search },
                  { key: 'visitor', label: 'Visiteur', icon: UserPlus },
                  { key: 'registry', label: 'Registre', icon: Eye },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setMode(tab.key);
                    setScanResult(null);
                    setScanFeedback(null);
                    resetAccessOptions();
                  }}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all sm:px-4 sm:text-base ${
                    mode === tab.key
                      ? 'bg-white/12 text-white shadow-[0_10px_24px_rgba(16,185,129,0.12)] ring-1 ring-emerald-400/40'
                      : 'hover:bg-white/8 text-gray-400 hover:text-white'
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
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
                Terminal actif
              </p>
              <p className="text-sm text-white/90">
                {terminalConfig.terminalName} · {terminalConfig.terminalId}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedPortal?.id || ''}
                onChange={(event) => handleTerminalChange(event.target.value)}
                className="rounded-2xl border border-white/10 bg-gray-900 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Sélectionner le terminal</option>
                {availablePortals.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <div
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isOnline ? 'border border-emerald-400/10 bg-emerald-500/10 text-emerald-200' : 'border border-red-400/10 bg-red-500/10 text-red-200'}`}
              >
                {isOnline ? 'Connecté' : 'Hors ligne'}
              </div>
            </div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2">
            {availablePortals.map((portal) => {
              const portalInfo = activePortals[portal.id];
              const occupied = Boolean(portalInfo);
              return (
                <div
                  key={portal.id}
                  className={`rounded-3xl border px-6 py-5 shadow-xl ${occupied ? 'border-emerald-300 bg-gradient-to-r from-emerald-900/80 to-emerald-700/60' : 'border-slate-300/60 bg-gradient-to-r from-slate-900/80 to-slate-700/60'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.25em] text-white/80">
                        {portal.name}
                      </p>
                      <p
                        className={`mt-2 text-3xl font-black tracking-tight ${occupied ? 'text-emerald-100' : 'text-white'}`}
                      >
                        {portalInfo?.agentName || 'Libre'}
                      </p>
                    </div>
                    <div
                      className={`rounded-full px-4 py-1.5 text-sm font-black uppercase ${occupied ? 'bg-emerald-200 text-emerald-900' : 'bg-white text-slate-900'}`}
                    >
                      {occupied ? 'Occupé' : 'Disponible'}
                    </div>
                  </div>
                  <p className="mt-3 text-base font-semibold text-white/80">
                    {occupied
                      ? `En poste depuis ${portalInfo?.pointage.heureArrivee}`
                      : 'Aucun agent affecté actuellement.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <main className="w-full p-4 sm:p-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          {/* ═══ MODE SCANNER ─── */}
          {mode === 'scanner' && (
            <div className="flex flex-col items-center gap-6">
              {/* Zone de scan */}
              <div
                className={`mx-auto w-full max-w-[500px] rounded-[28px] border border-white/10 bg-white/5 p-3 shadow-md backdrop-blur-sm ${
                  scanFeedback === 'success'
                    ? 'shadow-[0_0_50px_rgba(16,185,129,0.18)]'
                    : scanFeedback === 'error'
                      ? 'shadow-[0_0_50px_rgba(239,68,68,0.18)]'
                      : 'shadow-[0_18px_45px_rgba(15,23,42,0.22)]'
                }`}
              >
                <div
                  className={`relative ${operationalScannerSizeClass} w-full overflow-hidden rounded-3xl border-4 transition-all duration-300 ${
                    scanFeedback === 'success'
                      ? 'border-emerald-500 shadow-[0_0_60px_rgba(16,185,129,0.3)]'
                      : scanFeedback === 'error'
                        ? 'border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.3)]'
                        : 'border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.05)]'
                  }`}
                >
                  {/* Fond caméra simulé */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                    {!scanResult ? (
                      <>
                        {/* Grille de scan animée */}
                        <div className="relative mb-6 h-48 w-48">
                          <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-white/20" />
                          <div className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-emerald-400" />
                          <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-emerald-400" />
                          <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-emerald-400" />
                          <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-emerald-400" />
                          {/* Ligne de scan animée */}
                          <div className="absolute left-2 right-2 top-1/2 h-0.5 animate-pulse bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                        </div>
                        <Camera className="mb-3 h-8 w-8 text-gray-500" />
                        <p className="px-4 text-center text-sm text-gray-400">
                          Présentez le QR Code devant la caméra
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          ou scannez avec le lecteur de badge
                        </p>
                      </>
                    ) : (
                      /* Résultat du scan */
                      <div className="flex h-full animate-fadeIn flex-col items-center justify-center p-8 text-center">
                        {/* Avatar */}
                        {scanResult.agent.photo ? (
                          <img
                            src={scanResult.agent.photo}
                            alt={`${scanResult.agent.firstName} ${scanResult.agent.lastName}`}
                            className="mb-4 h-28 w-28 rounded-full border-4 border-emerald-400 object-cover shadow-xl"
                          />
                        ) : (
                          <div className="mb-4 flex h-28 w-28 items-center justify-center rounded-full border-4 border-emerald-400 bg-gradient-to-br from-emerald-500 to-teal-600 text-3xl font-black shadow-xl">
                            {getInitials(scanResult.agent.firstName, scanResult.agent.lastName)}
                          </div>
                        )}
                        <h2 className={`${nameDisplayClass} mb-2 font-black leading-tight`}>
                          {scanResult.agent.firstName} {scanResult.agent.lastName}
                        </h2>
                        <p className={`mb-1 font-semibold text-gray-300 ${subtitleDisplayClass}`}>
                          {scanResult.agent.poste}
                        </p>
                        <p className="mb-6 text-sm font-semibold text-gray-400 sm:text-base md:text-lg">
                          {scanResult.agent.matricule}
                        </p>

                        {renderAccessControls(scanResult.agent, scanResult.isOnSite)}

                        {/* Statut + Bouton action */}
                        <div className="mb-4 flex items-center gap-2">
                          <div
                            className={`h-3 w-3 rounded-full ${scanResult.isOnSite ? 'animate-pulse bg-emerald-400' : 'bg-gray-500'}`}
                          />
                          <span
                            className={`text-sm font-semibold ${scanResult.isOnSite ? 'text-emerald-400' : 'text-gray-400'}`}
                          >
                            {scanResult.isOnSite ? 'Actuellement sur site' : 'Hors site'}
                          </span>
                        </div>

                        {scanResult.isOnSite && scanResult.pointage ? (
                          <button
                            onClick={() => handleSortie(scanResult.pointage!)}
                            className={`w-full max-w-2xl rounded-2xl bg-gradient-to-r from-red-600 to-red-700 py-6 uppercase tracking-wider text-white shadow-lg shadow-red-900/40 transition-all hover:from-red-700 hover:to-red-800 active:scale-95 ${touchTargetClass} text-2xl font-black sm:text-3xl md:text-4xl`}
                          >
                            <div className="flex items-center justify-center gap-3">
                              <LogOut className="h-8 w-8" />
                              SORTIE
                            </div>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEntree(scanResult.agent)}
                            className={`w-full max-w-2xl rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-6 uppercase tracking-wider text-white shadow-lg shadow-emerald-900/40 transition-all hover:from-emerald-700 hover:to-emerald-800 active:scale-95 ${touchTargetClass} text-2xl font-black sm:text-3xl md:text-4xl`}
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
                Module de scan compact pour un pointage rapide, avec une zone recentree et detachee
                du fond pour un meilleur confort visuel sur poste fixe.
              </div>

              {/* Input caché pour QR scanner (les lecteurs de code-barre envoient du texte + Enter) */}
              <input
                ref={scanInputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleScanKeyDown}
                className="sr-only"
                aria-label="QR Code Scanner Input"
                autoFocus
              />

              {/* Simuler des scans pour la démo */}
              <div className="w-full max-w-lg">
                <p className="mb-3 text-center text-xs text-gray-600">
                  Simulation — Cliquer pour scanner un badge :
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {agents.slice(0, 8).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => handleScan(a.id)}
                      className="flex flex-col items-center gap-1 rounded-xl border border-white/5 bg-white/5 p-3 transition-all hover:bg-white/10 active:scale-95"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] text-xs font-bold">
                        {getInitials(a.firstName, a.lastName)}
                      </div>
                      <span className="w-full truncate text-center text-[10px] text-gray-400">
                        {a.firstName}
                      </span>
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
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
                        Employé sélectionné
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-white">
                        {scanResult.agent.firstName} {scanResult.agent.lastName}
                      </h2>
                      <p className="text-sm text-gray-300">
                        {scanResult.agent.poste} · {scanResult.agent.matricule}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setScanResult(null);
                        resetAccessOptions();
                      }}
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
                        className={`rounded-2xl bg-red-600 px-6 py-4 uppercase tracking-wider text-white shadow-lg shadow-red-900/30 transition-all hover:bg-red-700 ${touchTargetClass} text-lg font-black sm:text-xl md:text-2xl`}
                      >
                        Sortie
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEntree(scanResult.agent)}
                        className={`rounded-2xl bg-emerald-600 px-6 py-4 uppercase tracking-wider text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-700 ${touchTargetClass} text-lg font-black sm:text-xl md:text-2xl`}
                      >
                        Entrée
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Barre de recherche */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Rechercher un employé par nom ou matricule..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className={`w-full rounded-2xl border border-white/10 bg-white/5 py-5 pl-14 pr-4 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${touchTargetClass} text-lg sm:text-xl md:text-2xl`}
                  autoFocus
                />
                {manualSearch && (
                  <button
                    onClick={() => setManualSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 hover:bg-white/10"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                )}
              </div>

              {/* Liste des employés */}
              <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {filteredAgents.map((agent) => {
                  const todayPointage = pointageStore.getTodayPointage(agent.id);
                  const isOnSite = !!(
                    todayPointage &&
                    todayPointage.heureArrivee &&
                    !todayPointage.heureDepart
                  );
                  return (
                    <button
                      key={agent.id}
                      onClick={() => handleManualPointage(agent)}
                      className={`flex w-full items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 active:scale-[0.98] ${listRowClass}`}
                    >
                      {/* Avatar */}
                      {agent.photo ? (
                        <img
                          src={agent.photo}
                          alt=""
                          className="h-14 w-14 rounded-full border-2 border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] text-lg font-bold">
                          {getInitials(agent.firstName, agent.lastName)}
                        </div>
                      )}
                      {/* Info */}
                      <div className="flex-1 text-left">
                        <p className="text-base font-bold sm:text-lg md:text-xl">
                          {agent.firstName} {agent.lastName}
                        </p>
                        <p className="text-xs text-gray-400 sm:text-sm md:text-base">
                          {agent.poste} · {agent.matricule}
                        </p>
                      </div>
                      {/* Statut + Action */}
                      <div className="flex shrink-0 items-center gap-3">
                        <div
                          className={`h-3 w-3 rounded-full ${isOnSite ? 'animate-pulse bg-emerald-400' : 'bg-gray-600'}`}
                        />
                        <div
                          className={`rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wider sm:text-base md:text-lg ${
                            isOnSite
                              ? 'border border-red-500/30 bg-red-600/20 text-red-400'
                              : 'border border-emerald-500/30 bg-emerald-600/20 text-emerald-400'
                          }`}
                        >
                          {isOnSite ? 'Sortie' : 'Entrée'}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredAgents.length === 0 && (
                  <div className="py-16 text-center">
                    <Search className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                    <p className="text-gray-500">Aucun employé trouvé</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── MODE VISITEUR ─── */}
          {mode === 'visitor' && (
            <div className="mx-auto max-w-5xl space-y-5">
              <div
                className={`rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10 md:p-12 ${visitorCardSizeClass} flex flex-col`}
              >
                <div className="mb-8 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20">
                    <UserPlus className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black sm:text-4xl md:text-5xl">
                      Nouveau Visiteur
                    </h2>
                    <p className="text-base text-gray-300 sm:text-lg md:text-xl">
                      Enregistrement rapide
                    </p>
                  </div>
                </div>

                <div className="flex-1 space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <label className="mb-3 block text-xl font-black text-gray-100 sm:text-2xl md:text-3xl">
                        <User className="-mt-1 mr-2 inline h-5 w-5 sm:h-6 sm:w-6" />
                        Nom du visiteur *
                      </label>
                      <input
                        type="text"
                        value={visitorForm.nom}
                        onChange={(e) => setVisitorForm((f) => ({ ...f, nom: e.target.value }))}
                        placeholder="Nom complet"
                        className={`w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${touchTargetClass} text-xl font-semibold sm:text-2xl md:text-3xl`}
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="mb-3 block text-xl font-black text-gray-100 sm:text-2xl md:text-3xl">
                        <Building2 className="-mt-1 mr-2 inline h-5 w-5 sm:h-6 sm:w-6" />
                        Entreprise
                      </label>
                      <input
                        type="text"
                        value={visitorForm.societe}
                        onChange={(e) => setVisitorForm((f) => ({ ...f, societe: e.target.value }))}
                        placeholder="Nom de la société"
                        className={`w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${touchTargetClass} text-xl font-semibold sm:text-2xl md:text-3xl`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-xl font-black text-gray-100 sm:text-2xl md:text-3xl">
                      Motif de visite
                    </label>
                    <input
                      type="text"
                      value={visitorForm.motif}
                      onChange={(e) => setVisitorForm((f) => ({ ...f, motif: e.target.value }))}
                      placeholder="Objet de la visite"
                      className={`w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${touchTargetClass} text-xl font-semibold sm:text-2xl md:text-3xl`}
                    />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <label className="mb-3 block text-xl font-black text-gray-100 sm:text-2xl md:text-3xl">
                        Moyen de transport
                      </label>
                      <div className="relative">
                        <select
                          value={visitorForm.transportType}
                          onChange={(e) =>
                            setVisitorForm((f) => ({
                              ...f,
                              transportType: e.target.value as VisitorTransportType,
                              immatriculation: e.target.value === 'Pied' ? '' : f.immatriculation,
                            }))
                          }
                          className={`w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-5 py-5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${touchTargetClass} text-xl font-semibold sm:text-2xl md:text-3xl`}
                        >
                          <option value="" className="bg-white text-gray-900">
                            — Sélectionner —
                          </option>
                          {VISITOR_TRANSPORTS.map((transport) => (
                            <option
                              key={transport}
                              value={transport}
                              className="bg-white text-gray-900"
                            >
                              {transport}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-3 block text-xl font-black text-gray-100 sm:text-2xl md:text-3xl">
                        <Users className="-mt-1 mr-2 inline h-5 w-5 sm:h-6 sm:w-6" />
                        Employé à visiter
                      </label>
                      <div className="relative">
                        <select
                          value={visitorForm.employeVisiteId}
                          onChange={(e) =>
                            setVisitorForm((f) => ({ ...f, employeVisiteId: e.target.value }))
                          }
                          className={`w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-5 py-5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${touchTargetClass} text-xl font-semibold sm:text-2xl md:text-3xl`}
                        >
                          <option value="" className="bg-white text-gray-900">
                            — Sélectionner —
                          </option>
                          {agents.map((a) => (
                            <option key={a.id} value={a.id} className="bg-white text-gray-900">
                              {a.firstName} {a.lastName} — {a.poste}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {visitorForm.transportType && visitorForm.transportType !== 'Pied' && (
                    <div>
                      <label className="mb-3 block text-xl font-black text-amber-200 sm:text-2xl md:text-3xl">
                        Immatriculation *
                      </label>
                      <input
                        type="text"
                        value={visitorForm.immatriculation}
                        onChange={(e) =>
                          setVisitorForm((f) => ({
                            ...f,
                            immatriculation: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="DK-1234-AA"
                        className={`w-full rounded-2xl border-2 border-amber-400/60 bg-amber-500/10 px-6 py-6 text-white placeholder:text-amber-200/60 focus:outline-none focus:ring-2 focus:ring-amber-500/70 ${touchTargetClass} text-2xl font-black tracking-wide sm:text-3xl md:text-4xl`}
                      />
                    </div>
                  )}
                </div>

                {/* Bouton valider */}
                <button
                  onClick={handleAddVisiteur}
                  disabled={!visitorForm.nom.trim()}
                  className={`mt-8 w-full rounded-3xl bg-gradient-to-r from-emerald-500 to-green-600 py-6 uppercase tracking-wider text-white shadow-[0_24px_40px_rgba(16,185,129,0.35)] transition-all hover:from-emerald-600 hover:to-green-700 active:scale-95 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 ${touchTargetClass} text-2xl font-black sm:text-3xl md:text-4xl`}
                >
                  ENREGISTRER L'ENTRÉE
                </button>
              </div>

              {/* Visiteurs du jour */}
              {visiteurs.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-300">
                    Visiteurs aujourd'hui ({visiteurs.length})
                  </h3>
                  <div className="max-h-[30vh] space-y-2 overflow-y-auto">
                    {visiteurs.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between rounded-xl bg-white/5 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                            <User className="h-5 w-5 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{v.nom}</p>
                            <p className="text-xs text-gray-500">
                              {v.societe && `${v.societe} · `}
                              {v.motif && `${v.motif} · `}
                              {v.transportType &&
                                `${v.transportType}${v.immatriculation ? ` (${v.immatriculation})` : ''} · `}
                              {v.heureEntree}
                              {v.heureSortie ? ` → ${v.heureSortie}` : ''}
                            </p>
                          </div>
                        </div>
                        {v.surSite && (
                          <button
                            onClick={() => handleSortieVisiteur(v.id)}
                            className={`rounded-xl border border-red-500/30 bg-red-600/20 px-4 py-2.5 font-bold uppercase text-red-400 transition-all hover:bg-red-600/30 active:scale-95 ${touchTargetClass} text-xs sm:text-sm md:text-base`}
                          >
                            Sortie
                          </button>
                        )}
                        {!v.surSite && (
                          <span className="text-xs font-medium text-gray-500">Sorti(e)</span>
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
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                  <p className="text-3xl font-black tabular-nums text-emerald-400">
                    {employesSurSite.length}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-400">
                    Employés
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-center">
                  <p className="text-3xl font-black tabular-nums text-amber-400">
                    {visiteursSurSite.length}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-400">
                    Visiteurs
                  </p>
                </div>
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-center">
                  <p className="text-3xl font-black tabular-nums text-blue-400">{totalSurSite}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-400">
                    Total site
                  </p>
                </div>
              </div>

              {/* Employés sur site */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-400">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
                  Employés sur site ({employesSurSite.length})
                </h3>
                <div className="grid max-h-[40vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                  {employesSurSite.map((p) => {
                    const agent = agents.find((a) => a.id === p.employeId);
                    return (
                      <div key={p.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                        {agent?.photo ? (
                          <img
                            src={agent.photo}
                            alt=""
                            className="h-10 w-10 rounded-full border-2 border-emerald-500/30 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-xs font-bold">
                            {agent ? getInitials(agent.firstName, agent.lastName) : '??'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{p.employeNom}</p>
                          <p className="text-[10px] text-gray-500">
                            Entrée {p.heureArrivee}
                            {p.portal && (
                              <span className="ml-2 rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-bold text-blue-300">
                                {p.portal}
                              </span>
                            )}
                            {p.vehicleRegistration && (
                              <span className="ml-2 rounded-full bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300">
                                {p.vehicleRegistration}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {employesSurSite.length === 0 && (
                    <div className="col-span-full py-8 text-center">
                      <Users className="mx-auto mb-2 h-10 w-10 text-gray-600" />
                      <p className="text-sm text-gray-500">Aucun employé sur site</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Visiteurs sur site */}
              {visiteursSurSite.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-400">
                    <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" />
                    Visiteurs sur site ({visiteursSurSite.length})
                  </h3>
                  <div className="space-y-2">
                    {visiteursSurSite.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between rounded-xl bg-white/5 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                            <User className="h-5 w-5 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{v.nom}</p>
                            <p className="text-[10px] text-gray-500">
                              {v.societe} · Entrée {v.heureEntree}
                            </p>
                            {v.motif && <p className="text-[10px] text-gray-400">{v.motif}</p>}
                            {v.transportType && (
                              <p className="text-[10px] text-amber-300">
                                {v.transportType}{' '}
                                {v.immatriculation ? `· ${v.immatriculation}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleSortieVisiteur(v.id)}
                          className={`rounded-xl border border-red-500/30 bg-red-600/20 px-4 py-2.5 font-bold uppercase text-red-400 transition-all hover:bg-red-600/30 active:scale-95 ${touchTargetClass} text-xs sm:text-sm md:text-base`}
                        >
                          Sortie
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Journal du jour */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-300">
                  <Clock className="h-4 w-4" />
                  Journal des passages
                </h3>
                <div className="max-h-[30vh] space-y-1.5 overflow-y-auto">
                  {[...allTodayPointages].reverse().map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm ${listRowClass}`}
                    >
                      <div
                        className={`h-2 w-2 shrink-0 rounded-full ${!p.heureDepart ? 'bg-emerald-400' : 'bg-gray-500'}`}
                      />
                      <span className="w-12 text-xs tabular-nums text-gray-500 sm:w-16 sm:text-sm md:text-base">
                        {p.heureArrivee}
                      </span>
                      <span className="flex-1 truncate text-sm font-medium sm:text-base md:text-lg">
                        {p.employeNom}
                      </span>
                      <div className="flex items-center gap-2">
                        {p.portal && (
                          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 sm:text-xs">
                            {p.portal}
                          </span>
                        )}
                        {p.vehicleRegistration && (
                          <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300 sm:text-xs">
                            {p.vehicleRegistration}
                          </span>
                        )}
                        {p.retard && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 sm:text-xs">
                            +{p.retardMinutes}min
                          </span>
                        )}
                        {p.horsZone && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
                        {p.heureDepart ? (
                          <span className="text-xs tabular-nums text-gray-500 sm:text-sm">
                            → {p.heureDepart}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-500 sm:text-xs">
                            EN COURS
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {allTodayPointages.length === 0 && (
                    <p className="py-6 text-center text-sm text-gray-600">
                      Aucun passage enregistré aujourd'hui
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ═══════ MODAL — Personnes sur site ═══════ */}
      {showPeopleSurSite && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setShowPeopleSurSite(false)}
        >
          <div
            className="max-h-[85vh] w-full overflow-hidden rounded-t-3xl border border-white/10 bg-[#12122a] sm:max-w-xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                  <Users className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Personnes sur site</h2>
                  <p className="text-xs text-gray-400">
                    {totalSurSite} personnes · {currentTime.toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPeopleSurSite(false)}
                className="rounded-xl p-2 transition-all hover:bg-white/10"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="max-h-[65vh] space-y-4 overflow-y-auto p-4">
              {/* Employés */}
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Employés ({employesSurSite.length})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {employesSurSite.map((p) => {
                    const agent = agents.find((a) => a.id === p.employeId);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-2.5 rounded-xl bg-white/5 p-2.5"
                      >
                        {agent?.photo ? (
                          <img
                            src={agent.photo}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-xs font-bold">
                            {agent ? getInitials(agent.firstName, agent.lastName) : '??'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{p.employeNom}</p>
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
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    Visiteurs ({visiteursSurSite.length})
                  </h3>
                  <div className="space-y-2">
                    {visiteursSurSite.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center gap-2.5 rounded-xl bg-white/5 p-2.5"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                          <User className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{v.nom}</p>
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
      <footer className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-[#0a0a1a]/90 px-4 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20">
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
