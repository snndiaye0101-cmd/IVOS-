/* ═══════ VISITEUR STORE — Registre des visiteurs ═══════ */

const KEY = 'ivos_visiteurs_v1';
const EVT = 'visiteurs:updated';

export interface Visiteur {
  id: number;
  nom: string;
  societe: string;
  motif: string;
  transportType: '' | 'Voiture' | 'Moto' | 'Camion' | 'Pied' | 'Autre';
  immatriculation: string;
  employeVisite: string;
  employeVisiteId: string;
  heureEntree: string;
  heureSortie: string;
  date: string;
  vigileId: string;
  vigileNom: string;
  surSite: boolean;
}

function emit() { window.dispatchEvent(new Event(EVT)); }

function load(): Visiteur[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((entry: Partial<Visiteur>) => ({
      transportType: '',
      immatriculation: '',
      societe: '',
      motif: '',
      employeVisite: '',
      employeVisiteId: '',
      heureEntree: '',
      heureSortie: '',
      date: '',
      vigileId: '',
      vigileNom: '',
      surSite: false,
      ...entry,
    }));
  } catch { return []; }
}

function save(data: Visiteur[]) {
  localStorage.setItem(KEY, JSON.stringify(data));
  emit();
}

function add(v: Omit<Visiteur, 'id'>): Visiteur {
  const all = load();
  const id = all.length ? Math.max(...all.map(x => x.id)) + 1 : 1;
  const entry = { ...v, id };
  all.push(entry);
  save(all);
  return entry;
}

function sortieVisiteur(id: number): void {
  const all = load();
  const i = all.findIndex(v => v.id === id);
  if (i >= 0) {
    all[i].heureSortie = new Date().toTimeString().slice(0, 5);
    all[i].surSite = false;
    save(all);
  }
}

function getVisiteursSurSite(): Visiteur[] {
  const today = new Date().toISOString().slice(0, 10);
  return load().filter(v => v.date === today && v.surSite);
}

function getTodayVisiteurs(): Visiteur[] {
  const today = new Date().toISOString().slice(0, 10);
  return load().filter(v => v.date === today);
}

export const visiteurStore = {
  load,
  save,
  add,
  sortieVisiteur,
  getVisiteursSurSite,
  getTodayVisiteurs,
};
