interface ClaimRecord {
  id: string;
  reportNumber: string;
  date: string;
  type: string;
  severity: string;
  location: string;
  costEstimate: number;
  status: string;
  description: string;
}

interface PersonalVehicle {
  id: string;
  agentName: string;
  registration: string;
  brand: string;
  model: string;
  claims: ClaimRecord[];
  [key: string]: any;
}

const KEY = 'ivos_personal_vehicles_v1';

export const personalVehiclesStore = {
  load(): PersonalVehicle[] {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      return JSON.parse(raw) as PersonalVehicle[];
    } catch (e) {
      console.error('Failed to load personal vehicles', e);
      return [];
    }
  },
  save(vehicles: PersonalVehicle[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(vehicles));
      try {
        window.dispatchEvent(new Event('personalVehicles:updated'));
      } catch (e) {}
    } catch (e) {
      console.error('Failed to save personal vehicles', e);
    }
  },
  clear() {
    localStorage.removeItem(KEY);
  },
};
