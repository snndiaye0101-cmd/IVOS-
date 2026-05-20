const KEY = 'ivos_conges_v1';
const EVT = 'conges:updated';
const HOLIDAYS_KEY = 'ivos_feries_v1';
const WEEKENDS_KEY = 'ivos_weekends_v1';

export type TypeAbsence =
  | 'Congé annuel'
  | 'Permission'
  | 'Maladie'
  | 'Récupération'
  | 'Absence injustifiée';
export type StatutValidation = 'En attente' | 'Validé par direction' | 'Refusé';
export type EtatPresence =
  | 'En service'
  | 'En repos'
  | 'En congé'
  | 'Absence injustifiée'
  | 'Maladie'
  | 'Férié'
  | 'Nuit';

export interface JourFerie {
  id: number;
  nom: string;
  date: string;
  recurrent: boolean;
}

export interface WeekendConfig {
  jours: number[];
}

export interface Conge {
  id: number;
  employeId: string;
  employeNom: string;
  typeAbsence: TypeAbsence;
  dateDebut: string;
  dateFin: string;
  nbJours: number;
  statut: StatutValidation;
  remplacantId: string;
  remplacantNom: string;
  motif: string;
  annee: string;
}

export interface PlanningEntry {
  employeId: string;
  date: string;
  etat: EtatPresence;
}

const CONGE_ANNUEL_TOTAL = 24;

function emit() {
  window.dispatchEvent(new Event(EVT));
}

function diffDays(d1: string, d2: string): number {
  const a = new Date(d1);
  const b = new Date(d2);
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

const SEED_CONGES: Omit<Conge, 'id'>[] = [
  {
    employeId: 'ag4',
    employeNom: 'Aïssatou Ba',
    typeAbsence: 'Congé annuel',
    dateDebut: '2026-04-10',
    dateFin: '2026-04-24',
    nbJours: 15,
    statut: 'Validé par direction',
    remplacantId: 'ag1',
    remplacantNom: 'Mamadou Diallo',
    motif: 'Congé annuel',
    annee: '2026',
  },
  {
    employeId: 'ag3',
    employeNom: 'Ousmane Ndiaye',
    typeAbsence: 'Permission',
    dateDebut: '2026-04-14',
    dateFin: '2026-04-16',
    nbJours: 3,
    statut: 'Validé par direction',
    remplacantId: '',
    remplacantNom: '',
    motif: 'Événement familial',
    annee: '2026',
  },
  {
    employeId: 'ag7',
    employeNom: 'Khady Diop',
    typeAbsence: 'Maladie',
    dateDebut: '2026-04-12',
    dateFin: '2026-04-14',
    nbJours: 3,
    statut: 'Validé par direction',
    remplacantId: '',
    remplacantNom: '',
    motif: 'Certificat médical',
    annee: '2026',
  },
  {
    employeId: 'ag6',
    employeNom: 'Moussa Sarr',
    typeAbsence: 'Absence injustifiée',
    dateDebut: '2026-04-13',
    dateFin: '2026-04-13',
    nbJours: 1,
    statut: 'En attente',
    remplacantId: '',
    remplacantNom: '',
    motif: '',
    annee: '2026',
  },
];

const SEED_PLANNING: PlanningEntry[] = [];

function loadConges(): Conge[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    const seeded = SEED_CONGES.map((s, i) => ({ ...s, id: i + 1 }));
    localStorage.setItem(KEY, JSON.stringify(seeded));
    return seeded;
  }
  return JSON.parse(raw);
}

function saveConges(data: Conge[]) {
  localStorage.setItem(KEY, JSON.stringify(data));
  emit();
}

function addConge(item: Omit<Conge, 'id'>) {
  const all = loadConges();
  const id = all.length ? Math.max(...all.map((c) => c.id)) + 1 : 1;
  all.push({ ...item, id });
  saveConges(all);
}

function updateConge(id: number, patch: Partial<Conge>) {
  const all = loadConges();
  const i = all.findIndex((c) => c.id === id);
  if (i >= 0) {
    all[i] = { ...all[i], ...patch };
    saveConges(all);
  }
}

function removeConge(id: number) {
  saveConges(loadConges().filter((c) => c.id !== id));
}

const PLANNING_KEY = 'ivos_planning_v1';

function loadPlanning(): PlanningEntry[] {
  const raw = localStorage.getItem(PLANNING_KEY);
  if (!raw) return SEED_PLANNING;
  return JSON.parse(raw);
}

function savePlanning(data: PlanningEntry[]) {
  localStorage.setItem(PLANNING_KEY, JSON.stringify(data));
  emit();
}

function setPresence(employeId: string, date: string, etat: EtatPresence) {
  const all = loadPlanning();
  const i = all.findIndex((p) => p.employeId === employeId && p.date === date);
  if (i >= 0) {
    all[i].etat = etat;
  } else {
    all.push({ employeId, date, etat });
  }
  savePlanning(all);
}

