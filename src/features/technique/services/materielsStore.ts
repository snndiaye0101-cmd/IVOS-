export interface MaintenanceEntry {
  date: string;
  description: string;
  reparateur: string;
  tel: string;
  coutPieces: number;
  coutMo: number;
  total: number;
}

export interface Materiel {
  id: number;
  designation: string;
  codeSerie: string;
  categorie: string;
  etat: 'Opérationnel' | 'En maintenance' | 'Hors service';
  localisation: string;
  localisationType: 'vehicule' | 'depot';
  valeurNeuf: number;
  annee: string;
  archived: boolean;
  historique: MaintenanceEntry[];
}

const KEY = 'ivos_materiels_v1';

const SEED: Materiel[] = [
  {
    id: 1,
    designation: 'Cric hydraulique 20T',
    codeSerie: 'MAT-MEC-001',
    categorie: 'Levage',
    etat: 'Opérationnel',
    localisation: "Camion d'intervention",
    localisationType: 'vehicule',
    valeurNeuf: 85000,
    annee: '2026',
    archived: false,
    historique: [
      { date: '2025-11-10', description: 'Remplacement joint hydraulique', reparateur: 'Atelier Central', tel: '+221 77 111 22 33', coutPieces: 12000, coutMo: 5000, total: 17000 },
    ],
  },
  {
    id: 2,
    designation: 'Groupe électrogène 5kVA',
    codeSerie: 'MAT-ELE-002',
    categorie: 'Électrique',
    etat: 'En maintenance',
    localisation: 'Atelier 1',
    localisationType: 'depot',
    valeurNeuf: 450000,
    annee: '2026',
    archived: false,
    historique: [
      { date: '2026-01-15', description: 'Bobinage moteur', reparateur: 'ElecPro Dakar', tel: '+221 78 222 33 44', coutPieces: 35000, coutMo: 20000, total: 55000 },
      { date: '2026-03-20', description: 'Remplacement régulateur', reparateur: 'ElecPro Dakar', tel: '+221 78 222 33 44', coutPieces: 18000, coutMo: 8000, total: 26000 },
    ],
  },
  {
    id: 3,
    designation: 'Pompe de transfert GNR',
    codeSerie: 'MAT-MEC-003',
    categorie: 'Mécanique',
    etat: 'Opérationnel',
    localisation: 'Zone carburant',
    localisationType: 'depot',
    valeurNeuf: 320000,
    annee: '2026',
    archived: false,
    historique: [],
  },
  {
    id: 4,
    designation: 'Compresseur 200L',
    codeSerie: 'MAT-MEC-004',
    categorie: 'Mécanique',
    etat: 'Hors service',
    localisation: 'Atelier 1',
    localisationType: 'depot',
    valeurNeuf: 280000,
    annee: '2025',
    archived: true,
    historique: [
      { date: '2025-06-01', description: 'Moteur grillé', reparateur: 'Mécanique Générale', tel: '+221 76 333 44 55', coutPieces: 95000, coutMo: 30000, total: 125000 },
      { date: '2025-09-15', description: 'Fuite cuve', reparateur: 'Soudure Express', tel: '+221 77 444 55 66', coutPieces: 15000, coutMo: 10000, total: 25000 },
    ],
  },
  {
    id: 5,
    designation: 'Perceuse à colonne',
    codeSerie: 'MAT-OUT-005',
    categorie: 'Outillage',
    etat: 'Opérationnel',
    localisation: 'Atelier 1',
    localisationType: 'depot',
    valeurNeuf: 175000,
    annee: '2026',
    archived: false,
    historique: [],
  },
  {
    id: 6,
    designation: 'Casques de chantier (lot 10)',
    codeSerie: 'MAT-EPI-006',
    categorie: 'EPI',
    etat: 'Opérationnel',
    localisation: 'Magasin',
    localisationType: 'depot',
    valeurNeuf: 45000,
    annee: '2026',
    archived: false,
    historique: [],
  },
  {
    id: 7,
    designation: 'Pont élévateur mobile',
    codeSerie: 'MAT-LEV-007',
    categorie: 'Levage',
    etat: 'En maintenance',
    localisation: 'Renault Midlum',
    localisationType: 'vehicule',
    valeurNeuf: 950000,
    annee: '2026',
    archived: false,
    historique: [
      { date: '2026-02-28', description: 'Remplacement vérin', reparateur: 'HydroService', tel: '+221 70 555 66 77', coutPieces: 65000, coutMo: 25000, total: 90000 },
    ],
  },
];

export const materielsStore = {
  load(): Materiel[] {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        this.save(SEED);
        return [...SEED];
      }
      return JSON.parse(raw) as Materiel[];
    } catch {
      return [];
    }
  },
  save(data: Materiel[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      try { window.dispatchEvent(new Event('materiels:updated')); } catch {}
    } catch {}
  },
  add(mat: Omit<Materiel, 'id'>) {
    const all = this.load();
    const maxId = all.reduce((m, p) => Math.max(m, p.id), 0);
    all.push({ ...mat, id: maxId + 1 } as Materiel);
    this.save(all);
  },
  update(id: number, updates: Partial<Materiel>) {
    const all = this.load().map(m => m.id === id ? { ...m, ...updates } : m);
    this.save(all);
  },
  remove(id: number) {
    this.save(this.load().filter(m => m.id !== id));
  },
  clear() {
    localStorage.removeItem(KEY);
  },
};
