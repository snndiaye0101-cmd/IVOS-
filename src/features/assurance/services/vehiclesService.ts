import { supabase } from '../../../shared/services/supabaseClient';

// Returned DB row shape for vehicles table (snake_case)
export interface DbVehicle {
  id: string;
  registration_number: string;
  brand: string;
  model: string;
}

export async function getVehicles(): Promise<DbVehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, registration_number, brand, model');
  if (error) throw error;
  return (data || []) as DbVehicle[];
}
