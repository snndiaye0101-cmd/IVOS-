import { personnelStore, type PersonnelAgent } from '../../fleet/services/personnelStore';
import { pointageStore } from './pointageStore';
import { loadBaseConfig } from '../../settings/services/baseConfigStore';
import { congesStore } from './congesStore';

const KEY = 'ivos_heures_gestion_v1';
const EVT = 'heures:updated';

export interface WorkHoursRow {
  employeeId: string;
  employeeName: string;
  employeeMatricule: string;
  month: string;
  baseSalary: number;
  shiftReference: string;
  shiftStart: string;
  shiftEnd: string;
  workedHours: number;
  scheduledHours: number;
  overtimeHours: number;
  hs15Hours: number;
  hs40Hours: number;
  hs60Hours: number;
  nightsCount: number;
  nightHours: number;
  applyHS: boolean;
  applyNight: boolean;
  updatedAt: string;
}

type StoredData = Record<string, {
  hs15Hours: number;
  hs40Hours: number;
  hs60Hours: number;
  applyHS: boolean;
  updatedAt: string;
}>;

type ManualWorkHoursOverride = StoredData[string];

function emit() {
  window.dispatchEvent(new Event(EVT));
}

function getRowKey(employeeId: string, month: string) {
  return `${employeeId}|${month}`;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function parseTimeToMinutes(time: string): number {
  if (!time || !time.includes(':')) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h * 60 + m) % (24 * 60);
}

function diffMinutes(start: string, end: string): number {
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  if (endMin < startMin) return (24 * 60 - startMin) + endMin;
  return endMin - startMin;
}

function getShiftMinutes(shiftStart: string, shiftEnd: string): number {
  const minutes = diffMinutes(shiftStart, shiftEnd);
  return Math.max(0, minutes);
}

function getNightOverlapMinutes(start: string, end: string): number {
  const startMin = parseTimeToMinutes(start);
  const rawEnd = parseTimeToMinutes(end);
  const endMin = rawEnd < startMin ? rawEnd + 24 * 60 : rawEnd;

  const intervals: Array<[number, number]> = [
    [22 * 60, 24 * 60],
    [24 * 60, 30 * 60],
  ];

  let overlap = 0;
  for (const [nStart, nEnd] of intervals) {
    const left = Math.max(startMin, nStart);
    const right = Math.min(endMin, nEnd);
    if (right > left) overlap += right - left;
  }

  return Math.max(0, overlap);
}

function loadStoredData(): StoredData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredData;
  } catch {
    return {};
  }
}

function saveStoredData(data: StoredData) {
  localStorage.setItem(KEY, JSON.stringify(data));
  emit();
}

function buildAutoRows(month: string, agents: PersonnelAgent[]): WorkHoursRow[] {
  const config = loadBaseConfig();
  const shifts = config.shifts || [];
  const pointages = pointageStore
    .loadPointages()
    .filter((p) => p.date.startsWith(month) && !!p.heureArrivee && !!p.heureDepart);

  return agents.map((agent) => {
    const entries = pointages.filter((p) => p.employeId === agent.id);

    let workedMinutes = 0;
    let scheduledMinutes = 0;
    let overtimeMinutes = 0;
    let hs15Minutes = 0;
    let hs40Minutes = 0;
    let hs60Minutes = 0;
    let nightMinutesFromPointage = 0;
    let nightsCountFromPointage = 0;

    const shiftCounter: Record<string, number> = {};

    for (const entry of entries) {
      const worked = Math.max(0, diffMinutes(entry.heureArrivee, entry.heureDepart));
      workedMinutes += worked;

      const matchedShift = shifts.find((s) => s.start === entry.shiftDebut && s.end === entry.shiftFin);
      const shiftLabel = matchedShift ? matchedShift.name : `${entry.shiftDebut} - ${entry.shiftFin}`;
      shiftCounter[shiftLabel] = (shiftCounter[shiftLabel] || 0) + 1;

      const scheduled = getShiftMinutes(entry.shiftDebut, entry.shiftFin);
      scheduledMinutes += scheduled;

      const overtime = Math.max(0, worked - scheduled);
      overtimeMinutes += overtime;

      const isSunday = new Date(entry.date).getDay() === 0;
      const isHoliday = congesStore.isFerie(entry.date);
      const isHs60 = isSunday || isHoliday || entry.isFerie;

      if (isHs60) {
        hs60Minutes += overtime;
      } else {
        hs15Minutes += Math.min(overtime, 8 * 60);
        hs40Minutes += Math.max(0, overtime - 8 * 60);
      }

      const nightOverlap = getNightOverlapMinutes(entry.heureArrivee, entry.heureDepart);
      if (nightOverlap > 0 || entry.isNuit) {
        nightsCountFromPointage += 1;
      }
      nightMinutesFromPointage += nightOverlap;
    }

    const shiftReference = Object.entries(shiftCounter)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const shiftStart = agent.shiftNuitDebut || '22:00';
    const shiftEnd = agent.shiftNuitFin || '06:00';
    const nightsCount = agent.shiftNuit
      ? Math.max(0, Math.floor(agent.nombreNuits || 0))
      : nightsCountFromPointage;
    const nightHours = nightsCount > 0
      ? round2(nightsCount * congesStore.calcHeuresNuit(shiftStart, shiftEnd))
      : round2(nightMinutesFromPointage / 60);

    return {
      employeeId: agent.id,
      employeeName: `${agent.firstName} ${agent.lastName}`,
      employeeMatricule: agent.matricule,
      month,
      baseSalary: Number(agent.salaireBase || 0),
      shiftReference,
      shiftStart,
      shiftEnd,
      workedHours: round2(workedMinutes / 60),
      scheduledHours: round2(scheduledMinutes / 60),
      overtimeHours: round2(overtimeMinutes / 60),
      hs15Hours: round2(hs15Minutes / 60),
      hs40Hours: round2(hs40Minutes / 60),
      hs60Hours: round2(hs60Minutes / 60),
      nightsCount,
      nightHours,
      applyHS: true,
      applyNight: agent.appliquerMajorationNuit ?? true,
      updatedAt: new Date().toISOString(),
    };
  });
}

