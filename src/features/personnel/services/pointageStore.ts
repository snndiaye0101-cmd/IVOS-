/* ═══════ POINTAGE STORE — Check-in / Check-out GPS ═══════ */
import { supabase } from '@/shared/services/supabaseClient';

const KEY = 'ivos_pointage_v1';
const SITES_KEY = 'ivos_sites_v1';
const TERMINAL_CONFIG_KEY = 'ivos_pointage_terminal_config_v1';
const POINTAGE_QUEUE_KEY = 'ivos_pointage_queue_v1';
const EVT = 'pointage:updated';

export interface Pointage {
  id: number;
  employeId: string;
  employeNom: string;
  date: string;
  heureArrivee: string;
  heureDepart: string;
  latArrivee: number;
  lngArrivee: number;
  latDepart: number;
  lngDepart: number;
  shiftDebut: string;
  shiftFin: string;
  retard: boolean;
  retardMinutes: number;
  horsZone: boolean;
  distanceArrivee: number;
  isNuit: boolean;
  isFerie: boolean;
  isWeekend: boolean;
  portal?: string;
  portalId?: string;
  terminalId?: string;
  terminalName?: string;
  withVehicle: boolean;
  vehicleMode?: 'fleet' | 'other';
  vehicleId?: string;
  vehicleRegistration?: string;
  vehicleLabel?: string;
}

export interface TerminalConfig {
  terminalId: string;
  terminalName: string;
  updatedAt: string;
}

export type PointageActionType = 'checkin' | 'checkout';

export interface OfflinePointageAction {
  id: string;
  type: PointageActionType;
  payload: any;
  status: 'pending' | 'flushed';
  terminalId?: string;
  terminalName?: string;
  createdAt: string;
}

export interface PointageVehicleInfo {
  mode: 'fleet' | 'other';
  vehicleId?: string;
  registration: string;
  label: string;
}

export interface SiteAssigne {
  id: number;
  nom: string;
  lat: number;
  lng: number;
  rayon: number;
}

const DEFAULT_SITES: SiteAssigne[] = [
  { id: 1, nom: 'Dépôt Kignabour', lat: 14.7645, lng: -17.366, rayon: 200 },
  { id: 2, nom: 'Base Diamniadio', lat: 14.75, lng: -17.1833, rayon: 200 },
  { id: 3, nom: 'Garage Parcelles', lat: 14.763, lng: -17.421, rayon: 300 },
];

function mapPortalToId(portal?: string): string | undefined {
  if (portal === 'Portail 1') return 'PORTAL_1';
  if (portal === 'Portail 2') return 'PORTAL_2';
  return undefined;
}

const broadcastChannel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ivos-pointage-sync') : null;

function broadcastUpdate() {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: EVT });
  }
}

function emit() {
  window.dispatchEvent(new Event(EVT));
  broadcastUpdate();
}

function loadTerminalConfig(): TerminalConfig {
  const raw = localStorage.getItem(TERMINAL_CONFIG_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as TerminalConfig;
    } catch {
      // ignore invalid config and reset below
    }
  }
  const defaultConfig: TerminalConfig = {
    terminalId: 'TERMINAL_1',
    terminalName: 'Borne 1',
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(TERMINAL_CONFIG_KEY, JSON.stringify(defaultConfig));
  return defaultConfig;
}

function saveTerminalConfig(config: TerminalConfig) {
  localStorage.setItem(
    TERMINAL_CONFIG_KEY,
    JSON.stringify({ ...config, updatedAt: new Date().toISOString() })
  );
}

