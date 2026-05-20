import {
  syncExpenseFromPlein,
  updateExpenseFromPlein,
  removeExpenseByPleinId,
} from '../../finances/services/globalExpensesService';

export interface Plein {
  id: number;
  date: string;
  vehicule: string;
  chauffeur: string;
  kmActuel: number;
  litres: number;
  montant: number;
  station: string;
  typeCarburant?: 'Gazole' | 'Essence' | 'Super';
  pieceJointe?: string;
  consoL100?: number;
  anomalie?: boolean;
  paiementCarte?: boolean; // true = payé par carte carburant (véhicules de fonction)
}

const KEY = 'ivos_carburant_v1';

const SEED: Plein[] = [
  {
    id: 1,
    date: '2026-04-01',
    vehicule: 'DK-2345-AB',
    chauffeur: 'Mamadou Diallo',
    kmActuel: 124500,
    litres: 60,
    montant: 48000,
    station: 'Cuve interne',
    typeCarburant: 'Gazole',
  },
  {
    id: 2,
    date: '2026-04-03',
    vehicule: 'DK-2345-AB',
    chauffeur: 'Mamadou Diallo',
    kmActuel: 125100,
    litres: 55,
    montant: 44000,
    station: 'Station partenaire',
    typeCarburant: 'Gazole',
  },
  {
    id: 3,
    date: '2026-04-02',
    vehicule: 'DK-7890-CD',
    chauffeur: 'Aïssatou Ba',
    kmActuel: 89200,
    litres: 45,
    montant: 36000,
    station: 'Cuve interne',
    typeCarburant: 'Gazole',
  },
  {
    id: 4,
    date: '2026-04-05',
    vehicule: 'DK-7890-CD',
    chauffeur: 'Aïssatou Ba',
    kmActuel: 89900,
    litres: 50,
    montant: 40000,
    station: 'Station extérieure',
    typeCarburant: 'Gazole',
  },
  {
    id: 5,
    date: '2026-04-04',
    vehicule: 'DK-5566-EF',
    chauffeur: 'Ousmane Ndiaye',
    kmActuel: 67800,
    litres: 70,
    montant: 56000,
    station: 'Cuve interne',
    typeCarburant: 'Essence',
  },
  {
    id: 6,
    date: '2026-04-07',
    vehicule: 'DK-5566-EF',
    chauffeur: 'Ousmane Ndiaye',
    kmActuel: 68500,
    litres: 65,
    montant: 52000,
    station: 'Station partenaire',
    typeCarburant: 'Essence',
  },
  {
    id: 7,
    date: '2026-04-06',
    vehicule: 'DK-1122-GH',
    chauffeur: 'Ibrahima Fall',
    kmActuel: 45600,
    litres: 40,
    montant: 32000,
    station: 'Station partenaire',
    typeCarburant: 'Gazole',
  },
  {
    id: 8,
    date: '2026-04-09',
    vehicule: 'DK-1122-GH',
    chauffeur: 'Ibrahima Fall',
    kmActuel: 46200,
    litres: 42,
    montant: 33600,
    station: 'Cuve interne',
    typeCarburant: 'Gazole',
  },
  {
    id: 9,
    date: '2026-04-10',
    vehicule: 'DK-2345-AB',
    chauffeur: 'Mamadou Diallo',
    kmActuel: 125800,
    litres: 58,
    montant: 46400,
    station: 'Cuve interne',
    typeCarburant: 'Gazole',
  },
  {
    id: 10,
    date: '2026-04-12',
    vehicule: 'DK-7890-CD',
    chauffeur: 'Aïssatou Ba',
    kmActuel: 90600,
    litres: 48,
    montant: 38400,
    station: 'Station partenaire',
    typeCarburant: 'Essence',
  },
];

function computeConsoAndAnomalies(data: Plein[]): Plein[] {
  const byVehicle: Record<string, Plein[]> = {};
  data.forEach((p) => {
    if (!byVehicle[p.vehicule]) byVehicle[p.vehicule] = [];
    byVehicle[p.vehicule].push(p);
  });

  Object.values(byVehicle).forEach((arr) => {
    arr.sort((a, b) => a.kmActuel - b.kmActuel);
    const consos: number[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (i === 0) {
        arr[i].consoL100 = undefined;
      } else {
        const deltaKm = arr[i].kmActuel - arr[i - 1].kmActuel;
        if (deltaKm > 0) {
          const c = (arr[i].litres / deltaKm) * 100;
          arr[i].consoL100 = Math.round(c * 100) / 100;
          consos.push(c);
        }
      }
    }
    if (consos.length > 0) {
      const avg = consos.reduce((s, v) => s + v, 0) / consos.length;
      arr.forEach((p) => {
        if (p.consoL100 !== undefined) {
          p.anomalie = p.consoL100 > avg * 1.15;
        }
      });
    }
  });

  return data;
}

export const carburantStore = {
  load(): Plein[] {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const seeded = computeConsoAndAnomalies([...SEED]);
        this.save(seeded);
        return seeded;
      }
      return JSON.parse(raw) as Plein[];
    } catch {
      return [];
    }
  },
  save(data: Plein[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      try {
        window.dispatchEvent(new Event('carburant:updated'));
      } catch {}
    } catch {}
  },
  add(plein: Omit<Plein, 'id' | 'consoL100' | 'anomalie'>) {
    const all = this.load();
    const newId = all.reduce((m, p) => Math.max(m, p.id), 0) + 1;
    const newPlein = { ...plein, id: newId } as Plein;
    all.push(newPlein);
    const computed = computeConsoAndAnomalies(all);
    this.save(computed);
    // Sync automatique → Dépenses Globales
    try {
      syncExpenseFromPlein({
        id: newId,
        date: newPlein.date,
        vehicule: newPlein.vehicule,
        chauffeur: newPlein.chauffeur,
        montant: newPlein.montant,
      });
    } catch {
      /* ne pas bloquer le flux carburant */
    }
  },
  update(id: number, updates: Partial<Plein>) {
    let all = this.load().map((p) => (p.id === id ? { ...p, ...updates } : p));
    all = computeConsoAndAnomalies(all);
    this.save(all);
    // Sync automatique → Dépenses Globales
    try {
      updateExpenseFromPlein(id, {
        ...(updates.montant !== undefined ? { montant: updates.montant } : {}),
        ...(updates.date !== undefined ? { date: updates.date } : {}),
        ...(updates.vehicule !== undefined ? { vehicule: updates.vehicule } : {}),
        ...(updates.chauffeur !== undefined ? { chauffeur: updates.chauffeur } : {}),
      });
    } catch {
      /* ne pas bloquer */
    }
  },
  remove(id: number) {
    let all = this.load().filter((p) => p.id !== id);
    all = computeConsoAndAnomalies(all);
    this.save(all);
    // Sync automatique → Dépenses Globales
    try {
      removeExpenseByPleinId(id);
    } catch {
      /* ne pas bloquer */
    }
  },
  clear() {
    localStorage.removeItem(KEY);
  },
};
