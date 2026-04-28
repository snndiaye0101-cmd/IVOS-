/**
 * Service de gestion du budget annuel global
 * Stockage en localStorage avec validation
 */

const BUDGET_KEY = 'ivos_budget_annual_v1';

export interface BudgetConfig {
  annualBudget: number;
  updatedAt: string;
  updatedBy?: string;
}

const DEFAULT_BUDGET = 120_000_000; // Budget par défaut (120M FCFA)

/**
 * Récupère le budget annuel configuré
 */
export function getAnnualBudget(): number {
  try {
    const raw = localStorage.getItem(BUDGET_KEY);
    if (!raw) return DEFAULT_BUDGET;
    const config: BudgetConfig = JSON.parse(raw);
    return config.annualBudget || DEFAULT_BUDGET;
  } catch {
    return DEFAULT_BUDGET;
  }
}

/**
 * Sauvegarde le budget annuel
 */
export function saveAnnualBudget(amount: number, updatedBy?: string): void {
  const config: BudgetConfig = {
    annualBudget: amount,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  localStorage.setItem(BUDGET_KEY, JSON.stringify(config));
  
  // Déclenche un événement personnalisé pour notifier les autres composants
  window.dispatchEvent(new CustomEvent('ivos_budget_updated', { detail: config }));
}

/**
 * Récupère la configuration complète du budget
 */
export function getBudgetConfig(): BudgetConfig {
  try {
    const raw = localStorage.getItem(BUDGET_KEY);
    if (!raw) {
      return {
        annualBudget: DEFAULT_BUDGET,
        updatedAt: new Date().toISOString(),
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      annualBudget: DEFAULT_BUDGET,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Calcule le ratio dépenses / budget
 */
export function calculateBudgetRatio(totalExpenses: number, budget?: number): number {
  const budgetAmount = budget ?? getAnnualBudget();
  if (budgetAmount === 0) return 0;
  return totalExpenses / budgetAmount;
}

/**
 * Vérifie si le budget est dépassé
 */
export function isBudgetExceeded(totalExpenses: number, budget?: number): boolean {
  return calculateBudgetRatio(totalExpenses, budget) > 1;
}
