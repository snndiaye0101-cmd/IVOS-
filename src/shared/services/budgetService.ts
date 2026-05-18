import { supabase } from './supabaseClient'
import { useAppContext } from '../store/useAppContext'

/**
 * Configuration de budget par site
 */
export interface BudgetConfig {
  annualBudget: number
  updatedAt: string
  updatedBy?: string
}

const DEFAULT_BUDGET = 120_000_000 // Budget par défaut (120M FCFA)
let cachedBudgetConfig: BudgetConfig | null = null

async function fetchBudgetConfigFromDb(siteId: string | null): Promise<BudgetConfig> {
  if (!siteId) {
    return { annualBudget: DEFAULT_BUDGET, updatedAt: new Date().toISOString() }
  }

  const { data, error } = await supabase
    .from('budget_settings')
    .select('annual_budget,updated_at,updated_by')
    .eq('site_id', siteId)
    .maybeSingle()

  if (error) {
    console.warn('Impossible de charger le budget depuis Supabase:', error)
    return { annualBudget: DEFAULT_BUDGET, updatedAt: new Date().toISOString() }
  }

  if (!data) {
    return { annualBudget: DEFAULT_BUDGET, updatedAt: new Date().toISOString() }
  }

  return {
    annualBudget: Number(data.annual_budget ?? DEFAULT_BUDGET),
    updatedAt: data.updated_at || new Date().toISOString(),
    updatedBy: data.updated_by || undefined,
  }
}

async function persistBudgetConfigToDb(siteId: string, amount: number, updatedBy?: string): Promise<void> {
  const now = new Date().toISOString()
  const payload = {
    site_id: siteId,
    annual_budget: amount,
    updated_by: updatedBy || null,
    updated_at: now,
  }

  const { error } = await supabase
    .from('budget_settings')
    .upsert(payload, { onConflict: 'site_id' })

  if (error) {
    console.error('Échec de sauvegarde du budget Supabase:', error)
  }
}

export async function getAnnualBudget(): Promise<number> {
  const config = await getBudgetConfig()
  return config.annualBudget
}

export async function saveAnnualBudget(amount: number, updatedBy?: string): Promise<void> {
  const siteId = useAppContext.getState().currentSiteId
  const newConfig: BudgetConfig = {
    annualBudget: amount,
    updatedAt: new Date().toISOString(),
    updatedBy,
  }

  cachedBudgetConfig = newConfig

  if (siteId) {
    await persistBudgetConfigToDb(siteId, amount, updatedBy)
  }

  window.dispatchEvent(new CustomEvent('ivos_budget_updated', { detail: newConfig }))
}

export async function getBudgetConfig(): Promise<BudgetConfig> {
  if (cachedBudgetConfig) return cachedBudgetConfig
  const siteId = useAppContext.getState().currentSiteId
  const config = await fetchBudgetConfigFromDb(siteId)
  cachedBudgetConfig = config
  return config
}

/**
 * Calcule le ratio dépenses / budget
 */
export function calculateBudgetRatio(totalExpenses: number, budget?: number): number {
  const budgetAmount = budget ?? DEFAULT_BUDGET
  if (budgetAmount === 0) return 0
  return totalExpenses / budgetAmount
}

/**
 * Vérifie si le budget est dépassé
 */
export function isBudgetExceeded(totalExpenses: number, budget?: number): boolean {
  return calculateBudgetRatio(totalExpenses, budget) > 1
}