function loadOfflineQueue(): OfflinePointageAction[] {
  const raw = localStorage.getItem(POINTAGE_QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OfflinePointageAction[];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: OfflinePointageAction[]) {
  localStorage.setItem(POINTAGE_QUEUE_KEY, JSON.stringify(queue));
}

function enqueueOfflineAction(action: Omit<OfflinePointageAction, 'createdAt' | 'status' | 'id'>) {
  const queue = loadOfflineQueue();
  const entry: OfflinePointageAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  queue.push(entry);
  saveOfflineQueue(queue);
  emit();
}

function convertPointageToSupabaseRow(pointage: Pointage) {
  return {
    id: pointage.id,
    employe_id: pointage.employeId,
    employe_nom: pointage.employeNom,
    date: pointage.date,
    heure_arrivee: pointage.heureArrivee,
    heure_depart: pointage.heureDepart || null,
    lat_arrivee: pointage.latArrivee,
    lng_arrivee: pointage.lngArrivee,
    lat_depart: pointage.latDepart,
    lng_depart: pointage.lngDepart,
    shift_debut: pointage.shiftDebut,
    shift_fin: pointage.shiftFin,
    retard: pointage.retard,
    retard_minutes: pointage.retardMinutes,
    hors_zone: pointage.horsZone,
    distance_arrivee: pointage.distanceArrivee,
    is_nuit: pointage.isNuit,
    is_ferie: pointage.isFerie,
    is_weekend: pointage.isWeekend,
    portal: pointage.portal,
    portal_id: pointage.portalId,
    terminal_id: pointage.terminalId,
    terminal_name: pointage.terminalName,
    with_vehicle: pointage.withVehicle,
    vehicle_mode: pointage.vehicleMode,
    vehicle_id: pointage.vehicleId,
    vehicle_registration: pointage.vehicleRegistration,
    vehicle_label: pointage.vehicleLabel,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function syncOfflineAction(action: OfflinePointageAction): Promise<boolean> {
  if (!navigator.onLine || !supabase) return false;

  try {
    if (action.type === 'checkin') {
      const pointage = action.payload as Pointage;
      const { error } = await supabase
        .from('fiches_pointage')
        .insert([convertPointageToSupabaseRow(pointage)]);
      return !error;
    }

    if (action.type === 'checkout') {
      const payload = action.payload as { pointageId: number; lat: number; lng: number; portal?: string | { id?: string; name?: string } };
      const pointage = loadPointages().find((p) => p.id === payload.pointageId);
      if (!pointage) return false;

      const updatePayload = {
        heure_depart: pointage.heureDepart || null,
        lat_depart: pointage.latDepart,
        lng_depart: pointage.lngDepart,
        portal: pointage.portal,
        portal_id: pointage.portalId,
        terminal_id: pointage.terminalId,
        terminal_name: pointage.terminalName,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('fiches_pointage')
        .update(updatePayload)
        .eq('id', pointage.id);

      if (!error) return true;

      const { error: insertError } = await supabase
        .from('fiches_pointage')
        .insert([convertPointageToSupabaseRow(pointage)]);
      return !insertError;
    }

    return false;
  } catch {
    return false;
  }
}

export async function syncOfflineQueueWithSupabase(): Promise<OfflinePointageAction[]> {
  const queue = loadOfflineQueue();
  if (!navigator.onLine || !supabase) return queue;

  let changed = false;
  const nextQueue = await Promise.all(
    queue.map(async (action) => {
      if (action.status !== 'pending') return action;
      const synced = await syncOfflineAction(action);
      if (!synced) return action;
      changed = true;
      return { ...action, status: 'flushed' as const };
    })
  );

  if (changed) {
    saveOfflineQueue(nextQueue);
    emit();
  }

  return nextQueue;
}

function flushOfflineQueue() {
  const queue = loadOfflineQueue();
  if (!navigator.onLine) return queue;
  const flushedQueue = queue.map((action) => ({ ...action, status: 'flushed' as const }));
  saveOfflineQueue(flushedQueue);
  emit();
  return flushedQueue;
}

/* ═══════ SITES ═══════ */
function loadSites(): SiteAssigne[] {
  const raw = localStorage.getItem(SITES_KEY);
  if (!raw) {
    localStorage.setItem(SITES_KEY, JSON.stringify(DEFAULT_SITES));
    return DEFAULT_SITES;
  }
  return JSON.parse(raw);
}

function saveSites(data: SiteAssigne[]) {
  localStorage.setItem(SITES_KEY, JSON.stringify(data));
  emit();
}

function addSite(item: Omit<SiteAssigne, 'id'>) {
  const all = loadSites();
  const id = all.length ? Math.max(...all.map((s) => s.id)) + 1 : 1;
  all.push({ ...item, id });
  saveSites(all);
}

function removeSite(id: number) {
  saveSites(loadSites().filter((s) => s.id !== id));
}

/* ═══════ POINTAGES ═══════ */
function loadPointages(): Pointage[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return seedPointages();
  return JSON.parse(raw);
}

function savePointages(data: Pointage[]) {
  localStorage.setItem(KEY, JSON.stringify(data));
  emit();
}

function seedPointages(): Pointage[] {
  const today = new Date().toISOString().slice(0, 10);
  const seed: Pointage[] = [
    {
      id: 1,
      employeId: 'ag1',
      employeNom: 'Mamadou Diallo',
      date: today,
      heureArrivee: '07:55',
      heureDepart: '',
      latArrivee: 14.7646,
      lngArrivee: -17.3661,
      latDepart: 0,
      lngDepart: 0,
      shiftDebut: '08:00',
      shiftFin: '17:00',
      retard: false,
      retardMinutes: 0,
      horsZone: false,
      distanceArrivee: 12,
      isNuit: false,
      isFerie: false,
      isWeekend: false,
      withVehicle: true,
      vehicleMode: 'fleet',
      vehicleId: 'fleet-ag1',
      vehicleRegistration: 'DK-1234-AA',
      vehicleLabel: 'DK-1234-AA',
    },
    {
      id: 2,
      employeId: 'ag2',
      employeNom: 'Fatou Sow',
      date: today,
      heureArrivee: '08:22',
      heureDepart: '',
      latArrivee: 14.7648,
      lngArrivee: -17.3658,
      latDepart: 0,
      lngDepart: 0,
      shiftDebut: '08:00',
      shiftFin: '17:00',
      retard: true,
      retardMinutes: 22,
      horsZone: false,
      distanceArrivee: 35,
      isNuit: false,
      isFerie: false,
      isWeekend: false,
      withVehicle: false,
    },
    {
      id: 3,
      employeId: 'ag5',
      employeNom: 'Ibrahima Fall',
      date: today,
      heureArrivee: '07:48',
      heureDepart: '17:05',
      latArrivee: 14.7644,
      lngArrivee: -17.3662,
      latDepart: 14.7645,
      lngDepart: -17.366,
      shiftDebut: '08:00',
      shiftFin: '17:00',
      retard: false,
      retardMinutes: 0,
      horsZone: false,
      distanceArrivee: 22,
      isNuit: false,
      isFerie: false,
      isWeekend: false,
      withVehicle: false,
    },
    {
      id: 4,
      employeId: 'ag6',
      employeNom: 'Moussa Sarr',
      date: today,
      heureArrivee: '22:05',
      heureDepart: '',
      latArrivee: 14.764,
      lngArrivee: -17.3655,
      latDepart: 0,
      lngDepart: 0,
      shiftDebut: '22:00',
      shiftFin: '06:00',
      retard: false,
      retardMinutes: 5,
      horsZone: false,
      distanceArrivee: 58,
      isNuit: true,
      isFerie: false,
      isWeekend: false,
      portal: 'Portail 1',
      portalId: 'PORTAL_1',
      withVehicle: false,
    },
    {
      id: 5,
      employeId: 'ag8',
      employeNom: 'Abdoulaye Mbaye',
      date: today,
      heureArrivee: '08:45',
      heureDepart: '',
      latArrivee: 14.8,
      lngArrivee: -17.45,
      latDepart: 0,
      lngDepart: 0,
      shiftDebut: '08:00',
      shiftFin: '17:00',
      retard: true,
      retardMinutes: 45,
      horsZone: true,
      distanceArrivee: 4250,
      isNuit: false,
      isFerie: false,
      isWeekend: false,
      withVehicle: true,
      vehicleMode: 'other',
      vehicleRegistration: 'AA-4567-BB',
      vehicleLabel: 'AA-4567-BB',
    },
  ];
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
}

/* ═══════ DISTANCE (Haversine) ═══════ */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function checkZone(
  lat: number,
  lng: number
): { horsZone: boolean; distance: number; site: string } {
  const sites = loadSites();
  let minDist = Infinity;
  let nearestSite = '';
  for (const s of sites) {
    const d = haversineDistance(lat, lng, s.lat, s.lng);
    if (d < minDist) {
      minDist = d;
      nearestSite = s.nom;
    }
  }
  return {
    horsZone: minDist > (sites[0]?.rayon || 200),
    distance: Math.round(minDist),
    site: nearestSite,
  };
}

/* ═══════ RETARD ═══════ */
function checkRetard(
  heurePointage: string,
  shiftDebut: string
): { retard: boolean; minutes: number } {
  if (!heurePointage || !shiftDebut) return { retard: false, minutes: 0 };
  const [hp, mp] = heurePointage.split(':').map(Number);
  const [hs, ms] = shiftDebut.split(':').map(Number);
  const diffMin = hp * 60 + mp - (hs * 60 + ms);
  return { retard: diffMin > 15, minutes: Math.max(0, diffMin) };
}

/* ═══════ CHECKIN / CHECKOUT ═══════ */
function checkIn(
  employeId: string,
  employeNom: string,
  lat: number,
  lng: number,
  shiftDebut: string,
  shiftFin: string,
  isNuit: boolean,
  isFerie: boolean,
  isWeekend: boolean,
  options?: {
    portal?: string | { id?: string; name?: string };
    portalId?: string;
    vehicle?: PointageVehicleInfo;
    terminalConfig?: TerminalConfig;
  }
): Pointage {
  const all = loadPointages();
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const heure = now.toTimeString().slice(0, 5);
  const zone = checkZone(lat, lng);
  const ret = checkRetard(heure, shiftDebut);
  const id = all.length ? Math.max(...all.map((p) => p.id)) + 1 : 1;
  const entry: Pointage = {
    id,
    employeId,
    employeNom,
    date,
    heureArrivee: heure,
    heureDepart: '',
    latArrivee: lat,
    lngArrivee: lng,
    latDepart: 0,
    lngDepart: 0,
    shiftDebut,
    shiftFin,
    retard: ret.retard,
    retardMinutes: ret.minutes,
    horsZone: zone.horsZone,
    distanceArrivee: zone.distance,
    isNuit,
    isFerie,
    isWeekend,
    portal: typeof options?.portal === 'string' ? options?.portal : options?.portal?.name,
    portalId:
      options?.portalId || (typeof options?.portal === 'string' ? mapPortalToId(options?.portal) : options?.portal?.id),
    terminalId: options?.terminalConfig?.terminalId,
    terminalName: options?.terminalConfig?.terminalName,
    withVehicle: Boolean(options?.vehicle),
    vehicleMode: options?.vehicle?.mode,
    vehicleId: options?.vehicle?.vehicleId,
    vehicleRegistration: options?.vehicle?.registration,
    vehicleLabel: options?.vehicle?.label,
  };
  all.push(entry);
  savePointages(all);
  enqueueOfflineAction({
    type: 'checkin',
    payload: entry,
    terminalId: options?.terminalConfig?.terminalId,
    terminalName: options?.terminalConfig?.terminalName,
  });
  return entry;
}

function checkOut(
  pointageId: number,
  lat: number,
  lng: number,
  options?: { portal?: string | { id?: string; name?: string }; portalId?: string; terminalConfig?: TerminalConfig }
): void {
  const all = loadPointages();
  const i = all.findIndex((p) => p.id === pointageId);
  if (i >= 0) {
    const now = new Date();
    all[i].heureDepart = now.toTimeString().slice(0, 5);
    all[i].latDepart = lat;
    all[i].lngDepart = lng;
    if (options?.portal || options?.portalId) {
      all[i].portal = typeof options.portal === 'string' ? options.portal : options.portal?.name || all[i].portal;
      all[i].portalId = options.portalId || (typeof options.portal === 'string' ? mapPortalToId(options.portal) : options.portal?.id) || all[i].portalId;
    }
    all[i].terminalId = options?.terminalConfig?.terminalId;
    all[i].terminalName = options?.terminalConfig?.terminalName;
    savePointages(all);
    enqueueOfflineAction({
      type: 'checkout',
      payload: { pointageId, lat, lng, portal: options?.portal },
      terminalId: options?.terminalConfig?.terminalId,
      terminalName: options?.terminalConfig?.terminalName,
    });
  }
}

function getTodayPointage(employeId: string): Pointage | undefined {
  const today = new Date().toISOString().slice(0, 10);
  return loadPointages().find((p) => p.employeId === employeId && p.date === today);
}

function getPresentsToday(): Pointage[] {
  const today = new Date().toISOString().slice(0, 10);
  return loadPointages().filter((p) => p.date === today && p.heureArrivee);
}

function getAlertesHorsZone(): Pointage[] {
  const today = new Date().toISOString().slice(0, 10);
  return loadPointages().filter((p) => p.date === today && p.horsZone);
}

function getAlertesRetard(): Pointage[] {
  const today = new Date().toISOString().slice(0, 10);
  return loadPointages().filter((p) => p.date === today && p.retard);
}

/* ═══════ MAJORATIONS PAIE ═══════ */
function calcMajorationFerie(salaireBase: number, heuresTravaillees: number): number {
  const tauxHoraire = salaireBase / 173.33;
  return Math.round(heuresTravaillees * tauxHoraire * 1.0);
}

function calcMajorationWeekend(salaireBase: number, heuresTravaillees: number): number {
  const tauxHoraire = salaireBase / 173.33;
  return Math.round(heuresTravaillees * tauxHoraire * 0.4);
}

export const pointageStore = {
  loadPointages,
  savePointages,
  loadSites,
  saveSites,
  addSite,
  removeSite,
  checkIn,
  checkOut,
  getTodayPointage,
  getPresentsToday,
  getAlertesHorsZone,
  getAlertesRetard,
  loadTerminalConfig,
  saveTerminalConfig,
  loadOfflineQueue,
  saveOfflineQueue,
  flushOfflineQueue,
  haversineDistance,
  checkZone,
  checkRetard,
  calcMajorationFerie,
  calcMajorationWeekend,
};
