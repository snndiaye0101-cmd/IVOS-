/**
 * Service de gestion des véhicules (CRUD local)
 */

type Vehicle = { id: string; subsidiaryId?: string; [key: string]: unknown };
const vehicles: Vehicle[] = [];

export const vehicleService = {
  async getVehicles(subsidiaryId?: string): Promise<Vehicle[]> {
    if (subsidiaryId) return vehicles.filter(v => v.subsidiaryId === subsidiaryId);
    return vehicles;
  },

  async getVehicle(id: string): Promise<Vehicle | null> {
    return vehicles.find(v => v.id === id) || null;
  },

  async createVehicle(vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    const created = { ...vehicle, id: Date.now().toString() } as Vehicle;
    vehicles.push(created);
    return created;
  },

  async updateVehicle(id: string, vehicle: Partial<Vehicle>): Promise<Vehicle | null> {
    const idx = vehicles.findIndex(v => v.id === id);
    if (idx === -1) return null;
    vehicles[idx] = { ...vehicles[idx], ...vehicle };
    return vehicles[idx];
  },

  async deleteVehicle(id: string): Promise<void> {
    const idx = vehicles.findIndex(v => v.id === id);
    if (idx !== -1) vehicles.splice(idx, 1);
  },
};
