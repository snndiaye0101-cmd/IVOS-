import { supabase } from '../../../shared/services/supabaseClient';

export interface Vehicle {
  id: string;
  registration_number: string;
  brand: string;
  model: string;
}

export async function getVehicles() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, registration_number, brand, model');
  if (error) throw error;
  return data;
}