/* ═══════ JOURS FÉRIÉS ═══════ */
const DEFAULT_FERIES: JourFerie[] = [
  { id: 1, nom: "Jour de l'An", date: '2026-01-01', recurrent: true },
  { id: 2, nom: "Fête de l'Indépendance", date: '2026-04-04', recurrent: true },
  { id: 3, nom: 'Fête du Travail', date: '2026-05-01', recurrent: true },
  { id: 4, nom: 'Korité (Eid al-Fitr)', date: '2026-03-20', recurrent: false },
  { id: 5, nom: 'Tabaski (Eid al-Adha)', date: '2026-05-27', recurrent: false },
  { id: 6, nom: 'Maouloud', date: '2026-09-05', recurrent: false },
  { id: 7, nom: 'Noël', date: '2026-12-25', recurrent: true },
  { id: 8, nom: 'Assomption', date: '2026-08-15', recurrent: true },
  { id: 9, nom: 'Toussaint', date: '2026-11-01', recurrent: true },
];

function loadFeries(): JourFerie[] {
  const raw = localStorage.getItem(HOLIDAYS_KEY);
  if (!raw) {
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(DEFAULT_FERIES));
    return DEFAULT_FERIES;
  }
  return JSON.parse(raw);
}

function saveFeries(data: JourFerie[]) {
  localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(data));
  emit();
}

function addFerie(item: Omit<JourFerie, 'id'>) {
  const all = loadFeries();
  const id = all.length ? Math.max(...all.map((f) => f.id)) + 1 : 1;
  all.push({ ...item, id });
  saveFeries(all);
}

function removeFerie(id: number) {
  saveFeries(loadFeries().filter((f) => f.id !== id));
}

function isFerie(date: string): boolean {
  const feries = loadFeries();
  const d = date.slice(5);
  return feries.some((f) => f.date === date || (f.recurrent && f.date.slice(5) === d));
}

/* ═══════ WEEKENDS ═══════ */
const DEFAULT_WEEKENDS: WeekendConfig = { jours: [0, 6] };

function loadWeekends(): WeekendConfig {
  const raw = localStorage.getItem(WEEKENDS_KEY);
  if (!raw) {
    localStorage.setItem(WEEKENDS_KEY, JSON.stringify(DEFAULT_WEEKENDS));
    return DEFAULT_WEEKENDS;
  }
  return JSON.parse(raw);
}

function saveWeekends(config: WeekendConfig) {
  localStorage.setItem(WEEKENDS_KEY, JSON.stringify(config));
  emit();
}

function isWeekend(date: string): boolean {
  const d = new Date(date);
  const cfg = loadWeekends();
  return cfg.jours.includes(d.getDay());
}

/* ═══════ GET PRESENCE (enhanced) ═══════ */
function getPresence(employeId: string, date: string, conges: Conge[]): EtatPresence {
  const manual = loadPlanning().find((p) => p.employeId === employeId && p.date === date);
  if (manual) return manual.etat;
  if (isFerie(date)) return 'Férié';
  if (isWeekend(date)) return 'En repos';
  const activeConge = conges.find(
    (c) =>
      c.employeId === employeId && c.statut !== 'Refusé' && date >= c.dateDebut && date <= c.dateFin
  );
  if (activeConge) {
    if (activeConge.typeAbsence === 'Absence injustifiée') return 'Absence injustifiée';
    if (activeConge.typeAbsence === 'Maladie') return 'Maladie';
    return 'En congé';
  }
  return 'En service';
}

/* ═══════ HEURES DE NUIT ═══════ */
function calcHeuresNuit(debut: string, fin: string): number {
  if (!debut || !fin) return 0;
  const [hd, md] = debut.split(':').map(Number);
  const [hf, mf] = fin.split(':').map(Number);
  let totalMin = 0;
  if (hf <= hd) {
    totalMin = (24 - hd) * 60 - md + hf * 60 + mf;
  } else {
    totalMin = (hf - hd) * 60 + (mf - md);
  }
  return Math.round((totalMin / 60) * 100) / 100;
}

function calcMajorationNuit(heures: number, salaireBase: number): number {
  const tauxHoraire = salaireBase / 173.33;
  return Math.round(heures * tauxHoraire * 0.35);
}

function getSoldeConges(employeId: string, annee: string, conges: Conge[]): number {
  const used = conges
    .filter(
      (c) =>
        c.employeId === employeId &&
        c.annee === annee &&
        c.statut !== 'Refusé' &&
        (c.typeAbsence === 'Congé annuel' || c.typeAbsence === 'Récupération')
    )
    .reduce((s, c) => s + c.nbJours, 0);
  return CONGE_ANNUEL_TOTAL - used;
}

function getAbsencesInjustifiees(employeId: string, annee: string, conges: Conge[]): number {
  return conges
    .filter(
      (c) =>
        c.employeId === employeId && c.annee === annee && c.typeAbsence === 'Absence injustifiée'
    )
    .reduce((s, c) => s + c.nbJours, 0);
}

export const congesStore = {
  loadConges,
  saveConges,
  addConge,
  updateConge,
  removeConge,
  loadPlanning,
  savePlanning,
  setPresence,
  getPresence,
  getSoldeConges,
  getAbsencesInjustifiees,
  diffDays,
  loadFeries,
  saveFeries,
  addFerie,
  removeFerie,
  isFerie,
  loadWeekends,
  saveWeekends,
  isWeekend,
  calcHeuresNuit,
  calcMajorationNuit,
  CONGE_ANNUEL_TOTAL,
};
