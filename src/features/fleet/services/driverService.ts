/**
 * Service de gestion des chauffeurs (CRUD, certifications, statuts)
 * Toutes les méthodes utilisent Supabase comme backend.
 */
import { supabase } from '../../../shared/services/supabaseClient';

export type Driver = {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  license_number: string;
  license_expiry: string;
  status: 'available' | 'on_mission' | 'on_leave' | 'inactive';
  subsidiary_id: string;
  hazmat_certified: boolean;
  performance_score: number;
};

export const driverService = {
  /**
   * Récupère tous les chauffeurs pour une filiale
   */
  async getAllDrivers(subsidiaryId: string): Promise<Driver[]> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('subsidiary_id', subsidiaryId);
    if (error) throw error;
    return data || [];
  },

  /**
   * Récupère un chauffeur par son ID
   */
  async getDriverById(id: string): Promise<Driver | null> {
    const { data, error } = await supabase.from('drivers').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  /**
   * Crée un nouveau chauffeur
   */
  async createDriver(driverData: Omit<Driver, 'id' | 'created_at'>): Promise<Driver> {
    const { data, error } = await supabase.from('drivers').insert(driverData).select().single();
    if (error) throw error;
    return data;
  },

  /**
   * Met à jour un chauffeur
   */
  async updateDriver(
    id: string,
    driverData: Partial<Omit<Driver, 'id' | 'created_at'>>
  ): Promise<Driver> {
    const { data, error } = await supabase
      .from('drivers')
      .update(driverData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Supprime un chauffeur
   */
  async deleteDriver(id: string): Promise<void> {
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (error) throw error;
  },
};