function mergeAutoWithManual(autoRow: WorkHoursRow, manual?: ManualWorkHoursOverride): WorkHoursRow {
  if (!manual) return autoRow;
  return {
    ...autoRow,
    hs15Hours: manual.hs15Hours,
    hs40Hours: manual.hs40Hours,
    hs60Hours: manual.hs60Hours,
    applyHS: manual.applyHS,
    updatedAt: manual.updatedAt || autoRow.updatedAt,
  };
}

function loadRows(month = currentMonth()): WorkHoursRow[] {
  const agents = personnelStore.load();
  const autoRows = buildAutoRows(month, agents);
  const stored = loadStoredData();
  return autoRows.map((row) => mergeAutoWithManual(row, stored[getRowKey(row.employeeId, month)]));
}

function getRow(employeeId: string, month = currentMonth()): WorkHoursRow | null {
  const rows = loadRows(month);
  return rows.find((r) => r.employeeId === employeeId) || null;
}

function updateRow(employeeId: string, month: string, patch: Partial<WorkHoursRow>) {
  const base = getRow(employeeId, month);
  if (!base) return;

  const nextHs15 = Math.max(0, Number((patch.hs15Hours ?? base.hs15Hours) || 0));
  const nextHs40 = Math.max(0, Number((patch.hs40Hours ?? base.hs40Hours) || 0));
  const nextHs60 = Math.max(0, Number((patch.hs60Hours ?? base.hs60Hours) || 0));
  const nextApplyHS = patch.applyHS ?? base.applyHS;
  const stored = loadStoredData();
  stored[getRowKey(employeeId, month)] = {
    hs15Hours: nextHs15,
    hs40Hours: nextHs40,
    hs60Hours: nextHs60,
    applyHS: nextApplyHS,
    updatedAt: new Date().toISOString(),
  };
  saveStoredData(stored);

  if (patch.nightsCount !== undefined || patch.shiftStart !== undefined || patch.shiftEnd !== undefined || patch.applyNight !== undefined) {
    const nextNights = Math.max(0, Math.floor(Number((patch.nightsCount ?? base.nightsCount) || 0)));
    const nextShiftStart = (patch.shiftStart ?? base.shiftStart) || '';
    const nextShiftEnd = (patch.shiftEnd ?? base.shiftEnd) || '';
    const nextApplyNight = patch.applyNight ?? base.applyNight;
    personnelStore.update(employeeId, {
      shiftNuit: nextNights > 0 || (!!nextShiftStart && !!nextShiftEnd),
      shiftNuitDebut: nextShiftStart,
      shiftNuitFin: nextShiftEnd,
      nombreNuits: nextNights,
      appliquerMajorationNuit: nextApplyNight,
    });
  }
}

function resetRow(employeeId: string, month: string) {
  const stored = loadStoredData();
  delete stored[getRowKey(employeeId, month)];
  saveStoredData(stored);
}

export const heuresStore = {
  eventName: EVT,
  currentMonth,
  loadRows,
  getRow,
  updateRow,
  resetRow,
};
