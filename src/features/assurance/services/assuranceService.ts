import { supabase } from '../../../shared/services/supabaseClient';

export interface Assurance {
  id: string;
  vehicle_id: string;
  compagnie: string;
  type: string;
  montant: number;
  date_debut: string;
  date_fin: string;
}

export async function getAssurances() {
  // Documents table, category = 'insurance'
  const { data, error } = await supabase.from('documents').select('*').eq('category', 'insurance');
  if (error) throw error;
  return data;
}

export async function addAssurance(assurance: Partial<Assurance>) {
  const { data, error } = await supabase
    .from('documents')
    .insert([{ ...assurance, category: 'insurance' }]);
  if (error) throw error;
  return data;
}

export async function updateAssurance(id: string, updates: Partial<Assurance>) {
  const { data, error } = await supabase.from('documents').update(updates).eq('id', id);
  if (error) throw error;
  return data;
}

export async function deleteAssurance(id: string) {
  const { data, error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
  return data;
}
