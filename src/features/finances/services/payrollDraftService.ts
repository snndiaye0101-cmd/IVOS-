import { supabase } from '../../../shared/services/supabaseClient';

export interface PayrollDraftPayload {
  id: string;
  employeeId: string;
  month: string;
  status: 'Brouillon' | 'Validé' | 'Payé';
  locked: boolean;
  data: Record<string, unknown>;
  updatedBy: string;
}

const TABLE = 'app_payroll_drafts';

function toRow(payload: PayrollDraftPayload) {
  return {
    id: payload.id,
    employee_id: payload.employeeId,
    month: payload.month,
    status: payload.status,
    locked: payload.locked,
    payload: payload.data,
    updated_by: payload.updatedBy,
    updated_at: new Date().toISOString(),
  };
}

export async function savePayrollDraft(payload: PayrollDraftPayload): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(toRow(payload), { onConflict: 'id' });
  if (error) {
    // Non-blocking in degraded mode when Supabase is unavailable.
    console.warn('Failed to persist payroll draft to Supabase', error);
  }
}

export async function lockPayrollDraft(payload: PayrollDraftPayload): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({
      status: payload.status,
      locked: true,
      payload: payload.data,
      updated_by: payload.updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.id);

  if (error) {
    console.warn('Failed to lock payroll draft in Supabase', error);
  }
}
